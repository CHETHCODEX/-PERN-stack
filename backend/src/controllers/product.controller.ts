import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' },
      include: {
        inventory: true,
      },
    });

    const formatted = products.map((p) => {
      const physical = p.inventory?.physicalQty ?? 0;
      const reserved = p.inventory?.reservedQty ?? 0;
      const available = physical - reserved;

      return {
        id: p.id,
        productCode: p.productCode,
        productName: p.productName,
        category: p.category,
        unit: p.unit,
        basePrice: Number(p.basePrice),
        inventory: {
          physicalQty: physical,
          reservedQty: reserved,
          availableQty: available,
          updatedAt: p.inventory?.updatedAt,
        },
      };
    });

    res.json({ products: formatted });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params.id), 10);
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const physical = product.inventory?.physicalQty ?? 0;
    const reserved = product.inventory?.reservedQty ?? 0;
    const available = physical - reserved;

    res.json({
      product: {
        id: product.id,
        productCode: product.productCode,
        productName: product.productName,
        category: product.category,
        unit: product.unit,
        basePrice: Number(product.basePrice),
        inventory: {
          physicalQty: physical,
          reservedQty: reserved,
          availableQty: available,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePhysicalInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = parseInt(String(req.params.productId), 10);
    const { physicalQty } = req.body;

    const currentInv = await prisma.inventory.findUnique({
      where: { productId },
    });

    if (!currentInv) {
      res.status(404).json({ error: 'Inventory record not found for this product' });
      return;
    }

    if (physicalQty < currentInv.reservedQty) {
      res.status(400).json({
        error: `Cannot reduce physical stock (${physicalQty}) below currently reserved quantity (${currentInv.reservedQty}).`,
      });
      return;
    }

    const updated = await prisma.inventory.update({
      where: { productId },
      data: {
        physicalQty,
      },
    });

    res.json({
      inventory: {
        productId: updated.productId,
        physicalQty: updated.physicalQty,
        reservedQty: updated.reservedQty,
        availableQty: updated.physicalQty - updated.reservedQty,
      },
    });
  } catch (error) {
    next(error);
  }
}
