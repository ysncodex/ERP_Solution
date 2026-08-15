import { useState } from 'react';
import {
  StatCard,
  SimpleLineChart,
  Button,
  LoadingSpinner,
  ButtonLoading,
  SkeletonCard,
  ManagerPasswordModal,
  EditTransactionModal,
} from '@/shared/components/ui';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import type { Transaction } from '@/core/types';
import { formatCurrency, formatDate } from '@/shared/utils';

/**
 * Test Component Structure Page
 * Validates new component structure and imports
 */
export default function TestComponentsPage() {
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [testTransaction] = useState<Transaction>({
    id: '1',
    type: 'sale',
    amount: 500,
    method: 'cash',
    channel: 'in_store',
    description: 'Test Sale',
    date: new Date(),
  });

  const sparklineData = [45000, 52000, 49000, 62000, 55000, 58000, 65000];

  const handleButtonClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">🧪 Component Structure Test</h1>
          <p className="text-slate-600">
            Testing new organized component structure with path aliases
          </p>
        </div>

        {/* Test Card Components */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📊 Card Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(125000)}
              subtext="This month"
              icon={DollarSign}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              trend={15}
            />
            <StatCard
              title="Profit Margin"
              value="42.5%"
              subtext="Last 30 days"
              icon={TrendingUp}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              trend={-5}
            />
            <StatCard
              title="Available Funds"
              value={formatCurrency(45000)}
              subtext="Liquid assets"
              icon={Wallet}
              colorClass="text-amber-600"
              bgClass="bg-amber-50"
            />
          </div>
        </section>

        {/* Test Chart Component */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📈 Chart Component</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4">Sales Trend (7 Days)</h3>
            <SimpleLineChart data={sparklineData} />
          </div>
        </section>

        {/* Test Button Components */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">🔘 Button Components</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" size="md">
                Primary Button
              </Button>
              <Button variant="secondary" size="md">
                Secondary
              </Button>
              <Button variant="danger" size="md">
                Danger
              </Button>
              <Button variant="success" size="md">
                Success
              </Button>
              <Button variant="outline" size="md">
                Outline
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="lg">
                Large Button
              </Button>
              <ButtonLoading loading={loading} onClick={handleButtonClick}>
                {loading ? 'Processing...' : 'Click to Test Loading'}
              </ButtonLoading>
            </div>
          </div>
        </section>

        {/* Test Loading Components */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">⏳ Loading Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-700 mb-4">Loading Spinner</h3>
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size={48} />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-4">Skeleton Loader</h3>
              <SkeletonCard />
            </div>
          </div>
        </section>

        {/* Test Modal Components */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">🪟 Modal Components</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex gap-4">
              <Button variant="primary" onClick={() => setPasswordModalOpen(true)}>
                Open Password Modal
              </Button>
              <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                Open Edit Modal
              </Button>
            </div>
          </div>
        </section>

        {/* Test Utilities */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">🛠️ Utility Functions</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="space-y-2 text-sm">
              <p>
                <strong>formatCurrency(125000):</strong> {formatCurrency(125000)}
              </p>
              <p>
                <strong>formatDate(new Date()):</strong> {formatDate(new Date())}
              </p>
            </div>
          </div>
        </section>

        {/* Success Message */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <p className="text-emerald-800 font-bold text-lg mb-2">
            ✅ All Components Loaded Successfully!
          </p>
          <p className="text-emerald-600 text-sm">
            New structure is working with path aliases: @/shared, @/core
          </p>
        </div>
      </div>

      {/* Modals */}
      <ManagerPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={() => alert('Authorized!')}
        title="Test Authorization"
      />

      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        transaction={testTransaction}
        onSave={() => {
          alert('Transaction updated!');
        }}
        itemNames={['Coffee', 'Tea', 'Pastry']}
        suppliers={['Supplier A', 'Supplier B']}
      />
    </div>
  );
}
