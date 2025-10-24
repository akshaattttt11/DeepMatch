import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  ActivityIndicator, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://10.167.73.132:5000';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [newMatch, setNewMatch] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));

  useEffect(() => {
    loadMatches();
    loadMockMessages();
    loadMockNotifications();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/matches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      } else {
        console.error('Failed to load matches');
        // Fallback to mock data
        const mockMatches = [
        {
          id: 1,
          name: 'Sarah',
          age: 24,
          profile_picture: 'https://ui-avatars.com/api/?name=Sarah&background=10b981&color=fff&size=256',
          location: 'New York',
          bio: 'Love hiking and coffee ☕️',
          overall_score: 92,
          deepmatch_score: 88,
          zodiac_score: 95,
          breakdown: {
            mbti: 90,
            enneagram: 85,
            love_language: 88,
            psychological: 89,
            zodiac: 95
          },
          last_seen: '2 minutes ago',
          is_online: true
        },
        {
          id: 2,
          name: 'Emma',
          age: 26,
          profile_picture: 'https://ui-avatars.com/api/?name=Emma&background=ff6b6b&color=fff&size=256',
          location: 'Los Angeles',
          bio: 'Artist and dog lover 🎨🐕',
          overall_score: 87,
          deepmatch_score: 85,
          zodiac_score: 89,
          breakdown: {
            mbti: 82,
            enneagram: 88,
            love_language: 85,
            psychological: 87,
            zodiac: 89
          },
          last_seen: '1 hour ago',
          is_online: false
        },
        {
          id: 3,
          name: 'Jessica',
          age: 23,
          profile_picture: 'https://ui-avatars.com/api/?name=Jessica&background=4ecdc4&color=fff&size=256',
          location: 'Chicago',
          bio: 'Fitness enthusiast and traveler ✈️',
          overall_score: 84,
          deepmatch_score: 90,
          zodiac_score: 78,
          breakdown: {
            mbti: 92,
            enneagram: 88,
            love_language: 90,
            psychological: 89,
            zodiac: 78
          },
          last_seen: '30 minutes ago',
          is_online: true
        }
      ];
      
        setMatches(mockMatches);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
      // Use mock data as fallback
      const mockMatches = [
        {
          id: 1,
          name: 'Sarah',
          age: 24,
          profile_picture: 'https://ui-avatars.com/api/?name=Sarah&background=10b981&color=fff&size=256',
          compatibility: { overall: 85, deepmatch: 90, zodiac: 75 }
        }
      ];
      setMatches(mockMatches);
    } finally {
      setLoading(false);
    }
  };

  const loadMockMessages = () => {
    // Mock messages for each match
    const mockMessages = {
      1: [
        { id: 1, text: "Hey! How's your day going?", sender: 'them', timestamp: '2:30 PM', isRead: true },
        { id: 2, text: "Pretty good! Just finished a hike 🥾", sender: 'me', timestamp: '2:32 PM', isRead: true },
        { id: 3, text: "That sounds amazing! I love hiking too", sender: 'them', timestamp: '2:35 PM', isRead: true },
        { id: 4, text: "We should go together sometime!", sender: 'me', timestamp: '2:36 PM', isRead: false }
      ],
      2: [
        { id: 1, text: "Your art is incredible! 🎨", sender: 'me', timestamp: '1:15 PM', isRead: true },
        { id: 2, text: "Thank you so much! What kind of art do you like?", sender: 'them', timestamp: '1:20 PM', isRead: true }
      ],
      3: [
        { id: 1, text: "Ready for our workout today? 💪", sender: 'them', timestamp: '10:00 AM', isRead: true },
        { id: 2, text: "Absolutely! Meet at the gym at 6?", sender: 'me', timestamp: '10:05 AM', isRead: true }
      ]
    };
    setMessages(mockMessages);
  };

  const loadMockNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        return;
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
    
    // Fallback to mock data
    const mockNotifications = [
      {
        id: 1,
        type: 'like',
        user: {
          id: 4,
          name: 'Alex',
          age: 25,
          profile_picture: 'https://ui-avatars.com/api/?name=Alex&background=8b5cf6&color=fff&size=256',
          bio: 'Photographer and travel enthusiast 📸',
          compatibility_score: 89,
          compatibility_type: 'DeepMatch'
        },
        timestamp: '5 minutes ago',
        isRead: false
      },
      {
        id: 2,
        type: 'like',
        user: {
          id: 5,
          name: 'Maya',
          age: 23,
          profile_picture: 'https://ui-avatars.com/api/?name=Maya&background=f59e0b&color=fff&size=256',
          bio: 'Yoga instructor and nature lover 🧘‍♀️',
          compatibility_score: 92,
          compatibility_type: 'Zodiac'
        },
        timestamp: '1 hour ago',
        isRead: false
      },
      {
        id: 3,
        type: 'like',
        user: {
          id: 6,
          name: 'Jordan',
          age: 27,
          profile_picture: 'https://ui-avatars.com/api/?name=Jordan&background=06b6d4&color=fff&size=256',
          bio: 'Chef and food blogger 👨‍🍳',
          compatibility_score: 85,
          compatibility_type: 'DeepMatch'
        },
        timestamp: '2 hours ago',
        isRead: true
      }
    ];
    setNotifications(mockNotifications);
  };

  const getBestCompatibilityScore = (match) => {
    // Use the higher of the two scores, or overall if available
    const deepmatch = match.deepmatch_score || 0;
    const zodiac = match.zodiac_score || 0;
    const overall = match.overall_score || 0;
    
    // Return the highest score, prioritizing overall if it's reasonable
    if (overall > 0 && overall >= Math.max(deepmatch, zodiac)) {
      return { score: overall, type: 'Overall' };
    } else if (deepmatch >= zodiac) {
      return { score: deepmatch, type: 'DeepMatch' };
    } else {
      return { score: zodiac, type: 'Zodiac' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#f59e0b'; // Orange
    if (score >= 70) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedMatch) {
      const message = {
        id: Date.now(),
        text: newMessage.trim(),
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      };
      
      setMessages(prev => ({
        ...prev,
        [selectedMatch.id]: [...(prev[selectedMatch.id] || []), message]
      }));
      setNewMessage('');
    }
  };

  const openChat = (match) => {
    setSelectedMatch(match);
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
    setSelectedMatch(null);
  };

  const handleMatchAccept = async (notification) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notification.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Add to matches
        const newMatchData = {
          id: notification.from_user.id,
          name: notification.from_user.name,
          profile_picture: notification.from_user.profile_picture,
          location: 'New Match',
          bio: 'New match!',
          overall_score: 85,
          deepmatch_score: 90,
          zodiac_score: 75,
          breakdown: {
            mbti: 85,
            enneagram: 88,
            love_language: 90,
            psychological: 87,
            zodiac: 92
          },
          last_seen: 'Just now',
          is_online: true
        };
        
        setMatches(prev => [newMatchData, ...prev]);
        
        // Remove notification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        
        // Show custom match modal with confetti
        setNewMatch(newMatchData);
        setShowMatchModal(true);
        setShowConfetti(true);
        
        // Animate modal entrance
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
        
        // Stop confetti after 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error accepting match:', error);
      Alert.alert('Error', 'Failed to accept match. Please try again.');
    }
  };

  const handleMatchDecline = async (notification) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notification.id}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Remove notification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }
    } catch (error) {
      console.error('Error declining match:', error);
      // Still remove notification locally even if API fails
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  const closeMatchModal = () => {
    Animated.timing(modalScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowMatchModal(false);
      setNewMatch(null);
      setShowConfetti(false);
    });
  };

  const startChatting = () => {
    closeMatchModal();
    if (newMatch) {
      openChat(newMatch);
    }
  };

  const renderMatch = ({ item }) => {
    const compatibility = getBestCompatibilityScore(item);
    const scoreColor = getScoreColor(compatibility.score);
    const matchMessages = messages[item.id] || [];
    const lastMessage = matchMessages[matchMessages.length - 1];
    const unreadCount = matchMessages.filter(msg => msg.sender === 'them' && !msg.isRead).length;
    
    return (
      <TouchableOpacity 
        style={styles.matchCard} 
        activeOpacity={0.8}
        onPress={() => openChat(item)}
      >
        <View style={styles.matchImageContainer}>
          <Image 
            source={{ uri: item.profile_picture }} 
            style={styles.matchImage} 
          />
          {item.is_online && <View style={styles.onlineIndicator} />}
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.matchInfo}>
          <View style={styles.matchHeader}>
            <Text style={styles.matchName}>{item.name}, {item.age}</Text>
            <Text style={styles.lastSeen}>{item.last_seen}</Text>
          </View>
          
          {/* Compatibility Score */}
          <View style={styles.compatibilityContainer}>
            <View style={styles.compatibilityBar}>
              <View style={[styles.compatibilityFill, { width: `${compatibility.score}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={[styles.compatibilityText, { color: scoreColor }]}>
              {compatibility.score}% Compatible ({compatibility.type})
            </Text>
          </View>
          
          {/* Last Message Preview */}
          {lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage.sender === 'me' ? 'You: ' : ''}{lastMessage.text}
            </Text>
          )}
          
          <Text style={styles.matchBio} numberOfLines={1}>
            {item.bio}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.messageButton} 
          activeOpacity={0.8}
          onPress={() => openChat(item)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#10b981" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'me' ? styles.myMessage : styles.theirMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'me' ? styles.myMessageText : styles.theirMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.messageTime,
        item.sender === 'me' ? styles.myMessageTime : styles.theirMessageTime
      ]}>
        {item.timestamp}
      </Text>
    </View>
  );

  const renderNotification = ({ item }) => (
    <View style={styles.notificationCard}>
      <Image source={{ uri: item.user.profile_picture }} style={styles.notificationImage} />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          <Text style={styles.notificationName}>{item.user.name}</Text> has liked you!
        </Text>
        <Text style={styles.notificationSubtext}>
          {item.user.compatibility_score}% Compatible ({item.user.compatibility_type}) • {item.timestamp}
        </Text>
        <View style={styles.notificationActions}>
          <TouchableOpacity 
            style={styles.declineButton}
            onPress={() => handleMatchDecline(item)}
          >
            <Ionicons name="close" size={20} color="#ef4444" />
            <Text style={styles.declineButtonText}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleMatchAccept(item)}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const ChatInterface = () => {
    if (!selectedMatch) return null;
    
    const matchMessages = messages[selectedMatch.id] || [];
    
    return (
      <View style={styles.chatContainer}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={closeChat} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.chatUserInfo}>
            <Image source={{ uri: selectedMatch.profile_picture }} style={styles.chatUserImage} />
            <View>
              <Text style={styles.chatUserName}>{selectedMatch.name}</Text>
              <Text style={styles.chatUserStatus}>
                {selectedMatch.is_online ? 'Online' : `Last seen ${selectedMatch.last_seen}`}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Messages */}
        <FlatList
          data={matchMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />
        
        {/* Message Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.messageInputContainer}
        >
          <View style={styles.messageInputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#6b7280"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color={newMessage.trim() ? "#fff" : "#6b7280"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  const MatchModal = () => {
    if (!newMatch) return null;

    return (
      <Modal
        visible={showMatchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMatchModal}
      >
        <View style={styles.modalOverlay}>
          {/* Confetti Effect */}
          {showConfetti && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              fadeOut={true}
              autoStart={true}
              colors={['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']}
            />
          )}
          
          <Animated.View 
            style={[
              styles.matchModal,
              { transform: [{ scale: modalScale }] }
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.matchIconContainer}>
                <Ionicons name="heart" size={32} color="#10b981" />
              </View>
              <Text style={styles.modalTitle}>It's a Match!</Text>
              <Text style={styles.modalSubtitle}>You and {newMatch.name} have matched</Text>
            </View>

            {/* Match Profile */}
            <View style={styles.modalProfile}>
              <Image source={{ uri: newMatch.profile_picture }} style={styles.modalProfileImage} />
              <Text style={styles.modalProfileName}>{newMatch.name}, {newMatch.age}</Text>
              <Text style={styles.modalProfileBio}>{newMatch.bio}</Text>
              <View style={styles.modalCompatibility}>
                <Text style={styles.modalCompatibilityText}>
                  {newMatch.overall_score}% Compatible
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={closeMatchModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalChatButton}
                onPress={startChatting}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.modalChatButtonText}>Start Chatting</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color="#6b7280" />
      <Text style={styles.emptyTitle}>No Matches Yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete your profile and start swiping to find your perfect match!
      </Text>
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.8}
      >
        <Text style={styles.profileButtonText}>Complete Profile</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showChat) {
    return <ChatInterface />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <MatchModal />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => setShowNotifications(!showNotifications)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={24} color="#10b981" />
            {getUnreadNotificationCount() > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{getUnreadNotificationCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={loadMatches}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Section */}
      {showNotifications && (
        <View style={styles.notificationsSection}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.notificationsTitle}>People who liked you</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <Ionicons name="close" size={20} color="#a3a3a3" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyNotifications}>
                <Ionicons name="heart-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyNotificationsText}>No new likes yet</Text>
                <Text style={styles.emptyNotificationsSubtext}>Keep swiping to get more likes!</Text>
              </View>
            }
          />
        </View>
      )}
      
      {/* Matches Section */}
      {!showNotifications && (
        <>
          {matches.length > 0 ? (
            <FlatList
              data={matches}
              renderItem={renderMatch}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.matchesList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <EmptyState />
          )}
        </>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#27272a',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#27272a',
  },
  // Removed toggle styles - no longer needed
  matchesList: {
    padding: 16,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  matchImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#18181b',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  matchInfo: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  lastSeen: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  compatibilityContainer: {
    marginBottom: 8,
  },
  compatibilityBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 4,
  },
  compatibilityFill: {
    height: '100%',
    borderRadius: 3,
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 4,
  },
  matchBio: {
    fontSize: 13,
    color: '#d4d4d8',
    lineHeight: 18,
  },
  messageButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#10b981',
    marginLeft: 12,
  },
  // Chat Interface Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#27272a',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  chatUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatUserStatus: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  moreButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#a3a3a3',
  },
  messageInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#27272a',
  },
  messageInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#18181b',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#10b981',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  profileButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  profileButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Notification Styles
  notificationsSection: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  notificationName: {
    fontWeight: '600',
    color: '#10b981',
  },
  notificationSubtext: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  declineButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyNotificationsSubtext: {
    color: '#a3a3a3',
    fontSize: 16,
    textAlign: 'center',
  },
  // Match Modal Styles - Minimalist Black/Gray
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  matchModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalProfile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modalProfileBio: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  modalCompatibility: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalCompatibilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalCloseButtonText: {
    color: '#a3a3a3',
    fontSize: 16,
    fontWeight: '600',
  },
  modalChatButton: {
    flex: 2,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


