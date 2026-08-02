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

  const where: Record<string, any> = { isActive: true };
  if (search) {
    where.OR = [
      { shopName: { contains: search as string, mode: 'insensitive' } },
      { ownerName: { contains: search as string, mode: 'insensitive' } },
      { whatsapp: { contains: search as string } },
      { city: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (req.query.type && (req.query.type === 'RETAIL' || req.query.type === 'WHOLESALE')) {
    where.type = req.query.type;
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

// Helper to sanitize & validate customer input
function sanitizeCustomerInput(body: any) {
  const {
    type = 'WHOLESALE',
    shopName,
    ownerName,
    whatsapp,
    email,
    gstNumber,
    address,
    city,
    state = 'Tamil Nadu',
    pincode,
    creditLimit = 0,
    paymentTerms = '30 days',
  } = body;

  if (type === 'WHOLESALE' && (!shopName || typeof shopName !== 'string' || shopName.trim().length < 2)) {
    throw new Error('Shop name is required for wholesale customers');
  }

  if (!ownerName || typeof ownerName !== 'string' || ownerName.trim().length < 2) {
    throw new Error('Owner / Customer name is required and must be at least 2 characters');
  }

  const cleanWhatsapp = whatsapp ? String(whatsapp).trim() : '';
  if (!cleanWhatsapp || !/^[6-9]\d{9}$/.test(cleanWhatsapp)) {
    throw new Error('Valid 10-digit mobile number is required for WhatsApp');
  }

  let cleanEmail = null;
  if (email && String(email).trim() !== '') {
    cleanEmail = String(email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Invalid email address format');
    }
  }

  let cleanGst = null;
  let derivedState = state || 'Tamil Nadu';
  if (gstNumber && String(gstNumber).trim() !== '') {
    cleanGst = String(gstNumber).trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGst)) {
      throw new Error('Invalid 15-character GSTIN format');
    }
    const autoState = getStateFromGst(cleanGst);
    if (autoState) derivedState = autoState;
  }

  let cleanPincode = null;
  if (pincode && String(pincode).trim() !== '') {
    cleanPincode = String(pincode).trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      throw new Error('Pincode must be a 6-digit number');
    }
  }

  return {
    type: (type === 'RETAIL' ? 'RETAIL' : 'WHOLESALE') as 'RETAIL' | 'WHOLESALE',
    shopName: shopName && String(shopName).trim() !== '' ? String(shopName).trim() : null,
    ownerName: String(ownerName).trim(),
    whatsapp: cleanWhatsapp,
    email: cleanEmail,
    gstNumber: cleanGst,
    address: address && String(address).trim() !== '' ? String(address).trim() : null,
    city: city && String(city).trim() !== '' ? String(city).trim() : null,
    state: derivedState,
    pincode: cleanPincode,
    creditLimit: Number(creditLimit) || 0,
    paymentTerms: paymentTerms ? String(paymentTerms).trim() : '30 days',
  };
}

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = sanitizeCustomerInput(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create customer' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = sanitizeCustomerInput(req.body);
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update customer' });
  }
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
