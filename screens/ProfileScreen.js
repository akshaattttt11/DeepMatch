import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, Animated, Easing, Dimensions, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import simpleService from '../services/simpleService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const placeholderPhoto = 'https://ui-avatars.com/api/?name=User&background=10b981&color=fff&size=256';

const initialProfile = {
  id: null,
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  age: '',
  location: '',
  bio: '',
  mbti: '',
  enneagram: '',
  loveLanguage: '',
  zodiac: '',
  profile_picture: '',
  gender: '',
  looking_for: '',
  min_age: '',
  max_age: '',
};

const badgeDataKeys = [
  { label: 'MBTI', key: 'mbti', icon: 'planet-outline' },
  { label: 'Enneagram', key: 'enneagram', icon: 'flower-outline' },
  { label: 'Love Language', key: 'loveLanguage', icon: 'heart-outline' },
  { label: 'Zodiac', key: 'zodiac', icon: 'sunny-outline' },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(initialProfile);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [isBlurred, setIsBlurred] = useState(false);
  const [logoutAnim] = useState(new Animated.Value(0));
  const [picAnim] = useState(new Animated.Value(0));
  const [infoAnim] = useState(new Animated.Value(0));
  const [badgesAnim] = useState(new Animated.Value(0));
  const [editAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initialize services and load profile
  useEffect(() => {
    initializeServices();
  }, []);

  // Reload profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkUserAndLoadProfile = async () => {
        const currentUser = simpleService.getCurrentUser();
        console.log('🔄 ProfileScreen: Screen focused, checking current user:', currentUser);
        if (currentUser) {
          await loadProfile();
        }
      };
      
      checkUserAndLoadProfile();
    }, [])
  );

  const initializeServices = async () => {
    try {
      setLoading(true);
      // Initialize simple service (AsyncStorage + basic backend)
      await simpleService.init();
      
      // Check if we have a current user, if so load their profile
      const currentUser = simpleService.getCurrentUser();
      if (currentUser) {
        await loadProfile();
      }
      
      // Start animations
      startAnimations();
    } catch (error) {
      console.error('Failed to initialize services:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const currentUser = simpleService.getCurrentUser();
      console.log('🔄 Loading profile for user:', currentUser);
      
      if (!currentUser) {
        console.log('⚠️ No current user set, cannot load profile');
        // Reset profile to initial state when no user
        setProfile(initialProfile);
        setEditProfile(initialProfile);
        return;
      }
      
      // Try to get profile from local storage
      const savedProfile = await simpleService.getProfile();
      console.log('📱 Saved profile:', savedProfile);
      
      if (savedProfile && Object.keys(savedProfile).length > 0) {
        const formattedProfile = formatProfileForDisplay(savedProfile);
        console.log('✅ Loaded profile:', formattedProfile);
        setProfile(formattedProfile);
        setEditProfile(formattedProfile);
        return;
      }
      
      console.log('⚠️ No saved profile found for user:', currentUser);
      // Reset to initial profile when no saved data
      setProfile(initialProfile);
      setEditProfile(initialProfile);
      
      // Fallback to local storage
      try {
        const localUsers = await simpleService.getUsers();
        if (localUsers.length > 0) {
          // Use first user as current user (you'll need to implement proper user identification)
          const localProfile = formatProfileForDisplay(localUsers[0]);
          setProfile(localProfile);
          setEditProfile(localProfile);
        }
      } catch (error) {
        console.error('Failed to load local profile:', error);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const formatProfileForDisplay = (backendProfile) => {
    return {
      id: backendProfile.id,
      username: backendProfile.username || '',
      email: backendProfile.email || '',
      first_name: backendProfile.first_name || '',
      last_name: backendProfile.last_name || '',
      age: backendProfile.age ? String(backendProfile.age) : '',
      location: backendProfile.location || '',
      bio: backendProfile.bio || '',
      mbti: backendProfile.mbti || '',
      enneagram: backendProfile.enneagram_type ? String(backendProfile.enneagram_type) : '',
      loveLanguage: backendProfile.love_language || '',
      zodiac: backendProfile.zodiac_sign || '',
      profile_picture: backendProfile.profile_picture || '',
      gender: backendProfile.gender || '',
      looking_for: backendProfile.looking_for || '',
      min_age: backendProfile.min_age ? String(backendProfile.min_age) : '',
      max_age: backendProfile.max_age ? String(backendProfile.max_age) : '',
    };
  };

  const formatProfileForBackend = (displayProfile) => {
    return {
      first_name: displayProfile.first_name,
      last_name: displayProfile.last_name,
      age: displayProfile.age ? parseInt(displayProfile.age) : null,
      location: displayProfile.location,
      bio: displayProfile.bio,
      mbti: displayProfile.mbti,
      enneagram_type: displayProfile.enneagram ? parseInt(displayProfile.enneagram) : null,
      love_language: displayProfile.loveLanguage,
      zodiac_sign: displayProfile.zodiac,
      profile_picture: displayProfile.profile_picture,
      gender: displayProfile.gender,
      looking_for: displayProfile.looking_for,
      min_age: displayProfile.min_age ? parseInt(displayProfile.min_age) : 18,
      max_age: displayProfile.max_age ? parseInt(displayProfile.max_age) : 100,
    };
  };

  const startAnimations = () => {
    Animated.stagger(150, [
      Animated.timing(picAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(infoAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(badgesAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(editAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
    ]).start();
  };

  const openEditModal = () => {
    setEditProfile(profile);
    setIsBlurred(true);
    setModalVisible(true);
  };

  const closeEditModal = () => {
    setModalVisible(false);
    setTimeout(() => setIsBlurred(false), 300);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const currentUser = simpleService.getCurrentUser();
      console.log('💾 Saving profile for user:', currentUser);
      console.log('📊 Profile data:', editProfile);
      
      // Format profile for backend
      const backendProfile = formatProfileForBackend(editProfile);
      console.log('📤 Formatted profile for save:', backendProfile);
      
      // Update profile using simple service
      const result = await simpleService.updateProfile(backendProfile);
      console.log('✅ Save result:', result);
      
      // Update local state
      setProfile(editProfile);
      closeEditModal();
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      
      if (!result.canceled) {
        setEditProfile({ ...editProfile, profile_picture: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      Animated.sequence([
        Animated.timing(logoutAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(logoutAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      
      // Clear session data (but keep profile)
      await simpleService.clearData();
      
      // Reset profile state (but data is still saved)
      setProfile(initialProfile);
      setEditProfile(initialProfile);
      
      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your profile data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear everything including profile
              await simpleService.clearAllData();
              
              // Reset profile
              setProfile(initialProfile);
              setEditProfile(initialProfile);
              
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              console.error('Failed to clear all data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          }
        }
      ]
    );
  };

  const debugStorage = async () => {
    try {
      const currentUser = simpleService.getCurrentUser();
      const storageInfo = await simpleService.getStorageInfo();
      console.log('🔍 Storage Debug Info:', storageInfo);
      console.log('👤 Current User:', currentUser);
      Alert.alert('Debug Info', `Current User: ${currentUser}\nStorage keys: ${Object.keys(storageInfo).join(', ')}`);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile.first_name || profile.username || 'Your Name';
  const displayAge = profile.age ? `, ${profile.age}` : '';
  const displayLocation = profile.location || 'Location';
  const displayBio = profile.bio || 'Tell us about yourself...';

  return (
    <SafeAreaView style={styles.container}>
      {isBlurred && (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Profile</Text>
      </View>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: picAnim,
          transform: [{ scale: picAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      >
        <TouchableOpacity onPress={openEditModal} activeOpacity={0.8}>
          <Image source={{ uri: profile.profile_picture || placeholderPhoto }} style={styles.profilePic} />
          <View style={styles.editPicIcon}>
            <Ionicons name="camera" size={22} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ opacity: infoAnim, marginTop: 18 }}>
        <Text style={styles.name}>{displayName}{displayAge}</Text>
        <Text style={styles.location}><Ionicons name="location" size={16} color="#a3a3a3" /> {displayLocation}</Text>
        <Text style={styles.bio}>{displayBio}</Text>
      </Animated.View>
      <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18, opacity: badgesAnim }}>
        {badgeDataKeys.map((badge, idx) => (
          <View key={badge.label} style={[styles.badge, { backgroundColor: `rgba(16,185,129,${0.15 + idx * 0.1})` }]}>
            <Ionicons name={badge.icon} size={16} color="#10b981" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>{profile[badge.key] || badge.label}</Text>
          </View>
        ))}
      </Animated.View>
      <Animated.View style={[styles.editButtonContainer, { opacity: editAnim, transform: [{ scale: editAnim }] }]}>
        <TouchableOpacity style={styles.editButton} onPress={openEditModal} activeOpacity={0.85}>
          <MaterialIcons name="edit" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Take Quiz Button */}
      <Animated.View style={[styles.quizButtonContainer, { opacity: editAnim, transform: [{ scale: editAnim }] }]}>
        <TouchableOpacity 
          style={styles.quizButton} 
          onPress={() => navigation.navigate('Quiz')} 
          activeOpacity={0.85}
        >
          <Ionicons name="flask" size={24} color="#fff" />
          <Text style={styles.quizButtonText}>Take Quiz</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center', opacity: logoutAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        {/* Debug button removed as requested */}

      </Animated.View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <TouchableOpacity onPress={pickImage} style={{ alignSelf: 'center', marginBottom: 16 }}>
              <Image source={{ uri: editProfile.profile_picture || placeholderPhoto }} style={styles.editProfilePic} />
              <View style={styles.editPicIconModal}>
                <Ionicons name="camera" size={22} color="#fff" />
              </View>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={editProfile.first_name}
              onChangeText={first_name => setEditProfile({ ...editProfile, first_name })}
              placeholder="First Name"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.last_name}
              onChangeText={last_name => setEditProfile({ ...editProfile, last_name })}
              placeholder="Last Name"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={String(editProfile.age)}
              onChangeText={age => setEditProfile({ ...editProfile, age })}
              placeholder="Age"
              keyboardType="numeric"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.location}
              onChangeText={location => setEditProfile({ ...editProfile, location })}
              placeholder="Location"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={[styles.input, { height: 70 }]}
              value={editProfile.bio}
              onChangeText={bio => setEditProfile({ ...editProfile, bio })}
              placeholder="Bio"
              multiline
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.mbti}
              onChangeText={mbti => setEditProfile({ ...editProfile, mbti })}
              placeholder="MBTI"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.enneagram}
              onChangeText={enneagram => setEditProfile({ ...editProfile, enneagram })}
              placeholder="Enneagram (1-9)"
              keyboardType="numeric"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.loveLanguage}
              onChangeText={loveLanguage => setEditProfile({ ...editProfile, loveLanguage })}
              placeholder="Love Language"
              placeholderTextColor="#a3a3a3"
            />
            <TextInput
              style={styles.input}
              value={editProfile.zodiac}
              onChangeText={zodiac => setEditProfile({ ...editProfile, zodiac })}
              placeholder="Zodiac Sign"
              placeholderTextColor="#a3a3a3"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={closeEditModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#10b981',
    marginTop: 8,
  },
  editPicIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#18181b',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  age: {
    color: '#a3a3a3',
    fontWeight: '400',
  },
  location: {
    color: '#a3a3a3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  bio: {
    color: '#d4d4d8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    backgroundColor: '#27272a',
  },
  badgeText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
  editButtonContainer: {
    position: 'absolute',
    bottom: 110,
    right: 30,
    zIndex: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  editButton: {
    backgroundColor: '#10b981',
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizButtonContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  quizButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24,24,27,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#23232b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    minHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  input: {
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  saveButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#27272a',
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  editProfilePic: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#10b981',
    alignSelf: 'center',
  },
  editPicIconModal: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#10b981',
    borderRadius: 14,
    padding: 3,
    borderWidth: 2,
    borderColor: '#23232b',
  },
}); 