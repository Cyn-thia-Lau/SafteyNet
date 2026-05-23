import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  const [status, setStatus] = useState("No active check-in");
  const [coords, setCoords] = useState<string | null>(null);
  const [hours, setHours] = useState(8);
  const [activeCheckin, setActiveCheckin] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadContacts();
      loadActiveCheckin();
    }
  }, [session]);

  useEffect(() => {
    if (!activeCheckin) {
      setTimeLeft("");
      return;
    }
    const timer = setInterval(() => {
      const ms = new Date(activeCheckin.deadline).getTime() - Date.now();
      if (ms <= 0) {
        setTimeLeft("DEADLINE PASSED");
      } else {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCheckin]);

  async function signUp() {
    setAuthMsg("Creating account…");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setAuthMsg(error.message); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMsg(signInError ? signInError.message : "");
  }

  async function signIn() {
    setAuthMsg("Signing in…");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMsg(error ? error.message : "");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function loadContacts() {
    const { data } = await supabase.from("contacts").select("*");
    setContacts(data || []);
  }

  async function loadActiveCheckin() {
    const { data } = await supabase
      .from("checkins")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    setActiveCheckin(data && data.length > 0 ? data[0] : null);
  }

  async function startCheckin() {
    setStatus("Getting your location…");
    const { status: permission } = await Location.requestForegroundPermissionsAsync();
    if (permission !== "granted") {
      setStatus("Location permission denied. Safety Net needs it to work.");
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setCoords(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setStatus("No user ID found — not logged in properly.");
      return;
    }
    setStatus("Saving check-in to the cloud…");
    const { error } = await supabase.from("checkins").insert({
      user_id: userId,
      deadline: deadline.toISOString(),
      status: "active",
      last_lat: lat,
      last_lng: lng,
      last_location_at: new Date().toISOString(),
    });
    if (error) {
      setStatus("Error saving: " + error.message);
      return;
    }
    setStatus("✓ Check-in active and saved.");
    loadActiveCheckin();
  }

  async function imSafe() {
    setStatus("Updating…");
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { error } = await supabase
      .from("checkins")
      .update({ status: "safe" })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) {
      setStatus("Error: " + error.message);
    } else {
      setStatus("You're marked safe ✓");
      loadActiveCheckin();
    }
  }

  async function addContact() {
    if (!newName.trim() || !newPhone.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("contacts").insert({
      user_id: userData.user?.id,
      name: newName.trim(),
      phone: newPhone.trim(),
    });
    if (!error) {
      setNewName("");
      setNewPhone("");
      loadContacts();
    }
  }

  async function deleteContact(id: string) {
    await supabase.from("contacts").delete().eq("id", id);
    loadContacts();
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#2f80ed" size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Safety Net</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.startButton} onPress={signIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.safeButton} onPress={signUp}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        {authMsg ? <Text style={styles.authMsg}>{authMsg}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Safety Net</Text>

      {activeCheckin && timeLeft ? (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownLabel}>⏱ Active check-in — alert in</Text>
          <Text style={styles.countdownTime}>{timeLeft}</Text>
        </View>
      ) : null}

      <Text style={styles.subtitle}>{status}</Text>
      {coords && <Text style={styles.coords}>📍 {coords}</Text>}

      <Text style={styles.pickerLabel}>Alert if I don't check in within:</Text>
      <View style={styles.pickerRow}>
        {[1, 2, 4, 8, 12].map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.hourChip, hours === h && styles.hourChipActive]}
            onPress={() => setHours(h)}
          >
            <Text style={[styles.hourChipText, hours === h && styles.hourChipTextActive]}>
              {h}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startCheckin}>
        <Text style={styles.buttonText}>Start Check-in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.safeButton} onPress={imSafe}>
        <Text style={styles.buttonText}>I'm Safe</Text>
      </TouchableOpacity>

      <View style={styles.contactsBox}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.disclaimer}>
          These people will be texted your location if you miss a check-in.
          This requires the app's server and their phone to have signal —
          it cannot be guaranteed. Treat it as one layer of safety, not your only plan.
        </Text>
        {contacts.length === 0 ? (
          <Text style={styles.empty}>No contacts yet.</Text>
        ) : (
          contacts.map((c) => (
            <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
  <Text style={styles.contactItem}>• {c.name} — {c.phone}</Text>
  <TouchableOpacity onPress={() => deleteContact(c.id)}>
    <Text style={{ color: "#e05555", fontSize: 18 }}>✕</Text>
  </TouchableOpacity>
</View>

          ))
        )}
        <TextInput
          style={styles.input}
          placeholder="Contact name"
          placeholderTextColor="#666"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (e.g. +447700900123)"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={newPhone}
          onChangeText={setNewPhone}
        />
        <TouchableOpacity style={styles.addButton} onPress={addContact}>
          <Text style={styles.buttonText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={{ marginTop: 30, marginBottom: 40 }}>
        <Text style={{ color: "#666" }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0f1115" },
  container: {
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 16, color: "#9aa0a6", marginBottom: 20, textAlign: "center" },
  coords: { fontSize: 15, color: "#2f80ed", marginBottom: 16 },
  countdownBox: {
    backgroundColor: "#1a1d23",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
  },
  countdownLabel: { color: "#9aa0a6", fontSize: 13, marginBottom: 6 },
  countdownTime: { color: "#e0a030", fontSize: 36, fontWeight: "bold" },
  pickerLabel: { color: "#9aa0a6", fontSize: 14, marginBottom: 10, textAlign: "center" },
  pickerRow: { flexDirection: "row", justifyContent: "center", marginBottom: 20, gap: 8 },
  hourChip: {
    backgroundColor: "#1a1d23",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  hourChipActive: { backgroundColor: "#2f80ed" },
  hourChipText: { color: "#9aa0a6", fontSize: 15, fontWeight: "600" },
  hourChipTextActive: { color: "#fff" },
  input: {
    width: "100%",
    backgroundColor: "#1a1d23",
    color: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
  },
  startButton: {
    backgroundColor: "#2f80ed",
    paddingVertical: 18,
    borderRadius: 14,
    marginBottom: 16,
    marginTop: 8,
    width: "100%",
    alignItems: "center",
  },
  safeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 18,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  authMsg: { color: "#e0a030", marginTop: 18, textAlign: "center" },
  contactsBox: { width: "100%", marginTop: 30 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 8 },
  disclaimer: { color: "#7a8088", fontSize: 12, lineHeight: 17, marginBottom: 14 },
  empty: { color: "#666", fontStyle: "italic", marginBottom: 12 },
  contactItem: { color: "#cfd3d8", fontSize: 15, marginBottom: 6 },
  addButton: {
    backgroundColor: "#3a3f47",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 6,
  },
});