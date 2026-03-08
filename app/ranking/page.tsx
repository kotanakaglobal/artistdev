'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

type Row = { id: string; display_name: string; total_points: number; hit_count: number; created_at: string };

export default function RankingPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const fetchRanking = async () => {
      const profiles = await supabaseClient.select('profiles');
      const predictions = await supabaseClient.select('predictions');

      const stats = new Map<string, { total: number; hits: number }>();
      (predictions ?? []).forEach((p: { user_id: string; score_awarded: number; result_status: string }) => {
        const current = stats.get(p.user_id) ?? { total: 0, hits: 0 };
        current.total += p.score_awarded;
        if (p.result_status === 'hit') current.hits += 1;
        stats.set(p.user_id, current);
      });

      const ranked = (profiles ?? [])
        .map((p: { id: string; display_name: string; created_at: string }) => ({
          id: p.id,
          display_name: p.display_name ?? '名無しユーザー',
          total_points: stats.get(p.id)?.total ?? 0,
          hit_count: stats.get(p.id)?.hits ?? 0,
          created_at: p.created_at
        }))
        .sort((a: Row, b: Row) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points;
          if (b.hit_count !== a.hit_count) return b.hit_count - a.hit_count;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      setRows(ranked);
    };

    fetchRanking();
  }, []);

  return (
    <section className="card stack">
      <h1>発掘者ランキング</h1>
      <table className="table">
        <thead>
          <tr>
            <th>順位</th>
            <th>ユーザー名</th>
            <th>累計ポイント</th>
            <th>的中数</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id}>
              <td>{idx + 1}</td>
              <td>{row.display_name}</td>
              <td>{row.total_points}</td>
              <td>{row.hit_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
