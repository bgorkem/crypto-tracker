'use client';

import { useEffect, useState } from 'react';
import { Header } from './Header';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export function HeaderWrapper() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { email: session.user.email! } : null);
      setIsLoading(false);
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

  // Don't render until we know the auth state to prevent flash
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <span className="text-2xl" aria-hidden="true">₿</span>
          <span className="font-bold text-lg ml-2">CryptoTracker</span>
        </div>
      </header>
    );
  }

  return <Header user={user} onLogout={handleLogout} />;
}
