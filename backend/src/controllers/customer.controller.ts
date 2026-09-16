import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: {
            enquiries: true,
            quotations: true,
            salesOrders: true,
          },
        },
      },
    });
    res.json({ customers });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { companyName, contactPerson, mobile, email, city } = req.body;

    const customer = await prisma.customer.create({
      data: {
        companyName,
        contactPerson,
        mobile,
        email,
        city,
      },
    });

    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        enquiries: {
          orderBy: { id: 'desc' },
        },
        quotations: {
          orderBy: { id: 'desc' },
        },
        salesOrders: {
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json({ customer });
  } catch (error) {
    next(error);
  }
}
