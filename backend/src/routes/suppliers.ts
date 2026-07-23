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

// Helper to sanitize supplier input
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

  if (!shopName || !ownerName || !whatsapp) {
    throw new Error('Shop name, owner name, and WhatsApp number are required');
  }

  let derivedState = state;
  if (gstNumber) {
    const autoState = getStateFromGst(gstNumber);
    if (autoState) derivedState = autoState;
  }

  return {
    shopName: shopName.trim(),
    ownerName: ownerName.trim(),
    whatsapp: whatsapp.trim(),
    email: email && email.trim() !== '' ? email.trim() : null,
    gstNumber: gstNumber && gstNumber.trim() !== '' ? gstNumber.trim().toUpperCase() : null,
    address: address && address.trim() !== '' ? address.trim() : null,
    city: city && city.trim() !== '' ? city.trim() : null,
    state: derivedState,
    pincode: pincode && pincode.trim() !== '' ? pincode.trim() : null,
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
