import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_BASE_URL = "https://deepmatch.onrender.com";
const ADMIN_EMAIL = "deepmatch.noreply@gmail.com";

export default function AdminReportsScreen({ navigation }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem("current_user");
      if (userData) setCurrentUser(JSON.parse(userData));
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.email !== ADMIN_EMAIL && !currentUser.is_admin) {
      Alert.alert("Access denied", "You are not an admin.");
      navigation.goBack();
      return;
    }
    loadReports();
  }, [currentUser]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to load reports (${res.status}): ${txt}`);
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error("Load reports error", e);
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const filtered = reports.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.reporter || "").toLowerCase().includes(q) ||
      (r.reported || "").toLowerCase().includes(q) ||
      (r.reason || "").toLowerCase().includes(q)
    );
  });

  const openDetail = (report) => {
    setSelected(report);
    setAdminNote("");
    setModalVisible(true);
  };

  const resolveReport = async (ban = false) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(
        `${API_BASE_URL}/api/admin/reports/${selected.id}/resolve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ban, admin_note: adminNote }),
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed");
      }
      await loadReports();
      setModalVisible(false);
      Alert.alert("Success", `Report resolved${ban ? " and user banned" : ""}`);
    } catch (e) {
      console.error("Resolve error", e);
      Alert.alert("Error", "Failed to resolve report");
    } finally {
      setSubmitting(false);
    }
  };

  const banUserDirect = async (reported_id) => {
    if (!reported_id) {
      Alert.alert("Error", "Reported user id not available");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${reported_id}/ban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: adminNote || "Banned by admin" }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Ban failed");
      }
      await loadReports();
      Alert.alert("Success", "User banned");
    } catch (e) {
      console.error("Ban error", e);
      Alert.alert("Error", "Failed to ban user");
    } finally {
      setSubmitting(false);
    }
  };

  const unbanUserDirect = async (reported_id) => {
    if (!reported_id) {
      Alert.alert("Error", "Reported user id not available");
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${reported_id}/unban`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Unban failed");
      }
      await loadReports();
      Alert.alert("Success", "User unbanned");
    } catch (e) {
      console.error("Unban error", e);
      Alert.alert("Error", "Failed to unban user");
    } finally {
      setSubmitting(false);
    }
  };

  const viewReportedProfile = (reported_id) => {
    if (!reported_id) {
      Alert.alert("Error", "Reported user id not available");
      return;
    }
    setModalVisible(false);
    // Navigate to ProfileDetail screen
    navigation.navigate("ProfileDetail", { userId: reported_id });
  };

  const banUser = async (userEmailOrId) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      // We have reported username; need reported user id from report object (assumed present as reported)
      const reportedUser = reports.find((r) => r.id === selected.id)?.reported;
      // Attempt to fetch user id by username is not implemented here; pass reported username to backend is not accepted.
      // Instead, use admin resolve with ban=true which bans reported_user_id server-side.
      await resolveReport(true);
    } catch (e) {
      console.error("Ban error", e);
      Alert.alert("Error", "Failed to ban user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("current_user");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (e) {
      console.error("Admin logout error", e);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          #{item.id} — {item.reporter} → {item.reported}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {item.reason}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.status}>{item.status}</Text>
        <Text style={styles.createdAt}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
        {/* Ban / Unban buttons */}
        {item.reported_id ? (
          item.reported_is_banned ? (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Unban user",
                  `Unban ${item.reported}?`,
                  [
                    { text: "Cancel" },
                    {
                      text: "Unban",
                      onPress: () => unbanUserDirect(item.reported_id),
                    },
                  ]
                )
              }
              style={[styles.smallBtn, { backgroundColor: "#10b981", marginTop: 8 }]}
            >
              <Text style={{ color: "#000", fontWeight: "700" }}>Unban</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Ban user",
                  `Ban ${item.reported}?`,
                  [
                    { text: "Cancel" },
                    {
                      text: "Ban",
                      style: "destructive",
                      onPress: () => banUserDirect(item.reported_id),
                    },
                  ]
                )
              }
              style={[styles.smallBtn, { backgroundColor: "#ef4444", marginTop: 8 }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Ban</Text>
            </TouchableOpacity>
          )
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              // As admin entry-point, back acts as logout
              handleLogout();
            }
          }}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin — Reports</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={loadReports} style={styles.iconButton}>
            <Ionicons name="refresh" size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search reporter / reported / reason..."
          placeholderTextColor="#9ca3af"
          style={styles.search}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ color: "#9ca3af" }}>No reports</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report #{selected?.id}</Text>
            <Text style={styles.modalLine}>
              Reporter: {selected?.reporter}
            </Text>
            <Text style={styles.modalLine}>
              Reported: {selected?.reported}
            </Text>
            {selected?.reported_id && (
              <Text style={styles.modalLine}>
                Reported ID: {selected?.reported_id} {selected?.reported_is_banned ? "(BANNED)" : ""}
              </Text>
            )}
            <Text style={[styles.modalLine, { marginTop: 10 }]}>Reason:</Text>
            <Text style={styles.modalReason}>{selected?.reason}</Text>

            <Text style={[styles.modalLine, { marginTop: 12 }]}>Admin note</Text>
            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Add notes / reason (optional)"
              placeholderTextColor="#9ca3af"
              style={styles.adminNote}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#2a2a2a" }]}
                onPress={() => {
                  setModalVisible(false);
                }}
              >
                <Text style={{ color: "#fff" }}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSmall, { backgroundColor: "#06b6d4" }]}
                onPress={() => viewReportedProfile(selected?.reported_id)}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>View Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#f59e0b" }]}
                onPress={() => resolveReport(false)}
                disabled={submitting}
              >
                <Text style={{ color: "#000" }}>Resolve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#ef4444" }]}
                onPress={() =>
                  Alert.alert(
                    "Resolve and Ban",
                    "Resolve this report and ban the reported user?",
                    [
                      { text: "Cancel" },
                      {
                        text: "Yes, Ban",
                        style: "destructive",
                        onPress: () => resolveReport(true),
                      },
                    ]
                  )
                }
                disabled={submitting}
              >
                <Text style={{ color: "#fff" }}>Resolve + Ban</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#18181b" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  back: { padding: 8 },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconButton: { padding: 8 },
  searchRow: { padding: 12 },
  search: {
    backgroundColor: "#1f1f1f",
    color: "#fff",
    padding: 10,
    borderRadius: 10,
  },
  card: {
    backgroundColor: "#27272a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { color: "#fff", fontWeight: "700", marginBottom: 4 },
  rowSubtitle: { color: "#d1d5db" },
  status: { color: "#9ca3af", fontSize: 12 },
  createdAt: { color: "#6b7280", fontSize: 11, marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalLine: { color: "#d1d5db", marginTop: 6 },
  modalReason: { color: "#fff", marginTop: 6, backgroundColor: "#111", padding: 10, borderRadius: 8 },
  adminNote: {
    backgroundColor: "#111",
    color: "#fff",
    minHeight: 60,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  btnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  smallBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
});

