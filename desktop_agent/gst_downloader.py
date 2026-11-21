#!/usr/bin/env python3
"""
SmartFin.AI — Official GST Portal Downloader & Dispatch Companion
==================================================================
Runs on your local Mac to handle GST Portal interactive login (human CAPTCHA/OTP),
downloads official filed GSTR-1 PDFs directly to ~/Desktop/<ClientName>/GSTR1/,
and notifies SmartFin.AI to auto-send to the client's WhatsApp & Email.
"""

import os
import sys
import time
import argparse
from pathlib import Path
import requests
from playwright.sync_api import sync_playwright

API_BASE_URL = os.getenv("SMARTFIN_API_URL", "http://127.0.0.1:8000/api/v1")
DESKTOP_PATH = Path(os.path.expanduser(os.getenv("LOCAL_DESKTOP_PATH", "~/Desktop")))

def get_auth_token():
    admin_email = os.getenv("SMARTFIN_ADMIN_EMAIL", "birju@smartfin.ai")
    admin_password = os.getenv("SMARTFIN_ADMIN_PASSWORD", "SmartFin@2026!")
    try:
        res = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": admin_email, "password": admin_password},
            timeout=5
        )
        if res.status_code == 200:
            return res.json().get("access_token")
    except Exception as e:
        print(f"[Warning] Could not connect to SmartFin.AI backend: {e}")
    return None

def run_gst_download(client_name: str, gstin: str, year: str, period: str, username: str = None):
    print("=" * 65)
    print(f"SMARTFIN.AI — GST PORTAL AUTOMATION COMPANION")
    print(f"Client: {client_name} | GSTIN: {gstin} | Period: {period} ({year})")
    print("=" * 65)

    client_folder = DESKTOP_PATH / client_name.replace(" ", "_") / "GSTR1"
    client_folder.mkdir(parents=True, exist_ok=True)
    print(f"📁 Local destination folder prepared: {client_folder}")

    with sync_playwright() as p:
        print("🌐 Launching Google Chrome (Visible Mode for CAPTCHA/2FA)...")
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        # Step 1: Open Official GST Portal Login
        print("🔗 Navigating to https://services.gst.gov.in/services/login ...")
        page.goto("https://services.gst.gov.in/services/login", timeout=60000)

        if username:
            try:
                page.fill("#username", username)
                print(f"✓ Autofilled GST Username: {username}")
            except Exception:
                pass

        print("\n" + "!" * 65)
        print("👉 ACTION REQUIRED ON SCREEN:")
        print("   Please enter Password & CAPTCHA in the open browser window.")
        print("   Click 'LOGIN'. This script will automatically resume once logged in.")
        print("!" * 65 + "\n")

        # Wait for user to complete login (Dashboard URL contains /auth/ or /dashboard)
        try:
            page.wait_for_url("**/services/auth/quicklinks**", timeout=120000)
            print("🟢 Successfully detected active GST Portal session!")
        except Exception:
            # Fallback: check if logged in by looking for logout button or dashboard
            try:
                page.wait_for_selector("a:has-text('Logout')", timeout=60000)
                print("🟢 Session active (Logout link detected).")
            except Exception as e:
                print(f"❌ Login timeout or cancelled: {e}")
                browser.close()
                return

        # Step 2: Navigate to Return Dashboard
        print(f"📄 Navigating to Return Dashboard for FY {year}, Period {period}...")
        page.goto("https://return.gst.gov.in/returns/auth/dashboard", timeout=45000)
        time.sleep(2)

        # Allow user to pick or automate selection
        print("👉 Select FY and Return Filing Period on screen if needed, then click 'SEARCH'.")
        print("   Click on GSTR-1 -> 'VIEW' or 'DOWNLOAD'.")

        # Listen for file download
        with page.expect_download(timeout=180000) as download_info:
            print("⏳ Waiting for GSTR-1 download click...")
            download = download_info.value

        target_file_name = f"GSTR1_{gstin}_{period}.pdf"
        target_path = client_folder / target_file_name
        download.save_as(str(target_path))
        print(f"✅ GSTR-1 downloaded successfully and saved to:")
        print(f"   {target_path}")

        browser.close()

        # Step 3: Notify SmartFin.AI Backend & Auto-Send to Client
        token = get_auth_token()
        if token:
            print("📡 Notifying SmartFin.AI backend to dispatch to Client via WhatsApp & Email...")
            headers = {"Authorization": f"Bearer {token}"}
            try:
                res = requests.post(
                    f"{API_BASE_URL}/compliance/gstr-dispatch/scan-and-send",
                    json={"files": [target_file_name]},
                    headers=headers,
                    timeout=15
                )
                if res.status_code == 200:
                    print("✅ Client dispatch initiated via SMTP Email and WhatsApp!")
                    print(res.json())
                else:
                    print(f"⚠️ Dispatch notice: {res.text}")
            except Exception as ex:
                print(f"⚠️ Dispatch error: {ex}")
        else:
            print("ℹ️ File saved locally. Connect SmartFin.AI backend to auto-dispatch via WhatsApp.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SmartFin.AI GST Portal Downloader")
    parser.add_argument("--client", default="Acme_Enterprises", help="Client / Company Name")
    parser.add_argument("--gstin", default="27AACCA9876C1Z1", help="Client GSTIN")
    parser.add_argument("--year", default="2026-27", help="Financial Year (e.g. 2026-27)")
    parser.add_argument("--period", default="102026", help="Tax Period (e.g. 102026)")
    parser.add_argument("--user", default=None, help="GST Portal Username")
    args = parser.parse_args()

    run_gst_download(
        client_name=args.client,
        gstin=args.gstin,
        year=args.year,
        period=args.period,
        username=args.user
    )
