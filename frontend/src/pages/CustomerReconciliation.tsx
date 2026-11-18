import React, { useState, useEffect } from 'react';
import {
  Users2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerSummary, Invoice } from '../types';

export const CustomerReconciliation: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
      if (data.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchCustomerDetails = async (id: number) => {
    setReconLoading(true);
    try {
      const [recon, invs] = await Promise.all([
        api.reconcileCustomer(id),
        api.getCustomerInvoices(id)
      ]);
      setReconciliationData(recon);
      setInvoices(invs);
    } catch (err) {
      console.error(err);
    } finally {
      setReconLoading(false);
    }
  };

  const totalReceivables = customers.reduce((sum, c) => sum + c.outstanding_balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-brand-600" />
            <span>Customer Trade Receivables & Ledger Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of sales invoices, payment receipts, aging and credit limits.
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer Master List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customers ({customers.length})
            </span>
            <span className="text-[11px] font-bold text-emerald-600">
              Receivables: ₹{totalReceivables.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {customers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{c.name}</h4>
                    <span className="text-[10px] font-semibold text-slate-500">Limit: ₹{(c.credit_limit / 100000).toFixed(1)}L</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{c.gstin || 'Unregistered'}</p>

                  <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Receivable:</span>
                    <span className={`font-bold ${c.outstanding_balance > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      ₹{c.outstanding_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Customer Reconciliation Details */}
        <div className="lg:col-span-2 space-y-5">
          {reconLoading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading customer receivables...
            </div>
          ) : reconciliationData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
                  <p className="text-lg font-bold text-navy-950 mt-1">₹{reconciliationData.total_sales.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.invoices_count} invoices issued</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collections Received</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">₹{reconciliationData.total_received.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.receipts_count} receipts recorded</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Outstanding Balance</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">₹{reconciliationData.outstanding_balance.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.uncollected_invoices_count} pending collections</p>
                </div>
              </div>

              {/* Credit Limit Utilization */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider">Credit Limit Utilization</span>
                  <span className="text-xs font-semibold text-slate-600">
                    {reconciliationData.credit_utilization_pct}% of ₹{reconciliationData.credit_limit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${
                      reconciliationData.credit_utilization_pct > 80
                        ? 'bg-rose-500'
                        : reconciliationData.credit_utilization_pct > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, reconciliationData.credit_utilization_pct)}%` }}
                  />
                </div>
              </div>

              {/* Aging Breakdown Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">
                  Trade Receivables Aging Analysis
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
                    <p className="text-[10px] font-bold">0 - 30 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.current_0_30.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 text-brand-800">
                    <p className="text-[10px] font-bold">31 - 60 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.period_31_60.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800">
                    <p className="text-[10px] font-bold">61 - 90 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.period_61_90.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800">
                    <p className="text-[10px] font-bold">&gt; 90 Days (Overdue)</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.over_90.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Sales Invoices List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Customer Invoices</h4>
                  <span className="text-[11px] text-slate-500">{invoices.length} total</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Invoice No</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Taxable</th>
                        <th className="py-2.5 px-4 text-right">Tax (GST)</th>
                        <th className="py-2.5 px-4 text-right">Total Amount</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{inv.invoice_number}</td>
                          <td className="py-2.5 px-4 text-slate-500">{inv.invoice_date}</td>
                          <td className="py-2.5 px-4 text-right">₹{inv.taxable_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">₹{inv.total_tax.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-navy-950">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
              Select a customer from the list to view trade receivables.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
