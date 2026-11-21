const BASE_URL = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('smartfin_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type for FormData (browser will set multipart boundary automatically)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (endpoint.includes('/auth/login')) {
      let errorDetail = 'Invalid email or password.';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }
    localStorage.removeItem('smartfin_token');
    localStorage.removeItem('smartfin_user');
    throw new Error('Session expired or unauthorized');
  }

  if (!response.ok) {
    let errorDetail = 'Network request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = await response.text() || errorDetail;
    }
    throw new Error(errorDetail);
  }

  // Check if response is blob
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('spreadsheetml') || contentType.includes('octet-stream') || contentType.includes('pdf'))) {
    return (await response.blob()) as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => request<any>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (email: string, token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, new_password }),
    }),

  // Dashboard
  getDashboardSummary: () => request<any>('/dashboard/summary'),
  getEmployeeDashboard: () => request<any>('/dashboard/employee'),

  // GST
  getGSTRecords: (params?: { record_type?: string; match_status?: string; return_period?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/gst/records${query ? `?${query}` : ''}`);
  },
  runGSTReconciliation: (return_period?: string, financial_year: string = '2026-27') =>
    request<any>('/gst/reconcile', {
      method: 'POST',
      body: JSON.stringify({ return_period, financial_year }),
    }),
  uploadGSTFile: (formData: FormData) =>
    request<any>('/gst/upload', {
      method: 'POST',
      body: formData,
    }),
  verifyGSTRecord: (recordId: number, action: string, notes?: string) =>
    request<any>(`/gst/verify/${recordId}?action=${action}${notes ? `&notes=${encodeURIComponent(notes)}` : ''}`, {
      method: 'POST',
    }),
  exportGSTExcel: async (return_period?: string) => {
    const blob = await request<Blob>(`/gst/export${return_period ? `?return_period=${return_period}` : ''}`);
    downloadBlob(blob, `GST_Reconciliation_${return_period || 'All'}.xlsx`);
  },

  // Vendors & Customers
  getVendors: () => request<any[]>('/vendors/list'),
  createVendor: (data: any) => request<any>('/vendors/create', { method: 'POST', body: JSON.stringify(data) }),
  reconcileVendor: (vendorId: number) => request<any>(`/vendors/${vendorId}/reconcile`),
  getVendorInvoices: (vendorId: number) => request<any[]>(`/vendors/${vendorId}/invoices`),
  uploadVendorStatement: (vendorId: number, formData: FormData) =>
    request<any>(`/vendors/${vendorId}/upload-statement`, { method: 'POST', body: formData }),
  createVendorInvoice: (vendorId: number, data: any) =>
    request<any>(`/vendors/${vendorId}/invoices`, { method: 'POST', body: JSON.stringify(data) }),

  getCustomers: () => request<any[]>('/customers/list'),
  createCustomer: (data: any) => request<any>('/customers/create', { method: 'POST', body: JSON.stringify(data) }),
  reconcileCustomer: (customerId: number) => request<any>(`/customers/${customerId}/reconcile`),
  getCustomerInvoices: (customerId: number) => request<any[]>(`/customers/${customerId}/invoices`),
  createCustomerInvoice: (customerId: number, data: any) =>
    request<any>(`/customers/${customerId}/invoices`, { method: 'POST', body: JSON.stringify(data) }),
  getCustomerReceipts: (customerId: number) => request<any[]>(`/customers/${customerId}/receipts`),
  createCustomerReceipt: (customerId: number, data: any) =>
    request<any>(`/customers/${customerId}/receipts`, { method: 'POST', body: JSON.stringify(data) }),
  uploadCustomerStatement: (customerId: number, formData: FormData) =>
    request<any>(`/customers/${customerId}/upload-statement`, { method: 'POST', body: formData }),

  // TDS / TCS
  getTDSRules: () => request<any>('/tds/rules'),
  getTDSRecords: (params?: { section?: string; status?: string; quarter?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/tds/records${query ? `?${query}` : ''}`);
  },
  runTDSReconciliation: (quarter?: string) =>
    request<any>(`/tds/reconcile${quarter ? `?quarter=${quarter}` : ''}`, { method: 'POST' }),
  updateTDSChallan: (recordId: number, bsrCode: string, challanNo: string, challanDate: string) =>
    request<any>(`/tds/challan/update?record_id=${recordId}&challan_bsr_code=${bsrCode}&challan_no=${challanNo}&challan_date=${challanDate}`, {
      method: 'POST',
    }),
  exportTDS26Q: async (quarter: string = 'Q3') => {
    const blob = await request<Blob>(`/tds/export-26q?quarter=${quarter}`);
    downloadBlob(blob, `Form_26Q_${quarter}.xlsx`);
  },

  // Bank Reconciliation
  getBankAccounts: () => request<any[]>('/bank/accounts'),
  createBankAccount: (data: any) =>
    request<any>('/bank/accounts', { method: 'POST', body: JSON.stringify(data) }),
  getBankTransactions: (accountId: number, status?: string) =>
    request<any[]>(`/bank/transactions?bank_account_id=${accountId}${status ? `&status=${status}` : ''}`),
  runBankReconciliation: (accountId: number, toleranceDays: number = 4) =>
    request<any>(`/bank/reconcile?bank_account_id=${accountId}&date_tolerance_days=${toleranceDays}`, {
      method: 'POST',
    }),
  uploadBankStatement: (formData: FormData) =>
    request<any>('/bank/upload-statement', {
      method: 'POST',
      body: formData,
    }),
  manualMatchBankTxn: (transactionId: number, paymentId: number) =>
    request<any>(`/bank/match-manual?transaction_id=${transactionId}&payment_id=${paymentId}`, {
      method: 'POST',
    }),
  exportBRSExcel: async (accountId: number) => {
    const blob = await request<Blob>(`/bank/export-brs?bank_account_id=${accountId}`);
    downloadBlob(blob, `BRS_Statement_Account_${accountId}.xlsx`);
  },

  // Office Management
  getEmployees: () => request<any[]>('/office/employees'),
  createEmployee: (data: any) =>
    request<any>('/office/employees', { method: 'POST', body: JSON.stringify(data) }),

  getAttendance: (employeeId?: number) =>
    request<any[]>(`/office/attendance${employeeId ? `?employee_id=${employeeId}` : ''}`),
  recordAttendance: (data: any) =>
    request<any>('/office/attendance', { method: 'POST', body: JSON.stringify(data) }),

  getExpenses: (status?: string) =>
    request<any[]>(`/office/expenses${status ? `?status=${status}` : ''}`),
  createExpense: (data: any) =>
    request<any>('/office/expenses', { method: 'POST', body: JSON.stringify(data) }),
  approveExpense: (expenseId: number, action: string, remarks?: string) =>
    request<any>(`/office/expenses/${expenseId}/approve?action=${action}${remarks ? `&remarks=${encodeURIComponent(remarks)}` : ''}`, {
      method: 'POST',
    }),

  getTasks: (status?: string) =>
    request<any[]>(`/office/tasks${status ? `?status=${status}` : ''}`),
  createTask: (data: any) =>
    request<any>('/office/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTaskStatus: (taskId: number, status: string) =>
    request<any>(`/office/tasks/${taskId}/status?status=${status}`, { method: 'PATCH' }),

  getDocuments: (category?: string, search?: string) => {
    const query = new URLSearchParams({ ...(category ? { category } : {}), ...(search ? { search } : {}) }).toString();
    return request<any[]>(`/office/documents${query ? `?${query}` : ''}`);
  },
  uploadDocument: (formData: FormData) =>
    request<any>('/office/documents/upload', { method: 'POST', body: formData }),

  // Excel Automation
  inspectExcel: (formData: FormData) =>
    request<any>('/excel/inspect', { method: 'POST', body: formData }),
  processExcel: (formData: FormData) =>
    request<any>('/excel/process', { method: 'POST', body: formData }),
  compareExcelSheets: (formData: FormData) =>
    request<any>('/excel/compare', { method: 'POST', body: formData }),
  getExcelTemplates: () => request<any[]>('/excel/templates'),
  createExcelTemplate: (data: any) =>
    request<any>('/excel/templates', { method: 'POST', body: JSON.stringify(data) }),
  downloadCleanedExcel: async (formData: FormData, filename: string = 'Cleaned_Data.xlsx') => {
    const blob = await request<Blob>('/excel/download-cleaned', { method: 'POST', body: formData });
    downloadBlob(blob, filename);
  },

  // MIS Management
  getMISReport: (periodType: string = 'MONTHLY', startDate?: string, endDate?: string) => {
    let url = `/mis/report?period_type=${periodType}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return request<any>(url);
  },
  exportMISExcel: async (startDate?: string, endDate?: string) => {
    let url = '/mis/export-excel';
    if (startDate && endDate) url += `?start_date=${startDate}&end_date=${endDate}`;
    const blob = await request<Blob>(url);
    downloadBlob(blob, `SmartFin_MIS_Report.xlsx`);
  },

  // AI Assistant
  askAI: (prompt: string, contextType: string = 'GENERAL') =>
    request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, context_type: contextType }),
    }),

  // Audit Logs & Notifications
  getAuditLogs: (limit: number = 50) => request<any[]>(`/audit/logs?limit=${limit}`),
  getNotifications: () => request<any[]>('/audit/notifications'),
  markNotificationRead: (id: number) => request<any>(`/audit/notifications/${id}/read`, { method: 'POST' }),

  // 1. Statutory Notice Management (Birju Sir)
  getNotices: () => request<any[]>('/compliance/notices'),
  createNotice: (data: any) => request<any>('/compliance/notices', { method: 'POST', body: JSON.stringify(data) }),
  updateNoticeStatus: (id: number, data: any) => request<any>(`/compliance/notices/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // 2. Auto-Send GSTR Return PDFs
  dispatchGstrPdfs: (files: string[]) => request<any>('/compliance/gstr-dispatch/scan-and-send', { method: 'POST', body: JSON.stringify({ files }) }),
  getGstrDispatchLogs: () => request<any[]>('/compliance/gstr-dispatch/logs'),

  // 3. GSTR-1 & 3B Auto-Filing AI Agent
  prepareGstAgentFiling: (data: any) => request<any>('/compliance/gst-agent/prepare', { method: 'POST', body: JSON.stringify(data) }),
  approveGstAgentFiling: (reviewId: number, action: string = 'APPROVE') =>
    request<any>(`/compliance/gst-agent/approve-and-file/${reviewId}`, { method: 'POST', body: JSON.stringify({ action }) }),

  // 4. Income Tax Document Collection Bot
  getItrBotCases: () => request<any[]>('/compliance/itr-bot/cases'),
  createItrBotCase: (data: any) => request<any>('/compliance/itr-bot/create-case', { method: 'POST', body: JSON.stringify(data) }),
  updateItrBotItem: (caseId: number, itemId: number, status: string, fileName?: string) =>
    request<any>(`/compliance/itr-bot/${caseId}/update-item`, { method: 'POST', body: JSON.stringify({ item_id: itemId, status, file_name: fileName }) }),
  sendItrBotReminder: (caseId: number) => request<any>(`/compliance/itr-bot/${caseId}/send-reminder`, { method: 'POST' }),

  // 5. Last 3 Years ITR Archive & Auto-Sender
  organizeAndSendItrArchive: (data: any) => request<any>('/compliance/itr-archive/organize-and-send', { method: 'POST', body: JSON.stringify(data) }),
  getItrArchivePackages: () => request<any[]>('/compliance/itr-archive/packages'),

  // 6. Capital Gains & Tax Payable
  calculateCapitalGains: (data: any) => request<any>('/compliance/capital-gains/calculate', { method: 'POST', body: JSON.stringify(data) }),
  saveCapitalGains: (data: any) => request<any>('/compliance/capital-gains/save', { method: 'POST', body: JSON.stringify(data) }),
  getCapitalGains: () => request<any[]>('/compliance/capital-gains/records'),

  // 7. Daily Office WhatsApp Summary (Team PMSC) & Real Baileys / Gateway
  getWhatsAppStatus: () => request<any>('/compliance/whatsapp/status'),
  startWhatsAppQRSession: () => request<any>('/compliance/whatsapp/session/start', { method: 'POST' }),
  requestWhatsAppPairingCode: (phoneNumber: string) =>
    request<any>('/compliance/whatsapp/session/pairing-code', { method: 'POST', body: JSON.stringify({ phone_number: phoneNumber }) }),
  logoutWhatsAppSession: () => request<any>('/compliance/whatsapp/session/logout', { method: 'POST' }),
  getWhatsAppGroups: () => request<any>('/compliance/whatsapp/groups'),
  selectWhatsAppGroup: (data: { group_id: string; group_name: string }) =>
    request<any>('/compliance/whatsapp/select-group', { method: 'POST', body: JSON.stringify(data) }),
  updateWhatsAppSchedule: (data: any) => request<any>('/compliance/whatsapp/schedule', { method: 'POST', body: JSON.stringify(data) }),
  getWhatsAppUnreadMessages: () => request<any>('/compliance/whatsapp/unread-messages'),
  markWhatsAppMessagesRead: (data: { message_ids?: number[]; mark_all?: boolean }) =>
    request<any>('/compliance/whatsapp/messages/mark-read', { method: 'POST', body: JSON.stringify(data) }),
  getOfficeSummaryHistory: () => request<any[]>('/compliance/office-summary/history'),
  generateOfficeSummary: (data?: any) => request<any>('/compliance/office-summary/generate', { method: 'POST', body: JSON.stringify(data || {}) }),
  postOfficeSummaryToPmsc: (summaryId: number) => request<any>(`/compliance/office-summary/${summaryId}/post-to-pmsc`, { method: 'POST' }),

  // 8. AI Usage Study & Optimisation Analytics
  getAiUsageAnalytics: () => request<any>('/compliance/ai-usage/analytics'),

  // 9. Skill-Set Tools: Consulting Report & Salary Calculation
  generateConsultingReport: (data: any) => request<any>('/compliance/tools/generate-consulting-report', { method: 'POST', body: JSON.stringify(data) }),
  calculateSalary: (data: any) => request<any>('/compliance/tools/calculate-salary', { method: 'POST', body: JSON.stringify(data) }),

  // 10. Incubator & Standalone Online Products
  querySOPAssistant: (query: string, category?: string) =>
    request<any>('/chatbot/sop-query', { method: 'POST', body: JSON.stringify({ query, category: category || 'ALL' }) }),
  submitPublicClientIntake: (data: any) =>
    request<any>('/public/client-intake', { method: 'POST', body: JSON.stringify(data) }),
  getPublicInquiries: () => request<any[]>('/public/client-intake/inquiries'),
  evaluateFamilyAI: (data: any) =>
    request<any>('/portals/family-ai/evaluate', { method: 'POST', body: JSON.stringify(data) }),
  generateCareerRoadmap: (data: any) =>
    request<any>('/portals/career-ai/roadmap', { method: 'POST', body: JSON.stringify(data) }),
  draftCollectionSequence: (data: any) =>
    request<any>('/portals/collection-ai/draft', { method: 'POST', body: JSON.stringify(data) }),
};

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
