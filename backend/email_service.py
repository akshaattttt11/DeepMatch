import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

FROM_EMAIL = os.getenv("EMAIL_FROM")
APP_BASE_URL = os.getenv("APP_BASE_URL")


def send_verification_email_resend(to_email, username, token):
    verify_link = f"{APP_BASE_URL}/api/verify-email?token={token}"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Verify your DeepMatch account",
        "html": f"""
        <h2>Welcome to DeepMatch, {username} ❤️</h2>
        <p>Please verify your email to activate your account.</p>
        <a href="{verify_link}"
           style="padding:12px 20px;background:#10b981;color:white;
           text-decoration:none;border-radius:6px;">
           Verify Email
        </a>
        <p>If you didn't sign up, ignore this email.</p>
        """
    })
    return True
