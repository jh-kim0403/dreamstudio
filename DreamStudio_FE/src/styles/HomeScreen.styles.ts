import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  missingTokenContainer: {
    padding: 20,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  navCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  navToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  navToggleLabel: {
    fontSize: 16,
  },
  navLinks: {
    marginTop: 10,
  },
  navLinkText: {
    color: "#555",
    marginBottom: 6,
  },
  addGoalButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },
  errorText: {
    color: "red",
  },
  listContent: {
    paddingBottom: 24,
  },
  goalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingQuizText: {
    color: "#666",
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: "#0f62fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  approvedText: {
    color: "#0a7f45",
    fontWeight: "600",
    marginTop: 4,
  },
  rejectedText: {
    color: "#b00020",
    fontWeight: "600",
    marginTop: 4,
  },
  descriptionText: {
    color: "#555",
    marginTop: 4,
  },
  dateText: {
    color: "#888",
    marginTop: 4,
  },
});
