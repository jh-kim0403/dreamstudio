import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import AuthContext from "../context/AuthContext";

const API_BASE_URL = "http://10.0.2.2:8000/api/v1";

type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  bounty_amount?: number;
  bounty_balance?: number;
};

export default function ProfileScreen() {
  const auth = useContext(AuthContext);
  const authFetch = auth?.authFetch;
  const token = auth?.token ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!token) {
      setErrorMessage("Missing access token. Please log in again.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await (authFetch ?? fetch)(`${API_BASE_URL}/user/profile`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Failed to load profile");
      }
      const data = await response.json();
      setProfile(data);
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, [token]);

  const bountyValue = profile?.bounty_amount ?? profile?.bounty_balance ?? 0;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 12 }}>
        Profile
      </Text>

      {isLoading ? <ActivityIndicator size="large" /> : null}
      {errorMessage ? <Text style={{ color: "red", marginBottom: 10 }}>{errorMessage}</Text> : null}

      {profile ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#e0e0e0",
            borderRadius: 10,
            padding: 14,
            gap: 8,
          }}
        >
          <Text>
            <Text style={{ fontWeight: "600" }}>First name: </Text>
            {profile.first_name || "-"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "600" }}>Last name: </Text>
            {profile.last_name || "-"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "600" }}>Email: </Text>
            {profile.email || "-"}
          </Text>
          <Text>
            <Text style={{ fontWeight: "600" }}>Bounty amount: </Text>{bountyValue}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={{
          backgroundColor: "#111",
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
          alignItems: "center",
        }}
        onPress={() => {
          void fetchProfile();
        }}
        disabled={isLoading}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Refresh Profile</Text>
      </TouchableOpacity>
    </View>
  );
}
