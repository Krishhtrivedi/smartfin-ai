import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.all_models import Customer, User
from app.core.security import decrypt_credential

client = TestClient(app)

def get_admin_token():
    resp = client.post("/api/v1/auth/login", json={"email": "pinal@smartfin.ai", "password": "SmartFin@2026!"})
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_client_master_import_and_crud():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Trigger Master Import
    import_resp = client.post("/api/v1/customers/import-masters", headers=headers)
    assert import_resp.status_code == 200
    data = import_resp.json()
    assert data["total_clients_in_db"] >= 2000
    assert data["gst_processed"] == 33
    assert data["it_processed"] == 2193
    assert data["tds_processed"] == 22

    # 2. Search client by GSTIN
    search_resp = client.get("/api/v1/customers/list?q=24AAMPP2463N2Z7", headers=headers)
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) >= 1
    hiren = results[0]
    assert "HIREN PATEL ARCHITECT" in hiren["name"]
    assert hiren["gstin"] == "24AAMPP2463N2Z7"
    assert hiren["pan"] == "AAMPP2463N"
    assert hiren["has_gst_password"] is True
    # Verify password is not in plaintext in the response
    assert "gst_password" not in hiren
    assert "it_password" not in hiren

    # 3. Create a new test client
    new_client_payload = {
        "name": "Tata Consultancy Motors LLP",
        "trade_name": "TCM Group",
        "gstin": "24AAACT1234F1Z9",
        "pan": "AAACT1234F",
        "tan": "AHMT12345A",
        "email": "tax@tcmgroup.com",
        "phone": "+919876500000",
        "folder_name": "Tata_Motors_LLP",
        "compliance_status": "ACTIVE",
        "credit_limit": 500000.0,
        "gst_username": "TCM_gst",
        "gst_password": "SecretGstPassword#2026",
        "it_username": "AAACT1234F",
        "it_password": "SecretITPassword#2026"
    }
    create_resp = client.post("/api/v1/customers/create", json=new_client_payload, headers=headers)
    assert create_resp.status_code == 200
    created = create_resp.json()
    client_id = created["id"]
    assert created["name"] == "Tata Consultancy Motors LLP"
    assert created["email"] == "tax@tcmgroup.com"
    assert created["phone"] == "+919876500000"
    assert created["has_gst_password"] is True
    assert created["has_it_password"] is True

    # Check that in DB the passwords are encrypted
    db = SessionLocal()
    db_cust = db.query(Customer).filter(Customer.id == client_id).first()
    assert db_cust is not None
    assert db_cust.gst_password_enc is not None
    assert db_cust.gst_password_enc != "SecretGstPassword#2026"
    assert decrypt_credential(db_cust.gst_password_enc) == "SecretGstPassword#2026"
    db.close()

    # 4. Update the client's phone number and email
    update_payload = {
        "phone": "+919999988888",
        "email": "finance.director@tcmgroup.com",
        "folder_name": "TCM_Filing_Folder"
    }
    update_resp = client.put(f"/api/v1/customers/{client_id}", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["phone"] == "+919999988888"
    assert updated["email"] == "finance.director@tcmgroup.com"
    assert updated["folder_name"] == "TCM_Filing_Folder"

    # Verify existing passwords were preserved
    assert updated["has_gst_password"] is True

    # 5. Delete the test client
    del_resp = client.delete(f"/api/v1/customers/{client_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "SUCCESS"
