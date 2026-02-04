import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, Animated, Easing, Dimensions, SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import simpleService from '../services/simpleService';
import { disconnectSocket } from '../services/socket';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getVerifiedLocation } from '../utils/locationService';

const { width } = Dimensions.get('window');

const placeholderPhoto = 'https://ui-avatars.com/api/?name=User&background=10b981&color=fff&size=256';

const initialProfile = {
  id: null,
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  age: '',
  height: '',
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
  dating_intention: '',
};

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
];

const ENNEAGRAM_OPTIONS = [
  { value: '1', label: '1 – Reformer' },
  { value: '2', label: '2 – Helper' },
  { value: '3', label: '3 – Achiever' },
  { value: '4', label: '4 – Individualist' },
  { value: '5', label: '5 – Investigator' },
  { value: '6', label: '6 – Loyalist' },
  { value: '7', label: '7 – Enthusiast' },
  { value: '8', label: '8 – Challenger' },
  { value: '9', label: '9 – Peacemaker' },
];

const LOVE_LANGUAGE_OPTIONS = [
  'Words of Affirmation',
  'Acts of Service',
  'Receiving Gifts',
  'Quality Time',
  'Physical Touch',
];

const ZODIAC_OPTIONS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const DATING_INTENTION_OPTIONS = [
  'Long Term',
  'Short Term',
  'Casual',
];

const GENDER_OPTIONS = [
  'male',
  'female',
];

// Generate height options from 4'9" to 7'0" (in inches)
const HEIGHT_OPTIONS = [];
for (let feet = 4; feet <= 7; feet++) {
  const minInches = feet === 4 ? 9 : 0;
  const maxInches = feet === 7 ? 0 : 11;
  for (let inches = minInches; inches <= maxInches; inches++) {
    const totalInches = feet * 12 + inches;
    const label = `${feet}'${inches}"`;
    HEIGHT_OPTIONS.push({ value: totalInches, label: label });
  }
}

// Helper function to convert inches to feet'inches" format
const inchesToFeetInches = (inches) => {
  if (!inches) return '';
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
};

