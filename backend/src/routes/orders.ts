import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status, customerId } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip, take,
      include: {
        customer: { select: { shopName: true, ownerName: true, type: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    data: orders,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

import { getNextSequenceNumber } from '../lib/sequence';

router.post('/', async (req: AuthRequest, res: Response) => {
  const { customerId, items, notes } = req.body;

  try {
    const order = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const processedItems = items.map((item: {
        productId: string;
        variantId?: string;
        productName: string;
        quantity: number;
        unitPrice: number;
      }) => {
        const total = item.quantity * item.unitPrice;
        totalAmount += total;
        return {
          productId: item.productId,
          variantId: item.variantId || null,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalAmount: total,
        };
      });

      const orderNumber = await getNextSequenceNumber(tx, 'ORD');

      return tx.order.create({
        data: {
          orderNumber,
          customerId,
          createdById: req.user!.id,
          notes,
          totalAmount,
          items: { create: processedItems },
        },
        include: { customer: true, items: true },
      });
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update order status' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      createdBy: { select: { name: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true, gstPercent: true } },
          variant: { select: { color: true, size: true } },
        },
      },
    },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/:id/convert', async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: req.params.id },
        include: { items: { include: { product: true, variant: true } } },
      });
      if (!order) throw new Error('Order not found');

      const existingInvoice = await tx.invoice.findFirst({ where: { orderId: order.id } });
      if (existingInvoice) throw new Error('Already converted to invoice');

      let subtotal = 0;
      let taxAmount = 0;

      const invoiceItems = order.items.map((item) => {
        const gstPercent = item.product.gstPercent || 5;
        const itemSubtotal = item.quantity * item.unitPrice;
        const gst = itemSubtotal * (gstPercent / 100);
        subtotal += itemSubtotal;
        taxAmount += gst;
        
        return {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          color: item.variant?.color,
          size: item.variant?.size,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent,
          gstAmount: gst,
          totalAmount: itemSubtotal + gst,
          discount: 0,
        };
      });

      const totalAmount = subtotal + taxAmount;
      const invoiceNumber = await getNextSequenceNumber(tx, 'INV');

      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: order.customerId,
          createdById: req.user!.id,
          orderId: order.id,
          subtotal,
          taxAmount,
          totalAmount,
          dueAmount: totalAmount,
          notes: order.notes,
          items: { create: invoiceItems },
        },
      });

      // Update stock atomically for each variant and log stock movements
      for (const item of order.items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (variant) {
            const newStock = Math.max(0, variant.stock - item.quantity);
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock },
            });
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                variantId: item.variantId,
                type: 'OUTWARD',
                quantity: -item.quantity,
                previousStock: variant.stock,
                newStock,
                reason: `Order Conversion (Invoice: ${newInvoice.invoiceNumber})`,
                reference: newInvoice.id,
                createdBy: req.user?.id,
              },
            });
          }
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });

      return newInvoice;
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to convert order' });
  }
});

export default router;

