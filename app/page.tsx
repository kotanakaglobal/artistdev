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
  const [message, setMessage] = useState('');
  const [votingPredictionId, setVotingPredictionId] = useState<string | null>(null);

  const fetchRecent = async () => {
    setError('');
    const user = supabaseClient.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    try {
      const predictionRows =
        ((await supabaseClient.select('predictions', '&order=created_at.desc&limit=10')) as PredictionRow[] | null) ?? [];
      console.log('[home] predictions fetch result', predictionRows);

      if (predictionRows.length === 0) {
        setPredictions([]);
        return;
      }

      const userIds = [...new Set(predictionRows.map((item: PredictionRow) => item.user_id))];
      const predictionIds = [...new Set(predictionRows.map((item: PredictionRow) => item.id))];

      let profiles: Profile[] = [];
      try {
        profiles =
          userIds.length > 0
            ? (((await supabaseClient.select('profiles', `&id=in.(${userIds.join(',')})`)) as Profile[] | null) ?? [])
            : [];
        console.log('[home] profiles fetch result', profiles);
      } catch (profileError) {
        console.warn('[home] profiles fetch failed. fallback name will be used.', profileError);
      }

      let votes: VoteRow[] = [];
      try {
        votes =
          predictionIds.length > 0
            ? (((await supabaseClient.select('prediction_votes', `&prediction_id=in.(${predictionIds.join(',')})`)) as VoteRow[] | null) ??
              [])
            : [];
      } catch (voteError) {
        console.warn('[home] votes fetch failed. fallback counts(0) will be used.', voteError);
      }

      const nameMap = new Map(
        (profiles ?? []).map((profile: Profile) => [profile.id, profile.display_name ?? '名無しユーザー'])
      );

      const voteCountMap = new Map<string, { hit: number; miss: number }>();
      votes.forEach((voteRow: VoteRow) => {
        const current = voteCountMap.get(voteRow.prediction_id) ?? { hit: 0, miss: 0 };
        if (voteRow.vote) current.hit += 1;
        else current.miss += 1;
        voteCountMap.set(voteRow.prediction_id, current);
      });

      setPredictions(
        predictionRows.map((item: PredictionRow) => ({
          ...item,
          display_name: nameMap.get(item.user_id) ?? '名無しユーザー',
          hit_votes: voteCountMap.get(item.id)?.hit ?? 0,
          miss_votes: voteCountMap.get(item.id)?.miss ?? 0
        }))
      );
    } catch (fetchError) {
      console.error('[home] predictions fetch failed', fetchError);
      setError('最近投稿の読み込みに失敗しました。');
      setPredictions([]);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const votePrediction = async (predictionId: string, vote: boolean) => {
    if (votingPredictionId) return;

    setError('');
    setMessage('');

    const user = supabaseClient.auth.getUser();
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    setVotingPredictionId(predictionId);
    try {
      const existingVote = (await supabaseClient.select(
        'prediction_votes',
        `&prediction_id=eq.${predictionId}&user_id=eq.${user.id}&limit=1`
      )) as VoteRow[] | null;

      if ((existingVote ?? []).length > 0) {
        setMessage('すでに投票済みです。');
        return;
      }

      const inserted = await supabaseClient.insert('prediction_votes', {
        prediction_id: predictionId,
        user_id: user.id,
        vote
      });
      console.log('[vote] inserted new vote', inserted);

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
    } catch (voteError) {
      console.error('[vote] vote insert failed', voteError);
      const errorMessage = voteError instanceof Error ? voteError.message : '';
      if (errorMessage.includes('duplicate key value') || errorMessage.includes('prediction_votes_prediction_id_user_id_key')) {
        setMessage('すでに投票済みです。');
        return;
      }
      setError('投票に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setVotingPredictionId(null);
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
        {message && <p className="notice success">{message}</p>}
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
                        <button
                          type="button"
                          onClick={() => votePrediction(p.id, true)}
                          disabled={votingPredictionId === p.id}
                        >
                          {votingPredictionId === p.id ? '送信中...' : '👍 バズった'}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => votePrediction(p.id, false)}
                          disabled={votingPredictionId === p.id}
                        >
                          {votingPredictionId === p.id ? '送信中...' : '👎 バズってない'}
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
