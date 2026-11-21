#!/usr/bin/env python3
"""
SmartFin.AI Mac Agent
=====================
Runs on the office Mac and does the work that cannot happen on Render:

  1. GSTR-1 download    - opens the GST portal, fills the username/password from the Client Master,
                          WAITS for staff to type the CAPTCHA/OTP, then saves the PDF to
                          ~/Desktop/<Client Folder>/GST/<FY>/ and uploads it for verification.
  2. Income Tax notices - opens the e-filing portal, waits for staff to finish login (OTP),
                          reads the e-Proceedings table exactly as shown and sends it to SmartFin.
  3. WhatsApp files     - copies files clients sent on WhatsApp into
                          ~/Desktop/<Client Folder>/Received/<Month Year>/

Honest by design: every step reports its real status to SmartFin. If a login is not completed,
a download does not happen or the Mac goes to sleep, SmartFin shows FAILED with the reason.

Setup (once):
    cd desktop_agent
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt && playwright install chromium
    cp agent.env.example agent.env      # then fill in SMARTFIN_API_URL and AGENT_API_TOKEN
Run:
    python3 smartfin_agent.py
"""
import hashlib
import json
import os
import platform
import re
import socket
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).with_name("agent.env"))
except ImportError:
    pass

VERSION = "1.0.0"
API = os.getenv("SMARTFIN_API_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
TOKEN = os.getenv("AGENT_API_TOKEN", "").strip()
ROOT = Path(os.path.expanduser(os.getenv("CLIENT_ROOT_DIR", "~/Desktop")))
AGENT_NAME = os.getenv("AGENT_NAME") or f"{socket.gethostname()}"
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "20"))
LOGIN_WAIT_MINUTES = int(os.getenv("LOGIN_WAIT_MINUTES", "10"))
DOWNLOAD_WAIT_MINUTES = int(os.getenv("DOWNLOAD_WAIT_MINUTES", "10"))

HEADERS = {"X-Agent-Token": TOKEN}
HB = {"agent_name": AGENT_NAME, "version": VERSION, "desktop_root": str(ROOT)}


# ------------------------------------------------------------------ small helpers
def log(msg: str):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def notify(title: str, text: str):
    """macOS banner so staff notice when a CAPTCHA/OTP is waiting."""
    if platform.system() == "Darwin":
        safe = lambda s: s.replace('"', "'")
        subprocess.run(["osascript", "-e", f'display notification "{safe(text)}" with title "{safe(title)}" sound name "Glass"'],
                       check=False, capture_output=True)


def api(method: str, path: str, **kw):
    r = requests.request(method, f"{API}{path}", headers=HEADERS, timeout=kw.pop("timeout", 60), **kw)
    if r.status_code >= 400:
        raise RuntimeError(f"SmartFin API {path} -> HTTP {r.status_code}: {r.text[:300]}")
    return r


def progress(job_id: int, status: str, message: str):
    log(f"job #{job_id}: {status} - {message}")
    try:
        api("POST", f"/automation/agent/jobs/{job_id}/progress", json={"status": status, "message": message})
    except Exception as e:
        log(f"  (could not report progress: {e})")


def fail(job_id: int, error: str):
    log(f"job #{job_id}: FAILED - {error}")
    try:
        api("POST", f"/automation/agent/jobs/{job_id}/fail", json={"error": error[:900]})
    except Exception as e:
        log(f"  (could not report failure: {e})")


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def free_path(p: Path) -> Path:
    """Never overwrite a file staff may already have on the Desktop."""
    if not p.exists():
        return p
    n = 2
    while True:
        cand = p.with_name(f"{p.stem} ({n}){p.suffix}")
        if not cand.exists():
            return cand
        n += 1


def safe_name(s: str) -> str:
    return re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", s).strip(" .") or "file"


class Heartbeat(threading.Thread):
    """Keeps SmartFin informed that this Mac is alive while a long job runs."""
    def __init__(self):
        super().__init__(daemon=True)
        self.stop = threading.Event()

    def run(self):
        while not self.stop.wait(30):
            try:
                api("POST", "/automation/agent/heartbeat", json=HB, timeout=20)
            except Exception as e:
                log(f"(heartbeat failed: {e})")


