"""
Every test runs against a throw-away COPY of smartfin.db, so tests never write
test data into the real database. Must load before `app` is imported.
"""
import os
import shutil
import tempfile

_here = os.path.dirname(os.path.abspath(__file__))
_repo_db = os.path.abspath(os.path.join(_here, "..", "..", "smartfin.db"))
_tmp = tempfile.mkdtemp(prefix="smartfin-tests-")
_db = os.path.join(_tmp, "test.db")
if os.path.exists(_repo_db):
    shutil.copyfile(_repo_db, _db)
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["AUTOMATION_DIR"] = os.path.join(_tmp, "automation")
os.environ["WHATSAPP_INBOX_DIR"] = os.path.join(_tmp, "inbox")
os.makedirs(os.environ["WHATSAPP_INBOX_DIR"], exist_ok=True)
