import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const ms = Date.now().toString().slice(-5);
  return `INV-${y}${m}-${ms}`;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', search = '', paymentStatus, customerId, fromDate, toDate } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
      { customer: { shopName: { contains: search as string, mode: 'insensitive' } } },
      { customer: { ownerName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (customerId) where.customerId = customerId;
  if (fromDate || toDate) {
    where.invoiceDate = {
      ...(fromDate ? { gte: new Date(fromDate as string) } : {}),
      ...(toDate ? { lte: new Date(toDate as string) } : {}),
    };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      include: {
        customer: { select: { shopName: true, ownerName: true, whatsapp: true, type: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  res.json({
    data: invoices,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

import { getNextSequenceNumber } from '../lib/sequence';

router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    customerId, items, discountAmount, discountPercent,
    paymentMethod, paidAmount, notes, termsConditions, dueDate,
  } = req.body;

  try {
    const resultInvoice = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const processedItems = items.map((item: {
        productId: string;
        variantId?: string;
        productName: string;
        color?: string;
        size?: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
        gstPercent: number;
        discount?: number;
      }) => {
        const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        const gst = itemTotal * (item.gstPercent / 100);
        subtotal += itemTotal;
        taxAmount += gst;
        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          color: item.color,
          size: item.size,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent: item.gstPercent,
          gstAmount: gst,
          totalAmount: itemTotal + gst,
          discount: item.discount || 0,
        };
      });

      const totalAmount = subtotal + taxAmount - (discountAmount || 0);
      const paid = paidAmount || 0;
      const due = totalAmount - paid;

      const paymentStatus =
        paid === 0 ? 'UNPAID' : paid >= totalAmount ? 'PAID' : 'PARTIAL';

      const invoiceNumber = await getNextSequenceNumber(tx, 'INV');

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          createdById: req.user!.id,
          subtotal,
          discountAmount: discountAmount || 0,
          discountPercent: discountPercent || 0,
          taxAmount,
          totalAmount,
          paidAmount: paid,
          dueAmount: due,
          paymentStatus: paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID',
          paymentMethod: paymentMethod || 'CASH',
          notes,
          termsConditions,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          items: { create: processedItems },
          ...(paid > 0 ? {
            payments: {
              create: {
                amount: paid,
                method: paymentMethod || 'CASH',
              },
            },
          } : {}),
        },
        include: { customer: true, items: true, payments: true },
      });

      // Update stock atomically for each variant
      for (const item of items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            const updatedStock = Math.max(0, variant.stock - item.quantity);
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: updatedStock },
            });
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                type: 'OUTWARD',
                quantity: -item.quantity,
                previousStock: variant.stock,
                newStock: updatedStock,
                reason: `Invoice ${invoice.invoiceNumber}`,
                reference: invoice.id,
                createdBy: req.user?.id,
              },
            });
          }
        }
      }

      return invoice;
    });

    res.status(201).json(resultInvoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create invoice' });
  }
});


// POST /api/invoices/:id/payment - Record a payment
router.post('/:id/payment', async (req: AuthRequest, res: Response) => {
  const { amount, method, reference, notes } = req.body;
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const newPaid = invoice.paidAmount + amount;
  const newDue = Math.max(0, invoice.totalAmount - newPaid);
  const paymentStatus = newDue === 0 ? 'PAID' : 'PARTIAL';

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: { invoiceId: invoice.id, amount, method, reference, notes },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentStatus: paymentStatus as 'PAID' | 'PARTIAL',
      },
    }),
  ]);

  res.json(payment);
});

// POST /api/invoices/:id/duplicate
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  const original = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!original) return res.status(404).json({ error: 'Invoice not found' });

  const duplicate = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      customerId: original.customerId,
      createdById: req.user!.id,
      subtotal: original.subtotal,
      discountAmount: original.discountAmount,
      discountPercent: original.discountPercent,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      paidAmount: 0,
      dueAmount: original.totalAmount,
      paymentStatus: 'UNPAID',
      paymentMethod: original.paymentMethod,
      notes: original.notes,
      termsConditions: original.termsConditions,
      items: {
        create: original.items.map(({ id: _id, invoiceId: _iid, ...item }) => item),
      },
    },
  });

  res.status(201).json(duplicate);
});

