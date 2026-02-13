import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://deepmatch.onrender.com";

export default function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      const res = await fetch(
        `${API_BASE_URL}/api/blocked-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setBlocked(data.users || []);
    } catch {
      Alert.alert("Failed to load blocked users");
    }
  };

  const unblockUser = async (id) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      await fetch(`${API_BASE_URL}/api/unblock-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocked_user_id: id,
        }),
      });

      // Remove from UI instantly
      setBlocked((prev) =>
        prev.filter((u) => u.id !== id)
      );

    } catch {
      Alert.alert("Failed to unblock user");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#18181b",
        padding: 16,
      }}
    >
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={() => (
          <Text style={{ color: "#9ca3af" }}>
            No blocked users
          </Text>
        )}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Image
              source={{ uri: item.profile_picture }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                marginRight: 12,
              }}
            />

            <Text style={{ color: "#fff", flex: 1 }}>
              {item.name}
            </Text>

            <TouchableOpacity
              onPress={() => unblockUser(item.id)}
            >
              <Text style={{ color: "#10b981" }}>
                Unblock
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
