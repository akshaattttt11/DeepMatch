from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import json
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dating_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)  # Enable CORS for React Native

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Profile information
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    
    # Dating preferences
    looking_for = db.Column(db.String(20))  # male, female, both
    min_age = db.Column(db.Integer)
    max_age = db.Column(db.Integer)
    
    # Profile pictures (store URLs)
    profile_picture = db.Column(db.String(200))
    
    # Enneagram and zodiac
    enneagram_type = db.Column(db.Integer)
    zodiac_sign = db.Column(db.String(20))

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
    
    completed_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

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
    
    calculated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Ensure unique pairs
    __table_args__ = (db.UniqueConstraint('user1_id', 'user2_id', name='unique_user_pair'),)

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    matched_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    liker_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    liked_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(50))  # 'like', 'match', 'message'
    message = db.Column(db.String(200))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Helper function to generate JWT token
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

# Helper function to verify JWT token
def verify_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

# Compatibility Calculation Functions
def calculate_mbti_compatibility(mbti1, mbti2):
    """Calculate MBTI compatibility score (0-100)"""
    if not mbti1 or not mbti2:
        return 50  # Default score if missing
    
    # MBTI compatibility matrix (simplified)
    compatibility_matrix = {
        'INTJ': {'ENTP': 95, 'ENFP': 90, 'INTP': 85, 'INFJ': 80, 'ENTJ': 75},
        'INTP': {'ENTJ': 95, 'ENFJ': 90, 'INTJ': 85, 'ENTP': 80, 'INFJ': 75},
        'ENTJ': {'INTP': 95, 'INFP': 90, 'ENTP': 85, 'INTJ': 75, 'ENFP': 70},
        'ENTP': {'INTJ': 95, 'INFJ': 90, 'INTP': 80, 'ENTJ': 85, 'ENFP': 75},
        'INFJ': {'ENTP': 90, 'ENFP': 85, 'INTJ': 80, 'INFP': 75, 'ENTJ': 70},
        'INFP': {'ENTJ': 90, 'ENFJ': 85, 'INFJ': 75, 'ENFP': 80, 'INTP': 70},
        'ENFJ': {'INFP': 90, 'INTP': 85, 'ENFP': 80, 'INFJ': 75, 'ENTP': 70},
        'ENFP': {'INTJ': 90, 'INFJ': 85, 'INFP': 80, 'ENTP': 75, 'ENFJ': 80}
    }
    
    return compatibility_matrix.get(mbti1, {}).get(mbti2, 60)  # Default 60 if not found

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
        max_age=data.get('max_age', 100)
    )
    
    db.session.add(user)
    db.session.commit()
    
    # Generate token
    token = generate_token(user.id)
    
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
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
                'bio': user.bio
            }
        })
    
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/profile', methods=['GET'])
def get_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'age': user.age,
        'gender': user.gender,
        'bio': user.bio,
        'location': user.location,
        'looking_for': user.looking_for,
        'min_age': user.min_age,
        'max_age': user.max_age,
        'profile_picture': user.profile_picture,
        'enneagram_type': user.enneagram_type,
        'zodiac_sign': user.zodiac_sign
    })

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'age' in data:
        user.age = data['age']
    if 'gender' in data:
        user.gender = data['gender']
    if 'bio' in data:
        user.bio = data['bio']
    if 'location' in data:
        user.location = data['location']
    if 'looking_for' in data:
        user.looking_for = data['looking_for']
    if 'min_age' in data:
        user.min_age = data['min_age']
    if 'max_age' in data:
        user.max_age = data['max_age']
    if 'enneagram_type' in data:
        user.enneagram_type = data['enneagram_type']
    if 'zodiac_sign' in data:
        user.zodiac_sign = data['zodiac_sign']
    
    db.session.commit()
    
    return jsonify({'message': 'Profile updated successfully'})

@app.route('/api/users', methods=['GET'])
def get_users():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    current_user = User.query.get(user_id)
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
    
    # Create notification for the liked user
    liker_user = User.query.get(user_id)
    notification = Notification(
        user_id=liked_id,
        from_user_id=user_id,
        type='like',
        message=f"{liker_user.first_name} liked your profile!"
    )
    db.session.add(notification)
    
    # Check for mutual like (match)
    mutual_like = Like.query.filter_by(
        liker_id=liked_id, 
        liked_id=user_id
    ).first()
    
    if mutual_like:
        # Create match
        match = Match(user1_id=min(user_id, liked_id), user2_id=max(user_id, liked_id))
        db.session.add(match)
        
        # Create match notification
        match_notification = Notification(
            user_id=liked_id,
            from_user_id=user_id,
            type='match',
            message=f"It's a match with {liker_user.first_name}!"
        )
        db.session.add(match_notification)
        
        db.session.commit()
        
        return jsonify({
            'message': 'It\'s a match!',
            'matched': True
        })
    
    db.session.commit()
    return jsonify({'message': 'User liked successfully', 'matched': False})

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
        other_user = User.query.get(other_user_id)
        
        if other_user:
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
    match = Match.query.get(match_id)
    if not match or (match.user1_id != user_id and match.user2_id != user_id):
        return jsonify({'error': 'Match not found'}), 404
    
    # Get messages between users
    messages = Message.query.filter(
        ((Message.sender_id == match.user1_id) & (Message.receiver_id == match.user2_id)) |
        ((Message.sender_id == match.user2_id) & (Message.receiver_id == match.user1_id))
    ).order_by(Message.sent_at).all()
    
    message_list = []
    for message in messages:
        message_list.append({
            'id': message.id,
            'content': message.content,
            'sender_id': message.sender_id,
            'sent_at': message.sent_at.isoformat(),
            'is_read': message.is_read
        })
    
    return jsonify({'messages': message_list})

