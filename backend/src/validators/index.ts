import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const customerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  mobile: z.string().min(7, 'Mobile number is required'),
  email: z.string().email('Valid email is required'),
  city: z.string().min(2, 'City is required'),
});

export const enquiryItemSchema = z.object({
  productId: z.number().int().positive('Product ID must be valid'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

export const enquirySchema = z.object({
  customerId: z.number().int().positive('Customer ID is required'),
  requiredDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid required date is required',
  }),
  notes: z.string().optional(),
  items: z.array(enquiryItemSchema).min(1, 'Enquiry must have at least 1 product item'),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST']),
});

export const quotationItemInputSchema = z.object({
  productId: z.number().int().positive('Product ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discountPct: z.number().min(0).max(100).optional().default(0),
  gstPct: z.number().min(0).max(100).optional().default(18),
});

export const quotationSchema = z.object({
  enquiryId: z.number().int().positive('Enquiry ID is required'),
  validUntil: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid expiry date is required',
  }),
  items: z.array(quotationItemInputSchema).min(1, 'Quotation must have at least 1 product item'),
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']),
});

export const dispatchSchema = z.object({
  vehicleNumber: z.string().min(3, 'Vehicle number is required'),
  driverName: z.string().min(2, 'Driver name is required'),
});

export const updateStockSchema = z.object({
  physicalQty: z.number().int().min(0, 'Physical quantity cannot be negative'),
});
