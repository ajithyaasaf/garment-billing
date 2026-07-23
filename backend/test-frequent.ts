import express from 'express';
import productRoutes from './src/routes/products';
import { prisma } from './src/lib/prisma';
import jwt from 'jsonwebtoken';

async function testExpressRoute() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found');
    return;
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret');

  const app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);

  const server = app.listen(5001, async () => {
    console.log('Test server listening on 5001');
    try {
      const res = await fetch('http://localhost:5001/api/products/frequent?limit=5', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('RESPONSE STATUS:', res.status);
      console.log('RESPONSE DATA:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      server.close();
    }
  });
}

testExpressRoute();
