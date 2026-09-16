"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStockSchema = exports.dispatchSchema = exports.updateQuotationStatusSchema = exports.quotationSchema = exports.quotationItemInputSchema = exports.updateEnquiryStatusSchema = exports.enquirySchema = exports.enquiryItemSchema = exports.customerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Valid email is required'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.customerSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(2, 'Company name is required'),
    contactPerson: zod_1.z.string().min(2, 'Contact person is required'),
    mobile: zod_1.z.string().min(7, 'Mobile number is required'),
    email: zod_1.z.string().email('Valid email is required'),
    city: zod_1.z.string().min(2, 'City is required'),
});
exports.enquiryItemSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive('Product ID must be valid'),
    quantity: zod_1.z.number().int().positive('Quantity must be greater than 0'),
});
exports.enquirySchema = zod_1.z.object({
    customerId: zod_1.z.number().int().positive('Customer ID is required'),
    requiredDate: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Valid required date is required',
    }),
    notes: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.enquiryItemSchema).min(1, 'Enquiry must have at least 1 product item'),
});
exports.updateEnquiryStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['NEW', 'QUOTED', 'WON', 'LOST']),
});
exports.quotationItemInputSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive('Product ID is required'),
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    unitPrice: zod_1.z.number().positive('Unit price must be positive'),
    discountPct: zod_1.z.number().min(0).max(100).optional().default(0),
    gstPct: zod_1.z.number().min(0).max(100).optional().default(18),
});
exports.quotationSchema = zod_1.z.object({
    enquiryId: zod_1.z.number().int().positive('Enquiry ID is required'),
    validUntil: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Valid expiry date is required',
    }),
    items: zod_1.z.array(exports.quotationItemInputSchema).min(1, 'Quotation must have at least 1 product item'),
});
exports.updateQuotationStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']),
});
exports.dispatchSchema = zod_1.z.object({
    vehicleNumber: zod_1.z.string().min(3, 'Vehicle number is required'),
    driverName: zod_1.z.string().min(2, 'Driver name is required'),
});
exports.updateStockSchema = zod_1.z.object({
    physicalQty: zod_1.z.number().int().min(0, 'Physical quantity cannot be negative'),
});
