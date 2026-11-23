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
  Check,
  Edit3,
  Trash2,
  Folder,
  Key,
  Phone,
  Mail,
  FileSpreadsheet,
  Layers,
  Lock,
  Unlock,
  Globe,
  ChevronLeft,
  Save,
  Database,
  Smartphone
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

  // Primary Module Mode: 'DIRECTORY' | 'RECEIVABLES'
  const [activeModuleMode, setActiveModuleMode] = useState<'DIRECTORY' | 'RECEIVABLES'>('DIRECTORY');

  // Master Directory Filters & Pagination
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'GST' | 'IT' | 'TDS' | 'PHONE' | 'EMAIL'>('ALL');
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = useState(25);

  // Edit Customer Modal State
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    trade_name: '',
    gstin: '',
    pan: '',
    tan: '',
    email: '',
    phone: '',
    folder_name: '',
    aliases: '',
    contact_person: '',
    custom_folder_override: '',
    auto_email_dispatch: true,
    auto_whatsapp_dispatch: true,
    compliance_status: 'ACTIVE',
    credit_limit: 100000,
    gst_username: '',
    gst_password: '',
    it_username: '',
    it_password: '',
    tds_username: '',
    tds_password: ''
  });

  // Master Import State
  const [masterImportModalOpen, setMasterImportModalOpen] = useState(false);
  const [importingMasters, setImportingMasters] = useState(false);
  const [importStats, setImportStats] = useState<any | null>(null);
  const [uploadGstFile, setUploadGstFile] = useState<File | null>(null);
  const [uploadItFile, setUploadItFile] = useState<File | null>(null);
  const [uploadTdsFile, setUploadTdsFile] = useState<File | null>(null);

  // Modals
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [addInvoiceModalOpen, setAddInvoiceModalOpen] = useState(false);
  const [addReceiptModalOpen, setAddReceiptModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerTradeName, setCustomerTradeName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [customerTan, setCustomerTan] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerFolderName, setCustomerFolderName] = useState('');
  const [customerComplianceStatus, setCustomerComplianceStatus] = useState('ACTIVE');
  const [customerLimit, setCustomerLimit] = useState(1000000);
  const [customerTerms, setCustomerTerms] = useState(30);
  const [customerGstUser, setCustomerGstUser] = useState('');
  const [customerGstPwd, setCustomerGstPwd] = useState('');
  const [customerItUser, setCustomerItUser] = useState('');
  const [customerItPwd, setCustomerItPwd] = useState('');
  const [customerTdsUser, setCustomerTdsUser] = useState('');
  const [customerTdsPwd, setCustomerTdsPwd] = useState('');

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
      const cleanGstin = customerGstin.trim().toUpperCase();
      const cleanPan = customerPan.trim().toUpperCase() || (cleanGstin.length >= 12 ? cleanGstin.slice(2, 12) : '');
      const newC = await api.createCustomer({
        name: customerName.trim(),
        trade_name: customerTradeName.trim() || undefined,
        gstin: cleanGstin || undefined,
        pan: cleanPan || undefined,
        tan: customerTan.trim().toUpperCase() || undefined,
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined,
        state: customerState,
        state_code: cleanGstin.slice(0, 2) || '24',
        folder_name: customerFolderName.trim() || customerName.trim(),
        compliance_status: customerComplianceStatus,
        credit_limit: parseFloat(String(customerLimit)) || 1000000.0,
        outstanding_balance: 0.0,
        gst_username: customerGstUser.trim() || undefined,
        gst_password: customerGstPwd.trim() || undefined,
        it_username: customerItUser.trim() || (cleanPan || undefined),
        it_password: customerItPwd.trim() || undefined,
        tds_username: customerTdsUser.trim() || undefined,
        tds_password: customerTdsPwd.trim() || undefined
      });
      setAddCustomerModalOpen(false);
      setCustomerName('');
      setCustomerTradeName('');
      setCustomerGstin('');
      setCustomerPan('');
      setCustomerTan('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerFolderName('');
      setCustomerGstUser('');
      setCustomerGstPwd('');
      setCustomerItUser('');
      setCustomerItPwd('');
      setCustomerTdsUser('');
      setCustomerTdsPwd('');
      await fetchCustomers();
      setSelectedCustomerId(newC.id);
      alert(`Client '${newC.name}' successfully added to Master Directory.`);
    } catch (err: any) {
      alert(`Error registering client: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditCustomer = (c: CustomerSummary) => {
    setEditingCustomerId(c.id);
    setEditForm({
      name: c.name || '',
      trade_name: c.trade_name || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      tan: c.tan || '',
      email: c.email || '',
      phone: c.phone || '',
      folder_name: c.folder_name || c.name || '',
      aliases: c.aliases || '',
      contact_person: c.contact_person || '',
      custom_folder_override: c.custom_folder_override || '',
      auto_email_dispatch: c.auto_email_dispatch ?? true,
      auto_whatsapp_dispatch: c.auto_whatsapp_dispatch ?? true,
      compliance_status: c.compliance_status || 'ACTIVE',
      credit_limit: c.credit_limit || 100000,
      gst_username: c.gst_username || '',
      gst_password: '',
      it_username: c.it_username || '',
      it_password: '',
      tds_username: c.tds_username || '',
      tds_password: ''
    });
    setEditCustomerModalOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerId) return;
    setSubmitting(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        trade_name: editForm.trade_name.trim() || null,
        gstin: editForm.gstin.trim() ? editForm.gstin.trim().toUpperCase() : null,
        pan: editForm.pan.trim() ? editForm.pan.trim().toUpperCase() : null,
        tan: editForm.tan.trim() ? editForm.tan.trim().toUpperCase() : null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        folder_name: editForm.folder_name.trim() || editForm.name.trim(),
        aliases: editForm.aliases.trim() || null,
        contact_person: editForm.contact_person.trim() || null,
        custom_folder_override: editForm.custom_folder_override.trim() || null,
        auto_email_dispatch: editForm.auto_email_dispatch,
        auto_whatsapp_dispatch: editForm.auto_whatsapp_dispatch,
        compliance_status: editForm.compliance_status,
        credit_limit: parseFloat(String(editForm.credit_limit)) || 100000,
        gst_username: editForm.gst_username.trim() || null,
        it_username: editForm.it_username.trim() || null,
        tds_username: editForm.tds_username.trim() || null
      };
      if (editForm.gst_password.trim()) payload.gst_password = editForm.gst_password.trim();
      if (editForm.it_password.trim()) payload.it_password = editForm.it_password.trim();
      if (editForm.tds_password.trim()) payload.tds_password = editForm.tds_password.trim();

      const updated = await api.updateCustomer(editingCustomerId, payload);
      setCustomers(prev => prev.map(c => c.id === editingCustomerId ? { ...c, ...updated } : c));
      setEditCustomerModalOpen(false);
      alert(`Client '${updated.name}' updated successfully.`);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client '${name}'?`)) return;
    try {
      await api.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
      alert(`Client '${name}' deleted successfully.`);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleTriggerMasterImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setImportingMasters(true);
    try {
      const formData = new FormData();
      if (uploadGstFile) formData.append('gst_file', uploadGstFile);
      if (uploadItFile) formData.append('it_file', uploadItFile);
      if (uploadTdsFile) formData.append('tds_file', uploadTdsFile);

      const res = await api.importClientMasters(formData);
      setImportStats(res);
      await fetchCustomers();
      setMasterImportModalOpen(false);
      alert(`Master Import completed successfully!\n• Clients Created: ${res.clients_created}\n• Clients Updated: ${res.clients_updated}\n• Total in Database: ${res.total_clients_in_db}`);
    } catch (err: any) {
      alert(`Master import failed: ${err.message}`);
    } finally {
      setImportingMasters(false);
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

  // Master Directory filtered and paginated list
  const directoryFilteredClients = useMemo(() => {
    return customers.filter(c => {
      if (directoryFilter === 'GST' && !c.gstin) return false;
      if (directoryFilter === 'IT' && !c.pan && !c.it_username) return false;
      if (directoryFilter === 'TDS' && !c.tan && !c.tds_username) return false;
      if (directoryFilter === 'PHONE' && !c.phone) return false;
      if (directoryFilter === 'EMAIL' && !c.email) return false;

      if (!directorySearch.trim()) return true;
      const q = directorySearch.toLowerCase().trim();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.pan && c.pan.toLowerCase().includes(q)) ||
        (c.tan && c.tan.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.folder_name && c.folder_name.toLowerCase().includes(q))
      );
    });
  }, [customers, directorySearch, directoryFilter]);

  const totalDirPages = Math.ceil(directoryFilteredClients.length / dirPageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (dirPage - 1) * dirPageSize;
    return directoryFilteredClients.slice(start, start + dirPageSize);
  }, [directoryFilteredClients, dirPage, dirPageSize]);

  // Total stat counts across all clients
  const totalMasterCount = customers.length;
  const gstRegisteredCount = customers.filter(c => c.gstin).length;
  const itAssesseesCount = customers.filter(c => c.pan || c.it_username).length;
  const tdsDeductorsCount = customers.filter(c => c.tan || c.tds_username).length;
  const withPhoneCount = customers.filter(c => c.phone).length;
  const withEmailCount = customers.filter(c => c.email).length;

  const totalReceivables = customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
  const totalInvoicedAll = customers.reduce((sum, c) => sum + (c.total_sales || 0), 0);
  const totalCollectedAll = customers.reduce((sum, c) => sum + (c.total_received || 0), 0);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-5 w-full max-w-none">
      {/* Primary Sub-Tab Switcher & Action Toolbar (Eliminated Redundant Double Banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C5CBD2] dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveModuleMode('DIRECTORY')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-2 transition-all ${
              activeModuleMode === 'DIRECTORY'
                ? 'bg-[#1A2F46] text-white shadow-xs font-bold'
                : 'text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100 hover:bg-[#ECE9E3] dark:bg-[#1A253A]'
            }`}
          >
            <Users2 className="w-4 h-4 text-[#E65909]" />
            <span>1. Client Master Directory ({totalMasterCount.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setActiveModuleMode('RECEIVABLES')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-2 transition-all ${
              activeModuleMode === 'RECEIVABLES'
                ? 'bg-[#1A2F46] text-white shadow-xs font-bold'
                : 'text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100 hover:bg-[#ECE9E3] dark:bg-[#1A253A]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>2. Trade Receivables & Invoices</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="btn-signal flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-[3px] shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Client</span>
          </button>

          <button
            onClick={() => setMasterImportModalOpen(true)}
            className="bg-white dark:bg-[#131C2E] hover:bg-[#ECE9E3] dark:bg-[#1A253A] text-[#1A2F46] dark:text-slate-100 border border-[#C5CBD2] dark:border-slate-800 px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sync Excel Masters</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CLIENT MASTER DIRECTORY */}
      {activeModuleMode === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Master Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 uppercase tracking-wider block">Total Clients</span>
              <p className="text-lg font-display font-bold text-[#1A2F46] dark:text-slate-100 mt-0.5 font-mono">{totalMasterCount.toLocaleString()}</p>
              <span className="text-[9px] text-[#8B97A3]">Master Database</span>
            </div>

            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider block">GST Registered</span>
              <p className="text-lg font-display font-bold text-[#1A2F46] dark:text-slate-100 mt-0.5 font-mono">{gstRegisteredCount}</p>
              <span className="text-[9px] text-[#8B97A3]">GSTIN Mapped</span>
            </div>

            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider block">Income Tax</span>
              <p className="text-lg font-display font-bold text-[#1A2F46] dark:text-slate-100 mt-0.5 font-mono">{itAssesseesCount.toLocaleString()}</p>
              <span className="text-[9px] text-[#8B97A3]">PAN & Genius IT</span>
            </div>

            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider block">TDS Deductors</span>
              <p className="text-lg font-display font-bold text-[#1A2F46] dark:text-slate-100 mt-0.5 font-mono">{tdsDeductorsCount}</p>
              <span className="text-[9px] text-[#8B97A3]">TAN Accounts</span>
            </div>

            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider block">WhatsApp Phone</span>
              <p className="text-lg font-display font-bold text-emerald-700 mt-0.5 font-mono">{withPhoneCount}</p>
              <span className="text-[9px] text-[#8B97A3]">Direct Reminder</span>
            </div>

            <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <span className="text-[10px] font-mono text-blue-700 uppercase tracking-wider block">Email Linked</span>
              <p className="text-lg font-display font-bold text-blue-700 mt-0.5 font-mono">{withEmailCount}</p>
              <span className="text-[9px] text-[#8B97A3]">GSTR PDF Dispatch</span>
            </div>
          </div>

          {/* Directory Control Strip */}
          <div className="bg-white dark:bg-[#131C2E] p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-[#8B97A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by client name, trade name, GSTIN, PAN, TAN, phone, or folder..."
                value={directorySearch}
                onChange={(e) => { setDirectorySearch(e.target.value); setDirPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] font-sans focus:outline-none focus:border-[#E65909]"
              />
              {directorySearch && (
                <button
                  onClick={() => { setDirectorySearch(''); setDirPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8B97A3] hover:text-[#1A2F46] dark:text-slate-100"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
              {[
                { id: 'ALL', label: `All (${totalMasterCount})` },
                { id: 'GST', label: `GST (${gstRegisteredCount})` },
                { id: 'IT', label: `Income Tax (${itAssesseesCount})` },
                { id: 'TDS', label: `TDS (${tdsDeductorsCount})` },
                { id: 'PHONE', label: `With Phone (${withPhoneCount})` },
                { id: 'EMAIL', label: `With Email (${withEmailCount})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setDirectoryFilter(f.id as any); setDirPage(1); }}
                  className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-[2px] font-semibold transition-colors ${
                    directoryFilter === f.id
                      ? 'bg-[#1A2F46] text-white shadow-xs'
                      : 'bg-[#F6F3EE] dark:bg-[#0B1120] text-[#5D646C] dark:text-slate-400 hover:bg-[#ECE9E3] dark:bg-[#1A253A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Master Clients Table */}
          <div className="bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1020px] w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1A2F46] text-white text-[11px] font-mono uppercase tracking-wider border-b border-[#364452]">
                    <th className="py-2.5 px-3 font-semibold min-w-[240px]">Client / Trade Entity</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[190px]">Identifiers (GSTIN / PAN / TAN)</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[170px]">Contact (WhatsApp / Email)</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[140px]">Desktop Folder</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[110px] text-center">Portals Linked</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[90px] text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[110px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE9E3] dark:divide-slate-800 font-sans">
                  {paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#8B97A3]">
                        <Users2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">No clients match the current search or filter criteria.</p>
                        <p className="text-[10px] mt-0.5">Try clearing the search query or import records from Excel Masters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map(c => (
                      <tr key={c.id} className="hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#1A2F46] dark:text-slate-100 font-display text-xs">
                            {c.name}
                          </div>
                          {c.trade_name && c.trade_name !== c.name && (
                            <div className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 mt-0.5">
                              Trade: {c.trade_name}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5 font-mono text-[11px]">
                            {c.gstin ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="bg-brand-50 text-brand-700 px-1.5 py-0.2 rounded text-[10px] font-bold">GST</span>
                                <span className="text-[#1A2F46] dark:text-slate-100 font-semibold">{c.gstin}</span>
                              </div>
                            ) : null}
                            {c.pan ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded text-[10px] font-bold">PAN</span>
                                <span className="text-[#5D646C] dark:text-slate-400">{c.pan}</span>
                              </div>
                            ) : null}
                            {c.tan ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded text-[10px] font-bold">TAN</span>
                                <span className="text-[#5D646C] dark:text-slate-400">{c.tan}</span>
                              </div>
                            ) : null}
                            {!c.gstin && !c.pan && !c.tan && (
                              <span className="text-[#8B97A3] text-[10px]">None specified</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5 text-xs">
                            {c.phone ? (
                              <div className="flex items-center space-x-1 text-emerald-700 font-mono text-[11px]">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span>{c.phone}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenEditCustomer(c)}
                                className="text-[10px] font-mono text-[#8B97A3] hover:text-[#E65909] underline"
                              >
                                + Add Phone
                              </button>
                            )}
                            {c.email ? (
                              <div className="flex items-center space-x-1 text-blue-700 font-mono text-[11px] truncate max-w-[180px]">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenEditCustomer(c)}
                                className="text-[10px] font-mono text-[#8B97A3] hover:text-[#E65909] underline block"
                              >
                                + Add Email
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#5D646C] dark:text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Folder className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <span className="truncate max-w-[140px]" title={c.folder_name || c.name}>
                              {c.folder_name || c.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center space-x-1 font-mono text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${c.has_gst_password ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`} title={c.has_gst_password ? 'GST Password configured (Encrypted)' : 'No GST credentials'}>
                              GST
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${c.has_it_password ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`} title={c.has_it_password ? 'Income Tax Password configured (Encrypted)' : 'No IT credentials'}>
                              IT
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${c.has_tds_password ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-400'}`} title={c.has_tds_password ? 'TDS Password configured (Encrypted)' : 'No TDS credentials'}>
                              TDS
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            c.compliance_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {c.compliance_status || 'ACTIVE'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditCustomer(c)}
                              className="px-2 py-1 bg-slate-100 hover:bg-[#1A2F46] hover:text-white text-[#1A2F46] dark:text-slate-100 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                              title="Edit Client Information"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setActiveModuleMode('RECEIVABLES');
                              }}
                              className="px-2 py-1 bg-[#F6F3EE] dark:bg-[#0B1120] hover:bg-[#ECE9E3] dark:bg-[#1A253A] text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100 rounded text-[11px] font-mono flex items-center space-x-1 transition-colors"
                              title="View Trade Receivables Ledger"
                            >
                              <Receipt className="w-3 h-3 text-emerald-600" />
                              <span>Ledger</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-[#F6F3EE] dark:bg-[#0B1120] border-t border-[#C5CBD2] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-[#5D646C] dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span>Show</span>
                <select
                  value={dirPageSize}
                  onChange={(e) => { setDirPageSize(Number(e.target.value)); setDirPage(1); }}
                  className="px-2 py-1 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded text-xs focus:outline-none"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
                <span>
                  Showing {directoryFilteredClients.length === 0 ? 0 : (dirPage - 1) * dirPageSize + 1} to {Math.min(dirPage * dirPageSize, directoryFilteredClients.length)} of {directoryFilteredClients.length} clients
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setDirPage(1)}
                  disabled={dirPage === 1}
                  className="px-2.5 py-1 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded text-xs disabled:opacity-40 hover:bg-[#ECE9E3] dark:bg-[#1A253A]"
                >
                  « First
                </button>
                <button
                  onClick={() => setDirPage(p => Math.max(1, p - 1))}
                  disabled={dirPage === 1}
                  className="px-2.5 py-1 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded text-xs disabled:opacity-40 hover:bg-[#ECE9E3] dark:bg-[#1A253A]"
                >
                  ‹ Prev
                </button>
                <span className="px-3 py-1 font-bold text-[#1A2F46] dark:text-slate-100">
                  Page {dirPage} of {totalDirPages}
                </span>
                <button
                  onClick={() => setDirPage(p => Math.min(totalDirPages, p + 1))}
                  disabled={dirPage === totalDirPages || totalDirPages === 0}
                  className="px-2.5 py-1 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded text-xs disabled:opacity-40 hover:bg-[#ECE9E3] dark:bg-[#1A253A]"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setDirPage(totalDirPages)}
                  disabled={dirPage === totalDirPages || totalDirPages === 0}
                  className="px-2.5 py-1 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded text-xs disabled:opacity-40 hover:bg-[#ECE9E3] dark:bg-[#1A253A]"
                >
                  Last »
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRADE RECEIVABLES & AGING WORKSPACE */}
      {activeModuleMode === 'RECEIVABLES' && (
        <>

      {/* Aggregate Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Gross Trade Revenue</span>
            <DollarSign className="w-4 h-4 text-[#1A2F46] dark:text-slate-100" />
          </div>
          <p className="text-xl font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1 font-mono">
            ₹{formatINR(totalInvoicedAll)}
          </p>
          <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Across all registered customer accounts</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider">Total Collections Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-display font-extrabold text-emerald-700 mt-1 font-mono">
            ₹{formatINR(totalCollectedAll)}
          </p>
          <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Realized bank credits & UTR receipts</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#E65909] uppercase tracking-wider">Active Receivables Due</span>
            <Clock className="w-4 h-4 text-[#E65909]" />
          </div>
          <p className="text-xl font-display font-extrabold text-[#E65909] mt-1 font-mono">
            ₹{formatINR(totalReceivables)}
          </p>
          <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Outstanding trade debit balance</p>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Customer Master Directory (col-span-4) */}
        <div className="xl:col-span-4 bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 flex flex-col shadow-xs">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#0B1120] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-[#E65909]" />
                <span>Customer Ledger ({filteredCustomers.length})</span>
              </span>
              <button
                onClick={fetchCustomers}
                className="text-[10px] font-mono text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100 flex items-center gap-1"
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
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] font-sans focus:outline-none focus:border-[#E65909]"
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
                      : 'bg-[#ECE9E3] dark:bg-[#1A253A] text-[#5D646C] dark:text-slate-400 hover:bg-[#DBE2E9]'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'DUE' ? 'With Balance' : 'Zero Due'}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Cards List */}
          <div className="divide-y divide-[#ECE9E3] dark:divide-slate-800 max-h-[580px] overflow-y-auto">
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
                        ? 'border-[#E65909] bg-[#F6F3EE] dark:bg-[#0B1120]'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 truncate">{c.name}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400">{c.gstin || 'Unregistered'}</span>
                          {c.state && (
                            <span className="text-[9px] font-mono text-[#8B97A3] bg-[#ECE9E3] dark:bg-[#1A253A] px-1 py-0.2 rounded-xs">
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
                      <span className="text-[9px] font-mono text-[#5D646C] dark:text-slate-400">{util}% used</span>
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
            <div className="bg-white dark:bg-[#131C2E] p-12 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 text-center text-[#8B97A3] font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#E65909]" />
              Loading customer subledger & reconciliation...
            </div>
          ) : selectedCustomer && reconciliationData ? (
            <>
              {/* Profile Card Header */}
              <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE9E3] dark:border-slate-800 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-[#E65909]" />
                      <h3 className="text-base font-display font-bold text-[#1A2F46] dark:text-slate-100">
                        {reconciliationData.customer_name}
                      </h3>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-[2px] font-bold">
                        ACTIVE DEBTOR
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[#5D646C] dark:text-slate-400 mt-1">
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
                  <div className="p-2.5 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[2px] border border-[#ECE9E3] dark:border-slate-800">
                    <span className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 uppercase tracking-wider block">Total Billed</span>
                    <span className="text-base font-bold font-mono text-[#1A2F46] dark:text-slate-100">
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
              <div className="bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="flex border-b border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#0B1120] px-3 pt-2 space-x-1">
                  <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'INVOICES'
                        ? 'border-[#E65909] text-[#1A2F46] dark:text-slate-100 bg-white dark:bg-[#131C2E]'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Sales Invoices ({invoices.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('RECEIPTS')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'RECEIPTS'
                        ? 'border-[#E65909] text-[#1A2F46] dark:text-slate-100 bg-white dark:bg-[#131C2E]'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Payment Receipts ({receipts.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('AGING')}
                    className={`px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'AGING'
                        ? 'border-[#E65909] text-[#1A2F46] dark:text-slate-100 bg-white dark:bg-[#131C2E]'
                        : 'border-transparent text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100'
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
                          ? 'border-[#E65909] text-[#1A2F46] dark:text-slate-100 bg-white dark:bg-[#131C2E]'
                          : 'border-transparent text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100'
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
                        <thead className="bg-[#F6F3EE] dark:bg-[#0B1120] border-b border-[#C5CBD2] dark:border-slate-800 text-[#5D646C] dark:text-slate-400 uppercase tracking-wider text-[10px]">
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
                        <tbody className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
                          {invoices.map(inv => {
                            const isPaid = inv.status === 'PAID';
                            const balanceDue = inv.balance_due !== undefined ? inv.balance_due : (isPaid ? 0 : inv.total_amount);

                            return (
                              <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                                <td className="py-2.5 px-3 font-semibold text-[#1A2F46] dark:text-slate-100">
                                  {inv.invoice_number}
                                </td>
                                <td className="py-2.5 px-3 text-[#5D646C] dark:text-slate-400">{inv.invoice_date}</td>
                                <td className="py-2.5 px-3 text-[#5D646C] dark:text-slate-400">{inv.due_date || '-'}</td>
                                <td className="py-2.5 px-3 text-right">₹{formatINR(inv.taxable_amount)}</td>
                                <td className="py-2.5 px-3 text-right text-[#5D646C] dark:text-slate-400">₹{formatINR(inv.total_tax)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#1A2F46] dark:text-slate-100">₹{formatINR(inv.total_amount)}</td>
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
                        <thead className="bg-[#F6F3EE] dark:bg-[#0B1120] border-b border-[#C5CBD2] dark:border-slate-800 text-[#5D646C] dark:text-slate-400 uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">UTR / Reference</th>
                            <th className="py-2.5 px-3 text-right">Amount Received</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
                          {receipts.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                              <td className="py-2.5 px-3 font-semibold text-emerald-800">
                                {r.payment_number}
                              </td>
                              <td className="py-2.5 px-3 text-[#5D646C] dark:text-slate-400">{r.payment_date}</td>
                              <td className="py-2.5 px-3">
                                <span className="bg-[#ECE9E3] dark:bg-[#1A253A] text-[#1A2F46] dark:text-slate-100 px-1.5 py-0.5 rounded-xs text-[10px]">
                                  {r.payment_mode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[#5D646C] dark:text-slate-400">{r.reference_number || '-'}</td>
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
                      <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                        Trade Debtor Aging Schedule
                      </h4>
                      <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5">
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
                    <div className="p-3.5 rounded-[2px] bg-[#F6F3EE] dark:bg-[#0B1120] border border-[#C5CBD2] dark:border-slate-800 space-y-1">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-[#E65909]" />
                        <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 font-display">
                          MSMED Act Section 15 & 16 Compliance Protocol
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5D646C] dark:text-slate-400">
                        Under the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006, payments beyond 45 days attract compound interest with monthly rests at <strong>three times the RBI bank rate</strong>. Ensure formal reminder notices are issued for any invoices exceeding 45 days.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 4: Statement Reconciliation Results */}
                {activeTab === 'STATEMENT' && (
                  <div className="p-4 space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">
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
                          <thead className="bg-[#F6F3EE] dark:bg-[#0B1120] text-[#5D646C] dark:text-slate-400 text-[10px] uppercase">
                            <tr>
                              <th className="py-2 px-3">Invoice No</th>
                              <th className="py-2 px-3 text-right">Ledger Amount</th>
                              <th className="py-2 px-3 text-right">Statement Amount</th>
                              <th className="py-2 px-3 text-right">Diff</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
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
            <div className="bg-white dark:bg-[#131C2E] p-12 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 text-center text-[#8B97A3] font-mono text-xs">
              No customer selected or registered yet. Click &quot;+ Add Customer&quot; above to begin tracking trade receivables.
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Add Client / Customer Modal */}
      <Modal
        isOpen={addCustomerModalOpen}
        onClose={() => setAddCustomerModalOpen(false)}
        title="Add New Client to Master Directory"
        subtitle="Provision a verified assessee with GST, IT, TDS identifiers and automated desktop filing folder"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3 font-sans max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Client / Company Legal Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. HIREN PATEL ARCHITECT"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Trade Name (Optional)
              </label>
              <input
                type="text"
                value={customerTradeName}
                onChange={(e) => setCustomerTradeName(e.target.value)}
                placeholder="e.g. HPA Studio"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">GSTIN (15 Chars)</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setCustomerGstin(val);
                  if (val.length >= 12 && !customerPan) {
                    setCustomerPan(val.slice(2, 12));
                  }
                }}
                placeholder="24AAMPP2463N2Z7"
                maxLength={15}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Income Tax PAN</label>
              <input
                type="text"
                value={customerPan}
                onChange={(e) => setCustomerPan(e.target.value.toUpperCase())}
                placeholder="AAMPP2463N"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">TDS TAN (10 Chars)</label>
              <input
                type="text"
                value={customerTan}
                onChange={(e) => setCustomerTan(e.target.value.toUpperCase())}
                placeholder="AHMH01522D"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                WhatsApp Phone Number
              </label>
              <div className="relative">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Used for Daily TDS/GST Reminders & Delivery</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Official Accounts Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="accounts@clientcompany.com"
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Used for GSTR-1, 2B, 3B Auto-Email Dispatch</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Local Desktop Folder Name
              </label>
              <div className="relative">
                <Folder className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerFolderName}
                  onChange={(e) => setCustomerFolderName(e.target.value)}
                  placeholder="Defaults to Client Name"
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Directory on Mac: ~/Desktop/&lt;Folder&gt;</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Compliance Status</label>
              <select
                value={customerComplianceStatus}
                onChange={(e) => setCustomerComplianceStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="ACTIVE">ACTIVE (Receives Reminders & Dispatches)</option>
                <option value="PENDING_ONBOARDING">PENDING ONBOARDING</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Optional Portal Credentials (Encrypted at Rest) */}
          <div className="p-3 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 space-y-2 mt-2">
            <span className="text-[11px] font-mono font-bold text-[#1A2F46] dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Statutory Portal Credentials (Zero Plaintext — AES Encrypted)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">GST Portal User</label>
                <input
                  type="text"
                  value={customerGstUser}
                  onChange={(e) => setCustomerGstUser(e.target.value)}
                  placeholder="GST Username"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={customerGstPwd}
                  onChange={(e) => setCustomerGstPwd(e.target.value)}
                  placeholder="GST Password"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">IT e-Filing User</label>
                <input
                  type="text"
                  value={customerItUser}
                  onChange={(e) => setCustomerItUser(e.target.value)}
                  placeholder="PAN / IT User"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={customerItPwd}
                  onChange={(e) => setCustomerItPwd(e.target.value)}
                  placeholder="IT Password"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">TDS Traces User</label>
                <input
                  type="text"
                  value={customerTdsUser}
                  onChange={(e) => setCustomerTdsUser(e.target.value)}
                  placeholder="TDS User ID"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={customerTdsPwd}
                  onChange={(e) => setCustomerTdsPwd(e.target.value)}
                  placeholder="TDS Password"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddCustomerModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save Client to Master'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Client / Customer Modal */}
      <Modal
        isOpen={editCustomerModalOpen}
        onClose={() => setEditCustomerModalOpen(false)}
        title="Edit Client Master Record"
        subtitle={`Update official identifiers, contacts, and folder for ${editForm.name}`}
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-3 font-sans max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Client / Company Legal Name *
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Trade Name
              </label>
              <input
                type="text"
                value={editForm.trade_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, trade_name: e.target.value }))}
                placeholder="Optional trade / brand name"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">GSTIN (15 Chars)</label>
              <input
                type="text"
                value={editForm.gstin}
                onChange={(e) => setEditForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                placeholder="24AAMPP2463N2Z7"
                maxLength={15}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Income Tax PAN</label>
              <input
                type="text"
                value={editForm.pan}
                onChange={(e) => setEditForm(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                placeholder="AAMPP2463N"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">TDS TAN</label>
              <input
                type="text"
                value={editForm.tan}
                onChange={(e) => setEditForm(prev => ({ ...prev, tan: e.target.value.toUpperCase() }))}
                placeholder="AHMH01522D"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                WhatsApp Phone Number
              </label>
              <div className="relative">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Used for Daily WhatsApp TDS/GST Reminders</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Official Accounts Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="accounts@clientcompany.com"
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Used for GSTR PDF Auto-Email & Compliance Letters</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Primary Contact Person
              </label>
              <input
                type="text"
                value={editForm.contact_person}
                onChange={(e) => setEditForm(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder="e.g. Hiren Patel (Managing Director)"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Search Aliases & Folder Keywords
              </label>
              <input
                type="text"
                value={editForm.aliases}
                onChange={(e) => setEditForm(prev => ({ ...prev, aliases: e.target.value }))}
                placeholder="e.g. Swastik, Swastik Insecticides"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
              <span className="text-[10px] text-[#8B97A3]">Comma-separated aliases for fuzzy routing</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Local Desktop Folder Name
              </label>
              <div className="relative">
                <Folder className="w-3.5 h-3.5 text-amber-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={editForm.folder_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, folder_name: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
                />
              </div>
              <span className="text-[10px] text-[#8B97A3]">Sync directory on Mac: ~/Desktop/&lt;Folder&gt;</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
                Custom Folder Path Override (Optional)
              </label>
              <input
                type="text"
                value={editForm.custom_folder_override}
                onChange={(e) => setEditForm(prev => ({ ...prev, custom_folder_override: e.target.value }))}
                placeholder="e.g. ~/Desktop/Clients/CustomName"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
              <span className="text-[10px] text-[#8B97A3]">Direct override path for FolderResolver</span>
            </div>
          </div>

          {/* Automation Dispatch Toggles */}
          <div className="p-2.5 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 uppercase font-mono tracking-wider">
              Automated Dispatches:
            </span>
            <div className="flex items-center space-x-6 text-xs text-[#1A2F46] dark:text-slate-100">
              <label className="flex items-center space-x-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={editForm.auto_email_dispatch}
                  onChange={(e) => setEditForm(prev => ({ ...prev, auto_email_dispatch: e.target.checked }))}
                  className="rounded border-[#C5CBD2] dark:border-slate-800 text-[#E65909] focus:ring-[#E65909]"
                />
                <span>Auto-Email GSTR & Notices</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={editForm.auto_whatsapp_dispatch}
                  onChange={(e) => setEditForm(prev => ({ ...prev, auto_whatsapp_dispatch: e.target.checked }))}
                  className="rounded border-[#C5CBD2] dark:border-slate-800 text-[#E65909] focus:ring-[#E65909]"
                />
                <span>Auto-WhatsApp Reminders</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Compliance Status</label>
              <select
                value={editForm.compliance_status}
                onChange={(e) => setEditForm(prev => ({ ...prev, compliance_status: e.target.value }))}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING_ONBOARDING">PENDING ONBOARDING</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          {/* Optional Portal Credentials Update */}
          <div className="p-3 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-[#1A2F46] dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Statutory Portal Credentials (AES Encrypted at Rest)</span>
              </span>
              <span className="text-[10px] text-[#8B97A3]">Leave password blank to preserve existing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">GST Portal</label>
                <input
                  type="text"
                  value={editForm.gst_username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, gst_username: e.target.value }))}
                  placeholder="GST Username"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={editForm.gst_password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, gst_password: e.target.value }))}
                  placeholder="New password (optional)"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">Income Tax e-Filing</label>
                <input
                  type="text"
                  value={editForm.it_username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, it_username: e.target.value }))}
                  placeholder="PAN / IT User"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={editForm.it_password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, it_password: e.target.value }))}
                  placeholder="New password (optional)"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">TDS Traces</label>
                <input
                  type="text"
                  value={editForm.tds_username}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tds_username: e.target.value }))}
                  placeholder="TDS User ID"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono"
                />
                <input
                  type="password"
                  value={editForm.tds_password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tds_password: e.target.value }))}
                  placeholder="New password (optional)"
                  className="w-full px-2 py-1.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            {editingCustomerId && (
              <button
                type="button"
                onClick={() => handleDeleteCustomer(editingCustomerId, editForm.name)}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded border border-rose-200 font-semibold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <div className="flex space-x-2 ml-auto">
              <button
                type="button"
                onClick={() => setEditCustomerModalOpen(false)}
                className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Master Excel Import & Sync Modal */}
      <Modal
        isOpen={masterImportModalOpen}
        onClose={() => setMasterImportModalOpen(false)}
        title="Import & Sync Excel Masters"
        subtitle="Process GST_Company Master.xlsx, TDS Master.xlsx, and IT Genius credentials"
      >
        <div className="space-y-4 font-sans">
          <div className="p-3 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 text-xs text-[#1A2F46] dark:text-slate-100 space-y-1.5">
            <p className="font-bold">Automated Master Mapping Pipeline:</p>
            <p className="text-[11px] text-[#5D646C] dark:text-slate-400">
              Reads from <code>data/client_masters/</code> or uploaded files, maps GSTIN, PAN, and TAN across records, and securely encrypts all credentials with zero plaintext exposure.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <div className="bg-white dark:bg-[#131C2E] p-2 rounded border border-[#C5CBD2] dark:border-slate-800">
                <span className="font-bold text-[#1A2F46] dark:text-slate-100">GST Master:</span> 33 Companies
              </div>
              <div className="bg-white dark:bg-[#131C2E] p-2 rounded border border-[#C5CBD2] dark:border-slate-800">
                <span className="font-bold text-[#1A2F46] dark:text-slate-100">IT Genius:</span> 2,193 Assessees
              </div>
              <div className="bg-white dark:bg-[#131C2E] p-2 rounded border border-[#C5CBD2] dark:border-slate-800">
                <span className="font-bold text-[#1A2F46] dark:text-slate-100">TDS Master:</span> 22 Accounts
              </div>
            </div>
          </div>

          <div className="border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] p-3 space-y-3">
            <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 block">Optional: Upload Replacement Excel Files</span>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">GST_Company Master.xlsx</label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadGstFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#5D646C] dark:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">IT User id password from Genius.xlsx</label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadItFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#5D646C] dark:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#5D646C] dark:text-slate-400">TDS Master.xlsx</label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadTdsFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#5D646C] dark:text-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMasterImportModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importingMasters}
              onClick={handleTriggerMasterImport}
              className="btn-signal px-4 py-2 text-xs font-semibold rounded-[2px] text-white disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importingMasters ? 'animate-spin' : ''}`} />
              <span>{importingMasters ? 'Processing Masters...' : 'Run Master Import & Sync'}</span>
            </button>
          </div>
        </div>
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
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="SF-SALES-2026-001"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Taxable Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={invTaxable}
                onChange={(e) => setInvTaxable(e.target.value)}
                placeholder="100000.00"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">GST Rate (%)</label>
              <select
                value={invGstRate}
                onChange={(e) => setInvGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
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
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Payment Due Date (Optional)</label>
            <input
              type="date"
              value={invDueDate}
              onChange={(e) => setInvDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
            />
            <p className="text-[10px] text-[#8B97A3] mt-0.5">Defaults to +30 days if left blank</p>
          </div>

          {invTaxable && (
            <div className="p-3 rounded-[2px] bg-[#F6F3EE] dark:bg-[#0B1120] border border-[#C5CBD2] dark:border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{formatINR(parseFloat(invTaxable) || 0)}</span>
              </div>
              <div className="flex justify-between text-[#5D646C] dark:text-slate-400">
                <span>GST Output ({invGstRate}%):</span>
                <span>₹{formatINR(((parseFloat(invTaxable) || 0) * invGstRate) / 100)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#1A2F46] dark:text-slate-100 border-t border-[#C5CBD2] dark:border-slate-800 pt-1">
                <span>Total Receivable Amount:</span>
                <span className="text-[#E65909]">
                  ₹{formatINR(((parseFloat(invTaxable) || 0) * (1 + invGstRate / 100)))}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddInvoiceModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
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
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Receipt / Voucher No</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Receipt Date *</label>
              <input
                type="date"
                required
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Amount Received (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder="100000.00"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Payment Mode</label>
              <select
                value={receiptMode}
                onChange={(e) => setReceiptMode(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
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
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">UTR / Bank Transaction Reference</label>
            <input
              type="text"
              value={receiptUtr}
              onChange={(e) => setReceiptUtr(e.target.value)}
              placeholder="e.g. HDFCR52026111800123"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">
              Apply to Specific Invoice (Optional)
            </label>
            <select
              value={receiptInvoiceId || ''}
              onChange={(e) => setReceiptInvoiceId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            >
              <option value="">Auto-allocate across oldest unpaid invoices (FIFO)</option>
              {invoices.filter(i => i.status !== 'PAID').map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} (Due: ₹{formatINR(i.balance_due || i.total_amount)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddReceiptModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
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
          <div className="border-2 border-dashed border-[#C5CBD2] dark:border-slate-800 rounded-[2px] p-6 text-center hover:border-[#E65909] transition-colors">
            <Upload className="w-8 h-8 text-[#8B97A3] mx-auto mb-2" />
            <p className="text-xs text-[#1A2F46] dark:text-slate-100 font-semibold">Select Excel or CSV Ledger File</p>
            <p className="text-[10px] text-[#8B97A3] mt-1">Expected columns: Invoice No, Amount / Balance</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
              className="mt-3 text-xs text-[#5D646C] dark:text-slate-400"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
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
