import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { SalesOrder, Product } from '../types';
import {
  ShoppingCart,
  CheckCircle2,
  Truck,
  Ban,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  Box,
  } from 'lucide-react';

interface SalesOrdersPageProps {
  initialOrderId?: number | null;
}

export const SalesOrdersPage: React.FC<SalesOrdersPageProps> = ({ initialOrderId }) => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Order for detail & action view
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Dispatch Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Confirming state
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orderRes, prodRes] = await Promise.all([
        api.get('/sales-orders'),
        api.get('/products'),
      ]);
      setOrders(orderRes.data.orders);
      setProducts(prodRes.data.products);

      if (initialOrderId) {
        const found = orderRes.data.orders.find((o: SalesOrder) => o.id === initialOrderId);
        if (found) setSelectedOrder(found);
      } else if (orderRes.data.orders.length > 0 && !selectedOrder) {
        setSelectedOrder(orderRes.data.orders[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sales orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmOrder = async (orderId: number) => {
    if (!isAdmin) {
      alert('Only ADMIN users are authorized to confirm orders and reserve inventory.');
      return;
    }

    setConfirmingId(orderId);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/sales-orders/${orderId}/confirm`);
      setSuccess('Sales Order confirmed! Inventory successfully locked and reserved.');
      await fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.data.order);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Failed to confirm order. Available stock may be insufficient to fulfill reservation.'
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!isAdmin) {
      alert('Only ADMIN users are authorized to cancel orders.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this order? Any reserved inventory will be released back to available stock.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/sales-orders/${orderId}/cancel`);
      setSuccess('Order cancelled. Reserved inventory was released.');
      await fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.data.order);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel order.');
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setDispatching(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/sales-orders/${selectedOrder.id}/dispatch`, {
        vehicleNumber,
        driverName,
      });

      setSuccess('Order successfully dispatched! Physical & reserved inventory deducted.');
      setShowDispatchModal(false);
      setVehicleNumber('');
      setDriverName('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process dispatch.');
    } finally {
      setDispatching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">PENDING CONFIRMATION</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">CONFIRMED (RESERVED)</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">DISPATCHED</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Orders, Reservation & Dispatch</h1>
          <p className="text-sm text-slate-500">
            Pessimistic row-locking concurrency guarantees no negative stock during reservations.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center px-3.5 py-2 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          <span>Refresh Stock Levels</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-center space-x-2 text-sm shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg flex items-center space-x-2 text-sm shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Real-time Inventory Snapshot Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800">
        <div className="flex items-center space-x-2 mb-3">
          <Box className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Real-Time Warehouse Stock Master (Physical - Reserved = Available)
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-slate-800/90 p-3 rounded-lg border border-slate-700">
              <div className="text-[11px] font-mono text-blue-400 font-semibold truncate">{p.productCode}</div>
              <div className="text-xs text-slate-300 truncate font-medium">{p.productName}</div>
              <div className="mt-2 text-xs space-y-0.5">
                <div className="flex justify-between text-slate-400">
                  <span>Physical:</span>
                  <span className="font-mono text-slate-200">{p.inventory?.physicalQty}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Reserved:</span>
                  <span className="font-mono">{p.inventory?.reservedQty}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-400 border-t border-slate-700/60 pt-0.5">
                  <span>Available:</span>
                  <span className="font-mono">{p.inventory?.availableQty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Orders Table + Details & Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Orders Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">All Sales Orders</h2>
            <span className="text-xs text-slate-500 font-medium">{orders.length} Total</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading sales orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Sales Orders</h3>
              <p className="text-sm text-slate-500 mt-1">Accept a commercial quotation to generate a Sales Order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Order #</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`cursor-pointer transition ${
                        selectedOrder?.id === ord.id ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-blue-700">
                        {ord.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{ord.customer.companyName}</div>
                        <div className="text-xs text-slate-500">{new Date(ord.orderDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        Rs. {Number(ord.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">{getStatusBadge(ord.status)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                          View Details &rarr;
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Order Action & Inventory Reservation Panel */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sticky top-20 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-400">Order Management</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-mono mt-1">
                  {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">{selectedOrder.customer.companyName}</p>
              </div>

              {/* Items in this Order */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  Order Line Items
                </h4>
                <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  {selectedOrder.items?.map((item) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const isAvailable = (prod?.inventory?.availableQty || 0) >= item.quantity;

                    return (
                      <div key={item.id} className="text-xs flex items-center justify-between pb-2 border-b border-slate-200 last:border-0 last:pb-0">
                        <div>
                          <div className="font-semibold text-slate-800">{prod?.productName || `Product #${item.productId}`}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Stock: Available {prod?.inventory?.availableQty} | Physical {prod?.inventory?.physicalQty}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 text-sm">{item.quantity} units</span>
                          <div>
                            {selectedOrder.status === 'PENDING' && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isAvailable ? 'In Stock' : 'Low Stock'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dispatch Information if already dispatched */}
              {selectedOrder.dispatches && selectedOrder.dispatches.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center">
                    <Truck className="w-3.5 h-3.5 mr-1" /> Dispatch Details
                  </div>
                  <div>Slip #: <span className="font-mono font-semibold">{selectedOrder.dispatches[0].dispatchNumber}</span></div>
                  <div>Vehicle: <span className="font-semibold">{selectedOrder.dispatches[0].vehicleNumber}</span></div>
                  <div>Driver: <span className="font-semibold">{selectedOrder.dispatches[0].driverName}</span></div>
                  <div>Date: {new Date(selectedOrder.dispatches[0].dispatchDate).toLocaleString()}</div>
                </div>
              )}

              {/* Action Buttons based on Order Status */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                {selectedOrder.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleConfirmOrder(selectedOrder.id)}
                      disabled={confirmingId === selectedOrder.id || !isAdmin}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                      title={!isAdmin ? 'Admin only action' : ''}
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>{confirmingId === selectedOrder.id ? 'Reserving Stock...' : 'Confirm Order & Reserve Stock'}</span>
                    </button>
                    {!isAdmin && (
                      <p className="text-[11px] text-amber-600 text-center">
                        âš ï¸ Log in as ADMIN to confirm orders and lock inventory.
                      </p>
                    )}
                  </>
                )}

                {selectedOrder.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => setShowDispatchModal(true)}
                      disabled={!isAdmin}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Process Dispatch</span>
                    </button>

                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={!isAdmin}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Order & Release Stock</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === 'DISPATCHED' && (
                  <div className="text-center py-2 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-lg">
                    âœ“ Order completed and goods dispatched.
                  </div>
                )}

                {selectedOrder.status === 'CANCELLED' && (
                  <div className="text-center py-2 text-xs text-slate-500 font-semibold bg-slate-100 rounded-lg">
                    Order cancelled. No active reservation.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">
              Select an order to view items, inventory availability, and trigger reservation or dispatch.
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Process Order Dispatch</h3>
            <p className="text-xs text-slate-500 mb-4">
              Physical and Reserved inventory will both be deducted for order <span className="font-mono font-semibold">{selectedOrder.orderNumber}</span>.
            </p>

            <form onSubmit={handleDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Transport Vehicle Number</label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="e.g. MH-12-AB-9876"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">Driver Name</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Shinde"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {dispatching ? 'Dispatching...' : 'Confirm Dispatch & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

