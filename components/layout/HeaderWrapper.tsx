'use client';

import { useEffect, useState } from 'react';
import { Header } from './Header';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

interface HeaderWrapperProps {
  initialUser?: { email: string } | null;
}

export function HeaderWrapper({ initialUser }: HeaderWrapperProps) {
  const [user, setUser] = useState<{ email: string } | null>(initialUser || null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email! } : null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return <Header user={user} onLogout={handleLogout} />;
}
