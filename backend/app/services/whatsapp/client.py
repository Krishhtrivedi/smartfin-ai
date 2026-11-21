import os
import json
import time
import subprocess
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List

BRIDGE_PORT = int(os.getenv("WHATSAPP_BRIDGE_PORT", "8001"))
BRIDGE_BASE_URL = f"http://127.0.0.1:{BRIDGE_PORT}"
SELECTED_GROUP_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "whatsapp_bridge", "selected_group.json")

class WhatsAppClient:
    _bridge_process = None

    @classmethod
    def ensure_bridge_running(cls) -> bool:
        """
        Ensures the Baileys Node.js WhatsApp Web micro-server is running on 127.0.0.1:8001.
        """
        try:
            req = urllib.request.Request(f"{BRIDGE_BASE_URL}/status")
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass

        # If not responding, launch node backend/whatsapp_bridge/server.js
        bridge_script = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "whatsapp_bridge",
            "server.js"
        )
        if os.path.exists(bridge_script):
            try:
                print(f"[WhatsAppClient] Spawning Baileys bridge process: {bridge_script}")
                cls._bridge_process = subprocess.Popen(
                    ["node", bridge_script],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env={**os.environ, "WHATSAPP_BRIDGE_PORT": str(BRIDGE_PORT)}
                )
                time.sleep(1.5) # Allow socket to bind
                return True
            except Exception as e:
                print(f"[WhatsAppClient] Error starting Baileys bridge: {e}")
                return False
        return False

    @classmethod
    def get_selected_group(cls) -> Dict[str, str]:
        """
        Returns the chosen WhatsApp group JID and Name.
        """
        if os.path.exists(SELECTED_GROUP_FILE):
            try:
                with open(SELECTED_GROUP_FILE, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        # Fallback to environment variable if set
        env_group_id = os.getenv("WHATSAPP_PMSC_GROUP_ID", "").strip()
        return {
            "id": env_group_id or "",
            "name": "Team PMSC" if env_group_id else ""
        }

    @classmethod
    def set_selected_group(cls, group_id: str, group_name: str) -> Dict[str, str]:
        data = {"id": group_id.strip(), "name": group_name.strip()}
        try:
            os.makedirs(os.path.dirname(SELECTED_GROUP_FILE), exist_ok=True)
            with open(SELECTED_GROUP_FILE, "w") as f:
                json.dump(data, f)
        except Exception as e:
            print(f"[WhatsAppClient] Error saving selected group: {e}")
        return data

    @classmethod
    def get_live_status(cls) -> Dict[str, Any]:
        """
        Queries live connection status from Baileys micro-server and external gateway.
        Never fakes connection state.
        """
        cls.ensure_bridge_running()
        selected_grp = cls.get_selected_group()

        # 1. Check direct Baileys session
        baileys_status = {"connected": False, "state": "DISCONNECTED", "user": None, "qr": None, "error": None}
        try:
            req = urllib.request.Request(f"{BRIDGE_BASE_URL}/status")
            with urllib.request.urlopen(req, timeout=2) as resp:
                baileys_status = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            baileys_status["error"] = f"Bridge offline: {e}"

        # 2. Check external gateway fallback
        api_url = os.getenv("WHATSAPP_API_URL", "").strip()
        api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()
        has_ext_gateway = bool(api_url and (api_token or "http" in api_url))

        is_connected = baileys_status.get("connected", False)
        active_mode = "DIRECT_BAILEYS" if is_connected else ("EXTERNAL_GATEWAY" if has_ext_gateway else "NONE")

        can_send = bool(is_connected or has_ext_gateway)

        schedule_time = os.getenv("WHATSAPP_AUTO_SCHEDULE_TIME", "18:30").strip()
        schedule_enabled = os.getenv("WHATSAPP_AUTO_SCHEDULE_ENABLED", "true").strip().lower() in ("true", "1", "yes")

        return {
            "is_connected": is_connected,
            "can_send": can_send,
            "active_mode": active_mode,
            "state": baileys_status.get("state", "DISCONNECTED"),
            "connected_user": baileys_status.get("user"),
            "qr_code": baileys_status.get("qr"),
            "selected_group": selected_grp,
            "has_selected_group": bool(selected_grp.get("id")),
            "external_gateway_configured": has_ext_gateway,
            "schedule": {
                "enabled": schedule_enabled,
                "time_ist": schedule_time,
                "timezone": "Asia/Kolkata (IST)"
            },
            "error": baileys_status.get("error")
        }

    @classmethod
    def start_qr_session(cls) -> Dict[str, Any]:
        """
        Starts Baileys session and retrieves live QR Code to scan with phone.
        """
        cls.ensure_bridge_running()
        try:
            req = urllib.request.Request(f"{BRIDGE_BASE_URL}/start-session", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=8) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"status": "ERROR", "error": str(e)}

    @classmethod
    def logout_session(cls) -> Dict[str, Any]:
        """
        Logs out direct WhatsApp session.
        """
        cls.ensure_bridge_running()
        try:
            req = urllib.request.Request(f"{BRIDGE_BASE_URL}/logout", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def fetch_groups(cls) -> Dict[str, Any]:
        """
        Fetches genuine participating WhatsApp groups from user's live session.
        """
        cls.ensure_bridge_running()
        try:
            req = urllib.request.Request(f"{BRIDGE_BASE_URL}/groups")
            with urllib.request.urlopen(req, timeout=8) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            err_text = he.read().decode("utf-8", errors="ignore")
            try:
                return json.loads(err_text)
            except Exception:
                return {"success": False, "error": f"HTTP {he.code}: {he.reason}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def send_real_message(cls, text_message: str, target_group_id: Optional[str] = None) -> Dict[str, Any]:
        """
        STRICT REAL-SEND ENFORCEMENT:
        Only transmits if genuinely connected. Returns real message confirmation or real failure.
        Never fakes success.
        """
        status = cls.get_live_status()

        # Determine target group
        chosen_group = target_group_id or status.get("selected_group", {}).get("id")
        if not chosen_group:
            return {
                "success": False,
                "status": "NO_GROUP_SELECTED",
                "error": "No target WhatsApp group selected. Please select 'Team PMSC' from your groups list."
            }

        # Route 1: Direct Baileys Session
        if status.get("is_connected"):
            cls.ensure_bridge_running()
            try:
                payload = json.dumps({"jid": chosen_group, "text": text_message}).encode("utf-8")
                req = urllib.request.Request(
                    f"{BRIDGE_BASE_URL}/send-message",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    if resp_data.get("success"):
                        return {
                            "success": True,
                            "status": "POSTED_TO_PMSC",
                            "delivery_mode": "DIRECT_BAILEYS",
                            "message_id": resp_data.get("messageId"),
                            "target_group": chosen_group,
                            "timestamp": resp_data.get("timestamp"),
                            "message": "Message confirmed delivered to Team PMSC WhatsApp Group."
                        }
                    else:
                        return {
                            "success": False,
                            "status": "FAILED",
                            "error": resp_data.get("error", "Failed to deliver message via Baileys bridge")
                        }
            except Exception as e:
                return {
                    "success": False,
                    "status": "FAILED",
                    "error": f"Baileys dispatch error: {str(e)}"
                }

        # Route 2: External HTTP Gateway Fallback
        if status.get("external_gateway_configured"):
            api_url = os.getenv("WHATSAPP_API_URL", "").strip()
            api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()
            headers = {"Content-Type": "application/json"}
            if api_token:
                headers["Authorization"] = f"Bearer {api_token}"

            payload = {
                "recipient": chosen_group,
                "message": text_message,
                "group": "Team PMSC"
            }
            try:
                req = urllib.request.Request(api_url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=12) as resp:
                    resp_body = resp.read().decode("utf-8")
                    return {
                        "success": True,
                        "status": "POSTED_TO_PMSC",
                        "delivery_mode": "EXTERNAL_GATEWAY",
                        "target_group": chosen_group,
                        "response": resp_body[:200],
                        "message": "Dispatched via external WhatsApp Gateway."
                    }
            except Exception as he:
                return {
                    "success": False,
                    "status": "FAILED",
                    "error": f"Gateway transmission failed: {str(he)}"
                }

        # Not connected on any provider - REJECT SEND
        return {
            "success": False,
            "status": "NOT_CONNECTED",
            "error": "WhatsApp is not connected. Scan QR code to link your office phone or configure gateway credentials."
        }
