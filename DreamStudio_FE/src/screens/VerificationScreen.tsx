import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { launchCamera } from "react-native-image-picker";
import RNBlobUtil from "react-native-blob-util";
import AuthContext from "../context/AuthContext";

const API_BASE_URL = "http://10.0.2.2:8000/api/v1";

type QuizQuestion = {
  quiz_id: string;
  question: string;
};

type VerificationTypeResponse = {
  verification_type?: string;
  quiz_questions?: QuizQuestion[];
  questions?: QuizQuestion[];
  verification_id?: string;
};

export default function VerificationScreen() {
  const auth = useContext(AuthContext);
  const token = auth?.token ?? null;
  const authFetch = auth?.authFetch;
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-expect-error: app-wide nav types not yet defined
  const goalId = route.params?.goalId as string | undefined;
  // @ts-expect-error: app-wide nav types not yet defined
  const goalVerificationType = route.params?.goalVerificationType as
    | string
    | undefined;

  const [verificationType, setVerificationType] = useState<string | null>(
    goalVerificationType ?? null
  );
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean | null>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !goalId) {
      return;
    }
    const fetchVerificationType = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        if (goalVerificationType) {
          if (goalVerificationType === "quiz") {
            const quizResponse = await (authFetch ?? fetch)(
              `${API_BASE_URL}/verification/getquiz/${goalId}`,
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            if (!quizResponse.ok) {
              const err = await quizResponse.json().catch(() => null);
              throw new Error(err?.detail || "Failed to load quiz questions");
            }
            const quizData = await quizResponse.json();
            const normalized = Array.isArray(quizData)
              ? quizData
              : quizData?.quiz_questions ?? [];
            setQuizQuestions(normalized);
          }
          if (goalVerificationType === "photo" && !verificationId) {
            const createResponse = await (authFetch ?? fetch)(
              `${API_BASE_URL}/verification/create/${goalId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            if (!createResponse.ok) {
              const err = await createResponse.json().catch(() => null);
              throw new Error(err?.detail || "Failed to create verification");
            }
            const createData = await createResponse.json();
            if (createData?.verification_id) {
              setVerificationId(createData.verification_id);
            }
          }
          return;
        }

        const response = await (authFetch ?? fetch)(
          `${API_BASE_URL}/verification/verification-type/${goalId}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.detail || "Failed to load verification type");
        }
        const data: VerificationTypeResponse = await response.json();
        const type = data.verification_type ?? null;
        setVerificationType(type);
        if (data.verification_id) {
          setVerificationId(data.verification_id);
        }
        const questions = data.quiz_questions ?? data.questions ?? [];
        if (questions.length > 0) {
          setQuizQuestions(questions);
        }
        if (type === "quiz" && questions.length === 0) {
          const quizResponse = await (authFetch ?? fetch)(
            `${API_BASE_URL}/verification/getquiz/${goalId}`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (!quizResponse.ok) {
            const err = await quizResponse.json().catch(() => null);
            throw new Error(err?.detail || "Failed to load quiz questions");
          }
          const quizData = await quizResponse.json();
          const normalized = Array.isArray(quizData)
            ? quizData
            : quizData?.quiz_questions ?? [];
          setQuizQuestions(normalized);
        }
        if (type === "photo" && !data.verification_id) {
          const createResponse = await (authFetch ?? fetch)(
            `${API_BASE_URL}/verification/create/${goalId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (!createResponse.ok) {
            const err = await createResponse.json().catch(() => null);
            throw new Error(err?.detail || "Failed to create verification");
          }
          const createData = await createResponse.json();
          if (createData?.verification_id) {
            setVerificationId(createData.verification_id);
          }
        }
      } catch (error: any) {
        setErrorMessage(error?.message ?? "Failed to load verification");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchVerificationType();
  }, [goalId, goalVerificationType, token, verificationId]);

  const canShowQuiz = useMemo(
    () => verificationType === "quiz",
    [verificationType]
  );
  const canShowPhoto = useMemo(
    () => verificationType === "photo",
    [verificationType]
  );

  const handleQuizSubmit = async () => {
    if (!token || !goalId) {
      setSubmitError("Missing access token or goal id.");
      return;
    }
    const unanswered = quizQuestions.filter((question, index) => {
      const key = question.quiz_id || String(index);
      return quizAnswers[key] === undefined || quizAnswers[key] === null;
    });
    if (unanswered.length > 0) {
      setSubmitError("Please answer all questions.");
      return;
    }
    setSubmitError(null);
    setSubmitResult(null);
    setIsSubmitting(true);
    try {
      const payload = {
        goal_id: goalId,
        user_submission: quizQuestions.map((question, index) => {
          const key = question.quiz_id || String(index);
          return {
            quiz_id: question.quiz_id,
            user_answer: quizAnswers[key] ? "true" : "false",
          };
        }),
      };
      const response = await (authFetch ?? fetch)(`${API_BASE_URL}/verification/quiz/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Failed to submit quiz");
      }
      const data = await response.json();
      setSubmitResult("Quiz Submitted");
      setShowSubmitModal(true);
    } catch (error: any) {
      setSubmitError(error?.message ?? "Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!token) {
      setUploadError("Missing access token.");
      return;
    }
    if (!verificationId) {
      setUploadError(
        "Missing verification id. Please confirm backend response includes verification_id."
      );
      return;
    }
    setUploadError(null);
    setUploadResult(null);
    setIsUploading(true);
    try {
      const result = await launchCamera({ mediaType: "photo" });
      if (result.didCancel) {
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        throw new Error("No photo captured");
      }
      const contentType = asset.type || "image/jpeg";
      const extMatch = asset.fileName?.match(/\.[a-zA-Z0-9]+$/);
      const fileExt = extMatch ? extMatch[0] : ".jpg";
      console.log("photo upload contentType", contentType);
      console.log("photo upload fileExt", fileExt);

      const presignResponse = await (authFetch ?? fetch)(
        `${API_BASE_URL}/verification/photos/presign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_id: verificationId,
            content_type: contentType,
            file_ext: fileExt,
          }),
        }
      );
      if (!presignResponse.ok) {
        const err = await presignResponse.json().catch(() => null);
        throw new Error(err?.detail || "Failed to get upload URL");
      }
      const presignData = await presignResponse.json();
      const uploadUrl = presignData?.upload_url;
      const s3Key = presignData?.s3_key;
      console.log("photo upload presign response", presignData);
      console.log("photo upload URL", uploadUrl);
      if (!uploadUrl || !s3Key) {
        throw new Error("Upload URL missing");
      }
      const uploadPath = asset.uri.startsWith("file://")
        ? asset.uri.replace("file://", "")
        : asset.uri;
      const uploadResult = await RNBlobUtil.fetch(
        "PUT",
        uploadUrl,
        {
          "Content-Type": contentType,
        },
        RNBlobUtil.wrap(uploadPath)
      );
      console.log("photo upload status", uploadResult.info().status);
      try {
        console.log("photo upload response", uploadResult.data);
      } catch (error) {
        console.log("photo upload response read error", error);
      }
      if (uploadResult.info().status < 200 || uploadResult.info().status >= 300) {
        throw new Error("Upload failed");
      }
      const confirmResponse = await (authFetch ?? fetch)(
        `${API_BASE_URL}/verification/photos/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verification_id: verificationId,
            s3_key: s3Key,
            meta: {},
          }),
        }
      );
      if (!confirmResponse.ok) {
        const err = await confirmResponse.json().catch(() => null);
        throw new Error(err?.detail || "Failed to confirm photo upload");
      }
      setUploadResult("success");
      setShowUploadModal(true);
    } catch (error: any) {
      const message = error?.message ?? "Photo upload failed";
      setUploadError(message);
      setUploadResult(message);
      setShowUploadModal(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
        Verification
      </Text>
      {!goalId ? <Text>Missing goal id.</Text> : null}
      {isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {errorMessage ? (
        <Text style={{ color: "red", marginTop: 12 }}>{errorMessage}</Text>
      ) : null}

      {canShowQuiz ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Quiz Questions
          </Text>
          {quizQuestions.length === 0 ? (
            <Text>No quiz questions available yet.</Text>
          ) : (
            quizQuestions.map((question, index) => (
              (() => {
                const key = question.quiz_id || String(index);
                const selected = quizAnswers[key] ?? null;
                return (
              <View
                key={key}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  Q{index + 1}
                </Text>
                <Text>{question.question}</Text>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: selected === true ? "#0f62fe" : "#e0e0e0",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      marginRight: 8,
                    }}
                    onPress={() =>
                      setQuizAnswers((prev) => {
                        setSubmitError(null);
                        setSubmitResult(null);
                        return {
                          ...prev,
                          [key]: true,
                        };
                      })
                    }
                  >
                    <Text
                      style={{
                        color: selected === true ? "#fff" : "#111",
                        fontWeight: "600",
                      }}
                    >
                      True
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: selected === false ? "#0f62fe" : "#e0e0e0",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                    }}
                    onPress={() =>
                      setQuizAnswers((prev) => {
                        setSubmitError(null);
                        setSubmitResult(null);
                        return {
                          ...prev,
                          [key]: false,
                        };
                      })
                    }
                  >
                    <Text
                      style={{
                        color: selected === false ? "#fff" : "#111",
                        fontWeight: "600",
                      }}
                    >
                      False
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
                );
              })()
            ))
          )}
          {submitError ? (
            <Text style={{ color: "red", marginTop: 8 }}>
              {submitError}
            </Text>
          ) : null}
          {quizQuestions.length > 0 ? (
            <TouchableOpacity
              style={{
                backgroundColor: isSubmitting ? "#555" : "#111",
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 12,
              }}
              onPress={handleQuizSubmit}
              disabled={isSubmitting}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {isSubmitting ? "Submitting..." : "Submit answers"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {canShowPhoto ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Photo Verification
          </Text>
          {verificationId ? null : (
            <Text style={{ color: "#666", marginBottom: 8 }}>
              Waiting for verification id from backend.
            </Text>
          )}
          {uploadError ? (
            <Text style={{ color: "red", marginBottom: 8 }}>
              {uploadError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={{
              backgroundColor: isUploading ? "#555" : "#111",
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
            onPress={handlePhotoUpload}
            disabled={isUploading}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {isUploading ? "Uploading..." : "Take photo & upload"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </ScrollView>
      <Modal
        transparent
        visible={showUploadModal}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
              {uploadResult === "success"
                ? "Photo Submitted"
                : "Photo Upload Failed"}
            </Text>
            <Text style={{ color: "#555", textAlign: "center", marginBottom: 16 }}>
              {uploadResult === "success"
                ? "Your photo was sent successfully."
                : uploadResult || "Photo upload failed."}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#111",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}
              onPress={() => {
                setShowUploadModal(false);
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("Home");
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Back to Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
      transparent
      visible={showSubmitModal}
      animationType="fade"
      onRequestClose={() => setShowSubmitModal(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 20,
            width: "100%",
            maxWidth: 320,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Quiz Submitted
          </Text>
          <Text style={{ color: "#555", textAlign: "center", marginBottom: 16 }}>
            Your answers were sent successfully.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#111",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
            onPress={() => {
              setShowSubmitModal(false);
              // @ts-expect-error: app-wide nav types not yet defined
              navigation.navigate("Home");
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
      </Modal>
    </>
  );
}
