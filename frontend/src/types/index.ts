export type Role = 'ADMIN' | 'SALES';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
}

export interface Inventory {
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  updatedAt?: string;
}

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  basePrice: number;
  inventory: Inventory;
}

export type EnquiryStatus = 'NEW' | 'QUOTED' | 'WON' | 'LOST';

export interface EnquiryItem {
  id?: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface Enquiry {
  id: number;
  enquiryNumber: string;
  customerId: number;
  customer: Customer;
  createdBy: User;
  requiredDate: string;
  notes?: string;
  status: EnquiryStatus;
  createdAt: string;
  items: EnquiryItem[];
  quotation?: {
    id: number;
    quotationNumber: string;
    status: QuotationStatus;
    grandTotal: number;
  };
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface QuotationItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  lineAmount: number;
  product?: Product;
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  enquiryId: number;
  enquiry?: Enquiry;
  customerId: number;
  customer: Customer;
  createdBy: User;
  grandTotal: number;
  validUntil: string;
  status: QuotationStatus;
  createdAt: string;
  items: QuotationItem[];
  salesOrder?: {
    id: number;
    orderNumber: string;
    status: OrderStatus;
  };
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED';

export interface SalesOrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  product?: Product;
}

export interface Dispatch {
  id: number;
  dispatchNumber: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  dispatchedBy: User;
}

export interface SalesOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customer: Customer;
  quotationId: number;
  quotation: Quotation;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: SalesOrderItem[];
  dispatches?: Dispatch[];
}
