import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase';
import { classifyIdentifier } from '@/lib/auth/validation';
import { APP_ROLES, type AppRole } from '@/lib/auth/roles';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  /** The signed-in user's linked member row id (null for staff with no member record). */
  memberId: string | null;
  /** The active Supabase client (null when unconfigured); used by data pages. */
  client: SupabaseClient | null;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

interface AuthProviderProps {
  children: ReactNode;
  /** Injectable for tests; defaults to the singleton client. */
  client?: SupabaseClient | null;
}

export function AuthProvider({ children, client }: AuthProviderProps) {
  const supabase = useMemo(
    () => (client !== undefined ? client : getSupabaseClient()),
    [client],
  );
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const mounted = useRef(true);

  const loadProfile = useCallback(
    async (uid: string | undefined): Promise<{ role: AppRole | null; memberId: string | null }> => {
      if (!supabase || !uid) return { role: null, memberId: null };
      const { data, error } = await supabase
        .from('users')
        .select('role, member_id')
        .eq('id', uid)
        .single();
      if (error || !data) return { role: null, memberId: null };
      return {
        role: isAppRole(data.role) ? data.role : null,
        memberId: typeof data.member_id === 'string' ? data.member_id : null,
      };
    },
    [supabase],
  );

  const applySession = useCallback(
    async (next: Session | null) => {
      if (!mounted.current) return;
      setSession(next);
      if (next?.user) {
        const profile = await loadProfile(next.user.id);
        if (!mounted.current) return;
        setRole(profile.role);
        setMemberId(profile.memberId);
        setStatus('authenticated');
      } else {
        setRole(null);
        setMemberId(null);
        setStatus('unauthenticated');
      }
    },
    [loadProfile],
  );

  useEffect(() => {
    mounted.current = true;

    if (!supabase) {
      // No client configured (fresh checkout / CI without secrets).
      setStatus('unauthenticated');
      return () => {
        mounted.current = false;
      };
    }

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession ?? null);
    });

    return () => {
      mounted.current = false;
      subscription?.unsubscribe();
    };
  }, [supabase, applySession]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (identifier, password) => {
      if (!supabase) return { error: 'Sign-in is unavailable: the app is not configured.' };

      const trimmed = identifier.trim();
      let email = trimmed;

      if (classifyIdentifier(trimmed) === 'member_number') {
        const { data, error } = await supabase.rpc('email_for_member_number', {
          p_member_number: Number(trimmed),
        });
        if (error) return { error: 'We could not look up that member number. Try again.' };
        if (!data) return { error: 'No account matches that member number.' };
        email = data as string;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: 'Incorrect credentials. Please try again.' };

      // Apply the fresh session immediately so `status` flips to authenticated
      // before the caller (LoginPage) redirects. The onAuthStateChange event is
      // delivered asynchronously and would otherwise race the redirect, bouncing
      // the user back through RequireAuth — the "log in twice" bug.
      const { data: sessionData } = await supabase.auth.getSession();
      await applySession(sessionData.session ?? null);
      return { error: null };
    },
    [supabase, applySession],
  );

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const requestPasswordReset = useCallback<AuthContextValue['requestPasswordReset']>(
    async (email) => {
      if (!supabase) return { error: 'Password reset is unavailable: the app is not configured.' };
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) return { error: 'We could not send the reset link. Please try again.' };
      return { error: null };
    },
    [supabase],
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (password) => {
      if (!supabase) return { error: 'Password update is unavailable: the app is not configured.' };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: 'We could not update your password. Please try again.' };
      return { error: null };
    },
    [supabase],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      role,
      memberId,
      client: supabase,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [status, session, role, memberId, supabase, signIn, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
