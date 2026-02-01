// Simple Service - Works with older React Native versions
// Uses AsyncStorage for local data and basic fetch for API calls

import AsyncStorage from '@react-native-async-storage/async-storage';

class SimpleService {
  constructor() {
    this.isOnline = true;
    this.isInitialized = false;
    this.currentUser = null; // Store current user email/username
  }

  // Initialize service
  async init() {
    try {
      this.isInitialized = true;
      console.log('✅ Simple service initialized');
    } catch (error) {
      console.error('❌ Simple service initialization failed:', error);
      throw error;
    }
  }

  // Set current user (call this after login)
  setCurrentUser(userEmail) {
    this.currentUser = userEmail;
    console.log('👤 SimpleService: Current user set to:', userEmail);
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user-specific storage key
  getUserProfileKey() {
    return this.currentUser ? `user_profile_${this.currentUser}` : 'user_profile';
  }

  // Force reload profile for current user
  async reloadProfile() {
    if (!this.currentUser) {
      console.log('⚠️ No current user set, cannot reload profile');
      return null;
    }
    return await this.getProfile();
  }

  // Check if device is online (simple check)
  async checkNetworkStatus() {
    try {
      // Simple network check - try to fetch a small resource
      const response = await fetch('https://httpbin.org/status/200', { 
        method: 'HEAD',
        timeout: 5000 
      });
      this.isOnline = response.ok;
      console.log(`🌐 Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
    } catch (error) {
      this.isOnline = false;
      console.log('📱 Network check failed, assuming offline');
    }
  }

  // PROFILE OPERATIONS
  async getProfile() {
    try {
      const profileKey = this.getUserProfileKey();
      console.log('🔍 SimpleService: Getting profile from storage for user:', this.currentUser);
      console.log('🔑 SimpleService: Using profile key:', profileKey);
      
      // Try to get from local storage
      const stored = await AsyncStorage.getItem(profileKey);
      console.log('📱 SimpleService: Raw stored data:', stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ SimpleService: Parsed profile data:', parsed);
        return parsed;
      }
      
      console.log('⚠️ SimpleService: No profile data found for user:', this.currentUser);
      return null;
    } catch (error) {
      console.error('❌ SimpleService: Failed to get profile from storage:', error);
      return null;
    }
  }

  async updateProfile(profileData) {
    try {
      const profileKey = this.getUserProfileKey();
      console.log('💾 SimpleService: Saving profile data for user:', this.currentUser);
      console.log('🔑 SimpleService: Using profile key:', profileKey);
      console.log('📊 SimpleService: Profile data:', profileData);
      
      // Save to local storage
      const profileString = JSON.stringify(profileData);
      console.log('📝 SimpleService: Profile JSON string:', profileString);
      
      await AsyncStorage.setItem(profileKey, profileString);
      console.log('✅ SimpleService: Profile saved to AsyncStorage');
      
      // Verify the save
      const savedData = await AsyncStorage.getItem(profileKey);
      console.log('🔍 SimpleService: Verification - saved data:', savedData);
      
      // Try to sync with backend if online
      if (this.isOnline) {
        try {
          const result = await this.syncToBackend(profileData);
          console.log('✅ SimpleService: Profile saved and synced to backend');
          return result;
        } catch (error) {
          console.log('⚠️ SimpleService: Backend sync failed, data saved locally');
        }
      }
      
      return { message: 'Profile updated successfully' };
    } catch (error) {
      console.error('❌ SimpleService: Failed to save profile:', error);
      throw error;
    }
  }

  // USER OPERATIONS
  async getUsers() {
    try {
      // Try to get from local storage
      const stored = await AsyncStorage.getItem('users_list');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to get users from storage:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      await AsyncStorage.setItem('users_list', JSON.stringify(users));
      console.log('✅ Users saved locally');
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  }

  // MATCH OPERATIONS
  async getMatches() {
    try {
      const stored = await AsyncStorage.getItem('user_matches');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to get matches from storage:', error);
      return [];
    }
  }

  async saveMatch(matchData) {
    try {
      const matches = await this.getMatches();
      matches.push(matchData);
      await AsyncStorage.setItem('user_matches', JSON.stringify(matches));
      console.log('✅ Match saved locally');
    } catch (error) {
      console.error('Failed to save match:', error);
    }
  }

  // MESSAGE OPERATIONS
  async getMessages(matchId) {
    try {
      const stored = await AsyncStorage.getItem(`messages_${matchId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to get messages from storage:', error);
      return [];
    }
  }

  async saveMessage(messageData) {
    try {
      const messages = await this.getMessages(messageData.matchId || 'default');
      messages.push(messageData);
      await AsyncStorage.setItem(`messages_${messageData.matchId || 'default'}`, JSON.stringify(messages));
      console.log('✅ Message saved locally');
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  // LIKE OPERATIONS
  async saveLike(likeData) {
    try {
      const likes = await this.getLikes();
      likes.push(likeData);
      await AsyncStorage.setItem('user_likes', JSON.stringify(likes));
      console.log('✅ Like saved locally');
    } catch (error) {
      console.error('Failed to save like:', error);
    }
  }

  async getLikes() {
    try {
      const stored = await AsyncStorage.getItem('user_likes');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Failed to get likes from storage:', error);
      return [];
    }
  }

  // BACKEND SYNC
  async syncToBackend(data) {
    try {
      // Get authentication token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      // Simple backend sync - you can customize this
      const response = await fetch('https://deepmatch.onrender.com/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Backend sync failed:', error);
      throw error;
    }
  }

  // UTILITY OPERATIONS
  async clearData() {
    try {
      // Clear current user session but keep their profile
      // Only clear session-specific data
      const keysToRemove = [
        'users_list',
        'user_matches',
        'user_likes',
        'messages_default'
      ];
      
      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.log(`Failed to remove key ${key}:`, error);
        }
      }
      
      // Clear current user reference
      this.currentUser = null;
      console.log('✅ Session data cleared (profile kept for user)');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  // Clear everything including profile (for complete reset)
  async clearAllData() {
    try {
      const profileKey = this.getUserProfileKey();
      const keysToRemove = [
        profileKey, // Clear current user's profile
        'users_list',
        'user_matches',
        'user_likes',
        'messages_default'
      ];
      
      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.log(`Failed to remove key ${key}:`, error);
        }
      }
      
      // Clear current user reference
      this.currentUser = null;
      console.log('✅ All data cleared including profile for current user');
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }

  async getStorageInfo() {
    try {
      // Use a try-catch for getAllKeys in case it's not available
      let keys = [];
      try {
        keys = await AsyncStorage.getAllKeys();
      } catch (error) {
        console.log('getAllKeys not available, using known keys');
        keys = [
          'user_profile',
          'users_list',
          'user_matches',
          'user_likes',
          'messages_default'
        ];
      }
      
      const info = {};
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          info[key] = value ? JSON.parse(value) : null;
        } catch (error) {
          console.log(`Failed to get value for key ${key}:`, error);
          info[key] = null;
        }
      }
      
      return info;
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {};
    }
  }

  // Check service status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      storage: 'AsyncStorage'
    };
  }
}

// Create and export a single instance
const simpleService = new SimpleService();
export default simpleService;

