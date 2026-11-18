import pandas as pd
import numpy as np
import openpyxl
import io
import re
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

class ExcelAutomationEngine:
    @staticmethod
    def read_file(file_content: bytes, filename: str, sheet_name: str = None) -> Tuple[pd.DataFrame, List[str]]:
        """
        Reads CSV or Excel file, returns DataFrame and sheet names list.
        """
        filename_lower = filename.lower()
        if filename_lower.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_content))
            return df, ["Sheet1"]
        elif filename_lower.endswith((".xlsx", ".xls")):
            excel_file = pd.ExcelFile(io.BytesIO(file_content))
            sheet_names = excel_file.sheet_names
            target_sheet = sheet_name if sheet_name in sheet_names else sheet_names[0]
            df = pd.read_excel(excel_file, sheet_name=target_sheet)
            return df, sheet_names
        else:
            raise ValueError("Unsupported file format. Please upload .xlsx, .xls, or .csv")

    @staticmethod
    def inspect_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Detects schema, column data types, missing counts, duplicate rows, sample values.
        """
        total_rows = len(df)
        total_cols = len(df.columns)
        
        column_details = []
        for col in df.columns:
            non_null_count = int(df[col].count())
            null_count = total_rows - non_null_count
            inferred_type = str(df[col].dtype)
            
            # Detect dates or currency if stored as string/object
            sample_val = str(df[col].dropna().iloc[0]) if non_null_count > 0 else ""
            if inferred_type == "object":
                if re.match(r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}$', sample_val) or re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{4}$', sample_val):
                    inferred_type = "date (string)"
                elif re.match(r'^[\$₹€£]?\s*[\d,]+(\.\d+)?$', sample_val):
                    inferred_type = "currency/numeric (string)"

            column_details.append({
                "name": str(col),
                "type": inferred_type,
                "null_count": null_count,
                "null_percentage": round((null_count / total_rows * 100), 1) if total_rows > 0 else 0,
                "unique_count": int(df[col].nunique()),
                "sample_values": [str(v) for v in df[col].dropna().head(3).tolist()]
            })

        duplicate_rows = int(df.duplicated().sum())

        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "duplicate_rows": duplicate_rows,
            "columns": column_details,
            "preview": df.head(10).replace({np.nan: None}).to_dict(orient="records")
        }

    @staticmethod
    def clean_and_normalize(
        df: pd.DataFrame,
        remove_duplicates: bool = True,
        dedup_columns: List[str] = None,
        normalize_dates: bool = True,
        date_columns: List[str] = None,
        normalize_amounts: bool = True,
        amount_columns: List[str] = None,
        fill_missing: Dict[str, Any] = None,
        drop_empty_rows: bool = True
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes cleaning pipeline with deduplication, date parsing, amount normalization, imputation.
        """
        initial_rows = len(df)
        df_cleaned = df.copy()

        # 1. Drop completely empty rows
        if drop_empty_rows:
            df_cleaned.dropna(how="all", inplace=True)
        dropped_empty = initial_rows - len(df_cleaned)

        # 2. Deduplicate
        duplicates_removed = 0
        if remove_duplicates:
            subset = [c for c in (dedup_columns or []) if c in df_cleaned.columns] or None
            before_dedup = len(df_cleaned)
            df_cleaned.drop_duplicates(subset=subset, inplace=True)
            duplicates_removed = before_dedup - len(df_cleaned)

        # 3. Normalize Date Columns
        date_cols_processed = []
        if normalize_dates:
            target_date_cols = date_columns or []
            if not target_date_cols:
                # Auto-detect date columns by name or pattern
                for col in df_cleaned.columns:
                    col_lower = str(col).lower()
                    if any(term in col_lower for term in ["date", "dob", "dt", "period"]):
                        target_date_cols.append(col)

            for col in target_date_cols:
                if col in df_cleaned.columns:
                    try:
                        df_cleaned[col] = pd.to_datetime(df_cleaned[col], errors='coerce').dt.strftime('%Y-%m-%d')
                        date_cols_processed.append(col)
                    except Exception:
                        pass

        # 4. Normalize Amount / Currency Columns
        amount_cols_processed = []
        if normalize_amounts:
            target_amount_cols = amount_columns or []
            if not target_amount_cols:
                for col in df_cleaned.columns:
                    col_lower = str(col).lower()
                    if any(term in col_lower for term in ["amount", "value", "tax", "price", "total", "balance", "cost", "fee"]):
                        target_amount_cols.append(col)

            for col in target_amount_cols:
                if col in df_cleaned.columns:
                    try:
                        def parse_currency(val):
                            if pd.isna(val) or val == "":
                                return 0.0
                            s = str(val).strip()
                            # Handle accounting parenthesis for negatives (e.g. (1,200.50))
                            is_negative = False
                            if s.startswith("(") and s.endswith(")"):
                                is_negative = True
                                s = s[1:-1]
                            # Remove currency symbols and commas
                            s = re.sub(r'[^\d.-]', '', s)
                            try:
                                num = float(s)
                                return -num if is_negative else num
                            except ValueError:
                                return 0.0

                        df_cleaned[col] = df_cleaned[col].apply(parse_currency)
                        amount_cols_processed.append(col)
                    except Exception:
                        pass

        # 5. Fill missing values
        filled_summary = {}
        if fill_missing:
            for col, val in fill_missing.items():
                if col in df_cleaned.columns:
                    df_cleaned[col].fillna(val, inplace=True)
                    filled_summary[col] = val

        stats = {
            "initial_rows": initial_rows,
            "final_rows": len(df_cleaned),
            "duplicates_removed": duplicates_removed,
            "dropped_empty_rows": dropped_empty,
            "date_columns_normalized": date_cols_processed,
            "amount_columns_normalized": amount_cols_processed,
            "imputed_columns": filled_summary
        }

        return df_cleaned, stats

    @staticmethod
    def compare_sheets(df_a: pd.DataFrame, df_b: pd.DataFrame, key_column: str, compare_columns: List[str] = None, tolerance: float = 0.0) -> Dict[str, Any]:
        """
        Compares two datasets based on a unique key column. Identifies additions, deletions, and field modifications.
        """
        if key_column not in df_a.columns or key_column not in df_b.columns:
            raise ValueError(f"Key column '{key_column}' must exist in both sheets")

        # Normalize key values
        df_a_copy = df_a.copy()
        df_b_copy = df_b.copy()
        df_a_copy[key_column] = df_a_copy[key_column].astype(str).str.strip().str.upper()
        df_b_copy[key_column] = df_b_copy[key_column].astype(str).str.strip().str.upper()

        keys_a = set(df_a_copy[key_column].dropna())
        keys_b = set(df_b_copy[key_column].dropna())

        only_in_a = keys_a - keys_b
        only_in_b = keys_b - keys_a
        common_keys = keys_a.intersection(keys_b)

        cols_to_compare = compare_columns or [c for c in df_a.columns if c in df_b.columns and c != key_column]

        modified_records = []
        identical_count = 0

        df_a_indexed = df_a_copy.set_index(key_column)
        df_b_indexed = df_b_copy.set_index(key_column)

        for k in common_keys:
            row_a = df_a_indexed.loc[k]
            row_b = df_b_indexed.loc[k]
            # Handle multiple duplicate keys by taking first
            if isinstance(row_a, pd.DataFrame):
                row_a = row_a.iloc[0]
            if isinstance(row_b, pd.DataFrame):
                row_b = row_b.iloc[0]

            diffs = {}
            for col in cols_to_compare:
                val_a = row_a.get(col, None)
                val_b = row_b.get(col, None)

                # Numeric comparison with tolerance
                try:
                    f_a = float(val_a)
                    f_b = float(val_b)
                    if abs(f_a - f_b) > tolerance:
                        diffs[col] = {"sheet_a": f_a, "sheet_b": f_b, "diff": round(f_a - f_b, 2)}
                except (ValueError, TypeError):
                    if str(val_a).strip() != str(val_b).strip():
                        diffs[col] = {"sheet_a": str(val_a), "sheet_b": str(val_b)}

            if diffs:
                modified_records.append({
                    "key": k,
                    "modifications": diffs
                })
            else:
                identical_count += 1

        return {
            "total_in_sheet_a": len(df_a),
            "total_in_sheet_b": len(df_b),
            "common_records": len(common_keys),
            "identical_records": identical_count,
            "modified_records_count": len(modified_records),
            "only_in_sheet_a_count": len(only_in_a),
            "only_in_sheet_b_count": len(only_in_b),
            "modified_samples": modified_records[:20],
            "only_in_sheet_a_keys": list(only_in_a)[:20],
            "only_in_sheet_b_keys": list(only_in_b)[:20]
        }

    @staticmethod
    def export_to_excel_bytes(df: pd.DataFrame, sheet_name: str = "Cleaned_Data") -> bytes:
        """
        Exports DataFrame to an in-memory XLSX bytes object with styled header formatting.
        """
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Format header row
            worksheet = writer.sheets[sheet_name]
            from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
            navy_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
            white_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            thin_border = Border(
                left=Side(style='thin', color='D9D9D9'),
                right=Side(style='thin', color='D9D9D9'),
                top=Side(style='thin', color='D9D9D9'),
                bottom=Side(style='thin', color='D9D9D9')
            )

            for col_num, col in enumerate(df.columns, 1):
                cell = worksheet.cell(row=1, column=col_num)
                cell.fill = navy_fill
                cell.font = white_font
                cell.alignment = Alignment(horizontal="center", vertical="center")
                # Auto-fit column width
                max_len = max(len(str(val or '')) for val in df[col].head(50))
                worksheet.column_dimensions[openpyxl.utils.get_column_letter(col_num)].width = max(max_len + 4, 12)

        output.seek(0)
        return output.getvalue()
