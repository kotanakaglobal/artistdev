'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

type Prediction = {
  id: string;
  user_id: string;
  artist_name: string;
  artist_link: string;
  result_status: 'pending' | 'hit' | 'miss';
  score_awarded: number;
  created_at: string;
};

export default function AdminPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const user = supabaseClient.auth.getUser();
      if (!user) {
        setError('ログインしてください。');
        return;
      }

      const myProfile = await supabaseClient.select('profiles', `&id=eq.${user.id}`);
      if (myProfile?.[0]?.role !== 'admin') {
        setError('管理者のみアクセス可能です。');
        return;
      }

      const data = await supabaseClient.select('predictions', '&order=created_at.desc');
      const userIds = [...new Set((data ?? []).map((p: Prediction) => p.user_id))];
      const profiles = userIds.length ? await supabaseClient.select('profiles', `&id=in.(${userIds.join(',')})`) : [];

      const names: Record<string, string> = {};
      (profiles ?? []).forEach((profile: { id: string; display_name: string }) => {
        names[profile.id] = profile.display_name ?? '名無しユーザー';
      });

      setNameMap(names);
      setPredictions((data as Prediction[]) ?? []);
    } catch {
      setError('データ取得に失敗しました。');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const evaluate = async (prediction: Prediction, resultStatus: 'hit' | 'miss') => {
    if (prediction.result_status !== 'pending') return;
    const score = resultStatus === 'hit' ? 100 : 0;

    try {
      await supabaseClient.update(
        'predictions',
        { result_status: resultStatus, score_awarded: score, evaluated_at: new Date().toISOString() },
        `id=eq.${prediction.id}&result_status=eq.pending`
      );

      if (resultStatus === 'hit') {
        await supabaseClient.insert('point_logs', {
          user_id: prediction.user_id,
          prediction_id: prediction.id,
          points: 100,
          reason_type: 'hit_reward'
        });
      }

      fetchData();
    } catch {
      setError('判定更新に失敗しました。');
    }
  };

  return (
    <section className="card stack">
      <h1>管理画面</h1>
      {error && <p className="notice error">{error}</p>}
      {predictions.map((p) => (
        <div key={p.id} className="card stack">
          <div>投稿者: {nameMap[p.user_id] ?? '名無しユーザー'}</div>
          <div>アーティスト: {p.artist_name}</div>
          <div>リンク: <a href={p.artist_link} target="_blank" rel="noreferrer">{p.artist_link}</a></div>
          <div>投稿日時: {new Date(p.created_at).toLocaleString('ja-JP')}</div>
          <div>判定ステータス: {p.result_status}</div>
          <div>付与ポイント: {p.score_awarded}</div>
          {p.result_status === 'pending' ? (
            <div className="nav">
              <button type="button" onClick={() => evaluate(p, 'hit')}>的中にする (+100)</button>
              <button type="button" className="secondary" onClick={() => evaluate(p, 'miss')}>未的中にする</button>
            </div>
          ) : (
            <p>判定済みです。</p>
          )}
        </div>
      ))}
    </section>
  );
}
