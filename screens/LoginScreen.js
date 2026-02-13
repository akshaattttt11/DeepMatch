import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import simpleService from '../services/simpleService';

const ADMIN_EMAIL = 'deepmatch.noreply@gmail.com';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' or 'success'
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async () => {
    setMessage('');
    setMessageType('');
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      setMessageType('error');
      return;
    }
    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    try {
      // Use your Flask backend
      const response = await fetch('https://deepmatch.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store JWT token and user data
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Set the current user in simpleService
        simpleService.setCurrentUser(email);
        console.log('✅ Login successful, user set to:', email);
        
        setMessage('Login successful!');
        setMessageType('success');

        // Decide where to go based on admin email
        const user = data.user || {};
        const userEmail = (user.email || '').toLowerCase();
        const isAdmin = userEmail === ADMIN_EMAIL.toLowerCase() || user.is_admin;
        
        setTimeout(() => {
          if (isAdmin) {
            // Admin: only see admin dashboard
            navigation.replace('AdminReports');
          } else {
            // Normal user: go to main app tabs
            navigation.replace('MainTabs', {
              screen: 'Profile',
            });
          }
        }, 800);
      } else {
        // Check if email is not verified
        if (data.error === 'EMAIL_NOT_VERIFIED' || response.status === 403) {
          setMessage(data.message || 'Please verify your email address before logging in.');
          setMessageType('error');
          // Store email for resend verification
          setUnverifiedEmail(email);
        } else {
          setMessage(data.error || 'Invalid credentials. Please sign up if you are a new user.');
          setMessageType('error');
        }
      }
    } catch (e) {
      console.error('Login error:', e);
      setMessage('Connection error. Please check if backend is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    setResendingVerification(true);
    setMessage('');
    setMessageType('');
    
    try {
      const response = await fetch('https://deepmatch.onrender.com/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || 'Verification email sent! Please check your inbox.');
        setMessageType('success');
        setUnverifiedEmail(null); // Clear after successful resend
      } else {
        setMessage(data.error || 'Failed to resend verification email. Please try again.');
        setMessageType('error');
      }
    } catch (e) {
      console.error('Resend verification error:', e);
      setMessage('Connection error. Please check if backend is running.');
      setMessageType('error');
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/p1.mp4')}
        rate={1.0}
        volume={1.0}
        isMuted={true}
        resizeMode="cover"
        shouldPlay
        isLooping
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome to DeepMatch</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#fff"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password"
            placeholderTextColor="#fff"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {message ? (
          <View style={styles.messageContainer}>
            <Text style={[styles.message, messageType === 'success' ? styles.success : styles.error]}>
              {message}
            </Text>
            {unverifiedEmail && messageType === 'error' && (
              <TouchableOpacity 
                onPress={handleResendVerification} 
                disabled={resendingVerification}
                style={styles.resendButton}
              >
                {resendingVerification ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        {loading ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 10 }} />
        ) : (
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        )}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 30 },
  input: {
    width: 250,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    marginBottom: 15,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 250,
    marginBottom: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  messageContainer: {
    width: 250,
    marginBottom: 10,
    alignItems: 'center',
  },
  message: {
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
  },
  resendButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  resendButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b3b',
  },
  success: {
    color: '#00e676',
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  signupText: {
    color: '#fff',
    fontSize: 15,
  },
  signupLink: {
    color: '#10b981',
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
}); 