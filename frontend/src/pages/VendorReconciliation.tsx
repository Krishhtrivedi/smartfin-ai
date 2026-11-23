import React, { useState, useEffect } from 'react';
import {
  Building2,
  Upload,
  RefreshCw,
  Plus,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { VendorSummary, Invoice } from '../types';
import { Modal } from '../components/common/Modal';

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export const VendorReconciliation: React.FC = () => {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Vendor Form
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorState, setVendorState] = useState('Gujarat');
  const [vendorTerms, setVendorTerms] = useState(30);

  // Invoice Form
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invTaxable, setInvTaxable] = useState('');
  const [invGstRate, setInvGstRate] = useState(18);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await api.getVendors();
      setVendors(data);
      if (data.length > 0) {
        if (!selectedVendorId || !data.some(v => v.id === selectedVendorId)) {
          setSelectedVendorId(data[0].id);
        }
      } else {
        setSelectedVendorId(null);
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
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendorId) {
      fetchVendorDetails(selectedVendorId);
    }
  }, [selectedVendorId]);

  const fetchVendorDetails = async (id: number) => {
    setReconLoading(true);
    try {
      const [recon, invs] = await Promise.all([
        api.reconcileVendor(id),
        api.getVendorInvoices(id)
      ]);
      setReconciliationData(recon);
      setInvoices(invs);
    } catch (err) {
      console.error(err);
    } finally {
      setReconLoading(false);
    }
  };

  const handleStatementUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedVendorId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.uploadVendorStatement(selectedVendorId, formData);
      await fetchVendorDetails(selectedVendorId);
      await fetchVendors();
      setUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      alert(`Error uploading statement: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newV = await api.createVendor({
        name: vendorName,
        gstin: vendorGstin,
        pan: vendorPan || (vendorGstin.length >= 12 ? vendorGstin.slice(2, 12) : ''),
        email: vendorEmail,
        phone: vendorPhone,
        state: vendorState,
        state_code: vendorGstin.slice(0, 2) || '24',
        payment_terms_days: Number(vendorTerms) || 30,
        outstanding_balance: 0.0
      });
      setAddVendorModalOpen(false);
      setVendorName('');
      setVendorGstin('');
      setVendorPan('');
      setVendorEmail('');
      setVendorPhone('');
      await fetchVendors();
      setSelectedVendorId(newV.id);
    } catch (err: any) {
      alert(`Error registering vendor: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;
    setSubmitting(true);
    try {
      const taxable = parseFloat(invTaxable) || 0;
      const rate = Number(invGstRate) || 18;
      const totalTax = (taxable * rate) / 100;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;
      const totalAmt = taxable + totalTax;

      await api.createVendorInvoice(selectedVendorId, {
        invoice_number: invNumber,
        invoice_type: 'PURCHASE',
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
      await fetchVendorDetails(selectedVendorId);
      await fetchVendors();
    } catch (err: any) {
      alert(`Error creating purchase invoice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = vendors.reduce((sum, v) => sum + (v.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span>Vendor Accounts Ledger & Statement Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-reconciles supplier purchase invoices, payment vouchers, and statement balances.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAddVendorModalOpen(true)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Vendor</span>
          </button>

          {selectedVendorId && (
            <button
              onClick={() => setAddInvoiceModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Record Purchase Bill</span>
            </button>
          )}

          <button
            onClick={() => setUploadModalOpen(true)}
            disabled={!selectedVendorId}
            className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Statement</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vendor Master List */}
        <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Vendors ({vendors.length})
            </span>
            <span className="text-[11px] font-bold text-rose-600 font-mono">
              Total Due: ₹{formatINR(totalOutstanding)}
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {vendors.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                <p>No vendor records available.</p>
                <p className="mt-1 text-[11px] text-slate-500">Every entry starts at ₹0.</p>
                <button
                  onClick={() => setAddVendorModalOpen(true)}
                  className="mt-3 inline-flex items-center text-xs font-semibold text-brand-600 hover:underline"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Your First Vendor
                </button>
              </div>
            ) : (
              vendors.map((v) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendorId(v.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{v.name}</h4>
                      <span className="text-[10px] font-mono text-slate-500">{v.payment_terms_days || 30}d terms</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{v.gstin || 'Unregistered'}</p>

                    <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Balance Due:</span>
                      <span className={`font-mono font-bold ${(v.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        ₹{formatINR(v.outstanding_balance)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Vendor Reconciliation Details */}
        <div className="lg:col-span-2 space-y-5">
          {reconLoading ? (
            <div className="bg-white dark:bg-[#131C2E] p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading vendor ledger...
            </div>
          ) : reconciliationData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchases</p>
                  <p className="text-lg font-bold text-navy-950 mt-1 font-mono">₹{formatINR(reconciliationData.total_purchases)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.invoices_count || 0} bills recorded</p>
                </div>

                <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1 font-mono">₹{formatINR(reconciliationData.total_payments)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.payments_count || 0} payment vouchers</p>
                </div>

                <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Outstanding Due</p>
                  <p className="text-lg font-bold text-rose-600 mt-1 font-mono">₹{formatINR(reconciliationData.outstanding_balance)}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.unpaid_invoices_count || 0} unpaid invoices</p>
                </div>
              </div>

              {/* Purchase Invoices List */}
              <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Purchase Bills Register</h4>
                    <p className="text-[10px] text-slate-400">All purchase invoices entered into book of accounts</p>
                  </div>
                  <button
                    onClick={() => setAddInvoiceModalOpen(true)}
                    className="text-xs font-semibold text-brand-600 hover:underline flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Bill
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {invoices.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-slate-400">
                      No purchase bills recorded for this vendor yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A253A]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-4">Invoice No</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4 text-right">Taxable</th>
                          <th className="py-2.5 px-4 text-right">Tax</th>
                          <th className="py-2.5 px-4 text-right">Total Amount</th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/60 font-mono">
                            <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">{inv.invoice_number}</td>
                            <td className="py-2.5 px-4 text-slate-500">{inv.invoice_date}</td>
                            <td className="py-2.5 px-4 text-right">₹{formatINR(inv.taxable_amount)}</td>
                            <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">₹{formatINR(inv.total_tax)}</td>
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
            <div className="bg-white dark:bg-[#131C2E] p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 font-mono text-xs">
              No vendor selected or no records available. Register a vendor to start recording accounts payable.
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={addVendorModalOpen}
        onClose={() => setAddVendorModalOpen(false)}
        title="Register Vendor Account"
        subtitle="Create a new vendor in your trade payables subledger"
      >
        <form onSubmit={handleCreateVendor} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Business Name *</label>
            <input
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. Acme Cloud Solutions Pvt Ltd"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={vendorGstin}
                onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                placeholder="24AABCS1234D1Z5"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PAN</label>
              <input
                type="text"
                value={vendorPan}
                onChange={(e) => setVendorPan(e.target.value.toUpperCase())}
                placeholder="AABCS1234D"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                placeholder="billing@acme.com"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={vendorPhone}
                onChange={(e) => setVendorPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={vendorState}
                onChange={(e) => setVendorState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms (Days)</label>
              <input
                type="number"
                value={vendorTerms}
                onChange={(e) => setVendorTerms(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddVendorModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Purchase Bill Modal */}
      <Modal
        isOpen={addInvoiceModalOpen}
        onClose={() => setAddInvoiceModalOpen(false)}
        title="Record Purchase Bill"
        subtitle="Add a supplier purchase invoice to the payables register"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice / Bill Number *</label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="INV-2026-001"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
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
                placeholder="50000.00"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
              <select
                value={invGstRate}
                onChange={(e) => setInvGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              >
                <option value={18}>18% (Standard Services / Goods)</option>
                <option value={12}>12% (Specified Items)</option>
                <option value={5}>5% (Basic Essentials / Transport)</option>
                <option value={28}>28% (Luxury / De-merit)</option>
                <option value={0}>0% (Exempt)</option>
              </select>
            </div>
          </div>

          {invTaxable && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{formatINR(parseFloat(invTaxable) || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>GST ({invGstRate}%):</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * invGstRate) / 100)}</span>
              </div>
              <div className="flex justify-between font-bold text-navy-950 border-t pt-1">
                <span>Total Bill Amount:</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * (1 + invGstRate / 100)))}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddInvoiceModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !invTaxable}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Purchase Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Statement Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Vendor Statement"
        subtitle="Compare external supplier statement with internal book records"
      >
        <form onSubmit={handleStatementUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Statement File (.xlsx, .csv)</label>
            <input
              type="file"
              required
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {uploading ? 'Processing...' : 'Upload & Reconcile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
