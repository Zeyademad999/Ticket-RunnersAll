"""
OTP service for generating, sending, and verifying OTP codes.
Uses Floki SMS API for sending SMS messages.
"""
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import logging

from .models import OTP

logger = logging.getLogger(__name__)

# Floki SMS Configuration
FLOKI_SMS_URL = "https://flokisystems.com/flokisms/send-otp.php"
FLOKI_SMS_TOKEN = getattr(settings, 'FLOKI_SMS_TOKEN', '')


def generate_otp_code() -> str:
    """
    Generate a 6-digit OTP code.
    
    Returns:
        str: 6-digit OTP code
    """
    return str(random.randint(100000, 999999))


def send_sms_otp(phone: str, otp_code: str, app_name: str = "TicketRunners") -> dict:
    """
    Send OTP via Floki SMS API.
    
    Args:
        phone: Phone number to send OTP to
        otp_code: The OTP code to send
        app_name: Application name (default: "TicketRunners")
    
    Returns:
        dict: Response from SMS API with status and message
    """
    headers = {
        "Authorization": f"Bearer {FLOKI_SMS_TOKEN}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "app_name": app_name,
        "otp_code": otp_code,
        "phone": phone,
    }
    
    try:
        response = requests.post(FLOKI_SMS_URL, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to send OTP to {phone}: {str(e)}")
        return {
            "status": False,
            "message": f"Failed to send OTP: {str(e)}"
        }


def create_and_send_otp(phone_number: str, purpose: str, app_name: str = "TicketRunners") -> tuple[OTP, bool]:
    """
    Create OTP record and send SMS.
    
    Args:
        phone_number: Phone number to send OTP to
        purpose: Purpose of OTP (login, forgot_password, etc.)
        app_name: Application name for SMS
    
    Returns:
        tuple: (otp_instance, success) - OTP model instance and whether SMS was sent successfully
    """
    code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=5)
    
    # Invalidate any existing unused OTPs for the same phone and purpose
    OTP.objects.filter(
        phone_number=phone_number,
        purpose=purpose,
        used=False,
        expires_at__gt=timezone.now()
    ).update(used=True)
    
    # Create new OTP
    otp = OTP.objects.create(
        phone_number=phone_number,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    # Send SMS
    sms_result = send_sms_otp(phone_number, code, app_name)
    success = sms_result.get("status", False)
    
    if not success:
        logger.warning(f"OTP created but SMS failed for {phone_number}: {sms_result.get('message', 'Unknown error')}")
    
    return otp, success


def verify_otp(phone_number: str, code: str, purpose: str) -> bool:
    """
    Verify OTP code.
    
    Args:
        phone_number: Phone number associated with OTP
        code: OTP code to verify
        purpose: Purpose of OTP
    
    Returns:
        bool: True if OTP is valid, False otherwise
    """
    otp = OTP.objects.filter(
        phone_number=phone_number,
        code=code,
        purpose=purpose,
        used=False,
        expires_at__gt=timezone.now()
    ).first()
    
    if otp:
        otp.used = True
        otp.save(update_fields=['used'])
        return True
    
    return False


def cleanup_expired_otps():
    """
    Cleanup expired OTPs (can be called periodically via cron job).
    """
    expired_count = OTP.objects.filter(expires_at__lt=timezone.now()).update(used=True)
    logger.info(f"Cleaned up {expired_count} expired OTPs")
    return expired_count

