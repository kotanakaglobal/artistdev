'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function SubmitPage() {
  const [artistName, setArtistName] = useState('');
  const [artistLink, setArtistLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const user = supabaseClient.auth.getUser();

    if (!user) {
      setError('投稿にはログインが必要です。');
      return;
    }

    try {
      await supabaseClient.insert('predictions', {
        user_id: user.id,
        artist_name: artistName,
        artist_link: artistLink,
        result_status: 'pending',
        score_awarded: 0,
        evaluation_rule_version: 'v1'
      });
      setArtistName('');
      setArtistLink('');
      setMessage('投稿を保存しました。');
    } catch {
      setError('投稿に失敗しました。');
    }
  };

  return (
    <section className="card stack">
      <h1>アーティスト投稿</h1>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          アーティスト名（必須）
          <input className="input" value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
        </label>
        <label>
          リンク（必須）
          <input className="input" type="url" value={artistLink} onChange={(e) => setArtistLink(e.target.value)} required />
        </label>
        <button type="submit">投稿する</button>
      </form>
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
    </section>
  );
}
