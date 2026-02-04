from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
import cloudinary
import cloudinary.uploader
import os
import requests
import json
import smtplib
from email.message import EmailMessage
import random
import math
import secrets
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
import pytz
from email_service import send_verification_email_resend

import logging
import threading
SENDGRID_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)



# Load environment variables from .env file (if it exists)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, skip

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Optional: ML model for zodiac compatibility (loaded if available)
try:
    from joblib import load as joblib_load
except ImportError:
    joblib_load = None

# NSFW Detection (optional - for image content filtering)
try:
    from nsfw_detector import scan_image_nsfw
    print("✅ NSFW detection module loaded")
except ImportError as e:
    print(f"⚠️ NSFW detection not available: {e}")
    # Fallback function - allows all uploads
    def scan_image_nsfw(image_path, threshold=0.5):
        return False, 0.0, {"error": "NSFW detection not available", "allowed": True, "note": "Install Pillow and numpy for basic detection"}

# user_id -> socket_id
connected_users = {}    

app = Flask(
    __name__,
    static_folder="uploads",
    static_url_path="/uploads"
)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
)

app.config['SECRET_KEY'] = 'your-secret-key-here-change-this-in-production'

# Database Configuration: PostgreSQL (preferred) or SQLite (fallback)
# Set DATABASE_URL environment variable to use PostgreSQL
# Format: postgresql://username:password@localhost:5432/database_name
# Example: postgresql://postgres:yourpassword@localhost:5432/deepmatch

database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Use PostgreSQL if DATABASE_URL is set
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print("✅ Using PostgreSQL database")
else:
    # Fallback to SQLite for development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dating_app.db'
    print("ℹ️ Using SQLite database (set DATABASE_URL env var to use PostgreSQL)")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)  # Enable CORS for React Native


# Try to load a pre-trained zodiac model if present
ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

zodiac_model = None
if joblib_load is not None:
    try:
        # Adjust path if you store the model elsewhere
        zodiac_model = joblib_load('zodiac_model.joblib')
        print("✅ Loaded zodiac_model.joblib for ML-based compatibility.")
    except Exception as e:
        print(f"⚠️ Could not load zodiac_model.joblib, using rule-based fallback. Details: {e}")
else:
    print("ℹ️ joblib not installed; zodiac ML model will not be used.")


def predict_best_sign(user_sign, answers):
    """
    Decide the most compatible sign for a user.

    - If an ML model (zodiac_model.joblib) is available, use it.
    - Otherwise, fall back to a simple rule-based mapping so the app still works.

    This function is the ONLY place you need to change later when you train
    a real ML model for your college project.
    """
    # Fallback: simple compatibility map (always works, but not "smart")
    fallback_map = {
        'Aries': 'Leo',
        'Taurus': 'Scorpio',
        'Gemini': 'Libra',
        'Cancer': 'Pisces',
        'Leo': 'Sagittarius',
        'Virgo': 'Capricorn',
        'Libra': 'Gemini',
        'Scorpio': 'Taurus',
        'Sagittarius': 'Aries',
        'Capricorn': 'Taurus',
        'Aquarius': 'Gemini',
        'Pisces': 'Virgo',
    }

    # If no ML model is loaded, just use the rule-based map
    if zodiac_model is None:
        return fallback_map.get(user_sign, 'Leo')

    # --- ML-based branch (to be customized when you have data) ---
    try:
        # answers from mobile: [userSign, q2, q3, q4, q5, ...]
        # Safely unpack the first 5 quiz answers after zodiac sign
        quiz_answers = answers[1:6] if len(answers) >= 6 else answers[1:]
        # Pad/truncate to 5 entries for consistency
        while len(quiz_answers) < 5:
            quiz_answers.append('Unknown')
        q1, q2, q3, q4, q5 = quiz_answers[:5]

        candidate_rows = []
        candidate_labels = []
        for cand_sign in ZODIAC_SIGNS:
            row = {
                'user_sign': user_sign,
                'candidate_sign': cand_sign,
                'q1': q1,
                'q2': q2,
                'q3': q3,
                'q4': q4,
                'q5': q5,
            }
            candidate_rows.append(row)
            candidate_labels.append(cand_sign)

        import pandas as pd
        X_candidates = pd.DataFrame(candidate_rows)

        scores = zodiac_model.predict(X_candidates)  # one score per candidate
        best_idx = max(range(len(scores)), key=lambda i: scores[i])
        return candidate_labels[best_idx]
    except Exception as e:
        print(f"⚠️ Zodiac model prediction error, falling back to map: {e}")
        return fallback_map.get(user_sign, 'Leo')

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)

    # Admin / moderation flags
    is_admin = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.Text, nullable=True)
    banned_at = db.Column(db.DateTime, nullable=True)

    # Profile information
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    age = db.Column(db.Integer)
    height = db.Column(db.String(10))  # Height in format "5'11"" or "6'0""
    gender = db.Column(db.String(20))
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # Dating preferences
    looking_for = db.Column(db.String(20))  # male, female, both
    min_age = db.Column(db.Integer)
    max_age = db.Column(db.Integer)
    dating_intention = db.Column(db.String(20))  # 'Long Term', 'Short Term', 'Casual'
    
    # Profile pictures (store URLs)
    profile_picture = db.Column(db.String(200))
    photos = db.Column(db.Text)  # JSON array of photo URLs

    mbti = db.Column(db.String(10))
    love_language = db.Column(db.String(50))
    
    # Enneagram and zodiac
    enneagram_type = db.Column(db.Integer)
    zodiac_sign = db.Column(db.String(20))
    
    # Email verification
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verification_token = db.Column(db.String(100), unique=True, nullable=True)
    verification_token_expiry = db.Column(db.DateTime, nullable=True)

# Helper function to calculate distance between two coordinates using Haversine formula
def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points on Earth (in miles)
    using the Haversine formula.
    
    Args:
        lat1, lon1: Latitude and longitude of first point in degrees
        lat2, lon2: Latitude and longitude of second point in degrees
    
    Returns:
        Distance in miles
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    
    # Radius of Earth in miles
    R = 3959.0
    
    # Convert latitude and longitude from degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    distance = R * c
    return distance

# Helper function to get current IST time
def get_ist_time():
    """Get current time in IST (Indian Standard Time)"""
    ist = pytz.timezone("Asia/Kolkata")
    return datetime.now(ist).replace(tzinfo=None)

# Helper function to convert feet'inches" to total inches for comparison
def height_to_inches(height_str):
    """Convert height string like "5'11"" to total inches"""
    if not height_str:
        return None
    try:
        # Parse format like "5'11"" or "6'0""
        parts = height_str.replace('"', '').split("'")
        if len(parts) == 2:
            feet = int(parts[0])
            inches = int(parts[1])
            return feet * 12 + inches
    except:
        pass
    return None

# Helper function to convert inches to feet'inches" format
def inches_to_height_str(inches):
    """Convert total inches to height string like "5'11\"" """
    if inches is None:
        return None
    feet = inches // 12
    remaining_inches = inches % 12
    return f"{feet}'{remaining_inches}\""

class QuizResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # DeepMatch Quiz Results
    mbti_type = db.Column(db.String(10))
    enneagram_type = db.Column(db.String(20))
    love_language = db.Column(db.String(50))
    psychological_traits = db.Column(db.Text)  # JSON string
    
    # Zodiac Quiz Results
    zodiac_sign = db.Column(db.String(20))
    zodiac_answers = db.Column(db.Text)  # JSON string
    
    # Calculated Scores
    deepmatch_score = db.Column(db.Float, default=0.0)
    zodiac_score = db.Column(db.Float, default=0.0)
    overall_score = db.Column(db.Float, default=0.0)
    
    completed_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone("Asia/Kolkata")).replace(tzinfo=None))

class CompatibilityScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Compatibility Scores
    deepmatch_score = db.Column(db.Float)
    zodiac_score = db.Column(db.Float)
    overall_score = db.Column(db.Float)
    
    # Detailed breakdown
    breakdown = db.Column(db.Text)  # JSON string
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)

    
    # Ensure unique pairs
    __table_args__ = (db.UniqueConstraint('user1_id', 'user2_id', name='unique_user_pair'),)

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    matched_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=False)
    is_delivered = db.Column(db.Boolean, default=False)
    is_read = db.Column(db.Boolean, default=False)
    is_deleted_for_everyone = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime, nullable=True)
    type = db.Column(db.String(20), default="text")  # text | image | audio
    reactions = db.Column(db.Text, nullable=True)   # JSON
    reply_to = db.Column(db.Text, nullable=True)

class MessageDelete(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('message_id', 'user_id', name='unique_message_user_delete'),
    )

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    liker_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    liked_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Rose(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(50))  # 'like', 'match', 'message'
    message = db.Column(db.String(200))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# =============================
# 🚨 REPORT SYSTEM
# =============================

class UserReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending | resolved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# =============================
# 🚫 BLOCK SYSTEM
# =============================

