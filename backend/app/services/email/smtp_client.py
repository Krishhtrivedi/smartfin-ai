import os
import smtplib
import mimetypes
from email.message import EmailMessage
from email.utils import formataddr
from typing import Dict, Any, List, Optional
from app.core.config import settings

class SMTPClient:
    @classmethod
    def is_configured(cls) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        configured = cls.is_configured()
        return {
            "is_configured": configured,
            "status": "CONFIGURED" if configured else "NOT_CONFIGURED",
            "host": settings.SMTP_HOST or None,
            "port": settings.SMTP_PORT,
            "user": settings.SMTP_USER or None,
            "from_email": settings.SMTP_FROM_EMAIL or None,
            "from_name": settings.SMTP_FROM_NAME,
            "tls_enabled": settings.SMTP_TLS
        }

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """
        Attempts real authentication handshake with configured SMTP host.
        Never fakes success.
        """
        if not cls.is_configured():
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "message": "SMTP host, user, or password is not configured in environment variables."
            }

        try:
            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
                if settings.SMTP_TLS:
                    server.starttls()
            
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.quit()

            return {
                "success": True,
                "status": "CONNECTED",
                "message": f"Successfully authenticated with SMTP server ({settings.SMTP_HOST}:{settings.SMTP_PORT}) as {settings.SMTP_USER}."
            }
        except Exception as e:
            return {
                "success": False,
                "status": "ERROR",
                "message": f"SMTP handshake failed: {str(e)}"
            }

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Transmits a real email over SMTP with MIME multipart payload and attachments.
        Fails cleanly if SMTP is unconfigured or unreachable.
        """
        if not cls.is_configured():
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "error": "Cannot send email: SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in Render."
            }

        if not to_email or "@" not in to_email:
            return {
                "success": False,
                "status": "INVALID_RECIPIENT",
                "error": f"Invalid recipient email address: '{to_email}'"
            }

        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
            msg["To"] = to_email

            plain_content = text_body or html_body
            msg.set_content(plain_content)
            if html_body:
                msg.add_alternative(html_body, subtype="html")

            # Attach files if provided and exist
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        ctype, encoding = mimetypes.guess_type(file_path)
                        if ctype is None or encoding is not None:
                            ctype = "application/octet-stream"
                        maintype, subtype = ctype.split("/", 1)
                        with open(file_path, "rb") as fp:
                            msg.add_attachment(
                                fp.read(),
                                maintype=maintype,
                                subtype=subtype,
                                filename=os.path.basename(file_path)
                            )

            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
                if settings.SMTP_TLS:
                    server.starttls()

            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()

            return {
                "success": True,
                "status": "SENT",
                "to": to_email,
                "subject": subject,
                "attachments_count": len(attachments or [])
            }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "error": f"SMTP dispatch error: {str(e)}"
            }
