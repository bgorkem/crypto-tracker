'use client';

import Link from 'next/link';
import { UserAccountMenu } from './UserAccountMenu';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user?: { email: string } | null;
  onLogout?: () => Promise<void>;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo */}
        <Link 
          href={user ? "/dashboard" : "/"}
          className="flex items-center space-x-2 mr-6"
          aria-label="CryptoTracker Home"
        >
          <span className="text-2xl" aria-hidden="true">₿</span>
          <span className="font-bold text-lg">CryptoTracker</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6 flex-1">
          {user && (
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right Side - Auth Buttons or User Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <UserAccountMenu user={user} onLogout={onLogout} />
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