class UserBlock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blocked_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Admin actions / audit trail
class AdminAction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50))  # 'resolve_report', 'ban_user', 'unban_user'
    target_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    report_id = db.Column(db.Integer, db.ForeignKey('user_report.id'), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# Helper function to generate JWT token
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# Helper function to verify JWT token
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

# Helper function to generate email verification token
def generate_verification_token():
    """Generate a secure random token for email verification"""
    return secrets.token_urlsafe(32)

# Helper function to send verification email
def send_verification_email(user_email, username, token):
    try:
        return send_verification_email_resend(user_email, username, token)
    except Exception as e:
        print("Resend email error:", e)
        return False


def send_admin_notification(reporter_id, reported_user_id, reason, report_id=None):
    """Notify admin email about a new report. Attempts SMTP if configured, otherwise logs."""
    admin_email = os.environ.get("ADMIN_EMAIL", "deepmatch.noreply@gmail.com")

    try:
        reporter = db.session.get(User, reporter_id)
        reported = db.session.get(User, reported_user_id)
    except Exception:
        reporter = None
        reported = None

    subject = f"[DeepMatch] New user report #{report_id or 'N/A'}"
    body_lines = [
        f"Reporter: {reporter.email if reporter else reporter_id}",
        f"Reported user: {reported.email if reported else reported_user_id}",
        "",
        "Reason:",
        reason,
        "",
        f"Report ID: {report_id or 'N/A'}",
    ]
    body = "\n".join(body_lines)

    # Use Resend helper (send_verification_email_resend) — preferred for deployment where SMTP is blocked.
    try:
        # send_verification_email_resend(email, subject_or_username, body_or_token)
        send_verification_email_resend(admin_email, subject, body)
        print(f"✅ Admin notification sent to {admin_email} via Resend helper")
        return True
    except Exception as e:
        print(f"⚠️ Failed to send admin notification via Resend helper: {e}")

    # Last resort: log to console
    print("=== ADMIN REPORT NOTIFICATION (FALLBACK LOG) ===")
    print(subject)
    print(body)
    print("=== END ===")
    return False


# Compatibility Calculation Functions
def calculate_mbti_compatibility(mbti1, mbti2):
    """Calculate MBTI compatibility score (0-100)"""
    if not mbti1 or not mbti2:
        return 50  # Default score if missing
    
    # Handle single letter MBTI (from simplified quiz)
    # If we only have one dimension, use a simpler scoring
    if len(mbti1) == 1 or len(mbti2) == 1:
        # For single letters, give moderate scores with some variation
        if mbti1 == mbti2:
            return 75  # Same dimension = good match
        else:
            # Different dimensions - check if complementary
            complementary_pairs = [
                ('E', 'I'), ('I', 'E'),
                ('S', 'N'), ('N', 'S'),
                ('T', 'F'), ('F', 'T'),
                ('J', 'P'), ('P', 'J')
            ]
            if (mbti1, mbti2) in complementary_pairs:
                return 70  # Complementary = decent match
            else:
                return 60  # Different dimensions = moderate match
    
    # MBTI compatibility matrix (expanded to all 16 types)
    # Format: {type1: {type2: score, ...}, ...}
    compatibility_matrix = {
        'INTJ': {'ENTP': 95, 'ENFP': 90, 'INTP': 85, 'INFJ': 80, 'ENTJ': 75, 'ESFP': 65, 'ISFP': 70, 'ESTP': 65, 'ISTP': 70, 'ISFJ': 60, 'ESFJ': 55, 'ESTJ': 60, 'ISTJ': 65, 'INFP': 75},
        'INTP': {'ENTJ': 95, 'ENFJ': 90, 'INTJ': 85, 'ENTP': 80, 'INFJ': 75, 'ESFP': 60, 'ISFP': 65, 'ESTP': 60, 'ISTP': 70, 'ISFJ': 55, 'ESFJ': 50, 'ESTJ': 55, 'ISTJ': 65, 'INFP': 70},
        'ENTJ': {'INTP': 95, 'INFP': 90, 'ENTP': 85, 'INTJ': 75, 'ENFP': 70, 'ESFP': 75, 'ISFP': 70, 'ESTP': 80, 'ISTP': 75, 'ISFJ': 70, 'ESFJ': 75, 'ESTJ': 85, 'ISTJ': 80, 'INFJ': 70},
        'ENTP': {'INTJ': 95, 'INFJ': 90, 'INTP': 80, 'ENTJ': 85, 'ENFP': 75, 'ESFP': 80, 'ISFP': 75, 'ESTP': 85, 'ISTP': 75, 'ISFJ': 65, 'ESFJ': 70, 'ESTJ': 75, 'ISTJ': 70, 'INFP': 80},
        'INFJ': {'ENTP': 90, 'ENFP': 85, 'INTJ': 80, 'INFP': 75, 'ENTJ': 70, 'ESFP': 70, 'ISFP': 75, 'ESTP': 65, 'ISTP': 70, 'ISFJ': 80, 'ESFJ': 75, 'ESTJ': 60, 'ISTJ': 65, 'INTP': 75},
        'INFP': {'ENTJ': 90, 'ENFJ': 85, 'INFJ': 75, 'ENFP': 80, 'INTP': 70, 'ESFP': 75, 'ISFP': 80, 'ESTP': 70, 'ISTP': 75, 'ISFJ': 75, 'ESFJ': 80, 'ESTJ': 65, 'ISTJ': 70, 'INTJ': 75},
        'ENFJ': {'INFP': 90, 'INTP': 85, 'ENFP': 80, 'INFJ': 75, 'ENTP': 70, 'ESFP': 85, 'ISFP': 80, 'ESTP': 75, 'ISTP': 70, 'ISFJ': 85, 'ESFJ': 90, 'ESTJ': 75, 'ISTJ': 70, 'INTJ': 75, 'ENTJ': 80},
        'ENFP': {'INTJ': 90, 'INFJ': 85, 'INFP': 80, 'ENTP': 75, 'ENFJ': 80, 'ESFP': 85, 'ISFP': 80, 'ESTP': 80, 'ISTP': 75, 'ISFJ': 75, 'ESFJ': 80, 'ESTJ': 70, 'ISTJ': 70, 'INTP': 70, 'ENTJ': 70},
        'ISTJ': {'ESFP': 85, 'ESTP': 80, 'ISFP': 75, 'ISTP': 80, 'ESFJ': 85, 'ESTJ': 90, 'ISFJ': 85, 'ENTJ': 80, 'ENTP': 70, 'INTJ': 65, 'INTP': 65, 'ENFJ': 70, 'ENFP': 70, 'INFJ': 65, 'INFP': 70},
        'ISFJ': {'ESTP': 85, 'ESFP': 80, 'ISTP': 75, 'ISTJ': 85, 'ESTJ': 85, 'ESFJ': 90, 'ENTJ': 70, 'ENTP': 65, 'INTJ': 60, 'INTP': 55, 'ENFJ': 85, 'ENFP': 75, 'INFJ': 80, 'INFP': 75},
        'ESTJ': {'ISFP': 85, 'ISTP': 80, 'ESFP': 80, 'ISTJ': 90, 'ISFJ': 85, 'ESFJ': 85, 'ENTJ': 85, 'ENTP': 75, 'INTJ': 60, 'INTP': 55, 'ENFJ': 75, 'ENFP': 70, 'INFJ': 60, 'INFP': 65},
        'ESFJ': {'ISTP': 85, 'ISFP': 80, 'ESTP': 80, 'ISTJ': 85, 'ISFJ': 90, 'ESTJ': 85, 'ENTJ': 75, 'ENTP': 70, 'INTJ': 55, 'INTP': 50, 'ENFJ': 90, 'ENFP': 80, 'INFJ': 75, 'INFP': 80},
        'ISTP': {'ESFJ': 85, 'ESTJ': 80, 'ESFP': 75, 'ISTJ': 80, 'ISFJ': 75, 'ESTP': 85, 'ENTJ': 75, 'ENTP': 75, 'INTJ': 70, 'INTP': 70, 'ENFJ': 70, 'ENFP': 75, 'INFJ': 70, 'INFP': 75},
        'ISFP': {'ESTJ': 85, 'ESFJ': 80, 'ESTP': 75, 'ISTJ': 75, 'ISFJ': 80, 'ESFP': 80, 'ENTJ': 70, 'ENTP': 75, 'INTJ': 70, 'INTP': 65, 'ENFJ': 80, 'ENFP': 80, 'INFJ': 75, 'INFP': 80},
        'ESTP': {'ISFJ': 85, 'ISTJ': 80, 'ISFP': 75, 'ISTP': 85, 'ESFJ': 80, 'ESTJ': 80, 'ESFP': 85, 'ENTJ': 80, 'ENTP': 85, 'INTJ': 65, 'INTP': 60, 'ENFJ': 75, 'ENFP': 80, 'INFJ': 65, 'INFP': 70},
        'ESFP': {'ISTJ': 85, 'ISFJ': 80, 'ISTP': 75, 'ISFP': 80, 'ESTJ': 80, 'ESFJ': 80, 'ESTP': 85, 'ENTJ': 75, 'ENTP': 80, 'INTJ': 65, 'INTP': 60, 'ENFJ': 85, 'ENFP': 85, 'INFJ': 70, 'INFP': 75}
    }
    
    # Get score from matrix, or calculate a base score based on type similarity
    score = compatibility_matrix.get(mbti1, {}).get(mbti2, None)
    if score is not None:
        return score
    
    # If not in matrix, calculate based on similarity (same letters = higher score)
    if mbti1 == mbti2:
        return 70  # Same type
    elif mbti1 and mbti2 and len(mbti1) == 4 and len(mbti2) == 4:
        # Count matching letters
        matches = sum(1 for i in range(4) if mbti1[i] == mbti2[i])
        # More matches = higher compatibility (but lower than known good pairs)
        return 50 + (matches * 7)  # 50-78 range for unknown pairs
    else:
        return 60  # Default if types are invalid

def calculate_enneagram_compatibility(enneagram1, enneagram2):
    """Calculate Enneagram compatibility score (0-100)"""
    if not enneagram1 or not enneagram2:
        return 50
    
    # Enneagram compatibility (simplified)
    compatible_pairs = [
        ('Type 1', 'Type 2'), ('Type 1', 'Type 7'),
        ('Type 2', 'Type 8'), ('Type 2', 'Type 4'),
        ('Type 3', 'Type 6'), ('Type 3', 'Type 9'),
        ('Type 4', 'Type 1'), ('Type 4', 'Type 2'),
        ('Type 5', 'Type 8'), ('Type 5', 'Type 7'),
        ('Type 6', 'Type 9'), ('Type 6', 'Type 3'),
        ('Type 7', 'Type 5'), ('Type 7', 'Type 1'),
        ('Type 8', 'Type 2'), ('Type 8', 'Type 5'),
        ('Type 9', 'Type 3'), ('Type 9', 'Type 6')
    ]
    
    pair1 = (enneagram1, enneagram2)
    pair2 = (enneagram2, enneagram1)
    
    if pair1 in compatible_pairs or pair2 in compatible_pairs:
        return 85
    elif enneagram1 == enneagram2:
        return 70  # Same type
    else:
        return 60  # Different types

def calculate_love_language_compatibility(love_lang1, love_lang2):
    """Calculate Love Language compatibility score (0-100)"""
    if not love_lang1 or not love_lang2:
        return 50
    
    if love_lang1 == love_lang2:
        return 90  # Same love language
    else:
        return 70  # Different love languages

def calculate_psychological_compatibility(psych1, psych2):
    """Calculate psychological traits compatibility (0-100)"""
    if not psych1 or not psych2:
        return 50
    
    try:
        traits1 = json.loads(psych1) if isinstance(psych1, str) else psych1
        traits2 = json.loads(psych2) if isinstance(psych2, str) else psych2
        
        # Calculate similarity for each trait
        similarities = []
        for trait in ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']:
            if trait in traits1 and trait in traits2:
                diff = abs(traits1[trait] - traits2[trait])
                similarity = max(0, 100 - diff)  # Higher similarity = lower difference
                similarities.append(similarity)
        
        return sum(similarities) / len(similarities) if similarities else 50
    except:
        return 50

def calculate_zodiac_compatibility(zodiac1, zodiac2):
    """Calculate Zodiac compatibility score (0-100)"""
    if not zodiac1 or not zodiac2:
        return 50
    
    # Zodiac compatibility (simplified)
    compatible_signs = {
        'Aries': ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
        'Taurus': ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
        'Gemini': ['Libra', 'Aquarius', 'Aries', 'Leo'],
        'Cancer': ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
        'Leo': ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
        'Virgo': ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
        'Libra': ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
        'Scorpio': ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
        'Sagittarius': ['Aries', 'Leo', 'Libra', 'Aquarius'],
        'Capricorn': ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
        'Aquarius': ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
        'Pisces': ['Cancer', 'Scorpio', 'Taurus', 'Capricorn']
    }
    
    if zodiac2 in compatible_signs.get(zodiac1, []):
        return 85
    elif zodiac1 == zodiac2:
        return 70
    else:
        return 60

def calculate_deepmatch_compatibility(quiz1, quiz2):
    """Calculate overall DeepMatch compatibility"""
    mbti_score = calculate_mbti_compatibility(quiz1.mbti_type, quiz2.mbti_type)
    enneagram_score = calculate_enneagram_compatibility(quiz1.enneagram_type, quiz2.enneagram_type)
    love_lang_score = calculate_love_language_compatibility(quiz1.love_language, quiz2.love_language)
    psych_score = calculate_psychological_compatibility(quiz1.psychological_traits, quiz2.psychological_traits)
    
    # Weighted average
    overall_score = (mbti_score * 0.3 + enneagram_score * 0.25 + 
                    love_lang_score * 0.25 + psych_score * 0.2)
    
    return {
        'overall_score': round(overall_score, 1),
        'breakdown': {
            'mbti': round(mbti_score, 1),
            'enneagram': round(enneagram_score, 1),
            'love_language': round(love_lang_score, 1),
            'psychological': round(psych_score, 1)
        }
    }

# Routes

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    # Generate verification token
    verification_token = generate_verification_token()
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        age=data.get('age'),
        gender=data.get('gender'),
        bio=data.get('bio', ''),
        location=data.get('location', ''),
        looking_for=data.get('looking_for', 'both'),
        min_age=data.get('min_age', 18),
        max_age=data.get('max_age', 100),
        dating_intention=data.get('dating_intention'),
        is_verified=False,
        email_verification_token=verification_token,
        verification_token_expiry=token_expiry
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Send verification email asynchronously so registration request isn't blocked
    def _send_async_verification(email_addr, username, token):
        try:
            # Ensure Flask app context is available for Flask-Mail fallback
            with app.app_context():
                ok = send_verification_email(email_addr, username, token)
            if not ok:
                print(f"Warning: Failed to send verification email to {email_addr}")
            else:
                print(f"Verification email queued/sent for {email_addr}")
        except Exception as e:
            print(f"Async email error for {email_addr}: {e}")

    threading.Thread(
        target=_send_async_verification,
        args=(user.email, user.username, verification_token),
        daemon=True
    ).start()
    email_sent = "queued"
    
    return jsonify({
        'message': 'User registered successfully. Please check your email to verify your account.',
        'email_sent': email_sent,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_verified': user.is_verified
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
        
        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password cannot be empty'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            # Check if email is verified
            if not user.is_verified:
                return jsonify({
                    'error': 'EMAIL_NOT_VERIFIED',
                    'message': 'Please verify your email address before logging in. Check your inbox for the verification link.',
                    'email': user.email
                }), 403
            
            # Check if banned
            if getattr(user, "is_banned", False):
                return jsonify({
                    'error': 'USER_BANNED',
                    'message': 'This account has been banned. Contact support for more information.'
                }), 403
            
            token = generate_token(user.id)
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'gender': user.gender,
                    'age': user.age,
                    'location': user.location,
                    'bio': user.bio,
                    'is_verified': user.is_verified
                }
            })
        
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        print(f'Login error: {str(e)}')
        return jsonify({'error': 'An error occurred during login. Please try again.'}), 500