# ------------------------------------------------------------------ GSTR-1
def run_gstr1(job: dict):
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    jid, p, creds = job["id"], job["params"], job.get("credentials") or {}
    gstin, period, fy = job["gstin"], p["period"], p["financial_year"]
    folder = ROOT / safe_name(job["folder_name"]) / "GST" / fy
    folder.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        ctx = browser.new_context(accept_downloads=True)
        page = ctx.new_page()
        try:
            progress(jid, "RUNNING", "Opening the GST portal login page.")
            page.goto("https://services.gst.gov.in/services/login", timeout=90000)
            if creds.get("username"):
                try:
                    page.fill("#username", creds["username"], timeout=15000)
                except PWTimeout:
                    pass
            if creds.get("password"):
                try:
                    page.fill("#user_pass", creds["password"], timeout=5000)
                except PWTimeout:
                    pass
            try:
                page.focus("#captcha", timeout=5000)
            except PWTimeout:
                pass
            msg = (f"{job['client_name']}: type the CAPTCHA and click LOGIN in the Chromium window on the office Mac"
                   + ("" if creds.get("password") else " (no saved password - type it too)") + ".")
            progress(jid, "WAITING_FOR_HUMAN", msg)
            notify("SmartFin: GST login needed", msg)
            try:
                page.wait_for_url(re.compile(r".*/(auth|services/auth)/.*"), timeout=LOGIN_WAIT_MINUTES * 60000)
            except PWTimeout:
                return fail(jid, f"GST login was not completed within {LOGIN_WAIT_MINUTES} minutes. Nothing was downloaded.")

            progress(jid, "RUNNING", "Logged in. Opening the Returns Dashboard.")
            page.goto("https://return.gst.gov.in/returns/auth/dashboard", timeout=90000)
            month_name = datetime.strptime(period[:2], "%m").strftime("%B")
            # Best effort: pre-select FY and month. If the portal layout changed, staff select them.
            for sel, val in (("select[name='fin']", fy), ("select[name='mon']", month_name)):
                try:
                    page.select_option(sel, label=val, timeout=5000)
                except Exception:
                    pass
            msg = (f"{job['client_name']}: select FY {fy}, period {month_name}, click SEARCH, then GSTR-1 → "
                   f"VIEW → DOWNLOAD (PDF). The file is saved automatically.")
            progress(jid, "WAITING_FOR_HUMAN", msg)
            notify("SmartFin: click GSTR-1 download", msg)
            try:
                with page.expect_download(timeout=DOWNLOAD_WAIT_MINUTES * 60000) as dl_info:
                    pass
                download = dl_info.value
            except PWTimeout:
                return fail(jid, f"No download happened within {DOWNLOAD_WAIT_MINUTES} minutes. Nothing was saved.")
            target = free_path(folder / f"GSTR1_{gstin}_{period}.pdf")
            download.save_as(str(target))
            if not target.exists() or target.stat().st_size == 0:
                return fail(jid, "The download finished but the saved file is empty.")
        finally:
            try:
                browser.close()
            except Exception:
                pass

    digest = sha256_file(target)
    progress(jid, "RUNNING", f"Saved {target.name} on the Desktop; uploading for verification.")
    with open(target, "rb") as fh:
        r = api("POST", f"/automation/agent/jobs/{jid}/gstr1", timeout=180,
                files={"file": (target.name, fh, "application/pdf")},
                data={"sha256": digest, "desktop_path": str(target)})
    res = r.json()
    log(f"job #{jid}: server says {res['status']} - {res.get('status_message')}")


# ------------------------------------------------------------------ Income Tax
EXTRACT_JS = r"""
() => {
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const out = [];
  const tables = [...document.querySelectorAll('table, [role=table], mat-table')];
  for (const t of tables) {
    let headers = [...t.querySelectorAll('thead th, [role=columnheader], mat-header-cell')].map(h => clean(h.innerText));
    const rows = [...t.querySelectorAll('tbody tr, mat-row, [role=row]')].filter(r => !r.querySelector('th, [role=columnheader]'));
    for (const r of rows) {
      const cells = [...r.querySelectorAll('td, [role=cell], mat-cell')].map(c => clean(c.innerText));
      if (cells.some(c => c)) out.push({headers: headers.length === cells.length ? headers : null, cells});
    }
  }
  return out;
}
"""


