import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res: Response) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const category = await prisma.category.create({ data: { name, slug } });
  res.status(201).json(category);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, slug },
  });
  res.json(category);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Category deleted' });
});

export default router;
