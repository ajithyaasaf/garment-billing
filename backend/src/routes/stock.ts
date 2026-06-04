import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// POST /api/stock/inward
router.post('/inward', async (req: AuthRequest, res: Response) => {
  const { productId, variantId, quantity, reason, reference } = req.body;

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return res.status(404).json({ error: 'Variant not found' });

  const newStock = variant.stock + quantity;
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });

  const movement = await prisma.stockMovement.create({
    data: {
      productId,
      variantId,
      type: 'INWARD',
      quantity,
      previousStock: variant.stock,
      newStock,
      reason,
      reference,
      createdBy: req.user?.id,
    },
  });

  res.status(201).json(movement);
});

// POST /api/stock/return
router.post('/return', async (req: AuthRequest, res: Response) => {
  const { productId, variantId, quantity, reason } = req.body;

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return res.status(404).json({ error: 'Variant not found' });

  const newStock = variant.stock + quantity;
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });

  const movement = await prisma.stockMovement.create({
    data: {
      productId, variantId, type: 'RETURN', quantity,
      previousStock: variant.stock, newStock, reason, createdBy: req.user?.id,
    },
  });

  res.status(201).json(movement);
});

// POST /api/stock/damaged
router.post('/damaged', async (req: AuthRequest, res: Response) => {
  const { productId, variantId, quantity, reason } = req.body;

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return res.status(404).json({ error: 'Variant not found' });

  const newStock = Math.max(0, variant.stock - quantity);
  await prisma.productVariant.update({ where: { id: variantId }, data: { stock: newStock } });

  const movement = await prisma.stockMovement.create({
    data: {
      productId, variantId, type: 'DAMAGED', quantity: -quantity,
      previousStock: variant.stock, newStock, reason, createdBy: req.user?.id,
    },
  });

  res.status(201).json(movement);
});

// GET /api/stock/movements
router.get('/movements', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', productId, type } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (productId) where.productId = productId;
  if (type) where.type = type;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where, skip, take,
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { color: true, size: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  res.json({
    data: movements,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

// GET /api/stock/low-stock
router.get('/low-stock', async (_req, res: Response) => {
  const lowStockVariants = await prisma.productVariant.findMany({
    where: { stock: { lte: 5 } },
    include: { product: { select: { name: true, sku: true, category: { select: { name: true } } } } },
    orderBy: { stock: 'asc' },
    take: 50,
  });
  res.json(lowStockVariants);
});

// POST /api/stock/bulk-update
router.post('/bulk-update', async (req: AuthRequest, res: Response) => {
  const { updates } = req.body as {
    updates: Array<{ variantId: string; productId: string; stock: number; reason?: string }>;
  };

  const results = await Promise.all(
    updates.map(async (update) => {
      const variant = await prisma.productVariant.findUnique({ where: { id: update.variantId } });
      if (!variant) return null;

      const [updated] = await prisma.$transaction([
        prisma.productVariant.update({ where: { id: update.variantId }, data: { stock: update.stock } }),
        prisma.stockMovement.create({
          data: {
            productId: update.productId,
            variantId: update.variantId,
            type: 'ADJUSTMENT',
            quantity: update.stock - variant.stock,
            previousStock: variant.stock,
            newStock: update.stock,
            reason: update.reason || 'Bulk update',
            createdBy: req.user?.id,
          },
        }),
      ]);
      return updated;
    })
  );

  res.json({ updated: results.filter(Boolean).length });
});

export default router;
