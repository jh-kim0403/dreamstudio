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
import { API_BASE_URL } from "../config/api";
import { styles } from "../styles/HomeScreen.styles";

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

const shouldShowVerifyButton = (goal: Goal): boolean => {
  const isQuizReady =
    goal.verification_type === "quiz" &&
    goal.quiz_question_status === "created" &&
    goal.verification_result !== "approved";

  const isFreshPhotoGoal =
    goal.verification_type == null &&
    goal.quiz_question_status === "none" &&
    goal.verification_status === "not started";

  const isExistingPhotoGoal =
    goal.verification_type === "photo" &&
    goal.verification_result !== "approved";

  return isQuizReady || isFreshPhotoGoal || isExistingPhotoGoal;
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
      <View style={styles.missingTokenContainer}>
        <Text>Missing access token. Please log in again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navCard}>
        <TouchableOpacity
          onPress={() => setIsNavCollapsed((prev) => !prev)}
          style={styles.navToggle}
        >
          <Text style={styles.navTitle}>Navigation</Text>
          <Text style={styles.navToggleLabel}>{isNavCollapsed ? "Show" : "Hide"}</Text>
        </TouchableOpacity>
        {!isNavCollapsed ? (
          <View style={styles.navLinks}>
            <Text style={styles.navLinkText}>Home</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("PastGoals");
              }}
            >
              <Text style={styles.navLinkText}>Past Goals</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("PurchaseBountyAndWithdrawl");
              }}
            >
              <Text style={styles.navLinkText}>Purchase Bounty & Withdrawl</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("Profile");
              }}
            >
              <Text style={styles.navLinkText}>Profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.addGoalButton}
        onPress={() => {
          // @ts-expect-error: app-wide nav types not yet defined
          navigation.navigate("AddNewGoal");
        }}
      >
        <Text style={styles.primaryButtonText}>Add new goal</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Current Goals</Text>
      {isLoading ? <ActivityIndicator size="large" /> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <FlatList
        data={sortedGoals}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>{item.title || item.name || "Untitled Goal"}</Text>
              {item.verification_type === "quiz" &&
              (item.quiz_question_status === "pending" ||
                item.quiz_question_status === "none") ? (
                <Text style={styles.pendingQuizText}>Quiz being created</Text>
              ) : shouldShowVerifyButton(item) ? (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => {
                    // @ts-expect-error: app-wide nav types not yet defined
                    navigation.navigate("Verification", {
                      goalId: item.id,
                      goalTypeId: item.goal_type_id,
                      goalVerificationType: item.verification_type,
                    });
                  }}
                >
                  <Text style={styles.primaryButtonText}>Verify</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {item.verification_result === "approved" ? (
              <Text style={styles.approvedText}>Completed</Text>
            ) : item.verification_result === "rejected" ? (
              <Text style={styles.rejectedText}>Failed - last submission</Text>
            ) : null}
            {item.description ? (
              <Text style={styles.descriptionText}>{item.description}</Text>
            ) : null}
            {(item.deadline || item.created_at || item.updated_at) ? (
              <Text style={styles.dateText}>{formatGoalDate(item)}</Text>
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
