import { Input, Icon, Button } from '@rneui/base';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GoogleSigninButton, statusCodes, GoogleSignin } from '@react-native-google-signin/google-signin';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isInProgress, setIsInProgress] = useState(false);

    const isSuccessResponse = (response: any): response is { data: any } => {
        return response && response.data;
    }
    const isErrorWithCode = (error: any): error is { code: string } => {
        return error && typeof error.code === 'string';
    }
    
    const handleLogin = () => {
        // Handle traditional email/password login logic here
    }

    const googleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (isSuccessResponse(response)) {
                useState({ userInfo: response.data });
            } else {
                // sign in was cancelled by user
            }
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
            <Button title="Login" onPress={handleLogin} />

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