import os, smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv('.env')

server = os.getenv('MAIL_SERVER')
port = int(os.getenv('MAIL_PORT') or 587)
user = os.getenv('MAIL_USERNAME')
pw = os.getenv('MAIL_PASSWORD')
sender = os.getenv('MAIL_DEFAULT_SENDER')
recipient = user

msg = EmailMessage()
msg['Subject'] = 'DeepMatch SMTP test'
msg['From'] = sender
msg['To'] = recipient
msg.set_content('If you see this, SMTP works.')

with smtplib.SMTP(server, port, timeout=20) as s:
    s.starttls()
    s.login(user, pw)
    s.send_message(msg)
    print('Sent OK')