@app.route('/api/profile', methods=['GET'])
def get_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    photos = json.loads(user.photos) if user.photos else []

    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'has_taken_zodiac_quiz': user.has_taken_zodiac_quiz,

        # Basic profile
        'first_name': user.first_name,
        'last_name': user.last_name,
        'age': user.age,
        'height': user.height,
        'gender': user.gender,
        'bio': user.bio,
        'location': user.location,

        # Preferences
        'looking_for': user.looking_for,
        'min_age': user.min_age,
        'max_age': user.max_age,
        'dating_intention': user.dating_intention,

        # Photos
        'profile_picture': user.profile_picture,
        'photos': photos,

        'mbti': user.mbti,
        'enneagram_type': user.enneagram_type,
        'love_language': user.love_language,
        'zodiac_sign': user.zodiac_sign,
    })


@app.route('/api/profile', methods=['PUT'])
def update_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    if 'first_name' in data:
        user.first_name = data['first_name']

    if 'last_name' in data:
        user.last_name = data['last_name']

    if 'age' in data:
        user.age = data['age']

    if 'height' in data:
        user.height = data['height']

    if 'gender' in data:
        user.gender = data['gender']

    if 'bio' in data:
        user.bio = data['bio']

    if 'location' in data:
        user.location = data['location']

    if 'latitude' in data:
        user.latitude = data['latitude']

    if 'longitude' in data:
        user.longitude = data['longitude']

    if 'looking_for' in data:
        user.looking_for = data['looking_for']

    if 'min_age' in data:
        user.min_age = data['min_age']

    if 'max_age' in data:
        user.max_age = data['max_age']

    if 'dating_intention' in data:
        user.dating_intention = data['dating_intention']

    if 'mbti' in data:
        user.mbti = data['mbti']

    if 'enneagram_type' in data:
        user.enneagram_type = data['enneagram_type']

    if 'love_language' in data:
        user.love_language = data['love_language']

    if 'zodiac_sign' in data:
        user.zodiac_sign = data['zodiac_sign']

    if 'profile_picture' in data:
        print(f"🖼️ Updating profile_picture for user {user.id}: {data['profile_picture']}")
        user.profile_picture = data['profile_picture']

    if 'photos' in data:
        user.photos = json.dumps(data['photos']) if data['photos'] else None

    db.session.commit()
    print(f"✅ Profile updated successfully for user {user.id}")

    return jsonify({'message': 'Profile updated successfully'})


@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    current_user_id = verify_token(token)

    if not current_user_id:
        return jsonify({'error': 'Invalid token'}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    photos = json.loads(user.photos) if user.photos else []

    response_data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'age': user.age,
        'height': user.height,
        'gender': user.gender,
        'bio': user.bio,
        'location': user.location,
        'dating_intention': user.dating_intention,
        'profile_picture': user.profile_picture,
        'photos': photos,

        'mbti_type': user.mbti,
        'enneagram_type': user.enneagram_type,
        'love_language': user.love_language,
        'zodiac_sign': user.zodiac_sign,
    }
    
    # Debug logging
    logging.info(f"Returning user profile for user_id {user_id}")
    logging.info(f"Gender: {user.gender}, Height: {user.height}, Dating Intention: {user.dating_intention}")
    
    return jsonify(response_data)

@app.route('/api/users', methods=['GET'])
def get_users():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get users based on preferences
    query = User.query.filter(User.id != user_id)
    
    # Filter by gender preference
    if current_user.looking_for != 'both':
        query = query.filter_by(gender=current_user.looking_for)
    
    # Filter by age range
    if current_user.age:
        query = query.filter(
            User.age >= current_user.min_age,
            User.age <= current_user.max_age
        )
    
    users = query.limit(20).all()
    
    user_list = []
    for user in users:
        user_list.append({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'age': user.age,
            'gender': user.gender,
            'bio': user.bio,
            'location': user.location,
            'profile_picture': user.profile_picture,
            'enneagram_type': user.enneagram_type,
            'zodiac_sign': user.zodiac_sign
        })
    
    return jsonify({'users': user_list})

@app.route('/api/like', methods=['POST'])
def like_user():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    liked_id = data.get('liked_id')
    
    if not liked_id:
        return jsonify({'error': 'liked_id is required'}), 400
    
    # Check if already liked
    existing_like = Like.query.filter_by(
        liker_id=user_id, 
        liked_id=liked_id
    ).first()
    
    if existing_like:
        return jsonify({'error': 'Already liked this user'}), 400
    
    # Create like
    like = Like(liker_id=user_id, liked_id=liked_id)
    db.session.add(like)
    
    # Check if notification already exists to prevent duplicates
    existing_notification = Notification.query.filter_by(
        user_id=liked_id,
        from_user_id=user_id,
        type='like',
        is_read=False
    ).first()
    
    # Only create notification if it doesn't exist
    if not existing_notification:
        liker_user = db.session.get(User, user_id)
        notification = Notification(
            user_id=liked_id,
            from_user_id=user_id,
            type='like',
            message=f"{liker_user.first_name} liked your profile!"
        )
        db.session.add(notification)
    
    # DO NOT auto-create match on mutual like
    # Match will only be created when the liked user accepts the notification
    # This ensures users explicitly accept before chats appear
    
    db.session.commit()
    return jsonify({'message': 'User liked successfully', 'matched': False})

