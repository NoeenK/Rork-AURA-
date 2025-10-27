import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, User } from '@/lib/supabase';
import { useRouter, useSegments } from 'expo-router';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const extractFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0] || 'User';
  };

  const loadUser = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      const metadata = supabaseUser.user_metadata;
      const firstName = extractFirstName(metadata?.full_name || metadata?.name);
      
      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: metadata?.full_name || metadata?.name || 'User',
        firstName,
        avatar: metadata?.avatar_url || metadata?.picture,
        googleId: metadata?.provider === 'google' ? metadata?.sub : undefined,
        appleId: metadata?.provider === 'apple' ? metadata?.sub : undefined,
      };

      setUser(userData);
      console.log('User loaded:', userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUser(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed:', _event);
        setSession(session);
        if (session?.user) {
          await loadUser(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUser]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      router.replace('/auth');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, isLoading, router]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    signOut,
    isAuthenticated: !!session,
  }), [session, user, isLoading, signOut]);
});
