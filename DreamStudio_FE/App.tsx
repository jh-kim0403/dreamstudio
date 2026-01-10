/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import AuthenticatedScreens from './src/screens/AuthenticatedScreens';
import AuthContextProvider from './src/auth/Auth';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from '@rneui/base';

const Stack = createNativeStackNavigator();
const user = false; //Change to userAuth() later;

function Navigation() {
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
      <LoginScreen />
      <AuthContextProvider>
        <Text>s</Text>
      </AuthContextProvider>
    </SafeAreaProvider>
  );
}
