import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  topSpacer: {
    marginTop: 12,
  },
  errorText: {
    color: "red",
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  questionCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  questionLabel: {
    fontWeight: "600",
  },
  answerRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  answerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  answerButtonSpacing: {
    marginRight: 8,
  },
  answerButtonActive: {
    backgroundColor: "#0f62fe",
  },
  answerButtonInactive: {
    backgroundColor: "#e0e0e0",
  },
  answerText: {
    fontWeight: "600",
  },
  answerTextActive: {
    color: "#fff",
  },
  answerTextInactive: {
    color: "#111",
  },
  submitError: {
    color: "red",
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonTopSpacing: {
    marginTop: 12,
  },
  actionButtonActive: {
    backgroundColor: "#111",
  },
  actionButtonDisabled: {
    backgroundColor: "#555",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  mutedText: {
    color: "#666",
    marginBottom: 8,
  },
  uploadError: {
    color: "red",
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalBody: {
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
