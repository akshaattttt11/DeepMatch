import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from joblib import dump

"""
Train a RandomForest model on the synthetic zodiac dataset and save it
as zodiac_model.joblib, which backend/app.py will automatically load
if present.

Run from the backend directory:
    python train_zodiac_model.py
"""


def main():
    df = pd.read_csv('zodiac_training_data.csv')

    X = df[['user_sign', 'candidate_sign', 'q1', 'q2', 'q3', 'q4', 'q5']]
    y = df['compatibility_label']

    categorical_cols = ['user_sign', 'candidate_sign', 'q1', 'q2', 'q3', 'q4', 'q5']

    preprocess = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        n_jobs=-1,
    )

    clf = Pipeline(steps=[
        ('preprocess', preprocess),
        ('model', model),
    ])

    print("🔄 Training zodiac model on synthetic data...")
    clf.fit(X, y)

    dump(clf, 'zodiac_model.joblib')
    print("✅ Saved model to zodiac_model.joblib")


if __name__ == '__main__':
    main()





