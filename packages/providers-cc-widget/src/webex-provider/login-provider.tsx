import React, {createContext, useContext, useState, ReactNode, useEffect} from 'react';
import webex from './sdk';

// @ts-ignore
window.webex = webex;

interface ICommonContext {
  loginState: string;
  setLoginState: React.Dispatch<React.SetStateAction<string>>;
  isAvailable: boolean;
  ccSdk: typeof webex;
}

const CommonContext = createContext<ICommonContext | null>(null);

interface LoginProviderProps {
  children: ReactNode;
}

export const LoginProvider: React.FC<LoginProviderProps> = ({children}) => {
  const [loginState, setLoginState] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [ccSdk] = useState(webex);

  return (
    <CommonContext.Provider
      value={{
        loginState,
        setLoginState,
        isAvailable,
        ccSdk,
      }}
    >
      {children}
    </CommonContext.Provider>
  );
};

export const useCommonData = () => {
  const context = useContext(CommonContext);
  if (context === null) {
    throw new Error('useCommonData must be used within a LoginProvider');
  }
  return context;
};
