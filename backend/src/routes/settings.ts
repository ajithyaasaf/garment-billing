import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { getStateFromGst } from '../lib/gst';

const router = Router();
router.use(authenticate);

// GET /api/settings/business
router.get('/business', async (_req, res: Response) => {
  let profile = await prisma.businessProfile.findFirst();
  if (!profile) {
    profile = await prisma.businessProfile.create({
      data: { name: 'My Garment Business', state: 'Tamil Nadu' },
    });
  }
  res.json(profile);
});

// PUT /api/settings/business
router.put('/business', requireAdmin, async (req: AuthRequest, res: Response) => {
  if (req.body.gstNumber) {
    const derivedState = getStateFromGst(req.body.gstNumber);
    if (derivedState) {
      req.body.state = derivedState;
    }
  }
  let profile = await prisma.businessProfile.findFirst();
  if (profile) {
    profile = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: req.body,
    });
  } else {
    profile = await prisma.businessProfile.create({ data: req.body });
  }
  res.json(profile);
});

// GET /api/settings/staff
router.get('/staff', requireAdmin, async (_req, res: Response) => {
  const staff = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(staff);
});

// POST /api/settings/staff
router.post('/staff', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'STAFF', phone },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });

  res.status(201).json(user);
});

// PUT /api/settings/staff/:id
router.put('/staff/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, role, phone, isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, role, phone, isActive },
    select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
  });
  res.json(user);
});

// DELETE /api/settings/staff/:id
router.delete('/staff/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ message: 'Staff deactivated' });
});

// PUT /api/settings/change-password
router.put('/change-password', async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res.json({ message: 'Password updated successfully' });
});

export default router;
