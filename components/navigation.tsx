'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const user = supabaseClient.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        const profiles = await supabaseClient.select('profiles', `&id=eq.${user.id}`);
        setIsAdmin(profiles?.[0]?.role === 'admin');
      }
    };
    bootstrap();
  }, []);

  return (
    <nav className="nav card" style={{ marginBottom: 16 }}>
      <Link href="/">トップ</Link>
      <Link href="/submit">投稿</Link>
      <Link href="/my-predictions">自分の投稿</Link>
      <Link href="/ranking">ランキング</Link>
      {isLoggedIn && <Link href="/settings">プロフィール設定</Link>}
      {isAdmin && <Link href="/admin">管理</Link>}
      {!isLoggedIn ? (
        <Link href="/login">ログイン</Link>
      ) : (
        <button
          className="secondary"
          type="button"
          onClick={async () => {
            await supabaseClient.auth.signOut();
            window.location.href = '/';
          }}
        >
          ログアウト
        </button>
      )}
    </nav>
  );
}
