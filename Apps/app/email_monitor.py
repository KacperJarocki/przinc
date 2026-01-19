import imaplib
import email
from email.header import decode_header
import time
import os
import re
import psycopg2
from datetime import datetime
import json
from dotenv import load_dotenv

load_dotenv()

IMAP_SERVER = os.getenv("IMAP_SERVER", "imap.gmail.com")
IMAP_PORT = int(os.getenv("IMAP_PORT", 993))
EMAIL_USER = os.getenv("SMTP_EMAIL")
EMAIL_PASS = os.getenv("SMTP_PASSWORD")

from db import get_db_connection

def clean_subject(subject):
    decoded_list = decode_header(subject)
    subject_str = ""
    for token, encoding in decoded_list:
        if isinstance(token, bytes):
            if encoding:
                subject_str += token.decode(encoding)
            else:
                subject_str += token.decode('utf-8', errors='ignore')
        else:
            subject_str += str(token)
    return subject_str

def extract_ticket_id(subject):
    match = re.search(r'#(\d+)', subject)
    if match:
        return int(match.group(1))
    return None

def clean_email_body(body):
    """
    Usuwa historię korespondencji z treści maila.
    Zakłada, że odpowiedź jest na górze (top-posting).
    """
    if not body:
        return ""

    body = body.replace('\r\n', '\n')
    
    lines = body.split('\n')
    cleaned_lines = []
    
    history_start_patterns = [
        r'^On\s.*wrote:.*$',           
        r'^W dniu\s.*napisał.*:.*$',   
        r'^.*napisa[łl]\(a\)\s*:.*$',  
        r'^.*napisał\(a\)\s*:.*$',   
        r'^-----Original Message-----$',
        r'^-----\s*Original Message\s*-----$',
        r'^From:\s.*$',           
        r'^Od:\s.*$',
        r'^>{2,}',          
        r'^-{10,}$',               
        r'^_{10,}$',                 
        r'^To jest wiadomość automatyczna\.$' 
    ]
    
    for line in lines:
        line_stripped = line.strip()
        
        if line_stripped.startswith('>'):
            break
            
        is_history = False
        for pattern in history_start_patterns:
            if re.match(pattern, line_stripped, re.IGNORECASE):
                is_history = True
                break
        
        if is_history:
            break
            
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines).strip()

def process_email(msg_id, msg_data):
    try:
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        subject = clean_subject(msg["Subject"])
        sender = msg.get("From")
        
        ticket_id = extract_ticket_id(subject)
        if not ticket_id:
            print(f"Skipping email without ticket ID: {subject}")
            return False

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain" and not body:
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
        else:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

        if not body:
            body = "[No text content found]"

        body = clean_email_body(body)

        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM tickets WHERE id = %s", (ticket_id,))
        if not cur.fetchone():
            print(f"Ticket #{ticket_id} does not exist.")
            cur.close()
            conn.close()
            return False

        print(f"Adding message to Ticket #{ticket_id} from {sender}")
        
        sender_email_match = re.search(r'<(.+?)>', sender)
        sender_email = sender_email_match.group(1) if sender_email_match else sender
        sender_name = sender.split('<')[0].strip() if '<' in sender else sender

        cur.execute("""
            INSERT INTO ticket_messages 
            (ticket_id, sender_email, sender_name, sender_type, content, attachments)
            VALUES (%s, %s, %s, 'user', %s, '[]')
        """, (ticket_id, sender_email, sender_name, body))
        
        cur.execute("UPDATE tickets SET updated_at = CURRENT_TIMESTAMP, status = 'W trakcie' WHERE id = %s", (ticket_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return True

    except Exception as e:
        print(f"Error processing email: {e}")
        return False

def check_email():
    if not EMAIL_USER or not EMAIL_PASS:
        print("Missing Email Credentials")
        return

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")
        
        status, messages = mail.search(None, '(UNSEEN)')
        
        if status != "OK":
            return

        msg_ids = messages[0].split()
        print(f"Found {len(msg_ids)} new emails.")
        
        for num in msg_ids:
            status, data = mail.fetch(num, '(RFC822)')
            if status == "OK":
                success = process_email(num, data)
    
        mail.logout()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    print("Starting Email Monitor...")
    while True:
        check_email()
        time.sleep(30)
