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
  clients_count?: number;
  active_projects_count?: number;
  inquiries_and_leads_count?: number;
  meetings_scheduled_count?: number;
  pending_tasks_count?: number;
  overdue_tasks_count?: number;
  completed_tasks_count?: number;
  business_scans_count?: number;
  notices_summary?: {
    total: number;
    last_7_days: number;
    last_15_days: number;
    last_30_days: number;
    due_within_15_days: number;
    total_demand: number;
  };
  gst_dispatch_summary?: {
    sent: number;
    failed: number;
  };
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
  clients_count?: number;
  active_projects_count?: number;
  inquiries_and_leads_count?: number;
  meetings_scheduled_count?: number;
  pending_tasks_count?: number;
  overdue_tasks_count?: number;
  completed_tasks_count?: number;
  business_scans_count?: number;
  upcoming_meetings?: Array<{
    id: number;
    title: string;
    client_name: string;
    meeting_type: string;
    scheduled_time: string;
    status: string;
    agenda?: string;
    has_ai_summary?: boolean;
  }>;
  active_projects?: Array<{
    id: number;
    name: string;
    code?: string;
    client_name: string;
    status: string;
    priority?: string;
    completion_percentage: number;
    due_date?: string;
  }>;
  pipeline_counts?: Record<string, number>;
  notices_summary?: {
    total: number;
    last_7_days: number;
    last_15_days: number;
    last_30_days: number;
    due_within_15_days: number;
    total_demand: number;
  };
  gst_dispatch_summary?: {
    sent: number;
    failed: number;
  };
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
  aliases?: string;
  contact_person?: string;
  custom_folder_override?: string;
  auto_email_dispatch?: boolean;
  auto_whatsapp_dispatch?: boolean;
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

// ----------------- CRM Leads & Pipeline -----------------
export type LeadStage = 'NEW' | 'CONTACTED' | 'MEETING_SCHEDULED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';

export interface Lead {
  id: number;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  pan?: string;
  gstin?: string;
  stage: LeadStage;
  service_interest: string;
  expected_value: number;
  probability: number;
  source: string;
  next_follow_up_date?: string;
  notes?: string;
  customer_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  activity_type: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'MEETING' | 'PROPOSAL' | 'NOTE';
  title: string;
  description?: string;
  performed_by_email?: string;
  created_at: string;
}

export interface PipelineSummary {
  stages: Record<LeadStage, { count: number; total_value: number }>;
  total_leads: number;
  active_leads: number;
  converted_leads: number;
  conversion_rate_pct: number;
  total_pipeline_value: number;
}

// ----------------- Projects & Meetings -----------------
export interface ProjectItem {
  id: number;
  name: string;
  code: string;
  client_name?: string;
  customer_id?: number;
  manager_name?: string;
  manager_employee_id?: number;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  start_date?: string;
  due_date?: string;
  budget: number;
  spent_amount: number;
  completion_percentage: number;
  task_count: number;
  completed_tasks: number;
  description?: string;
  created_at: string;
}

export interface MeetingItem {
  id: number;
  title: string;
  meeting_type: 'CLIENT_CONSULTATION' | 'TAX_PLANNING' | 'AUDIT_REVIEW' | 'INTERNAL_SYNC' | 'BOARD_REVIEW';
  client_or_lead_name: string;
  customer_id?: number;
  lead_id?: number;
  project_id?: number;
  scheduled_time: string;
  duration_minutes: number;
  location_or_link?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  agenda?: string;
  discussion_notes?: string;
  ai_summary?: string;
  action_items?: string[];
  created_at: string;
}

// ----------------- Business Scan -----------------
export interface BusinessScanItem {
  id: number;
  scan_number: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  industry: string;
  annual_turnover: string;
  shareable_token: string;
  shareable_link: string;
  status: 'DRAFT' | 'SHARED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED';
  overall_health_score: number;
  category_scores: {
    finance: number;
    hr: number;
    sales_marketing: number;
    operations: number;
    strategy: number;
    management: number;
    technology: number;
  };
  answers_completed: number;
  total_questions: number;
  documents_attached: number;
  reviewed_at?: string;
  created_at: string;
}

export interface BusinessScanQuestionAnswer {
  id: number;
  key: string;
  question: string;
  answer?: string;
  score: number;
  notes?: string;
  attached_document?: string;
  missing_document: boolean;
}

// ----------------- Document Analyzer -----------------
export interface DocAnalysisSummary {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  doc_category: string;
  summary?: string;
  status: string;
  figures_count: number;
  missing_items_count: number;
  created_at: string;
}

export interface DocAnalysisDetail extends DocAnalysisSummary {
  extracted_figures: Array<{ label: string; value: string; page_or_ref?: string }>;
  key_findings: string[];
  missing_items: Array<{ item: string; risk_level: string; recommendation?: string }>;
  raw_text?: string;
  chat_history?: Array<{ role: 'user' | 'assistant'; message: string; timestamp: string }>;
}

// ----------------- System Settings -----------------
export interface SystemSettingsData {
  smtp: {
    host: string;
    port: string;
    user: string;
    from_name: string;
    has_password: boolean;
    password_masked: string;
  };
  whatsapp: {
    phone_number_id: string;
    team_pmsc_group_id: string;
    has_token: boolean;
    token_masked: string;
    bridge_url: string;
  };
  ai: {
    provider: string;
    model_name: string;
    has_api_key: boolean;
    api_key_masked: string;
  };
  storage: {
    desktop_root: string;
    needs_review_folder: string;
  };
  security: {
    credential_encryption: string;
    audit_trail_immutable: boolean;
    session_timeout_minutes: number;
  };
}

