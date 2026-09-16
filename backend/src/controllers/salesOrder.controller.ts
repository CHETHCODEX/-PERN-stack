import { generateSequenceNumber } from '../utils/numberGenerator';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function getSalesOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await prisma.salesOrder.findMany({
      orderBy: { id: 'desc' },
      include: {
        customer: true,
        quotation: {
          select: { id: true, quotationNumber: true, enquiryId: true },
        },
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
        dispatches: true,
      },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
}

export async function getSalesOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          include: {
            enquiry: true,
          },
        },
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
        dispatches: {
          include: {
            items: {
              include: { product: true },
            },
            dispatchedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Sales Order not found' });
      return;
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
}

/**
 * CONFIRM SALES ORDER & RESERVE INVENTORY
 * Critical Backend Concurrency Challenge:
 * Uses PostgreSQL Pessimistic Row Locking (SELECT ... FOR UPDATE)
 * ordered by product_id ASC to eliminate deadlocks and race conditions.
 */
export async function confirmSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Sales order not found' });
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json({
        error: `Cannot confirm order with status '${order.status}'. Only PENDING orders can be confirmed.`,
      });
      return;
    }

    // Sort product IDs in ascending order to prevent deadlocks across concurrent transactions
    const sortedProductIds = Array.from(new Set(order.items.map((i) => i.productId))).sort((a, b) => a - b);

    // Run strict transaction with row-level locks
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock inventory rows with SELECT ... FOR UPDATE in schema pern_erp
      const lockedInventories: Array<{ product_id: number; physical_qty: number; reserved_qty: number }> =
        await tx.$queryRaw`
          SELECT product_id, physical_qty, reserved_qty 
          FROM pern_erp.inventory 
          WHERE product_id = ANY(${sortedProductIds}::int[]) 
          ORDER BY product_id ASC 
          FOR UPDATE
        `;

      const inventoryMap = new Map(lockedInventories.map((inv) => [inv.product_id, inv]));

      // 2. Validate availability for every requested item
      for (const item of order.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw new Error(`Inventory not found for product ID ${item.productId}`);
        }

        const available = inv.physical_qty - inv.reserved_qty;
        if (available < item.quantity) {
          const err: any = new Error(
            `Insufficient stock for Product ID ${item.productId}. Available: ${available}, Requested: ${item.quantity}.`
          );
          err.statusCode = 400;
          err.code = 'INSUFFICIENT_STOCK';
          throw err;
        }
      }

      // 3. Atomically increase reserved quantity (physical stays unchanged)
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE pern_erp.inventory 
          SET reserved_qty = reserved_qty + ${item.quantity}, updated_at = NOW() 
          WHERE product_id = ${item.productId}
        `;
      }

      // 4. Update sales order status to CONFIRMED
      const confirmedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
        },
      });

      return confirmedOrder;
    });

    res.json({
      message: 'Sales order confirmed and inventory successfully reserved.',
      order: result,
    });
  } catch (error: any) {
    if (error.statusCode === 400 || error.code === 'INSUFFICIENT_STOCK') {
      res.status(400).json({ error: error.message, code: 'INSUFFICIENT_STOCK' });
      return;
    }
    next(error);
  }
}

/**
 * CANCEL SALES ORDER & RELEASE RESERVED INVENTORY
 */
export async function cancelSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Sales order not found' });
      return;
    }

    if (order.status === 'DISPATCHED') {
      res.status(400).json({ error: 'Cannot cancel an order that has already been dispatched.' });
      return;
    }

    if (order.status === 'CANCELLED') {
      res.status(400).json({ error: 'Order is already cancelled.' });
      return;
    }

    // If order was CONFIRMED, release the reserved inventory
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          await tx.$executeRaw`
            UPDATE pern_erp.inventory 
            SET reserved_qty = GREATEST(0, reserved_qty - ${item.quantity}), updated_at = NOW() 
            WHERE product_id = ${item.productId}
          `;
        }
      }

      return await tx.salesOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: { customer: true, items: true },
      });
    });

    res.json({
      message: 'Sales order cancelled and reserved stock released.',
      order: cancelledOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DISPATCH CONFIRMED SALES ORDER
 * Physical Quantity decreases AND Reserved Quantity decreases.
 */
export async function dispatchSalesOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { vehicleNumber, driverName } = req.body;
    const userId = req.user!.id;

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true, dispatches: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Sales order not found' });
      return;
    }

    // Rules from case study:
    // 1. Dispatch only CONFIRMED orders
    if (order.status !== 'CONFIRMED') {
      res.status(400).json({
        error: `Cannot dispatch order with status '${order.status}'. Only CONFIRMED orders can be dispatched.`,
      });
      return;
    }

    // 2. Prevent duplicate dispatch
    if (order.dispatches.length > 0) {
      res.status(400).json({ error: 'This sales order has already been dispatched.' });
      return;
    }

    const sortedProductIds = Array.from(new Set(order.items.map((i) => i.productId))).sort((a, b) => a - b);

    const dispatchNumber = generateSequenceNumber('DSP');

    const dispatchRecord = await prisma.$transaction(async (tx) => {
      // Lock rows
      const lockedInventories: Array<{ product_id: number; physical_qty: number; reserved_qty: number }> =
        await tx.$queryRaw`
          SELECT product_id, physical_qty, reserved_qty 
          FROM pern_erp.inventory 
          WHERE product_id = ANY(${sortedProductIds}::int[]) 
          ORDER BY product_id ASC 
          FOR UPDATE
        `;

      const inventoryMap = new Map(lockedInventories.map((inv) => [inv.product_id, inv]));

      // Verify each item doesn't exceed reserved/physical quantities
      for (const item of order.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw new Error(`Inventory not found for product ID ${item.productId}`);
        }
        if (inv.reserved_qty < item.quantity) {
          throw new Error(`Dispatch error: Reserved quantity (${inv.reserved_qty}) is less than item quantity (${item.quantity})`);
        }
        if (inv.physical_qty < item.quantity) {
          throw new Error(`Dispatch error: Physical quantity (${inv.physical_qty}) is less than item quantity (${item.quantity})`);
        }
      }

      // Deduct both physical_qty and reserved_qty
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE pern_erp.inventory 
          SET physical_qty = physical_qty - ${item.quantity}, 
              reserved_qty = reserved_qty - ${item.quantity}, 
              updated_at = NOW() 
          WHERE product_id = ${item.productId}
        `;
      }

      // Create dispatch record
      const dsp = await tx.dispatch.create({
        data: {
          dispatchNumber,
          salesOrderId: order.id,
          vehicleNumber,
          driverName,
          dispatchedById: userId,
          items: {
            create: order.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          salesOrder: true,
          dispatchedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Update sales order status to DISPATCHED
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'DISPATCHED' },
      });

      return dsp;
    });

    res.status(201).json({
      message: 'Sales order successfully dispatched. Physical and reserved inventories deducted.',
      dispatch: dispatchRecord,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Dispatch failed' });
  }
}
