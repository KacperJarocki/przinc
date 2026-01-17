import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_email(to_emails, subject, body):
    """
    Wysyła email do podanej listy odbiorców.
    to_emails: lista adresów email (list[str])
    subject: temat wiadomości
    body: treść wiadomości
    """
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if not sender_email or not sender_password:
        print("SMTP Config missing (SMTP_EMAIL, SMTP_PASSWORD)")
        return False

    if not to_emails:
        return False

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)

        for email in to_emails:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            server.sendmail(sender_email, email, msg.as_string())

        server.quit()
        print(f"Email sent to {len(to_emails)} recipients.")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
