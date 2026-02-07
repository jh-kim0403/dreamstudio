import { Input, Icon, Button } from '@rneui/base';
import React, { useContext, useState } from 'react';
import { View, Text } from 'react-native';
import { GoogleSigninButton, statusCodes, GoogleSignin } from '@react-native-google-signin/google-signin';
import AuthContext from '../context/AuthContext';

const API_BASE_URL = 'http://10.0.2.2:8000/api/v1';
type LoginResponse = {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    access_token: string;
    refresh_token: string;
};

const LoginScreen = () => {
    const auth = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isInProgress, setIsInProgress] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isSuccessResponse = (response: any): response is { data: any } => {
        return response && response.data;
    }
    const isErrorWithCode = (error: any): error is { code: string } => {
        return error && typeof error.code === 'string';
    }
    
    const handleAuthResponse = async (data: LoginResponse) => {
        if (!auth) {
            throw new Error('AuthContext not available');
        }
        await auth.login(data);
    };

    const handleLogin = async () => {
        setIsInProgress(true);
        setErrorMessage(null);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/manual/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => null);
                throw new Error(err?.detail || 'Login failed');
            }
            const data: LoginResponse = await response.json();
            await handleAuthResponse(data);
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Login failed');
        } finally {
            setIsInProgress(false);
        }
    };

    const googleSignIn = async () => {
        setIsInProgress(true);
        setErrorMessage(null);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (!isSuccessResponse(response)) {
                return;
            }
            const idToken = response.data?.idToken;
            if (!idToken) {
                throw new Error('Missing Google id token');
            }
            const apiResponse = await fetch(`${API_BASE_URL}/auth/google/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken }),
            });
            if (!apiResponse.ok) {
                const err = await apiResponse.json().catch(() => null);
                throw new Error(err?.detail || 'Google login failed');
            }
            const data: LoginResponse = await apiResponse.json();
            await handleAuthResponse(data);
        } catch (error) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.IN_PROGRESS:
                        // operation (eg. sign in) already in progress
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        // Android only, play services not available or outdated
                        break;
                    default:
                        console.error(" An error occurred during Google sign in", error);
                }
            } else {
                // an error that's not related to google sign in occurred
                console.error(" An unknown error occurred during Google sign in", error);
            }
            setErrorMessage('Google sign-in failed');
        } finally {
            setIsInProgress(false);
        }
    };

    return (
        <View>

            <Input
                inputMode="email"
                placeholder='Email Address'
                value={email}
                onChangeText={setEmail}
                leftIcon={
                    <Icon
                        name='email'
                        type='material'
                        size={36}
                        color='black'
                    />
                }
            />
            <Input
                placeholder='Password'
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                leftIcon={
                    <Icon
                        name='lock'
                        type='material'
                        size={36}
                        color='black'
                    />
                }
            />
            <Button title="Login" onPress={handleLogin} disabled={isInProgress} />

            {errorMessage ? <Text>{errorMessage}</Text> : null}

            <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={googleSignIn}
                disabled={isInProgress}
            />
        </View>

    );
}

export default LoginScreen;
