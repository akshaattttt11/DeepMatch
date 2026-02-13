import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from "../services/socket";
import { getSocket } from "../services/socket";
import * as Clipboard from 'expo-clipboard';
import { ActionSheetIOS } from 'react-native';
import Modal from 'react-native-modal';
import * as ImagePicker from 'expo-image-picker';
import { Keyboard, BackHandler } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as FileSystem from "expo-file-system";
import { NSFWScannerWebView } from "../components/NSFWScannerWebView";


// API Configuration
const API_BASE_URL = 'https://deepmatch.onrender.com';
const ADMIN_EMAIL = 'deepmatch.noreply@gmail.com';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState({});
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [newMatch, setNewMatch] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [currentUser, setCurrentUser] = useState(null);
  const textInputRef = useRef(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportTargetUser, setReportTargetUser] = useState(null);




  useEffect(() => {
    loadCurrentUser();
    // Reset modal scale on mount
    modalScale.setValue(0);
  }, []);

 useEffect(() => {
  if (!currentUser?.id) return;

  const socket = connectSocket(currentUser.id);

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected");
  });

  loadMatches();
  loadNotifications();

  return () => {
    socket.off("connect");
    socket.off("disconnect");
  };
}, [currentUser]);


useEffect(() => {
  const socket = getSocket();
  if (!socket || !currentUser?.id) return;

  const onNewMessage = (msg) => {
    setMessages(prev => {
      const matchId = msg.match_id;
      const existing = prev[matchId] || [];

      // 🔥 prevent duplicate insert
      if (existing.some(m => m.id === msg.id)) {
        return prev;
      }

      const isMe =
        msg.sender_id === currentUser.id || msg.sender === "me";

      // Parse reply_to if it's a string (JSON)
      let replyTo = msg.reply_to || null;
      if (replyTo && typeof replyTo === 'string') {
        try {
          replyTo = JSON.parse(replyTo);
        } catch (e) {
          console.error('Failed to parse reply_to:', e);
          replyTo = null;
        }
      }

      return {
        ...prev,
        [matchId]: [
          ...existing,
          {
            id: msg.id,
            text: msg.content || null,
            media_url: msg.media_url || null,
            type: msg.type || "text",
            sender: isMe ? "me" : "them",
            timestamp: msg.sent_at,
            timeLabel: formatISTTime(msg.sent_at),
            isDelivered: true,
            isRead: false,
            editedAt: msg.edited_at || null,
            isDeleted: msg.is_deleted_for_everyone || false,
            reply_to: replyTo,
            reactions: msg.reactions || null,
          },
        ],
      };
    });
  };

  socket.on("new_message", onNewMessage);

  return () => {
    socket.off("new_message", onNewMessage);
  };
}, [currentUser]);



useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const onEdited = (payload) => {
  const messageId = payload.messageId ?? payload.id;
  const matchId = payload.matchId ?? payload.match_id;
  const content = payload.content;
  const editedAt = payload.editedAt ?? payload.edited_at;

  if (!messageId || !matchId) return;

  setMessages(prev => ({
    ...prev,
    [matchId]: (prev[matchId] || []).map(m =>
      m.id === messageId ? { ...m, text: content, editedAt } : m
    ),
  }));
};

  socket.on("message_edited", onEdited);

  return () => {
    socket.off("message_edited", onEdited);
  };
}, []);


useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const onDeleted = (payload) => {
  const messageId = payload.messageId ?? payload.id;
  const matchId = payload.matchId ?? payload.match_id;

  if (!messageId || !matchId) return;

  setMessages(prev => ({
    ...prev,
    [matchId]: (prev[matchId] || []).map(m =>
      m.id === messageId
        ? { ...m, isDeleted: true, text: "" }
        : m
    ),
  }));
};

  socket.on("message_deleted", onDeleted);

  return () => {
    socket.off("message_deleted", onDeleted);
  };
}, []);


useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const onReaction = ({ messageId, matchId, reactions }) => {
    setMessages(prev => ({
      ...prev,
      [matchId]: prev[matchId]?.map(m =>
        m.id === messageId
          ? { ...m, reactions }
          : m
      ) || [],
    }));
  };

  socket.on("message_reaction", onReaction);

  return () => {
    socket.off("message_reaction", onReaction);
  };
}, []);


useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  const onDelivered = ({ messageId }) => {
    setMessages(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(matchId => {
        copy[matchId] = copy[matchId].map(m =>
          m.id === messageId
            ? { ...m, isDelivered: true }
            : m
        );
      });
      return copy;
    });
  };

  socket.on("message_delivered", onDelivered);

  return () => {
    socket.off("message_delivered", onDelivered);
  };
}, []);


useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  // Ask server who is online RIGHT NOW
  socket.emit("get_online_users");

  socket.on("online_users", (onlineUserIds) => {
  setMatches(prev =>
    prev.map(match => ({
      ...match,
      is_online: onlineUserIds.includes(match.id),
      last_seen: onlineUserIds.includes(match.id)
        ? 'Online'
        : 'Offline',   
    }))
  );

  if (selectedMatch) {
    setSelectedMatch(prev => ({
      ...prev,
      is_online: onlineUserIds.includes(prev.id),
      last_seen: onlineUserIds.includes(prev.id)
        ? 'Online'
        : 'Offline',
    }));
  }
});

  return () => socket.off("online_users");
}, [currentUser, selectedMatch]);





  useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.on("user_typing", ({ userId }) => {
    if (userId !== currentUser?.id) {
      setIsOtherTyping(true);
    }
  });

  socket.on("user_stop_typing", ({ userId }) => {
    if (userId !== currentUser?.id) {
      setIsOtherTyping(false);
    }
  });

  return () => {
    socket.off("user_typing");
    socket.off("user_stop_typing");
  };
}, [currentUser]);


  useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
    console.log("📡 user_status:", userId, isOnline);

    setMatches(prev =>
      prev.map(match =>
        match.id === userId
          ? {
              ...match,
              is_online: isOnline,
              last_seen: isOnline
                ? 'Online'
                : formatLastSeen(lastSeen),
            }
          : match
      )
    );

    if (selectedMatch?.id === userId) {
      setSelectedMatch(prev => ({
        ...prev,
        is_online: isOnline,
        last_seen: isOnline
          ? 'Online'
          : formatLastSeen(lastSeen),
      }));
    }
  });

  return () => socket.off("user_status");
}, [selectedMatch]);



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

  const loadMatches = async () => {
  // 🛑 HARD GUARD — prevents 90% of bugs
  if (!currentUser?.id) {
  console.log("⏳ loadMatches skipped — currentUser not ready");
  setLoading(false); // 🔥 IMPORTANT
  return;
}

  try {
    const token = await AsyncStorage.getItem('auth_token');

    if (!token) {
      console.log("⏳ loadMatches skipped — token missing");
      return;
    }

    if (!loading) setLoading(true);

    const response = await fetch(`${API_BASE_URL}/api/matches`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ Failed to load matches:', response.status);
      return; // ⛔ DO NOT overwrite matches
    }

    const data = await response.json();

    const transformedMatches = (data.matches || []).map(match => ({
  id: match.user?.id,
  matchId: match.match_id,
  name: match.user?.first_name || 'Unknown',
  profile_picture:
    match.user?.profile_picture ||
    'https://ui-avatars.com/api/?name=User&background=10b981&color=fff',
  bio: match.user?.bio || 'New match!',
  overall_score: match.compatibility?.score || 85,

  is_online: false,
  last_seen: 'Offline',
}));

    setMatches(transformedMatches);

  } catch (error) {
    console.error('❌ loadMatches crash:', error);
  } finally {
    setLoading(false);
  }
};

  const loadNotifications = async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();

      // ✅ Filter only valid notifications
      const validNotifications = (data.notifications || []).filter(
        notif =>
          notif &&
          notif.id &&
          notif.from_user &&
          notif.from_user.id &&
          notif.from_user.name &&
          notif.from_user.name.trim() !== ''
      );

      // ✅ Map backend → frontend format
      const formattedNotifications = validNotifications.map(notif => ({
        id: notif.id,
        type: notif.type, // 'like' | 'rose'
        message: notif.message,
        user: {
          id: notif.from_user.id,
          name: notif.from_user.name || 'Unknown',
          age: notif.from_user.age || 0,
          profile_picture:
            notif.from_user.profile_picture ||
            'https://ui-avatars.com/api/?name=User&background=10b981&color=fff&size=256',
          bio: notif.from_user.bio || '',
          location: notif.from_user.location || '',
          compatibility_score: notif.compatibility?.score ?? 0,
          compatibility_type: notif.compatibility?.type || 'Overall',
        },
        timestamp: formatTimestamp(notif.created_at), 
        isRead: false,
      }));

      // ✅ FIX 2 — ENFORCE PRIORITY ON FRONTEND
      formattedNotifications.sort((a, b) => {
        // 🌹 Rose ALWAYS first
        if (a.type === 'rose' && b.type !== 'rose') return -1;
        if (a.type !== 'rose' && b.type === 'rose') return 1;

        // ⏱️ Newer first within same type
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      setNotifications(formattedNotifications);
      return;
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }

  // Fallback
  setNotifications([]);
};


  const formatTimestamp = (isoString) => {
  if (!isoString) return 'Just now';

  try {
    const now = new Date();

    const timestamp = new Date(isoString + 'Z');

    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Just now';
  }
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

  const handleSendMessage = useCallback(
  async (mediaPayload = null, replyTo = null) => {
  if (!selectedMatch) return;

  const isMedia = !!mediaPayload;
  if (!isMedia && !newMessage.trim()) return;

  const messageText = newMessage.trim();
  setNewMessage('');

  try {
    const token = await AsyncStorage.getItem('auth_token');
    const matchId = selectedMatch.matchId || selectedMatch.id;

    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
  mediaPayload
    ? {
        receiver_id: selectedMatch.id,
        media_url: mediaPayload.media_url,
        type: mediaPayload.type,
        reply_to: replyTo || null,
      }
    : {
        receiver_id: selectedMatch.id,
        content: messageText,
        type: 'text',
        reply_to: replyTo, 
      }
),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    const data = await response.json();

    const newMsg = {
  id: data.message_id,
  text: mediaPayload ? null : messageText,
  media_url: mediaPayload?.media_url || null,
  type: mediaPayload?.type || 'text',
  sender: 'me',
  timestamp: data.sent_at,
  timeLabel: formatISTTime(data.sent_at),
  isDelivered: false,
  isRead: false,
  reply_to: replyTo || null,
};


    textInputRef.current?.focus();

  } catch (error) {
    console.error("Send message error:", error);
    Alert.alert("Error", "Message not sent");
    setNewMessage(messageText);
  }
}, [newMessage, selectedMatch, currentUser]);


  const openChat = async (match) => {
    try {
      // Basic sanity check
      if (!match) {
        Alert.alert("Error", "Match data is missing.");
        return;
      }

      const matchIdToUse = match.matchId || match.match_id || match.id;
      if (!matchIdToUse) {
        console.error("openChat: missing matchId for match", match);
        Alert.alert("Error", "Chat cannot be opened for this match.");
        return;
      }

      setSelectedMatch(match);
      setShowChat(true);

      // Load messages for this match
      await loadMessages(matchIdToUse);

      // Mark messages as read
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/messages/${matchIdToUse}/mark-read`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (markErr) {
          console.error("mark-read error (non-fatal):", markErr);
        }
      }

      // Notify via socket if available
      const socket = getSocket();
      if (socket && socket.emit) {
        const room = `match_${matchIdToUse}`;
        socket.emit("seen_message", { room });
      } else {
        console.log("openChat: socket not ready, skipping seen_message emit");
      }
    } catch (error) {
      console.error("Error opening chat:", error);
      Alert.alert("Error", "Failed to open chat. Please try again.");
    }
  };

  const loadMessages = async (matchId) => {
  try {
    console.log('=== LOADING MESSAGES ===');
    console.log('Match ID:', matchId);
    console.log('Current user ID:', currentUser?.id);

    if (!currentUser || !currentUser.id) {
      console.error('Current user not available for loading messages');
      setMessages(prev => ({
        ...prev,
        [matchId]: [],
      }));
      return;
    }

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token available');
      setMessages(prev => ({
        ...prev,
        [matchId]: [],
      }));
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/messages/${matchId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load messages:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('API Response data:', JSON.stringify(data, null, 2));

    if (!Array.isArray(data.messages)) {
      console.error('Invalid messages data format:', data);
      setMessages(prev => ({
        ...prev,
        [matchId]: [],
      }));
      return;
    }

    const formattedMessages = data.messages.map(msg => {
      const isMe =
        msg.sender_id === currentUser.id || msg.sender === 'me';

      return {
        id: msg.id,
        text: msg.content,
        sender: isMe ? 'me' : 'them',
        timestamp: msg.sent_at,
        timeLabel: formatISTTime(msg.sent_at),
        isDeleted: false,
        is_deleted_for_everyone: msg.is_deleted_for_everyone || false,
        isDelivered: msg.is_delivered || false,
        isRead: msg.is_read || false,
        editedAt: msg.edited_at || null,
        reactions: msg.reactions ? JSON.parse(msg.reactions) : null,
        type: msg.type || 'text',
        media_url: msg.media_url || null,
        reply_to: (() => {
          if (!msg.reply_to) return null;
          if (typeof msg.reply_to === 'string') {
            try {
              return JSON.parse(msg.reply_to);
            } catch (e) {
              console.error('Failed to parse reply_to:', e);
              return null;
            }
          }
          return msg.reply_to;
        })(),
      };
    });

    console.log(
      'Formatted messages:',
      JSON.stringify(formattedMessages, null, 2)
    );

    setMessages(prev => ({
      ...prev,
      [matchId]: formattedMessages,
    }));

    console.log('Messages set in state successfully');
  } catch (error) {
    console.error('Error loading messages:', error);
    setMessages(prev => ({
      ...prev,
      [matchId]: prev[matchId] || [],
    }));
  }
};


  const closeChat = () => {
  const socket = getSocket();
  if (socket && selectedMatch && currentUser) {
    const room = `match_${selectedMatch.matchId || selectedMatch.id}`;
    socket.emit("stop_typing", {
      room,
      userId: currentUser.id,
    });
  }

  setShowChat(false);
  setSelectedMatch(null);
  setShowReactionBar(false);
  setReactionTarget(null);
};


  const handleMatchAccept = async (notification) => {
    try {
      if (!notification || !notification.id) {
        console.error('Invalid notification object:', notification);
        Alert.alert('Error', 'Invalid notification data');
        return;
      }

      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notification.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Match accept response:', responseData);
        
        // Check if already matched
        if (responseData.message === 'Already matched') {
          // Just remove the notification, don't show match modal
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          
          // Reload matches to get the correct match data with matchId
          await loadMatches();
          return;
        }
        
        // Add to matches with proper match ID
        const newMatchData = {
          id: notification.user?.id || Date.now(),
          matchId: responseData.match_id || Date.now(), // Use the match ID from backend
          name: notification.user?.name || 'Unknown',
          profile_picture: notification.user?.profile_picture || 'https://ui-avatars.com/api/?name=User&background=10b981&color=fff&size=256',
          location: notification.user?.location || 'New Match',
          bio: notification.user?.bio || 'New match!',
          overall_score: notification.user?.compatibility_score || 85,
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
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        Alert.alert('Error', errorData.error || 'Failed to accept match. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting match:', error);
      Alert.alert('Error', 'Failed to accept match. Please try again.');
    }
  };

  const handleMatchDecline = async (notification) => {
    try {
      if (!notification || !notification.id) {
        console.error('Invalid notification object:', notification);
        return;
      }

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
      } else {
        console.error('Failed to decline notification');
        // Still remove notification locally even if API fails
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

  // =============================
// 🚩 REPORT USER
// =============================
const handleReportUser = async (user) => {
  Alert.alert(
    "Report User",
    "Do you want to report this user?",
    [
      { text: "Cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            const token =
              await AsyncStorage.getItem("auth_token");

            await fetch(
              `${API_BASE_URL}/api/report-user`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  reported_user_id: user.id,
                  reason: "Reported via app",
                }),
              }
            );

            Alert.alert(
              "Reported",
              "Admin will review this user."
            );

          } catch {
            Alert.alert(
              "Error",
              "Failed to report user."
            );
          }
        },
      },
    ]
  );
};


const submitReport = async () => {

  // 🛡️ SAFETY GUARD — ADD THIS BLOCK
  if (!reportTargetUser) {
    Alert.alert("No user selected");
    return;
  }
  
  if (!reportReason.trim()) {
    Alert.alert("Reason required");
    return;
  }

  try {
    const token = await AsyncStorage.getItem("auth_token");

    const res = await fetch(
      `${API_BASE_URL}/api/report-user`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reported_user_id: reportTargetUser.id,
          reason: reportReason,
        }),
      }
    );

    if (!res.ok) throw new Error();

    Alert.alert(
      "Report Submitted",
      "Admin will review this report."
    );

    setReportModalVisible(false);
    setReportReason("");
    setReportTargetUser(null);

  } catch {
    Alert.alert("Failed to submit report");
  }
};



// =============================
// 🚫 BLOCK USER
// =============================
const handleBlockUser = async (user) => {
  Alert.alert(
    "Block User",
    `Are you sure you want to block ${user.name}?`,
    [
      { text: "Cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            const token =
              await AsyncStorage.getItem("auth_token");

            const res = await fetch(
              `${API_BASE_URL}/api/block-user`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  blocked_user_id: user.id,
                }),
              }
            );

            if (!res.ok) throw new Error();

            Alert.alert(
              "Blocked",
              "User has been blocked."
            );

            // Remove instantly from UI
            setMatches(prev =>
              prev.filter(m => m.id !== user.id)
            );

          } catch (e) {
            Alert.alert(
              "Error",
              "Failed to block user."
            );
          }
        },
      },
    ]
  );
};

  const renderMatch = ({ item }) => {
    const compatibility = getBestCompatibilityScore(item);
    const scoreColor = getScoreColor(compatibility.score);
    const matchMessages = messages[item.matchId || item.id] || [];
    const lastMessage = matchMessages[matchMessages.length - 1];
    const lastGone = lastMessage?.isDeleted || lastMessage?.is_deleted_for_everyone;
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
    {lastMessage.sender === 'me' ? 'You: ' : ''}
    {lastGone
  ? 'This message was deleted'
  : lastMessage.type === 'image'
  ? '📷 Photo'
  : lastMessage.text}
  </Text>
)}

          <Text style={styles.matchBio} numberOfLines={1}>
            {item.bio}
          </Text>
        </View>
        
        <View style={{ alignItems: "center" }}>

  {/* 3 DOT ACTION SHEET (no Menu, no crashes) */}
  <TouchableOpacity
    style={{ padding: 6 }}
    onPress={() => {
      Alert.alert(
        "Options",
        `Actions for ${item.name}`,
        [
          {
            text: "Report User",
            onPress: () => {
              setReportTargetUser(item);
              setReportModalVisible(true);
            },
          },
          {
            text: "Block User",
            style: "destructive",
            onPress: () => handleBlockUser(item),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }}
  >
    <Ionicons
      name="ellipsis-vertical"
      size={18}
      color="#a3a3a3"
    />
  </TouchableOpacity>

  {/* ONLINE INDICATOR */}
  {item.is_online && (
    <View style={styles.onlineIndicator} />
  )}

</View>
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
      <Image 
        source={{ uri: item.user?.profile_picture || 'https://ui-avatars.com/api/?name=User&background=10b981&color=fff&size=256' }} 
        style={styles.notificationImage} 
      />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          <Text style={styles.notificationName}>{item.user?.name || 'Someone'}</Text> 
          {item.type === 'rose' ? ' sent you a rose! 🌹' : ' has liked you!'}
        </Text>
        <Text style={styles.notificationSubtext}>
          {item.user?.compatibility_score || 0}% Compatible ({item.user?.compatibility_type || 'Overall'}) • {item.timestamp || 'Just now'}
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
            {item.type === 'rose' ? (
              <MaterialCommunityIcons name="flower-tulip" size={20} color="#fff" />
            ) : (
              <Ionicons name="heart" size={20} color="#fff" />
            )}
            <Text style={styles.acceptButtonText}>Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ChatInterface
       selectedMatch={selectedMatch}
       messages={messages}
       setMessages={setMessages}
       newMessage={newMessage}
       setNewMessage={setNewMessage}
       handleSendMessage={handleSendMessage}
       closeChat={closeChat}
       loadMessages={loadMessages}
       isOtherTyping={isOtherTyping}
       currentUser={currentUser}
       navigation={navigation}
       menuVisible={menuVisible}
       setMenuVisible={setMenuVisible}
       setReportTargetUser={setReportTargetUser}
       setReportModalVisible={setReportModalVisible}
       handleBlockUser={handleBlockUser}
     />
    </SafeAreaView>
  );
}

  return (
    <SafeAreaView style={styles.container}>
      <MatchModal />

      {/* 🚩 REPORT USER MODAL — ADD HERE */}
    <Modal
      isVisible={reportModalVisible}
      onBackdropPress={() => setReportModalVisible(false)}
    >
      <View
        style={{
          backgroundColor: "#1f1f1f",
          padding: 18,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          Report User
        </Text>

        <TextInput
          placeholder="Why are you reporting this user?"
          placeholderTextColor="#9ca3af"
          value={reportReason}
          onChangeText={setReportReason}
          multiline
          style={{
            backgroundColor: "#27272a",
            color: "#fff",
            padding: 12,
            borderRadius: 8,
            minHeight: 80,
            marginBottom: 14,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            onPress={() => setReportModalVisible(false)}
          >
            <Text
              style={{
                color: "#9ca3af",
                marginRight: 18,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={submitReport}>
            <Text
              style={{
                color: "#ef4444",
                fontWeight: "600",
              }}
            >
              Submit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

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
          {currentUser && (currentUser.email === ADMIN_EMAIL || currentUser.is_admin) && (
            <TouchableOpacity
              style={[styles.refreshButton, { marginLeft: 8 }]}
              onPress={() => navigation.navigate('AdminReports')}
            >
              <Ionicons name="shield-checkmark" size={22} color="#10b981" />
            </TouchableOpacity>
          )}
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
              keyExtractor={(item) => (item.matchId || item.id).toString()}
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

const formatISTTime = (isoString) => {
  if (!isoString) return '';

  const date = new Date(isoString);

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatLastSeen = (iso) => {
  if (!iso) return 'Offline';

  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;

  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};


const parseMessageDate = (isoString) => {
  if (!isoString) return new Date();

  const parsed = new Date(isoString);
  if (!isNaN(parsed)) return parsed;

  return new Date();
};


const getDateLabel = (isoString) => {
  const messageDate = new Date(isoString);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  messageDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today - messageDate) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return messageDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};


const ChatInterface = ({
  selectedMatch,
  messages,
  setMessages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  closeChat,
  loadMessages,
  isOtherTyping,
  currentUser,
  navigation,
  menuVisible,
  setMenuVisible,
  setReportTargetUser,
  setReportModalVisible,
  handleBlockUser
}) => {
  const typingTimeoutRef = useRef(null);
  const textInputRef = useRef(null);
  const nsfwScannerRef = useRef(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [scanningImage, setScanningImage] = useState(false);
  const [nsfwScannerReady, setNsfwScannerReady] = useState(false);
  const [nsfwModalVisible, setNsfwModalVisible] = useState(false);
  const [nsfwModalMessage, setNsfwModalMessage] = useState('');
  const [nsfwModalConfidence, setNsfwModalConfidence] = useState(null);

useEffect(() => {
  const backHandler = () => {
    if (showReactionBar) {
      setShowReactionBar(false);
      setReactionTarget(null);
      return true;
    }
    return false;
  };

  const sub = BackHandler.addEventListener(
    "hardwareBackPress",
    backHandler
  );

  return () => sub.remove();
}, [showReactionBar]);


useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, []);


  if (!selectedMatch) return null;

  const matchIdToUse = selectedMatch.matchId || selectedMatch.id;
  const matchMessages = messages[matchIdToUse] || [];
  const flatListRef = useRef(null);
  const swipeableRefs = useRef({});
  
  const showMessageActions = (message) => {
  setActionMessage(message);
  setShowActionSheet(true);
};

const handleSwipeReply = (message) => {
  setReplyingTo({
    id: message.id,
    text: message.type === 'image' ? '📷 Photo' : message.text,
    sender: message.sender,
    type: message.type,
  });
  
  // Close any open swipeables
  Object.values(swipeableRefs.current).forEach(ref => {
    if (ref) ref.close();
  });
  
  // Focus input field
  setTimeout(() => {
    textInputRef.current?.focus();
  }, 100);
};

const handleMessageLongPress = (message) => {
  Keyboard.dismiss();

  setReactionTarget(message);
  setShowReactionBar(true);

  setTimeout(() => {
    showMessageActions(message);
  }, 0);
};



const deleteMessage = async (messageId, deleteForEveryone) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(
      `${API_BASE_URL}/api/messages/${messageId}/delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delete_for_everyone: deleteForEveryone,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    if (!deleteForEveryone) {
      const matchId = selectedMatch.matchId || selectedMatch.id;
      setMessages(prev => ({
        ...prev,
        [matchId]: (prev[matchId] || []).filter(m => m.id !== messageId)
      }));
    }

  } catch (e) {
    Alert.alert('Error', 'Failed to delete message');
  }
};

