'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

type Prediction = {
  id: string;
  artist_name: string;
  artist_link: string;
  result_status: string;
  score_awarded: number;
  created_at: string;
};

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMine = async () => {
      const user = supabaseClient.auth.getUser();
      if (!user) {
        setError('ログインしてください。');
        return;
      }
      const data = await supabaseClient.select('predictions', `&user_id=eq.${user.id}&order=created_at.desc`);
      setPredictions(data ?? []);
    };

    fetchMine();
  }, []);

  return (
    <section className="card stack">
      <h1>自分の投稿一覧</h1>
      {error && <p className="notice error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>アーティスト</th>
            <th>リンク</th>
            <th>状態</th>
            <th>ポイント</th>
            <th>投稿日時</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p.id}>
              <td>{p.artist_name}</td>
              <td><a href={p.artist_link} target="_blank" rel="noreferrer">{p.artist_link}</a></td>
              <td>{p.result_status}</td>
              <td>{p.score_awarded}</td>
              <td>{new Date(p.created_at).toLocaleString('ja-JP')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
