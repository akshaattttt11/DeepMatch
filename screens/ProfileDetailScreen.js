import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'http://10.220.165.132:5000';

export default function ProfileDetailScreen({ route, navigation }) {
  const { userId } = route.params;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoListRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        navigation.goBack();
        return;
      }

      const data = await res.json();
      // Enhanced debugging - check what we're actually receiving
      console.log('=== PROFILE API RESPONSE ===');
      console.log('Full response:', JSON.stringify(data, null, 2));
      console.log('Has gender?', 'gender' in data, 'Value:', data.gender);
      console.log('Has height?', 'height' in data, 'Value:', data.height);
      console.log('Has dating_intention?', 'dating_intention' in data, 'Value:', data.dating_intention);
      console.log('All response keys:', Object.keys(data));
      console.log('=== END API RESPONSE ===');
      setProfile(data);
    } catch (e) {
      console.error(e);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ✅ PHOTO CAROUSEL SOURCE (correct)
  const photos = profile
    ? [...new Set([profile.profile_picture, ...(profile.photos || [])].filter(Boolean))]
    : [];

  const renderPhoto = ({ item }) => (
    <Image source={{ uri: item }} style={styles.photo} />
  );

  // ✅ FORCE CORRECT VALUES (QuizResult ONLY)
  const mbti = profile?.mbti_type || null;
  const enneagram = profile?.enneagram_type ? `Type ${profile.enneagram_type}` : null;
  const loveLanguage = profile?.love_language || null;
  const zodiac = profile?.zodiac_sign || null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER (FIXED POSITION) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* PHOTOS */}
      <View style={styles.photoContainer}>
        <FlatList
          ref={photoListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(_, i) => `photo-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setCurrentPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        />

        {photos.length > 1 && (
          <View style={styles.indicators}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentPhotoIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <ScrollView>
        <View style={styles.infoContainer}>
          {/* ✅ NAME + AGE FIXED */}
          <Text style={styles.name}>
            {profile.first_name} {profile.last_name}
            {profile.age ? `, ${profile.age}` : ''}
          </Text>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* ✅ BADGES (100% CORRECT SOURCE) */}
          <View style={styles.badges}>
            {mbti && <Badge icon="planet-outline" text={mbti} />}
            {enneagram && <Badge icon="flower-outline" text={enneagram} />}
            {loveLanguage && <Badge icon="heart-outline" text={loveLanguage} />}
            {zodiac && <Badge icon="sunny-outline" text={zodiac} />}
          </View>

          {/* DETAILS SECTION (Hinge-style) */}
          <View style={styles.detailsSection}>
            {(() => {
              const detailItems = [];
              
              // Helper function to check if value exists
              const hasValue = (val) => {
                return val !== null && val !== undefined && val !== '' && String(val).trim() !== '';
              };
              
              // Debug: Check what we have in profile
              console.log('=== PROFILE DEBUG ===');
              console.log('profile.age:', profile.age, 'Type:', typeof profile.age);
              console.log('profile.gender:', profile.gender, 'Type:', typeof profile.gender);
              console.log('profile.height:', profile.height, 'Type:', typeof profile.height);
              console.log('profile.dating_intention:', profile.dating_intention, 'Type:', typeof profile.dating_intention);
              console.log('profile.location:', profile.location, 'Type:', typeof profile.location);
              console.log('Full profile keys:', Object.keys(profile));
              
              // Age
              if (hasValue(profile.age)) {
                detailItems.push({ icon: 'calendar-outline', label: 'Age', value: String(profile.age) });
              }
              
              // Gender - try different possible field names and capitalize first letter
              const genderValue = profile.gender || profile.gender_type || profile.sex;
              if (hasValue(genderValue)) {
                const capitalizedGender = String(genderValue).charAt(0).toUpperCase() + String(genderValue).slice(1).toLowerCase();
                detailItems.push({ icon: 'person-outline', label: 'Gender', value: capitalizedGender });
              }
              
              // Height - try different possible field names
              const heightValue = profile.height || profile.height_inches || profile.height_cm;
              if (hasValue(heightValue)) {
                detailItems.push({ icon: 'resize-outline', label: 'Height', value: String(heightValue) });
              }
              
              // Dating Intention - try different possible field names
              const datingIntentionValue = profile.dating_intention || profile.dating_goal || profile.relationship_goal || profile.looking_for;
              if (hasValue(datingIntentionValue)) {
                detailItems.push({ icon: 'search-outline', label: 'Dating Intention', value: String(datingIntentionValue) });
              }
              
              // Location
              if (hasValue(profile.location)) {
                detailItems.push({ icon: 'location-outline', label: 'Location', value: String(profile.location) });
              }
              
              // Debug: Log what items we're adding
              console.log('Detail items to render:', detailItems);
              console.log('=== END DEBUG ===');
              
              return detailItems.map((item, index) => (
                <DetailItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  isLast={index === detailItems.length - 1}
                />
              ));
            })()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- BADGE COMPONENT ---------- */
const Badge = ({ icon, text }) => (
  <View style={styles.badge}>
    <Ionicons name={icon} size={16} color="#10b981" />
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

/* ---------- DETAIL ITEM COMPONENT (Hinge-style) ---------- */
const DetailItem = ({ icon, label, value, isLast }) => (
  <View style={[styles.detailItem, isLast && styles.detailItemLast]}>
    <Ionicons name={icon} size={20} color="#fff" style={styles.detailIcon} />
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20, // ✅ moved DOWN
    paddingBottom: 16,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  photoContainer: {
    width,
    height: height * 0.6,
  },

  photo: {
    width,
    height: '100%',
  },

  indicators: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },

  infoContainer: {
    padding: 20,
    marginTop: 32, // ✅ text lower
  },

  name: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },

  bio: {
    color: '#ddd',
    fontSize: 16,
    marginBottom: 20,
  },

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  badgeText: {
    color: '#10b981',
    marginLeft: 6,
    fontWeight: '600',
  },

  detailsSection: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  detailItemLast: {
    borderBottomWidth: 0,
  },

  detailIcon: {
    marginRight: 16,
    width: 24,
  },

  detailContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  detailLabel: {
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },

  detailValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