// PUT /api/invoices/:id - Edit an invoice
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const {
    customerId, items, discountAmount, discountPercent,
    paymentMethod, paidAmount, notes, termsConditions, dueDate,
  } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, payments: true },
    });
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = items.map((item: {
      productId: string;
      variantId?: string;
      productName: string;
      color?: string;
      size?: string;
      sku?: string;
      quantity: number;
      unitPrice: number;
      gstPercent: number;
      discount?: number;
    }) => {
      const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      const gst = itemTotal * (item.gstPercent / 100);
      subtotal += itemTotal;
      taxAmount += gst;
      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstPercent: item.gstPercent,
        gstAmount: gst,
        totalAmount: itemTotal + gst,
        discount: item.discount || 0,
      };
    });

    const totalAmount = subtotal + taxAmount - (discountAmount || 0);

    // Reconcile payments
    let finalPaidAmount = existingInvoice.paidAmount;
    let paymentMethodToUse = existingInvoice.paymentMethod;

    if (existingInvoice.payments.length <= 1) {
      finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : existingInvoice.paidAmount;
      paymentMethodToUse = paymentMethod || existingInvoice.paymentMethod;
    } else {
      // If multiple payments, sum the ledger payments
      finalPaidAmount = existingInvoice.payments.reduce((sum, p) => sum + p.amount, 0);
    }

    const finalDueAmount = Math.max(0, totalAmount - finalPaidAmount);
    const paymentStatus =
      finalPaidAmount === 0 ? 'UNPAID' : finalPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

    // Calculate stock changes for variants
    const variantIds = new Set<string>();
    existingInvoice.items.forEach(item => {
      if (item.variantId) variantIds.add(item.variantId);
    });
    items.forEach((item: any) => {
      if (item.variantId) variantIds.add(item.variantId);
    });

    const stockAdjustments: Array<{
      variantId: string;
      productId: string;
      delta: number;
    }> = [];

    for (const vId of variantIds) {
      const oldQty = existingInvoice.items
        .filter(item => item.variantId === vId)
        .reduce((sum, item) => sum + item.quantity, 0);

      const newQty = items
        .filter((item: any) => item.variantId === vId)
        .reduce((sum, item) => sum + item.quantity, 0);

      const delta = newQty - oldQty;
      if (delta !== 0) {
        const productId = existingInvoice.items.find(item => item.variantId === vId)?.productId
          || items.find((item: any) => item.variantId === vId)?.productId;
        if (productId) {
          stockAdjustments.push({ variantId: vId, productId, delta });
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Process stock adjustments
      for (const adj of stockAdjustments) {
        const variant = await tx.productVariant.findUnique({ where: { id: adj.variantId } });
        if (variant) {
          const newStock = Math.max(0, variant.stock - adj.delta);
          await tx.productVariant.update({
            where: { id: adj.variantId },
            data: { stock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: adj.productId,
              variantId: adj.variantId,
              type: adj.delta > 0 ? 'OUTWARD' : 'RETURN',
              quantity: -adj.delta,
              previousStock: variant.stock,
              newStock,
              reason: `Invoice Edit ${existingInvoice.invoiceNumber}`,
              reference: existingInvoice.id,
              createdBy: req.user?.id,
            },
          });
        }
      }

      // 2. Delete old items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: existingInvoice.id },
      });

      // 3. Handle payments reconciliation if payments count <= 1
      if (existingInvoice.payments.length <= 1) {
        if (existingInvoice.payments.length === 1) {
          if (finalPaidAmount === 0) {
            await tx.payment.delete({
              where: { id: existingInvoice.payments[0].id },
            });
          } else {
            await tx.payment.update({
              where: { id: existingInvoice.payments[0].id },
              data: {
                amount: finalPaidAmount,
                method: paymentMethodToUse,
              },
            });
          }
        } else if (finalPaidAmount > 0) {
          await tx.payment.create({
            data: {
              invoiceId: existingInvoice.id,
              amount: finalPaidAmount,
              method: paymentMethodToUse,
            },
          });
        }
      }

      // 4. Update the invoice details and create new items
      const updated = await tx.invoice.update({
        where: { id: existingInvoice.id },
        data: {
          customerId,
          subtotal,
          discountAmount: discountAmount || 0,
          discountPercent: discountPercent || 0,
          taxAmount,
          totalAmount,
          paidAmount: finalPaidAmount,
          dueAmount: finalDueAmount,
          paymentStatus: paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID',
          paymentMethod: paymentMethodToUse,
          notes,
          termsConditions,
          dueDate: dueDate ? new Date(dueDate) : null,
          items: {
            create: processedItems,
          },
        },
        include: { customer: true, items: true, payments: true },
      });

      return updated;
    });

    res.json(result);
  } catch (error: any) {
    console.error('Invoice edit error:', error);
    res.status(500).json({ error: error.message || 'Failed to edit invoice' });
  }
});

// PATCH /invoices/:id — update paymentStatus for invoice rows in orders view
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  // Map fulfillment status to paymentStatus equivalent if needed
  // Invoices track paymentStatus (UNPAID/PARTIAL/PAID) not fulfillment status
  const updateData: Record<string, string> = {};

  if (paymentStatus) {
    const allowed = ['UNPAID', 'PARTIAL', 'PAID'];
    if (!allowed.includes(paymentStatus)) {
      res.status(400).json({ error: `Invalid paymentStatus. Must be one of: ${allowed.join(', ')}` });
      return;
    }
    updateData.paymentStatus = paymentStatus;
  } else if (status) {
    // Fulfillment status mapping: for invoices, DELIVERED = PAID, SHIPPED = PARTIAL, CANCELLED = UNPAID
    const statusToPayment: Record<string, string> = {
      DELIVERED: 'PAID',
      SHIPPED: 'PARTIAL',
      PENDING: 'UNPAID',
      CANCELLED: 'UNPAID',
      CONFIRMED: 'UNPAID',
      PROCESSING: 'PARTIAL',
    };
    const mapped = statusToPayment[status];
    if (!mapped) {
      res.status(400).json({ error: `Invalid status value: ${status}` });
      return;
    }
    updateData.paymentStatus = mapped;
  } else {
    res.status(400).json({ error: 'No valid field to update' });
    return;
  }

  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });
    res.json(invoice);
  } catch (error: any) {
    res.status(404).json({ error: 'Invoice not found' });
  }
});

export default router;
