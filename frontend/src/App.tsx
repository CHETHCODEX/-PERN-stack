import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { SalesOrdersPage } from './pages/SalesOrdersPage';
import { Layout } from './components/Layout';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<'enquiries' | 'quotations' | 'sales-orders'>('enquiries');
  const [targetEnquiryId, setTargetEnquiryId] = useState<number | null>(null);
  const [targetOrderId, setTargetOrderId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleNavigateToQuotations = (enquiryId: number) => {
    setTargetEnquiryId(enquiryId);
    setCurrentTab('quotations');
  };

  const handleNavigateToOrders = (orderId: number) => {
    setTargetOrderId(orderId);
    setCurrentTab('sales-orders');
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'enquiries' && (
        <EnquiriesPage onNavigateToQuotations={handleNavigateToQuotations} />
      )}
      {currentTab === 'quotations' && (
        <QuotationsPage
          initialEnquiryId={targetEnquiryId}
          onNavigateToOrders={handleNavigateToOrders}
        />
      )}
      {currentTab === 'sales-orders' && (
        <SalesOrdersPage initialOrderId={targetOrderId} />
      )}
    </Layout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

