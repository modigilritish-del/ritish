"""user/email_service.py - Email Notification Service"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "587"))
        self.use_tls = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
        self.username = os.getenv("EMAIL_USER")
        self.password = os.getenv("EMAIL_PASSWORD")
        
        if not self.username or not self.password:
            print("WARNING: Email credentials not found in environment variables")
            print("Email notifications will not work until credentials are configured")
        else:
            # Remove spaces from password (common copy-paste issue)
            self.password = self.password.replace(" ", "")
    
    def send_password_email(
        self,
        to_email: str,
        full_name: str,
        user_login_id: str,
        password: str,
        is_reset: bool = False
    ) -> bool:
        """
        Send password notification email
        
        Args:
            to_email: Recipient email address
            full_name: User's full name
            user_login_id: User's login ID
            password: Generated password
            is_reset: True if password reset, False if new registration
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Password Reset - Account Credentials" if is_reset else "Welcome - Your Account Credentials"
            
            # FIX: Handle None values for username
            if self.username is not None:
                msg["From"] = self.username
            else:
                print("ERROR: Email username not configured")
                return False
                
            msg["To"] = to_email
            
            # Email body
            if is_reset:
                text_body = f"""
Hello {full_name},

Your password has been reset successfully.

Your Login Credentials:
- User ID: {user_login_id}
- New Password: {password}

Please login and change your password immediately for security reasons.

Best regards,
System Administrator
                """
                
                html_body = f"""
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #4CAF50;">Password Reset Successful</h2>
      <p>Hello <strong>{full_name}</strong>,</p>
      <p>Your password has been reset successfully.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
        <h3 style="margin-top: 0;">Your Login Credentials:</h3>
        <p><strong>User ID:</strong> {user_login_id}</p>
        <p><strong>New Password:</strong> <code style="background-color: #fff; padding: 2px 6px; border: 1px solid #ddd;">{password}</code></p>
      </div>
      
      <div style="background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> Please login and change your password immediately for security reasons.</p>
      </div>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>System Administrator</strong></p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </body>
</html>
                """
            else:
                text_body = f"""
Hello {full_name},

Welcome! Your account has been created successfully.

Your Login Credentials:
- User ID: {user_login_id}
- Password: {password}

Please login and change your password after first login for security reasons.

Best regards,
System Administrator
                """
                
                html_body = f"""
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2196F3;">Welcome to the System!</h2>
      <p>Hello <strong>{full_name}</strong>,</p>
      <p>Your account has been created successfully. Welcome aboard!</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0;">
        <h3 style="margin-top: 0;">Your Login Credentials:</h3>
        <p><strong>User ID:</strong> {user_login_id}</p>
        <p><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 6px; border: 1px solid #ddd;">{password}</code></p>
      </div>
      
      <div style="background-color: #d1ecf1; padding: 10px; border-left: 4px solid #17a2b8; margin: 20px 0;">
        <p style="margin: 0;"><strong>💡 Tip:</strong> Please change your password after first login for better security.</p>
      </div>
      
      <p style="margin-top: 30px;">Best regards,<br><strong>System Administrator</strong></p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </body>
</html>
                """
            
            # Attach both plain text and HTML versions
            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            
            msg.attach(part1)
            msg.attach(part2)
            
            # FIX: Check for None values before login
            if self.username is None or self.password is None:
                print("ERROR: Email credentials not configured")
                return False
            
            # Send email
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            return True
            
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_bulk_notification(
        self,
        recipients: list,
        subject: str,
        message: str
    ) -> dict:
        """
        Send bulk notification emails
        
        Args:
            recipients: List of email addresses
            subject: Email subject
            message: Email message
        
        Returns:
            dict: Status of each email sent
        """
        results = {"success": [], "failed": []}
        
        # FIX: Check for None values before processing
        if self.username is None or self.password is None:
            print("ERROR: Email credentials not configured")
            return {
                "success": [],
                "failed": [{"email": "all", "error": "Email credentials not configured"}]
            }
        
        for email in recipients:
            try:
                msg = MIMEMultipart()
                msg["Subject"] = subject
                msg["From"] = self.username
                msg["To"] = email
                
                msg.attach(MIMEText(message, "plain"))
                
                with smtplib.SMTP(self.host, self.port) as server:
                    if self.use_tls:
                        server.starttls()
                    server.login(self.username, self.password)
                    server.send_message(msg)
                
                results["success"].append(email)
                
            except Exception as e:
                results["failed"].append({"email": email, "error": str(e)})
        
        return results


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    """Get email service singleton instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service