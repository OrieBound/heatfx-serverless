'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

// ── Cognito pool ──────────────────────────────────────────────────────────────

const getUserPool = () =>
  new CognitoUserPool({
    UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
    ClientId:   process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  });

// ── types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  sub:      string;
  email:    string;
  nickname?: string;
  groups:   string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  idToken: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname?: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  /** Cognito ForgotPassword — sends a verification code to the user’s verified email. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Cognito ConfirmForgotPassword — code from email + new password. */
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  updateProfile: (nickname: string) => Promise<void>;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function userFromSession(session: CognitoUserSession): AuthUser {
  const payload   = session.getIdToken().decodePayload();
  const rawGroups = payload['cognito:groups'];
  const groups: string[] = Array.isArray(rawGroups) ? rawGroups : [];
  return {
    sub:      String(payload['sub']   ?? ''),
    email:    String(payload['email'] ?? ''),
    nickname: payload['nickname'] ? String(payload['nickname']) : undefined,
    groups,
  };
}

function restoreSession(): Promise<{ user: AuthUser; idToken: string } | null> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(null);
    let pool: CognitoUserPool;
    try { pool = getUserPool(); } catch { return resolve(null); }
    const cognitoUser = pool.getCurrentUser();
    if (!cognitoUser) return resolve(null);
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve({ user: userFromSession(session), idToken: session.getIdToken().getJwtToken() });
    });
  });
}

// ── context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null, idToken: null, isLoading: true,
  login: () => {}, logout: () => {},
  signIn: async () => {}, signUp: async () => {},
  confirmSignUp: async () => {}, resendCode: async () => {},
  requestPasswordReset: async () => {},
  confirmPasswordReset: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const poolRef = useRef<CognitoUserPool | null>(null);

  const getPool = useCallback(() => {
    if (!poolRef.current) poolRef.current = getUserPool();
    return poolRef.current;
  }, []);

  // Restore session on mount
  useEffect(() => {
    restoreSession().then(result => {
      if (result) { setUser(result.user); setIdToken(result.idToken); }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const logout = useCallback(() => {
    const cognitoUser = getPool().getCurrentUser();
    cognitoUser?.signOut();
    setUser(null);
    setIdToken(null);
    window.location.href = '/';
  }, [getPool]);

  const signIn = useCallback((email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pool = getPool();
      const cognitoUser = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool });
      const authDetails = new AuthenticationDetails({ Username: email.trim().toLowerCase(), Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess(session) {
          setUser(userFromSession(session));
          setIdToken(session.getIdToken().getJwtToken());
          resolve();
        },
        onFailure(err) {
          reject(err);
        },
        newPasswordRequired() {
          reject(new Error('NewPasswordRequired'));
        },
      });
    });
  }, [getPool]);

  const signUp = useCallback((email: string, password: string, nickname?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pool = getPool();
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email.trim().toLowerCase() }),
      ];
      if (nickname?.trim()) {
        attributes.push(new CognitoUserAttribute({ Name: 'nickname', Value: nickname.trim() }));
      }
      pool.signUp(email.trim().toLowerCase(), password, attributes, [], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }, [getPool]);

  const confirmSignUp = useCallback((email: string, code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pool = getPool();
      const cognitoUser = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool });
      cognitoUser.confirmRegistration(code.trim(), true, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }, [getPool]);

  const updateProfile = useCallback((nickname: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = getPool().getCurrentUser();
      if (!cognitoUser) return reject(new Error('Not signed in'));
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) return reject(err ?? new Error('No session'));
        cognitoUser.updateAttributes(
          [new CognitoUserAttribute({ Name: 'nickname', Value: nickname.trim() })],
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            setUser(prev => prev ? { ...prev, nickname: nickname.trim() } : prev);
            resolve();
          }
        );
      });
    });
  }, [getPool]);

  const resendCode = useCallback((email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pool = getPool();
      const cognitoUser = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool });
      cognitoUser.resendConfirmationCode((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }, [getPool]);

  const requestPasswordReset = useCallback((email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pool = getPool();
      const cognitoUser = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool });
      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err) => reject(err),
        inputVerificationCode: () => resolve(),
      });
    });
  }, [getPool]);

  const confirmPasswordReset = useCallback(
    (email: string, code: string, newPassword: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const pool = getPool();
        const cognitoUser = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: pool });
        cognitoUser.confirmPassword(code.trim(), newPassword, {
          onSuccess: () => resolve(),
          onFailure: (err) => reject(err),
        });
      });
    },
    [getPool]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        isLoading,
        login,
        logout,
        signIn,
        signUp,
        confirmSignUp,
        resendCode,
        requestPasswordReset,
        confirmPasswordReset,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
