import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Dimensions, Modal, Animated, ScrollView, Alert } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://10.167.73.132:5000';

const { width } = Dimensions.get('window');

// Helper function to get local image source
const getLocalImageSource = (imageName) => {
  const imageMap = {
    'akshat.jpg': require('../assets/akshat.jpg'),
    'arya.jpg': require('../assets/arya.jpg'),
    'zion.jpg': require('../assets/zion.jpg'),
    'harshal.jpg': require('../assets/harshal.jpg'),
    'archee.jpg': require('../assets/archee.jpg'),
    'manthan.jpg': require('../assets/manthan.jpg'),
    'vanshita.jpg': require('../assets/vanshita.jpg'),
    'priyanshi.jpg': require('../assets/priyanshi.jpg'),
    'pfp.jpg': require('../assets/pfp.jpg'),
  };
  return imageMap[imageName] || require('../assets/pfp.jpg');
};

// Helper to convert inches to feet/inches string
function inchesToFeetInches(inches) {
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

// Generate age and height options
const ages = Array.from({ length: 60 - 16 + 1 }, (_, i) => 16 + i);
const heights = Array.from({ length: (84 - 57) + 1 }, (_, i) => 57 + i); // 4'9" to 7'0"
const intentions = ['Long Term', 'Short Term', 'Casual'];

export default function HomeScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [profileIndex, setProfileIndex] = useState(0);
  const [rosesLeft, setRosesLeft] = useState(3);
  const [dislikedProfiles, setDislikedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Filter states
  const [selectedAge, setSelectedAge] = useState(null);
  const [selectedHeight, setSelectedHeight] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [filterModal, setFilterModal] = useState(false);
  const [ageModal, setAgeModal] = useState(false);
  const [heightModal, setHeightModal] = useState(false);
  const [intentModal, setIntentModal] = useState(false);

  // Load current user and compatible matches from backend
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadCompatibleMatches();
    }
  }, [currentUser]);

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
      const response = await fetch(`${API_BASE_URL}/api/compatible-matches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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

  // Filter out disliked profiles and apply gender filtering
  const filteredProfiles = profiles.filter(profile => {
    // Gender-based filtering: show opposite gender only
    const userGender = (currentUser?.gender || '').trim().toLowerCase();
    const profileGender = (profile?.gender || '').trim().toLowerCase();
    
    // Only show opposite gender, no exceptions
    const isOppositeGender = 
      (userGender === 'male' && profileGender === 'female') ||
      (userGender === 'female' && profileGender === 'male');

    return (
      isOppositeGender &&
      (!selectedAge || profile.age === selectedAge) &&
      (!selectedHeight || profile.height === selectedHeight) &&
      (!selectedIntent || profile.intention === selectedIntent) &&
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

  const handleRose = () => {
    if (rosesLeft > 0) {
      animateButton(roseAnim);
      showPopup('rose', filteredProfiles[profileIndex]?.name);
      setRosesLeft(rosesLeft - 1);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Filters */}
        <View style={styles.filters}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Ionicons name="options-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setAgeModal(true)}>
            <Text style={styles.filterText}>Age {selectedAge ? `: ${selectedAge}` : '▼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setHeightModal(true)}>
            <Text style={styles.filterText}>Height {selectedHeight ? `: ${inchesToFeetInches(selectedHeight)}` : '▼'}</Text>
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
                  profile.profile_picture && profile.profile_picture.startsWith('http') 
                    ? { uri: profile.profile_picture }
                    : getLocalImageSource(profile.profile_picture)
                } 
                style={styles.profileImage} 
                resizeMode="cover"
                defaultSource={require('../assets/pfp.jpg')}
              />
              <Text style={styles.promptText}>{profile.bio || 'No bio available'}</Text>
              
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
      <Modal visible={filterModal} transparent animationType="fade" onRequestClose={() => setFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 280 }]}>
            <Text style={styles.modalTitle}>Filter Matches</Text>
            <ScrollView>
              <Text style={styles.filterLabel}>Age</Text>
              <Picker
                selectedValue={selectedAge}
                onValueChange={value => setSelectedAge(value)}
                style={{ color: '#fff', backgroundColor: '#222' }}
              >
                <Picker.Item label="All" value={null} />
                {ages.map(age => <Picker.Item key={age} label={age.toString()} value={age} />)}
              </Picker>
              <Text style={styles.filterLabel}>Height</Text>
              <Picker
                selectedValue={selectedHeight}
                onValueChange={value => setSelectedHeight(value)}
                style={{ color: '#fff', backgroundColor: '#222' }}
              >
                <Picker.Item label="All" value={null} />
                {heights.map(height => (
                  <Picker.Item key={height} label={inchesToFeetInches(height)} value={height} />
                ))}
              </Picker>
              <Text style={styles.filterLabel}>Dating Intentions</Text>
              <Picker
                selectedValue={selectedIntent}
                onValueChange={value => setSelectedIntent(value)}
                style={{ color: '#fff', backgroundColor: '#222' }}
              >
                <Picker.Item label="All" value={null} />
                {intentions.map(intent => <Picker.Item key={intent} label={intent} value={intent} />)}
              </Picker>
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { marginTop: 16 }]} onPress={() => setFilterModal(false)}>
              <Text style={styles.modalBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Age Picker Modal */}
      <Modal visible={ageModal} transparent animationType="fade" onRequestClose={() => setAgeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 200 }]}>
            <Text style={styles.modalTitle}>Select Age</Text>
            <Picker
              selectedValue={selectedAge}
              onValueChange={value => setSelectedAge(value)}
              style={{ color: '#fff', backgroundColor: '#222' }}
            >
              <Picker.Item label="All" value={null} />
              {ages.map(age => <Picker.Item key={age} label={age.toString()} value={age} />)}
            </Picker>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setAgeModal(false)}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Height Picker Modal */}
      <Modal visible={heightModal} transparent animationType="fade" onRequestClose={() => setHeightModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 200 }]}>
            <Text style={styles.modalTitle}>Select Height</Text>
            <Picker
              selectedValue={selectedHeight}
              onValueChange={value => setSelectedHeight(value)}
              style={{ color: '#fff', backgroundColor: '#222' }}
            >
              <Picker.Item label="All" value={null} />
              {heights.map(height => (
                <Picker.Item key={height} label={inchesToFeetInches(height)} value={height} />
              ))}
            </Picker>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setHeightModal(false)}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Intent Picker Modal */}
      <Modal visible={intentModal} transparent animationType="fade" onRequestClose={() => setIntentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 200 }]}>
            <Text style={styles.modalTitle}>Select Intent</Text>
            <Picker
              selectedValue={selectedIntent}
              onValueChange={value => setSelectedIntent(value)}
              style={{ color: '#fff', backgroundColor: '#222' }}
            >
              <Picker.Item label="All" value={null} />
              {intentions.map(intent => <Picker.Item key={intent} label={intent} value={intent} />)}
            </Picker>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setIntentModal(false)}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
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
  name: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  status: { color: '#bbb', marginBottom: 10 },
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