const handleCopy = () => {
  Clipboard.setStringAsync(actionMessage.text);
   // 🔹 HIDE reaction bar
  setShowReactionBar(false);
  setReactionTarget(null);
  closeActionSheet();
};

const handleDeleteForMe = () => {
  deleteMessage(actionMessage.id, false);
   // 🔹 HIDE reaction bar
  setShowReactionBar(false);
  setReactionTarget(null);
  closeActionSheet();
};

const handleDeleteForEveryone = () => {
  deleteMessage(actionMessage.id, true);
   // 🔹 HIDE reaction bar
  setShowReactionBar(false);
  setReactionTarget(null);
  closeActionSheet();
};

const handleEdit = () => {
  startEditingMessage(actionMessage);
  // 🔹 HIDE reaction bar
  setShowReactionBar(false);
  setReactionTarget(null);
  closeActionSheet();
};

const handleReply = () => {
  if (!actionMessage) return;
  
  setReplyingTo({
    id: actionMessage.id,
    text: actionMessage.type === 'image' ? '📷 Photo' : actionMessage.text,
    sender: actionMessage.sender,
    type: actionMessage.type,
  });
  
  // 🔹 HIDE reaction bar
  setShowReactionBar(false);
  setReactionTarget(null);
  closeActionSheet();
  
  // Focus input field
  textInputRef.current?.focus();
};

