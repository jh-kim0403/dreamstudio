import React from "react";
import { Text, View } from "react-native";

export default function PastGoalsScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>
        Past Goals
      </Text>
      <Text style={{ color: "#555" }}>
        Review completed or expired goals here.
      </Text>
    </View>
  );
}
