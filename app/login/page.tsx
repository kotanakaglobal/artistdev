'use client';

import { FormEvent, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await supabaseClient.auth.signInWithPassword(email, password);
      window.location.href = '/';
    } catch {
      setError('ログインに失敗しました。未登録の場合は新規登録を押してください。');
    }
  }

  async function signUp() {
    setError('');
    setMessage('');
    try {
      await supabaseClient.auth.signUp(email, password);
      setMessage('登録完了。メール確認が必要な場合は受信メールをご確認ください。');
    } catch {
      setError('新規登録に失敗しました。');
    }
  }

  return (
    <section className="card stack">
      <h1>メールログイン</h1>
      <form onSubmit={signIn} className="stack">
        <label>
          メールアドレス
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          パスワード
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <div className="nav">
          <button type="submit">ログイン</button>
          <button type="button" className="secondary" onClick={signUp}>新規登録</button>
        </div>
      </form>
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
    </section>
  );
}
