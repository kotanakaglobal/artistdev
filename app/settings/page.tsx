'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = supabaseClient.auth.getUser();
      if (!user) {
        setError('ログインしてください。');
        return;
      }

      const profiles = await supabaseClient.select('profiles', `&id=eq.${user.id}`);
      setDisplayName(profiles?.[0]?.display_name ?? '');
    };

    fetchProfile();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const user = supabaseClient.auth.getUser();
    if (!user) {
      setError('ログインしてください。');
      return;
    }

    try {
      await supabaseClient.update('profiles', { display_name: displayName.trim() }, `id=eq.${user.id}`);
      setMessage('表示名を更新しました。');
    } catch {
      setError('表示名の更新に失敗しました。');
    }
  };

  return (
    <section className="card stack">
      <h1>プロフィール設定</h1>
      <p>投稿者名として表示する表示名を変更できます。</p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          表示名
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        </label>
        <button type="submit">保存する</button>
      </form>
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
    </section>
  );
}
