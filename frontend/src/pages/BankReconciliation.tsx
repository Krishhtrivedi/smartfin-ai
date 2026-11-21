import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Upload,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { BankAccount, BankTransaction } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
};

export const BankReconciliation: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toleranceDays, setToleranceDays] = useState(4);
  const [brsSummary, setBrsSummary] = useState<any | null>(null);

  // Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Manual Match Modal
  const [manualMatchModalOpen, setManualMatchModalOpen] = useState(false);
  const [targetTxn, setTargetTxn] = useState<BankTransaction | null>(null);
  const [paymentVoucherId, setPaymentVoucherId] = useState('');

  // Add Account Modal
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getBankAccounts();
      setAccounts(data);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountData(selectedAccountId);
    }
  }, [selectedAccountId, statusFilter]);

  const fetchAccountData = async (accountId: number) => {
    try {
      const txns = await api.getBankTransactions(
        accountId,
        statusFilter !== 'ALL' ? statusFilter : undefined
      );
      setTransactions(txns);

      // Auto compute initial BRS
      const recon = await api.runBankReconciliation(accountId, toleranceDays);
      setBrsSummary(recon.summary);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunReconcile = async () => {
    if (!selectedAccountId) return;
    setReconciling(true);
    try {
      const res = await api.runBankReconciliation(selectedAccountId, toleranceDays);
      setBrsSummary(res.summary);
      const txns = await api.getBankTransactions(selectedAccountId);
      setTransactions(txns);
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleUploadStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedAccountId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bank_account_id', selectedAccountId.toString());
      await api.uploadBankStatement(formData);
      setUploadModalOpen(false);
      setSelectedFile(null);
      await fetchAccountData(selectedAccountId);
    } catch (err: any) {
      alert(`Statement upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleManualMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTxn || !paymentVoucherId) return;
    try {
      await api.manualMatchBankTxn(targetTxn.id, parseInt(paymentVoucherId));
      setManualMatchModalOpen(false);
      setTargetTxn(null);
      setPaymentVoucherId('');
      if (selectedAccountId) await fetchAccountData(selectedAccountId);
    } catch (err: any) {
      alert(`Match failed: ${err.message}`);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAccount(true);
    try {
      const bal = parseFloat(openingBalance) || 0.0;
      const newAcc = await api.createBankAccount({
        bank_name: bankName,
        account_number: accountNumber,
        account_type: accountType,
        ifsc_code: ifscCode,
        branch: branchName,
        opening_balance: bal,
        current_balance: bal,
        currency: 'INR'
      });
      setAddAccountModalOpen(false);
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setBranchName('');
      setOpeningBalance('');
      await fetchAccounts();
      setSelectedAccountId(newAcc.id);
    } catch (err: any) {
      alert(`Error creating bank account: ${err.message}`);
    } finally {
      setCreatingAccount(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-brand-600" />
            <span>Bank Reconciliation Statement (BRS) & Feed Automation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-matches cheques issued, deposits credited, bank charges & interest within date tolerance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAddAccountModalOpen(true)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Link Bank Account</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            disabled={!selectedAccountId}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Statement</span>
          </button>

          <button
            onClick={handleRunReconcile}
            disabled={reconciling}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Matching...' : 'Auto-Match Transactions'}</span>
          </button>

          <button
            onClick={() => selectedAccountId && api.exportBRSExcel(selectedAccountId)}
            className="px-3 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export BRS</span>
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center font-mono text-xs">
          <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-navy-950 font-display">No Bank Accounts Linked</p>
          <p className="mt-1 text-slate-500">Liquid balance starts at ₹0. Link your corporate or current bank account to begin automated statement reconciliation.</p>
          <button
            onClick={() => setAddAccountModalOpen(true)}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold inline-flex items-center text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Link First Bank Account
          </button>
        </div>
      ) : (
        <>
          {/* Account Selector & Tolerance Control */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Bank Account:</span>
          <div className="flex items-center space-x-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedAccountId === acc.id
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {acc.bank_name} ({acc.account_number.slice(-4)})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-500 font-medium">Clearance Date Tolerance:</span>
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[2, 4, 7, 10].map((days) => (
              <button
                key={days}
                onClick={() => setToleranceDays(days)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  toleranceDays === days ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                ±{days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bank Reconciliation Statement (BRS) Calculated Card */}
      {brsSummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                Bank Reconciliation Statement (BRS) as on {new Date().toLocaleDateString()}
              </h3>
              <p className="text-[11px] text-slate-500">
                Mathematical proof reconciling bank statement balance with accounting book balance
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {brsSummary.matched_transactions_count} Matched Entries
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium">Balance as per Bank Statement:</span>
              <p className="text-base font-bold text-navy-950 mt-1">₹{formatINR(brsSummary.balance_as_per_bank)}</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 font-medium">(+) Cheques deposited not credited:</span>
              <p className="text-base font-bold text-emerald-700 mt-1">₹{formatINR(brsSummary.cheques_deposited_not_credited)}</p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-rose-800 font-medium">(-) Cheques issued not presented:</span>
              <p className="text-base font-bold text-rose-700 mt-1">₹{formatINR(brsSummary.cheques_issued_not_presented)}</p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-brand-800 font-medium">(=) Calculated Ledger Balance:</span>
              <p className="text-base font-bold text-brand-900 mt-1">₹{formatINR(brsSummary.balance_as_per_books)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Bank Statement Transactions</h4>
            <span className="text-[11px] text-slate-500">({transactions.length} items)</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50 focus:outline-none"
            >
              <option value="ALL">All Entries</option>
              <option value="MATCHED">Matched</option>
              <option value="UNMATCHED">Unmatched / Exception</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Narration / Description</th>
                <th className="py-2.5 px-4">Reference No</th>
                <th className="py-2.5 px-4 text-right">Debit (Withdrawal)</th>
                <th className="py-2.5 px-4 text-right">Credit (Deposit)</th>
                <th className="py-2.5 px-4 text-right">Closing Balance</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-mono text-slate-500">{t.transaction_date}</td>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-slate-800 line-clamp-1">{t.description}</p>
                    <span className="text-[10px] text-slate-400 capitalize">{t.category.toLowerCase().replace('_', ' ')}</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {t.reference_number || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-rose-600">
                    {t.debit_amount > 0 ? `₹${formatINR(t.debit_amount)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                    {t.credit_amount > 0 ? `₹${formatINR(t.credit_amount)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-navy-950">
                    ₹{formatINR(t.balance_after)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <Badge variant={t.reconciliation_status === 'MATCHED' ? 'success' : 'danger'}>
                      {t.reconciliation_status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {t.reconciliation_status === 'UNMATCHED' ? (
                      <button
                        onClick={() => {
                          setTargetTxn(t);
                          setManualMatchModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded border border-brand-200 transition-colors"
                      >
                        Match Voucher
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Matched</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Upload Statement Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Bank Statement File"
        subtitle={`Upload statement for ${selectedAccount?.bank_name} (${selectedAccount?.account_number})`}
      >
        <form onSubmit={handleUploadStatement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Statement File (.xlsx, .csv)</label>
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
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {uploading ? 'Parsing Statement...' : 'Import Statement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Match Modal */}
      <Modal
        isOpen={manualMatchModalOpen}
        onClose={() => setManualMatchModalOpen(false)}
        title="Manual General Ledger Matching"
        subtitle={`Match Txn #${targetTxn?.id}: ${targetTxn?.description}`}
      >
        <form onSubmit={handleManualMatchSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p><span className="text-slate-500">Date:</span> {targetTxn?.transaction_date}</p>
            <p><span className="text-slate-500">Amount:</span> ₹{Math.max(targetTxn?.debit_amount || 0, targetTxn?.credit_amount || 0).toLocaleString('en-IN')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Book Payment Voucher ID (e.g. 1 or 2)</label>
            <input
              type="number"
              required
              value={paymentVoucherId}
              onChange={(e) => setPaymentVoucherId(e.target.value)}
              placeholder="Enter voucher id"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setManualMatchModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg"
            >
              Confirm Match
            </button>
          </div>
        </form>
      </Modal>
      {/* Add Bank Account Modal */}
      <Modal
        isOpen={addAccountModalOpen}
        onClose={() => setAddAccountModalOpen(false)}
        title="Link Bank Account"
        subtitle="Configure a business bank account for feeds & BRS automation"
      >
        <form onSubmit={handleCreateAccount} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank / ICICI Bank / SBI"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50200012345678"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
              <input
                type="text"
                required
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0000060"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="CURRENT">Current Account</option>
                <option value="AUTO_SWEEP">Auto-Sweep Corporate</option>
                <option value="SAVINGS">Savings Account</option>
                <option value="OVERDRAFT">Overdraft / Cash Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Fort, Mumbai"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Opening / Current Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAddAccountModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingAccount}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {creatingAccount ? 'Linking...' : 'Link Bank Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
