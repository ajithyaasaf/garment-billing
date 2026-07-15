import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getStateFromGst } from '../lib/gst';

const router = Router();
router.use(authenticate);

// GET /api/suppliers
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', search = '' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    where.OR = [
      { shopName: { contains: search as string, mode: 'insensitive' } },
      { ownerName: { contains: search as string, mode: 'insensitive' } },
      { whatsapp: { contains: search as string } },
      { city: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take,
      orderBy: [
        { shopName: 'asc' },
        { ownerName: 'asc' }
      ],
      include: {
        _count: { select: { purchaseBills: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  res.json({
    data: suppliers,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

// GET /api/suppliers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      purchaseBills: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, billNumber: true, totalAmount: true, paymentStatus: true, billDate: true },
      },
    },
  });
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  // Calculate outstanding balance
  const outstanding = await prisma.purchaseBill.aggregate({
    where: { supplierId: req.params.id, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
    _sum: { dueAmount: true },
  });

  res.json({ ...supplier, outstandingBalance: outstanding._sum.dueAmount || 0 });
});

// POST /api/suppliers
router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.body.gstNumber) {
    const derivedState = getStateFromGst(req.body.gstNumber);
    if (derivedState) {
      req.body.state = derivedState;
    }
  }

  // Normalize empty strings to null for optional database fields
  if (req.body.gstNumber === '') req.body.gstNumber = null;
  if (req.body.email === '') req.body.email = null;

  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  if (req.body.gstNumber) {
    const derivedState = getStateFromGst(req.body.gstNumber);
    if (derivedState) {
      req.body.state = derivedState;
    }
  }

  if (req.body.gstNumber === '') req.body.gstNumber = null;
  if (req.body.email === '') req.body.email = null;

  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update supplier' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Supplier deleted successfully', supplier });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to delete supplier' });
  }
});

export default router;
