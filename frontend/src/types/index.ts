export type UserRole = 'admin' | 'employee' | 'accountant' | 'manager';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
  must_change_password?: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FinancialKPIs {
  total_sales: number;
  total_purchases: number;
  gst_payable: number;
  gst_receivable: number;
  net_gst: number;
  tds_summary: {
    expected: number;
    actual_deducted: number;
    deposited: number;
    shortfall: number;
  };
  total_bank_balance: number;
  vendor_outstanding: number;
  customer_outstanding: number;
  monthly_expenses: number;
  net_profit: number;
  invoices_pending_count: number;
  employee_count?: number;
  active_users_count?: number;
  total_organisational_records?: number;
  completed_activities_count?: number;
}

export interface MonthlyTrend {
  month: string;
  sales: number;
  purchases: number;
  expenses: number;
  profit: number;
}

export interface ExpenseCategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface PendingApproval {
  id: number;
  type: string;
  title: string;
  amount: number;
  submitted_by: string;
  date: string;
}

export interface RecentActivity {
  id: number;
  user_email: string;
  action: string;
  entity_type?: string;
  created_at: string;
}

export interface DashboardData {
  kpis: FinancialKPIs;
  monthly_trends: MonthlyTrend[];
  expense_breakdown: ExpenseCategoryItem[];
  gst_status: {
    fully_matched: number;
    partially_matched: number;
    missing_in_gstr2b: number;
    missing_in_books: number;
    tax_mismatch: number;
    duplicate: number;
  };
  bank_reconciliation_status: {
    matched: number;
    unmatched: number;
    bank_charges: number;
    interest: number;
  };
  vendor_payment_status: {
    paid: number;
    unpaid: number;
    partial: number;
  };
  customer_collection_status: {
    collected: number;
    outstanding: number;
    partial: number;
  };
  pending_approvals: PendingApproval[];
  recent_activities: RecentActivity[];
}

export interface GSTRecord {
  id: number;
  record_type: 'PURCHASE_REGISTER' | 'GSTR2B' | 'GSTR1';
  gstin_supplier: string;
  supplier_name?: string;
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  invoice_value: number;
  itc_availability: string;
  financial_year: string;
  return_period: string;
  match_status: string;
  difference_amount: number;
  remarks?: string;
  verified_at?: string;
}

export interface VendorSummary {
  id: number;
  name: string;
  gstin: string;
  payment_terms_days: number;
  total_purchases: number;
  total_payments: number;
  outstanding_balance: number;
  invoice_count: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: 'PURCHASE' | 'SALES';
  vendor_id?: number;
  customer_id?: number;
  invoice_date: string;
  due_date?: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  tds_deducted: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  notes?: string;
  created_at?: string;
}

export interface CustomerSummary {
  id: number;
  name: string;
  trade_name?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  state_code?: string;
  folder_name?: string;
  compliance_status?: string;
  gst_username?: string;
  it_username?: string;
  tds_username?: string;
  has_gst_password?: boolean;
  has_it_password?: boolean;
  has_tds_password?: boolean;
  credit_limit: number;
  total_sales: number;
  total_received: number;
  outstanding_balance: number;
  invoice_count: number;
  receipt_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TDSRecord {
  id: number;
  record_type: string;
  section: string;
  entity_type: string;
  entity_name: string;
  entity_pan: string;
  invoice_number?: string;
  transaction_date: string;
  base_amount: number;
  applicable_rate: number;
  expected_tds: number;
  actual_deducted: number;
  deduction_date?: string;
  deposit_due_date?: string;
  deposit_date?: string;
  challan_bsr_code?: string;
  challan_no?: string;
  challan_date?: string;
  status: string;
  quarter: string;
  financial_year: string;
  remarks?: string;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  branch?: string;
  opening_balance: number;
  current_balance: number;
  currency: string;
}

export interface BankTransaction {
  id: number;
  bank_account_id: number;
  transaction_date: string;
  value_date?: string;
  description: string;
  reference_number?: string;
  debit_amount: number;
  credit_amount: number;
  balance_after: number;
  category: string;
  reconciliation_status: string;
  matched_payment_id?: number;
}

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  joining_date: string;
  salary: number;
  is_active: boolean;
}

export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  status: string;
  check_in?: string;
  check_out?: string;
  total_hours: number;
  leave_type?: string;
  notes?: string;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  employee_id: number;
  receipt_url?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  assigned_to_employee_id: number;
  priority: string;
  status: string;
  due_date?: string;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  document_category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  access_role: string;
  tags?: string;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    entity: string;
    id: number;
    title: string;
  }>;
  suggested_actions?: string[];
}
