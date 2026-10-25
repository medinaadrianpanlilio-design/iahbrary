import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/supabase';
import {
  getProfile,
  isUsernameAvailable,
  saveProfile,
  isValidUsername,
  normalizeUsername,
} from '@/db/repositories/profilesRepository';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  username: string | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (
    username: string,
    email: string,
    pass: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  updateUsername: (newUsername: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  username: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  updateUsername: async () => ({ error: null }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Initial session restoration from AsyncStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((err) => {
      console.warn('Error fetching initial auth session:', err);
      setIsLoading(false);
    });

    // 2. Real-time auth state listener (sign in, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    // 3. Deep link handling for email confirmation / auth redirects
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      try {
        // Parse access_token and refresh_token from hash fragments (#access_token=... or ?access_token=...)
        const parsed = Linking.parse(url);
        let accessToken: string | undefined;
        let refreshToken: string | undefined;

        if (parsed.queryParams) {
          accessToken = parsed.queryParams['access_token'] as string | undefined;
          refreshToken = parsed.queryParams['refresh_token'] as string | undefined;
        }

        // Check hash fragments if not found in queryParams
        if (!accessToken && url.includes('#')) {
          const hash = url.substring(url.indexOf('#') + 1);
          const params = new URLSearchParams(hash);
          accessToken = params.get('access_token') || undefined;
          refreshToken = params.get('refresh_token') || undefined;
        }

        if (accessToken && refreshToken) {
          setIsLoading(true);
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session) {
            setSession(data.session);
            setUser(data.user);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error handling auth deep link:', err);
        setIsLoading(false);
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    });

    // Listen for incoming deep links while app is running / backgrounded
    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const userId = user?.id ?? null;
  const fallbackUsername = user?.user_metadata?.username ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!userId) {
        setUsername(null);
        return;
      }

      try {
        const profile = await getProfile(userId);
        if (cancelled) return;

        if (profile) {
          setUsername(profile.username);
          return;
        }

        // Compatibility path for accounts created before the profile trigger
        // existed. The signed-in user is allowed to create their own profile.
        if (fallbackUsername && isValidUsername(fallbackUsername).valid) {
          const created = await saveProfile(userId, fallbackUsername);
          if (!cancelled) setUsername(created.username);
        } else {
          setUsername(null);
        }
      } catch (err) {
        console.warn('Could not load profile:', err);
        if (!cancelled) setUsername(fallbackUsername);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, fallbackUsername]);

  const signIn = async (email: string, pass: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !pass) {
        return { error: new Error('Please enter your email and password.') };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { error: new Error('Please enter a valid email address.') };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        // Supabase returns 'Invalid login credentials' when the email or password is incorrect.
        return { error: new Error(error.message) };
      }

      if (!data.user || !data.session) {
        return { error: new Error('Unable to sign in. Please verify your credentials.') };
      }

      setSession(data.session);
      setUser(data.user);

      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message || 'An unexpected sign-in error occurred.') };
    }
  };

  const signUp = async (usernameInput: string, emailInput: string, pass: string) => {
    try {
      const cleanUsername = normalizeUsername(usernameInput);
      const cleanEmail = emailInput.trim().toLowerCase();

      // 1. Validate username format
      const validation = isValidUsername(cleanUsername);
      if (!validation.valid) {
        return { error: new Error(validation.reason || 'Invalid username.') };
      }

      // 2. Check if username is already taken
      const available = await isUsernameAvailable(cleanUsername);
      if (!available) {
        return {
          error: new Error(
            `The username "${cleanUsername}" is already taken. Please choose another one.`
          ),
        };
      }

      // 3. Supabase Auth sign-up. The username travels in metadata so a
      // database trigger can create the profile at the same time.
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            username: cleanUsername,
          },
          emailRedirectTo: 'iahbrary://',
        },
      });

      if (error) {
        const message = /database error/i.test(error.message)
          ? 'That username may already be taken. Please choose another one.'
          : error.message;
        return { error: new Error(message) };
      }

      // The profile row is created by the trigger on auth.users. The effect
      // above reads it back through owner-only RLS once a session exists.
      const needsEmailConfirmation = !data.session;
      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null, needsEmailConfirmation };
    } catch (e: any) {
      return { error: new Error(e.message || 'An unexpected sign-up error occurred.') };
    }
  };

  const updateUsername = async (newUsername: string) => {
    try {
      if (!user) {
        return { error: new Error('You must be logged in to set a username.') };
      }

      const cleanUsername = normalizeUsername(newUsername);
      const validation = isValidUsername(cleanUsername);
      if (!validation.valid) {
        return { error: new Error(validation.reason || 'Invalid username.') };
      }

      const available = await isUsernameAvailable(cleanUsername);
      if (!available) {
        return {
          error: new Error(
            `The username "${cleanUsername}" is already taken. Please choose another one.`
          ),
        };
      }

      // Usernames are profile data, not login identifiers. Keeping them out
      // of auth metadata after sign-up avoids a second source of truth.
      const updated = await saveProfile(user.id, cleanUsername);
      setUsername(updated.username);

      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message || 'Failed to update username.') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    } finally {
      setSession(null);
      setUser(null);
      setUsername(null);
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        return { error: new Error('No user logged in.') };
      }

      // One transactional SECURITY DEFINER function deletes the user's rows
      // and the auth user itself. The client never needs table-level DELETE
      // access across the whole schema.
      const { error } = await supabase.rpc('delete_own_account');
      if (error) {
        return { error: new Error(error.message) };
      }

      await signOut();
      setUsername(null);

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting account:', err);
      return { error: new Error(err.message || 'Failed to delete account.') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        username,
        isLoading,
        signIn,
        signUp,
        updateUsername,
        signOut,
        deleteAccount,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
