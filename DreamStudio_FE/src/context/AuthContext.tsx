import React, { createContext } from 'react';


export interface AccessTokenContextType{
  userID: any;
  issue_at: any;
  exp: any;
}

export interface AuthContextType {
    user: any;
    token: string | null;
    isLoggedIn: boolean;
  
    login: (data: any) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
    updateProfile: (changes: any) => Promise<void>;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default AuthContext;