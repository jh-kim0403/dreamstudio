/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { ActivityIndicator, StatusBar, StyleSheet, View, useColorScheme } from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import AuthenticatedScreens from './src/screens/AuthenticatedScreens';
import AuthContextProvider from './src/auth/AuthProvider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import AuthContext from './src/context/AuthContext';
import { StripeProvider } from '@stripe/stripe-react-native';


const STRIPE_PUBLISHABLE_KEY = 'pk_test_51IaRKKFi3VeKp8O4EAEuWDIo4VYcQqgdJeE9TEnQbxNJTwl4OBstWX8zjUhnvhUbFYg2T5hLeGtWatpnW3kLKM5s00XdN4EUYu'; //change later

const linking = {
  prefixes: ['goalstudio://'],
  config: {
    screens: {
      Login: 'login',
      SignUp: 'signup',
      VerifyEmail: 'verify-email',
    },
  },
};

const Stack = createNativeStackNavigator();
function Navigation() {
  const auth = useContext(AuthContext);
  const user = auth?.isLoggedIn ?? false;
  const isAuthBootstrapping = auth?.isAuthBootstrapping ?? true;

  if (isAuthBootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Login' }} />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ title: 'SignUp' }} />
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmailScreen}
            options={{ title: 'Verify Email' }} />
        </>
      ) : (
        <Stack.Screen
          name="App"
          component={AuthenticatedScreens}
          options={{ headerShown: false }}
        />

      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthContextProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <NavigationContainer linking={linking}>
            <Navigation />
          </NavigationContainer>
        </StripeProvider>
      </AuthContextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
