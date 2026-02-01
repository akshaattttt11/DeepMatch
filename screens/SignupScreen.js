import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SignupScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' or 'success'
  const [checkingEmail, setCheckingEmail] = useState(false);
  const emailTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, []);

  const validateEmail = (email) => {
    // Trim whitespace
    const trimmedEmail = email.trim();
    if (trimmedEmail !== email) return false; // No leading/trailing spaces
    
    // Basic structure check - must have exactly one @
    if (!trimmedEmail.includes('@') || trimmedEmail.split('@').length !== 2) {
      return false;
    }
    
    const [localPart, domain] = trimmedEmail.split('@');
    
    // Local part validation
    if (!localPart || localPart.length === 0 || localPart.length > 64) {
      return false;
    }
    
    // Local part cannot start or end with a dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }
    
    // Local part cannot have consecutive dots
    if (localPart.includes('..')) {
      return false;
    }
    
    // Local part can contain: letters, numbers, dots, hyphens, underscores, plus
    // But must have at least one letter or number
    if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) {
      return false;
    }
    
    // Local part must have at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(localPart)) {
      return false;
    }
    
    // Domain validation
    if (!domain || domain.length === 0 || domain.length > 255) {
      return false;
    }
    
    // Domain cannot start or end with a dot or hyphen
    if (domain.startsWith('.') || domain.endsWith('.') || 
        domain.startsWith('-') || domain.endsWith('-')) {
      return false;
    }
    
    // Domain cannot have consecutive dots
    if (domain.includes('..')) {
      return false;
    }
    
    // Split domain by dots
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return false; // Must have at least domain.tld
    }
    
    // Get TLD (last part)
    const tld = domainParts[domainParts.length - 1];
    
    // TLD validation - must be 2-6 letters only, no numbers or special characters
    if (!/^[a-zA-Z]{2,6}$/.test(tld)) {
      return false;
    }
    
    // Validate each domain part
    for (let i = 0; i < domainParts.length; i++) {
      const part = domainParts[i];
      
      // Each part must not be empty
      if (!part || part.length === 0) {
        return false;
      }
      
      // Each part cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) {
        return false;
      }
      
      // Each part can only contain letters, numbers, and hyphens
      if (!/^[a-zA-Z0-9-]+$/.test(part)) {
        return false;
      }
      
      // Each part must have at least one letter or number
      if (!/[a-zA-Z0-9]/.test(part)) {
        return false;
      }
    }
    
    // Final regex check for overall structure
    // Local part: starts/ends with alphanumeric, can have dots/hyphens/underscores/plus in between
    // Domain: starts/ends with alphanumeric, can have dots/hyphens in between
    // TLD: 2-6 letters only
    const strictEmailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,6}$/;
    if (!strictEmailRegex.test(trimmedEmail)) {
      return false;
    }
    
    // Ensure nothing after TLD (double check)
    const lastDotIndex = domain.lastIndexOf('.');
    const afterTld = domain.substring(lastDotIndex + 1 + tld.length);
    if (afterTld.length > 0) {
      return false;
    }
    
    return true;
  };

  const validatePassword = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };
    return checks;
  };

  const passwordChecks = validatePassword(password);

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      setDateOfBirth(formattedDate);
      
      // Auto-calculate age
      const today = new Date();
      let calculatedAge = today.getFullYear() - year;
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        calculatedAge--;
      }
      setAge(String(calculatedAge));
    }
  };

  const handlePhoneNumberChange = (text) => {
    // Only allow numbers and limit to 10 digits
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 10) {
      setPhoneNumber(numbers);
      // Clear error message if phone number is being corrected
      if (message && messageType === 'error' && message.includes('phone')) {
        setMessage('');
        setMessageType('');
      }
    }
  };

  const checkEmailExists = async (emailValue) => {
    if (!emailValue || !validateEmail(emailValue)) {
      return;
    }
    setCheckingEmail(true);
    try {
      const response = await fetch(`https://deepmatch.onrender.com/api/check-email?email=${encodeURIComponent(emailValue)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, don't show error - endpoint might not exist
        setCheckingEmail(false);
        return;
      }
      
      const data = await response.json();
      if (data.exists) {
        setMessage('Email already registered');
        setMessageType('error');
      } else {
        // Clear error if email is valid and not registered
        if (message && message.includes('Email already registered')) {
          setMessage('');
          setMessageType('');
        }
      }
    } catch (error) {
      // Silently fail - don't show error for email check
      // The endpoint might not exist on the backend
    } finally {
      setCheckingEmail(false);
    }
  };

  const getGenderDisplay = () => {
    if (!gender) return 'Select Gender';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'DD-MM-YYYY';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleSignup = async () => {
    setMessage('');
    setMessageType('');
    
    // Validation
    if (!username || username.trim().length === 0) {
      setMessage('Please enter a username.');
      setMessageType('error');
      return;
    }
    if (!gender) {
      setMessage('Please select your gender.');
      setMessageType('error');
      return;
    }
    if (!phoneNumber) {
      setMessage('Please enter your phone number.');
      setMessageType('error');
      return;
    }
    if (phoneNumber.length < 10) {
      setMessage('Phone number must be exactly 10 digits.');
      setMessageType('error');
      return;
    }
    if (phoneNumber.length > 10) {
      setMessage('Phone number cannot exceed 10 digits.');
      setMessageType('error');
      return;
    }
    if (!email) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address (e.g., example@gmail.com).');
      setMessageType('error');
      return;
    }
    if (!dateOfBirth) {
      setMessage('Please enter your date of birth.');
      setMessageType('error');
      return;
    }
    if (!age || isNaN(age)) {
      setMessage('Please enter a valid age.');
      setMessageType('error');
      return;
    }
    if (!password) {
      setMessage('Please enter a password.');
      setMessageType('error');
      return;
    }
    const pwdChecks = validatePassword(password);
    if (!pwdChecks.length || !pwdChecks.uppercase || !pwdChecks.lowercase || !pwdChecks.number || !pwdChecks.special) {
      setMessage('Password does not meet all requirements.');
      setMessageType('error');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }
    
    setLoading(true);
    try {
      // Use your Flask backend
      const response = await fetch('https://deepmatch.onrender.com/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email,
          password: password,
          phone_number: phoneNumber,
          first_name: '',
          last_name: '',
          age: parseInt(age),
          gender: gender,
          bio: '',
          location: '',
          looking_for: '',
          min_age: null,
          max_age: null,
          date_of_birth: dateOfBirth
        }),
      });
      
      const data = await response.json();
      
      if (response.ok || response.status === 201) {
        if (data.email_sent) {
          setMessage('Registration successful! Please check your email to verify your account before logging in.');
        } else {
          setMessage('Registration successful! However, verification email could not be sent. You can request a resend from the login screen.');
        }
        setMessageType('success');
        setTimeout(() => {
          navigation.replace('Login');
        }, 2000);
      } else {
        setMessage(data.error || 'Registration failed. Please try again.');
        setMessageType('error');
      }
    } catch (e) {
      console.error('Signup error:', e);
      setMessage('Connection error. Please check if backend is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEnabled={true}
          >
          <Text style={styles.title}>Sign Up for DeepMatch</Text>
          
          {/* Username */}
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="default"
          />

          {/* Gender */}
          <TouchableOpacity 
            style={styles.input}
            onPress={() => setShowGenderPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !gender && { color: 'rgba(255,255,255,0.5)' }]}>
              {getGenderDisplay()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#fff" style={{ position: 'absolute', right: 10 }} />
          </TouchableOpacity>

          {/* Phone Number */}
          <TextInput
            style={styles.input}
            placeholder="10-digit number"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Date of Birth */}
          <View style={styles.dateContainer}>
            <TouchableOpacity 
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, !dateOfBirth && { color: 'rgba(255,255,255,0.5)' }]}>
                {dateOfBirth || 'DD-MM-YYYY'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.calendarIcon}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={22} color="#ff3b3b" />
            </TouchableOpacity>
          </View>

          {/* Age */}
          <TextInput
            style={styles.input}
            placeholder="Enter Age"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            maxLength={3}
            editable={false}
          />

          {/* Email Address */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Clear error message if email is being corrected
              if (message && messageType === 'error' && (message.includes('email') || message.includes('Email'))) {
                setMessage('');
                setMessageType('');
              }
              // Clear previous timeout
              if (emailTimeoutRef.current) {
                clearTimeout(emailTimeoutRef.current);
              }
              // Check email after user stops typing (debounce)
              emailTimeoutRef.current = setTimeout(() => {
                if (text && validateEmail(text)) {
                  checkEmailExists(text);
                }
              }, 1000);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            onBlur={() => {
              // Clear timeout on blur
              if (emailTimeoutRef.current) {
                clearTimeout(emailTimeoutRef.current);
              }
              if (email && validateEmail(email)) {
                checkEmailExists(email);
              }
            }}
          />
          {checkingEmail && (
            <ActivityIndicator size="small" color="#fff" style={{ marginTop: -10, marginBottom: 10 }} />
          )}

          {/* Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Password Strength */}
          {password.length > 0 && (
            <View style={styles.passwordStrengthContainer}>
              <Text style={styles.passwordStrengthTitle}>Password strength</Text>
              <Text style={[styles.passwordCheck, passwordChecks.length && styles.passwordCheckValid]}>
                • At least 8 characters
              </Text>
              <Text style={[styles.passwordCheck, passwordChecks.uppercase && styles.passwordCheckValid]}>
                • One uppercase letter
              </Text>
              <Text style={[styles.passwordCheck, passwordChecks.lowercase && styles.passwordCheckValid]}>
                • One lowercase letter
              </Text>
              <Text style={[styles.passwordCheck, passwordChecks.number && styles.passwordCheckValid]}>
                • One number
              </Text>
              <Text style={[styles.passwordCheck, passwordChecks.special && styles.passwordCheckValid]}>
                • One special character
              </Text>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Confirm password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {message ? (
            <Text style={[styles.message, messageType === 'success' ? styles.success : styles.error]}>
              {message}
            </Text>
          ) : null}
          {loading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 10 }} />
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.registerButton} onPress={handleSignup} disabled={loading}>
                <Text style={styles.registerButtonText}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={() => {
                setUsername('');
                setGender('');
                setPhoneNumber('');
                setEmail('');
                setDateOfBirth('');
                setSelectedDate(new Date());
                setAge('');
                setPassword('');
                setConfirmPassword('');
                setMessage('');
              }}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.signupLink}>Login</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <Picker
              selectedValue={gender}
              onValueChange={(itemValue) => {
                if (itemValue) {
                  setGender(itemValue);
                }
                setShowGenderPicker(false);
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
        />
      )}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.iosDatePickerContainer}>
                <View style={styles.iosDatePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.iosDatePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  <TouchableOpacity onPress={() => {
                    handleDateChange(null, selectedDate);
                    setShowDatePicker(false);
                  }}>
                    <Text style={styles.iosDatePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    if (date) setSelectedDate(date);
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputText: {
    color: '#fff',
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 250,
    marginBottom: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 250,
    marginBottom: 15,
  },
  calendarIcon: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  passwordStrengthContainer: {
    width: 250,
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  passwordStrengthTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  passwordCheck: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  passwordCheckValid: {
    color: '#00e676',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 15,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resetButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  message: {
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#23232b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  picker: {
    color: '#fff',
    backgroundColor: '#18181b',
  },
  iosDatePickerContainer: {
    backgroundColor: '#23232b',
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iosDatePickerCancel: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  iosDatePickerDone: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  iosDatePicker: {
    backgroundColor: '#23232b',
  },
}); 