@app.route('/api/messages', methods=['POST'])
def send_message():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    data = request.get_json()
    receiver_id = data.get('receiver_id')
    content = data.get('content')
    
    if not receiver_id or not content:
        return jsonify({'error': 'receiver_id and content are required'}), 400
    
    # Verify users are matched
    match = Match.query.filter(
        ((Match.user1_id == user_id) & (Match.user2_id == receiver_id)) |
        ((Match.user1_id == receiver_id) & (Match.user2_id == user_id)),
        Match.is_active == True
    ).first()
    
    if not match:
        return jsonify({'error': 'Users are not matched'}), 400
    
    # Create message
    message = Message(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=content
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify({
        'message': 'Message sent successfully',
        'message_id': message.id
    }), 201

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
    
    db.session.commit()
    
    # Calculate compatibility with all other users
    calculate_all_compatibilities(user_id)
    
    return jsonify({'message': 'Quiz submitted successfully'})

def calculate_all_compatibilities(user_id):
    """Calculate compatibility scores with all other users"""
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
        
        # Create or update compatibility score
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
    
    db.session.commit()

@app.route('/api/compatible-matches', methods=['GET'])
def get_compatible_matches():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get compatibility scores for current user with gender filtering
    compatibilities = CompatibilityScore.query.filter_by(user1_id=user_id).order_by(
        CompatibilityScore.overall_score.desc()
    ).limit(20).all()
    
    matches = []
    for comp in compatibilities:
        other_user = User.query.get(comp.user2_id)
        if other_user:
            # Gender-based filtering: show opposite gender only
            current_gender = (current_user.gender or '').strip().lower()
            other_gender = (other_user.gender or '').strip().lower()
            is_opposite_gender = (
                (current_gender == 'male' and other_gender == 'female') or
                (current_gender == 'female' and other_gender == 'male')
            )
            
            if is_opposite_gender:
                # Check if already liked or matched
                already_liked = Like.query.filter_by(
                    liker_id=user_id, 
                    liked_id=other_user.id
                ).first()
                
                already_matched = Match.query.filter(
                    ((Match.user1_id == user_id) & (Match.user2_id == other_user.id)) |
                    ((Match.user1_id == other_user.id) & (Match.user2_id == user_id))
                ).first()
                
                if not already_liked and not already_matched:
                    breakdown = json.loads(comp.breakdown) if comp.breakdown else {}
                    
                    matches.append({
                        'id': other_user.id,
                        'name': f"{other_user.first_name} {other_user.last_name}".strip(),
                        'age': other_user.age,
                        'gender': other_user.gender,
                        'bio': other_user.bio,
                        'location': other_user.location,
                        'profile_picture': other_user.profile_picture,
                        'compatibility': {
                            'overall': comp.overall_score,
                            'deepmatch': comp.deepmatch_score,
                            'zodiac': comp.zodiac_score,
                            'breakdown': breakdown
                        }
                    })
    
    return jsonify({'matches': matches})

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Get unread notifications
    notifications = Notification.query.filter_by(
        user_id=user_id, 
        is_read=False
    ).order_by(Notification.created_at.desc()).all()
    
    notification_list = []
    for notif in notifications:
        from_user = User.query.get(notif.from_user_id)
        if from_user:
            notification_list.append({
                'id': notif.id,
                'type': notif.type,
                'message': notif.message,
                'from_user': {
                    'id': from_user.id,
                    'name': f"{from_user.first_name} {from_user.last_name}".strip(),
                    'profile_picture': from_user.profile_picture
                },
                'created_at': notif.created_at.isoformat()
            })
    
    return jsonify({'notifications': notification_list})

@app.route('/api/notifications/<int:notification_id>/accept', methods=['POST'])
def accept_notification(notification_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'error': 'Notification not found'}), 404
    
    # Create match
    match = Match(
        user1_id=min(user_id, notification.from_user_id),
        user2_id=max(user_id, notification.from_user_id)
    )
    db.session.add(match)
    
    # Mark notification as read
    notification.is_read = True
    
    db.session.commit()
    
    return jsonify({'message': 'Match created successfully'})

@app.route('/api/notifications/<int:notification_id>/decline', methods=['POST'])
def decline_notification(notification_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = verify_token(token)
    
    if not user_id:
        return jsonify({'error': 'Invalid token'}), 401
    
    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user_id:
        return jsonify({'error': 'Notification not found'}), 404
    
    # Mark notification as read
    notification.is_read = True
    
    db.session.commit()
    
    return jsonify({'message': 'Notification declined'})

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Dating app backend is running!'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 