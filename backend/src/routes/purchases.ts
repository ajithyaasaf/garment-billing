import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/purchases
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', search = '', paymentStatus, supplierId, fromDate, toDate } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { billNumber: { contains: search as string, mode: 'insensitive' } },
      { supplier: { shopName: { contains: search as string, mode: 'insensitive' } } },
      { supplier: { ownerName: { contains: search as string, mode: 'insensitive' } } },
    ];
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (supplierId) where.supplierId = supplierId;
  if (fromDate || toDate) {
    where.billDate = {
      ...(fromDate ? { gte: new Date(fromDate as string) } : {}),
      ...(toDate ? { lte: new Date(toDate as string) } : {}),
    };
  }

  const [purchases, total] = await Promise.all([
    prisma.purchaseBill.findMany({
      where,
      skip,
      take,
      include: {
        supplier: { select: { shopName: true, ownerName: true, whatsapp: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseBill.count({ where }),
  ]);

  res.json({
    data: purchases,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

// GET /api/purchases/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const purchase = await prisma.purchaseBill.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, sku: true } } },
      },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!purchase) return res.status(404).json({ error: 'Purchase bill not found' });
  res.json(purchase);
});

// POST /api/purchases
// POST /api/purchases
router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    supplierId, billNumber, billDate, items, discountAmount,
    paymentMethod, paidAmount, notes, dueDate,
  } = req.body;

  if (!supplierId || !billNumber || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier ID, Bill Number and items are required' });
  }

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxAmount = 0;

      const processedItems = items.map((item: {
        productId: string;
        variantId?: string;
        productName: string;
        color?: string;
        size?: string;
        quantity: number;
        unitPrice: number;
        gstPercent: number;
      }) => {
        const itemTotal = item.quantity * item.unitPrice;
        const gst = itemTotal * (item.gstPercent / 100);
        subtotal += itemTotal;
        taxAmount += gst;

        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent: item.gstPercent,
          gstAmount: gst,
          totalAmount: itemTotal + gst,
        };
      });

      const totalAmount = subtotal + taxAmount - (discountAmount || 0);
      const paid = paidAmount || 0;
      const due = Math.max(0, totalAmount - paid);

      const paymentStatus = paid === 0 ? 'UNPAID' : paid >= totalAmount ? 'PAID' : 'PARTIAL';

      const newPurchase = await tx.purchaseBill.create({
        data: {
          billNumber,
          supplierId,
          createdById: req.user!.id,
          subtotal,
          discountAmount: discountAmount || 0,
          taxAmount,
          totalAmount,
          paidAmount: paid,
          dueAmount: due,
          paymentStatus: paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID',
          paymentMethod: paymentMethod || 'CASH',
          notes,
          billDate: billDate ? new Date(billDate) : new Date(),
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
        include: { supplier: true, items: true, payments: true },
      });

      // Update stock and cost prices atomically for each variant (INWARD stock movement)
      for (const item of items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            const newStock = variant.stock + item.quantity;
            
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { 
                stock: newStock,
                purchasePrice: item.unitPrice,
              },
            });

            await tx.product.update({
              where: { id: item.productId },
              data: { purchasePrice: item.unitPrice },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                type: 'INWARD',
                quantity: item.quantity,
                previousStock: variant.stock,
                newStock: newStock,
                reason: `Purchase Bill ${newPurchase.billNumber}`,
                reference: newPurchase.id,
                createdBy: req.user?.id,
              },
            });
          }
        }
      }

      return newPurchase;
    });

    res.status(201).json(purchase);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create purchase bill' });
  }
});


// POST /api/purchases/:id/payments
router.post('/:id/payments', async (req: AuthRequest, res: Response) => {
  const { amount, method, reference, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const purchase = await prisma.purchaseBill.findUnique({
    where: { id: req.params.id },
  });

  if (!purchase) return res.status(404).json({ error: 'Purchase bill not found' });
  if (purchase.dueAmount <= 0) return res.status(400).json({ error: 'This purchase bill is already fully paid' });

  const newPaidAmount = purchase.paidAmount + Number(amount);
  const newDueAmount = Math.max(0, purchase.totalAmount - newPaidAmount);
  const paymentStatus = newPaidAmount >= purchase.totalAmount ? 'PAID' : 'PARTIAL';

  try {
    const updatedPurchase = await prisma.purchaseBill.update({
      where: { id: req.params.id },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        paymentStatus: paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID',
        payments: {
          create: {
            amount: Number(amount),
            method: method || 'CASH',
            reference,
            notes,
          },
        },
      },
      include: { payments: true },
    });

    res.json(updatedPurchase);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record purchase payment' });
  }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const purchase = await prisma.purchaseBill.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });

  if (!purchase) return res.status(404).json({ error: 'Purchase bill not found' });

  try {
    // Reverse the stock increment
    for (const item of purchase.items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant) {
          const newStock = Math.max(0, variant.stock - item.quantity);
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock },
          });

          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              type: 'ADJUSTMENT',
              quantity: -item.quantity,
              previousStock: variant.stock,
              newStock: newStock,
              reason: `Reversed Purchase Bill ${purchase.billNumber} (Deleted)`,
              reference: purchase.id,
              createdBy: req.user?.id,
            },
          });
        }
      }
    }

    await prisma.purchaseBill.delete({ where: { id: req.params.id } });
    res.json({ message: 'Purchase bill deleted successfully and stock reverted.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete purchase bill' });
  }
});

export default router;