@app.route('/api/rose', methods=['POST'])
def send_rose():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    
    if not receiver_id:
        return jsonify({'error': 'receiver_id is required'}), 400
    
    # Check if already sent rose
    existing_rose = Rose.query.filter_by(
        sender_id=user_id, 
        receiver_id=receiver_id
    ).first()
    
    if existing_rose:
        return jsonify({'error': 'Already sent a rose to this user'}), 400
    
    # Create rose
    rose = Rose(sender_id=user_id, receiver_id=receiver_id)
    db.session.add(rose)
    
    # Check if notification already exists to prevent duplicates
    existing_notification = Notification.query.filter_by(
        user_id=receiver_id,
        from_user_id=user_id,
        type='rose',
        is_read=False
    ).first()
    
    # Only create notification if it doesn't exist
    if not existing_notification:
        sender_user = db.session.get(User, user_id)
        notification = Notification(
            user_id=receiver_id,
            from_user_id=user_id,
            type='rose',
            message=f"{sender_user.first_name} sent you a rose! 🌹"
        )
        db.session.add(notification)
    
    # Check if receiver has also sent a rose (special match)
    mutual_rose = Rose.query.filter_by(
        sender_id=receiver_id, 
        receiver_id=user_id
    ).first()
    
    if mutual_rose:
        # Create match
        match = Match(user1_id=min(user_id, receiver_id), user2_id=max(user_id, receiver_id))
        db.session.add(match)
        
        # Create match notification for both users
        match_notification1 = Notification(
            user_id=receiver_id,
            from_user_id=user_id,
            type='match',
            message=f"Rose match with {sender_user.first_name}! 🌹💕"
        )
        match_notification2 = Notification(
            user_id=user_id,
            from_user_id=receiver_id,
            type='match',
            message=f"Rose match with {db.session.get(User, receiver_id).first_name}! 🌹💕"
        )
        db.session.add(match_notification1)
        db.session.add(match_notification2)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Rose match!',
            'matched': True
        })
    
    db.session.commit()
    return jsonify({'message': 'Rose sent successfully', 'matched': False})

@app.route('/api/matches', methods=['GET'])
def get_matches():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Get all matches for current user
    matches = Match.query.filter(
        (Match.user1_id == user_id) | (Match.user2_id == user_id),
        Match.is_active == True
    ).all()
    
    match_list = []

    for match in matches:
        # Get the other user in the match
        other_user_id = match.user2_id if match.user1_id == user_id else match.user1_id
        other_user = db.session.get(User, other_user_id)

        # 🚫 BLOCK FILTER (FIXED — INSIDE LOOP)
        is_blocked = UserBlock.query.filter(
            ((UserBlock.blocker_id == user_id) & (UserBlock.blocked_user_id == other_user_id)) |
            ((UserBlock.blocker_id == other_user_id) & (UserBlock.blocked_user_id == user_id))
        ).first()

        if is_blocked:
            continue

        if other_user:
            # Check if there's an unread like/rose notification for this user
            pending_notification = Notification.query.filter_by(
                user_id=user_id,
                from_user_id=other_user_id,
                type='like',
                is_read=False
            ).first()
            
            if not pending_notification:
                # Also check for rose notifications
                pending_notification = Notification.query.filter_by(
                    user_id=user_id,
                    from_user_id=other_user_id,
                    type='rose',
                    is_read=False
                ).first()
            
            # Only include match if no pending notification
            if not pending_notification:
                match_list.append({
                    'match_id': match.id,
                    'user': {
                        'id': other_user.id,
                        'username': other_user.username,
                        'first_name': other_user.first_name,
                        'last_name': other_user.last_name,
                        'profile_picture': other_user.profile_picture
                    },
                    'matched_at': match.matched_at.isoformat()
                })
    
    return jsonify({'matches': match_list})


