import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  LogOut,
  UserCheck,
  Layers,
} from 'lucide-react';

interface LayoutProps {
  currentTab: 'enquiries' | 'quotations' | 'sales-orders';
  setCurrentTab: (tab: 'enquiries' | 'quotations' | 'sales-orders') => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold tracking-wider">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">FundsRoom Mini ERP</span>
              <span className="text-xs ml-2 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">PERN Stack</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800 py-1.5 px-3 rounded-md border border-slate-700 text-sm">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-slate-200">{user?.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                  isAdmin ? 'bg-purple-900 text-purple-200 border border-purple-700' : 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                }`}
              >
                {user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 py-1.5 px-2.5 rounded transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8">
          <button
            onClick={() => setCurrentTab('enquiries')}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
              currentTab === 'enquiries'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Customer Enquiries</span>
          </button>

          <button
            onClick={() => setCurrentTab('quotations')}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
              currentTab === 'quotations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. Quotations</span>
          </button>

          <button
            onClick={() => setCurrentTab('sales-orders')}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
              currentTab === 'sales-orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>3. Sales Orders & Dispatch</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

