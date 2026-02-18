/**
 * 認証コンテキスト
 *
 * アプリ全体で認証状態を共有します。
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    // プロフィールを取得（なければ自動作成）
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          // プロフィールが存在しない場合、auth.usersのメタデータから作成
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const name = authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'ユーザー';

          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              name: name,
            }, { onConflict: 'id' })
            .select()
            .single();

          if (isMounted) {
            setProfile(newProfile);
          }
          return;
        }

        if (isMounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    // 現在のセッションを取得（リトライ付き）
    const getSession = async (): Promise<void> => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (isMounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to get session:', error);

        // リトライ
        if (retryCount < maxRetries && isMounted) {
          retryCount++;
          console.log(`Retrying session check (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return getSession();
        }

        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (isMounted) {
          setUser(session?.user ?? null);
          setLoading(false);

          if (session?.user) {
            fetchProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // サインアップ
  const signUp = async (email: string, password: string, name: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    // プロフィールテーブルにも挿入
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: name,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
      }
    }

    return { error: null };
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // エラーメッセージを日本語化
      let errorMessage = error.message;
      if (error.message.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスが確認されていません。サインアップ時に届いたメール内のリンクをクリックしてください。';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'リクエストが多すぎます。しばらく待ってから再度お試しください。';
      }
      return { error: errorMessage };
    }

    return { error: null };
  };

  // サインアウト
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // プロフィール更新
  const updateProfile = async (name: string) => {
    if (!user) return { error: 'ログインしていません' };

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }

    setProfile(prev => prev ? { ...prev, name } : null);
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile }}>
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
