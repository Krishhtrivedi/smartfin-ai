from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.all_models import (
    Invoice, Purchase, Sale, Payment, Expense, BankAccount,
    GSTRecord, TDSRecord, Vendor, Customer, MISReport
)
import json
import io
import pandas as pd
import openpyxl

class MISReportGenerator:
    def __init__(self, db: Session):
        self.db = db

    def generate_financial_mis(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Calculates Sales, Purchases, Expenses, Profit & Loss, and Cash Flow strictly from DB records.
        """
        # 1. Sales
        sales_invoices = self.db.query(Invoice).filter(
            Invoice.invoice_type == "SALES",
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).all()

        total_sales_taxable = sum(i.taxable_amount for i in sales_invoices)
        total_sales_tax = sum(i.total_tax for i in sales_invoices)
        total_sales_gross = sum(i.total_amount for i in sales_invoices)

        # 2. Purchases
        purchase_invoices = self.db.query(Invoice).filter(
            Invoice.invoice_type == "PURCHASE",
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).all()

        total_purchases_taxable = sum(i.taxable_amount for i in purchase_invoices)
        total_purchases_tax = sum(i.total_tax for i in purchase_invoices)
        total_purchases_gross = sum(i.total_amount for i in purchase_invoices)

        # 3. Expenses
        expenses = self.db.query(Expense).filter(
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
            Expense.status.in_(["APPROVED", "REIMBURSED", "PENDING"])
        ).all()

        total_expenses = sum(e.amount for e in expenses)

        expense_by_category = {}
        for e in expenses:
            expense_by_category[e.category] = expense_by_category.get(e.category, 0.0) + e.amount

        # 4. Profit & Loss
        gross_profit = total_sales_taxable - total_purchases_taxable
        net_profit = gross_profit - total_expenses
        profit_margin_pct = round((net_profit / total_sales_taxable * 100), 2) if total_sales_taxable > 0 else 0.0

        # 5. Cash Flow
        customer_receipts = self.db.query(Payment).filter(
            Payment.payment_type == "RECEIPT",
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()
        total_cash_inflow = sum(r.amount for r in customer_receipts)

        vendor_payments = self.db.query(Payment).filter(
            Payment.payment_type == "PAYMENT",
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()
        total_vendor_outflow = sum(p.amount for p in vendor_payments)

        net_cash_flow = total_cash_inflow - (total_vendor_outflow + total_expenses)

        # 6. GST Summary
        gst_records = self.db.query(GSTRecord).filter(
            GSTRecord.invoice_date >= start_date,
            GSTRecord.invoice_date <= end_date
        ).all()

        gst_matched_count = sum(1 for g in gst_records if g.match_status == "FULLY_MATCHED")
        gst_missing_2b = sum(1 for g in gst_records if g.match_status == "MISSING_IN_GSTR2B")
        gst_missing_books = sum(1 for g in gst_records if g.match_status == "MISSING_IN_BOOKS")
        total_itc_claimed = sum(g.total_tax for g in gst_records if g.record_type == "PURCHASE_REGISTER" and g.itc_availability == "YES")

        # 7. TDS Summary
        tds_records = self.db.query(TDSRecord).filter(
            TDSRecord.transaction_date >= start_date,
            TDSRecord.transaction_date <= end_date
        ).all()
        total_tds_expected = sum(t.expected_tds for t in tds_records)
        total_tds_deducted = sum(t.actual_deducted for t in tds_records)
        tds_shortfall = max(0.0, total_tds_expected - total_tds_deducted)

        report_data = {
            "period": {
                "start_date": str(start_date),
                "end_date": str(end_date)
            },
            "pnl": {
                "sales_revenue": round(total_sales_taxable, 2),
                "cost_of_purchases": round(total_purchases_taxable, 2),
                "gross_profit": round(gross_profit, 2),
                "operating_expenses": round(total_expenses, 2),
                "net_profit": round(net_profit, 2),
                "profit_margin_pct": profit_margin_pct
            },
            "cash_flow": {
                "cash_inflows_from_customers": round(total_cash_inflow, 2),
                "cash_outflows_to_vendors": round(total_vendor_outflow, 2),
                "cash_outflows_for_expenses": round(total_expenses, 2),
                "net_cash_flow": round(net_cash_flow, 2)
            },
            "sales_summary": {
                "invoices_count": len(sales_invoices),
                "taxable_value": round(total_sales_taxable, 2),
                "output_tax": round(total_sales_tax, 2),
                "total_sales_gross": round(total_sales_gross, 2)
            },
            "purchase_summary": {
                "invoices_count": len(purchase_invoices),
                "taxable_value": round(total_purchases_taxable, 2),
                "input_tax": round(total_purchases_tax, 2),
                "total_purchases_gross": round(total_purchases_gross, 2)
            },
            "expense_analysis": {
                "total": round(total_expenses, 2),
                "by_category": {k: round(v, 2) for k, v in expense_by_category.items()}
            },
            "gst_compliance": {
                "total_records": len(gst_records),
                "matched_count": gst_matched_count,
                "missing_in_gstr2b": gst_missing_2b,
                "missing_in_books": gst_missing_books,
                "total_itc_claimed": round(total_itc_claimed, 2)
            },
            "tds_compliance": {
                "total_records": len(tds_records),
                "expected_tds": round(total_tds_expected, 2),
                "actual_deducted": round(total_tds_deducted, 2),
                "shortfall": round(tds_shortfall, 2)
            }
        }

        return report_data

    def generate_excel_workbook(self, report_data: Dict[str, Any]) -> bytes:
        """
        Builds a multi-sheet formatted Excel MIS Report using OpenPyXL.
        """
        output = io.BytesIO()
        wb = openpyxl.Workbook()
        
        from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        sub_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
        title_font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        bold_font = Font(name="Calibri", size=11, bold=True)
        regular_font = Font(name="Calibri", size=11)

        # Sheet 1: Executive Summary & PnL
        ws_pnl = wb.active
        ws_pnl.title = "P&L and Cash Flow"
        ws_pnl.views.sheetView[0].showGridLines = True

        ws_pnl["A1"] = "SmartFin AI – Financial MIS & Performance Report"
        ws_pnl["A1"].font = title_font
        ws_pnl["A2"] = f"Period: {report_data['period']['start_date']} to {report_data['period']['end_date']}"
        ws_pnl["A2"].font = regular_font

        # P&L Table
        ws_pnl["A4"] = "Particulars"
        ws_pnl["B4"] = "Amount (₹)"
        ws_pnl["A4"].fill = header_fill
        ws_pnl["A4"].font = header_font
        ws_pnl["B4"].fill = header_fill
        ws_pnl["B4"].font = header_font

        pnl = report_data["pnl"]
        rows_pnl = [
            ("Gross Sales Revenue", pnl["sales_revenue"]),
            ("Less: Cost of Purchases", pnl["cost_of_purchases"]),
            ("Gross Profit", pnl["gross_profit"]),
            ("Less: Operating & Office Expenses", pnl["operating_expenses"]),
            ("Net Profit / (Loss)", pnl["net_profit"]),
            ("Net Profit Margin (%)", f"{pnl['profit_margin_pct']}%")
        ]

        for idx, (label, val) in enumerate(rows_pnl, 5):
            ws_pnl[f"A{idx}"] = label
            ws_pnl[f"B{idx}"] = val
            if "Profit" in label or "Margin" in label:
                ws_pnl[f"A{idx}"].font = bold_font
                ws_pnl[f"B{idx}"].font = bold_font

        # Cash Flow Table
        ws_pnl["A13"] = "Cash Flow Statement"
        ws_pnl["B13"] = "Amount (₹)"
        ws_pnl["A13"].fill = header_fill
        ws_pnl["A13"].font = header_font
        ws_pnl["B13"].fill = header_fill
        ws_pnl["B13"].font = header_font

        cf = report_data["cash_flow"]
        rows_cf = [
            ("Inflows: Collections from Customers", cf["cash_inflows_from_customers"]),
            ("Outflows: Payments to Vendors", cf["cash_outflows_to_vendors"]),
            ("Outflows: Operating Expenses", cf["cash_outflows_for_expenses"]),
            ("Net Cash Flow for Period", cf["net_cash_flow"])
        ]
        for idx, (label, val) in enumerate(rows_cf, 14):
            ws_pnl[f"A{idx}"] = label
            ws_pnl[f"B{idx}"] = val
            if "Net Cash" in label:
                ws_pnl[f"A{idx}"].font = bold_font
                ws_pnl[f"B{idx}"].font = bold_font

        ws_pnl.column_dimensions["A"].width = 38
        ws_pnl.column_dimensions["B"].width = 24

        # Sheet 2: Expense Analysis
        ws_exp = wb.create_sheet(title="Expenses Breakdown")
        ws_exp["A1"] = "Expense Breakdown by Category"
        ws_exp["A1"].font = title_font
        ws_exp["A3"] = "Category"
        ws_exp["B3"] = "Amount (₹)"
        ws_exp["A3"].fill = header_fill
        ws_exp["A3"].font = header_font
        ws_exp["B3"].fill = header_fill
        ws_exp["B3"].font = header_font

        exp_data = report_data["expense_analysis"]["by_category"]
        curr_row = 4
        for cat, amt in exp_data.items():
            ws_exp[f"A{curr_row}"] = cat.replace("_", " ").title()
            ws_exp[f"B{curr_row}"] = amt
            curr_row += 1

        ws_exp[f"A{curr_row}"] = "Total Expenses"
        ws_exp[f"B{curr_row}"] = report_data["expense_analysis"]["total"]
        ws_exp[f"A{curr_row}"].font = bold_font
        ws_exp[f"B{curr_row}"].font = bold_font

        ws_exp.column_dimensions["A"].width = 30
        ws_exp.column_dimensions["B"].width = 20

        # Sheet 3: Tax & Reconciliation Health
        ws_tax = wb.create_sheet(title="Tax & Reconciliation")
        ws_tax["A1"] = "Statutory Tax & Reconciliation Summary"
        ws_tax["A1"].font = title_font
        
        ws_tax["A3"] = "GST Parameter"
        ws_tax["B3"] = "Metric"
        ws_tax["A3"].fill = header_fill
        ws_tax["A3"].font = header_font
        ws_tax["B3"].fill = header_fill
        ws_tax["B3"].font = header_font

        gst = report_data["gst_compliance"]
        rows_gst = [
            ("Total Invoices Analyzed", gst["total_records"]),
            ("Fully Matched Invoices", gst["matched_count"]),
            ("Invoices Missing in GSTR-2B (ITC At Risk)", gst["missing_in_gstr2b"]),
            ("Invoices Missing in Books (Unclaimed ITC)", gst["missing_in_books"]),
            ("Total Eligible ITC Claimed", gst["total_itc_claimed"])
        ]
        for idx, (label, val) in enumerate(rows_gst, 4):
            ws_tax[f"A{idx}"] = label
            ws_tax[f"B{idx}"] = val

        ws_tax["A11"] = "TDS Compliance Parameter"
        ws_tax["B11"] = "Metric"
        ws_tax["A11"].fill = header_fill
        ws_tax["A11"].font = header_font
        ws_tax["B11"].fill = header_fill
        ws_tax["B11"].font = header_font

        tds = report_data["tds_compliance"]
        rows_tds = [
            ("Total TDS Transactions", tds["total_records"]),
            ("Expected TDS Amount", tds["expected_tds"]),
            ("Actual Deducted Amount", tds["actual_deducted"]),
            ("Short Deduction Shortfall", tds["shortfall"])
        ]
        for idx, (label, val) in enumerate(rows_tds, 12):
            ws_tax[f"A{idx}"] = label
            ws_tax[f"B{idx}"] = val

        ws_tax.column_dimensions["A"].width = 42
        ws_tax.column_dimensions["B"].width = 22

        wb.save(output)
        output.seek(0)
        return output.getvalue()
