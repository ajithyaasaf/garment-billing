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

// Helper to sanitize & validate supplier input
function sanitizeSupplierInput(body: any) {
  const {
    shopName,
    ownerName,
    whatsapp,
    email,
    gstNumber,
    address,
    city,
    state = 'Tamil Nadu',
    pincode,
  } = body;

  if (!shopName || typeof shopName !== 'string' || shopName.trim().length < 2) {
    throw new Error('Shop name is required and must be at least 2 characters');
  }

  if (!ownerName || typeof ownerName !== 'string' || ownerName.trim().length < 2) {
    throw new Error('Owner / Contact name is required and must be at least 2 characters');
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
    shopName: shopName.trim(),
    ownerName: ownerName.trim(),
    whatsapp: cleanWhatsapp,
    email: cleanEmail,
    gstNumber: cleanGst,
    address: address && String(address).trim() !== '' ? String(address).trim() : null,
    city: city && String(city).trim() !== '' ? String(city).trim() : null,
    state: derivedState,
    pincode: cleanPincode,
  };
}

// POST /api/suppliers
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = sanitizeSupplierInput(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create supplier' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = sanitizeSupplierInput(req.body);
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data,
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
