import React, { useContext, ReactNode} from 'react';
import AuthContext from '../context/AuthContext.tsx';


interface AuthContextProviderProps {
  children: ReactNode;
}

export default function AuthContextProvider({ children } : AuthContextProviderProps) { {}
  const auth_context = useContext(AuthContext);


  return (
    <AuthContext.Provider value={{ auth_context }}>
      {children} {/* This is where your child components will be rendered */}
    </AuthContext.Provider>
  );
};