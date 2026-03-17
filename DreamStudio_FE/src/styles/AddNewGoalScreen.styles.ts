import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  selectorCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 16,
  },
  selectorToggle: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectorLabel: {
    fontWeight: "600",
  },
  selectorList: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  loadingRow: {
    padding: 12,
  },
  errorText: {
    color: "red",
  },
  selectorError: {
    padding: 12,
  },
  selectorItem: {
    padding: 12,
  },
  selectorItemTitle: {
    fontWeight: "500",
  },
  selectorItemDescription: {
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  chapterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  chapterField: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    color: "#666",
    marginBottom: 12,
  },
  inlineErrorText: {
    color: "red",
    marginTop: 6,
  },
  submitError: {
    color: "red",
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  submitButtonActive: {
    backgroundColor: "#111",
  },
  submitButtonDisabled: {
    backgroundColor: "#555",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
