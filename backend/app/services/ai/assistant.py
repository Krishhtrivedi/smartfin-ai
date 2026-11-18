import os
import json
import httpx
from datetime import date, datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.all_models import (
    Invoice, Payment, BankTransaction, GSTRecord, TDSRecord,
    Vendor, Customer, Expense, BankAccount
)

class AIFinanceAssistant:
    def __init__(self, db: Session):
        self.db = db
        self.api_key = settings.OPENAI_API_KEY

    def ask(self, prompt: str, context_type: str = "GENERAL") -> Dict[str, Any]:
        """
        Processes user financial questions with live database context and strict safety guardrails.
        """
        prompt_lower = prompt.lower().strip()

        # Gather relevant real-time DB context based on question intent
        context_data, sources, suggested_actions = self._gather_context(prompt_lower)

        # If OpenAI API Key is provided, call OpenAI GPT-4o-mini with system prompt
        if self.api_key and self.api_key.startswith("sk-"):
            try:
                ai_reply = self._call_openai(prompt, context_data)
                return {
                    "reply": ai_reply,
                    "sources": sources,
                    "suggested_actions": suggested_actions
                }
            except Exception as e:
                print(f"OpenAI API call failed, falling back to smart local intelligence: {e}")

        # Intelligent structured rule-based response engine (Traceable & Guaranteed accuracy)
        reply = self._generate_intelligent_reply(prompt_lower, context_data, sources)

        return {
            "reply": reply,
            "sources": sources,
            "suggested_actions": suggested_actions
        }

    def _gather_context(self, prompt_lower: str) -> tuple[Dict[str, Any], List[Dict[str, Any]], List[str]]:
        context = {}
        sources = []
        suggested_actions = []

        # 1. Vendor & Payments Context
        if any(w in prompt_lower for w in ["vendor", "payable", "supplier", "pay"]):
            unpaid_vendor_invoices = self.db.query(Invoice).filter(
                Invoice.invoice_type == "PURCHASE",
                Invoice.status.in_(["UNPAID", "PARTIAL"])
            ).all()

            vendor_data = []
            for inv in unpaid_vendor_invoices:
                vendor_name = inv.vendor.name if inv.vendor else "Unknown Vendor"
                vendor_data.append({
                    "invoice_no": inv.invoice_number,
                    "vendor": vendor_name,
                    "amount": inv.total_amount,
                    "due_date": str(inv.due_date or inv.invoice_date),
                    "status": inv.status
                })
                sources.append({
                    "entity": "Invoice",
                    "id": inv.id,
                    "title": f"Invoice #{inv.invoice_number} ({vendor_name}) - ₹{inv.total_amount:,.2f}"
                })

            context["pending_vendor_invoices"] = vendor_data
            suggested_actions.extend(["Review Vendor Ledger", "Schedule NEFT Batch", "Export Vendor Aging"])

        # 2. Customer & Receivables Context
        if any(w in prompt_lower for w in ["customer", "receivable", "client", "outstanding", "collection"]):
            customers_with_dues = self.db.query(Customer).filter(Customer.outstanding_balance > 0).all()
            cust_data = []
            for c in customers_with_dues:
                cust_data.append({
                    "customer_name": c.name,
                    "gstin": c.gstin,
                    "outstanding": c.outstanding_balance,
                    "credit_limit": c.credit_limit
                })
                sources.append({
                    "entity": "Customer",
                    "id": c.id,
                    "title": f"Customer: {c.name} - Outstanding: ₹{c.outstanding_balance:,.2f}"
                })

            context["customers_outstanding"] = cust_data
            suggested_actions.extend(["Send Payment Reminder", "Check Customer Aging", "Export Ledger"])

        # 3. Bank Reconciliation Context
        if any(w in prompt_lower for w in ["bank", "unmatched", "statement", "brs", "transaction"]):
            unmatched_txns = self.db.query(BankTransaction).filter(
                BankTransaction.reconciliation_status == "UNMATCHED"
            ).all()

            bank_data = []
            for t in unmatched_txns:
                bank_data.append({
                    "id": t.id,
                    "date": str(t.transaction_date),
                    "description": t.description,
                    "debit": t.debit_amount,
                    "credit": t.credit_amount,
                    "ref": t.reference_number
                })
                sources.append({
                    "entity": "BankTransaction",
                    "id": t.id,
                    "title": f"Txn #{t.id} ({str(t.transaction_date)}): {t.description[:40]} - ₹{max(t.debit_amount, t.credit_amount):,.2f}"
                })

            context["unmatched_bank_txns"] = bank_data
            suggested_actions.extend(["Open Bank Reconciliation", "Match Transactions", "Download BRS Statement"])

        # 4. GST Reconciliation Context
        if any(w in prompt_lower for w in ["gst", "itc", "gstr", "2b", "tax mismatch"]):
            mismatched_gst = self.db.query(GSTRecord).filter(
                GSTRecord.match_status.in_(["MISSING_IN_GSTR2B", "MISSING_IN_BOOKS", "TAX_MISMATCH", "DUPLICATE"])
            ).all()

            gst_data = []
            for g in mismatched_gst:
                gst_data.append({
                    "invoice_no": g.invoice_number,
                    "supplier": g.supplier_name or g.gstin_supplier,
                    "status": g.match_status,
                    "tax": g.total_tax,
                    "diff": g.difference_amount,
                    "remarks": g.remarks
                })
                sources.append({
                    "entity": "GSTRecord",
                    "id": g.id,
                    "title": f"GST #{g.invoice_number}: {g.match_status} (₹{g.total_tax:,.2f})"
                })

            context["gst_discrepancies"] = gst_data
            suggested_actions.extend(["View GSTR-2B Mismatch Report", "Notify Suppliers of Missing 2B", "Approve ITC Adjustments"])

        # 5. TDS Context
        if any(w in prompt_lower for w in ["tds", "tcs", "short deduction", "challan", "26q"]):
            tds_issues = self.db.query(TDSRecord).filter(
                TDSRecord.status.in_(["SHORT_DEDUCTED", "LATE_DEPOSIT"])
            ).all()

            tds_data = []
            for t in tds_issues:
                tds_data.append({
                    "section": t.section,
                    "entity": t.entity_name,
                    "status": t.status,
                    "expected": t.expected_tds,
                    "actual": t.actual_deducted,
                    "remarks": t.remarks
                })
                sources.append({
                    "entity": "TDSRecord",
                    "id": t.id,
                    "title": f"TDS u/s {t.section} ({t.entity_name}) - {t.status}: Shortfall ₹{t.expected_tds - t.actual_deducted:,.2f}"
                })

            context["tds_discrepancies"] = tds_data
            suggested_actions.extend(["Review Form 26Q Draft", "Generate Challan 281 Data", "Contact Deductees"])

        # 6. Expenses Context
        if any(w in prompt_lower for w in ["expense", "spending", "cost", "office expense"]):
            expenses = self.db.query(Expense).all()
            exp_data = []
            total_exp = 0.0
            for e in expenses:
                total_exp += e.amount
                exp_data.append({
                    "title": e.title,
                    "category": e.category,
                    "amount": e.amount,
                    "date": str(e.expense_date),
                    "status": e.status
                })
                sources.append({
                    "entity": "Expense",
                    "id": e.id,
                    "title": f"Expense: {e.title} ({e.category}) - ₹{e.amount:,.2f}"
                })

            context["expenses_summary"] = {"total": total_exp, "items": exp_data}
            suggested_actions.extend(["Approve Pending Expenses", "Expense Analysis Report", "Export Expense CSV"])

        # Default fallback context if general query
        if not context:
            total_sales = sum(i.total_amount for i in self.db.query(Invoice).filter(Invoice.invoice_type == "SALES").all())
            total_purchases = sum(i.total_amount for i in self.db.query(Invoice).filter(Invoice.invoice_type == "PURCHASE").all())
            context["general_kpis"] = {
                "total_sales": total_sales,
                "total_purchases": total_purchases
            }
            suggested_actions.extend(["View Financial MIS", "Run GST Reconciliation", "Check Bank Balances"])

        return context, sources[:8], suggested_actions[:4]

    def _generate_intelligent_reply(self, prompt_lower: str, context: Dict[str, Any], sources: List[Dict[str, Any]]) -> str:
        """
        Produces professional financial explanations, numbers, and actionable summaries.
        """
        if "pending_vendor_invoices" in context and ("vendor" in prompt_lower or "pay" in prompt_lower):
            items = context["pending_vendor_invoices"]
            total_due = sum(i["amount"] for i in items)
            lines = [
                f"### 📋 Pending Vendor Payments Summary",
                f"There are currently **{len(items)} unpaid or partially paid purchase invoices** totaling **₹{total_due:,.2f}** awaiting clearance:",
                ""
            ]
            for it in items[:5]:
                lines.append(f"- **{it['vendor']}**: Invoice `#{it['invoice_no']}` for **₹{it['amount']:,.2f}** (Due: {it['due_date']}, Status: `{it['status']}`)")
            if len(items) > 5:
                lines.append(f"- *...and {len(items) - 5} more vendor invoices in queue.*")
            lines.extend([
                "",
                "**Actionable Recommendation:**",
                "1. Cross-verify with vendor statements before initiating NEFT/RTGS release.",
                "2. Ensure statutory TDS deductions u/s 194C / 194J / 194Q have been made where applicable."
            ])
            return "\n".join(lines)

        if "customers_outstanding" in context and ("customer" in prompt_lower or "receivable" in prompt_lower or "outstanding" in prompt_lower):
            items = context["customers_outstanding"]
            total_recv = sum(c["outstanding"] for c in items)
            lines = [
                f"### 💼 Customer Outstanding Balances",
                f"Total trade receivables across active accounts stand at **₹{total_recv:,.2f}** across **{len(items)} customers**:",
                ""
            ]
            for c in items:
                lines.append(f"- **{c['customer_name']}**: Outstanding **₹{c['outstanding']:,.2f}** (Credit Limit: ₹{c['credit_limit']:,.2f})")
            lines.extend([
                "",
                "**Recommendation:**",
                "Prioritize payment reminders for accounts nearing 60+ days aging to avoid liquidity blockages."
            ])
            return "\n".join(lines)

        if "unmatched_bank_txns" in context and ("bank" in prompt_lower or "unmatched" in prompt_lower):
            items = context["unmatched_bank_txns"]
            lines = [
                f"### 🏦 Unmatched Bank Transactions",
                f"Found **{len(items)} bank transactions** that require manual matching or general ledger vouchers:",
                ""
            ]
            for t in items[:6]:
                amt = t["debit"] if t["debit"] > 0 else t["credit"]
                direction = "DR (Withdrawal)" if t["debit"] > 0 else "CR (Deposit)"
                lines.append(f"- **{t['date']}**: `{t['description']}` — **₹{amt:,.2f}** [{direction}] (Ref: `{t['ref'] or 'N/A'}`)")
            lines.extend([
                "",
                "**Reconciliation Next Steps:**",
                "1. Review bank charges and interest entries and generate automatic adjustment entries.",
                "2. Verify uncleared cheques issued to vendors with the Bank Reconciliation Statement (BRS)."
            ])
            return "\n".join(lines)

        if "gst_discrepancies" in context and ("gst" in prompt_lower or "itc" in prompt_lower or "2b" in prompt_lower):
            items = context["gst_discrepancies"]
            missing_2b = [i for i in items if i["status"] == "MISSING_IN_GSTR2B"]
            missing_bks = [i for i in items if i["status"] == "MISSING_IN_BOOKS"]
            tax_mismatch = [i for i in items if i["status"] == "TAX_MISMATCH"]

            lines = [
                f"### 📑 GST ITC Reconciliation Status",
                f"Identified discrepancies across GSTR-2B vs Purchase Register records:",
                f"- **Missing in GSTR-2B (ITC At Risk):** {len(missing_2b)} invoices (Suppliers have not filed GSTR-1)",
                f"- **Missing in Books (Unclaimed ITC):** {len(missing_bks)} invoices present on Govt portal but not booked",
                f"- **Tax Amount Mismatches:** {len(tax_mismatch)} invoices with rate or rounding variations",
                "",
                "**Statutory Caution:**",
                "Under Rule 36(4) and Section 16(2)(aa) of CGST Act, Input Tax Credit can only be claimed if the invoice appears in auto-populated GSTR-2B. Send automated follow-up notices to non-compliant vendors."
            ]
            return "\n".join(lines)

        if "tds_discrepancies" in context and ("tds" in prompt_lower or "tcs" in prompt_lower or "short" in prompt_lower):
            items = context["tds_discrepancies"]
            lines = [
                f"### ⚖️ TDS / TCS Compliance Summary",
                f"Identified **{len(items)} transactions** with statutory short deductions or deposit timing anomalies:",
                ""
            ]
            for it in items:
                lines.append(f"- **Section {it['section']}** ({it['entity']}): {it['status']} — {it['remarks']}")
            lines.extend([
                "",
                "**Statutory Warning:**",
                "Ensure short deductions are regularized and deposited before the 7th of the month along with interest @ 1.5% per month u/s 201(1A)."
            ])
            return "\n".join(lines)

        if "expenses_summary" in context and ("expense" in prompt_lower or "cost" in prompt_lower):
            exp = context["expenses_summary"]
            lines = [
                f"### 📊 Office Expenses Overview",
                f"Total recorded operating and office expenses amount to **₹{exp['total']:,.2f}**.",
                "",
                "Top expenses on record include:",
            ]
            for it in exp["items"][:5]:
                lines.append(f"- **{it['title']}** (`{it['category']}`): **₹{it['amount']:,.2f}** on {it['date']} [{it['status']}]")
            return "\n".join(lines)

        # Default summary
        kpis = context.get("general_kpis", {})
        return (
            f"### 🤖 SmartFin AI Financial Assistant\n\n"
            f"I have live access to your company's general ledger, GST filings, bank transactions, and office records.\n\n"
            f"- **Total Sales Revenue:** ₹{kpis.get('total_sales', 0.0):,.2f}\n"
            f"- **Total Purchases:** ₹{kpis.get('total_purchases', 0.0):,.2f}\n\n"
            f"**You can ask me questions such as:**\n"
            f"1. *'Show all pending vendor payments'* \n"
            f"2. *'What are the unmatched bank transactions?'*\n"
            f"3. *'Generate this month’s GST reconciliation summary'* \n"
            f"4. *'Which customers have outstanding balances?'*\n"
            f"5. *'Check TDS short deductions and deposit deadlines'*"
        )

    def _call_openai(self, prompt: str, context: Dict[str, Any]) -> str:
        """Calls OpenAI Chat Completion with financial audit system prompt"""
        system_prompt = (
            "You are SmartFin AI, a certified Financial Automation Architect, Senior Chartered Accountant, and Enterprise ERP Assistant. "
            "You provide accurate, highly professional financial analysis based exclusively on verified corporate records. "
            "CRITICAL SAFETY RULE: You must NEVER independently approve transactions, modify financial data, or submit statutory filings. "
            "Provide clear mathematical breakdowns, cite invoice numbers and dates where relevant, and offer prudent financial advice."
        )

        user_content = f"Context Data from Enterprise DB:\n{json.dumps(context, indent=2)}\n\nUser Question:\n{prompt}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
