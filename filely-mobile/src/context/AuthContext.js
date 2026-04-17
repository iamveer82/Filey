import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, auth, db } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
  }, []);

  // Register global handler so api/client.js can trigger logout on 401
  useEffect(() => {
    globalThis.__onAuthFailure = clearSession;
    return () => { globalThis.__onAuthFailure = null; };
  }, [clearSession]);

  useEffect(() => {
    auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id, session.user.user_metadata?.org_id || 'default');
      }
      setLoading(false);
    });

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id, session.user.user_metadata?.org_id || 'default');
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearSession();
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed successfully — keep user logged in
        if (session?.user) setUser(session.user);
      }
      // TOKEN_REFRESH_FAILED is not a standard Supabase event; handle via session null check
    });

    return () => subscription.unsubscribe();
  }, [clearSession]);

  const loadProfile = async (userId, orgId) => {
    try {
      const { data } = await db.getProfile(userId);
      if (data) {
        setProfile({ ...data, org_id: data.org_id || orgId });
      } else {
        // First login — create profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id:      userId,
            org_id:  orgId,
            name:    'User',
            email:   '',
            company: 'My Company',
            plan:    'basic',
          })
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      }
    } catch (e) {
      console.error('[AuthContext] loadProfile error:', e?.message);
    }
  };

  const signUp = async (email, password, name) => {
    if (!email.trim() || !password || password.length < 6) {
      throw new Error('Valid email and password (min 6 chars) required.');
    }
    const { data, error } = await auth.signUp(email.trim().toLowerCase(), password, { name, company: 'My Company' });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!email.trim() || !password) throw new Error('Email and password required.');
    const { data, error } = await auth.signIn(email.trim().toLowerCase(), password);
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try { await auth.signOut(); } catch (e) { console.error('[AuthContext] signOut:', e?.message); }
    clearSession();
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { data } = await db.updateProfile(user.id, updates);
    if (data) setProfile(prev => ({ ...prev, ...data }));
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    orgId:  profile?.org_id || 'default',
    userId: user?.id        || 'admin',
    role:   profile?.role   || 'member',
    isManager: (profile?.role === 'manager' || profile?.role === 'admin'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
