import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/products - list with filters, pagination, search
router.get('/', async (req: AuthRequest, res: Response) => {
  const {
    page = '1',
    limit = '20',
    search = '',
    categoryId,
    gender,
    brand,
    lowStock,
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: Record<string, unknown> = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { sku: { contains: search as string, mode: 'insensitive' } },
      { brand: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (gender) where.gender = gender;
  if (brand) where.brand = brand;

  if (lowStock === 'true') {
    where.variants = { some: { stock: { lte: 5 } } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      include: {
        category: { select: { name: true } },
        variants: { select: { id: true, color: true, size: true, stock: true, minStock: true, wholesalePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    data: products,
    meta: {
      total,
      page: parseInt(page as string),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  });
});

// GET /api/products/frequent - get top 5 products (customer-specific or top selling store-wide)
router.get('/frequent', async (req: AuthRequest, res: Response) => {
  const { customerId, limit = '5' } = req.query;
  const targetLimit = parseInt(limit as string);
  let productIds: string[] = [];
  let isPersonalized = false;

  if (customerId && typeof customerId === 'string' && customerId.trim() !== '') {
    // Find top purchased items for this customer from past invoices
    const frequentItems = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { customerId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: targetLimit,
    });
    if (frequentItems.length > 0) {
      productIds = frequentItems.map((item) => item.productId);
      isPersonalized = true;
    }
  }

  // If customer has no previous orders or no customer selected, fetch top selling products overall
  if (productIds.length < targetLimit) {
    const popularItems = await prisma.invoiceItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: targetLimit,
    });
    const popularIds = popularItems.map((item) => item.productId);
    for (const pid of popularIds) {
      if (!productIds.includes(pid)) {
        productIds.push(pid);
      }
    }
  }

  // Fetch product objects with category and variants
  let products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
    include: {
      category: { select: { name: true } },
      variants: { select: { id: true, color: true, size: true, stock: true, minStock: true, wholesalePrice: true } },
    },
  });

  // If still fewer than limit (e.g., brand new store with zero invoices), fetch latest active products
  if (products.length < targetLimit) {
    const fallbackProducts = await prisma.product.findMany({
      where: { isActive: true },
      take: targetLimit,
      include: {
        category: { select: { name: true } },
        variants: { select: { id: true, color: true, size: true, stock: true, minStock: true, wholesalePrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Merge fallback products without duplicates
    for (const fp of fallbackProducts) {
      if (!products.some((p) => p.id === fp.id)) {
        products.push(fp);
      }
    }
  }

  res.json({
    data: products.slice(0, targetLimit),
    isPersonalized,
  });
});

// GET /api/products/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {

  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      variants: true,
      stockMovements: { take: 10, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/products
router.post('/', async (req: AuthRequest, res: Response) => {
  const {
    name, sku, categoryId, brand, gender, sleeveType,
    gstPercent, purchasePrice, wholesalePrice, retailPrice,
    description, imageUrl, variants,
  } = req.body;

  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) return res.status(400).json({ error: 'SKU already exists' });

  const product = await prisma.product.create({
    data: {
      name, sku, categoryId, brand, gender, sleeveType,
      gstPercent: gstPercent || 5,
      purchasePrice: purchasePrice || 0,
      wholesalePrice,
      retailPrice,
      description,
      imageUrl,
      variants: variants ? {
        create: variants.map((v: { color: string; size: string; stock?: number; minStock?: number }) => ({
          color: v.color,
          size: v.size,
          stock: v.stock || 0,
          minStock: v.minStock || 5,
        })),
      } : undefined,
    },
    include: { category: true, variants: true },
  });

  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { variants, ...data } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
    include: { category: true, variants: true },
  });

  res.json(product);
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ message: 'Product deleted successfully' });
});

// POST /api/products/:id/duplicate
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  const original = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!original) return res.status(404).json({ error: 'Product not found' });

  const newSku = `${original.sku}-COPY-${Date.now()}`;
  const { id, createdAt, updatedAt, variants, ...data } = original;
  void id; void createdAt; void updatedAt;

  const duplicate = await prisma.product.create({
    data: {
      ...data,
      sku: newSku,
      name: `${original.name} (Copy)`,
      variants: {
        create: variants.map(({ id: _id, productId: _pid, createdAt: _ca, updatedAt: _ua, ...v }) => ({
          ...v,
          stock: 0,
        })),
      },
    },
    include: { variants: true },
  });

  res.status(201).json(duplicate);
});

// PATCH /api/products/variants/:variantId/stock
router.patch('/variants/:variantId/stock', async (req: AuthRequest, res: Response) => {
  const { stock } = req.body;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: req.params.variantId },
      });
      if (!variant) throw new Error('Variant not found');

      const updatedVariant = await tx.productVariant.update({
        where: { id: req.params.variantId },
        data: { stock },
      });

      // Log stock movement
      await tx.stockMovement.create({
        data: {
          productId: variant.productId,
          variantId: variant.id,
          type: 'ADJUSTMENT',
          quantity: stock - variant.stock,
          previousStock: variant.stock,
          newStock: stock,
          reason: 'Manual adjustment',
          createdBy: req.user?.id,
        },
      });

      return updatedVariant;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update variant stock' });
  }
});


// GET /api/products/:id/variants
router.get('/:id/variants', async (req: AuthRequest, res: Response) => {
  const variants = await prisma.productVariant.findMany({
    where: { productId: req.params.id },
    orderBy: [{ color: 'asc' }, { size: 'asc' }],
  });
  res.json(variants);
});

// POST /api/products/:id/variants
router.post('/:id/variants', async (req: AuthRequest, res: Response) => {
  const { color, size, stock, minStock, wholesalePrice, purchasePrice } = req.body;

  const variant = await prisma.productVariant.create({
    data: {
      productId: req.params.id,
      color,
      size,
      stock: stock || 0,
      minStock: minStock || 5,
      wholesalePrice,
      purchasePrice,
    },
  });

  res.status(201).json(variant);
});

export default router;
