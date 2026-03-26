import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, useRoute, useNavigation } from "@react-navigation/native";
import { launchCamera } from "react-native-image-picker";
import RNBlobUtil from "react-native-blob-util";
import Geolocation from "react-native-geolocation-service";
import AuthContext from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import { styles } from "../styles/VerificationScreen.styles";

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

  const navigateHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
  };

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

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission Required",
          message: "Your location is required to verify your goal completion.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const auth = await Geolocation.requestAuthorization("whenInUse");
      return auth === "granted";
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

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
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        throw new Error("Location permission is required to submit a photo verification.");
      }
      const location = await getCurrentLocation();
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
            meta: { latitude: location.latitude, longitude: location.longitude },
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Verification</Text>
      {!goalId ? <Text>Missing goal id.</Text> : null}
      {isLoading ? <ActivityIndicator style={styles.topSpacer} /> : null}
      {errorMessage ? (
        <Text style={[styles.errorText, styles.topSpacer]}>{errorMessage}</Text>
      ) : null}

      {canShowQuiz ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz Questions</Text>
          {quizQuestions.length === 0 ? (
            <Text>No quiz questions available yet.</Text>
          ) : (
            quizQuestions.map((question, index) => (
              (() => {
                const key = question.quiz_id || String(index);
                const selected = quizAnswers[key] ?? null;
                return (
              <View key={key} style={styles.questionCard}>
                <Text style={styles.questionLabel}>Q{index + 1}</Text>
                <Text>{question.question}</Text>
                <View style={styles.answerRow}>
                  <TouchableOpacity
                    style={[
                      styles.answerButton,
                      styles.answerButtonSpacing,
                      selected === true
                        ? styles.answerButtonActive
                        : styles.answerButtonInactive,
                    ]}
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
                      style={[
                        styles.answerText,
                        selected === true
                          ? styles.answerTextActive
                          : styles.answerTextInactive,
                      ]}
                    >
                      True
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.answerButton,
                      selected === false
                        ? styles.answerButtonActive
                        : styles.answerButtonInactive,
                    ]}
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
                      style={[
                        styles.answerText,
                        selected === false
                          ? styles.answerTextActive
                          : styles.answerTextInactive,
                      ]}
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
            <Text style={styles.submitError}>{submitError}</Text>
          ) : null}
          {quizQuestions.length > 0 ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonTopSpacing,
                isSubmitting
                  ? styles.actionButtonDisabled
                  : styles.actionButtonActive,
              ]}
              onPress={handleQuizSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.actionButtonText}>{isSubmitting ? "Submitting..." : "Submit answers"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {canShowPhoto ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Verification</Text>
          {verificationId ? null : (
            <Text style={styles.mutedText}>Waiting for verification id from backend.</Text>
          )}
          {uploadError ? (
            <Text style={styles.uploadError}>{uploadError}</Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isUploading
                ? styles.actionButtonDisabled
                : styles.actionButtonActive,
            ]}
            onPress={handlePhotoUpload}
            disabled={isUploading}
          >
            <Text style={styles.actionButtonText}>{isUploading ? "Uploading..." : "Take photo & upload"}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {uploadResult === "success"
                ? "Photo Submitted"
                : "Photo Upload Failed"}
            </Text>
            <Text style={styles.modalBody}>
              {uploadResult === "success"
                ? "Your photo was sent successfully."
                : uploadResult || "Photo upload failed."}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowUploadModal(false);
                navigateHome();
              }}
            >
              <Text style={styles.actionButtonText}>Back to Home</Text>
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Quiz Submitted</Text>
          <Text style={styles.modalBody}>Your answers were sent successfully.</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowSubmitModal(false);
              navigateHome();
            }}
          >
            <Text style={styles.actionButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
      </Modal>
    </>
  );
}