const closeActionSheet = () => {
  setShowActionSheet(false);
  setActionMessage(null);
};


const startEditingMessage = (message) => {
  setNewMessage(message.text);
  setEditingMessage(message);
};


const editMessage = async (message) => {
  try {
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(
      `${API_BASE_URL}/api/messages/${message.id}/edit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.text,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Edit failed');
    }

  } catch (e) {
    console.error(e);
    Alert.alert('Error', 'Failed to edit message');
  }
};


const reactToMessage = async (messageId, emoji) => {

if (!messageId || !emoji) return;

  try {
    const token = await AsyncStorage.getItem("auth_token");
    await fetch(`${API_BASE_URL}/api/messages/${messageId}/react`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emoji }),
    });
    // ❗ UI updates ONLY via socket "message_reaction"
  } catch (e) {
    console.error("Reaction failed", e);
  }
};



const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (!result.canceled) {
    uploadMedia(result.assets[0].uri, "image", result.assets[0].base64 || null);
  }
};

const uploadMedia = async (uri, type, base64Override = null) => {
  try {
    // Show scanning indicator
    setScanningImage(true);

    // 1) Frontend NSFW scan (WebView + NSFWJS) BEFORE uploading
    // Use 0.8 threshold (very conservative - only detect obvious nudity, not objects/backpacks)
    const threshold = 0.8;
    let base64 = base64Override;
    if (!base64) {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    let scanResult = null;
    if (nsfwScannerRef.current) {
      try {
        // If scanner isn't ready yet, we still try; it will load model on demand.
        scanResult = await nsfwScannerRef.current.scanBase64(base64, {
          threshold,
          timeoutMs: 20000,
        });
        if (scanResult) {
          console.log(
            "[NSFW] predictions:",
            JSON.stringify(scanResult.predictions || [], null, 2)
          );
          console.log(
            "[NSFW] nsfwScore:",
            scanResult.nsfwScore,
            "threshold:",
            scanResult.threshold
          );
        }
      } catch (scanError) {
        // If CDN/model fails to load, fall back to backend-only scanning.
        // Log only in development so production stays clean.
        if (__DEV__) {
          console.log(
            "NSFW scan unavailable, falling back to backend only:",
            scanError?.message || scanError
          );
        }
      }
    }

    if (scanResult?.isNSFW) {
      // Show in-app styled modal instead of system alert
      setNsfwModalMessage(
        `This image appears inappropriate (confidence: ${(scanResult.nsfwScore * 100).toFixed(
          1
        )}%). This image cannot be uploaded.`
      );
      setNsfwModalConfidence((scanResult.nsfwScore * 100).toFixed(1));
      setNsfwModalVisible(true);
      return; // Block locally
    }

    // 2) Upload image (backend can still keep a second layer of protection)
    const token = await AsyncStorage.getItem("auth_token");
    const form = new FormData();

    form.append("file", {
      uri,
      name: "image.jpg",
      type: "image/jpeg",
    });

    form.append("type", type);

    const res = await fetch(`${API_BASE_URL}/api/messages/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data = await res.json();

    // Check if backend detected NSFW content
    if (!res.ok && data.error === 'NSFW_CONTENT_DETECTED') {
      setScanningImage(false);
      // Show same dark in-app modal used for frontend scan results
      setNsfwModalMessage(
        data.message ||
          `Inappropriate content detected (confidence: ${(
            (data.confidence || 0) * 100
          ).toFixed(1)}%). This image cannot be uploaded.`
      );
      setNsfwModalConfidence(((data.confidence || 0) * 100).toFixed(1));
      setNsfwModalVisible(true);
      return; // Block upload
    }

    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    // Image is safe, send as normal message
    handleSendMessage(
      {
        media_url: data.url,
        type: data.type,
      },
      replyingTo
    );
    setReplyingTo(null);
  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert(
      'Error',
      error.message || 'Failed to upload image. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setScanningImage(false);
  }
};



const isSender = actionMessage?.sender === 'me';
const sentMs = actionMessage
  ? new Date(actionMessage.timestamp).getTime()
  : 0;

const canEdit =
  isSender &&
  !actionMessage?.isDeleted &&
  Date.now() - sentMs <= 15 * 60 * 1000;


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <NSFWScannerWebView
        ref={nsfwScannerRef}
        onReady={() => setNsfwScannerReady(true)}
      />
      <View style={styles.chatContainer}>
        {/* Header */}
          <View style={styles.chatHeader}>
  {/* BACK BUTTON */}
  <TouchableOpacity onPress={closeChat} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  {/* USER INFO */}
  <TouchableOpacity
    style={styles.chatUserInfo}
    activeOpacity={0.7}
    onPress={() =>
      navigation.navigate("ProfileDetail", {
        userId:
          selectedMatch.id ||
          selectedMatch.userId ||
          selectedMatch.user_id,
      })
    }
  >
    <Image
      source={{ uri: selectedMatch.profile_picture }}
      style={styles.chatUserImage}
    />

    <View>
      <Text style={styles.chatUserName}>
        {selectedMatch.name}
      </Text>

      <Text style={styles.chatUserStatus}>
        {selectedMatch.is_online
          ? "Online"
          : `Last seen ${selectedMatch.last_seen}`}
      </Text>
    </View>
  </TouchableOpacity>

  {/* REFRESH + 3 DOT MENU */}
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    {/* Refresh chat messages */}
    <TouchableOpacity
      style={{ padding: 6, marginRight: 2 }}
      onPress={() => {
        if (!selectedMatch?.matchId && !selectedMatch?.match_id) return;
        const matchIdToUse = selectedMatch.matchId || selectedMatch.match_id;
        loadMessages(matchIdToUse);
      }}
    >
      <Ionicons name="refresh" size={20} color="#10b981" />
    </TouchableOpacity>

    {/* 3 DOT ACTION SHEET (no Menu, no crashes) */}
    <TouchableOpacity
      style={{ padding: 6 }}
      onPress={() => {
        Alert.alert(
          "Options",
          `Actions for ${selectedMatch.name}`,
          [
            {
              text: "Report User",
              onPress: () => {
                setReportTargetUser(selectedMatch);
                setReportModalVisible(true);
              },
            },
            {
              text: "Block User",
              style: "destructive",
              onPress: () => handleBlockUser(selectedMatch),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }}
    >
      <Ionicons
        name="ellipsis-vertical"
        size={20}
        color="#fff"
      />
    </TouchableOpacity>
  </View>
</View>


        {/* Messages */}
<FlatList
  ref={flatListRef}
  data={matchMessages}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item, index }) => {
    const isGone = item.isDeleted || item.is_deleted_for_everyone;
    const previousMessage = matchMessages[index - 1];

    const showDateSeparator =
      !previousMessage ||
      new Date(previousMessage.timestamp).toDateString() !==
        new Date(item.timestamp).toDateString();

    return (
  <View key={item.id}>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {getDateLabel(item.timestamp)}
            </Text>
          </View>
        )}

        {/* 🔹 SWIPEABLE MESSAGE WITH REPLY GESTURE (Works for both own and other's messages) */}
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current[item.id] = ref;
          }}
          renderLeftActions={() => {
            // Show swipe-to-reply for ALL messages (like WhatsApp) - swipe RIGHT to reveal
            return (
              <View style={styles.swipeReplyContainerLeft}>
                <View style={styles.swipeReplyButton}>
                  <Ionicons name="arrow-undo" size={24} color="#fff" />
                  <Text style={styles.swipeReplyText}>Reply</Text>
                </View>
              </View>
            );
          }}
          onSwipeableLeftOpen={() => handleSwipeReply(item)}
          leftThreshold={40}
          overshootLeft={false}
          friction={2}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={() => handleMessageLongPress(item)}
          >
          
          {/* 🔥 WHATSAPP-STYLE REACTION BAR */}
    {showReactionBar && reactionTarget?.id === item.id && (
      <View style={styles.reactionBar}>
        {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
          <TouchableOpacity
            key={emoji}
            onPress={() => {
              reactToMessage(item.id, emoji);
              setShowReactionBar(false);
              setReactionTarget(null);
            }}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
            <View
    style={[
      styles.messageBubble,
      item.sender === 'me'
        ? styles.myMessage
        : styles.theirMessage,
      isGone && {
    backgroundColor: '#2a2a2a',
  },
    ]}
  >

  {/* 🔁 REPLIED MESSAGE PREVIEW */}
  {item.reply_to && (
  <View
    style={[
      styles.quotedReply,
      item.sender === 'me'
        ? { backgroundColor: 'rgba(255,255,255,0.15)' }
        : { backgroundColor: '#1f2933' },
    ]}
  >
      <Text style={styles.quotedSender}>
        {item.reply_to.sender === 'me' ? 'You' : selectedMatch.name}
      </Text>
      <Text numberOfLines={1} style={styles.quotedText}>
        {item.reply_to.text}
      </Text>
    </View>
  )}

           <Text
  style={[
    styles.messageText,
    isGone && {
      fontStyle: 'italic',
      opacity: 0.7,
    },
  ]}
>
  {item.type === 'image' && item.media_url && !isGone ? (
    <Image
      source={{ uri: item.media_url }}
      style={{ width: 220, height: 220, borderRadius: 12 }}
    />
  ) : isGone ? (
    'This message was deleted'
  ) : (
    item.text
  )}
</Text>


           {/* ✅ MESSAGE REACTIONS */}
{item.reactions && Object.keys(item.reactions).length > 0 && (
  <View style={{ flexDirection: 'row', marginTop: 4 }}>
    {Object.entries(item.reactions).map(([emoji, users]) => (
      <Text
        key={emoji}
        style={{ marginRight: 6, color: '#fff', fontSize: 13 }}
      >
        {emoji} {Array.isArray(users) ? users.length : 0}
      </Text>
    ))}
  </View>
)}


            {item.editedAt && !isGone && (
            <Text style={styles.editedLabel}>Edited</Text>
            )}


            <View style={styles.messageMeta}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={styles.messageTime}>{item.timeLabel}</Text>

                {item.sender === 'me' && !item.isDeleted && (
                  <Ionicons
                    name={
                      item.isRead
                        ? 'checkmark-done'
                        : item.isDelivered
                        ? 'checkmark-done'
                        : 'checkmark'
                    }
                    size={16}
                    color={
                      item.isRead
                        ? '#3b82f6'
                        : item.isDelivered
                        ? '#9ca3af'
                        : '#9ca3af'
                    }
                  />
                )}
              </View>
            </View>
          </View>
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  }}
  contentContainerStyle={{ padding: 16 }}
  keyboardShouldPersistTaps="handled"
  onContentSizeChange={() =>
    flatListRef.current?.scrollToEnd({ animated: true })
  }
/>


{isOtherTyping && (
  <View style={styles.typingWrapper}>
    <View style={styles.typingBubble}>
      <Text style={styles.typingBubbleText}>Typing…</Text>
    </View>
  </View>
)}

{replyingTo && (
  <View style={styles.replyPreview}>
    <View style={styles.replyLine} />
    <View style={{ flex: 1 }}>
      <Text style={styles.replySender}>
        {replyingTo.sender === 'me' ? 'You' : selectedMatch.name}
      </Text>
      <Text numberOfLines={1} style={styles.replyText}>
        {replyingTo.text}
      </Text>
    </View>
    <TouchableOpacity onPress={() => setReplyingTo(null)}>
      <Ionicons name="close" size={18} color="#9ca3af" />
    </TouchableOpacity>
  </View>
)}


        {/* Scanning Indicator */}
        {scanningImage && (
          <View style={styles.scanningOverlay}>
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.scanningText}>Scanning image for inappropriate content...</Text>
            </View>
          </View>
        )}

        {/* ✅ INPUT BAR (THIS WAS BROKEN BEFORE) */}
        <View style={styles.messageInputContainer}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={{ marginRight: 6 }}
            disabled={scanningImage}
          >
          <Ionicons 
            name="image-outline" 
            size={22} 
            color={scanningImage ? "#666" : "#10b981"} 
          />
          </TouchableOpacity>

          <TextInput
            ref={textInputRef}
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={(text) => {
  setNewMessage(text);

  const socket = getSocket();
  if (!socket || !selectedMatch || !currentUser) return;

  const room = `match_${selectedMatch.matchId || selectedMatch.id}`;

  // ⛔ Empty text → STOP typing immediately
  if (!text.trim()) {
    socket.emit("stop_typing", { room, userId: currentUser.id });
    return;
  }

  socket.emit("typing", { room, userId: currentUser.id });

  if (typingTimeoutRef.current) {
    clearTimeout(typingTimeoutRef.current);
  }

  typingTimeoutRef.current = setTimeout(() => {
    socket.emit("stop_typing", { room, userId: currentUser.id });
  }, 1000); // shorter + reliable
}}

            color="#ffffff"
            selectionColor="#10b981"
            multiline={false}
          />

          <TouchableOpacity
 onPress={() => {
  if (!newMessage.trim()) return;

  const socket = getSocket();
  const room = `match_${selectedMatch.matchId || selectedMatch.id}`;

  // 🔥 FORCE STOP TYPING
  socket?.emit("stop_typing", {
    room,
    userId: currentUser.id,
  });

  if (editingMessage) {
    editMessage({
      ...editingMessage,
      text: newMessage.trim(),
    });
    setEditingMessage(null);
    setNewMessage('');
  } else {
    handleSendMessage(null, replyingTo);
    setReplyingTo(null);
  }
}}

  disabled={!newMessage.trim()}
  style={[
    styles.sendButton,
    !newMessage.trim() && styles.sendButtonDisabled,
  ]}
>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* NSFW Warning Modal (dark themed) */}
      <Modal
        isVisible={nsfwModalVisible}
        onBackdropPress={() => setNsfwModalVisible(false)}
        onBackButtonPress={() => setNsfwModalVisible(false)}
        style={{ justifyContent: 'center', alignItems: 'center', margin: 0 }}
      >
        <View style={{ width: '90%', backgroundColor: '#04070a', borderRadius: 12, padding: 18 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            ⚠️ Inappropriate Content Detected
          </Text>
          <Text style={{ color: '#e5e7eb', fontSize: 14, marginBottom: 18 }}>
            {nsfwModalMessage || `Inappropriate content detected (confidence: ${nsfwModalConfidence || 'N/A'}%). This image cannot be uploaded.`}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => setNsfwModalVisible(false)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 15 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
  isVisible={showActionSheet}
  onBackdropPress={closeActionSheet}
  onBackButtonPress={closeActionSheet}
  style={{ justifyContent: 'flex-end', margin: 0 }}
>
  <View style={styles.actionSheet}>
    <TouchableOpacity style={styles.sheetItem} onPress={handleCopy}>
      <Text style={styles.sheetText}>Copy</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.sheetItem} onPress={handleReply}>
      <Text style={styles.sheetText}>Reply</Text>
    </TouchableOpacity>

    {canEdit && (
      <TouchableOpacity style={styles.sheetItem} onPress={handleEdit}>
        <Text style={styles.sheetText}>Edit</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[styles.sheetItem, styles.destructive]}
      onPress={handleDeleteForMe}
    >
      <Text style={styles.destructiveText}>Delete for me</Text>
    </TouchableOpacity>

    {isSender && (
      <TouchableOpacity
        style={[styles.sheetItem, styles.destructive]}
        onPress={handleDeleteForEveryone}
      >
        <Text style={styles.destructiveText}>Delete for everyone</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity style={styles.sheetCancel} onPress={closeActionSheet}>
      <Text style={styles.cancelText}>Cancel</Text>
    </TouchableOpacity>
  </View>
</Modal>
    </KeyboardAvoidingView>
  );
};

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
  paddingBottom: 12,
  paddingTop: Platform.OS === 'android' ? 18 : 12, 
  borderBottomWidth: 1,
  borderBottomColor: '#27272a',
  backgroundColor: '#27272a',
},

  dateSeparator: {
  alignSelf: 'center',
  backgroundColor: '#2a2a2a',
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 14,
  marginVertical: 12,
},

  dateSeparatorText: {
  color: '#a3a3a3',
  fontSize: 12,
  fontWeight: '500',
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
  refreshButton: {
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
  lineHeight: 22,
  color: '#ffffff', 
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
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1f1f1f',
  marginHorizontal: 12,
  marginBottom: 10,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 28,
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
  color: '#ffffff',
  paddingVertical: 10,
  paddingHorizontal: 8,
  },

  editedLabel: {
  fontSize: 11,
  color: '#9ca3af',
  marginTop: 2,
  fontStyle: 'italic',
},

  messageMeta: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: 4,
  },

  typingText: {
  color: '#9ca3af',
  fontSize: 12,
  paddingHorizontal: 16,
  marginBottom: 6,
  },

  typingWrapper: {
  paddingHorizontal: 16,
  marginBottom: 6,
},

typingBubble: {
  alignSelf: 'flex-start',
  backgroundColor: '#2a2a2a',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  maxWidth: '60%',
},

typingBubbleText: {
  color: '#9ca3af',
  fontSize: 13,
  fontStyle: 'italic',
},

actionSheet: {
  backgroundColor: '#1f1f1f',
  paddingBottom: 20,
  paddingTop: 12,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
},

sheetItem: {
  paddingVertical: 14,
  paddingHorizontal: 24,
},

sheetText: {
  fontSize: 16,
  color: '#ffffff',
},

destructive: {
  borderTopWidth: 1,
  borderTopColor: '#2a2a2a',
},

destructiveText: {
  fontSize: 16,
  color: '#ef4444',
},

sheetCancel: {
  marginTop: 8,
  paddingVertical: 14,
  alignItems: 'center',
  borderTopWidth: 1,
  borderTopColor: '#2a2a2a',
},

cancelText: {
  fontSize: 16,
  color: '#9ca3af',
},

reactionBar: {
  flexDirection: 'row',
  alignSelf: 'center',
  backgroundColor: '#2a2a2a',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  marginBottom: 6,
},

reactionEmoji: {
  fontSize: 22,
  marginHorizontal: 6,
},

swipeReplyContainer: {
  justifyContent: 'center',
  alignItems: 'flex-start',
  paddingLeft: 16,
  width: 100,
},
swipeReplyContainerLeft: {
  justifyContent: 'center',
  alignItems: 'flex-end',
  paddingRight: 16,
  width: 100,
},
swipeReplyButton: {
  backgroundColor: '#10b981',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 16,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
},
swipeReplyText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},

