import React, { useState, useEffect } from 'react';
import {
  Users2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerSummary, Invoice } from '../types';
import { Modal } from '../components/common/Modal';

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export const CustomerReconciliation: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);

  // Modals
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerLimit, setCustomerLimit] = useState(1000000);
  const [customerTerms, setCustomerTerms] = useState(30);

  // Invoice Form
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invTaxable, setInvTaxable] = useState('');
  const [invGstRate, setInvGstRate] = useState(18);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
      if (data.length > 0) {
        if (!selectedCustomerId || !data.some(c => c.id === selectedCustomerId)) {
          setSelectedCustomerId(data[0].id);
        }
      } else {
        setSelectedCustomerId(null);
        setReconciliationData(null);
        setInvoices([]);
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

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newC = await api.createCustomer({
        name: customerName,
        gstin: customerGstin,
        pan: customerPan || (customerGstin.length >= 12 ? customerGstin.slice(2, 12) : ''),
        email: customerEmail,
        phone: customerPhone,
        state: customerState,
        state_code: customerGstin.slice(0, 2) || '24',
        credit_limit: parseFloat(String(customerLimit)) || 1000000.0,
        payment_terms_days: Number(customerTerms) || 30,
        outstanding_balance: 0.0
      });
      setAddCustomerModalOpen(false);
      setCustomerName('');
      setCustomerGstin('');
      setCustomerPan('');
      setCustomerEmail('');
      setCustomerPhone('');
      await fetchCustomers();
      setSelectedCustomerId(newC.id);
    } catch (err: any) {
      alert(`Error registering customer: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setSubmitting(true);
    try {
      const taxable = parseFloat(invTaxable) || 0;
      const rate = Number(invGstRate) || 18;
      const totalTax = (taxable * rate) / 100;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;
      const totalAmt = taxable + totalTax;

      await api.createCustomerInvoice(selectedCustomerId, {
        invoice_number: invNumber,
        invoice_type: 'SALES',
        invoice_date: invDate,
        taxable_amount: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: 0.0,
        total_tax: totalTax,
        total_amount: totalAmt,
        balance_due: totalAmt,
        status: 'UNPAID'
      });
      setAddInvoiceModalOpen(false);
      setInvNumber('');
      setInvTaxable('');
      await fetchCustomerDetails(selectedCustomerId);
      await fetchCustomers();
    } catch (err: any) {
      alert(`Error creating sales invoice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalReceivables = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);

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

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Customer</span>
          </button>

          {selectedCustomerId && (
            <button
              onClick={() => setAddInvoiceModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Record Sales Invoice</span>
            </button>
          )}
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
            <span className="text-[11px] font-bold text-emerald-600 font-mono">
              Receivables: ₹{formatINR(totalReceivables)}
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {customers.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                <p>No customer records available.</p>
                <p className="mt-1 text-[11px] text-slate-500">Every entry starts at ₹0.</p>
                <button
                  onClick={() => setAddCustomerModalOpen(true)}
                  className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600 hover:underline"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Your First Customer
                </button>
              </div>
            ) : (
              customers.map((c) => {
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
                      <span className="text-[10px] font-semibold text-slate-500">
                        Limit: ₹{(((c.credit_limit || 0) / 100000)).toFixed(1)}L
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{c.gstin || 'Unregistered'}</p>

                    <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Receivable:</span>
                      <span className={`font-mono font-bold ${(c.outstanding_balance || 0) > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        ₹{formatINR(c.outstanding_balance)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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
                  <p className="text-lg font-bold text-navy-950 mt-1 font-mono">₹{formatINR(reconciliationData.total_sales)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.invoices_count || 0} invoices issued</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1 font-mono">
                    ₹{formatINR(reconciliationData.total_receipts ?? reconciliationData.total_received)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.receipts_count || 0} payment receipts</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Outstanding</p>
                  <p className="text-lg font-bold text-rose-600 mt-1 font-mono">₹{formatINR(reconciliationData.outstanding_balance)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {reconciliationData.unpaid_invoices_count ?? reconciliationData.uncollected_invoices_count ?? 0} unpaid bills
                  </p>
                </div>
              </div>

              {/* Receivables Aging Breakdown */}
              {reconciliationData.aging && (
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Receivables Aging Schedule
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Credit Limit: ₹{formatINR(reconciliationData.credit_limit)} | Utilized: {reconciliationData.credit_utilization_pct || 0}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] text-emerald-800 block font-sans font-medium">0–30 Days</span>
                      <span className="font-bold text-emerald-700">₹{formatINR(reconciliationData.aging.current_0_30)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100">
                      <span className="text-[10px] text-blue-800 block font-sans font-medium">31–60 Days</span>
                      <span className="font-bold text-blue-700">₹{formatINR(reconciliationData.aging.period_31_60)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                      <span className="text-[10px] text-amber-800 block font-sans font-medium">61–90 Days</span>
                      <span className="font-bold text-amber-700">₹{formatINR(reconciliationData.aging.period_61_90)}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-100">
                      <span className="text-[10px] text-rose-800 block font-sans font-medium">90+ Days</span>
                      <span className="font-bold text-rose-700">₹{formatINR(reconciliationData.aging.over_90)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales Invoices List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Customer Sales Invoices</h4>
                    <p className="text-[10px] text-slate-400">All customer invoices recorded in sales ledger</p>
                  </div>
                  <button
                    onClick={() => setAddInvoiceModalOpen(true)}
                    className="text-xs font-semibold text-brand-600 hover:underline flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Invoice
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {invoices.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-slate-400">
                      No sales invoices recorded for this customer yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
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
                            <td className="py-2.5 px-4 text-right">₹{formatINR(inv.taxable_amount)}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600">₹{formatINR(inv.total_tax)}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-navy-950">₹{formatINR(inv.total_amount)}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                inv.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 font-mono text-xs">
              No customer selected or no records available. Register a customer to start recording trade receivables.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        title="Register Customer Account"
        subtitle="Create a new customer in your trade receivables subledger"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Client Name *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Zenith Enterprises LLP"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="24AABCS1234D1Z5"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PAN</label>
              <input
                type="text"
                value={customerPan}
                onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                placeholder="AABCS1234D"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="accounts@zenith.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 11223"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={customerLimit}
                onChange={(e) => setCustomerLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddCustomerModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Sales Invoice Modal */}
      <Modal
        isOpen={addInvoiceModalOpen}
        onClose={() => setAddInvoiceModalOpen(false)}
        title="Record Sales Invoice"
        subtitle="Issue an invoice to this customer and record revenue in the ledger"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="SF-INV-2026-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={invTaxable}
                onChange={(e) => setInvTaxable(e.target.value)}
                placeholder="100000.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <select
                value={invGstRate}
                onChange={(e) => setInvGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value={18}>18% (Standard Services / Tech / SaaS)</option>
                <option value={12}>12% (Specified Goods)</option>
                <option value={5}>5% (Essential Services)</option>
                <option value={28}>28% (Luxury / Regulated)</option>
                <option value={0}>0% (Export / SEZ / Exempt)</option>
              </select>
            </div>
          </div>

          {invTaxable && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{formatINR(parseFloat(invTaxable) || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Output ({invGstRate}%):</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * invGstRate) / 100)}</span>
              </div>
              <div className="flex justify-between font-bold text-navy-950 border-t pt-1">
                <span>Total Receivable Amount:</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * (1 + invGstRate / 100)))}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddInvoiceModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !invTaxable}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Sales Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
