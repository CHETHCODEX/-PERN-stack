export interface LineItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  gstPct?: number;
}

export interface CalculatedItemResult {
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  lineAmount: number;
}

export interface QuotationCalculationResult {
  items: CalculatedItemResult[];
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
}

/**
 * Calculates quotation amounts on the backend.
 * Never trust total amounts submitted by the client.
 */
export function calculateQuotationTotals(items: LineItemInput[]): QuotationCalculationResult {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalGst = 0;
  let grandTotal = 0;

  const calculatedItems: CalculatedItemResult[] = items.map((item) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const discountPct = Math.min(100, Math.max(0, Number(item.discountPct) || 0));
    const gstPct = Math.max(0, Number(item.gstPct ?? 18));

    const baseAmount = Number((quantity * unitPrice).toFixed(2));
    const discountAmount = Number(((baseAmount * discountPct) / 100).toFixed(2));
    const taxableAmount = Number((baseAmount - discountAmount).toFixed(2));
    const gstAmount = Number(((taxableAmount * gstPct) / 100).toFixed(2));
    const lineAmount = Number((taxableAmount + gstAmount).toFixed(2));

    subtotal += baseAmount;
    totalDiscount += discountAmount;
    totalGst += gstAmount;
    grandTotal += lineAmount;

    return {
      productId: item.productId,
      quantity,
      unitPrice,
      discountPct,
      gstPct,
      baseAmount,
      discountAmount,
      taxableAmount,
      gstAmount,
      lineAmount,
    };
  });

  return {
    items: calculatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    totalGst: Number(totalGst.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}
