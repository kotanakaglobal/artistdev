'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

type Prediction = {
  id: string;
  artist_name: string;
  artist_link: string;
  result_status: string;
  created_at: string;
  user_id: string;
  display_name: string;
  hit_votes: number;
  miss_votes: number;
};

type PredictionRow = Omit<Prediction, 'display_name' | 'hit_votes' | 'miss_votes'>;

type Profile = {
  id: string;
  display_name: string | null;
};

type VoteRow = {
  id: string;
  prediction_id: string;
  user_id: string;
  vote: boolean;
};

export default function HomePage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchRecent = async () => {
    const user = supabaseClient.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const data = (await supabaseClient.select('predictions', '&order=created_at.desc&limit=10')) as PredictionRow[] | null;
    const userIds = [...new Set((data ?? []).map((item: PredictionRow) => item.user_id))];
    const predictionIds = [...new Set((data ?? []).map((item: PredictionRow) => item.id))];

    const profiles = userIds.length
      ? ((await supabaseClient.select('profiles', `&id=in.(${userIds.join(',')})`)) as Profile[] | null)
      : [];

    const votes = predictionIds.length
      ? ((await supabaseClient.select('prediction_votes', `&prediction_id=in.(${predictionIds.join(',')})`)) as VoteRow[] | null)
      : [];

    const nameMap = new Map((profiles ?? []).map((profile: Profile) => [profile.id, profile.display_name ?? '名無しユーザー']));

    const voteCountMap = new Map<string, { hit: number; miss: number }>();
    (votes ?? []).forEach((voteRow: VoteRow) => {
      const current = voteCountMap.get(voteRow.prediction_id) ?? { hit: 0, miss: 0 };
      if (voteRow.vote) {
        current.hit += 1;
      } else {
        current.miss += 1;
      }
      voteCountMap.set(voteRow.prediction_id, current);
    });

    setPredictions(
      (data ?? []).map((item: PredictionRow) => ({
        ...item,
        display_name: nameMap.get(item.user_id) ?? '名無しユーザー',
        hit_votes: voteCountMap.get(item.id)?.hit ?? 0,
        miss_votes: voteCountMap.get(item.id)?.miss ?? 0
      }))
    );
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const votePrediction = async (predictionId: string, vote: boolean) => {
    setError('');
    const user = supabaseClient.auth.getUser();

    if (!user) {
      setError('投票するにはログインしてください。');
      return;
    }

    try {
      await supabaseClient.upsert(
        'prediction_votes',
        {
          prediction_id: predictionId,
          user_id: user.id,
          vote
        },
        'prediction_id,user_id'
      );

      const votes = (await supabaseClient.select('prediction_votes', `&prediction_id=eq.${predictionId}`)) as VoteRow[] | null;
      const hitCount = (votes ?? []).filter((v: VoteRow) => v.vote).length;

      await supabaseClient.update(
        'predictions',
        {
          result_status: hitCount >= 10 ? 'hit' : 'pending'
        },
        `id=eq.${predictionId}`
      );

      await fetchRecent();
    } catch {
      setError('投票に失敗しました。時間をおいて再度お試しください。');
    }
  };

  return (
    <section className="stack">
      <div className="card stack">
        <h1>Coming Artist Prediction</h1>
        <p>これからバズりそうな音楽アーティストを投稿し、みんなで的中判定して発掘者ランキングを競うサービスです。</p>
        <div className="nav">
          <Link href="/submit">投稿する</Link>
          <Link href="/ranking">ランキングを見る</Link>
          <Link href="/login">ログイン</Link>
        </div>
      </div>

      <div className="card stack">
        <h2>最近の投稿</h2>
        {error && <p className="notice error">{error}</p>}
        {predictions.length === 0 ? (
          <p>まだ投稿がありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>投稿者</th>
                <th>アーティスト</th>
                <th>リンク</th>
                <th>投票サマリー</th>
                <th>投票</th>
                <th>投稿日時</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p: Prediction) => (
                <tr key={p.id}>
                  <td>{p.display_name}</td>
                  <td>{p.artist_name}</td>
                  <td>
                    <a href={p.artist_link} target="_blank" rel="noreferrer">
                      {p.artist_link}
                    </a>
                  </td>
                  <td>
                    👍 {p.hit_votes} / 👎 {p.miss_votes}
                  </td>
                  <td>
                    {currentUserId ? (
                      <div className="nav">
                        <button type="button" onClick={() => votePrediction(p.id, true)}>
                          👍 バズった
                        </button>
                        <button type="button" className="secondary" onClick={() => votePrediction(p.id, false)}>
                          👎 バズってない
                        </button>
                      </div>
                    ) : (
                      <span>ログインで投票可能</span>
                    )}
                  </td>
                  <td>{new Date(p.created_at).toLocaleString('ja-JP')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
