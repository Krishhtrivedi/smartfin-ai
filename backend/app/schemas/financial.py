from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class VendorBase(BaseModel):
    name: str
    gstin: str
    pan: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    payment_terms_days: int = 30
    outstanding_balance: float = 0.0

class VendorCreate(VendorBase):
    pass

class VendorOut(VendorBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerBase(BaseModel):
    name: str
    gstin: Optional[str] = None
    pan: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    credit_limit: float = 100000.0
    outstanding_balance: float = 0.0

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class BankAccountBase(BaseModel):
    bank_name: str
    account_number: str
    account_type: str = "Current"
    ifsc_code: str
    branch: Optional[str] = None
    opening_balance: float = 0.0
    current_balance: float = 0.0
    currency: str = "INR"

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountOut(BankAccountBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    invoice_number: str
    invoice_type: str # PURCHASE or SALES
    vendor_id: Optional[int] = None
    customer_id: Optional[int] = None
    invoice_date: date
    due_date: Optional[date] = None
    taxable_amount: float
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0
    total_tax: float = 0.0
    total_amount: float
    tds_deducted: float = 0.0
    paid_amount: float = 0.0
    balance_due: float = 0.0
    status: str = "UNPAID"
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceOut(InvoiceBase):
    id: int
    created_at: datetime
    vendor: Optional[VendorOut] = None
    customer: Optional[CustomerOut] = None
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    payment_number: str
    payment_type: str # PAYMENT or RECEIPT
    entity_type: str # VENDOR or CUSTOMER
    entity_id: int
    entity_name: str
    invoice_id: Optional[int] = None
    payment_date: date
    amount: float
    payment_mode: str = "NEFT"
    reference_number: Optional[str] = None
    bank_account_id: int
    status: str = "COMPLETED"

class PaymentCreate(PaymentBase):
    pass

class PaymentOut(PaymentBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class BankTransactionBase(BaseModel):
    bank_account_id: int
    transaction_date: date
    value_date: Optional[date] = None
    description: str
    reference_number: Optional[str] = None
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    balance_after: float = 0.0
    category: str = "UNCATEGORIZED"
    reconciliation_status: str = "UNMATCHED"
    matched_payment_id: Optional[int] = None

class BankTransactionCreate(BankTransactionBase):
    pass

class BankTransactionOut(BankTransactionBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class GSTRecordBase(BaseModel):
    record_type: str # PURCHASE_REGISTER, GSTR2B, GSTR1
    gstin_supplier: str
    supplier_name: Optional[str] = None
    invoice_number: str
    invoice_date: date
    invoice_type: str = "Regular"
    taxable_value: float = 0.0
    cgst: float = 0.0
    sgst: float = 0.0
    igst: float = 0.0
    total_tax: float = 0.0
    invoice_value: float = 0.0
    itc_availability: str = "YES"
    financial_year: str = "2026-27"
    return_period: str = "112026"
    match_status: str = "UNPROCESSED"
    difference_amount: float = 0.0
    remarks: Optional[str] = None

class GSTRecordCreate(GSTRecordBase):
    pass

class GSTRecordOut(GSTRecordBase):
    id: int
    verified_by_user_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class TDSRecordBase(BaseModel):
    record_type: str = "TDS"
    section: str # 194C, 194J, 194I, 194Q, 206C_TCS
    entity_type: str = "VENDOR"
    entity_name: str
    entity_pan: str
    invoice_number: Optional[str] = None
    transaction_date: date
    base_amount: float
    applicable_rate: float
    expected_tds: float
    actual_deducted: float
    deduction_date: Optional[date] = None
    deposit_due_date: Optional[date] = None
    deposit_date: Optional[date] = None
    challan_bsr_code: Optional[str] = None
    challan_no: Optional[str] = None
    challan_date: Optional[date] = None
    status: str = "VERIFIED"
    quarter: str = "Q3"
    financial_year: str = "2026-27"
    remarks: Optional[str] = None

class TDSRecordCreate(TDSRecordBase):
    pass

class TDSRecordOut(TDSRecordBase):
    id: int
    verified_by_user_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ReconciliationJobOut(BaseModel):
    id: int
    job_type: str
    title: str
    status: str
    total_records_a: int
    total_records_b: int
    matched_count: int
    mismatched_count: int
    missing_count: int
    discrepancy_total: float
    created_by: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    summary_json: Optional[str] = None
    class Config:
        from_attributes = True
