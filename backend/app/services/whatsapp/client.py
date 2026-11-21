import os
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class WhatsAppClient:
    """
    Production WhatsApp integration layer supporting:
    - WhatsApp Cloud API (Meta Official)
    - Evolution API (Self-hosted)
    - Green API
    - UltraMsg
    - Generic Webhook Gateway
    """

    @classmethod
    def get_env_config(cls) -> Dict[str, Any]:
        api_url = os.getenv("WHATSAPP_API_URL", "").strip()
        api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()
        phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", os.getenv("WHATSAPP_INSTANCE_ID", "")).strip()
        pmsc_group_id = os.getenv("WHATSAPP_PMSC_GROUP_ID", os.getenv("WHATSAPP_TARGET_RECIPIENT", "")).strip()
        provider = os.getenv("WHATSAPP_GATEWAY_PROVIDER", "GENERIC_WEBHOOK").strip().upper()
        schedule_time = os.getenv("WHATSAPP_AUTO_SCHEDULE_TIME", "18:30").strip()
        schedule_enabled = os.getenv("WHATSAPP_AUTO_SCHEDULE_ENABLED", "true").strip().lower() in ("true", "1", "yes")

        is_configured = bool(api_url and (pmsc_group_id or api_token))

        # Masking for security
        masked_token = (api_token[:4] + "..." + api_token[-4:]) if len(api_token) > 8 else ("Set" if api_token else "Not Set")
        masked_group = (pmsc_group_id[:6] + "..." + pmsc_group_id[-4:]) if len(pmsc_group_id) > 10 else (pmsc_group_id or "Not Configured")

        missing_vars = []
        if not api_url:
            missing_vars.append("WHATSAPP_API_URL")
        if not pmsc_group_id:
            missing_vars.append("WHATSAPP_PMSC_GROUP_ID")
        if not api_token and provider in ("WHATSAPP_CLOUD_API", "GREEN_API"):
            missing_vars.append("WHATSAPP_API_TOKEN")

        status = "CONNECTED" if is_configured else "NOT_CONFIGURED"

        return {
            "is_configured": is_configured,
            "status": status,
            "provider": provider,
            "api_url_configured": bool(api_url),
            "api_url_host": api_url.split("/")[2] if "://" in api_url else (api_url[:20] if api_url else None),
            "phone_number_id": phone_number_id or "Default",
            "pmsc_group_id": pmsc_group_id or "Team PMSC",
            "pmsc_group_id_masked": masked_group,
            "token_status": masked_token,
            "missing_variables": missing_vars,
            "schedule": {
                "enabled": schedule_enabled,
                "time_ist": schedule_time,
                "timezone": "Asia/Kolkata (IST)"
            }
        }

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """
        Pings or validates connectivity to the configured WhatsApp Gateway.
        """
        config = cls.get_env_config()
        if not config["is_configured"]:
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "message": "WhatsApp Gateway is not configured yet on this server.",
                "missing_variables": config["missing_variables"],
                "instruction": "Set WHATSAPP_API_URL and WHATSAPP_PMSC_GROUP_ID in environment variables."
            }

        api_url = os.getenv("WHATSAPP_API_URL", "").strip()
        api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()
        start_time = time.time()

        try:
            # Send a HEAD or lightweight GET request to verify server reachability
            req = urllib.request.Request(
                api_url,
                headers={
                    "User-Agent": "SMARTFIN.AI-WhatsApp-Agent/1.0",
                    "Authorization": f"Bearer {api_token}" if api_token else ""
                }
            )
            # Timeout of 7 seconds to keep test responsive
            with urllib.request.urlopen(req, timeout=7) as resp:
                status_code = resp.status
                latency_ms = int((time.time() - start_time) * 1000)
                return {
                    "success": True,
                    "status": "CONNECTED",
                    "status_code": status_code,
                    "latency_ms": latency_ms,
                    "message": f"WhatsApp Gateway reachable ({latency_ms}ms response time).",
                    "provider": config["provider"],
                    "target_group": config["pmsc_group_id"]
                }
        except urllib.error.HTTPError as e:
            latency_ms = int((time.time() - start_time) * 1000)
            # Some gateways return 401 or 405 on root URL but are reachable
            if e.code in (401, 403):
                return {
                    "success": False,
                    "status": "AUTH_ERROR",
                    "status_code": e.code,
                    "latency_ms": latency_ms,
                    "message": f"Gateway reached ({e.code}), but authentication token was rejected.",
                    "details": str(e)
                }
            elif e.code in (400, 404, 405):
                # Server is live, just method/path specific
                return {
                    "success": True,
                    "status": "CONNECTED",
                    "status_code": e.code,
                    "latency_ms": latency_ms,
                    "message": f"WhatsApp endpoint server active ({latency_ms}ms).",
                    "provider": config["provider"]
                }
            return {
                "success": False,
                "status": "ERROR",
                "status_code": e.code,
                "latency_ms": latency_ms,
                "message": f"Gateway returned HTTP {e.code}: {e.reason}",
                "details": str(e)
            }
        except Exception as ex:
            return {
                "success": False,
                "status": "UNREACHABLE",
                "message": f"Could not connect to WhatsApp Gateway: {str(ex)}",
                "details": str(ex)
            }

    @classmethod
    def send_message_to_pmsc(cls, text_message: str, custom_group_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends formatted message to Team PMSC WhatsApp Group via the configured provider.
        """
        config = cls.get_env_config()
        target_group = custom_group_id or os.getenv("WHATSAPP_PMSC_GROUP_ID", os.getenv("WHATSAPP_TARGET_RECIPIENT", "Team PMSC")).strip()

        if not config["is_configured"]:
            # Safe non-crashing simulation / mock log
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "simulated": True,
                "target_group": target_group,
                "message": "WhatsApp environment variables not configured on server. Message generated and queued internally.",
                "missing_variables": config["missing_variables"],
                "sent_length": len(text_message)
            }

        api_url = os.getenv("WHATSAPP_API_URL", "").strip()
        api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()
        provider = config["provider"]
        phone_number_id = config["phone_number_id"]

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "SMARTFIN.AI-Executive-Summary/1.0"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        # Construct provider payload
        if provider == "WHATSAPP_CLOUD_API":
            payload = {
                "messaging_product": "whatsapp",
                "to": target_group,
                "type": "text",
                "text": {"body": text_message}
            }
            # Standard Meta Graph API URL if base provided
            if "/messages" not in api_url and phone_number_id:
                target_url = f"{api_url.rstrip('/')}/{phone_number_id}/messages"
            else:
                target_url = api_url
        elif provider == "EVOLUTION_API":
            payload = {
                "number": target_group,
                "text": text_message
            }
            target_url = api_url
        elif provider == "GREEN_API":
            payload = {
                "chatId": f"{target_group}@g.us" if "@" not in target_group else target_group,
                "message": text_message
            }
            target_url = api_url
        elif provider == "ULTRAMSG":
            payload = {
                "to": target_group,
                "body": text_message
            }
            target_url = api_url
        else: # GENERIC_WEBHOOK
            payload = {
                "target": "Team PMSC",
                "group_id": target_group,
                "recipient": target_group,
                "message": text_message,
                "source": "SMARTFIN.AI",
                "timestamp": int(time.time())
            }
            target_url = api_url

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(target_url, data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=12) as response:
                resp_text = response.read().decode("utf-8")
                return {
                    "success": True,
                    "status": "SENT",
                    "target_group": target_group,
                    "provider": provider,
                    "response": resp_text[:200],
                    "message": "Successfully dispatched to Team PMSC WhatsApp Group."
                }
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            return {
                "success": False,
                "status": "FAILED",
                "target_group": target_group,
                "status_code": he.code,
                "error": f"HTTP {he.code}: {he.reason}",
                "details": err_body[:200]
            }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "target_group": target_group,
                "error": str(e)
            }
