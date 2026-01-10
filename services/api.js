// API Service - Handles all communication with Flask Backend

const API_BASE_URL = 'http://10.185.247.132:5000'; // Change this to your Flask server URL

class ApiService {
  constructor() {
    this.token = null;
  }

  // Set JWT token for authenticated requests
  setToken(token) {
    this.token = token;
  }

  // Get current JWT token
  getToken() {
    return this.token;
  }

  // Generic request method
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // AUTHENTICATION
  async register(userData) {
    return this.makeRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email, password) {
    const response = await this.makeRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store token for future requests
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // PROFILE MANAGEMENT
  async getProfile() {
    return this.makeRequest('/api/profile');
  }

  async updateProfile(profileData) {
    return this.makeRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // USER BROWSING
  async getUsers() {
    return this.makeRequest('/api/users');
  }

  async likeUser(userId) {
    return this.makeRequest('/api/like', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // MATCHES & MESSAGING
  async getMatches() {
    return this.makeRequest('/api/matches');
  }

  async getMessages(matchId) {
    return this.makeRequest(`/api/messages/${matchId}`);
  }

  async sendMessage(receiverId, content) {
    return this.makeRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: receiverId,
        content: content,
      }),
    });
  }

  // HEALTH CHECK
  async healthCheck() {
    try {
      const response = await this.makeRequest('/api/health');
      return { status: 'healthy', data: response };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // LOGOUT
  logout() {
    this.token = null;
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;

// Usage example:
/*
import apiService from '../services/api';

// Set token after login
apiService.setToken('your-jwt-token');

// Make authenticated requests
const profile = await apiService.getProfile();
const users = await apiService.getUsers();

// Check API health
const health = await apiService.healthCheck();
*/ 