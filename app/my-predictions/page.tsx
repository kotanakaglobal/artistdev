'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

type PredictionRow = {
  id: string;
  artist_name: string;
  artist_link: string;
  score_awarded: number;
  created_at: string;
};

type VoteRow = {
  prediction_id: string;
  vote: boolean;
};

type PredictionWithVotes = PredictionRow & {
  hit_votes: number;
  miss_votes: number;
};

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionWithVotes[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMine = async () => {
      setError('');
      const user = supabaseClient.auth.getUser();
      if (!user) {
        setError('ログインしてください。');
        return;
      }

      try {
        const predictionRows =
          ((await supabaseClient.select('predictions', `&user_id=eq.${user.id}&order=created_at.desc`)) as PredictionRow[] | null) ?? [];

        if (predictionRows.length === 0) {
          setPredictions([]);
          return;
        }

        const predictionIds = predictionRows.map((p: PredictionRow) => p.id);
        let voteRows: VoteRow[] = [];

        try {
          voteRows =
            ((await supabaseClient.select('prediction_votes', `&prediction_id=in.(${predictionIds.join(',')})`)) as VoteRow[] | null) ??
            [];
        } catch (voteError) {
          console.warn('[my-predictions] votes fetch failed. fallback counts(0) will be used.', voteError);
        }

        const voteCountMap = new Map<string, { hit: number; miss: number }>();
        voteRows.forEach((voteRow: VoteRow) => {
          const current = voteCountMap.get(voteRow.prediction_id) ?? { hit: 0, miss: 0 };
          if (voteRow.vote) current.hit += 1;
          else current.miss += 1;
          voteCountMap.set(voteRow.prediction_id, current);
        });

        setPredictions(
          predictionRows.map((prediction: PredictionRow) => ({
            ...prediction,
            hit_votes: voteCountMap.get(prediction.id)?.hit ?? 0,
            miss_votes: voteCountMap.get(prediction.id)?.miss ?? 0
          }))
        );
      } catch (fetchError) {
        console.error('[my-predictions] fetch failed', fetchError);
        setError('投稿一覧の取得に失敗しました。');
      }
    };

    fetchMine();
  }, []);

  return (
    <section className="card stack">
      <h1>自分の投稿一覧</h1>
      {error && <p className="notice error">{error}</p>}
      {predictions.length === 0 ? (
        <p>投稿はまだありません。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>アーティスト</th>
              <th>リンク</th>
              <th>投票サマリー</th>
              <th>ポイント</th>
              <th>投稿日時</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((p: PredictionWithVotes) => (
              <tr key={p.id}>
                <td>{p.artist_name}</td>
                <td>
                  <a href={p.artist_link} target="_blank" rel="noreferrer">
                    {p.artist_link}
                  </a>
                </td>
                <td>
                  👍 {p.hit_votes} / 👎 {p.miss_votes}
                </td>
                <td>{p.score_awarded}</td>
                <td>{new Date(p.created_at).toLocaleString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
