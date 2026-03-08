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
};

export default function HomePage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      const data = await supabaseClient.select('predictions', '&order=created_at.desc&limit=10');
      const userIds = [...new Set((data ?? []).map((item) => item.user_id))];
      const profiles = userIds.length
        ? await supabaseClient.select('profiles', `&id=in.(${userIds.join(',')})`)
        : [];
      const nameMap = new Map((profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name ?? '名無しユーザー']));

      setPredictions(
        (data ?? []).map((item: Omit<Prediction, 'display_name'>) => ({
          ...item,
          display_name: nameMap.get(item.user_id) ?? '名無しユーザー'
        }))
      );
    };

    fetchRecent();
  }, []);

  return (
    <section className="stack">
      <div className="card stack">
        <h1>Artist Scout MVP</h1>
        <p>これから来そうな音楽アーティストを記録し、後から的中判定して発掘者ランキングを競うサービスです。</p>
        <div className="nav">
          <Link href="/submit">投稿する</Link>
          <Link href="/ranking">ランキングを見る</Link>
          <Link href="/login">ログイン</Link>
        </div>
      </div>

      <div className="card stack">
        <h2>最近の投稿</h2>
        {predictions.length === 0 ? (
          <p>まだ投稿がありません。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>投稿者</th>
                <th>アーティスト</th>
                <th>リンク</th>
                <th>ステータス</th>
                <th>投稿日時</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.id}>
                  <td>{p.display_name}</td>
                  <td>{p.artist_name}</td>
                  <td><a href={p.artist_link} target="_blank" rel="noreferrer">{p.artist_link}</a></td>
                  <td>{p.result_status}</td>
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
