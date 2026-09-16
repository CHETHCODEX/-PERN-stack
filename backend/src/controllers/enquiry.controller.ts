import { generateSequenceNumber } from '../utils/numberGenerator';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function getEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enquiries = await prisma.enquiry.findMany({
      orderBy: { id: 'desc' },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        quotation: {
          select: { id: true, quotationNumber: true, status: true, grandTotal: true },
        },
      },
    });

    res.json({ enquiries });
  } catch (error) {
    next(error);
  }
}

export async function createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { customerId, requiredDate, notes, items } = req.body;
    const userId = req.user!.id;

    // Generate enquiry number e.g. ENQ-2026-0001
    const enquiryNumber = generateSequenceNumber('ENQ');

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNumber,
        customerId,
        createdById: userId,
        requiredDate: new Date(requiredDate),
        notes,
        status: 'NEW',
        items: {
          create: items.map((i: { productId: number; quantity: number }) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(201).json({ enquiry });
  } catch (error) {
    next(error);
  }
}

export async function getEnquiryById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
        quotation: true,
      },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found' });
      return;
    }

    res.json({ enquiry });
  } catch (error) {
    next(error);
  }
}

export async function updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;

    const updated = await prisma.enquiry.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    res.json({ enquiry: updated });
  } catch (error) {
    next(error);
  }
}
