import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setCurrentUserId, clearCurrentUserId } from './user-scoped-storage';
import { supabase } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { useAppStore } from '../hooks/useAppStore';
import { ensureUserHasOrganization } from './auto-organization-setup';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionReady: boolean; // NEW: Indicates session is ready for API calls
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  triggerDataLoad: () => void; // Trigger data load manually
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [dataLoadTrigger, setDataLoadTrigger] = useState(0);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event, !!session);
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          avatar: session.user.user_metadata?.avatar_url
        };
        
        // Reset navigation to dashboard on auth state change (handles OAuth redirects)
        if (_event === 'SIGNED_IN') {
          console.log('🏠 Resetting navigation to dashboard on sign in');
          useAppStore.getState().clearNavigationHistory();
        }
        
        setUser(userData);
        // Set user ID for data scoping
        setCurrentUserId(session.user.id);
        
        // Session is ready when we have an access token
        if (session.access_token) {
          console.log('✅ Session ready with access token');
          setSessionReady(true);
        }
      } else {
        setUser(null);
        setSessionReady(false);
        clearCurrentUserId();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      console.log('🔍 Checking existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check error:', error);
        setUser(null);
        setSessionReady(false);
        clearCurrentUserId();
      } else if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          avatar: session.user.user_metadata?.avatar_url
        };
        console.log('✅ Existing session found for:', userData.email);
        setUser(userData);
        setCurrentUserId(session.user.id);
        
        // Session is ready if we have an access token
        if (session.access_token) {
          console.log('✅ Session ready with access token');
          setSessionReady(true);
          
          // NEW (Phase 3): Ensure user has organization
          // Only run if we have a valid user session (not on initial page load)
          try {
            console.log('🏢 [Phase 3] Checking/creating organization for existing session...');
            
            // Wait a moment to ensure session is fully established
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const orgInfo = await ensureUserHasOrganization({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            });
            
            if (orgInfo) {
              console.log('✅ [Phase 3] User has organization:', orgInfo.organization_name);
            }
          } catch (orgError) {
            // Don't block if org creation fails
            console.error('⚠️ [Phase 3] Organization setup error (non-blocking):', orgError);
          }
        }
      } else {
        console.log('ℹ️ No existing session');
        setSessionReady(false);
      }
    } catch (error) {
      console.error('❌ Failed to check session:', error);
      setUser(null);
      setSessionReady(false);
      clearCurrentUserId();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in failed:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const userData = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name,
          avatar: data.user.user_metadata?.avatar_url
        };
        
        console.log('✅ User authenticated:', userData.email);
        
        // Set user ID for data scoping (this will allow access to user's cached data)
        setCurrentUserId(data.user.id);
        
        // CRITICAL: Wait for session to be fully established and verifiable
        console.log('⏳ Waiting for session to be ready...');
        
        let attempts = 0;
        let sessionVerified = false;
        
        while (attempts < 10 && !sessionVerified) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms intervals
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            console.log(`✅ Session verified after ${(attempts + 1) * 200}ms`);
            sessionVerified = true;
            setSessionReady(true);
          } else {
            attempts++;
            console.log(`⏳ Attempt ${attempts}/10 - session not ready yet...`);
          }
        }
        
        if (!sessionVerified) {
          console.warn('⚠️ Session verification timeout - proceeding anyway');
          setSessionReady(true); // Set it anyway and hope for the best
        }
        
        // Reset navigation to dashboard on fresh login
        console.log('🏠 Resetting navigation to dashboard');
        useAppStore.getState().clearNavigationHistory();
        
        // Set user state - this will trigger all components to load data
        setUser(userData);
        
        // NEW (Phase 3): Ensure user has organization
        try {
          console.log('🏢 [Phase 3] Checking/creating organization...');
          const orgInfo = await ensureUserHasOrganization({
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata,
          });
          
          if (orgInfo) {
            console.log('✅ [Phase 3] User has organization:', orgInfo.organization_name);
          } else {
            console.log('ℹ️ [Phase 3] Organization setup skipped or disabled');
          }
        } catch (orgError) {
          // Don't block login if org creation fails - user can continue
          console.error('⚠️ [Phase 3] Organization setup error (non-blocking):', orgError);
        }
        
        console.log('📦 User and session ready - components will now load data');
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: 'Failed to sign in. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Call our server endpoint to create user with admin privileges
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password, name })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to create account' };
      }

      // Now sign in with the created credentials
      return await signIn(email, password);
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Failed to create account. Please try again.' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // Use redirect flow instead of popup to work in iframes
          skipBrowserRedirect: false
        }
      });

      if (error) {
        // Check if Google OAuth is not configured
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          return { 
            success: false, 
            error: 'Google Sign-In is not configured yet. Please use email/password or contact support.' 
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: 'Failed to sign in with Google. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear user state
      setUser(null);
      setSessionReady(false);
      
      // Clear user ID (but keep user data in localStorage for next login)
      clearCurrentUserId();
      
      console.log('✅ Sign out complete - user data preserved in localStorage');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const triggerDataLoad = () => {
    console.log('🔄 Manually triggering data load...');
    setDataLoadTrigger(prev => prev + 1);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: 'Failed to update password. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionReady,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        triggerDataLoad
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
