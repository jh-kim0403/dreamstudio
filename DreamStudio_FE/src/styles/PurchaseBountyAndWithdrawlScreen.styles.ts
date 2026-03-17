import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    color: "#555",
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: "row",
  },
  methodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  methodButtonActive: {
    backgroundColor: "#111",
  },
  methodButtonInactive: {
    backgroundColor: "#e0e0e0",
  },
  methodButtonSpacing: {
    marginRight: 10,
  },
  methodTextActive: {
    color: "#fff",
  },
  methodTextInactive: {
    color: "#111",
  },
  amountSection: {
    marginTop: 16,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    color: "#b00020",
    marginTop: 12,
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonActive: {
    backgroundColor: "#111",
  },
  submitButtonDisabled: {
    backgroundColor: "#555",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
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
