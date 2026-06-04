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
        customer: { select: { shopName: true, whatsapp: true } },
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

router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    customerId, items, discountAmount, discountPercent,
    paymentMethod, paidAmount, notes, termsConditions, dueDate,
  } = req.body;

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

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
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

  // Update stock for each variant
  for (const item of items) {
    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
      if (variant) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: Math.max(0, variant.stock - item.quantity) },
        });
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: 'OUTWARD',
            quantity: -item.quantity,
            previousStock: variant.stock,
            newStock: Math.max(0, variant.stock - item.quantity),
            reason: `Invoice ${invoice.invoiceNumber}`,
            reference: invoice.id,
            createdBy: req.user?.id,
          },
        });
      }
    }
  }

  res.status(201).json(invoice);
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

export default router;
