import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import AuthContext from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const API_BASE_URL = "http://10.0.2.2:8000/api/v1";
const MIN_BANK = 5;
const MIN_CARD = 10;

type Method = "bank" | "card";

export default function PurchaseBountyAndWithdrawlScreen() {
  const auth = useContext(AuthContext);
  const authFetch = auth?.authFetch;
  const token = auth?.token ?? null;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const navigation = useNavigation();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("bank");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const minAmount = method === "bank" ? MIN_BANK : MIN_CARD;

  const handlePurchase = async () => {
    if (!token) {
      setMessage("Missing access token. Please log in again.");
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }
    if (parsed < minAmount) {
      setMessage(`Minimum ${method} charge is $${minAmount}.`);
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await (authFetch ?? fetch)(
        `${API_BASE_URL}/payments/create-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount_cents: Math.round(parsed * 100),
            method,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Failed to create payment intent");
      }
      const data = await response.json();
      const clientSecret = data?.client_secret;
      if (!clientSecret) {
        throw new Error("Missing payment intent client secret");
      }

      const init = await initPaymentSheet({
        merchantDisplayName: "DreamStudio",
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: method === "bank",
      });
      if (init.error) {
        throw new Error(init.error.message);
      }
      const present = await presentPaymentSheet();
      if (present.error) {
        throw new Error(present.error.message);
      }
      setAmount("");
      setMessage("Payment submitted.");
      setShowSuccessModal(true);
    } catch (error: any) {
      setMessage(error?.message ?? "Payment failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>
        Purchase Bounty
      </Text>
      <Text style={{ color: "#555" }}>
        Add payment methods and fund bounties here.
      </Text>
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>
          Payment method
        </Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            style={{
              backgroundColor: method === "bank" ? "#111" : "#e0e0e0",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
              marginRight: 10,
            }}
            onPress={() => setMethod("bank")}
          >
            <Text style={{ color: method === "bank" ? "#fff" : "#111" }}>
              Bank ($5 min)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: method === "card" ? "#111" : "#e0e0e0",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
            }}
            onPress={() => setMethod("card")}
          >
            <Text style={{ color: method === "card" ? "#fff" : "#111" }}>
              Debit ($10 min)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ marginTop: 16 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={`Minimum $${minAmount}`}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
      </View>
      {message ? (
        <Text style={{ color: "#b00020", marginTop: 12 }}>{message}</Text>
      ) : null}
      <TouchableOpacity
        style={{
          backgroundColor: isLoading ? "#555" : "#111",
          paddingVertical: 12,
          borderRadius: 8,
          alignItems: "center",
          marginTop: 16,
        }}
        onPress={handlePurchase}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Purchase Bounty
          </Text>
        )}
      </TouchableOpacity>
      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
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
              Payment Success
            </Text>
            <Text style={{ color: "#555", textAlign: "center", marginBottom: 16 }}>
              Your payment was submitted successfully.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#111",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
              }}
              onPress={() => {
                setShowSuccessModal(false);
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
    </View>
  );
}
