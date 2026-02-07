import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthContext from "../context/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://10.0.2.2:8000/api/v1";

type GoalType = {
  id: string;
  name: string;
  description?: string;
  question_count?: number;
};

type BibleBook = {
  name: string;
  chapters: number;
};

const BIBLE_BOOKS: BibleBook[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

export default function AddNewGoalScreen() {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;
  const authFetch = auth?.authFetch;
  const navigation = useNavigation();
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([]);
  const [goalTypeError, setGoalTypeError] = useState<string | null>(null);
  const [isGoalTypesLoading, setIsGoalTypesLoading] = useState(false);
  const [isGoalTypeOpen, setIsGoalTypeOpen] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType | null>(
    null
  );

  const [isBibleBookOpen, setIsBibleBookOpen] = useState(false);
  const [selectedBibleBook, setSelectedBibleBook] =
    useState<BibleBook | null>(null);
  const [fromChapter, setFromChapter] = useState("1");
  const [toChapter, setToChapter] = useState("1");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bountyAmount, setBountyAmount] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    const fetchGoalTypes = async () => {
      setIsGoalTypesLoading(true);
      setGoalTypeError(null);
      try {
        const response = await (authFetch ?? fetch)(`${API_BASE_URL}/goals/goaltypes`, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.detail || "Failed to load goal types");
        }
        const data = await response.json();
        setGoalTypes(Array.isArray(data) ? data : []);
      } catch (error: any) {
        setGoalTypeError(error?.message ?? "Failed to load goal types");
      } finally {
        setIsGoalTypesLoading(false);
      }
    };

    void fetchGoalTypes();
  }, [token]);

  const isBibleGoal = useMemo(() => {
    const name = selectedGoalType?.name?.toLowerCase() ?? "";
    return name.includes("bible");
  }, [selectedGoalType]);

  const maxChapters = selectedBibleBook?.chapters ?? 0;

  useEffect(() => {
    if (!selectedBibleBook) {
      return;
    }
    setFromChapter("1");
    setToChapter("1");
  }, [selectedBibleBook]);

  const clampChapter = (value: string) => {
    const numeric = parseInt(value || "0", 10);
    if (!numeric || numeric < 1) {
      return "1";
    }
    if (maxChapters && numeric > maxChapters) {
      return String(maxChapters);
    }
    return String(numeric);
  };

  const handleFromChange = (value: string) => {
    const next = clampChapter(value.replace(/[^0-9]/g, ""));
    setFromChapter(next);
    const nextNum = parseInt(next, 10);
    const toNum = parseInt(toChapter || "1", 10);
    if (toNum < nextNum) {
      setToChapter(String(nextNum));
    }
  };

  const handleToChange = (value: string) => {
    const next = clampChapter(value.replace(/[^0-9]/g, ""));
    const nextNum = parseInt(next, 10);
    const fromNum = parseInt(fromChapter || "1", 10);
    if (nextNum < fromNum) {
      setToChapter(String(fromNum));
    } else {
      setToChapter(next);
    }
  };

  const validateDeadline = (date: Date) => {
    const now = new Date();
    const selected = new Date(date);
    if (selected < now) {
      setDeadlineError("Deadline must be now or later");
      return false;
    }
    setDeadlineError(null);
    return true;
  };

  const mergeDate = (base: Date, datePart: Date) =>
    new Date(
      datePart.getFullYear(),
      datePart.getMonth(),
      datePart.getDate(),
      base.getHours(),
      base.getMinutes(),
      base.getSeconds(),
      base.getMilliseconds()
    );

  const mergeTime = (base: Date, timePart: Date) =>
    new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      timePart.getHours(),
      timePart.getMinutes(),
      timePart.getSeconds(),
      timePart.getMilliseconds()
    );

  const handleSubmit = async () => {
    if (!token) {
      setSubmitError("Missing access token. Please log in again.");
      return;
    }
    if (!selectedGoalType) {
      setSubmitError("Select a goal type.");
      return;
    }
    if (!title.trim()) {
      setSubmitError("Enter a title.");
      return;
    }
    if (!bountyAmount.trim() || Number.isNaN(Number(bountyAmount))) {
      setSubmitError("Enter a valid bounty amount.");
      return;
    }
    if (!deadline) {
      setSubmitError("Select a deadline.");
      return;
    }
    if (!validateDeadline(deadline)) {
      setSubmitError("Deadline must be today or later.");
      return;
    }
    if (isBibleGoal) {
      if (!selectedBibleBook) {
        setSubmitError("Select a bible book.");
        return;
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);
    const userInput = isBibleGoal && selectedBibleBook
      ? `Read ${selectedBibleBook.name} ${fromChapter}-${toChapter}`
      : "";
    try {
      const response = await (authFetch ?? fetch)(`${API_BASE_URL}/goals/newgoal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal_type_id: selectedGoalType.id,
          title: title.trim(),
          description: description.trim(),
          user_input: userInput,
          bounty_amount: Number(bountyAmount),
          deadline: deadline.toISOString(),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Failed to create goal");
      }
      setTitle("");
      setDescription("");
      setBountyAmount("");
      setDeadline(null);
      setSelectedBibleBook(null);
      setFromChapter("1");
      setToChapter("1");
      // @ts-expect-error: app-wide nav types not yet defined
      navigation.navigate("Home");
    } catch (error: any) {
      setSubmitError(error?.message ?? "Failed to create goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
        Add New Goal
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: "#e0e0e0",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setIsGoalTypeOpen((prev) => !prev)}
          style={{
            padding: 12,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontWeight: "600" }}>
            {selectedGoalType?.name || "Select goal type"}
          </Text>
          <Text>{isGoalTypeOpen ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
        {isGoalTypeOpen ? (
          <View style={{ borderTopWidth: 1, borderTopColor: "#eee" }}>
            {isGoalTypesLoading ? (
              <View style={{ padding: 12 }}>
                <ActivityIndicator />
              </View>
            ) : null}
            {goalTypeError ? (
              <Text style={{ color: "red", padding: 12 }}>{goalTypeError}</Text>
            ) : null}
            {goalTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => {
                  setSelectedGoalType(type);
                  setIsGoalTypeOpen(false);
                }}
                style={{ padding: 12 }}
              >
                <Text style={{ fontWeight: "500" }}>{type.name}</Text>
                {type.description ? (
                  <Text style={{ color: "#666", marginTop: 4 }}>
                    {type.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      {isBibleGoal ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Read the Bible
          </Text>

          <View
            style={{
              borderWidth: 1,
              borderColor: "#e0e0e0",
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setIsBibleBookOpen((prev) => !prev)}
              style={{
                padding: 12,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontWeight: "600" }}>
                {selectedBibleBook?.name || "Select bible book"}
              </Text>
              <Text>{isBibleBookOpen ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {isBibleBookOpen ? (
              <View style={{ borderTopWidth: 1, borderTopColor: "#eee" }}>
                {BIBLE_BOOKS.map((book) => (
                  <TouchableOpacity
                    key={book.name}
                    onPress={() => {
                      setSelectedBibleBook(book);
                      setIsBibleBookOpen(false);
                    }}
                    style={{ padding: 12 }}
                  >
                    <Text style={{ fontWeight: "500" }}>
                      {book.name} ({book.chapters} chapters)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ marginBottom: 6 }}>From</Text>
              <TextInput
                value={fromChapter}
                onChangeText={handleFromChange}
                keyboardType="number-pad"
                placeholder="1"
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 6,
                  padding: 10,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ marginBottom: 6 }}>To</Text>
              <TextInput
                value={toChapter}
                onChangeText={handleToChange}
                keyboardType="number-pad"
                placeholder="1"
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 6,
                  padding: 10,
                }}
              />
            </View>
          </View>

          {selectedBibleBook ? (
            <Text style={{ color: "#666", marginBottom: 12 }}>
              Chapters range: 1 to {selectedBibleBook.chapters}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 6 }}>Deadline (local time)</Text>
        <TouchableOpacity
          onPress={() => setShowDeadlinePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 6,
            padding: 10,
          }}
        >
          <Text>
            {deadline ? deadline.toLocaleString() : "Select date & time"}
          </Text>
        </TouchableOpacity>
        {showDeadlinePicker ? (
          Platform.OS === "android" ? (
            <DateTimePicker
              value={deadline ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display="default"
              onChange={(event, selectedDate) => {
                if (event?.type === "dismissed") {
                  setShowDeadlinePicker(false);
                  return;
                }
                const base = deadline ?? new Date();
                const next = selectedDate ? mergeDate(base, selectedDate) : base;
                setDeadline(next);
                validateDeadline(next);
                setShowDeadlinePicker(false);
                setShowTimePicker(true);
              }}
            />
          ) : (
            <DateTimePicker
              value={deadline ?? new Date()}
              mode="datetime"
              minimumDate={new Date()}
              display="default"
              onChange={(_, selectedDate) => {
                setShowDeadlinePicker(false);
                if (selectedDate) {
                  setDeadline(selectedDate);
                  validateDeadline(selectedDate);
                }
              }}
            />
          )
        ) : null}
        {showTimePicker && Platform.OS === "android" ? (
          <DateTimePicker
            value={deadline ?? new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              if (event?.type === "dismissed") {
                setShowTimePicker(false);
                return;
              }
              const base = deadline ?? new Date();
              const next = selectedDate ? mergeTime(base, selectedDate) : base;
              setDeadline(next);
              validateDeadline(next);
              setShowTimePicker(false);
            }}
          />
        ) : null}
        {deadlineError ? (
          <Text style={{ color: "red", marginTop: 6 }}>{deadlineError}</Text>
        ) : null}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 6 }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Goal title"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 6,
            padding: 10,
          }}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 6 }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Goal description"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 6,
            padding: 10,
            minHeight: 80,
            textAlignVertical: "top",
          }}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ marginBottom: 6 }}>Bounty amount</Text>
        <TextInput
          value={bountyAmount}
          onChangeText={setBountyAmount}
          placeholder="100"
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 6,
            padding: 10,
          }}
        />
      </View>

      {submitError ? (
        <Text style={{ color: "red", marginBottom: 12 }}>{submitError}</Text>
      ) : null}

      <TouchableOpacity
        style={{
          backgroundColor: isSubmitting ? "#555" : "#111",
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
        disabled={isSubmitting}
        onPress={handleSubmit}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
