"""
FolderResolver: Smart Fuzzy / Keyword / GSTIN Folder Routing
============================================================
Automatically routes downloaded tax files, GST returns, and received client
documents to the correct local desktop folder or flags ambiguous items for review.

Routing Hierarchy:
1. Exact GSTIN Match: 15-digit alphanumeric GSTIN matches client in DB or folder name.
2. Custom Folder Override: If client has `custom_folder_override` set, honor it.
3. Exact Client Name Match: Normalized company name matches folder/client.
4. Aliases & Keyword Match: Client aliases (e.g., "Swastik Insecticides, Swastik")
   or partial keywords match.
5. Token / Fuzzy Match: High-confidence token intersection (> 0.70 score).
6. Ambiguous / Unmatched: If multiple weak matches or zero matches, routes safely
   to ~/Desktop/Needs_Review_Staging/<category>/ with full metadata logged.

Never Overwrites:
Files are saved using collision-safe versioning (e.g. "GSTR1_24AA... (2).pdf")
so existing staff work is never overwritten.
"""

import os
import re
import difflib
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.all_models import Customer


def normalize_string(s: str) -> str:
    """Normalize company name or keyword for robust matching."""
    if not s:
        return ""
    # Remove punctuation, uppercase, strip extra spaces, remove legal suffixes
    cleaned = re.sub(r'[\.,/\\:;*?"<>|()\[\]{}_-]', ' ', s.upper())
    cleaned = re.sub(r'\b(PVT|LTD|PRIVATE|LIMITED|LLP|INC|CORP|CO)\b', '', cleaned)
    return " ".join(cleaned.split())


def safe_folder_name(name: str) -> str:
    """Convert string to safe directory/file name."""
    cleaned = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', name).strip(" .")
    return cleaned or "Uncategorized_Client"


def free_path(target_path: Path) -> Path:
    """Collision-safe path resolution. Appends (2), (3), etc. if file exists."""
    if not target_path.exists():
        return target_path
    
    parent = target_path.parent
    stem = target_path.stem
    suffix = target_path.suffix
    
    counter = 2
    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


