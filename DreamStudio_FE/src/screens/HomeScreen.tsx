import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AuthContext from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://10.0.2.2:8000/api/v1";

type Goal = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  quiz_question_status?: string;
  verification_status?: string;
  goal_type_id?: string;
  verification_type?: string;
  verification_result?: string;
  verification_updated_at?: string;
};

const getGoalDateValue = (goal: Goal): number => {
  const raw = goal.deadline || goal.created_at || goal.updated_at;
  if (!raw) {
    return 0;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatGoalDate = (goal: Goal): string | null => {
  const raw = goal.deadline || goal.created_at || goal.updated_at;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return raw;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
};

export default function HomeScreen() {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;
  const authFetch = auth?.authFetch;
  const navigation = useNavigation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const fetchGoals = async (isRefresh = false) => {
    if (!token) {
      return;
    }
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      const response = await (authFetch ?? fetch)(`${API_BASE_URL}/goals/getcurrentgoals`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Failed to load goals");
      }
      const data = await response.json();
      const normalized = Array.isArray(data) ? data : data?.data ?? [];
      setGoals(normalized);
    } catch (error: any) {
      setErrorMessage(error?.message ?? "Failed to load goals");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchGoals(false);
  }, [token]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => getGoalDateValue(a) - getGoalDateValue(b));
  }, [goals]);

  if (!token) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Missing access token. Please log in again.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#e0e0e0",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setIsNavCollapsed((prev) => !prev)}
          style={{ flexDirection: "row", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Navigation</Text>
          <Text style={{ fontSize: 16 }}>
            {isNavCollapsed ? "Show" : "Hide"}
          </Text>
        </TouchableOpacity>
        {!isNavCollapsed ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: "#555", marginBottom: 6 }}>Home</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("PastGoals");
              }}
            >
              <Text style={{ color: "#555", marginBottom: 6 }}>Past Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("PurchaseBountyAndWithdrawl");
              }}
            >
              <Text style={{ color: "#555", marginBottom: 6 }}>
                Purchase Bounty & Withdrawl
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: "#111",
          paddingVertical: 12,
          borderRadius: 8,
          marginBottom: 16,
          alignItems: "center",
        }}
        onPress={() => {
          // @ts-expect-error: app-wide nav types not yet defined
          navigation.navigate("AddNewGoal");
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          Add new goal
        </Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 12 }}>
        Current Goals
      </Text>
      {isLoading ? <ActivityIndicator size="large" /> : null}
      {errorMessage ? <Text style={{ color: "red" }}>{errorMessage}</Text> : null}
      <FlatList
        data={sortedGoals}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#e0e0e0",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600" }}>
                {item.title || item.name || "Untitled Goal"}
              </Text>
              {item.verification_type === "quiz" &&
              (item.quiz_question_status === "pending" ||
                item.quiz_question_status === "none") ? (
                <Text style={{ color: "#666", fontWeight: "600" }}>
                  Quiz being created
                </Text>
              ) : (item.quiz_question_status === "created" &&
                  (item.verification_result === "rejected" ||
                    item.verification_result == null)) ||
                (item.verification_type === "photo" &&
                  item.verification_result !== "approved") ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#0f62fe",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    marginLeft: 8,
                  }}
                  onPress={() => {
                    // @ts-expect-error: app-wide nav types not yet defined
                    navigation.navigate("Verification", {
                      goalId: item.id,
                      goalTypeId: item.goal_type_id,
                      goalVerificationType: item.verification_type,
                    });
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Verify
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {item.verification_result === "approved" ? (
              <Text style={{ color: "#0a7f45", fontWeight: "600", marginTop: 4 }}>
                Completed
              </Text>
            ) : item.verification_result === "rejected" ? (
              <Text style={{ color: "#b00020", fontWeight: "600", marginTop: 4 }}>
                Failed - last submission
              </Text>
            ) : null}
            {item.description ? (
              <Text style={{ color: "#555", marginTop: 4 }}>
                {item.description}
              </Text>
            ) : null}
            {(item.deadline || item.created_at || item.updated_at) ? (
              <Text style={{ color: "#888", marginTop: 4 }}>
                {formatGoalDate(item)}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text>No goals yet.</Text> : null}
        refreshing={isRefreshing}
        onRefresh={() => {
          void fetchGoals(true);
        }}
      />
    </View>
  );
}
