from app import app, db, User, QuizResult, calculate_all_compatibilities
from werkzeug.security import generate_password_hash
import json
import random

def create_seed_users():
    """Create sample users with quiz results for testing"""
    
    # Sample user data with your friends' names
    sample_users = [
        {
            'username': 'akshat_shetye',
            'email': 'akshat@example.com',
            'password': 'password123',
            'first_name': 'Akshat',
            'last_name': 'Shetye',
            'age': 20,
            'height': "5'6\"",  # Height in feet'inches" format
            'gender': 'male',
            'bio': 'Tech enthusiast and fitness lover. Always up for a good conversation! 💻',
            'location': 'Mumbai, India',
            'looking_for': 'female',
            'dating_intention': 'Long Term',
            'min_age': 20,
            'max_age': 30,
            'profile_picture': 'akshat.jpg',
            'quiz_data': {
                'mbti_type': 'ENFP',
                'enneagram_type': 'Type 7',
                'love_language': 'Quality Time',
                'psychological_traits': {'openness': 85, 'conscientiousness': 70, 'extraversion': 90, 'agreeableness': 80, 'neuroticism': 30},
                'zodiac_sign': 'Taurus',
                'zodiac_answers': {'element': 'Air', 'quality': 'Mutable', 'ruler': 'Mercury'}
            }
        },
        {
            'username': 'arya_bansode',
            'email': 'arya@example.com',
            'password': 'password123',
            'first_name': 'Arya',
            'last_name': 'Bansode',
            'age': 21,
            'height': "5'7\"",
            'gender': 'male',
            'bio': 'Love traveling and trying new cuisines. Looking for someone to share adventures with! 🌍',
            'location': 'Mumbai, India',
            'looking_for': 'female',
            'dating_intention': 'Casual',
            'min_age': 21,
            'max_age': 28,
            'profile_picture': 'arya.jpg',
            'quiz_data': {
                'mbti_type': 'INTJ',
                'enneagram_type': 'Type 5',
                'love_language': 'Acts of Service',
                'psychological_traits': {'openness': 75, 'conscientiousness': 90, 'extraversion': 40, 'agreeableness': 70, 'neuroticism': 25},
                'zodiac_sign': 'Capricorn',
                'zodiac_answers': {'element': 'Earth', 'quality': 'Cardinal', 'ruler': 'Saturn'}
            }
        },
        {
            'username': 'zion_john',
            'email': 'zion@example.com',
            'password': 'password123',
            'first_name': 'Zion',
            'last_name': 'John',
            'age': 20,
            'height': "5'11\"",
            'gender': 'male',
            'bio': 'Artist and nature lover. Looking for someone who appreciates the little things in life 🎨',
            'location': 'Kerala, India',
            'looking_for': 'female',
            'dating_intention': 'Short Term',
            'min_age': 20,
            'max_age': 30,
            'profile_picture': 'zion.jpg',
            'quiz_data': {
                'mbti_type': 'INFP',
                'enneagram_type': 'Type 4',
                'love_language': 'Words of Affirmation',
                'psychological_traits': {'openness': 95, 'conscientiousness': 60, 'extraversion': 45, 'agreeableness': 85, 'neuroticism': 50},
                'zodiac_sign': 'Pisces',
                'zodiac_answers': {'element': 'Water', 'quality': 'Mutable', 'ruler': 'Neptune'}
            }
        },
        {
            'username': 'harshal_khade',
            'email': 'harshal@example.com',
            'password': 'password123',
            'first_name': 'Harshal',
            'last_name': 'Khade',
            'age': 21,
            'height': "5'8\"",
            'gender': 'male',
            'bio': 'Sports enthusiast and music lover. Let\'s explore the city together! ⚽',
            'location': 'Mumbai, India',
            'looking_for': 'female',
            'dating_intention': 'Casual',
            'min_age': 21,
            'max_age': 28,
            'profile_picture': 'harshal.jpg',
            'quiz_data': {
                'mbti_type': 'ESFP',
                'enneagram_type': 'Type 7',
                'love_language': 'Physical Touch',
                'psychological_traits': {'openness': 70, 'conscientiousness': 65, 'extraversion': 95, 'agreeableness': 75, 'neuroticism': 35},
                'zodiac_sign': 'Leo',
                'zodiac_answers': {'element': 'Fire', 'quality': 'Fixed', 'ruler': 'Sun'}
            }
        },
        {
            'username': 'archee_patel',
            'email': 'archee@example.com',
            'password': 'password123',
            'first_name': 'Archee',
            'last_name': 'Patel',
            'age': 20,
            'height': "5'4\"",
            'gender': 'female',
            'bio': 'Bookworm and coffee addict. Looking for intellectual conversations! 📚',
            'location': 'Gujarat, India',
            'looking_for': 'male',
            'dating_intention': 'Long Term',
            'min_age': 20,
            'max_age': 30,
            'profile_picture': 'archee.jpg',
            'quiz_data': {
                'mbti_type': 'INFJ',
                'enneagram_type': 'Type 1',
                'love_language': 'Quality Time',
                'psychological_traits': {'openness': 80, 'conscientiousness': 85, 'extraversion': 35, 'agreeableness': 90, 'neuroticism': 40},
                'zodiac_sign': 'Aries',
                'zodiac_answers': {'element': 'Earth', 'quality': 'Mutable', 'ruler': 'Mercury'}
            }
        },
        {
            'username': 'manthan_surve',
            'email': 'manthan@example.com',
            'password': 'password123',
            'first_name': 'Manthan',
            'last_name': 'Surve',
            'age': 20,
            'height': "5'7\"",
            'gender': 'male',
            'bio': 'Entrepreneur and adventure seeker. Life is too short to be boring! 🚀',
            'location': 'Mumbai, India',
            'looking_for': 'female',
            'dating_intention': 'Short Term',
            'min_age': 20,
            'max_age': 30,
            'profile_picture': 'manthan.jpg',
            'quiz_data': {
                'mbti_type': 'ENTP',
                'enneagram_type': 'Type 8',
                'love_language': 'Acts of Service',
                'psychological_traits': {'openness': 90, 'conscientiousness': 75, 'extraversion': 85, 'agreeableness': 65, 'neuroticism': 20},
                'zodiac_sign': 'Sagittarius',
                'zodiac_answers': {'element': 'Fire', 'quality': 'Cardinal', 'ruler': 'Mars'}
            }
        },
        {
            'username': 'vanshita_shah',
            'email': 'vanshita@example.com',
            'password': 'password123',
            'first_name': 'Vanshita',
            'last_name': 'Shah',
            'age': 20,
            'height': "5'5\"",
            'gender': 'female',
            'bio': 'Yoga instructor and wellness enthusiast. Seeking balance and harmony in relationships 🧘‍♀️',
            'location': 'Mumbai, India',
            'looking_for': 'male',
            'dating_intention': 'Long Term',
            'min_age': 20,
            'max_age': 30,
            'profile_picture': 'vanshita.jpg',
            'quiz_data': {
                'mbti_type': 'ISFJ',
                'enneagram_type': 'Type 2',
                'love_language': 'Acts of Service',
                'psychological_traits': {'openness': 60, 'conscientiousness': 90, 'extraversion': 50, 'agreeableness': 95, 'neuroticism': 45},
                'zodiac_sign': 'Scorpio',
                'zodiac_answers': {'element': 'Earth', 'quality': 'Fixed', 'ruler': 'Venus'}
            }
        },
        {
            'username': 'priyanshi_siddhapura',
            'email': 'priyanshi@example.com',
            'password': 'password123',
            'first_name': 'Priyanshi',
            'last_name': 'Siddhapura',
            'age': 20,
            'height': "5'5\"",
            'gender': 'female',
            'bio': 'Software engineer by day, gamer by night. Let\'s build something amazing together! 💻',
            'location': 'Mumbai, India',
            'looking_for': 'male',
            'dating_intention': 'Short Term',
            'min_age': 20,
            'max_age': 28,
            'profile_picture': 'priyanshi.jpg',
            'quiz_data': {
                'mbti_type': 'ISTP',
                'enneagram_type': 'Type 9',
                'love_language': 'Physical Touch',
                'psychological_traits': {'openness': 70, 'conscientiousness': 80, 'extraversion': 45, 'agreeableness': 70, 'neuroticism': 30},
                'zodiac_sign': 'Libra',
                'zodiac_answers': {'element': 'Air', 'quality': 'Fixed', 'ruler': 'Uranus'}
            }
        }
    ]
    
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        # Create users and quiz results
        for user_data in sample_users:
            # Create user
            quiz_data = user_data.get('quiz_data', {})
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                password_hash=generate_password_hash(user_data['password']),
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                age=user_data['age'],
                height=user_data.get('height'),  # Height in feet'inches" format
                gender=user_data['gender'],
                bio=user_data['bio'],
                location=user_data['location'],
                looking_for=user_data['looking_for'],
                min_age=user_data['min_age'],
                max_age=user_data['max_age'],
                # Don't set profile_picture - let users upload their own photos via ProfileScreen
                # This prevents overwriting uploaded photos with asset filenames
                profile_picture=None,
                dating_intention=user_data.get('dating_intention'),
                zodiac_sign=quiz_data.get('zodiac_sign')
            )
            db.session.add(user)
            db.session.flush()  # Get the user ID
            
            # Create quiz result
            quiz_result = QuizResult(
                user_id=user.id,
                mbti_type=quiz_data['mbti_type'],
                enneagram_type=quiz_data['enneagram_type'],
                love_language=quiz_data['love_language'],
                psychological_traits=json.dumps(quiz_data['psychological_traits']),
                zodiac_sign=quiz_data['zodiac_sign'],
                zodiac_answers=json.dumps(quiz_data['zodiac_answers'])
            )
            db.session.add(quiz_result)
        
        db.session.commit()
        print("✅ Seed data created successfully!")
        print(f"Created {len(sample_users)} users with quiz results")
        
        # Calculate compatibility scores for all users
        print("\n📊 Calculating compatibility scores for all users...")
        all_users = User.query.all()
        for user in all_users:
            calculate_all_compatibilities(user.id)
        print(f"✅ Compatibility scores calculated for {len(all_users)} users")

if __name__ == '__main__':
    create_seed_users()