class FolderResolver:
    """
    Intelligent directory router for client files.
    """

    def __init__(self, root_desktop_dir: Optional[str] = None):
        self.root_dir = Path(os.path.expanduser(root_desktop_dir or os.getenv("CLIENT_ROOT_DIR", "~/Desktop")))
        self.staging_dir = self.root_dir / "Needs_Review_Staging"

    def match_client(
        self,
        db: Session,
        gstin: Optional[str] = None,
        company_name: Optional[str] = None,
        pan: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> Tuple[Optional[Customer], str, float]:
        """
        Match input against Customer database using GSTIN, PAN, Name, Aliases and Fuzzy logic.
        Returns: (Customer, match_method, confidence_score 0.0 - 1.0)
        """
        # 1. Exact GSTIN match
        if gstin and len(gstin.strip()) == 15:
            clean_gstin = gstin.strip().upper()
            c = db.query(Customer).filter(Customer.gstin == clean_gstin).first()
            if c:
                return c, "EXACT_GSTIN", 1.0

        # 2. Exact PAN match
        if pan and len(pan.strip()) == 10:
            clean_pan = pan.strip().upper()
            c = db.query(Customer).filter(Customer.pan == clean_pan).first()
            if c:
                return c, "EXACT_PAN", 0.98

        all_customers = db.query(Customer).all()
        if not all_customers:
            return None, "NO_CUSTOMERS_IN_DB", 0.0

        query_name = normalize_string(company_name or keyword or "")
        if not query_name:
            return None, "EMPTY_QUERY", 0.0

        # 3. Exact normalized name match
        for c in all_customers:
            c_norm = normalize_string(c.name or "")
            t_norm = normalize_string(c.trade_name or "")
            if query_name == c_norm or (t_norm and query_name == t_norm):
                return c, "EXACT_NAME", 0.95

        # 4. Aliases & Keywords Match (e.g. 'Swastik' matching 'Swastik Insecticides')
        best_alias_match = None
        for c in all_customers:
            if c.aliases:
                aliases_list = [normalize_string(a) for a in c.aliases.split(",") if a.strip()]
                for alias in aliases_list:
                    if alias and (query_name == alias or query_name.startswith(alias) or alias in query_name):
                        return c, f"ALIAS_MATCH ('{alias}')", 0.92

        # 5. Token Intersection & Fuzzy Match
        query_tokens = set(query_name.split())
        candidates = []
        for c in all_customers:
            c_name = normalize_string(c.name or "")
            c_tokens = set(c_name.split())
            if not c_tokens:
                continue

            intersection = query_tokens.intersection(c_tokens)
            if intersection:
                jaccard = len(intersection) / len(query_tokens.union(c_tokens))
                seq_ratio = difflib.SequenceMatcher(None, query_name, c_name).ratio()
                score = max(jaccard, seq_ratio)
                if score >= 0.65:
                    candidates.append((c, score))

        if candidates:
            candidates.sort(key=lambda x: x[1], reverse=True)
            top_match, top_score = candidates[0]
            # Check for ambiguity (if top 2 candidates have very close scores)
            if len(candidates) > 1 and (candidates[0][1] - candidates[1][1]) < 0.08 and candidates[0][1] < 0.85:
                # Ambiguous: flag for review
                return None, f"AMBIGUOUS_MATCH ({candidates[0][0].name} vs {candidates[1][0].name})", candidates[0][1]
            return top_match, "FUZZY_KEYWORD_MATCH", top_score

        return None, "NO_CONFIDENT_MATCH", 0.0

    def resolve_destination(
        self,
        db: Session,
        category: str, # "GST" | "IncomeTax" | "TDS_GST_Reports" | "BusinessScan" | "General"
        sub_period_or_fy: str = "2026-27",
        file_name: str = "document.pdf",
        gstin: Optional[str] = None,
        company_name: Optional[str] = None,
        pan: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves the exact non-overwriting destination path on disk for a file.
        """
        matched_client, method, confidence = self.match_client(
            db, gstin=gstin, company_name=company_name, pan=pan, keyword=keyword
        )

        clean_file = safe_folder_name(file_name)

        if matched_client and confidence >= 0.70:
            # High confidence routing
            if matched_client.custom_folder_override:
                client_folder = Path(os.path.expanduser(matched_client.custom_folder_override))
            else:
                folder_stem = matched_client.folder_name or matched_client.name or "Client"
                client_folder = self.root_dir / safe_folder_name(folder_stem)

            # Sub-category folder
            if category == "GST":
                target_dir = client_folder / "GST" / safe_folder_name(sub_period_or_fy)
            elif category == "IncomeTax":
                target_dir = client_folder / "IncomeTax" / "Notices"
            elif category == "TDS_GST_Reports":
                target_dir = client_folder / "TDS_GST_Reports" / safe_folder_name(sub_period_or_fy)
            elif category == "BusinessScan":
                target_dir = client_folder / "BusinessScan"
            else:
                target_dir = client_folder / safe_folder_name(category)

            target_dir.mkdir(parents=True, exist_ok=True)
            final_file_path = free_path(target_dir / clean_file)

            return {
                "status": "ROUTED",
                "matched_client_id": matched_client.id,
                "client_name": matched_client.name,
                "gstin": matched_client.gstin,
                "match_method": method,
                "confidence": confidence,
                "target_directory": str(target_dir),
                "resolved_file_path": str(final_file_path),
                "is_needs_review": False
            }

        else:
            # Ambiguous or Unmatched: route to Needs_Review_Staging
            staging_target = self.staging_dir / safe_folder_name(category) / safe_folder_name(sub_period_or_fy)
            staging_target.mkdir(parents=True, exist_ok=True)
            final_file_path = free_path(staging_target / clean_file)

            return {
                "status": "NEEDS_REVIEW",
                "matched_client_id": None,
                "client_name": company_name or keyword or "Unidentified",
                "gstin": gstin,
                "match_method": method,
                "confidence": confidence,
                "target_directory": str(staging_target),
                "resolved_file_path": str(final_file_path),
                "is_needs_review": True,
                "review_reason": f"Routing confidence {confidence:.2f} ({method}). Staged in Needs_Review_Staging."
            }
