import React, { useState, useEffect, useMemo } from 'react';
import {
  Users2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  Search,
  FileText,
  DollarSign,
  Upload,
  Receipt,
  Building,
  Filter,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerSummary, Invoice } from '../types';
import { Modal } from '../components/common/Modal';

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

interface CustomerReceipt {
  id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_number: string;
  invoice_id?: number;
  status: string;
}

export const CustomerReconciliation: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'RECEIPTS' | 'AGING' | 'STATEMENT'>('INVOICES');

  // Modals
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
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
  const [invDueDate, setInvDueDate] = useState('');
  const [invTaxable, setInvTaxable] = useState('');
  const [invGstRate, setInvGstRate] = useState(18);

  // Receipt Form
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMode, setReceiptMode] = useState('NEFT');
  const [receiptUtr, setReceiptUtr] = useState('');
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<number | undefined>(undefined);

  // Statement Upload
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
        setReceipts([]);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomerDetails = async (id: number) => {
    setReconLoading(true);
    try {
      const [recon, invs, recs] = await Promise.all([
        api.reconcileCustomer(id),
        api.getCustomerInvoices(id),
        api.getCustomerReceipts(id).catch(() => [])
      ]);
      setReconciliationData(recon);
      setInvoices(invs);
      setReceipts(recs);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    } finally {
      setReconLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newC = await api.createCustomer({
        name: customerName,
        gstin: customerGstin.trim(),
        pan: customerPan || (customerGstin.length >= 12 ? customerGstin.slice(2, 12) : ''),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
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

      // Compute due date if not set
      let due = invDueDate;
      if (!due) {
        const invD = new Date(invDate);
        invD.setDate(invD.getDate() + 30);
        due = invD.toISOString().split('T')[0];
      }

      await api.createCustomerInvoice(selectedCustomerId, {
        invoice_number: invNumber.trim(),
        invoice_type: 'SALES',
        invoice_date: invDate,
        due_date: due,
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
      setInvDueDate('');
      await fetchCustomerDetails(selectedCustomerId);
      await fetchCustomers();
    } catch (err: any) {
      alert(`Error creating sales invoice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(receiptAmount);
      if (isNaN(amt) || amt <= 0) {
        alert('Please enter a valid receipt amount.');
        setSubmitting(false);
        return;
      }

      await api.createCustomerReceipt(selectedCustomerId, {
        receipt_number: receiptNumber.trim() || undefined,
        payment_date: receiptDate,
        amount: amt,
        payment_mode: receiptMode,
        reference_number: receiptUtr.trim() || undefined,
        invoice_id: receiptInvoiceId || undefined
      });

      setAddReceiptModalOpen(false);
      setReceiptNumber('');
      setReceiptAmount('');
      setReceiptUtr('');
      setReceiptInvoiceId(undefined);
      await fetchCustomerDetails(selectedCustomerId);
      await fetchCustomers();
    } catch (err: any) {
      alert(`Error recording payment receipt: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !statementFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', statementFile);
      const res = await api.uploadCustomerStatement(selectedCustomerId, formData);
      setReconciliationData(res);
      setActiveTab('STATEMENT');
      setUploadModalOpen(false);
      setStatementFile(null);
    } catch (err: any) {
      alert(`Statement upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.pan && c.pan.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'DUE') {
        return (c.outstanding_balance || 0) > 0;
      }
      if (statusFilter === 'PAID') {
        return (c.outstanding_balance || 0) <= 0;
      }
      return true;
    });
  }, [customers, searchQuery, statusFilter]);

  const totalReceivables = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
  const totalInvoicedAll = customers.reduce((sum, c) => sum + (c.total_sales || 0), 0);
  const totalCollectedAll = customers.reduce((sum, c) => sum + (c.total_received || 0), 0);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Strip */}
      <div className="bg-[#0D2035] text-white p-4 rounded-[3px] border border-[#364452] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="spec-tag text-[#E65909] font-bold bg-[#E65909]/10 px-2 py-0.5 rounded-[2px] border border-[#E65909]/30 text-[10px] font-mono tracking-wider">
              03 / TRADE RECEIVABLES
            </span>
            <span className="text-[10px] font-mono text-[#8B97A3] uppercase tracking-wider">
              Sales Ledger & DSO Recovery Subsystem
            </span>
          </div>
          <h2 className="text-base font-display font-bold text-white mt-1">
            Customer Trade Receivables & Collection Ledger
          </h2>
          <p className="text-xs text-[#8B97A3] mt-0.5">
            Real-time sales invoices, payment receipt vouchers, credit limit monitoring, and automated debtor aging.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="btn-signal flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Customer</span>
          </button>

          {selectedCustomerId && (
            <>
              <button
                onClick={() => setAddInvoiceModalOpen(true)}
                className="bg-[#1A2F46] hover:bg-[#23374d] text-white border border-[#364452] px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#E65909]" />
                <span>+ Record Sales Invoice</span>
              </button>

              <button
                onClick={() => setAddReceiptModalOpen(true)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Record Payment Receipt</span>
              </button>

              <button
                onClick={() => setUploadModalOpen(true)}
                className="bg-[#0D2035] hover:bg-[#1A2F46] text-[#E6ECF2] border border-[#364452] px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-1.5 transition-colors"
                title="Upload Customer Ledger Statement (Excel/CSV)"
              >
                <Upload className="w-3.5 h-3.5 text-[#8B97A3]" />
                <span>Upload Statement</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aggregate Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-[3px] border border-[#C5CBD2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#5D646C] uppercase tracking-wider">Gross Trade Revenue</span>
            <DollarSign className="w-4 h-4 text-[#1A2F46]" />
          </div>
          <p className="text-xl font-display font-extrabold text-[#1A2F46] mt-1 font-mono">
            ₹{formatINR(totalInvoicedAll)}
          </p>
          <p className="text-[10px] text-[#5D646C] mt-0.5">Across all registered customer accounts</p>
        </div>

        <div className="bg-white p-3.5 rounded-[3px] border border-[#C5CBD2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider">Total Collections Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-display font-extrabold text-emerald-700 mt-1 font-mono">
            ₹{formatINR(totalCollectedAll)}
          </p>
          <p className="text-[10px] text-[#5D646C] mt-0.5">Realized bank credits & UTR receipts</p>
        </div>

        <div className="bg-white p-3.5 rounded-[3px] border border-[#C5CBD2] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#E65909] uppercase tracking-wider">Active Receivables Due</span>
            <Clock className="w-4 h-4 text-[#E65909]" />
          </div>
          <p className="text-xl font-display font-extrabold text-[#E65909] mt-1 font-mono">
            ₹{formatINR(totalReceivables)}
          </p>
          <p className="text-[10px] text-[#5D646C] mt-0.5">Outstanding trade debit balance</p>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Customer Master Directory (col-span-4) */}
        <div className="xl:col-span-4 bg-white rounded-[3px] border border-[#C5CBD2] flex flex-col shadow-xs">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-[#C5CBD2] bg-[#F6F3EE] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-[#E65909]" />
                <span>Customer Ledger ({filteredCustomers.length})</span>
              </span>
              <button
                onClick={fetchCustomers}
                className="text-[10px] font-mono text-[#5D646C] hover:text-[#1A2F46] flex items-center gap-1"
                title="Refresh Customer Directory"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8B97A3] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer, GSTIN, PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#C5CBD2] rounded-[2px] font-sans focus:outline-none focus:border-[#E65909]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1">
              {(['ALL', 'DUE', 'PAID'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold rounded-[2px] transition-colors ${
                    statusFilter === tab
                      ? 'bg-[#1A2F46] text-white'
                      : 'bg-[#ECE9E3] text-[#5D646C] hover:bg-[#DBE2E9]'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'DUE' ? 'With Balance' : 'Zero Due'}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="divide-y divide-[#ECE9E3] max-h-[580px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-[#8B97A3]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#E65909]" />
                Loading trade receivables...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[#8B97A3]">
                <p>No matching customer accounts found.</p>
                <button
                  onClick={() => setAddCustomerModalOpen(true)}
                  className="mt-3 text-xs font-semibold text-[#E65909] hover:underline inline-flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add New Customer
                </button>
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = selectedCustomerId === c.id;
                const balance = c.outstanding_balance || 0;
                const limit = c.credit_limit || 1000000;
                const util = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-3 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'border-[#E65909] bg-[#F6F3EE]'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1A2F46] truncate">{c.name}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] font-mono text-[#5D646C]">{c.gstin || 'Unregistered'}</span>
                          {c.state && (
                            <span className="text-[9px] font-mono text-[#8B97A3] bg-[#ECE9E3] px-1 py-0.2 rounded-xs">
                              {c.state}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-mono font-bold block ${balance > 0 ? 'text-[#E65909]' : 'text-emerald-700'}`}>
                          ₹{formatINR(balance)}
                        </span>
                        <span className="text-[9px] font-mono text-[#8B97A3]">
                          Limit: ₹{((limit / 100000)).toFixed(1)}L
                        </span>
                      </div>
                    </div>

                    {/* Credit Limit Mini Progress Bar */}
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 h-1.5 bg-[#DBE2E9] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            util >= 90 ? 'bg-rose-600' : util >= 60 ? 'bg-[#E65909]' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${util}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-[#5D646C]">{util}% used</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Customer Detail Workspace (col-span-8) */}
        <div className="xl:col-span-8 space-y-4">
          {reconLoading ? (
            <div className="bg-white p-12 rounded-[3px] border border-[#C5CBD2] text-center text-[#8B97A3] font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E65909]" />
              Loading customer subledger & reconciliation...
            </div>
          ) : selectedCustomer && reconciliationData ? (
            <>
              {/* Profile Card Header */}
              <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2] shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE9E3] gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-[#E65909]" />
                      <h3 className="text-base font-display font-bold text-[#1A2F46]">
                        {reconciliationData.customer_name}
                      </h3>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-[2px] font-bold">
                        ACTIVE DEBTOR
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[#5D646C] mt-1">
                      <span>GSTIN: <strong>{reconciliationData.gstin || 'UNREGISTERED'}</strong></span>
                      {selectedCustomer.pan && <span>PAN: <strong>{selectedCustomer.pan}</strong></span>}
                      {selectedCustomer.email && <span>Email: <strong>{selectedCustomer.email}</strong></span>}
                      {selectedCustomer.phone && <span>Phone: <strong>{selectedCustomer.phone}</strong></span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAddInvoiceModalOpen(true)}
                      className="px-2.5 py-1.5 bg-[#1A2F46] hover:bg-[#23374d] text-white text-[11px] font-semibold rounded-[2px] flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3 text-[#E65909]" />
                      <span>+ Invoice</span>
                    </button>
                    <button
                      onClick={() => setAddReceiptModalOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-[2px] flex items-center space-x-1"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>+ Receipt</span>
                    </button>
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-2.5 bg-[#F6F3EE] rounded-[2px] border border-[#ECE9E3]">
                    <span className="text-[10px] font-mono text-[#5D646C] uppercase tracking-wider block">Total Billed</span>
                    <span className="text-base font-bold font-mono text-[#1A2F46]">
                      ₹{formatINR(reconciliationData.total_sales)}
                    </span>
                    <span className="text-[9px] text-[#8B97A3] block mt-0.5">
                      {reconciliationData.invoices_count || 0} sales bills
                    </span>
                  </div>

                  <div className="p-2.5 bg-emerald-50/70 rounded-[2px] border border-emerald-100">
                    <span className="text-[10px] font-mono text-emerald-800 uppercase tracking-wider block">Total Collected</span>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      ₹{formatINR(reconciliationData.total_received)}
                    </span>
                    <span className="text-[9px] text-emerald-600 block mt-0.5">
                      {reconciliationData.receipts_count || 0} receipts
                    </span>
                  </div>

                  <div className="p-2.5 bg-rose-50/70 rounded-[2px] border border-rose-100">
                    <span className="text-[10px] font-mono text-rose-800 uppercase tracking-wider block">Balance Outstanding</span>
                    <span className="text-base font-bold font-mono text-rose-700">
                      ₹{formatINR(reconciliationData.outstanding_balance)}
                    </span>
                    <span className="text-[9px] text-rose-600 block mt-0.5">
                      {reconciliationData.unpaid_invoices_count || 0} unpaid bills
                    </span>
                  </div>

                  <div className="p-2.5 bg-blue-50/70 rounded-[2px] border border-blue-100">
                    <span className="text-[10px] font-mono text-blue-800 uppercase tracking-wider block">Credit Limit</span>
                    <span className="text-base font-bold font-mono text-blue-900">
                      ₹{formatINR(reconciliationData.credit_limit)}
                    </span>
                    <span className="text-[9px] text-blue-700 block mt-0.5">
                      {reconciliationData.credit_utilization_pct || 0}% utilized
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: Invoices / Receipts / Aging / Statement */}
              <div className="bg-white rounded-[3px] border border-[#C5CBD2] overflow-hidden shadow-xs">
                <div className="flex border-b border-[#C5CBD2] bg-[#F6F3EE] px-3 pt-2 space-x-1">
                  <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'INVOICES'
                        ? 'border-[#E65909] text-[#1A2F46] bg-white'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Sales Invoices ({invoices.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('RECEIPTS')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'RECEIPTS'
                        ? 'border-[#E65909] text-[#1A2F46] bg-white'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46]'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Payment Receipts ({receipts.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('AGING')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'AGING'
                        ? 'border-[#E65909] text-[#1A2F46] bg-white'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aging & MSMED</span>
                  </button>

                  {reconciliationData.matched_transactions && (
                    <button
                      onClick={() => setActiveTab('STATEMENT')}
                      className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                        activeTab === 'STATEMENT'
                          ? 'border-[#E65909] text-[#1A2F46] bg-white'
                          : 'border-transparent text-[#5D646C] hover:text-[#1A2F46]'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Statement Match</span>
                    </button>
                  )}
                </div>

                {/* Tab 1: Sales Invoices Content */}
                {activeTab === 'INVOICES' && (
                  <div className="overflow-x-auto">
                    {invoices.length === 0 ? (
                      <div className="p-8 text-center text-xs font-mono text-[#8B97A3]">
                        <p>No sales invoices recorded for this customer yet.</p>
                        <button
                          onClick={() => setAddInvoiceModalOpen(true)}
                          className="mt-2 text-xs font-semibold text-[#E65909] hover:underline"
                        >
                          + Issue First Sales Invoice
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#F6F3EE] border-b border-[#C5CBD2] text-[#5D646C] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Invoice No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3 text-right">Taxable</th>
                            <th className="py-2.5 px-3 text-right">GST Output</th>
                            <th className="py-2.5 px-3 text-right">Total (₹)</th>
                            <th className="py-2.5 px-3 text-right">Balance Due</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE9E3]">
                          {invoices.map(inv => {
                            const isPaid = inv.status === 'PAID';
                            const balanceDue = inv.balance_due !== undefined ? inv.balance_due : (isPaid ? 0 : inv.total_amount);

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-semibold text-[#1A2F46]">
                                  {inv.invoice_number}
                                </td>
                                <td className="py-2.5 px-3 text-[#5D646C]">{inv.invoice_date}</td>
                                <td className="py-2.5 px-3 text-[#5D646C]">{inv.due_date || '-'}</td>
                                <td className="py-2.5 px-3 text-right">₹{formatINR(inv.taxable_amount)}</td>
                                <td className="py-2.5 px-3 text-right text-[#5D646C]">₹{formatINR(inv.total_tax)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#1A2F46]">₹{formatINR(inv.total_amount)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#E65909]">
                                  ₹{formatINR(balanceDue)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] ${
                                    isPaid
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : inv.status === 'PARTIAL'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {!isPaid && (
                                    <button
                                      onClick={() => {
                                        setReceiptInvoiceId(inv.id);
                                        setReceiptAmount(String(balanceDue));
                                        setAddReceiptModalOpen(true);
                                      }}
                                      className="text-[10px] font-mono text-[#E65909] hover:underline font-bold"
                                    >
                                      Record Receipt
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 2: Payment Receipts Content */}
                {activeTab === 'RECEIPTS' && (
                  <div className="overflow-x-auto">
                    {receipts.length === 0 ? (
                      <div className="p-8 text-center text-xs font-mono text-[#8B97A3]">
                        <p>No payment receipts recorded for this customer yet.</p>
                        <button
                          onClick={() => setAddReceiptModalOpen(true)}
                          className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          + Record First Customer Receipt
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#F6F3EE] border-b border-[#C5CBD2] text-[#5D646C] uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">UTR / Reference</th>
                            <th className="py-2.5 px-3 text-right">Amount Received</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE9E3]">
                          {receipts.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-emerald-800">
                                {r.payment_number}
                              </td>
                              <td className="py-2.5 px-3 text-[#5D646C]">{r.payment_date}</td>
                              <td className="py-2.5 px-3">
                                <span className="bg-[#ECE9E3] text-[#1A2F46] px-1.5 py-0.5 rounded-xs text-[10px]">
                                  {r.payment_mode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#5D646C]">{r.reference_number || '-'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                ₹{formatINR(r.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-[2px] text-[10px] font-bold">
                                  {r.status || 'COMPLETED'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab 3: Aging Schedule & MSMED Act */}
                {activeTab === 'AGING' && reconciliationData.aging && (
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider">
                        Trade Debtor Aging Schedule
                      </h4>
                      <p className="text-[11px] text-[#5D646C] mt-0.5">
                        Categorization of outstanding receivables based on invoice creation date.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                      <div className="p-3 rounded-[2px] bg-emerald-50/70 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">0–30 Days</span>
                        <span className="text-base font-bold text-emerald-700 block mt-1">
                          ₹{formatINR(reconciliationData.aging.current_0_30)}
                        </span>
                        <span className="text-[9px] text-emerald-600">Current Standard</span>
                      </div>

                      <div className="p-3 rounded-[2px] bg-blue-50/70 border border-blue-200">
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">31–60 Days</span>
                        <span className="text-base font-bold text-blue-700 block mt-1">
                          ₹{formatINR(reconciliationData.aging.period_31_60)}
                        </span>
                        <span className="text-[9px] text-blue-600">Follow-up Due</span>
                      </div>

                      <div className="p-3 rounded-[2px] bg-amber-50/70 border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">61–90 Days</span>
                        <span className="text-base font-bold text-amber-700 block mt-1">
                          ₹{formatINR(reconciliationData.aging.period_61_90)}
                        </span>
                        <span className="text-[9px] text-amber-600">Urgent Collection</span>
                      </div>

                      <div className="p-3 rounded-[2px] bg-rose-50/70 border border-rose-200">
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">90+ Days</span>
                        <span className="text-base font-bold text-rose-700 block mt-1">
                          ₹{formatINR(reconciliationData.aging.over_90)}
                        </span>
                        <span className="text-[9px] text-rose-600">High Risk / Overdue</span>
                      </div>
                    </div>

                    {/* MSMED Statutory Advisory Box */}
                    <div className="p-3.5 rounded-[2px] bg-[#F6F3EE] border border-[#C5CBD2] space-y-1">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-[#E65909]" />
                        <span className="text-xs font-bold text-[#1A2F46] font-display">
                          MSMED Act Section 15 & 16 Compliance Protocol
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5D646C]">
                        Under the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006, payments beyond 45 days attract compound interest with monthly rests at <strong>three times the RBI bank rate</strong>. Ensure formal reminder notices are issued for any invoices exceeding 45 days.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 4: Statement Reconciliation Results */}
                {activeTab === 'STATEMENT' && (
                  <div className="p-4 space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A2F46]">
                        Automated Statement Reconciliation Results
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] ${
                        reconciliationData.reconciliation_status === 'RECONCILED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {reconciliationData.reconciliation_status}
                      </span>
                    </div>

                    {reconciliationData.matched_transactions && reconciliationData.matched_transactions.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F6F3EE] text-[#5D646C] text-[10px] uppercase">
                            <tr>
                              <th className="py-2 px-3">Invoice No</th>
                              <th className="py-2 px-3 text-right">Ledger Amount</th>
                              <th className="py-2 px-3 text-right">Statement Amount</th>
                              <th className="py-2 px-3 text-right">Diff</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ECE9E3]">
                            {reconciliationData.matched_transactions.map((m: any, idx: number) => (
                              <tr key={idx}>
                                <td className="py-2 px-3 font-bold">{m.invoice_number}</td>
                                <td className="py-2 px-3 text-right">₹{formatINR(m.ledger_amount)}</td>
                                <td className="py-2 px-3 text-right">₹{formatINR(m.statement_amount)}</td>
                                <td className="py-2 px-3 text-right">₹{formatINR(m.difference)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-xs font-bold ${
                                    m.status === 'MATCHED' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                  }`}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-[3px] border border-[#C5CBD2] text-center text-[#8B97A3] font-mono text-xs">
              No customer selected or registered yet. Click &quot;+ Add Customer&quot; above to begin tracking trade receivables.
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        title="Register Customer / Client Account"
        subtitle="Create a new trade debtor in your accounts receivable subledger"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">
              Customer / Client Legal Entity Name *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Reliance Retail Logistics Ltd"
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">GSTIN (15 Digits)</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                placeholder="24AABCR1234D1Z5"
                maxLength={15}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">PAN</label>
              <input
                type="text"
                value={customerPan}
                onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                placeholder="AABCR1234D"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Accounts Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="billing@customer.com"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Accounts Phone</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">State</label>
              <input
                type="text"
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                value={customerLimit}
                onChange={(e) => setCustomerLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Terms (Days)</label>
              <input
                type="number"
                value={customerTerms}
                onChange={(e) => setCustomerTerms(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setAddCustomerModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Sales Invoice Modal */}
      <Modal
        isOpen={addInvoiceModalOpen}
        onClose={() => setAddInvoiceModalOpen(false)}
        title="Record Sales Invoice"
        subtitle={`Issue a new revenue bill for ${selectedCustomer?.name || 'Customer'}`}
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3 font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="SF-SALES-2026-001"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Taxable Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={invTaxable}
                onChange={(e) => setInvTaxable(e.target.value)}
                placeholder="100000.00"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">GST Rate (%)</label>
              <select
                value={invGstRate}
                onChange={(e) => setInvGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value={18}>18% (Standard Services / Tech / SaaS)</option>
                <option value={12}>12% (Specified Goods)</option>
                <option value={5}>5% (Essential Services)</option>
                <option value={28}>28% (Luxury / Regulated)</option>
                <option value={0}>0% (Export / SEZ / Exempt)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Payment Due Date (Optional)</label>
            <input
              type="date"
              value={invDueDate}
              onChange={(e) => setInvDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
            />
            <p className="text-[10px] text-[#8B97A3] mt-0.5">Defaults to +30 days if left blank</p>
          </div>

          {invTaxable && (
            <div className="p-3 rounded-[2px] bg-[#F6F3EE] border border-[#C5CBD2] text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{formatINR(parseFloat(invTaxable) || 0)}</span>
              </div>
              <div className="flex justify-between text-[#5D646C]">
                <span>GST Output ({invGstRate}%):</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * invGstRate) / 100)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1A2F46] border-t border-[#C5CBD2] pt-1">
                <span>Total Receivable Amount:</span>
                <span className="text-[#E65909]">
                  ₹{formatINR(((parseFloat(invTaxable) || 0) * (1 + invGstRate / 100)))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setAddInvoiceModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !invTaxable}
              className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Sales Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Receipt Modal */}
      <Modal
        isOpen={addReceiptModalOpen}
        onClose={() => setAddReceiptModalOpen(false)}
        title="Record Customer Payment Receipt"
        subtitle={`Record bank collection / credit voucher from ${selectedCustomer?.name || 'Customer'}`}
      >
        <form onSubmit={handleRecordReceipt} className="space-y-3 font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Receipt / Voucher No</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Receipt Date *</label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Amount Received (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder="100000.00"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Payment Mode</label>
              <select
                value={receiptMode}
                onChange={(e) => setReceiptMode(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="NEFT">NEFT Bank Transfer</option>
                <option value="RTGS">RTGS High-Value Transfer</option>
                <option value="IMPS">IMPS Instant Credit</option>
                <option value="UPI">UPI Digital Payment</option>
                <option value="CHEQUE">Bank Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">UTR / Bank Transaction Reference</label>
            <input
              type="text"
              value={receiptUtr}
              onChange={(e) => setReceiptUtr(e.target.value)}
              placeholder="e.g. HDFCR52026111800123"
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">
              Apply to Specific Invoice (Optional)
            </label>
            <select
              value={receiptInvoiceId || ''}
              onChange={(e) => setReceiptInvoiceId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            >
              <option value="">Auto-allocate across oldest unpaid invoices (FIFO)</option>
              {invoices.filter(i => i.status !== 'PAID').map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} (Due: ₹{formatINR(i.balance_due || i.total_amount)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setAddReceiptModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !receiptAmount}
              className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record Receipt Voucher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Customer Statement Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Customer Ledger Statement"
        subtitle={`Match customer's external ledger against SmartFin subledger for ${selectedCustomer?.name || 'Customer'}`}
      >
        <form onSubmit={handleUploadStatement} className="space-y-4 font-sans">
          <div className="border-2 border-dashed border-[#C5CBD2] rounded-[2px] p-6 text-center hover:border-[#E65909] transition-colors">
            <Upload className="w-8 h-8 text-[#8B97A3] mx-auto mb-2" />
            <p className="text-xs text-[#1A2F46] font-semibold">Select Excel or CSV Ledger File</p>
            <p className="text-[10px] text-[#8B97A3] mt-1">Expected columns: Invoice No, Amount / Balance</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
              className="mt-3 text-xs text-[#5D646C]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !statementFile}
              className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
            >
              {uploading ? 'Reconciling...' : 'Run Statement Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
