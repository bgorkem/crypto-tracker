'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAccountMenu } from './UserAccountMenu';

interface HeaderProps {
  user?: {
    email: string;
  } | null;
  onLogout?: () => Promise<void>;
}

export function Header({ user, onLogout }: HeaderProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">₿</span>
            </div>
            <span className="text-xl font-bold">CryptoTracker</span>
          </Link>

          {/* Navigation & User Menu */}
          <div className="flex items-center gap-4">
            {user && !isAuthPage ? (
              <>
                <nav className="hidden md:flex items-center gap-4">
                  <Link 
                    href="/dashboard" 
                    className={`px-3 py-2 rounded-md transition-colors ${
                      pathname === '/dashboard' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    Dashboard
                  </Link>
                </nav>
                <UserAccountMenu user={user} onLogout={onLogout} />
              </>
            ) : !isAuthPage ? (
              <div className="flex items-center gap-2">
                <Link 
                  href="/auth/login" 
                  className="px-4 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                  Get Started
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
