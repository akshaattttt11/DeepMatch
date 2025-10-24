// Simple Service - Node.js compatible version for testing
// This version doesn't use AsyncStorage (which only works in React Native)

class SimpleService {
  constructor() {
    this.isOnline = true;
    this.isInitialized = false;
    this.mockStorage = {}; // Mock storage for testing
    this.authToken = null; // Store JWT token
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

  // PROFILE OPERATIONS (Mock version)
  async getProfile() {
    try {
      return this.mockStorage['user_profile'] || null;
    } catch (error) {
      console.error('Failed to get profile from storage:', error);
      return null;
    }
  }

  async updateProfile(profileData) {
    try {
      // Save to mock storage
      this.mockStorage['user_profile'] = profileData;
      console.log('✅ Profile saved locally');
      
      // Try to sync with backend if online
      if (this.isOnline) {
        try {
          await this.syncToBackend(profileData);
          console.log('✅ Profile synced to backend');
        } catch (error) {
          console.log('⚠️ Backend sync failed, data saved locally');
        }
      }
      
      return { message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }

  // USER OPERATIONS (Mock version)
  async getUsers() {
    try {
      return this.mockStorage['users_list'] || [];
    } catch (error) {
      console.error('Failed to get users from storage:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      this.mockStorage['users_list'] = users;
      console.log('✅ Users saved locally');
    } catch (error) {
      console.error('Failed to save users:', error);
    }
  }

  // MATCH OPERATIONS (Mock version)
  async getMatches() {
    try {
      return this.mockStorage['user_matches'] || [];
    } catch (error) {
      console.error('Failed to get matches from storage:', error);
      return [];
    }
  }

  async saveMatch(matchData) {
    try {
      const matches = await this.getMatches();
      matches.push(matchData);
      this.mockStorage['user_matches'] = matches;
      console.log('✅ Match saved locally');
    } catch (error) {
      console.error('Failed to save match:', error);
    }
  }

  // MESSAGE OPERATIONS (Mock version)
  async getMessages(matchId) {
    try {
      return this.mockStorage[`messages_${matchId}`] || [];
    } catch (error) {
      console.error('Failed to get messages from storage:', error);
      return [];
    }
  }

  async saveMessage(messageData) {
    try {
      const messages = await this.getMessages(messageData.matchId || 'default');
      messages.push(messageData);
      this.mockStorage[`messages_${messageData.matchId || 'default'}`] = messages;
      console.log('✅ Message saved locally');
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  // LIKE OPERATIONS (Mock version)
  async saveLike(likeData) {
    try {
      const likes = await this.getLikes();
      likes.push(likeData);
      this.mockStorage['user_likes'] = likes;
      console.log('✅ Like saved locally');
    } catch (error) {
      console.error('Failed to save like:', error);
    }
  }

  async getLikes() {
    try {
      return this.mockStorage['user_likes'] || [];
    } catch (error) {
      console.error('Failed to get likes from storage:', error);
      return [];
    }
  }

  // AUTHENTICATION HELPERS
  async registerTestUser() {
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'testpassword123',
          first_name: 'Test',
          last_name: 'User'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('✅ Test user registered and authenticated');
        return true;
      } else {
        console.log('⚠️ Test user registration failed, trying login');
        return await this.loginTestUser();
      }
    } catch (error) {
      console.error('Failed to register test user:', error);
      return false;
    }
  }

  async loginTestUser() {
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('✅ Test user logged in');
        return true;
      } else {
        console.log('❌ Test user login failed');
        return false;
      }
    } catch (error) {
      console.error('Failed to login test user:', error);
      return false;
    }
  }

  // BACKEND SYNC
  async syncToBackend(data) {
    try {
      // Ensure we have authentication
      if (!this.authToken) {
        const authSuccess = await this.registerTestUser();
        if (!authSuccess) {
          throw new Error('Authentication failed');
        }
      }

      // Simple backend sync with authentication
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
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
      this.mockStorage = {};
      this.authToken = null;
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  async getStorageInfo() {
    try {
      return this.mockStorage;
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
      storage: 'MockStorage (Node.js)',
      hasAuthToken: !!this.authToken
    };
  }
}

// Create and export a single instance
const simpleService = new SimpleService();
module.exports = simpleService; 