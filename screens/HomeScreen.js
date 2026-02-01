import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Dimensions, Modal, Animated, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { getVerifiedLocation } from '../utils/locationService';

// API Configuration
const API_BASE_URL = 'https://deepmatch.onrender.com';
 
const { width } = Dimensions.get('window');

// Helper to convert inches to feet/inches string
function inchesToFeetInches(inches) {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

// Helper to convert height string like "5'11"" to total inches
function heightStringToInches(heightStr) {
  if (!heightStr || typeof heightStr !== 'string') return null;
  
  // Match pattern like "5'11"" or "5'11""
  const match = heightStr.match(/(\d+)'(\d+)"/);
  if (!match) return null;
  
  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2], 10);
  return feet * 12 + inches;
}

// Generate height options
const HEIGHT_MIN = 57;
const HEIGHT_MAX = 84;
const heights = Array.from({ length: (HEIGHT_MAX - HEIGHT_MIN) + 1 }, (_, i) => HEIGHT_MIN + i); // 4'9" to 7'0"
const intentions = ['Long Term', 'Short Term', 'Casual'];
const genders = ['Men', 'Women', 'Both'];
const distances = [5, 10, 25, 50, 100];
const MIN_AGE = 18;
const MAX_AGE = 60;

export default function HomeScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [rosesLeft, setRosesLeft] = useState(3);
  const [dislikedProfiles, setDislikedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showZodiacPopup, setShowZodiacPopup] = useState(false);


  // Filter states
  const [ageFilter, setAgeFilter] = useState({
    min: MIN_AGE,
    max: 30,
    enabled: false,
    dealbreaker: true,
  });
  const [ageDraftRange, setAgeDraftRange] = useState([MIN_AGE, 30]);
  const [ageDealbreakerDraft, setAgeDealbreakerDraft] = useState(true);
  const [heightFilter, setHeightFilter] = useState({
    min: HEIGHT_MIN,
    max: 72,
    enabled: false,
  });
  const [heightDraftRange, setHeightDraftRange] = useState([HEIGHT_MIN, 72]);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null); // null = both, 'male' = men, 'female' = women
  const [maxDistance, setMaxDistance] = useState(null); // in miles, null = no limit
  const [filterModal, setFilterModal] = useState(false);
  const [ageModal, setAgeModal] = useState(false);
  const [heightModal, setHeightModal] = useState(false);
  const [intentModal, setIntentModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [genderModal, setGenderModal] = useState(false);
  const [distanceModal, setDistanceModal] = useState(false);

  // Load current user and compatible matches from backend
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
  const checkZodiacQuiz = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.has_taken_zodiac_quiz) return;
        }
      }

      const taken = await AsyncStorage.getItem('hasTakenZodiacQuiz');
      if (!taken) {
        setShowZodiacPopup(true);
      }
    } catch (err) {
      console.error('Zodiac quiz check failed:', err);
    }
  };

  checkZodiacQuiz();
}, []);


  useEffect(() => {
    if (currentUser) {
      loadCompatibleMatches();
      loadRosesCount();
    }
  }, [currentUser, ageFilter, heightFilter, selectedIntent, selectedLocation, selectedGender, maxDistance]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadCompatibleMatches = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Build query parameters for filters
      const queryParams = new URLSearchParams();
      if (ageFilter.enabled) {
        queryParams.append('min_age', ageFilter.min);
        queryParams.append('max_age', ageFilter.max);
      }
      if (heightFilter.enabled) {
        queryParams.append('min_height', heightFilter.min);
        queryParams.append('max_height', heightFilter.max);
      }
      if (selectedIntent) {
        queryParams.append('intention', selectedIntent);
      }
      if (selectedLocation) {
        queryParams.append('location', selectedLocation);
      }
      if (selectedGender) {
        queryParams.append('gender', selectedGender);
      }
      if (maxDistance) {
        queryParams.append('max_distance', maxDistance);
      }
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/api/compatible-matches${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📸 Profile pictures from backend:', data.matches?.map(m => ({ name: m.name, profile_picture: m.profile_picture })));
        setProfiles(data.matches || []);
      } else {
        console.error('Failed to load matches');
        // Fallback to empty array
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRosesCount = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/roses/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRosesLeft(data.roses_left || 3);
      } else {
        console.error('Failed to load roses count');
        setRosesLeft(3); // Default fallback
      }
    } catch (error) {
      console.error('Error loading roses count:', error);
      setRosesLeft(3); // Default fallback
    }
  };

  // Filter out disliked profiles and apply gender filtering
  const filteredProfiles = profiles.filter(profile => {
    // Gender-based filtering
    const userGender = (currentUser?.gender || '').trim().toLowerCase();
    const profileGender = (profile?.gender || '').trim().toLowerCase();
    
    let genderMatches = true;
    
    // If gender filter is set, use it; otherwise default to opposite gender
    if (selectedGender !== null) {
      if (selectedGender === 'male') {
        genderMatches = profileGender === 'male';
      } else if (selectedGender === 'female') {
        genderMatches = profileGender === 'female';
      } else if (selectedGender === 'both') {
        genderMatches = true; // Show all genders
      }
    } else {
      // Default: show opposite gender only
      genderMatches = 
      (userGender === 'male' && profileGender === 'female') ||
      (userGender === 'female' && profileGender === 'male');
    }

    const shouldApplyAgeFilter = ageFilter.enabled && ageFilter.dealbreaker;
    const ageMatches =
      !shouldApplyAgeFilter || !profile.age
        ? true
        : profile.age >= ageFilter.min && profile.age <= ageFilter.max;

    const shouldApplyHeightFilter = heightFilter.enabled;
    const heightMatches =
      !shouldApplyHeightFilter || !profile.height
        ? true
        : (() => {
            const profileHeightInches = heightStringToInches(profile.height);
            if (profileHeightInches === null) return false;
            return profileHeightInches >= heightFilter.min && profileHeightInches <= heightFilter.max;
          })();

    const locationMatches =
      !selectedLocation || !profile.location
        ? true
        : profile.location.toLowerCase().includes(selectedLocation.toLowerCase());

    // Distance filtering is now handled by the backend using GPS coordinates
    // No need for frontend distance filtering anymore

    const intentionMatches =
      !selectedIntent || (profile.intention || '') === selectedIntent;
    
    return (
      genderMatches &&
      ageMatches &&
      heightMatches &&
      intentionMatches &&
      locationMatches &&
      !dislikedProfiles.includes(profile.id)
    );
  });

  // Popup state for like/rose
  const [modalVisible, setModalVisible] = useState(false);
  const [popup, setPopup] = useState({ visible: false, type: '', name: '' });
  const popupAnim = useRef(new Animated.Value(0)).current;

  // Animation refs
  const likeAnim = useRef(new Animated.Value(1)).current;
  const roseAnim = useRef(new Animated.Value(1)).current;
  const dislikeAnim = useRef(new Animated.Value(1)).current;

  const animateButton = (animRef) => {
    Animated.sequence([
      Animated.timing(animRef, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(animRef, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const showPopup = (type, name) => {
    setPopup({ visible: true, type, name });
    popupAnim.setValue(0);
    Animated.spring(popupAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
    setTimeout(() => {
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setPopup({ visible: false, type: '', name: '' }));
    }, 1600);
  };

  const handleLike = async () => {
    const currentProfile = filteredProfiles[profileIndex];
    if (!currentProfile) return;

    animateButton(likeAnim);
    showPopup('like', currentProfile.name);

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          liked_id: currentProfile.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matched) {
          // Show match notification
          Alert.alert('It\'s a Match! 🎉', `You and ${currentProfile.name} liked each other!`);
        }
      } else {
        const errorData = await response.json();
        console.error('Like failed:', errorData.error);
      }
    } catch (error) {
      console.error('Error liking profile:', error);
    }
  };

  const handleDislike = () => {
    animateButton(dislikeAnim);
    const currentProfile = filteredProfiles[profileIndex];
    if (currentProfile) {
      const updatedDisliked = [...dislikedProfiles, currentProfile.id];
      setDislikedProfiles(updatedDisliked);
    }
    setTimeout(() => {
      // After filtering out the current profile, keep the same index if there is another item at that spot,
      // otherwise move back one to stay in bounds
      const remaining = filteredProfiles.length - 1; // one less because we just disliked one
      if (profileIndex > remaining - 1) {
        setProfileIndex(Math.max(0, profileIndex - 1));
      }
    }, 200);
  };

  const handleRose = async () => {
    const currentProfile = filteredProfiles[profileIndex];
    if (!currentProfile) return;

    if (rosesLeft > 0) {
      animateButton(roseAnim);
      showPopup('rose', currentProfile.name);

      try {
        const token = await AsyncStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/api/rose`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receiver_id: currentProfile.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          setRosesLeft(rosesLeft - 1);
          
          if (data.matched) {
            // Show match notification
            Alert.alert('Rose Match! 🌹💕', `You and ${currentProfile.name} sent roses to each other!`);
          }
        } else {
          const errorData = await response.json();
          console.error('Rose failed:', errorData.error);
          Alert.alert('Error', errorData.error || 'Failed to send rose');
        }
      } catch (error) {
        console.error('Error sending rose:', error);
        Alert.alert('Error', 'Failed to send rose. Please try again.');
      }
    } else {
      setModalVisible(true);
    }
  };

  const handleNext = () => {
    if (profileIndex < filteredProfiles.length - 1) {
      setProfileIndex(profileIndex + 1);
    }
  };

  const handlePrev = () => {
    if (profileIndex > 0) {
      setProfileIndex(profileIndex - 1);
    }
  };

  const profile = filteredProfiles[profileIndex];
  const ageSheetHasChanges =
    !ageFilter.enabled ||
    ageDraftRange[0] !== ageFilter.min ||
    ageDraftRange[1] !== ageFilter.max ||
    ageDealbreakerDraft !== ageFilter.dealbreaker;
  const heightSheetHasChanges =
    !heightFilter.enabled ||
    heightDraftRange[0] !== heightFilter.min ||
    heightDraftRange[1] !== heightFilter.max;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Filters */}
        <View style={styles.filters}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Ionicons name="options-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              setAgeDraftRange([ageFilter.min, ageFilter.max]);
              setAgeDealbreakerDraft(ageFilter.dealbreaker);
              setAgeModal(true);
            }}
          >
            <Text style={styles.filterText}>
              Age {ageFilter.enabled ? `: ${ageFilter.min}-${ageFilter.max}` : '▼'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              setHeightDraftRange([heightFilter.min, heightFilter.max]);
              setHeightModal(true);
            }}
          >
            <Text style={styles.filterText}>
              Height{' '}
              {heightFilter.enabled
                ? `: ${inchesToFeetInches(heightFilter.min)}-${inchesToFeetInches(heightFilter.max)}`
                : '▼'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setIntentModal(true)}>
            <Text style={styles.filterText}>Dating Intentions {selectedIntent ? `: ${selectedIntent}` : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Bar for Compatibility */}
        <View style={styles.toggleBarContainer}>
          <TouchableOpacity
            style={[styles.toggleTab, styles.leftTab, styles.toggleTabCommon, { backgroundColor: '#111', borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }]}
            onPress={() => navigation.navigate('Quiz')}
          >
            <Text style={[styles.toggleTabText, { color: '#fff', fontWeight: 'bold' }]}>Match Compatibility</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleTab, styles.rightTab, styles.toggleTabCommon, { backgroundColor: '#e0e0e0', borderTopRightRadius: 20, borderBottomRightRadius: 20 }]}
            onPress={() => navigation.navigate('ZodiacQuiz')}
          >
            <Text style={[styles.toggleTabText, { color: '#111', fontWeight: 'bold' }]}>Zodiac Compatibility</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={{ marginTop: 44 }} />
        {loading ? (
          <View style={styles.card}>
            <Text style={styles.name}>Loading matches...</Text>
            <Text style={styles.status}>Finding compatible people for you</Text>
          </View>
        ) : profile ? (
          <View style={styles.card}>
            <ScrollView 
              style={styles.cardContent}
              contentContainerStyle={styles.cardContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => navigation.navigate('ProfileDetail', { userId: profile.id })}
            >
              <Text style={styles.name}>{profile.name || 'Unknown'}</Text>
              <Text style={[styles.status, { marginBottom: 12 }]}>
                {profile.age || 'N/A'} • {profile.location || 'Unknown Location'}
              </Text>
              
              {/* Compatibility Score */}
              {profile.compatibility && (
                <View style={styles.compatibilityContainer}>
                  <Text style={styles.compatibilityLabel}>Compatibility</Text>
                  <View style={styles.compatibilityBar}>
                    <View 
                      style={[
                        styles.compatibilityFill, 
                        { width: `${profile.compatibility.overall || 0}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.compatibilityScore}>
                    {profile.compatibility.overall || 0}% Match
                  </Text>
                </View>
              )}
              
                <Image 
                  source={
                    profile.profile_picture && 
                    (profile.profile_picture.startsWith('http://') || 
                     profile.profile_picture.startsWith('https://') || 
                     profile.profile_picture.startsWith('file://') || 
                     profile.profile_picture.startsWith('content://'))
                      ? { uri: profile.profile_picture }
                      : require('../assets/pfp.jpg')
                  } 
                  style={styles.profileImage} 
                  resizeMode="contain"
                  defaultSource={require('../assets/pfp.jpg')}
                />
                <Text style={styles.promptText}>{profile.bio || 'No bio available'}</Text>
              </TouchableOpacity>
              
              {/* Like and Rose Buttons Row */}
              <View style={styles.actionRow}>
                <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <FontAwesome name="heart" size={28} color="#fff" />
                    <Text style={styles.actionLabel}>Like</Text>
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: roseAnim }] }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, rosesLeft === 0 && { opacity: 0.5 }]}
                    onPress={handleRose}
                    disabled={rosesLeft === 0}
                  >
                    <MaterialCommunityIcons name="flower-tulip" size={28} color="#ff4d79" />
                    <Text style={styles.actionLabel}>Rose ({rosesLeft})</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              
              {/* Dislike Button Row */}
              <View style={styles.dislikeRow}>
                <Animated.View style={{ transform: [{ scale: dislikeAnim }] }}>
                  <TouchableOpacity style={styles.dislikeBtn} onPress={handleDislike}>
                    <MaterialCommunityIcons name="close-thick" size={32} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              
              {/* Navigation Buttons */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.navBtn, profileIndex === 0 && { opacity: 0.5 }]}
                  onPress={handlePrev}
                  disabled={profileIndex === 0}
                >
                  <Ionicons name="chevron-back-circle" size={36} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navBtn, profileIndex === filteredProfiles.length - 1 && { opacity: 0.5 }]}
                  onPress={handleNext}
                  disabled={profileIndex === filteredProfiles.length - 1}
                >
                  <Ionicons name="chevron-forward-circle" size={36} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.name}>No more profiles</Text>
            <Text style={styles.status}>Check back later for more matches!</Text>
          </View>
        )}

        {/* Animated Like/Rose Popup with Blur */}
        {popup.visible && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <BlurView intensity={60} tint="dark" style={styles.blurOverlay} />
            <Animated.View
              style={[
                styles.popupContainer,
                {
                  opacity: popupAnim,
                  transform: [
                    {
                      scale: popupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.popupContent}>
                {popup.type === 'rose' ? (
                  <MaterialCommunityIcons name="flower-tulip" size={70} color="#ff4d79" />
                ) : (
                  <FontAwesome name="heart" size={70} color="#ff4d79" />
                )}
                <Text style={styles.popupText}>
                  {popup.type === 'rose'
                    ? `You gave ${popup.name} a rose! 🌹`
                    : `You liked ${popup.name}! ❤️`}
                </Text>
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Zodiac Quiz Mandatory Popup */}
{showZodiacPopup && (
  <Modal transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Zodiac Compatibility 🌟</Text>
        <Text style={styles.modalText}>
          Take the Zodiac Quiz to unlock astrological compatibility.
        </Text>

        <TouchableOpacity
          style={styles.modalBtn}
          onPress={() => {
            setShowZodiacPopup(false);
            navigation.navigate('ZodiacQuiz');
          }}
        >
          <Text style={styles.modalBtnText}>Take Zodiac Quiz</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)}

      {/* Out of Roses Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons name="rose" size={48} color="#ff4d79" />
            <Text style={styles.modalTitle}>No Roses Left</Text>
            <Text style={styles.modalText}>You have used all your roses for today. Come back tomorrow!</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Filter Modal */}
      <Modal visible={filterModal} transparent animationType="slide" onRequestClose={() => setFilterModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setFilterModal(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterHeader}>
              <TouchableOpacity onPress={() => setFilterModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
              <Text style={styles.filterSheetTitle}>Dating Preferences</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView 
              style={styles.filterScrollView} 
              contentContainerStyle={styles.filterScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Text style={styles.memberPreferencesLabel}>Member Preferences</Text>
              
              {/* Age Range */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setFilterModal(false);
                  setAgeDraftRange([ageFilter.min, ageFilter.max]);
                  setAgeDealbreakerDraft(ageFilter.dealbreaker);
                  setAgeModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>Age range</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {ageFilter.enabled ? `${ageFilter.min} - ${ageFilter.max}` : 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
              <View style={styles.filterDivider} />
              
              {/* Height Range */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setFilterModal(false);
                  setHeightDraftRange([heightFilter.min, heightFilter.max]);
                  setHeightModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>Height</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {heightFilter.enabled
                      ? `${inchesToFeetInches(heightFilter.min)} - ${inchesToFeetInches(heightFilter.max)}`
                      : 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
              <View style={styles.filterDivider} />
              
              {/* Dating Intentions */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setFilterModal(false);
                  setIntentModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>Relationship Type</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {selectedIntent || 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
              <View style={styles.filterDivider} />
              
              {/* Location */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setLocationInput(selectedLocation || '');
                  setLocationModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>Location</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {selectedLocation || 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
              <View style={styles.filterDivider} />
              
              {/* I'm interested in */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setFilterModal(false);
                  setGenderModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>I'm interested in</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {selectedGender === 'male' ? 'Men' : selectedGender === 'female' ? 'Women' : selectedGender === 'both' ? 'Both' : 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
              <View style={styles.filterDivider} />
              
              {/* Maximum distance */}
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => {
                  setFilterModal(false);
                  setDistanceModal(true);
                }}
              >
                <Text style={styles.filterCategoryLabel}>Maximum distance</Text>
                <View style={styles.filterValueContainer}>
                  <Text style={styles.filterValue}>
                    {maxDistance ? `${maxDistance} mi${maxDistance >= 100 ? '+' : ''}` : 'Open to all'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Age Range Sheet */}
      <Modal visible={ageModal} transparent animationType="slide" onRequestClose={() => setAgeModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAgeModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Age</Text>
            <Text style={styles.sheetSubtitle}>Select the range you're open to meeting</Text>
            <View style={styles.ageValueRow}>
              <Text style={styles.ageValue}>{ageDraftRange[0]}</Text>
              <Text style={styles.ageValue}>{ageDraftRange[1]}</Text>
            </View>
            <MultiSlider
              min={MIN_AGE}
              max={MAX_AGE}
              step={1}
              values={ageDraftRange}
              sliderLength={width * 0.75}
              onValuesChange={setAgeDraftRange}
              selectedStyle={{ backgroundColor: '#222' }}
              unselectedStyle={{ backgroundColor: '#cfcfcf' }}
              markerStyle={styles.sliderMarker}
              trackStyle={{ height: 6, borderRadius: 3 }}
              containerStyle={{ marginTop: 20, alignSelf: 'center' }}
              pressedMarkerStyle={{ transform: [{ scale: 1.1 }] }}
            />
            <TouchableOpacity
              style={styles.dealBreakerRow}
              activeOpacity={0.8}
              onPress={() => setAgeDealbreakerDraft(prev => !prev)}
            >
              <View style={[styles.checkbox, ageDealbreakerDraft && styles.checkboxChecked]}>
                {ageDealbreakerDraft && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealbreakerTitle}>This is a dealbreaker</Text>
                <Text style={styles.dealbreakerSubtitle}>This will limit who you see and who sees you</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.applyBtn,
                !ageSheetHasChanges && styles.applyBtnDisabled,
              ]}
              disabled={!ageSheetHasChanges}
              onPress={() => {
                setAgeFilter({
                  min: ageDraftRange[0],
                  max: ageDraftRange[1],
                  enabled: true,
                  dealbreaker: ageDealbreakerDraft,
                });
                setAgeModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {ageFilter.enabled && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setAgeFilter(prev => ({ ...prev, enabled: false }));
                  setAgeModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Height Picker Modal */}
      <Modal visible={heightModal} transparent animationType="slide" onRequestClose={() => setHeightModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setHeightModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Height</Text>
            <Text style={styles.sheetSubtitle}>Choose the height range you prefer</Text>
            <View style={styles.ageValueRow}>
              <Text style={styles.ageValue}>{inchesToFeetInches(heightDraftRange[0])}</Text>
              <Text style={styles.ageValue}>{inchesToFeetInches(heightDraftRange[1])}</Text>
            </View>
            <MultiSlider
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              step={1}
              values={heightDraftRange}
              sliderLength={width * 0.75}
              onValuesChange={setHeightDraftRange}
              selectedStyle={{ backgroundColor: '#222' }}
              unselectedStyle={{ backgroundColor: '#cfcfcf' }}
              markerStyle={styles.sliderMarker}
              trackStyle={{ height: 6, borderRadius: 3 }}
              containerStyle={{ marginTop: 20, alignSelf: 'center' }}
              pressedMarkerStyle={{ transform: [{ scale: 1.1 }] }}
            />
            <TouchableOpacity
              style={[
                styles.applyBtn,
                !heightSheetHasChanges && styles.applyBtnDisabled,
              ]}
              disabled={!heightSheetHasChanges}
              onPress={() => {
                setHeightFilter({
                  min: heightDraftRange[0],
                  max: heightDraftRange[1],
                  enabled: true,
                });
                setHeightModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {heightFilter.enabled && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setHeightFilter(prev => ({ ...prev, enabled: false }));
                  setHeightModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Location Input Modal */}
      <Modal visible={locationModal} transparent animationType="slide" onRequestClose={() => setLocationModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setLocationModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Location</Text>
            <Text style={styles.sheetSubtitle}>Enter a location to filter by</Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={styles.locationInputField}
                placeholder="Enter location (e.g., Mumbai)"
                placeholderTextColor="#999"
                value={locationInput}
                onChangeText={setLocationInput}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={async () => {
                  try {
                    setGettingLocation(true);
                    const verified = await getVerifiedLocation();
                    setLocationInput(verified.location);
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
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                if (locationInput && locationInput.trim()) {
                  setSelectedLocation(locationInput.trim());
                } else {
                  setSelectedLocation(null);
                }
                setLocationModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {selectedLocation && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedLocation(null);
                  setLocationModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Gender Preference Modal */}
      <Modal visible={genderModal} transparent animationType="slide" onRequestClose={() => setGenderModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setGenderModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>I'm interested in</Text>
            <Text style={styles.sheetSubtitle}>Select who you'd like to see</Text>
            <View style={styles.pickerWrapper}>
            <Picker
                selectedValue={selectedGender}
                onValueChange={value => setSelectedGender(value)}
                style={styles.sheetPicker}
                dropdownIconColor="#000"
              >
                <Picker.Item label="Open to all" value={null} color="#555" />
                <Picker.Item label="Men" value="male" color="#111" />
                <Picker.Item label="Women" value="female" color="#111" />
                <Picker.Item label="Both" value="both" color="#111" />
            </Picker>
            </View>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                setGenderModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {selectedGender && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedGender(null);
                  setGenderModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Distance Modal */}
      <Modal visible={distanceModal} transparent animationType="slide" onRequestClose={() => setDistanceModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDistanceModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Maximum distance</Text>
            <Text style={styles.sheetSubtitle}>How far are you willing to go?</Text>
            <View style={styles.pickerWrapper}>
            <Picker
                selectedValue={maxDistance}
                onValueChange={value => setMaxDistance(value)}
                style={styles.sheetPicker}
                dropdownIconColor="#000"
              >
                <Picker.Item label="Open to all" value={null} color="#555" />
                {distances.map(dist => (
                  <Picker.Item 
                    key={dist} 
                    label={`${dist} mi${dist >= 100 ? '+' : ''}`} 
                    value={dist} 
                    color="#111" 
                  />
              ))}
            </Picker>
            </View>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                setDistanceModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {maxDistance && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setMaxDistance(null);
                  setDistanceModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Intent Picker Modal */}
      <Modal visible={intentModal} transparent animationType="slide" onRequestClose={() => setIntentModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setIntentModal(false)} />
          <View style={styles.ageSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Dating Intentions</Text>
            <Text style={styles.sheetSubtitle}>Set what you're looking for</Text>
            <View style={styles.ageValueRow}>
              <Text style={styles.ageValue}>{selectedIntent || 'All'}</Text>
            </View>
            <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedIntent}
              onValueChange={value => setSelectedIntent(value)}
                style={styles.sheetPicker}
                dropdownIconColor="#000"
              >
                <Picker.Item label="All intentions" value={null} color="#555" />
                {intentions.map(intent => (
                  <Picker.Item key={intent} label={intent} value={intent} color="#111" />
                ))}
            </Picker>
            </View>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                setIntentModal(false);
              }}
            >
              <Text style={styles.applyBtnText}>Apply filter</Text>
            </TouchableOpacity>
            {selectedIntent && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedIntent(null);
                  setIntentModal(false);
                }}
              >
                <Text style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <SafeAreaView style={styles.bottomBarContainer} edges={['bottom']}>
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Matches')}>
            <MaterialCommunityIcons name="heart-multiple" size={32} color="#fff" />
          </TouchableOpacity>
          {/* Removed QuizScreen button */}
          <TouchableOpacity onPress={() => navigation.navigate('Tips')}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111' },
  container: { flex: 1, justifyContent: 'flex-start' },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    marginTop: Platform.OS === 'android' ? 30 : 10,
    zIndex: 2,
  },
  filterBtn: { backgroundColor: '#222', borderRadius: 20, padding: 8, marginHorizontal: 2 },
  filterText: { color: '#fff', fontWeight: 'bold' },
  card: {
    backgroundColor: '#222',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    width: Platform.select({ web: '100%', default: width - 40 }),
    maxWidth: Platform.select({ web: 1100, default: undefined }),
    alignSelf: 'center',
    justifyContent: 'flex-start',
    maxHeight: Platform.select({ web: '85vh', default: '90%' }),
    flex: 1,
    minHeight: Platform.select({ web: 600, default: 500 }),
    // Ensure content stays within bounds
    overflow: 'hidden',
    position: 'relative',
  },
  name: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  status: { color: '#bbb', marginBottom: 10, textAlign: 'center' },
  profileImage: Platform.select({
    web: {
      width: '100%',
      height: undefined,
      aspectRatio: 4 / 3,
      maxHeight: 300,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: '#333',
      objectFit: 'cover',
    },
    default: {
      width: width - 80,
      height: 150,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: '#333',
    }
  }),
  promptText: { fontSize: 16, color: '#fff', fontWeight: '500', marginTop: 8, textAlign: 'center', marginBottom: 8 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 0,
    gap: 8,
  },
  dislikeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  dislikeBtn: {
    backgroundColor: '#333',
    borderRadius: 32,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 6,
    minWidth: 48,
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginTop: 12,
    marginBottom: 8,
  },
  navBtn: {
    padding: 6,
  },
  bottomBarContainer: {
    backgroundColor: '#111',
    paddingBottom: Platform.OS === 'android' ? 24 : 0,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#222',
    height: 60,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalBtn: {
    backgroundColor: '#ff4d79',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  ageSheet: {
    backgroundColor: '#f6f6f6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cfcfcf',
    alignSelf: 'center',
    marginVertical: 14,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111',
  },
  sheetSubtitle: {
    textAlign: 'center',
    color: '#555',
    marginTop: 4,
  },
  ageValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 28,
  },
  ageValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
  },
  sliderMarker: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dealBreakerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 28,
    columnGap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#b5b5b5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  dealbreakerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  dealbreakerSubtitle: {
    color: '#5e5e5e',
    marginTop: 2,
  },
  pickerWrapper: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    overflow: 'hidden',
  },
  sheetPicker: {
    color: '#111',
    backgroundColor: '#fff',
  },
  applyBtn: {
    backgroundColor: '#111',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  applyBtnDisabled: {
    backgroundColor: '#d7d7d7',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: Dimensions.get('window').height * 0.9,
    minHeight: 500,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  filterScrollView: {
    flexGrow: 1,
  },
  filterScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  memberPreferencesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterCategoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  filterValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterValue: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  filterDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginLeft: 20,
  },
  clearFilterBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  clearFilterText: {
    color: '#6b6b6b',
    fontWeight: '600',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  locationInputField: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    height: 48,
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
  popupContainer: {
    position: 'absolute',
    top: '31%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  popupContent: {
    backgroundColor: 'rgba(34,34,34,0.97)',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 44,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 11,
    elevation: 11,
  },
  popupText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  filterLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  toggleBarContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 2,
    backgroundColor: '#fff', // minimalistic background
    borderRadius: 20,
    overflow: 'hidden',
    width: width - 40,
    height: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  toggleTabCommon: {
    // for future active/inactive state
  },
  leftTab: {
    // left tab specific styles if needed
  },
  rightTab: {
    // right tab specific styles if needed
  },
  toggleTabText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  compatibilityContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  compatibilityLabel: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 8,
  },
  compatibilityBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  compatibilityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  compatibilityScore: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    width: '100%',
  },
  cardContentContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
}); 