// Hybrid Service - Combines Local SQLite + Flask Backend
// Works offline with local data, syncs when online

import apiService from './api';
import localDatabase from './localDatabase';
import NetInfo from '@react-native-community/netinfo';

class HybridService {
  constructor() {
    this.isOnline = true;
    this.syncQueue = [];
    this.isInitialized = false;
  }

  // Initialize both services
  async init() {
    try {
      // Initialize local database
      await localDatabase.init();
      
      // Check network status
      this.checkNetworkStatus();
      
      // Start network monitoring
      this.startNetworkMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Hybrid service initialized');
    } catch (error) {
      console.error('❌ Hybrid service initialization failed:', error);
      throw error;
    }
  }

  // Check if device is online
  checkNetworkStatus() {
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected && state.isInternetReachable;
      console.log(`🌐 Network status: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      // If coming back online, sync data
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncData();
      }
    });
  }

  // Start monitoring network changes
  startNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (!wasOnline && this.isOnline) {
        console.log('🌐 Back online! Syncing data...');
        this.syncData();
      } else if (wasOnline && !this.isOnline) {
        console.log('📱 Going offline, using local data');
      }
    });
  }

  // Add operation to sync queue
  addToSyncQueue(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now(),
      retryCount: 0
    });
    console.log('📝 Added to sync queue:', operation.type);
  }

  // Sync pending operations with backend
  async syncData() {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    console.log('🔄 Syncing data with backend...');
    
    const operations = [...this.syncQueue];
    this.syncQueue = [];
    
    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        console.log('✅ Synced operation:', operation.type);
      } catch (error) {
        console.error('❌ Sync failed for operation:', operation.type, error);
        
        // Add back to queue if retry count < 3
        if (operation.retryCount < 3) {
          operation.retryCount++;
          this.syncQueue.push(operation);
        }
      }
    }
  }

  // Execute a queued operation
  async executeOperation(operation) {
    switch (operation.type) {
      case 'UPDATE_PROFILE':
        await apiService.updateProfile(operation.data);
        break;
      case 'SEND_MESSAGE':
        await apiService.sendMessage(operation.data.receiver_id, operation.data.content);
        break;
      case 'LIKE_USER':
        await apiService.likeUser(operation.data.user_id);
        break;
      default:
        console.warn('Unknown operation type:', operation.type);
    }
  }

  // PROFILE OPERATIONS
  async getProfile(userId = null) {
    // Try to get from local database first
    let profile = null;
    
    if (userId) {
      profile = await localDatabase.getUser(userId);
    } else {
      // Get current user profile (you'll need to implement user identification)
      const users = await localDatabase.getUsers();
      profile = users[0]; // For now, get first user
    }
    
    // If online and no local data, try backend
    if (this.isOnline && !profile) {
      try {
        const response = await apiService.getProfile();
        profile = response.user;
        
        // Save to local database
        if (profile) {
          await localDatabase.saveUser(profile);
        }
      } catch (error) {
        console.error('Failed to get profile from backend:', error);
      }
    }
    
    return profile;
  }

  async updateProfile(profileData) {
    // Update local database first
    await localDatabase.saveUser(profileData);
    
    if (this.isOnline) {
      try {
        await apiService.updateProfile(profileData);
        console.log('✅ Profile updated on backend');
      } catch (error) {
        console.error('Failed to update profile on backend:', error);
        this.addToSyncQueue({ 
          type: 'UPDATE_PROFILE', 
          data: profileData 
        });
      }
    } else {
      this.addToSyncQueue({ 
        type: 'UPDATE_PROFILE', 
        data: profileData 
      });
    }
    
    return { message: 'Profile updated locally' };
  }

  // USER OPERATIONS
  async getUsers() {
    // Get users from local database
    let users = await localDatabase.getUsers();
    
    if (this.isOnline && users.length === 0) {
      try {
        // Try to get from backend
        const response = await apiService.getUsers();
        users = response.users;
        
        // Save users locally
        for (const user of users) {
          await localDatabase.saveUser(user);
        }
      } catch (error) {
        console.error('Failed to get users from backend:', error);
      }
    }
    
    return users;
  }

  async likeUser(userId) {
    // Save like locally first
    const likeData = {
      id: Date.now(),
      user_id: this.getCurrentUserId(),
      liked_user_id: userId,
      created_at: new Date().toISOString()
    };
    
    await localDatabase.saveLike(likeData);
    
    if (this.isOnline) {
      try {
        await apiService.likeUser(userId);
        console.log('✅ Like sent to backend');
      } catch (error) {
        console.error('Failed to send like to backend:', error);
        this.addToSyncQueue({ 
          type: 'LIKE_USER', 
          data: { user_id: userId } 
        });
      }
    } else {
      this.addToSyncQueue({ 
        type: 'LIKE_USER', 
        data: { user_id: userId } 
      });
    }
    
    return { message: 'Like saved locally' };
  }

  async getMatches() {
    // Get matches from local database
    let matches = await localDatabase.getMatches();
    
    if (this.isOnline && matches.length === 0) {
      try {
        // Try to get from backend
        const response = await apiService.getMatches();
        matches = response.matches;
        
        // Save matches locally
        for (const match of matches) {
          await localDatabase.saveMatch(match);
        }
      } catch (error) {
        console.error('Failed to get matches from backend:', error);
      }
    }
    
    return matches;
  }

  async getMessages(matchId) {
    // Get messages from local database
    let messages = await localDatabase.getMessages(matchId);
    
    if (this.isOnline && messages.length === 0) {
      try {
        // Try to get from backend
        const response = await apiService.getMessages(matchId);
        messages = response.messages;
        
        // Save messages locally
        for (const message of messages) {
          await localDatabase.saveMessage(message);
        }
      } catch (error) {
        console.error('Failed to get messages from backend:', error);
      }
    }
    
    return messages;
  }

  async sendMessage(receiverId, content) {
    // Save message locally first
    const messageData = {
      id: Date.now(),
      sender_id: this.getCurrentUserId(), // You'll need to implement this
      receiver_id: receiverId,
      content: content,
      sent_at: new Date().toISOString()
    };
    
    await localDatabase.saveMessage(messageData);
    
    if (this.isOnline) {
      try {
        await apiService.sendMessage(receiverId, content);
        console.log('✅ Message sent to backend');
      } catch (error) {
        console.error('Failed to send message to backend:', error);
        this.addToSyncQueue({ 
          type: 'SEND_MESSAGE', 
          data: { receiver_id: receiverId, content: content } 
        });
      }
    } else {
      this.addToSyncQueue({ 
        type: 'SEND_MESSAGE', 
        data: { receiver_id: receiverId, content: content } 
      });
    }
    
    return { message: 'Message saved locally' };
  }

  // UTILITY METHODS
  getCurrentUserId() {
    // You'll need to implement this based on your auth system
    // Could be stored in AsyncStorage or context
    return null; // Placeholder
  }

  async getDatabaseInfo() {
    return await localDatabase.getDatabaseInfo();
  }

  async clearData() {
    await localDatabase.clearData();
    this.syncQueue = [];
  }

  // Check sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      pendingOperations: this.syncQueue.length,
      lastSync: this.syncQueue.length > 0 ? this.syncQueue[0].timestamp : null
    };
  }
}

// Create and export a single instance
const hybridService = new HybridService();
export default hybridService;

// Usage example:
/*
import hybridService from '../services/hybridService';

// Initialize
await hybridService.init();

// Use like a normal service
const users = await hybridService.getUsers();
const profile = await hybridService.getProfile(1);

// Check sync status
const syncStatus = hybridService.getSyncStatus();
console.log('Sync status:', syncStatus);
*/ 