def run_it_notices(job: dict):
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    jid, creds = job["id"], job.get("credentials") or {}
    folder = ROOT / safe_name(job["folder_name"]) / "IncomeTax"
    folder.mkdir(parents=True, exist_ok=True)
    reached, rows = [], []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=False)
        page = browser.new_page()
        try:
            progress(jid, "RUNNING", "Opening the Income Tax e-filing login page.")
            page.goto("https://eportal.incometax.gov.in/iec/foservices/#/login", timeout=90000)
            user = creds.get("username") or job.get("pan")
            try:
                page.fill("input[name='panAdhaarUserId'], #panAdhaarUserId", user, timeout=20000)
                page.click("button:has-text('Continue')", timeout=5000)
                if creds.get("password"):
                    page.fill("input[type='password']", creds["password"], timeout=15000)
                    try:
                        page.check("input[type='checkbox']", timeout=3000)
                    except Exception:
                        pass
            except PWTimeout:
                pass
            msg = (f"{job['client_name']}: finish the Income Tax login in the Chromium window on the office Mac "
                   f"(password / OTP).")
            progress(jid, "WAITING_FOR_HUMAN", msg)
            notify("SmartFin: Income Tax login needed", msg)
            try:
                page.wait_for_url(re.compile(r".*#/dashboard.*"), timeout=LOGIN_WAIT_MINUTES * 60000)
            except PWTimeout:
                return fail(jid, f"Income Tax login was not completed within {LOGIN_WAIT_MINUTES} minutes. Nothing was read.")

            progress(jid, "RUNNING", "Logged in. Reading Pending Actions → e-Proceedings.")
            page.goto("https://eportal.incometax.gov.in/iec/foservices/#/dashboard/e-proceedings", timeout=90000)
            page.wait_for_timeout(6000)
            if "e-proceedings" in page.url and "login" not in page.url:
                reached.append("e-Proceedings")
                found = page.evaluate(EXTRACT_JS)
                rows += [{"kind": "NOTICE", **r} for r in found]
                stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
                page.screenshot(path=str(free_path(folder / f"e-Proceedings_{stamp}.png")), full_page=True)

            demand_url = os.getenv("IT_DEMAND_URL", "").strip()
            if demand_url:
                page.goto(demand_url, timeout=90000)
                page.wait_for_timeout(6000)
                if "login" not in page.url:
                    reached.append("Outstanding Demand")
                    rows += [{"kind": "DEMAND", **r} for r in page.evaluate(EXTRACT_JS)]
        finally:
            try:
                browser.close()
            except Exception:
                pass

    if not reached:
        return fail(jid, "Could not open the e-Proceedings page after login. Nothing was stored.")
    r = api("POST", f"/automation/agent/jobs/{jid}/it-notices", json={"reached_pages": reached, "rows": rows})
    res = r.json()
    log(f"job #{jid}: server says {res['status']} - {res.get('status_message')}")


# ------------------------------------------------------------------ WhatsApp files -> Desktop
def sync_received_files():
    try:
        pending = api("GET", "/automation/agent/received-files").json()
    except Exception as e:
        log(f"(could not list received files: {e})")
        return
    for f in pending:
        target_dir = ROOT / safe_name(f["folder_name"]) / "Received" / safe_name(f["period"])
        target_dir.mkdir(parents=True, exist_ok=True)
        target = free_path(target_dir / safe_name(f["file_name"]))
        try:
            r = api("GET", f"/automation/agent/received-files/{f['id']}/download", timeout=120)
            target.write_bytes(r.content)
            digest = sha256_file(target)
            if f.get("sha256") and digest != f["sha256"]:
                log(f"  {target.name}: download damaged (hash mismatch); will retry next round.")
                target.unlink(missing_ok=True)
                continue
            api("POST", f"/automation/agent/received-files/{f['id']}/synced", json={"desktop_path": str(target), "sha256": digest})
            log(f"Saved WhatsApp file for {f['folder_name']}: {target}")
        except Exception as e:
            log(f"  could not save {f['file_name']}: {e}")


# ------------------------------------------------------------------ main loop
HANDLERS = {"GSTR1_DOWNLOAD": run_gstr1, "IT_NOTICES_FETCH": run_it_notices}


def main():
    if not TOKEN:
        sys.exit("AGENT_API_TOKEN is missing. Put it in desktop_agent/agent.env (same value as on Render).")
    if not ROOT.exists():
        sys.exit(f"Client folder root {ROOT} does not exist. Set CLIENT_ROOT_DIR in agent.env.")
    try:
        api("POST", "/automation/agent/heartbeat", json=HB)
    except Exception as e:
        sys.exit(f"Cannot reach SmartFin at {API}: {e}")
    log(f"SmartFin agent {VERSION} connected to {API} as '{AGENT_NAME}'. Saving to {ROOT}. Ctrl+C to stop.")
    while True:
        try:
            sync_received_files()
            claim = api("POST", "/automation/agent/claim", json=HB).json()
            job = claim.get("job")
            if job:
                log(f"Picked up job #{job['id']} ({job['job_type']}) for {job['client_name']}")
                hb = Heartbeat(); hb.start()
                try:
                    HANDLERS[job["job_type"]](job)
                except Exception as e:
                    fail(job["id"], f"Agent error: {e.__class__.__name__}: {e}")
                finally:
                    hb.stop.set()
                continue  # look for the next job straight away
        except KeyboardInterrupt:
            raise
        except Exception as e:
            log(f"(loop error: {e})")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Agent stopped.")
