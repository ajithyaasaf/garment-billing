import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@garment.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@garment.com',
      password: adminPassword,
      role: 'ADMIN',
      phone: '9876543210',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create business profile
  await prisma.businessProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Sri Garments Tiruppur',
      address: '123, Textile Market, Gandhi Road',
      city: 'Tiruppur',
      state: 'Tamil Nadu',
      pincode: '641601',
      phone: '0421-2234567',
      email: 'info@srigarments.com',
      gstNumber: '33ABCDE1234F1Z5',
      invoicePrefix: 'SG',
      quotationPrefix: 'QT',
      invoiceNotes: 'Thank you for your business! Goods once sold will not be taken back.',
      termsConditions: '1. Payment within 30 days.\n2. Interest @2% per month on overdue amounts.\n3. Subject to Tiruppur jurisdiction.',
    },
  });

  // Create categories
  const categories = ['T-Shirts', 'Shirts', 'Trousers', 'Jeans', 'Frocks', 'Leggings', 'Sarees', 'Kurtas', 'Night Wear', 'Innerwear'];
  const createdCategories: { id: string; name: string }[] = [];

  for (const name of categories) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    createdCategories.push(cat);
  }
  console.log('✅ Categories created:', createdCategories.length);

  // Create sample products
  const products = [
    { name: 'Round Neck Cotton T-Shirt', sku: 'TS001', brand: 'Sri Brand', gender: 'MENS' as const, gstPercent: 5, purchasePrice: 120, wholesalePrice: 180, retailPrice: 250 },
    { name: 'Polo T-Shirt', sku: 'TS002', brand: 'Sri Brand', gender: 'MENS' as const, gstPercent: 5, purchasePrice: 150, wholesalePrice: 220, retailPrice: 300 },
    { name: 'Cotton Casual Shirt', sku: 'SH001', brand: 'Sri Brand', gender: 'MENS' as const, gstPercent: 12, purchasePrice: 200, wholesalePrice: 320, retailPrice: 450 },
    { name: 'Kids Cotton Frock', sku: 'FR001', brand: 'Kids Zone', gender: 'KIDS' as const, gstPercent: 5, purchasePrice: 80, wholesalePrice: 140, retailPrice: 200 },
    { name: 'Ladies Leggings', sku: 'LG001', brand: 'Sri Brand', gender: 'WOMENS' as const, gstPercent: 5, purchasePrice: 60, wholesalePrice: 100, retailPrice: 150 },
  ];

  const colors = ['Red', 'Blue', 'Green', 'White', 'Black', 'Yellow'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

  for (const p of products) {
    const catName = p.gender === 'KIDS' ? 'Frocks' : p.gender === 'WOMENS' ? 'Leggings' : 'T-Shirts';
    const cat = createdCategories.find((c) => c.name === catName) || createdCategories[0];

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      await prisma.product.create({
        data: {
          ...p,
          categoryId: cat.id,
          sleeveType: 'Half Sleeve',
          variants: {
            create: colors.slice(0, 3).flatMap((color) =>
              sizes.slice(0, 4).map((size) => ({
                color,
                size,
                stock: Math.floor(Math.random() * 100) + 10,
                minStock: 5,
              }))
            ),
          },
        },
      });
    }
  }
  console.log('✅ Products created');

  // Create sample customers
  const customers = [
    { shopName: 'Murugan Dress House', ownerName: 'K. Murugan', whatsapp: '9876543211', city: 'Erode', gstNumber: '33PQRST5678G1Z2' },
    { shopName: 'Selvi Textiles', ownerName: 'R. Selvi', whatsapp: '9876543212', city: 'Salem', creditLimit: 50000 },
    { shopName: 'Kumar Fashion', ownerName: 'P. Kumar', whatsapp: '9876543213', city: 'Coimbatore', creditLimit: 100000, gstNumber: '33UVWXY9012H1Z3' },
    { shopName: 'Devi Saree Centre', ownerName: 'S. Devi', whatsapp: '9876543214', city: 'Tiruppur', creditLimit: 75000 },
    { shopName: 'Ram Garments', ownerName: 'T. Raman', whatsapp: '9876543215', city: 'Chennai', creditLimit: 200000, gstNumber: '33ZABCD3456I1Z4' },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: `seed-${c.whatsapp}` },
      update: {},
      create: { id: `seed-${c.whatsapp}`, ...c, state: 'Tamil Nadu', paymentTerms: '30 days' },
    });
  }
  console.log('✅ Customers created');

  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Email: admin@garment.com');
  console.log('   Password: admin123');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