@app.route('/api/messages/<int:match_id>', methods=['GET'])
def get_messages(match_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    # Verify user is part of this match
    match = db.session.get(Match, match_id)
    if not match or (match.user1_id != user_id and match.user2_id != user_id):
        return jsonify({'error': 'Match not found'}), 404

    # Get messages between users
    messages = Message.query.filter(
        ((Message.sender_id == match.user1_id) & (Message.receiver_id == match.user2_id)) |
        ((Message.sender_id == match.user2_id) & (Message.receiver_id == match.user1_id))
    ).order_by(Message.sent_at).all()

    # 🔥 MARK RECEIVED MESSAGES AS DELIVERED
    room = f"match_{match_id}"
    delivered_message_ids = []

    for message in messages:
        if message.receiver_id == user_id and not message.is_delivered:
            message.is_delivered = True
            delivered_message_ids.append(message.id)
            db.session.add(message)

    if delivered_message_ids:
        db.session.commit()

        for message_id in delivered_message_ids:
            socketio.emit(
                "message_delivered",
                {
                    "messageId": message_id,
                    "matchId": match_id
                },
                room=room
            )

    # 🔥 BUILD RESPONSE (FIXED & SAFE)
    message_list = []
    for message in messages:

        # ✅ SKIP "DELETE FOR ME" MESSAGES
        deleted_for_me = MessageDelete.query.filter_by(
            message_id=message.id,
            user_id=user_id
        ).first()

        if deleted_for_me:
            continue

        message_list.append({
            'id': message.id,
            'content': '' if message.is_deleted_for_everyone else message.content,
            'sender_id': message.sender_id,
            'sent_at': message.sent_at.isoformat(),
            'is_read': message.is_read,
            'is_deleted_for_everyone': message.is_deleted_for_everyone,
            'edited_at': message.edited_at.isoformat() if message.edited_at else None,
            'reactions': message.reactions,
            'type': message.type,
            'media_url': message.content if message.type != 'text' else None,
            'reply_to': json.loads(message.reply_to) if message.reply_to else None,
        })

    return jsonify({'messages': message_list})


@app.route('/api/messages/<int:match_id>/mark-read', methods=['POST'])
def mark_messages_as_read(match_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    match = db.session.get(Match, match_id)
    if not match or (match.user1_id != user_id and match.user2_id != user_id):
        return jsonify({'error': 'Match not found'}), 404

    # Mark ONLY received messages as read
    Message.query.filter(
        Message.receiver_id == user_id,
        Message.sender_id != user_id,
        Message.is_read == False
    ).update({'is_read': True})

    db.session.commit()

    return jsonify({'message': 'Messages marked as read'})


@app.route('/api/messages', methods=['POST'])
def send_message():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.get_json() or {}
    reply_to = data.get("reply_to")

    receiver_id = data.get('receiver_id')
    content = data.get('content')          # for text
    media_url = data.get('media_url')      # for image / audio
    msg_type = data.get('type', 'text')    # text | image | audio

    # ✅ VALIDATION
    if not receiver_id:
        return jsonify({'error': 'receiver_id is required'}), 400

    if msg_type == 'text' and not content:
        return jsonify({'error': 'content is required for text messages'}), 400

    if msg_type in ['image', 'audio'] and not media_url:
        return jsonify({'error': 'media_url is required for media messages'}), 400


    # ============================================================
    # 🚫 BLOCK CHECK (NEW — STEP 6)
    # ============================================================
    is_blocked = UserBlock.query.filter(
        ((UserBlock.blocker_id == user_id) & (UserBlock.blocked_user_id == receiver_id)) |
        ((UserBlock.blocker_id == receiver_id) & (UserBlock.blocked_user_id == user_id))
    ).first()

    if is_blocked:
        return jsonify({
            "error": "You cannot message this user"
        }), 403


    # ============================================================
    # ✅ VERIFY MATCH EXISTS
    # ============================================================
    match = Match.query.filter(
        ((Match.user1_id == user_id) & (Match.user2_id == receiver_id)) |
        ((Match.user1_id == receiver_id) & (Match.user2_id == user_id)),
        Match.is_active == True
    ).first()

    if not match:
        return jsonify({'error': 'Users are not matched'}), 400


    # ============================================================
    # 🕒 USE IST TIME
    # ============================================================
    ist = pytz.timezone("Asia/Kolkata")
    sent_at = datetime.now(ist).replace(tzinfo=None)


    # ============================================================
    # 💬 CREATE MESSAGE
    # ============================================================
    message = Message(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=content if msg_type == 'text' else media_url,
        sent_at=sent_at,
        is_delivered=False,
        is_read=False,
        type=msg_type,
        reply_to=json.dumps(reply_to) if reply_to else None
    )

    db.session.add(message)
    db.session.commit()


    # ============================================================
    # ⚡ REAL-TIME SOCKET EMIT
    # ============================================================
    room = f"match_{match.id}"

    socketio.emit(
        "new_message",
        {
            "id": message.id,
            "content": message.content if msg_type == 'text' else None,
            "media_url": message.content if msg_type != 'text' else None,
            "type": msg_type,
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "sent_at": sent_at.isoformat(),
            "is_read": False,
            "is_deleted_for_everyone": False,
            "edited_at": None,
            "match_id": match.id,
            "reply_to": reply_to,
        },
        room=room
    )

    return jsonify({
        'message': 'Message sent successfully',
        'message_id': message.id,
        'sent_at': sent_at.isoformat(),
        'type': msg_type
    }), 201



@app.route('/api/messages/<int:message_id>/delete', methods=['POST'])
def delete_message(message_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404

    delete_for_everyone = request.json.get('delete_for_everyone', False)

    if delete_for_everyone:
        if message.sender_id != user_id:
            return jsonify({'error': 'Not allowed'}), 403

        message.is_deleted_for_everyone = True
        db.session.commit()

        match = Match.query.filter(
            ((Match.user1_id == message.sender_id) & (Match.user2_id == message.receiver_id)) |
            ((Match.user1_id == message.receiver_id) & (Match.user2_id == message.sender_id))
        ).first()

        if match:
            payload = {
                "messageId": message.id,
                "matchId": match.id
            }

            socketio.emit("message_deleted", payload, room=f"match_{match.id}")
            socketio.emit("message_deleted", payload, room=f"user_{message.sender_id}")
            socketio.emit("message_deleted", payload, room=f"user_{message.receiver_id}")

        return jsonify({'success': True})

    # 🔥 DELETE FOR ME (THIS WAS MISSING)
    existing = MessageDelete.query.filter_by(
        message_id=message_id,
        user_id=user_id
    ).first()

    if not existing:
        db.session.add(
            MessageDelete(
                message_id=message_id,
                user_id=user_id
            )
        )
        db.session.commit()

    return jsonify({'success': True})


@app.route('/api/messages/<int:message_id>/edit', methods=['POST'])
def edit_message(message_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    message = Message.query.get(message_id)
    if not message or message.sender_id != user_id:
        return jsonify({'error': 'Not allowed'}), 403

    # ✅ TIMEZONE-SAFE EDIT WINDOW CHECK (15 minutes)
    now = datetime.now(pytz.timezone("Asia/Kolkata")).replace(tzinfo=None)
    sent_at = message.sent_at
    if abs((now - sent_at).total_seconds()) > 15 * 60:
        return jsonify({'error': 'Edit time expired'}), 403

    new_content = request.json.get('content')
    if not new_content:
        return jsonify({'error': 'Content required'}), 400

    message.content = new_content
    message.edited_at = now
    db.session.commit()

    # 🔍 Find match
    match = Match.query.filter(
        ((Match.user1_id == message.sender_id) & (Match.user2_id == message.receiver_id)) |
        ((Match.user1_id == message.receiver_id) & (Match.user2_id == message.sender_id))
    ).first()

    if match:
        payload = {
    "messageId": message.id,
    "matchId": match.id,
    "content": new_content,
    "editedAt": message.edited_at.isoformat()
}

        # ✅ emit to match room
        socketio.emit("message_edited", payload, room=f"match_{match.id}")

        # 🔥 GUARANTEED DELIVERY (even if room join failed)
        socketio.emit("message_edited", payload, room=f"user_{message.sender_id}")
        socketio.emit("message_edited", payload, room=f"user_{message.receiver_id}")

    return jsonify({'success': True})



@app.route('/api/messages/<int:message_id>/react', methods=['POST'])
def react_message(message_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    emoji = request.json.get("emoji")
    if not emoji:
        return jsonify({'error': 'Emoji required'}), 400

    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404

    reactions = json.loads(message.reactions) if message.reactions else {}

    users = reactions.get(emoji, [])
    if user_id in users:
        users.remove(user_id)
    else:
        users.append(user_id)

    reactions[emoji] = users
    message.reactions = json.dumps(reactions)
    db.session.commit()

    match = Match.query.filter(
        ((Match.user1_id == message.sender_id) & (Match.user2_id == message.receiver_id)) |
        ((Match.user1_id == message.receiver_id) & (Match.user2_id == message.sender_id))
    ).first()

    if match:
        payload = {
    "messageId": message.id,
    "matchId": match.id,
    "reactions": reactions
}

        # ✅ match room
        socketio.emit("message_reaction", payload, room=f"match_{match.id}")

        # 🔥 GUARANTEED DELIVERY (THIS FIXES REFRESH ISSUE)
        socketio.emit("message_reaction", payload, room=f"user_{message.sender_id}")
        socketio.emit("message_reaction", payload, room=f"user_{message.receiver_id}")

    return jsonify({'reactions': reactions})




# Quiz and Compatibility Endpoints

@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    
    # Create or update quiz result
    quiz_result = QuizResult.query.filter_by(user_id=user_id).first()
    if not quiz_result:
        quiz_result = QuizResult(user_id=user_id)
        db.session.add(quiz_result)
    
    # Update quiz data
    quiz_result.mbti_type = data.get('mbti_type')
    quiz_result.enneagram_type = data.get('enneagram_type')
    quiz_result.love_language = data.get('love_language')
    quiz_result.psychological_traits = json.dumps(data.get('psychological_traits', {}))
    quiz_result.zodiac_sign = data.get('zodiac_sign')
    quiz_result.zodiac_answers = json.dumps(data.get('zodiac_answers', {}))
    quiz_result.completed_at = get_ist_time()  # Update timestamp in IST on each quiz submission
    
    db.session.commit()
    
    # Calculate compatibility with all other users
    calculate_all_compatibilities(user_id)
    
    return jsonify({'message': 'Quiz submitted successfully'})

@app.route('/api/zodiac-quiz', methods=['POST'])
def submit_zodiac_quiz():
    """Store user's zodiac quiz answers and return a compatible sign.
    For now this uses a simple rule-based mapping; you can later
    replace the logic here with a proper ML model without changing
    the mobile app."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json() or {}
    user_sign = data.get('zodiac_sign')
    answers = data.get('answers', [])

    # Decide compatible sign using ML model if available, otherwise fallback map
    compatible_sign = predict_best_sign(user_sign, answers)

    # Ensure quiz row exists
    quiz_result = QuizResult.query.filter_by(user_id=user_id).first()
    if not quiz_result:
        quiz_result = QuizResult(user_id=user_id)
        db.session.add(quiz_result)

    quiz_result.zodiac_sign = user_sign
    quiz_result.zodiac_answers = json.dumps({
        'answers': answers,
        'compatible_sign': compatible_sign
    })
    quiz_result.completed_at = get_ist_time()  # Update timestamp in IST when zodiac quiz is submitted

    # Mirror onto User so filters can use zodiac directly
    user = db.session.get(User, user_id)
    if user and user_sign:
        user.zodiac_sign = user_sign

    db.session.commit()

    # Recalculate compatibility scores so zodiac is included
    calculate_all_compatibilities(user_id)

    return jsonify({
        'message': 'Zodiac quiz submitted successfully',
        'compatible_sign': compatible_sign
    })

def calculate_all_compatibilities(user_id):
    """Calculate compatibility scores with all other users (both directions)"""
    current_quiz = QuizResult.query.filter_by(user_id=user_id).first()
    if not current_quiz:
        return
    
    # Get all other users who have completed quizzes
    other_quizzes = QuizResult.query.filter(QuizResult.user_id != user_id).all()
    
    for other_quiz in other_quizzes:
        # Calculate DeepMatch compatibility
        deepmatch_compatibility = calculate_deepmatch_compatibility(current_quiz, other_quiz)
        
        # Calculate Zodiac compatibility
        zodiac_score = calculate_zodiac_compatibility(
            current_quiz.zodiac_sign, 
            other_quiz.zodiac_sign
        )
        
        # Calculate overall score (weighted average)
        overall_score = (deepmatch_compatibility['overall_score'] * 0.7 + zodiac_score * 0.3)

        # DEBUG: log component scores for investigation
        try:
            logging.info(
                f"Compat calc user {user_id} vs {other_quiz.user_id}: "
                f"mbti={deepmatch_compatibility['breakdown']['mbti']}, "
                f"ennea={deepmatch_compatibility['breakdown']['enneagram']}, "
                f"love_lang={deepmatch_compatibility['breakdown']['love_language']}, "
                f"psych={deepmatch_compatibility['breakdown']['psychological']}, "
                f"zodiac={zodiac_score}, overall={overall_score}"
            )
        except Exception as e:
            logging.error(f"Error logging compatibility breakdown for {user_id} vs {other_quiz.user_id}: {e}")
        
        # Create or update compatibility score (user_id -> other_user)
        compatibility = CompatibilityScore.query.filter_by(
            user1_id=user_id, 
            user2_id=other_quiz.user_id
        ).first()
        
        if not compatibility:
            compatibility = CompatibilityScore(
                user1_id=user_id,
                user2_id=other_quiz.user_id
            )
            db.session.add(compatibility)
        
        compatibility.deepmatch_score = deepmatch_compatibility['overall_score']
        compatibility.zodiac_score = zodiac_score
        compatibility.overall_score = overall_score
        compatibility.breakdown = json.dumps({
            'deepmatch': deepmatch_compatibility,
            'zodiac': zodiac_score
        })
        
        # Also create/update reverse compatibility (other_user -> user_id)
        # This ensures both users can see each other in matches
        reverse_compatibility = CompatibilityScore.query.filter_by(
            user1_id=other_quiz.user_id,
            user2_id=user_id
        ).first()
        
        if not reverse_compatibility:
            reverse_compatibility = CompatibilityScore(
                user1_id=other_quiz.user_id,
                user2_id=user_id
            )
            db.session.add(reverse_compatibility)
        
        # Reverse compatibility uses the same scores (compatibility is symmetric)
        reverse_compatibility.deepmatch_score = deepmatch_compatibility['overall_score']
        reverse_compatibility.zodiac_score = zodiac_score
        reverse_compatibility.overall_score = overall_score
        reverse_compatibility.breakdown = json.dumps({
            'deepmatch': deepmatch_compatibility,
            'zodiac': zodiac_score
        })
    
    db.session.commit()

@app.route('/api/zodiac-quiz/complete', methods=['POST'])
def mark_zodiac_quiz_complete():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.has_taken_zodiac_quiz = True
    db.session.commit()

    return jsonify({'message': 'Zodiac quiz marked as completed'})

@app.route('/api/compatible-matches', methods=['GET'])
def get_compatible_matches():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    current_user = db.session.get(User, user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Optional filters from query params
    intention = request.args.get('intention')  # 'Long Term', 'Short Term', 'Casual'
    min_height = request.args.get('min_height', type=int)
    max_height = request.args.get('max_height', type=int)
    zodiac_sign_raw = request.args.get('zodiac')  # Filter by zodiac sign
    max_distance = request.args.get('max_distance', type=float)  # Maximum distance in miles
    
    # Handle 'None' string as null (frontend sometimes sends 'None' as string)
    # Also handle empty strings, 'null', 'undefined', etc.
    zodiac_sign = None
    if zodiac_sign_raw is not None:
        zodiac_str = str(zodiac_sign_raw).strip()
        zodiac_lower = zodiac_str.lower()
        # Only use as filter if it's a valid zodiac sign (not 'none', 'null', 'undefined', or empty)
        if zodiac_lower and zodiac_lower not in ['none', 'null', 'undefined', '']:
            zodiac_sign = zodiac_str
        # Otherwise zodiac_sign stays None (no filter)
    
    print(f"DEBUG: Request filters - intention: {intention}, min_height: {min_height}, max_height: {max_height}")
    print(f"DEBUG: zodiac_raw: '{zodiac_sign_raw}' (type: {type(zodiac_sign_raw).__name__})")
    print(f"DEBUG: zodiac_sign: {zodiac_sign} (type: {type(zodiac_sign).__name__})")
    
    # Calculate should_filter_zodiac the same way as in the loop
    zodiac_sign_str_test = str(zodiac_sign).strip().lower() if zodiac_sign else ''
    should_filter_zodiac_test = (zodiac_sign is not None and 
                                zodiac_sign_str_test and 
                                zodiac_sign_str_test not in ['none', 'null', 'undefined', ''])
    print(f"DEBUG: Will apply zodiac filter: {should_filter_zodiac_test} (zodiac_sign_str: '{zodiac_sign_str_test}')")

    # Ensure current user has a quiz result
    current_quiz = QuizResult.query.filter_by(user_id=user_id).first()
    if not current_quiz:
        return jsonify({'matches': [], 'message': 'Please complete the compatibility quiz first'})
    
    # Recalculate compatibilities to ensure scores are up-to-date
    calculate_all_compatibilities(user_id)

    # Calculate compatibility scores if they don't exist
    # This ensures users see matches even if compatibility wasn't pre-calculated
    existing_compatibilities = CompatibilityScore.query.filter_by(user1_id=user_id).count()
    if existing_compatibilities == 0:
        # No compatibility scores exist, calculate them now
        calculate_all_compatibilities(user_id)
    
    # Get compatibility scores for current user with gender filtering
    compatibilities = CompatibilityScore.query.filter_by(user1_id=user_id).order_by(
        CompatibilityScore.overall_score.desc()
    ).limit(50).all()  # Increased limit to ensure we have enough matches after filtering
    
    print(f"DEBUG: Found {len(compatibilities)} compatibility scores for user {user_id}")
    print(f"DEBUG: Current user gender: '{current_user.gender}'")
    
    matches = []
    for comp in compatibilities:
        other_user = db.session.get(User, comp.user2_id)
        if not other_user:
            print(f"DEBUG: Skipping - other_user not found for user_id {comp.user2_id}")
            continue

        # Gender-based filtering: show opposite gender only
        # If current user's gender is not set, skip gender filtering (show all)
        current_gender = (current_user.gender or '').strip().lower()
        other_gender = (other_user.gender or '').strip().lower()
        
        print(f"DEBUG: Checking {other_user.first_name} {other_user.last_name} - current_gender: '{current_gender}', other_gender: '{other_gender}'")
        
        # Only apply gender filter if current user has gender set
        if current_gender:
            is_opposite_gender = (
                (current_gender == 'male' and other_gender == 'female') or
                (current_gender == 'female' and other_gender == 'male')
            )
            if not is_opposite_gender:
                print(f"DEBUG: Filtered out {other_user.first_name} - gender mismatch")
                continue

        # Dating intention filter (if provided)
        if intention and (other_user.dating_intention or '') != intention:
            print(f"DEBUG: Filtered out {other_user.first_name} - intention mismatch")
            continue
        
        # Height filter (if provided) - convert height string to inches for comparison
        if min_height is not None:
            user_height_inches = height_to_inches(other_user.height)
            if user_height_inches is None or user_height_inches < min_height:
                continue
        if max_height is not None:
            user_height_inches = height_to_inches(other_user.height)
            if user_height_inches is None or user_height_inches > max_height:
                continue
        
        # Distance filter (if provided) - calculate distance using coordinates
        if max_distance is not None:
            # Check if both users have coordinates
            if (current_user.latitude is not None and current_user.longitude is not None and
                other_user.latitude is not None and other_user.longitude is not None):
                distance = calculate_distance(
                    current_user.latitude, current_user.longitude,
                    other_user.latitude, other_user.longitude
                )
                if distance is None:
                    print(f"DEBUG: Skipping distance filter for {other_user.first_name} - distance calculation failed")
                elif distance > max_distance:
                    print(f"DEBUG: Filtered out {other_user.first_name} - distance {distance:.2f} miles exceeds max {max_distance} miles")
                    continue
                else:
                    print(f"DEBUG: ✅ {other_user.first_name} within distance - {distance:.2f} miles (max: {max_distance} miles)")
            else:
                # If coordinates are missing, skip distance filtering for this user
                # This allows users without coordinates to still see matches
                missing_coords = []
                if current_user.latitude is None or current_user.longitude is None:
                    missing_coords.append("current_user")
                if other_user.latitude is None or other_user.longitude is None:
                    missing_coords.append(f"{other_user.first_name}")
                print(f"DEBUG: Skipping distance filter for {other_user.first_name} - coordinates missing ({', '.join(missing_coords)})")
        
        # Zodiac sign filter REMOVED - no filtering by zodiac sign

        # Check if already liked or matched
        already_liked = Like.query.filter_by(
            liker_id=user_id, 
            liked_id=other_user.id
        ).first()
        
        already_matched = Match.query.filter(
            ((Match.user1_id == user_id) & (Match.user2_id == other_user.id)) |
            ((Match.user1_id == other_user.id) & (Match.user2_id == user_id))
        ).first()
        
        if already_liked or already_matched:
            print(f"DEBUG: Filtered out {other_user.first_name} - already liked/matched")
            continue
        
        breakdown = json.loads(comp.breakdown) if comp.breakdown else {}
        # Debug compatibility scores per match
        try:
            print(
                f"DEBUG: Compatibility for {other_user.first_name} {other_user.last_name} - "
                f"overall: {comp.overall_score}, deepmatch: {comp.deepmatch_score}, zodiac: {comp.zodiac_score}"
            )
        except Exception as e:
            print(f"DEBUG: Error logging compatibility for {other_user.id}: {e}")
        print(f"DEBUG: ✅ Including {other_user.first_name} {other_user.last_name} in matches")
        
        # Get zodiac_sign from User, fallback to QuizResult if not set
        zodiac_sign = other_user.zodiac_sign
        if not zodiac_sign:
            other_quiz = QuizResult.query.filter_by(user_id=other_user.id).first()
            if other_quiz:
                zodiac_sign = other_quiz.zodiac_sign
        
        print(f"📸 Returning profile for {other_user.first_name} {other_user.last_name}, profile_picture: {other_user.profile_picture}")
        matches.append({
                'id': other_user.id,
                'name': f"{other_user.first_name} {other_user.last_name}".strip(),
                'age': other_user.age,
                'height': other_user.height,
                'gender': other_user.gender,
                'bio': other_user.bio,
                'location': other_user.location,
                'profile_picture': other_user.profile_picture,
                'intention': other_user.dating_intention,
                'zodiac_sign': zodiac_sign,
                'photos': json.loads(other_user.photos) if other_user.photos else [],
                'compatibility': {
                    'overall': comp.overall_score,
                    'deepmatch': comp.deepmatch_score,
                    'zodiac': comp.zodiac_score,
                    'breakdown': breakdown
                }
            })
    
    print(f"DEBUG: Returning {len(matches)} matches")
    return jsonify({'matches': matches})

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)

    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401

    # Fetch unread notifications
    notifications = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).order_by(Notification.created_at.desc()).all()

    valid_notifications = []

    # Get existing matches to avoid duplicate notifications
    existing_matches = Match.query.filter(
        ((Match.user1_id == user_id) | (Match.user2_id == user_id)),
        Match.is_active == True
    ).all()

    matched_user_ids = set()
    for match in existing_matches:
        other_user_id = match.user2_id if match.user1_id == user_id else match.user1_id
        matched_user_ids.add(other_user_id)

    for notif in notifications:
        # Skip users already matched
        if notif.from_user_id in matched_user_ids:
            continue

        from_user = db.session.get(User, notif.from_user_id)
        if not from_user or not from_user.first_name:
            continue

        # ✅ RESTORE COMPATIBILITY (THIS WAS THE ROOT CAUSE)
        compatibility_info = None

        if notif.type in ['like', 'rose']:
            compatibility = CompatibilityScore.query.filter_by(
                user1_id=user_id,
                user2_id=from_user.id
            ).first()

            if compatibility:
                compatibility_info = {
                    'score': compatibility.overall_score,
                    'type': 'Overall'
                }

        valid_notifications.append({
            'id': notif.id,
            'type': notif.type,
            'message': notif.message,
            'from_user': {
                'id': from_user.id,
                'name': f"{from_user.first_name} {from_user.last_name}".strip(),
                'profile_picture': from_user.profile_picture,
                'age': from_user.age,
                'bio': from_user.bio,
                'location': from_user.location
            },
            'compatibility': compatibility_info,   # ✅ FIXED
            'created_at': notif.created_at.isoformat(),  # frontend
            '_created_at': notif.created_at,              # backend-only
            'priority': 1 if notif.type == 'rose' else 0  # 🌹 rose > like
        })

    # ✅ SORT: ROSE FIRST, NEWEST FIRST
    valid_notifications.sort(
        key=lambda x: (-x['priority'], x['_created_at']),
        reverse=True
    )

    # ✅ CLEAN INTERNAL FIELD
    for n in valid_notifications:
        n.pop('_created_at', None)

    return jsonify({'notifications': valid_notifications})


@app.route('/api/notifications/<int:notification_id>/accept', methods=['POST'])
def accept_notification(notification_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    notification = db.session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'error': 'Notification not found'}), 404
    
    # Check if already matched
    existing_match = Match.query.filter(
        ((Match.user1_id == user_id) & (Match.user2_id == notification.from_user_id)) |
        ((Match.user1_id == notification.from_user_id) & (Match.user2_id == user_id))
    ).first()
    
    if existing_match:
        # Mark ALL unread notifications from this user as read
        Notification.query.filter_by(
            user_id=user_id,
            from_user_id=notification.from_user_id,
            is_read=False
        ).update({'is_read': True})
        db.session.commit()
        return jsonify({
            'message': 'Already matched',
            'match_id': existing_match.id
        })
    
    # Create match
    match = Match(
        user1_id=min(user_id, notification.from_user_id),
        user2_id=max(user_id, notification.from_user_id)
    )
    db.session.add(match)
    db.session.flush()  # Get the match ID
    
    # Mark ALL unread notifications from this user as read (prevents duplicates)
    # This includes the current notification and any other like/rose notifications from the same user
    Notification.query.filter_by(
        user_id=user_id,
        from_user_id=notification.from_user_id,
        is_read=False
    ).update({'is_read': True})
    
    # Create match notification for the other user
    current_user = db.session.get(User, user_id)
    match_notification = Notification(
        user_id=notification.from_user_id,
        from_user_id=user_id,
        type='match',
        message=f"It's a match with {current_user.first_name}!"
    )
    db.session.add(match_notification)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Match created successfully',
        'match_id': match.id
    })

@app.route('/api/notifications/<int:notification_id>/decline', methods=['POST'])
def decline_notification(notification_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    notification = db.session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'error': 'Notification not found'}), 404
    
    # Mark ALL unread notifications from this user as read (prevents duplicates)
    Notification.query.filter_by(
        user_id=user_id,
        from_user_id=notification.from_user_id,
        is_read=False
    ).update({'is_read': True})
    
    db.session.commit()
    
    return jsonify({'message': 'Notification declined'})

# Get user's roses count
@app.route('/api/roses/count', methods=['GET'])
def get_roses_count():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    # For now, return a fixed count (you can implement daily reset logic later)
    roses_sent_today = Rose.query.filter_by(sender_id=user_id).count()
    roses_left = max(0, 3 - roses_sent_today)  # 3 roses per day
    
    return jsonify({'roses_left': roses_left})

# Mark notification as read
@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    notification = db.session.get(Notification, notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'error': 'Notification not found'}), 404
    
    notification.is_read = True
    db.session.commit()
    
    return jsonify({'message': 'Notification marked as read'})

# Email Verification Endpoints
@app.route('/api/verify-email', methods=['GET'])
def verify_email():
    """Verify user email using token from email link"""
    try:
        token = request.args.get('token')
        
        if not token:
            return jsonify({'error': 'Verification token is required'}), 400
        
        # Find user by verification token
        user = User.query.filter_by(email_verification_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid or expired verification token'}), 400
        
        # Check if token has expired
        if user.verification_token_expiry and user.verification_token_expiry < datetime.utcnow():
            return jsonify({'error': 'Verification token has expired. Please request a new one.'}), 400
        
        # Check if already verified
        if user.is_verified:
            return jsonify({'message': 'Email already verified. You can now log in.'}), 200
        
        # Verify the user
        user.is_verified = True
        user.email_verification_token = None
        user.verification_token_expiry = None
        db.session.commit()
        
        return jsonify({
            'message': 'Email verified successfully! You can now log in.',
            'verified': True
        }), 200
        
    except Exception as e:
        print(f'Email verification error: {str(e)}')
        return jsonify({'error': 'An error occurred during verification. Please try again.'}), 500

@app.route('/api/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email to user"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Don't reveal if email exists or not for security
            return jsonify({
                'message': 'If an account exists with this email, a verification link has been sent.'
            }), 200
        
        # Check if already verified
        if user.is_verified:
            return jsonify({'message': 'Email is already verified. You can log in.'}), 200
        
        # Generate new verification token
        verification_token = generate_verification_token()
        token_expiry = datetime.utcnow() + timedelta(hours=24)
        
        user.email_verification_token = verification_token
        user.verification_token_expiry = token_expiry
        db.session.commit()
        
        # Send verification email
        email_sent = send_verification_email(user.email, user.username, verification_token)
        
        if email_sent:
            return jsonify({
                'message': 'Verification email sent successfully. Please check your inbox.'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send verification email. Please try again later.'
            }), 500
        
    except Exception as e:
        print(f'Resend verification error: {str(e)}')
        return jsonify({'error': 'An error occurred. Please try again.'}), 500

# =============================
# 🚨 REPORT USER
# =============================
@app.route("/api/report-user", methods=["POST"])
def report_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    reporter_id = verify_token(token)

    if not reporter_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    reported_user_id = data.get("reported_user_id")
    reason = data.get("reason")

    if not reported_user_id or not reason:
        return jsonify({"error": "Missing fields"}), 400

    report = UserReport(
        reporter_id=reporter_id,
        reported_user_id=reported_user_id,
        reason=reason
    )

    db.session.add(report)
    db.session.commit()
    # Notify admin (best-effort)
    try:
        send_admin_notification(report.reporter_id, report.reported_user_id, report.reason, report.id)
    except Exception as e:
        print(f"⚠️ send_admin_notification error: {e}")

    return jsonify({"message": "User reported successfully", "report_id": report.id})

# =============================
# 🚫 BLOCK USER
# =============================
@app.route("/api/block-user", methods=["POST"])
def block_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    blocker_id = verify_token(token)

    if not blocker_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    blocked_user_id = data.get("blocked_user_id")

    if not blocked_user_id:
        return jsonify({"error": "User ID required"}), 400

    # Check already blocked
    existing = UserBlock.query.filter_by(
        blocker_id=blocker_id,
        blocked_user_id=blocked_user_id
    ).first()

    if existing:
        return jsonify({"message": "User already blocked"})

    block = UserBlock(
        blocker_id=blocker_id,
        blocked_user_id=blocked_user_id
    )

    db.session.add(block)

    # 🔥 Deactivate match if exists
    match = Match.query.filter(
        ((Match.user1_id == blocker_id) & (Match.user2_id == blocked_user_id)) |
        ((Match.user1_id == blocked_user_id) & (Match.user2_id == blocker_id))
    ).first()

    if match:
        match.is_active = False

    db.session.commit()

    return jsonify({"message": "User blocked successfully"})

# =============================
# 🔓 UNBLOCK USER
# =============================
@app.route("/api/unblock-user", methods=["POST"])
def unblock_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    blocker_id = verify_token(token)

    if not blocker_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    blocked_user_id = data.get("blocked_user_id")

    block = UserBlock.query.filter_by(
        blocker_id=blocker_id,
        blocked_user_id=blocked_user_id
    ).first()

    if not block:
        return jsonify({"error": "Block not found"}), 404

    db.session.delete(block)
    db.session.commit()

    return jsonify({"message": "User unblocked"})


# =============================
# 🛡️ ADMIN — VIEW REPORTS
# =============================
@app.route("/api/admin/reports", methods=["GET"])
def admin_reports():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    user = db.session.get(User, user_id)

    admin_email = os.environ.get("ADMIN_EMAIL", "deepmatch.noreply@gmail.com")
    if not user or (not getattr(user, "is_admin", False) and user.email != admin_email):
        return jsonify({"error": "Admin access required"}), 403

    reports = UserReport.query.order_by(UserReport.created_at.desc()).all()

    report_list = []

    for r in reports:
        reporter = db.session.get(User, r.reporter_id)
        reported = db.session.get(User, r.reported_user_id)

        report_list.append({
            "id": r.id,
            "reporter": reporter.username if reporter else None,
            "reporter_id": reporter.id if reporter else r.reporter_id,
            "reporter_email": reporter.email if reporter else None,
            "reported": reported.username if reported else None,
            "reported_id": reported.id if reported else r.reported_user_id,
            "reported_email": reported.email if reported else None,
            "reported_is_banned": getattr(reported, "is_banned", False) if reported else False,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        })

    return jsonify({"reports": report_list})


# =============================
# ✅ RESOLVE REPORT
# =============================
@app.route("/api/admin/reports/<int:report_id>/resolve", methods=["POST"])
def resolve_report(report_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    user = db.session.get(User, user_id)

    admin_email = os.environ.get("ADMIN_EMAIL", "deepmatch.noreply@gmail.com")
    if not user or (not getattr(user, "is_admin", False) and user.email != admin_email):
        return jsonify({"error": "Admin access required"}), 403

    report = UserReport.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    data = request.get_json() or {}
    ban_user = bool(data.get("ban", False))
    admin_note = data.get("admin_note")

    report.status = "resolved"
    db.session.add(report)

    # If admin requested ban, perform ban on reported user
    if ban_user:
        reported = db.session.get(User, report.reported_user_id)
        if reported:
            reported.is_banned = True
            reported.ban_reason = admin_note or "Banned by admin review"
            reported.banned_at = datetime.utcnow()
            db.session.add(reported)

            # Deactivate any matches involving this user
            matches = Match.query.filter(
                (Match.user1_id == reported.id) | (Match.user2_id == reported.id)
            ).all()
            for m in matches:
                m.is_active = False
                db.session.add(m)

            # Record admin action
            action = AdminAction(
                admin_id=user.id,
                action="ban_user",
                target_user_id=reported.id,
                report_id=report.id,
                note=admin_note
            )
            db.session.add(action)

    # Record resolve action
    resolve_action = AdminAction(
        admin_id=user.id,
        action="resolve_report",
        target_user_id=report.reported_user_id,
        report_id=report.id,
        note=admin_note
    )
    db.session.add(resolve_action)

    db.session.commit()

    return jsonify({"message": "Report resolved", "ban_performed": ban_user})


# =============================
# ✅ ADMIN — BAN / UNBAN USER
# =============================
@app.route("/api/admin/users/<int:target_user_id>/ban", methods=["POST"])
def admin_ban_user(target_user_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    user = db.session.get(User, user_id)
    admin_email = os.environ.get("ADMIN_EMAIL", "deepmatch.noreply@gmail.com")
    if not user or (not getattr(user, "is_admin", False) and user.email != admin_email):
        return jsonify({"error": "Admin access required"}), 403

    target = db.session.get(User, target_user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "Banned by admin")

    target.is_banned = True
    target.ban_reason = reason
    target.banned_at = datetime.utcnow()
    db.session.add(target)

    # Deactivate matches involving this user
    matches = Match.query.filter(
        (Match.user1_id == target.id) | (Match.user2_id == target.id)
    ).all()
    for m in matches:
        m.is_active = False
        db.session.add(m)

    action = AdminAction(
        admin_id=user.id,
        action="ban_user",
        target_user_id=target.id,
        note=reason
    )
    db.session.add(action)
    db.session.commit()

    return jsonify({"message": "User banned", "user_id": target.id})


@app.route("/api/admin/users/<int:target_user_id>/unban", methods=["POST"])
def admin_unban_user(target_user_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    user = db.session.get(User, user_id)
    admin_email = os.environ.get("ADMIN_EMAIL", "deepmatch.noreply@gmail.com")
    if not user or (not getattr(user, "is_admin", False) and user.email != admin_email):
        return jsonify({"error": "Admin access required"}), 403

    target = db.session.get(User, target_user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404

    target.is_banned = False
    target.ban_reason = None
    target.banned_at = None
    db.session.add(target)

    action = AdminAction(
        admin_id=user.id,
        action="unban_user",
        target_user_id=target.id,
        note="Unbanned by admin"
    )
    db.session.add(action)
    db.session.commit()

    return jsonify({"message": "User unbanned", "user_id": target.id})



# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Dating app backend is running!'})


def migrate_database():
    """Add new columns if they don't exist (works with both SQLite and PostgreSQL)"""
    try:
        with app.app_context():
            from sqlalchemy import inspect, text
            from sqlalchemy.exc import OperationalError, ProgrammingError
            
            inspector = inspect(db.engine)
            
            # Get table name - handle both SQLite and PostgreSQL
            is_postgres = 'postgresql' in str(db.engine.url)
            table_name = '"user"' if is_postgres else 'user'
            
            try:
                columns = [col['name'] for col in inspector.get_columns('user')]
            except Exception:
                # If we can't inspect, try a different approach
                columns = []
            
            # Helper function to add column safely
            def add_column_if_not_exists(col_name, col_type):
                if col_name not in columns:
                    try:
                        print(f"🔄 Adding {col_name} column...")
                        if is_postgres:
                            # Check if column exists using information_schema
                            result = db.session.execute(text(
                                f"SELECT column_name FROM information_schema.columns "
                                f"WHERE table_name='user' AND column_name='{col_name}'"
                            )).fetchone()
                            if not result:
                                db.session.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}'))
                                db.session.commit()
                                print(f"✅ {col_name} column added")
                            else:
                                print(f"✅ {col_name} column already exists")
                        else:
                            # SQLite - use PRAGMA to check
                            result = db.session.execute(text(f"PRAGMA table_info(user)")).fetchall()
                            existing_cols = [row[1] for row in result]
                            if col_name not in existing_cols:
                                db.session.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                                db.session.commit()
                                print(f"✅ {col_name} column added")
                            else:
                                print(f"✅ {col_name} column already exists")
                    except (OperationalError, ProgrammingError) as e:
                        if 'duplicate' in str(e).lower() or 'already exists' in str(e).lower():
                            print(f"✅ {col_name} column already exists")
                        else:
                            raise
                else:
                    print(f"✅ {col_name} column already exists")
            
            # Migrate basic columns (safe for both Postgres and SQLite)
            add_column_if_not_exists('latitude', 'REAL')
            add_column_if_not_exists('longitude', 'REAL')
            add_column_if_not_exists('photos', 'TEXT')

            # Postgres-only migrations for admin/ban/audit fields and tables
            if is_postgres:
                add_column_if_not_exists('is_admin', 'BOOLEAN DEFAULT FALSE')
                add_column_if_not_exists('is_banned', 'BOOLEAN DEFAULT FALSE')
                add_column_if_not_exists('ban_reason', 'TEXT')
                add_column_if_not_exists('banned_at', 'TIMESTAMP')

                # Create admin_action table if it doesn't exist (Postgres)
                try:
                    db.session.execute(text("""
                    CREATE TABLE IF NOT EXISTS admin_action (
                        id SERIAL PRIMARY KEY,
                        admin_id INTEGER NOT NULL,
                        action VARCHAR(50),
                        target_user_id INTEGER,
                        report_id INTEGER,
                        note TEXT,
                        created_at TIMESTAMP DEFAULT now()
                    );
                    """))
                    db.session.commit()
                    print("✅ admin_action table ensured (Postgres)")
                except Exception as e:
                    print(f"⚠️ Could not ensure admin_action table: {e}")
                    db.session.rollback()
            else:
                print("ℹ️ Skipping admin/ban/audit migrations for non-Postgres DB")
                
    except Exception as e:
        print(f"⚠️ Migration error: {e}")
        try:
            db.session.rollback()
        except:
            pass


# Run migration on startup
# Ensure all tables exist before attempting migrations (prevents ALTER on missing tables)
with app.app_context():
    try:
        db.create_all()
        print("✅ Created missing tables (if any).")
    except Exception as e:
        print(f"⚠️ create_all() warning: {e}")

# Run migrations (adds columns safely)
migrate_database()


@socketio.on("connect")
def handle_connect(auth):
    user_id = None

    # 1️⃣ get userId
    if auth and isinstance(auth, dict):
        user_id = auth.get("userId")

    if not user_id:
        user_id = request.args.get("userId")

    if not user_id:
        logging.warning("⚠️ Socket connected without userId")
        return False

    user_id = int(user_id)

    # ✅ SAFE overwrite (supports reconnect)
    connected_users[user_id] = request.sid
    logging.info(f"User {user_id} connected | SID: {request.sid}")

    # ✅ join personal room
    join_room(f"user_{user_id}")

    # ✅ join match rooms
@socketio.on("connect")
def handle_connect(auth):
    user_id = None

    # 1️⃣ Get userId from auth (socket.io-client auth)
    if auth and isinstance(auth, dict):
        user_id = auth.get("userId")

    # fallback (old style)
    if not user_id:
        user_id = request.args.get("userId")

    if not user_id:
        logging.warning("⚠️ Socket connected without userId")
        return False

    user_id = int(user_id)

    # 2️⃣ Track connected user (reconnect-safe)
    connected_users[user_id] = request.sid
    logging.info(f"🟢 User {user_id} connected | SID: {request.sid}")

    # 3️⃣ JOIN PERSONAL ROOM
    join_room(f"user_{user_id}")

    # 4️⃣ AUTO-JOIN ALL MATCH ROOMS 🔥🔥🔥
    matches = Match.query.filter(
        (Match.user1_id == user_id) | (Match.user2_id == user_id),
        Match.is_active == True
    ).all()

    for match in matches:
        join_room(f"match_{match.id}")
        logging.info(f"🔗 Joined match room: match_{match.id}")

    # 5️⃣ Broadcast online status
    emit(
        "user_status",
        {"userId": user_id, "isOnline": True},
        broadcast=True,
        include_self=False
    )



@socketio.on("get_online_users")
def get_online_users():
    online_user_ids = list(connected_users.keys())
    emit("online_users", online_user_ids)


@socketio.on("disconnect")
def handle_disconnect():
    user_id = None

    for uid, sid in list(connected_users.items()):
        if sid == request.sid:
            user_id = uid
            connected_users.pop(uid, None)
            break

    if not user_id:
        return

    emit(
        "user_status",
        {
            "userId": user_id,
            "isOnline": False,
            "lastSeen": datetime.utcnow().isoformat()
        },
        broadcast=True
    )

    logging.info(f"User {user_id} disconnected")



@socketio.on("join_user")
def join_user(data):
    user_id = data.get("userId")
    if not user_id:
        return

    join_room(f"user_{user_id}")
    logging.info(f"User joined personal room: user_{user_id}")


@socketio.on('join_chat')
def handle_join_chat(data):
    room = data.get('room')
    if room:
        join_room(room)


@socketio.on('leave_chat')
def handle_leave_chat(data):
    room = data.get('room')
    if room:
        leave_room(room)


@socketio.on('send_message')
def handle_send_message(data):
    room = data['room']
    message = data['message']

    emit('receive_message', message, room=room)

@socketio.on("typing")
def handle_typing(data):
    room = data.get("room")
    user_id = data.get("userId")

    emit(
        "user_typing",
        {"userId": user_id},
        room=room,
        include_self=False
    )


@socketio.on("stop_typing")
def handle_stop_typing(data):
    room = data.get("room")
    user_id = data.get("userId")

    emit(
        "user_stop_typing",
        {"userId": user_id},
        room=room,
        include_self=False
    )

@socketio.on("seen_message")
def handle_seen_message(data):
    room = data.get("room")
    logging.info(f"Seen event in room: {room}")

    emit(
        "message_seen",
        {"room": room},
        room=room,
        include_self=False
    )




@app.route("/api/messages/upload", methods=["POST"])
def upload_media():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = verify_token(token)

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    media_type = request.form.get("type")

    try:
        # 📂 Create temp folder if needed
        os.makedirs("temp_uploads", exist_ok=True)

        # Save temp file for NSFW scanning
        temp_filename = f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}"
        temp_path = os.path.join("temp_uploads", temp_filename)
        file.save(temp_path)

        # 🔍 NSFW Scan (images only)
        if media_type == "image":
            is_nsfw, confidence, details = scan_image_nsfw(temp_path)

            if is_nsfw:
                os.remove(temp_path)
                return jsonify({
                    "error": "NSFW_CONTENT_DETECTED",
                    "confidence": confidence,
                    "details": details
                }), 403

        # ☁️ Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            temp_path,
            folder="deepmatch_media",
            resource_type="auto"  # supports image/audio/video
        )

        # Delete temp file after upload
        os.remove(temp_path)

        media_url = upload_result["secure_url"]

        return jsonify({
            "url": media_url,
            "type": media_type,
            "cloudinary": True
        })

    except Exception as e:
        print(f"Upload error: {str(e)}")
        return jsonify({
            "error": "Upload failed",
            "details": str(e)
        }), 500



if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    logging.info("🚀 Starting Socket.IO server...")    
    socketio.run(app, host="0.0.0.0", port=5000)



