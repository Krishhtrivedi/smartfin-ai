import os
import re
import openpyxl
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.all_models import Customer, User
from app.core.security import encrypt_credential
from app.core.dependencies import log_audit_event


def sanitize_folder_name(name: str) -> str:
    if not name:
        return "Unnamed_Client"
    cleaned = re.sub(r'[\\/*?:"<>|]', '', str(name)).strip()
    return cleaned if cleaned else "Unnamed_Client"


class ClientMasterImporter:
    """
    Service to import and link client master records from:
    1. GST_Company Master.xlsx (GSTIN, Company Name, Tradename, GSTUserName, GSTPassword)
    2. IT User id password from Genius.xlsx (PAN, Name, Password)
    3. TDS Master.xlsx (TAN/PAN, Company Name, User ID, Password)
    """

    def __init__(self, db: Session):
        self.db = db

    def import_all_masters(
        self,
        gst_path: Optional[str] = None,
        it_path: Optional[str] = None,
        tds_path: Optional[str] = None,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        # Search candidate directories for client masters
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
        candidate_dirs = [
            os.path.join(project_root, "data", "client_masters"),
            os.path.join(project_root, "backend", "data", "client_masters"),
            os.path.join(project_root, "uploads", "client_masters"),
            "/Users/krishtrivedi/Documents/PROJECTS/SmartFin AI/data/client_masters"
        ]
        
        found_dir = None
        for cd in candidate_dirs:
            if os.path.exists(cd):
                found_dir = cd
                break
        
        if not found_dir:
            found_dir = os.path.join(project_root, "data", "client_masters")

        gst_path = gst_path or os.path.join(found_dir, "GST_Company Master.xlsx")
        it_path = it_path or os.path.join(found_dir, "IT User id password from Genius.xlsx")
        tds_path = tds_path or os.path.join(found_dir, "TDS Master.xlsx")

        stats = {
            "gst_processed": 0,
            "it_processed": 0,
            "tds_processed": 0,
            "clients_created": 0,
            "clients_updated": 0,
            "errors": []
        }

        # -------------------------------------------------------------
        # STEP 1: IMPORT GST MASTER (Primary for GSTIN, Tradename)
        # -------------------------------------------------------------
        if os.path.exists(gst_path):
            try:
                wb_gst = openpyxl.load_workbook(gst_path, data_only=True)
                sheet_gst = wb_gst.active
                for r in range(2, sheet_gst.max_row + 1):
                    raw_gstin = sheet_gst.cell(r, 1).value
                    raw_comp = sheet_gst.cell(r, 2).value
                    raw_trade = sheet_gst.cell(r, 3).value
                    raw_user = sheet_gst.cell(r, 4).value
                    raw_pwd = sheet_gst.cell(r, 5).value

                    if not raw_gstin or not str(raw_gstin).strip():
                        continue

                    gstin_clean = str(raw_gstin).strip().upper()
                    pan = gstin_clean[2:12] if len(gstin_clean) >= 12 else None
                    name = str(raw_comp or raw_trade or gstin_clean).strip()
                    trade_name = str(raw_trade).strip() if raw_trade else None
                    gst_username = str(raw_user).strip() if raw_user else None
                    gst_pwd_enc = encrypt_credential(str(raw_pwd).strip()) if raw_pwd else None
                    state_code = gstin_clean[:2] if len(gstin_clean) >= 2 else None

                    # Check if customer already exists by GSTIN or PAN
                    customer = None
                    if gstin_clean:
                        customer = self.db.query(Customer).filter(Customer.gstin == gstin_clean).first()
                    if not customer and pan:
                        customer = self.db.query(Customer).filter(Customer.pan == pan).first()

                    if customer:
                        # Update existing
                        if name and (not customer.name or len(name) > len(customer.name)):
                            customer.name = name
                        if trade_name:
                            customer.trade_name = trade_name
                        if not customer.gstin:
                            customer.gstin = gstin_clean
                        if not customer.pan and pan:
                            customer.pan = pan
                        if not customer.state_code and state_code:
                            customer.state_code = state_code
                        if gst_username:
                            customer.gst_username = gst_username
                        if gst_pwd_enc:
                            customer.gst_password_enc = gst_pwd_enc
                        if not customer.folder_name:
                            customer.folder_name = sanitize_folder_name(name)
                        customer.updated_at = datetime.utcnow()
                        stats["clients_updated"] += 1
                    else:
                        # Create new customer
                        new_cust = Customer(
                            name=name,
                            trade_name=trade_name,
                            gstin=gstin_clean,
                            pan=pan,
                            state_code=state_code,
                            gst_username=gst_username,
                            gst_password_enc=gst_pwd_enc,
                            folder_name=sanitize_folder_name(name),
                            compliance_status="ACTIVE",
                            credit_limit=100000.0,
                            outstanding_balance=0.0
                        )
                        self.db.add(new_cust)
                        stats["clients_created"] += 1

                    stats["gst_processed"] += 1
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                stats["errors"].append(f"GST Master error: {str(e)}")
        else:
            stats["errors"].append(f"GST Master file not found at {gst_path}")

        # -------------------------------------------------------------
        # STEP 2: IMPORT IT MASTER (Income Tax PAN & Genius Credentials)
        # -------------------------------------------------------------
        if os.path.exists(it_path):
            try:
                wb_it = openpyxl.load_workbook(it_path, data_only=True)
                sheet_it = wb_it.active
                # Row 1-2 headers, row 3: PAN, Name, Password; data starts row 4
                for r in range(4, sheet_it.max_row + 1):
                    raw_pan = sheet_it.cell(r, 1).value
                    raw_name = sheet_it.cell(r, 2).value
                    raw_pwd = sheet_it.cell(r, 3).value

                    if not raw_pan and not raw_name:
                        continue

                    pan_clean = str(raw_pan).strip().upper() if raw_pan else None
                    name_clean = str(raw_name).strip() if raw_name else (pan_clean or "IT Client")
                    it_pwd_enc = encrypt_credential(str(raw_pwd).strip()) if raw_pwd and str(raw_pwd).strip() else None

                    customer = None
                    if pan_clean:
                        customer = self.db.query(Customer).filter(Customer.pan == pan_clean).first()
                    if not customer and name_clean:
                        customer = self.db.query(Customer).filter(Customer.name.ilike(name_clean)).first()

                    if customer:
                        # Link IT credentials to existing customer
                        if not customer.pan and pan_clean:
                            customer.pan = pan_clean
                        if pan_clean:
                            customer.it_username = pan_clean
                        if it_pwd_enc:
                            customer.it_password_enc = it_pwd_enc
                        if not customer.folder_name:
                            customer.folder_name = sanitize_folder_name(customer.name or name_clean)
                        customer.updated_at = datetime.utcnow()
                        stats["clients_updated"] += 1
                    else:
                        # Create new IT client
                        new_cust = Customer(
                            name=name_clean,
                            pan=pan_clean,
                            it_username=pan_clean,
                            it_password_enc=it_pwd_enc,
                            folder_name=sanitize_folder_name(name_clean),
                            compliance_status="ACTIVE",
                            credit_limit=100000.0,
                            outstanding_balance=0.0
                        )
                        self.db.add(new_cust)
                        stats["clients_created"] += 1

                    stats["it_processed"] += 1
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                stats["errors"].append(f"IT Master error: {str(e)}")
        else:
            stats["errors"].append(f"IT Master file not found at {it_path}")

        # -------------------------------------------------------------
        # STEP 3: IMPORT TDS MASTER (TAN, User ID, Password)
        # -------------------------------------------------------------
        if os.path.exists(tds_path):
            try:
                wb_tds = openpyxl.load_workbook(tds_path, data_only=True)
                sheet_tds = wb_tds.active
                for r in range(2, sheet_tds.max_row + 1):
                    raw_tan = sheet_tds.cell(r, 1).value
                    raw_comp = sheet_tds.cell(r, 2).value
                    raw_uid = sheet_tds.cell(r, 3).value
                    raw_pwd = sheet_tds.cell(r, 4).value

                    if not raw_tan and not raw_uid:
                        continue

                    tan_clean = str(raw_tan).strip().upper() if raw_tan else None
                    tds_uid = str(raw_uid).strip() if raw_uid else None
                    tds_pwd_enc = encrypt_credential(str(raw_pwd).strip()) if raw_pwd else None
                    name_clean = str(raw_comp).strip() if raw_comp else None

                    # Try to link by TAN, or by name / User ID match
                    customer = None
                    if tan_clean:
                        customer = self.db.query(Customer).filter(Customer.tan == tan_clean).first()
                    
                    if not customer and name_clean:
                        customer = self.db.query(Customer).filter(Customer.name.ilike(name_clean)).first()

                    # Heuristic / Fuzzy match by User ID in customer name (e.g. HPARCHITECT in HIREN PATEL ARCHITECT)
                    if not customer and tds_uid:
                        uid_norm = re.sub(r'[^A-Z0-9]', '', tds_uid.upper())
                        # Look for candidates
                        candidates = self.db.query(Customer).filter(
                            (Customer.name.ilike(f"%{tds_uid}%")) |
                            (Customer.trade_name.ilike(f"%{tds_uid}%")) |
                            (Customer.gst_username.ilike(f"%{tds_uid}%"))
                        ).all()
                        if candidates:
                            customer = candidates[0]
                        else:
                            # Advanced acronym & substring matching
                            all_custs = self.db.query(Customer).all()
                            for c in all_custs:
                                c_norm = re.sub(r'[^A-Z0-9]', '', (c.name or '').upper())
                                c_trade_norm = re.sub(r'[^A-Z0-9]', '', (c.trade_name or '').upper())
                                # Check if uid is substring of name
                                if uid_norm in c_norm or (c_norm and c_norm in uid_norm):
                                    customer = c
                                    break
                                # Check HPARCHITECT -> HIREN PATEL ARCHITECT (H + P + ARCHITECT)
                                if uid_norm.startswith("HP") and ("HIRENPATEL" in c_norm or "HPA" in c_norm or "HPA" in c_trade_norm):
                                    if "ARCHITECT" in uid_norm and "ARCHITECT" in c_norm:
                                        customer = c
                                        break
                                    if "DESIGN" in uid_norm and "DESIGN" in c_norm:
                                        customer = c
                                        break
                                    if "CONS" in uid_norm and "CONST" in c_norm:
                                        customer = c
                                        break
                                # AARVEENG -> AAR VEE ENGINEERS
                                if "AARVEE" in uid_norm and "AARVEE" in c_norm:
                                    customer = c
                                    break
                                # ETHEREUM -> ETHEREUM INFRACON LLP
                                if "ETHEREUM" in uid_norm and "ETHEREUM" in c_norm:
                                    customer = c
                                    break
                                # TEXCOAT -> TEXCOAT COLORS LLP
                                if "TEXCOAT" in uid_norm and "TEXCOAT" in c_norm:
                                    customer = c
                                    break

                    if customer:
                        if tan_clean and not customer.tan:
                            customer.tan = tan_clean
                        if tds_uid:
                            customer.tds_username = tds_uid
                        if tds_pwd_enc:
                            customer.tds_password_enc = tds_pwd_enc
                        customer.updated_at = datetime.utcnow()
                        stats["clients_updated"] += 1
                    else:
                        # New standalone TDS client
                        display_name = name_clean or tds_uid or tan_clean or "TDS Deductor"
                        new_cust = Customer(
                            name=display_name,
                            tan=tan_clean,
                            tds_username=tds_uid,
                            tds_password_enc=tds_pwd_enc,
                            folder_name=sanitize_folder_name(display_name),
                            compliance_status="ACTIVE",
                            credit_limit=100000.0,
                            outstanding_balance=0.0
                        )
                        self.db.add(new_cust)
                        stats["clients_created"] += 1

                    stats["tds_processed"] += 1
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                stats["errors"].append(f"TDS Master error: {str(e)}")
        else:
            stats["errors"].append(f"TDS Master file not found at {tds_path}")

        # Final recount
        total_in_db = self.db.query(Customer).count()
        stats["total_clients_in_db"] = total_in_db

        # Log to Audit Trail
        if current_user:
            log_audit_event(
                self.db,
                current_user,
                "IMPORT_CLIENT_MASTERS",
                "Customer",
                f"Count: {total_in_db}",
                {
                    "gst_processed": stats["gst_processed"],
                    "it_processed": stats["it_processed"],
                    "tds_processed": stats["tds_processed"],
                    "clients_created": stats["clients_created"],
                    "clients_updated": stats["clients_updated"],
                    "errors_count": len(stats["errors"])
                }
            )

        return stats
