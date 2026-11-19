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
