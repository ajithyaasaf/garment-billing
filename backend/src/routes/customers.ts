import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getStateFromGst } from '../lib/gst';

const router = Router();
router.use(authenticate);

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

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: [
        { shopName: 'asc' },
        { ownerName: 'asc' }
      ],
      include: {
        _count: { select: { invoices: true, quotations: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    data: customers,
    meta: { total, page: parseInt(page as string), limit: take, totalPages: Math.ceil(total / take) },
  });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      invoices: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, invoiceNumber: true, totalAmount: true, paymentStatus: true, invoiceDate: true },
      },
      quotations: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, quotationNumber: true, totalAmount: true, status: true, createdAt: true },
      },
    },
  });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Calculate outstanding balance
  const outstanding = await prisma.invoice.aggregate({
    where: { customerId: req.params.id, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
    _sum: { dueAmount: true },
  });

  res.json({ ...customer, outstandingBalance: outstanding._sum.dueAmount || 0 });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.body.gstNumber) {
    const derivedState = getStateFromGst(req.body.gstNumber);
    if (derivedState) {
      req.body.state = derivedState;
    }
  }
  // Normalize empty strings to null for optional database fields
  if (req.body.shopName === '') req.body.shopName = null;
  if (req.body.gstNumber === '') req.body.gstNumber = null;
  if (req.body.email === '') req.body.email = null;

  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json(customer);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  if (req.body.gstNumber) {
    const derivedState = getStateFromGst(req.body.gstNumber);
    if (derivedState) {
      req.body.state = derivedState;
    }
  }
  // Normalize empty strings to null for optional database fields
  if (req.body.shopName === '') req.body.shopName = null;
  if (req.body.gstNumber === '') req.body.gstNumber = null;
  if (req.body.email === '') req.body.email = null;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(customer);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.customer.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ message: 'Customer deleted' });
});

// GET /api/customers/:id/analytics
router.get('/:id/analytics', async (req: AuthRequest, res: Response) => {
  const [totalPurchases, totalPaid, totalDue, invoiceCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { customerId: req.params.id },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { customerId: req.params.id },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { customerId: req.params.id, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
      _sum: { dueAmount: true },
    }),
    prisma.invoice.count({ where: { customerId: req.params.id } }),
  ]);

  res.json({
    totalPurchases: totalPurchases._sum.totalAmount || 0,
    totalPaid: totalPaid._sum.paidAmount || 0,
    totalDue: totalDue._sum.dueAmount || 0,
    invoiceCount,
  });
});

export default router;
