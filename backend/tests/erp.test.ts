import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import { calculateQuotationTotals } from '../src/utils/calculations';
import { prisma } from '../src/config/db';

let adminToken: string;
let salesToken: string;
let customerId: number;
let productId1: number;
let productId2: number;

beforeAll(async () => {
  // Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@fundsroom.com', password: 'password123' });
  adminToken = adminRes.body.token;

  // Login as Sales
  const salesRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales@fundsroom.com', password: 'password123' });
  salesToken = salesRes.body.token;

  // Fetch a customer and products
  const custRes = await request(app)
    .get('/api/customers')
    .set('Authorization', `Bearer ${salesToken}`);
  customerId = custRes.body.customers[0].id;

  const prodRes = await request(app)
    .get('/api/products')
    .set('Authorization', `Bearer ${salesToken}`);
  productId1 = prodRes.body.products[0].id;
  productId2 = prodRes.body.products[1].id;
});

describe('PERN Mini ERP - Automated Evaluation Test Suite', () => {
  /**
   * TEST 1: Quotation total is calculated correctly on the backend
   * Base Amount = Quantity × Unit Price
   * Apply discount and GST to calculate final amount
   */
  it('Test 1: Quotation totals, line items, discounts, and GST are calculated correctly on the backend', () => {
    const items = [
      { productId: 1, quantity: 10, unitPrice: 1000, discountPct: 10, gstPct: 18 },
      { productId: 2, quantity: 5, unitPrice: 2000, discountPct: 5, gstPct: 18 },
    ];

    const result = calculateQuotationTotals(items);

    // Item 1:
    // Base = 10 * 1000 = 10000
    // Discount 10% = 1000 => Taxable = 9000
    // GST 18% on 9000 = 1620 => Line Total = 10620
    expect(result.items[0].baseAmount).toBe(10000);
    expect(result.items[0].discountAmount).toBe(1000);
    expect(result.items[0].taxableAmount).toBe(9000);
    expect(result.items[0].gstAmount).toBe(1620);
    expect(result.items[0].lineAmount).toBe(10620);

    // Item 2:
    // Base = 5 * 2000 = 10000
    // Discount 5% = 500 => Taxable = 9500
    // GST 18% on 9500 = 1710 => Line Total = 11210
    expect(result.items[1].baseAmount).toBe(10000);
    expect(result.items[1].discountAmount).toBe(500);
    expect(result.items[1].taxableAmount).toBe(9500);
    expect(result.items[1].gstAmount).toBe(1710);
    expect(result.items[1].lineAmount).toBe(11210);

    // Grand Total = 10620 + 11210 = 21830
    expect(result.grandTotal).toBe(21830);
  });

  /**
   * TEST 2: Rejected or Draft quotation cannot create a Sales Order
   */
  it('Test 2: Rejected or Draft quotation cannot create a Sales Order', async () => {
    // 1. Create Enquiry
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        notes: 'Test 2 enquiry',
        items: [{ productId: productId1, quantity: 5 }],
      });
    const enquiryId = enqRes.body.enquiry.id;

    // 2. Create Quotation in DRAFT status
    const quoRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId,
        validUntil: '2026-10-15',
        items: [{ productId: productId1, quantity: 5, unitPrice: 1000, discountPct: 0, gstPct: 18 }],
      });
    const quotationId = quoRes.body.quotation.id;

    // Try to convert DRAFT quotation -> Expect 400
    const convertDraftRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(convertDraftRes.status).toBe(400);
    expect(convertDraftRes.body.error).toContain('Only ACCEPTED quotations');

    // Reject Quotation
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'REJECTED' });

    // Try to convert REJECTED quotation -> Expect 400
    const convertRejectedRes = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(convertRejectedRes.status).toBe(400);
    expect(convertRejectedRes.body.error).toContain('Only ACCEPTED quotations');
  });

  /**
   * TEST 3: Same quotation cannot generate duplicate Sales Orders
   */
  it('Test 3: Same quotation cannot generate duplicate Sales Orders', async () => {
    // 1. Create Enquiry
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        notes: 'Test 3 enquiry',
        items: [{ productId: productId1, quantity: 2 }],
      });
    const enquiryId = enqRes.body.enquiry.id;

    // 2. Create Quotation
    const quoRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId,
        validUntil: '2026-10-15',
        items: [{ productId: productId1, quantity: 2, unitPrice: 1000, discountPct: 0, gstPct: 18 }],
      });
    const quotationId = quoRes.body.quotation.id;

    // 3. Mark as ACCEPTED
    await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    // 4. First conversion -> Expect 201 Created
    const firstConvert = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(firstConvert.status).toBe(201);
    expect(firstConvert.body.salesOrder).toBeDefined();

    // 5. Second conversion attempt -> Expect 409 Conflict
    const secondConvert = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(secondConvert.status).toBe(409);
    expect(secondConvert.body.error).toContain('already been generated');
  });

  /**
   * TEST 4: Cannot reserve more than available inventory
   */
  it('Test 4: Cannot reserve more than available inventory', async () => {
    // 1. Check current available stock for productId2
    const prodRes = await request(app)
      .get(`/api/products/${productId2}`)
      .set('Authorization', `Bearer ${salesToken}`);
    const available = prodRes.body.product.inventory.availableQty;

    // Request more than available: available + 5000 units
    const requestedQty = available + 5000;

    // 2. Create Enquiry & Accepted Quotation
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        notes: 'Excessive stock test',
        items: [{ productId: productId2, quantity: requestedQty }],
      });

    const quoRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.enquiry.id,
        validUntil: '2026-10-15',
        items: [{ productId: productId2, quantity: requestedQty, unitPrice: 500 }],
      });

    await request(app)
      .patch(`/api/quotations/${quoRes.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    const orderRes = await request(app)
      .post(`/api/quotations/${quoRes.body.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    const orderId = orderRes.body.salesOrder.id;

    // 3. Admin attempts to confirm order beyond available stock -> Expect 400
    const confirmRes = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.code).toBe('INSUFFICIENT_STOCK');
  });

  /**
   * TEST 5: Unauthorized user cannot perform a restricted operation
   */
  it('Test 5: Unauthorized user cannot perform a restricted operation (Sales user calling Admin-only confirm/dispatch)', async () => {
    // 1. Create a valid pending order
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        items: [{ productId: productId1, quantity: 1 }],
      });

    const quoRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqRes.body.enquiry.id,
        validUntil: '2026-10-15',
        items: [{ productId: productId1, quantity: 1, unitPrice: 1000 }],
      });

    await request(app)
      .patch(`/api/quotations/${quoRes.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    const orderRes = await request(app)
      .post(`/api/quotations/${quoRes.body.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    const orderId = orderRes.body.salesOrder.id;

    // 2. SALES user attempts to CONFIRM -> Expect 403 Forbidden
    const salesConfirmRes = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(salesConfirmRes.status).toBe(403);
    expect(salesConfirmRes.body.error).toContain('Access denied');

    // 3. Unauthenticated request -> Expect 401 Unauthorized
    const unauthRes = await request(app).post(`/api/sales-orders/${orderId}/confirm`);
    expect(unauthRes.status).toBe(401);
  });

  /**
   * BONUS TEST: Simultaneous / Concurrent Inventory Reservations
   * Two concurrent requests try to reserve stock when only enough for one exists.
   * Pessimistic row locking ensures only one succeeds and the other fails safely with 400.
   */
  it('Bonus Test: Simultaneous inventory reservations handled with database row locks (pessimistic locking)', async () => {
    // 1. Fetch current available stock for product 1
    const prodRes = await request(app)
      .get(`/api/products/${productId1}`)
      .set('Authorization', `Bearer ${salesToken}`);
    const available = prodRes.body.product.inventory.availableQty;

    // Both orders will ask for 70% of available stock.
    // 70% + 70% = 140% > 100%, so both CANNOT succeed simultaneously.
    const orderQty = Math.max(1, Math.floor(available * 0.7));

    // Create Order A
    const enqA = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        items: [{ productId: productId1, quantity: orderQty }],
      });
    const quoA = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqA.body.enquiry.id,
        validUntil: '2026-10-15',
        items: [{ productId: productId1, quantity: orderQty, unitPrice: 500 }],
      });
    await request(app)
      .patch(`/api/quotations/${quoA.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderARes = await request(app)
      .post(`/api/quotations/${quoA.body.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderAId = orderARes.body.salesOrder.id;

    // Create Order B
    const enqB = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: '2026-10-01',
        items: [{ productId: productId1, quantity: orderQty }],
      });
    const quoB = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enqB.body.enquiry.id,
        validUntil: '2026-10-15',
        items: [{ productId: productId1, quantity: orderQty, unitPrice: 500 }],
      });
    await request(app)
      .patch(`/api/quotations/${quoB.body.quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderBRes = await request(app)
      .post(`/api/quotations/${quoB.body.quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderBId = orderBRes.body.salesOrder.id;

    // Execute both confirms concurrently with Promise.all
    const [resA, resB] = await Promise.all([
      request(app).post(`/api/sales-orders/${orderAId}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app).post(`/api/sales-orders/${orderBId}/confirm`).set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [resA.status, resB.status];
    // Exactly one should succeed (200) and the other fail with insufficient stock (400)
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    const failedRes = resA.status === 400 ? resA : resB;
    expect(failedRes.body.code).toBe('INSUFFICIENT_STOCK');
  });
});
