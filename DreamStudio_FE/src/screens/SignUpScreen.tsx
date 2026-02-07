import { Input, Icon, Button } from '@rneui/base';
import React, { useContext, useState } from 'react';
import { View, Text } from 'react-native';
import { GoogleSigninButton, statusCodes, GoogleSignin } from '@react-native-google-signin/google-signin';
import AuthContext from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:8000/api/v1';
type LoginResponse = {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    access_token: string;
    refresh_token: string;
};

export default function SignUpScreen(){
    const auth = useContext(AuthContext);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isInProgress, setIsInProgress] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isSuccessResponse = (response: any): response is { data: any } => {
        return response && response.data;
    };
    const isErrorWithCode = (error: any): error is { code: string } => {
        return error && typeof error.code === 'string';
    };

    const handleAuthResponse = async (data: LoginResponse) => {
        if (!auth) {
            throw new Error('AuthContext not available');
        }
        await auth.login(data);
    };

    const handleManualSignup = async () => {
        setIsInProgress(true);
        setErrorMessage(null);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/manual/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => null);
                throw new Error(err?.detail || 'Sign up failed');
            }
            const loginResponse = await fetch(`${API_BASE_URL}/auth/manual/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!loginResponse.ok) {
                const err = await loginResponse.json().catch(() => null);
                throw new Error(err?.detail || 'Auto login failed');
            }
            const data: LoginResponse = await loginResponse.json();
            await handleAuthResponse(data);
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Sign up failed');
        } finally {
            setIsInProgress(false);
        }
    };

    const googleSignUp = async () => {
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
                throw new Error(err?.detail || 'Google sign up failed');
            }
            const data: LoginResponse = await apiResponse.json();
            if (data.access_token && data.refresh_token) {
                await handleAuthResponse(data);
            } else {
                throw new Error('Missing tokens from Google sign up response');
            }
        } catch (error) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.IN_PROGRESS:
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        break;
                    default:
                        console.error('An error occurred during Google sign up', error);
                }
            } else {
                console.error('An unknown error occurred during Google sign up', error);
            }
            setErrorMessage('Google sign-up failed');
        } finally {
            setIsInProgress(false);
        }
    };

    return (
        <View>
            <Input
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                leftIcon={<Icon name="person" type="material" size={36} color="black" />}
            />
            <Input
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                leftIcon={<Icon name="person" type="material" size={36} color="black" />}
            />
            <Input
                inputMode="email"
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Icon name="email" type="material" size={36} color="black" />}
            />
            <Input
                placeholder="Password"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
                leftIcon={<Icon name="lock" type="material" size={36} color="black" />}
            />
            <Button title="Sign Up" onPress={handleManualSignup} disabled={isInProgress} />

            {errorMessage ? <Text>{errorMessage}</Text> : null}

            <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={googleSignUp}
                disabled={isInProgress}
            />
        </View>
    );
}
