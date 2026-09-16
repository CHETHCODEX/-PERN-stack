import React, { useState, useEffect } from 'react';

import { api } from '../api/client';

import type { Quotation, Enquiry, Product } from '../types';

import {

  FileSpreadsheet,

  Plus,

  CheckCircle2,

  XCircle,

  Send,

  AlertCircle,

  } from 'lucide-react';



interface QuotationsPageProps {

  initialEnquiryId?: number | null;

  onNavigateToOrders: (orderId: number) => void;

}



export const QuotationsPage: React.FC<QuotationsPageProps> = ({

  initialEnquiryId,

  onNavigateToOrders,

}) => {

  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);



  // New Quotation form state

  const [selectedEnquiryId, setSelectedEnquiryId] = useState<number>(0);

  const [validUntil, setValidUntil] = useState('');

  const [quoteItems, setQuoteItems] = useState<

    Array<{

      productId: number;

      quantity: number;

      unitPrice: number;

      discountPct: number;

      gstPct: number;

    }>

  >([]);

  const [submitting, setSubmitting] = useState(false);



  const fetchData = async () => {

    setLoading(true);

    try {

      const [quoRes, enqRes, prodRes] = await Promise.all([

        api.get('/quotations'),

        api.get('/enquiries'),

        api.get('/products'),

      ]);

      setQuotations(quoRes.data.quotations);

      setEnquiries(enqRes.data.enquiries);

      setProducts(prodRes.data.products);

    } catch (err: any) {

      setError(err.response?.data?.error || 'Failed to fetch quotations.');

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchData();

  }, []);



  // When initialEnquiryId is passed from Enquiries screen, automatically trigger Quotation modal

  useEffect(() => {

    if (initialEnquiryId && enquiries.length > 0) {

      handleSelectEnquiry(initialEnquiryId);

      setShowModal(true);

    }

  }, [initialEnquiryId, enquiries]);



  const handleSelectEnquiry = (enquiryId: number) => {

    setSelectedEnquiryId(enquiryId);

    const enq = enquiries.find((e) => e.id === enquiryId);

    if (enq && enq.items) {

      const mapped = enq.items.map((item) => {

        const prod = products.find((p) => p.id === item.productId);

        return {

          productId: item.productId,

          quantity: item.quantity,

          unitPrice: prod?.basePrice || 1000,

          discountPct: 0,

          gstPct: 18,

        };

      });

      setQuoteItems(mapped);



      // Default valid until 15 days from now

      const expiry = new Date();

      expiry.setDate(expiry.getDate() + 15);

      setValidUntil(expiry.toISOString().split('T')[0]);

    }

  };



  const handleItemChange = (

    index: number,

    field: 'quantity' | 'unitPrice' | 'discountPct' | 'gstPct',

    value: number

  ) => {

    const updated = [...quoteItems];

    updated[index] = { ...updated[index], [field]: value };

    setQuoteItems(updated);

  };



  // Real-time client preview total (note: backend strictly computes final total)

  const calculatePreviewTotal = () => {

    let grand = 0;

    quoteItems.forEach((i) => {

      const base = i.quantity * i.unitPrice;

      const discount = (base * (i.discountPct || 0)) / 100;

      const taxable = base - discount;

      const gst = (taxable * (i.gstPct || 18)) / 100;

      grand += taxable + gst;

    });

    return grand.toFixed(2);

  };



  const handleCreateQuotation = async (e: React.FormEvent) => {

    e.preventDefault();

    setSubmitting(true);

    setError('');



    try {

      await api.post('/quotations', {

        enquiryId: Number(selectedEnquiryId),

        validUntil,

        items: quoteItems.map((i) => ({

          productId: Number(i.productId),

          quantity: Number(i.quantity),

          unitPrice: Number(i.unitPrice),

          discountPct: Number(i.discountPct || 0),

          gstPct: Number(i.gstPct || 18),

        })),

      });



      setShowModal(false);

      fetchData();

    } catch (err: any) {

      setError(err.response?.data?.error || 'Failed to create quotation.');

    } finally {

      setSubmitting(false);

    }

  };



  const handleStatusChange = async (quotationId: number, status: string) => {

    try {

      await api.patch(`/quotations/${quotationId}/status`, { status });

      fetchData();

    } catch (err: any) {

      alert(err.response?.data?.error || 'Failed to update quotation status');

    }

  };



  const handleConvertToOrder = async (quotationId: number) => {

    try {

      const res = await api.post(`/quotations/${quotationId}/convert`);

      fetchData();

      onNavigateToOrders(res.data.salesOrder.id);

    } catch (err: any) {

      alert(err.response?.data?.error || 'Failed to convert quotation to Sales Order');

    }

  };



  const getStatusBadge = (status: string) => {

    switch (status) {

      case 'DRAFT':

        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">DRAFT</span>;

      case 'SENT':

        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">SENT</span>;

      case 'ACCEPTED':

        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">ACCEPTED</span>;

      case 'REJECTED':

        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">REJECTED</span>;

      default:

        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;

    }

  };



  // Filter unquoted enquiries for creation

  const unquotedEnquiries = enquiries.filter((e) => !e.quotation);



  return (

    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Commercial Quotations</h1>

          <p className="text-sm text-slate-500">

            Generate pricing with item discounts and GST breakdown. Move through DRAFT &rarr; SENT &rarr; ACCEPTED.

          </p>

        </div>

        <button

          onClick={() => {

            if (unquotedEnquiries.length > 0) {

              handleSelectEnquiry(unquotedEnquiries[0].id);

            }

            setShowModal(true);

          }}

          disabled={unquotedEnquiries.length === 0}

          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50"

        >

          <Plus className="w-4 h-4 mr-1.5" />

          <span>New Quotation</span>

        </button>

      </div>



      {error && (

        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center space-x-2 text-sm">

          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />

          <span>{error}</span>

        </div>

      )}



      {/* Quotations Table */}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {loading ? (

          <div className="p-8 text-center text-slate-500 text-sm">Loading commercial quotations...</div>

        ) : quotations.length === 0 ? (

          <div className="p-12 text-center">

            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />

            <h3 className="text-base font-semibold text-slate-800">No Quotations Yet</h3>

            <p className="text-sm text-slate-500 mt-1">Select an enquiry to generate a priced quotation.</p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-slate-200 text-sm">

              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">

                <tr>

                  <th className="px-6 py-3.5 text-left">Quotation #</th>

                  <th className="px-6 py-3.5 text-left">Customer & Ref</th>

                  <th className="px-6 py-3.5 text-left">Valid Until</th>

                  <th className="px-6 py-3.5 text-right">Grand Total</th>

                  <th className="px-6 py-3.5 text-center">Status</th>

                  <th className="px-6 py-3.5 text-right">Workflow Actions</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {quotations.map((quo) => (

                  <tr key={quo.id} className="hover:bg-slate-50/80 transition">

                    <td className="px-6 py-4 font-mono font-medium text-blue-700">

                      {quo.quotationNumber}

                    </td>

                    <td className="px-6 py-4">

                      <div className="font-medium text-slate-900">{quo.customer.companyName}</div>

                      <div className="text-xs text-slate-500">

                        Ref: <span className="font-mono text-slate-700">{quo.enquiry?.enquiryNumber}</span>

                      </div>

                    </td>

                    <td className="px-6 py-4 text-slate-600">

                      {new Date(quo.validUntil).toLocaleDateString()}

                    </td>

                    <td className="px-6 py-4 text-right font-semibold text-slate-900">

                      Rs. {Number(quo.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

                    </td>

                    <td className="px-6 py-4 text-center whitespace-nowrap">

                      {getStatusBadge(quo.status)}

                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">

                      <div className="flex items-center justify-end space-x-2">

                        {quo.status === 'DRAFT' && (

                          <button

                            onClick={() => handleStatusChange(quo.id, 'SENT')}

                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"

                          >

                            <Send className="w-3 h-3 mr-1" />

                            <span>Mark Sent</span>

                          </button>

                        )}



                        {(quo.status === 'DRAFT' || quo.status === 'SENT') && (

                          <>

                            <button

                              onClick={() => handleStatusChange(quo.id, 'ACCEPTED')}

                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"

                            >

                              <CheckCircle2 className="w-3 h-3 mr-1" />

                              <span>Accept</span>

                            </button>

                            <button

                              onClick={() => handleStatusChange(quo.id, 'REJECTED')}

                              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition"

                            >

                              <XCircle className="w-3 h-3 mr-1" />

                              <span>Reject</span>

                            </button>

                          </>

                        )}



                        {quo.status === 'ACCEPTED' && (

                          quo.salesOrder ? (

                            <span className="text-xs font-semibold text-emerald-700">

                              Order: <span className="font-mono">{quo.salesOrder.orderNumber}</span>

                            </span>

                          ) : (

                            <button

                              onClick={() => handleConvertToOrder(quo.id)}

                              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"

                            >

                              <span>Convert to Sales Order &rarr;</span>

                            </button>

                          )

                        )}



                        {quo.status === 'REJECTED' && (

                          <span className="text-xs text-slate-400 italic">Quotation Closed (Lost)</span>

                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>



      {/* New Quotation Modal */}

      {showModal && (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200">

            <h3 className="text-xl font-bold text-slate-900 mb-1">Create Commercial Quotation</h3>

            <p className="text-xs text-slate-500 mb-5">

              Price each line item. Backend validates and calculates line totals, discounts, and GST.

            </p>



            <form onSubmit={handleCreateQuotation} className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block text-xs font-semibold text-slate-700 uppercase">Enquiry Reference</label>

                  <select

                    value={selectedEnquiryId}

                    onChange={(e) => handleSelectEnquiry(Number(e.target.value))}

                    required

                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"

                  >

                    {unquotedEnquiries.map((enq) => (

                      <option key={enq.id} value={enq.id}>

                        {enq.enquiryNumber} â€” {enq.customer.companyName}

                      </option>

                    ))}

                  </select>

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-700 uppercase">Valid Until Date</label>

                  <input

                    type="date"

                    required

                    value={validUntil}

                    onChange={(e) => setValidUntil(e.target.value)}

                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"

                  />

                </div>

              </div>



              {/* Line Items Pricing Table */}

              <div>

                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">

                  Line Items & Commercial Terms

                </label>

                <div className="border border-slate-200 rounded-lg overflow-hidden">

                  <table className="min-w-full divide-y divide-slate-200 text-xs">

                    <thead className="bg-slate-50 font-semibold text-slate-600">

                      <tr>

                        <th className="px-3 py-2 text-left">Product</th>

                        <th className="px-3 py-2 text-center">Qty</th>

                        <th className="px-3 py-2 text-right">Unit Price (Rs. )</th>

                        <th className="px-3 py-2 text-center">Discount %</th>

                        <th className="px-3 py-2 text-center">GST %</th>

                        <th className="px-3 py-2 text-right">Preview Amount</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">

                      {quoteItems.map((item, idx) => {

                        const prod = products.find((p) => p.id === item.productId);

                        const base = item.quantity * item.unitPrice;

                        const disc = (base * (item.discountPct || 0)) / 100;

                        const taxable = base - disc;

                        const gst = (taxable * (item.gstPct || 18)) / 100;

                        const line = taxable + gst;



                        return (

                          <tr key={idx}>

                            <td className="px-3 py-2">

                              <div className="font-semibold text-slate-900">{prod?.productName}</div>

                              <div className="text-[11px] text-slate-500 font-mono">{prod?.productCode}</div>

                            </td>

                            <td className="px-3 py-2 text-center">

                              <input

                                type="number"

                                min="1"

                                value={item.quantity}

                                onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}

                                className="w-16 border border-slate-300 rounded px-1.5 py-1 text-center"

                              />

                            </td>

                            <td className="px-3 py-2 text-right">

                              <input

                                type="number"

                                min="0"

                                step="0.01"

                                value={item.unitPrice}

                                onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}

                                className="w-24 border border-slate-300 rounded px-1.5 py-1 text-right"

                              />

                            </td>

                            <td className="px-3 py-2 text-center">

                              <input

                                type="number"

                                min="0"

                                max="100"

                                value={item.discountPct}

                                onChange={(e) => handleItemChange(idx, 'discountPct', Number(e.target.value))}

                                className="w-14 border border-slate-300 rounded px-1.5 py-1 text-center"

                              />

                            </td>

                            <td className="px-3 py-2 text-center">

                              <input

                                type="number"

                                min="0"

                                max="100"

                                value={item.gstPct}

                                onChange={(e) => handleItemChange(idx, 'gstPct', Number(e.target.value))}

                                className="w-14 border border-slate-300 rounded px-1.5 py-1 text-center"

                              />

                            </td>

                            <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">

                              Rs. {line.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>



                <div className="mt-3 flex justify-end">

                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-right">

                    <span className="text-xs text-slate-500 mr-2">Estimated Grand Total:</span>

                    <span className="text-base font-bold text-slate-900 font-mono">

                      Rs. {Number(calculatePreviewTotal()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                </div>

              </div>



              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">

                <button

                  type="button"

                  onClick={() => setShowModal(false)}

                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={submitting}

                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"

                >

                  {submitting ? 'Generating...' : 'Save as DRAFT Quotation'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};


