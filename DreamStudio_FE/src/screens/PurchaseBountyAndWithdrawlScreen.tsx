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
import { API_BASE_URL } from "../config/api";
import { styles } from "../styles/PurchaseBountyAndWithdrawlScreen.styles";
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
    <View style={styles.container}>
      <Text style={styles.heading}>Purchase Bounty</Text>
      <Text style={styles.subtitle}>Add payment methods and fund bounties here.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payment method</Text>
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              styles.methodButtonSpacing,
              method === "bank"
                ? styles.methodButtonActive
                : styles.methodButtonInactive,
            ]}
            onPress={() => setMethod("bank")}
          >
            <Text
              style={
                method === "bank"
                  ? styles.methodTextActive
                  : styles.methodTextInactive
              }
            >
              Bank ($5 min)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.methodButton,
              method === "card"
                ? styles.methodButtonActive
                : styles.methodButtonInactive,
            ]}
            onPress={() => setMethod("card")}
          >
            <Text
              style={
                method === "card"
                  ? styles.methodTextActive
                  : styles.methodTextInactive
              }
            >
              Debit ($10 min)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.amountSection}>
        <Text style={styles.sectionLabel}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={`Minimum $${minAmount}`}
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />
      </View>
      {message ? <Text style={styles.messageText}>{message}</Text> : null}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isLoading ? styles.submitButtonDisabled : styles.submitButtonActive,
        ]}
        onPress={handlePurchase}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Purchase Bounty</Text>
        )}
      </TouchableOpacity>
      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Success</Text>
            <Text style={styles.modalBody}>Your payment was submitted successfully.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                // @ts-expect-error: app-wide nav types not yet defined
                navigation.navigate("Home");
              }}
            >
              <Text style={styles.primaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