const PICKER_ITEM_COLOR = Platform.OS === 'ios' ? '#ffffff' : '#111827';

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
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [zoomModal, setZoomModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const currentImageIndexRef = useRef(0);
  const imageViewerFlatListRef = useRef(null);

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
        if (formattedProfile.photos && formattedProfile.photos.length > 0) {
          setPhotos(formattedProfile.photos);
        } else if (formattedProfile.profile_picture) {
          setPhotos([formattedProfile.profile_picture]);
        } else {
          setPhotos([]);
        }
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
      height: backendProfile.height || '', // Height stored as "5'11"" format
      location: backendProfile.location || '',
      bio: backendProfile.bio || '',
      mbti: backendProfile.mbti || '',
      enneagram: backendProfile.enneagram_type ? String(backendProfile.enneagram_type) : '',
      loveLanguage: backendProfile.love_language || '',
      zodiac: backendProfile.zodiac_sign || '',
      profile_picture: backendProfile.profile_picture || '',
      photos: backendProfile.photos || [],
      gender: backendProfile.gender || '',
      looking_for: backendProfile.looking_for || '',
      min_age: backendProfile.min_age ? String(backendProfile.min_age) : '',
      max_age: backendProfile.max_age ? String(backendProfile.max_age) : '',
      dating_intention: backendProfile.dating_intention || '',
    };
  };

  const formatProfileForBackend = (displayProfile) => {
    return {
      first_name: displayProfile.first_name,
      last_name: displayProfile.last_name,
      age: displayProfile.age ? parseInt(displayProfile.age) : null,
      height: displayProfile.height || null, // Height stored as "5'11"" format
      location: displayProfile.location,
      latitude: displayProfile.latitude || null,
      longitude: displayProfile.longitude || null,
      bio: displayProfile.bio,
      mbti: displayProfile.mbti,
      enneagram_type: displayProfile.enneagram ? parseInt(displayProfile.enneagram) : null,
      love_language: displayProfile.loveLanguage,
      zodiac_sign: displayProfile.zodiac,
      profile_picture: displayProfile.profile_picture,
      photos: displayProfile.photos || [],
      gender: displayProfile.gender,
      looking_for: displayProfile.looking_for,
      min_age: displayProfile.min_age ? parseInt(displayProfile.min_age) : 18,
      max_age: displayProfile.max_age ? parseInt(displayProfile.max_age) : 100,
      dating_intention: displayProfile.dating_intention || null,
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

  useEffect(() => {
    // hydrate photo slots from profile picture if available
    if (profile.profile_picture) {
      setPhotos(prev => {
        if (prev.length === 0) return [profile.profile_picture];
        if (prev[0] !== profile.profile_picture) {
          const copy = [...prev];
          copy[0] = profile.profile_picture;
          return copy;
        }
        return prev;
      });
    }
  }, [profile.profile_picture]);

  // Scroll to initial index when modal opens
  useEffect(() => {
    if (zoomModal && imageViewerFlatListRef.current && currentImageIndex >= 0) {
      setTimeout(() => {
        try {
          imageViewerFlatListRef.current?.scrollToIndex({
            index: currentImageIndex,
            animated: false,
          });
        } catch (error) {
          // Fallback to scrollToOffset if scrollToIndex fails
          imageViewerFlatListRef.current?.scrollToOffset({
            offset: currentImageIndex * width,
            animated: false,
          });
        }
      }, 100);
    }
  }, [zoomModal, currentImageIndex]);


  // Stable header component - memoized to prevent unnecessary re-renders
  const ZoomHeader = React.useMemo(() => {
    const HeaderComponent = ({ imageIndex }) => {
      const handleEditPhoto = async () => {
        try {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 5],
            quality: 1,
          });
          
          if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            const updatedPhotos = [...photos];
            const currentActualIndex = photos.findIndex((p, i) => {
              const countBefore = photos.slice(0, i).filter(Boolean).length;
              return p && countBefore === imageIndex;
            });
            if (currentActualIndex >= 0) {
              updatedPhotos[currentActualIndex] = uri;
              setPhotos(updatedPhotos);
              
              // Update main photo if it's the first slot
              if (currentActualIndex === 0) {
                setProfile(prev => ({ ...prev, profile_picture: uri }));
                setEditProfile(prev => ({ ...prev, profile_picture: uri }));
              }
              
              Alert.alert('Success', 'Photo updated successfully!');
            }
          }
        } catch (error) {
          console.error('Failed to update photo:', error);
          Alert.alert('Error', 'Failed to update photo. Please try again.');
        }
      };

      return (
        <View style={styles.zoomHeader}>
          <TouchableOpacity
            style={styles.zoomCloseButton}
            onPress={() => setZoomModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomEditButton}
            onPress={handleEditPhoto}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    };
    return React.memo(HeaderComponent);
  }, [photos]);

  // Stable footer component - memoized to prevent unnecessary re-renders
  const ZoomFooter = React.useMemo(() => {
    const FooterComponent = ({ imageIndex }) => {
      const validPhotosCount = photos.filter(Boolean).length;
      if (validPhotosCount <= 1) return null;
      
      return (
        <View style={styles.photoIndicator}>
          <Text style={styles.photoIndicatorText}>
            {imageIndex + 1} / {validPhotosCount}
          </Text>
        </View>
      );
    };
    return React.memo(FooterComponent);
  }, [photos]);

  // Callback for image index change - update ref and state
  const handleImageIndexChange = useCallback((index) => {
    // Update ref immediately (no re-render)
    currentImageIndexRef.current = index;
    // Update state immediately - the memoized components should handle this efficiently
    setCurrentImageIndex(index);
  }, []);

  // Memoized callback for closing zoom modal
  const handleZoomModalClose = useCallback(() => {
    // Sync selectedPhotoIndex with current image when closing
    const validPhotos = photos.filter(Boolean);
    if (currentImageIndex >= 0 && currentImageIndex < validPhotos.length) {
      const actualIndex = photos.findIndex((p, i) => {
        const countBefore = photos.slice(0, i).filter(Boolean).length;
        return p && countBefore === currentImageIndex;
      });
      if (actualIndex >= 0) {
        setSelectedPhotoIndex(actualIndex);
      }
    }
    setZoomModal(false);
  }, [photos, currentImageIndex]);

  const handleAddPhoto = async (slotIndex = 0) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setPhotos(prev => {
          const copy = [...prev];
          while (copy.length < 6) copy.push(null);
          copy[slotIndex] = uri;
          return copy;
        });
        if (slotIndex === 0) {
          setProfile(prev => ({ ...prev, profile_picture: uri }));
          setEditProfile(prev => ({ ...prev, profile_picture: uri }));
        }
      }
    } catch (error) {
      console.error('Failed to add photo:', error);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    }
  };

  const handleSavePhotos = async () => {
    try {
      const cleanedPhotos = photos.filter(Boolean);
      const main = cleanedPhotos[0] || profile.profile_picture || '';
      const updatedProfile = {
        ...profile,
        profile_picture: main,
        photos: cleanedPhotos,
      };
      setProfile(updatedProfile);
      setEditProfile(prev => ({ ...prev, profile_picture: main, photos: cleanedPhotos }));
      await simpleService.updateProfile(formatProfileForBackend(updatedProfile));
      setPhotoModal(false);
      Alert.alert('Saved', 'Photos saved successfully.');
    } catch (error) {
      console.error('Failed to save photos:', error);
      Alert.alert('Error', 'Could not save photos. Please try again.');
    }
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
      
      const mainPhoto = (photos.filter(Boolean)[0]) || editProfile.profile_picture || profile.profile_picture || '';
      const backendProfile = formatProfileForBackend({ ...editProfile, profile_picture: mainPhoto, photos });
      console.log('📤 Formatted profile for save:', backendProfile);
      
      // Update profile using simple service
      const result = await simpleService.updateProfile(backendProfile);
      console.log('✅ Save result:', result);
      
      // Update local state
      const updatedProfile = { ...editProfile, profile_picture: mainPhoto, photos };
      setProfile(updatedProfile);
      setEditProfile(updatedProfile);
      
      // Update currentUser in AsyncStorage with gender so HomeScreen can filter correctly
      try {
        const currentUserData = await AsyncStorage.getItem('current_user');
        if (currentUserData) {
          const currentUser = JSON.parse(currentUserData);
          const updatedUser = {
            ...currentUser,
            gender: editProfile.gender || currentUser.gender
          };
          await AsyncStorage.setItem('current_user', JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error('Error updating current_user:', error);
      }
      
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
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      // 🔐 Get auth token
      const token = await AsyncStorage.getItem('auth_token');

      // 📦 Prepare form data
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "profile.jpg",
        type: "image/jpeg",
      });
      formData.append("type", "image");

      // 🚀 Upload to Flask → Cloudinary
      const response = await fetch(
        `${API_BASE_URL}/api/messages/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // ✅ Save Cloudinary URL (NOT local URI)
      setEditProfile({
        ...editProfile,
        profile_picture: data.url,
      });

      Alert.alert("Success", "Profile picture uploaded!");

    }
  } catch (error) {
    console.error("Image upload error:", error);
    Alert.alert("Error", "Failed to upload image. Please try again.");
  }
};


  const handleLogout = async () => {
    try {
      Animated.sequence([
        Animated.timing(logoutAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(logoutAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

      // 🔴 CLOSE SOCKET CONNECTION
      disconnectSocket();
      
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

  // Completion calculation: all details + photo slots
  const details = [
    profile.first_name,
    profile.last_name,
    profile.age,
    profile.location,
    profile.bio,
    profile.mbti,
    profile.enneagram,
    profile.loveLanguage,
    profile.zodiac,
    profile.profile_picture,
  ];
  const detailsFilled = details.filter(Boolean).length;
  const detailsTotal = details.length;

  const photosFilled = (photos.filter(Boolean).length || (profile.profile_picture ? 1 : 0));
  const photosTotal = 6;

  const completionPercent = Math.min(
    100,
    Math.round(((detailsFilled + photosFilled) / (detailsTotal + photosTotal)) * 100)
  );

  return (
    <SafeAreaView style={styles.container}>
      {isBlurred && (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={styles.header}>
        <Text style={styles.headerText}>My Profile</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Profile completion</Text>
          <Text style={styles.progressValue}>{completionPercent}%</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={['#d1d5db', '#9ca3af']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressBarFill, { width: `${completionPercent}%` }]}
          />
        </View>
      </View>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: picAnim,
          transform: [{ scale: picAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      >
        <TouchableOpacity onPress={() => setPhotoModal(true)} activeOpacity={0.8}>
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
      {/* Photo Grid Modal */}
      <Modal
        visible={photoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModal(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Add your photos</Text>
              <TouchableOpacity onPress={() => setPhotoModal(false)}>
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={styles.photoGrid}>
              {Array.from({ length: 6 }).map((_, idx) => {
                const uri = photos[idx] || null;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.photoSlot}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (uri) {
                        // Open zoom modal if photo exists
                        setSelectedPhotoIndex(idx);
                        // Calculate the index in the filtered array
                        const validPhotos = photos.filter(Boolean);
                        const photoIndex = photos.slice(0, idx + 1).filter(Boolean).length - 1;
                        currentImageIndexRef.current = photoIndex;
                        setCurrentImageIndex(photoIndex);
                        setZoomModal(true);
                      } else {
                        // Add photo if slot is empty
                        handleAddPhoto(idx);
                      }
                    }}
                  >
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photoSlotImage} />
                        {idx === 0 && <Text style={styles.mainPhotoTag}>Main photo</Text>}
                      </>
                    ) : (
                      <View style={styles.addIconWrap}>
                        <Ionicons name="add" size={26} color="#111" />
                        <Text style={styles.addText}>Add</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.photoDoneBtn} onPress={handleSavePhotos}>
              <Text style={styles.photoDoneText}>Save photos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Photo Viewing Modal - smooth swipe, no zoom */}
      <Modal
        visible={zoomModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleZoomModalClose}
      >
        <View style={styles.imageViewerContainer}>
          {/* Header */}
          <ZoomHeader imageIndex={currentImageIndex} />
          
          {/* Image FlatList */}
          <FlatList
            ref={imageViewerFlatListRef}
            data={photos.filter(Boolean)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `photo-${index}`}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              // Fallback to scrollToOffset if scrollToIndex fails
              setTimeout(() => {
                imageViewerFlatListRef.current?.scrollToOffset({
                  offset: info.index * width,
                  animated: false,
                });
              }, 100);
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index >= 0 && index < photos.filter(Boolean).length) {
                handleImageIndexChange(index);
              }
            }}
            renderItem={({ item }) => (
              <View style={styles.imageViewerItem}>
                <Image
                  source={{ uri: item }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          
          {/* Footer */}
          <ZoomFooter imageIndex={currentImageIndex} />
        </View>
      </Modal>

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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} style={{ flex: 1 }}>
            <Animated.View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
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
                <Text style={styles.pickerLabel}>Gender</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.gender || ''}
                    onValueChange={(gender) => setEditProfile({ ...editProfile, gender: gender || '' })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select gender" value="" color="#a3a3a3" />
                    <Picker.Item label="Male" value="male" color={PICKER_ITEM_COLOR} />
                    <Picker.Item label="Female" value="female" color={PICKER_ITEM_COLOR} />
                  </Picker>
                </View>
                <Text style={styles.pickerLabel}>Height</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.height || null}
                    onValueChange={(heightStr) => setEditProfile({ ...editProfile, height: heightStr || '' })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select height" value={null} color="#a3a3a3" />
                    {HEIGHT_OPTIONS.map((option) => (
                      <Picker.Item key={option.value} label={option.label} value={option.label} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.locationInputContainer}>
                  <TextInput
                    style={styles.locationInput}
                    value={editProfile.location}
                    onChangeText={location => setEditProfile({ ...editProfile, location })}
                    placeholder="Location"
                    placeholderTextColor="#a3a3a3"
                  />
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={async () => {
                      try {
                        setGettingLocation(true);
                        const verified = await getVerifiedLocation();
                        setEditProfile({
                          ...editProfile,
                          location: verified.location,
                          latitude: verified.latitude,
                          longitude: verified.longitude,
                        });
                        Alert.alert('Location Verified', `Location set to: ${verified.location}`);
                      } catch (error) {
                        Alert.alert('Error', error.message || 'Failed to get location. Please enable location permissions.');
                      } finally {
                        setGettingLocation(false);
                      }
                    }}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <Ionicons name="locate" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  value={editProfile.bio}
                  onChangeText={bio => setEditProfile({ ...editProfile, bio })}
                  placeholder="Bio"
                  multiline
                  placeholderTextColor="#a3a3a3"
                />
                <Text style={styles.pickerLabel}>Dating Intention</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.dating_intention || ''}
                    onValueChange={(dating_intention) => setEditProfile({ ...editProfile, dating_intention })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select dating intention" value="" color="#a3a3a3" />
                    {DATING_INTENTION_OPTIONS.map((option) => (
                      <Picker.Item key={option} label={option} value={option} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.pickerLabel}>MBTI Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.mbti || ''}
                    onValueChange={(mbti) => setEditProfile({ ...editProfile, mbti })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select MBTI type" value="" color="#a3a3a3" />
                    {MBTI_OPTIONS.map((type) => (
                      <Picker.Item key={type} label={type} value={type} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.pickerLabel}>Enneagram</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.enneagram || ''}
                    onValueChange={(enneagram) => setEditProfile({ ...editProfile, enneagram })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select Enneagram type" value="" color="#a3a3a3" />
                    {ENNEAGRAM_OPTIONS.map((option) => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.pickerLabel}>Love Language</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.loveLanguage || ''}
                    onValueChange={(loveLanguage) => setEditProfile({ ...editProfile, loveLanguage })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select love language" value="" color="#a3a3a3" />
                    {LOVE_LANGUAGE_OPTIONS.map((option) => (
                      <Picker.Item key={option} label={option} value={option} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
                <Text style={styles.pickerLabel}>Zodiac Sign</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editProfile.zodiac || ''}
                    onValueChange={(zodiac) => setEditProfile({ ...editProfile, zodiac })}
                    style={styles.picker}
                    dropdownIconColor="#10b981"
                    mode="dropdown"
                  >
                    <Picker.Item label="Select zodiac sign" value="" color="#a3a3a3" />
                    {ZODIAC_OPTIONS.map((sign) => (
                      <Picker.Item key={sign} label={sign} value={sign} color={PICKER_ITEM_COLOR} />
                    ))}
                  </Picker>
                </View>
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
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
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
  modalScroll: {
    paddingBottom: 24,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // Match input marginBottom
    gap: 8, // Space between input and button
  },
  locationInput: {
    flex: 1,
    height: 48, // Match input height exactly
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  locationButton: {
    width: 48,
    height: 48, // Match input height exactly
    borderRadius: 12, // Match input border radius exactly
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  input: {
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48, // Match location button height
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  pickerLabel: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  picker: {
    color: '#fff',
    width: '100%',
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
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#f7f7f7',
    borderRadius: 20,
    padding: 18,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 8,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainPhotoTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    overflow: 'hidden',
  },
  addIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  photoDoneBtn: {
    marginTop: 16,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoDoneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  progressContainer: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 18, // gap before avatar
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#e5e5e5',
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 12,
    borderRadius: 10,
    backgroundColor: '#1f1f24',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d2d34',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    shadowColor: '#d1d5db',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  zoomCloseButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  zoomEditButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  zoomImageContainer: {
    width: width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomScrollView: {
    width: width,
    height: Dimensions.get('window').height,
  },
  zoomImageContent: {
    width: width,
    minHeight: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImageWrapper: {
    width: width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: width,
    height: Dimensions.get('window').height,
  },
  photoIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomHeaderOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  photoIndicatorOverlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  imageViewerItem: {
    width: width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: width,
    height: Dimensions.get('window').height,
  },
}); 