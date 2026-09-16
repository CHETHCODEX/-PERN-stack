import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database in schema pern_erp...');

  // 1. Seed Users (Admin and Sales)
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fundsroom.com' },
    update: {},
    create: {
      name: 'Operations Admin',
      email: 'admin@fundsroom.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@fundsroom.com' },
    update: {},
    create: {
      name: 'Sales Executive',
      email: 'sales@fundsroom.com',
      passwordHash,
      role: Role.SALES,
    },
  });

  console.log('Users seeded:', admin.email, sales.email);

  // 2. Seed 6 Industrial Products with Inventory
  const productsData = [
    {
      productCode: 'IND-VALV-001',
      productName: 'Heavy-Duty Industrial Ball Valve 2-inch',
      category: 'Valves & Fittings',
      unit: 'Pieces',
      basePrice: 1850.0,
      physicalQty: 120,
      reservedQty: 20,
    },
    {
      productCode: 'IND-MOTR-002',
      productName: '3-Phase Induction Motor 5HP 1440 RPM',
      category: 'Electrical Motors',
      unit: 'Units',
      basePrice: 14200.0,
      physicalQty: 45,
      reservedQty: 5,
    },
    {
      productCode: 'IND-PUMP-003',
      productName: 'Centrifugal Water Pump 3HP',
      category: 'Pumps & Fluid Handling',
      unit: 'Units',
      basePrice: 9800.0,
      physicalQty: 60,
      reservedQty: 10,
    },
    {
      productCode: 'IND-FLNG-004',
      productName: 'Stainless Steel Flange ANSI Class 150',
      category: 'Piping & Flanges',
      unit: 'Pieces',
      basePrice: 750.0,
      physicalQty: 300,
      reservedQty: 50,
    },
    {
      productCode: 'IND-BEAR-005',
      productName: 'High-Precision Deep Groove Ball Bearing 6205',
      category: 'Bearings & Bushings',
      unit: 'Pieces',
      basePrice: 320.0,
      physicalQty: 500,
      reservedQty: 80,
    },
    {
      productCode: 'IND-PNEU-006',
      productName: 'Pneumatic Air Cylinder 50mm Bore 200mm Stroke',
      category: 'Pneumatics & Automation',
      unit: 'Pieces',
      basePrice: 3450.0,
      physicalQty: 80,
      reservedQty: 15,
    },
  ];

  for (const item of productsData) {
    const { physicalQty, reservedQty, ...prodData } = item;
    const product = await prisma.product.upsert({
      where: { productCode: prodData.productCode },
      update: {
        productName: prodData.productName,
        category: prodData.category,
        unit: prodData.unit,
        basePrice: prodData.basePrice,
      },
      create: prodData,
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        physicalQty,
        reservedQty,
      },
      create: {
        productId: product.id,
        physicalQty,
        reservedQty,
      },
    });
  }

  console.log('Seeded 6 industrial products with inventory levels.');

  // 3. Seed Realistic Customers
  const customersData = [
    {
      companyName: 'ABC Engineering Pvt. Ltd.',
      contactPerson: 'Rajesh Kumar',
      mobile: '+91 98765 43210',
      email: 'rajesh@abcengineering.in',
      city: 'Pune',
    },
    {
      companyName: 'Apex Industrial Dynamics',
      contactPerson: 'Vikram Singh',
      mobile: '+91 98111 22334',
      email: 'vikram.singh@apexind.com',
      city: 'Bengaluru',
    },
    {
      companyName: 'Bharat Hydraulic Systems',
      contactPerson: 'Suresh Patil',
      mobile: '+91 97654 32198',
      email: 'spatil@bharathydraulics.co.in',
      city: 'Coimbatore',
    },
  ];

  for (const cust of customersData) {
    const existing = await prisma.customer.findFirst({
      where: { companyName: cust.companyName },
    });
    if (!existing) {
      await prisma.customer.create({ data: cust });
    }
  }

  console.log('Seeded customer records.');
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
