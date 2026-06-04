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
        customer: { select: { shopName: true } },
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

router.post('/', async (req: AuthRequest, res: Response) => {
  const { customerId, items, notes } = req.body;

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
    return { ...item, totalAmount: total };
  });

  const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

  const order = await prisma.order.create({
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

  res.status(201).json(order);
});

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(order);
});

export default router;
