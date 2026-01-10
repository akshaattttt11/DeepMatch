#!/usr/bin/env python3
"""
Test script to verify the dating app backend endpoints are working correctly.
Run this after starting the Flask server to test the new functionality.
"""

import requests
import json

BASE_URL = 'http://10.185.247.132:5000'  

def test_health():
    """Test the health check endpoint"""
    print("Testing health check...")
    response = requests.get(f'{BASE_URL}/api/health')
    print(f"Health check: {response.status_code} - {response.json()}")

def test_register():
    """Test user registration"""
    print("\nTesting user registration...")
    user_data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123',
        'first_name': 'Test',
        'last_name': 'User',
        'age': 25,
        'gender': 'male',
        'bio': 'Test user for API testing',
        'location': 'Test City'
    }
    
    response = requests.post(f'{BASE_URL}/api/register', json=user_data)
    print(f"Registration: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"Token: {data['token'][:20]}...")
        return data['token']
    else:
        print(f"Error: {response.json()}")
        return None

def test_login():
    """Test user login"""
    print("\nTesting user login...")
    login_data = {
        'email': 'test@example.com',
        'password': 'password123'
    }
    
    response = requests.post(f'{BASE_URL}/api/login', json=login_data)
    print(f"Login: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Token: {data['token'][:20]}...")
        return data['token']
    else:
        print(f"Error: {response.json()}")
        return None

def test_roses_count(token):
    """Test roses count endpoint"""
    print("\nTesting roses count...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/roses/count', headers=headers)
    print(f"Roses count: {response.status_code} - {response.json()}")

def test_notifications(token):
    """Test notifications endpoint"""
    print("\nTesting notifications...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/notifications', headers=headers)
    print(f"Notifications: {response.status_code} - {response.json()}")

def test_matches(token):
    """Test matches endpoint"""
    print("\nTesting matches...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/api/matches', headers=headers)
    print(f"Matches: {response.status_code} - {response.json()}")

def main():
    print("🧪 Testing DeepMatch Backend Endpoints")
    print("=" * 50)
    
    # Test health check
    test_health()
    
    # Test registration
    token = test_register()
    
    if not token:
        # Try login if registration failed (user might already exist)
        token = test_login()
    
    if token:
        # Test authenticated endpoints
        test_roses_count(token)
        test_notifications(token)
        test_matches(token)
    
    print("\n✅ Testing complete!")

if __name__ == '__main__':
    main()
