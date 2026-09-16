import { generateSequenceNumber } from '../utils/numberGenerator';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { calculateQuotationTotals } from '../utils/calculations';

export async function getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quotations = await prisma.quotation.findMany({
      orderBy: { id: 'desc' },
      include: {
        customer: true,
        enquiry: {
          select: { id: true, enquiryNumber: true, status: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { product: true },
        },
        salesOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    });

    res.json({ quotations });
  } catch (error) {
    next(error);
  }
}

export async function createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { enquiryId, validUntil, items } = req.body;
    const userId = req.user!.id;

    // Check if enquiry exists
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: { customer: true, quotation: true },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }

    if (enquiry.quotation) {
      res.status(400).json({
        error: `Enquiry ${enquiry.enquiryNumber} already has a quotation (${enquiry.quotation.quotationNumber}).`,
      });
      return;
    }

    // Backend calculation of line items and grand total
    const calcResult = calculateQuotationTotals(items);

    const quotationNumber = generateSequenceNumber('QUO');

    // Transaction: Create quotation + items, update enquiry status to QUOTED
    const quotation = await prisma.$transaction(async (tx) => {
      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          enquiryId,
          customerId: enquiry.customerId,
          createdById: userId,
          validUntil: new Date(validUntil),
          grandTotal: calcResult.grandTotal,
          status: 'DRAFT',
          items: {
            create: calcResult.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discountPct: i.discountPct,
              gstPct: i.gstPct,
              lineAmount: i.lineAmount,
            })),
          },
        },
        include: {
          customer: true,
          enquiry: true,
          items: {
            include: { product: true },
          },
        },
      });

      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { status: 'QUOTED' },
      });

      return created;
    });

    res.status(201).json({
      quotation,
      calculationSummary: {
        subtotal: calcResult.subtotal,
        totalDiscount: calcResult.totalDiscount,
        totalGst: calcResult.totalGst,
        grandTotal: calcResult.grandTotal,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: {
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
        salesOrder: true,
      },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    res.json({ quotation });
  } catch (error) {
    next(error);
  }
}

export async function updateQuotationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { status } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { enquiry: true },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id },
        data: { status },
        include: { customer: true, enquiry: true },
      });

      // Update linked enquiry status if accepted or rejected
      if (status === 'ACCEPTED') {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: 'WON' },
        });
      } else if (status === 'REJECTED') {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: 'LOST' },
        });
      }

      return q;
    });

    res.json({ quotation: updated });
  } catch (error) {
    next(error);
  }
}

export async function convertQuotationToSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        salesOrder: true,
      },
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }

    // Rule 1: Cannot convert DRAFT or REJECTED quotation
    if (quotation.status !== 'ACCEPTED') {
      res.status(400).json({
        error: `Cannot convert quotation with status '${quotation.status}'. Only ACCEPTED quotations can be converted into Sales Orders.`,
      });
      return;
    }

    // Rule 2: Cannot convert duplicate sales orders from the same quotation
    if (quotation.salesOrder) {
      res.status(409).json({
        error: `A Sales Order (${quotation.salesOrder.orderNumber}) has already been generated for this quotation.`,
      });
      return;
    }

    const count = await prisma.salesOrder.count();
    const orderNumber = `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        totalAmount: quotation.grandTotal,
        status: 'PENDING',
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,
          })),
        },
      },
      include: {
        customer: true,
        quotation: true,
        items: {
          include: { product: true },
        },
      },
    });

    res.status(201).json({
      message: 'Quotation successfully converted to Sales Order',
      salesOrder,
    });
  } catch (error) {
    next(error);
  }
}
