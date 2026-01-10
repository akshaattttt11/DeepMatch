import pandas as pd
import random

"""
Utility script to generate a synthetic dataset for training the zodiac
compatibility model. This is for demo / college project purposes when
you don't have real user data yet.

Run from the backend directory:
    python generate_synthetic_zodiac_data.py
"""

ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

YES_NO = ['Yes', 'No']
DAY_NIGHT = ['Day', 'Night']
INTRO_EXTRO = ['Introverted', 'Extroverted']
EMOTIONAL = ['Yes', 'No']
PLANNER_FLOW = ['Planner', 'Flow']


def base_score(user, cand):
    """
    Simple astrology-inspired base compatibility between signs.
    This is NOT real astrology, it's just to simulate some structure
    in the synthetic data so the ML model has patterns to learn.
    """
    base_compat_map = {
        ('Scorpio', 'Cancer'): 0.9,
        ('Scorpio', 'Pisces'): 0.9,
        ('Scorpio', 'Taurus'): 0.85,
        ('Aries', 'Leo'): 0.9,
        ('Aries', 'Sagittarius'): 0.9,
        ('Taurus', 'Virgo'): 0.85,
        ('Taurus', 'Capricorn'): 0.85,
        ('Cancer', 'Pisces'): 0.88,
        ('Leo', 'Sagittarius'): 0.9,
        ('Gemini', 'Libra'): 0.85,
        ('Libra', 'Aquarius'): 0.85,
    }

    if (user, cand) in base_compat_map:
        return base_compat_map[(user, cand)]
    if (cand, user) in base_compat_map:
        return base_compat_map[(cand, user)]
    return 0.6  # neutral baseline


def generate_rows(n_rows=1000):
    rows = []

    for _ in range(n_rows):
        user_sign = random.choice(ZODIAC_SIGNS)
        candidate_sign = random.choice(ZODIAC_SIGNS)

        q1 = random.choice(YES_NO)        # believes in astrology
        q2 = random.choice(DAY_NIGHT)     # day/night
        q3 = random.choice(INTRO_EXTRO)   # intro/extro
        q4 = random.choice(EMOTIONAL)     # emotional
        q5 = random.choice(PLANNER_FLOW)  # planner/flow

        score = base_score(user_sign, candidate_sign)

        # Add small quiz-based adjustments just to make it non-trivial
        if q1 == 'Yes':
            score += 0.05
        if q2 == 'Night' and candidate_sign in ['Scorpio', 'Pisces']:
            score += 0.05
        if q3 == 'Extroverted' and candidate_sign in ['Leo', 'Sagittarius', 'Aries']:
            score += 0.05
        if q5 == 'Planner' and candidate_sign in ['Virgo', 'Capricorn', 'Taurus']:
            score += 0.05

        # Clip to [0,1]
        score = max(0.0, min(1.0, score))

        rows.append({
            'user_sign': user_sign,
            'candidate_sign': candidate_sign,
            'q1': q1,
            'q2': q2,
            'q3': q3,
            'q4': q4,
            'q5': q5,
            'compatibility_label': score,
        })

    return rows


def main():
    rows = generate_rows()
    df = pd.DataFrame(rows)
    df.to_csv('zodiac_training_data.csv', index=False)
    print("✅ Saved synthetic data to zodiac_training_data.csv")


if __name__ == '__main__':
    main()