replyPreview: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#1f2933', 
  marginHorizontal: 12,
  marginBottom: 6,
  padding: 10,
  borderRadius: 10,
},

replyLine: {
  width: 3,
  backgroundColor: '#34d399',
  borderRadius: 2,
  marginRight: 8,
},

replySender: {
  color: '#34d399',
  fontSize: 12,
  fontWeight: '600',
},

replyText: {
  color: '#d1d5db',
  fontSize: 13,
  opacity: 0.9,
},

quotedReply: {
  backgroundColor: 'rgba(0,0,0,0.15)',
  paddingVertical: 6,
  paddingHorizontal: 8,
  borderLeftWidth: 3,
  borderLeftColor: '#34d399', 
  borderRadius: 6,
  marginBottom: 6,
},

quotedSender: {
  fontSize: 11,
  fontWeight: '600',
  color: '#34d399', 
  marginBottom: 2,
},

quotedText: {
  fontSize: 13,
  color: '#e5e7eb',
  opacity: 0.85,
},

  sendButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#10b981',
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 8,
  },

  sendButtonDisabled: {
  backgroundColor: '#374151',
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
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scanningContainer: {
    backgroundColor: '#1f1f1f',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 250,
  },
  scanningText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
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
  nsfwWarningBanner: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  nsfwWarningText: {
    color: '#1f2933',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});


