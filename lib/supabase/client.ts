'use client';

type Session = {
  access_token: string;
  refresh_token?: string;
  user: { id: string; email?: string };
};

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SESSION_KEY = 'artist_scout_session';

function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

function setSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function authRequest(path: string, init: RequestInit) {
  const res = await fetch(`${BASE_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.msg ?? 'auth error');
  return data;
}

async function restRequest(path: string, init: RequestInit = {}) {
  const session = getSession();
  const res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${session?.access_token ?? API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'request error');
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const supabaseClient = {
  auth: {
    async signUp(email: string, password: string) {
      return authRequest('/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    },
    async signInWithPassword(email: string, password: string) {
      const data = await authRequest('/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSession(data);
      return data;
    },
    getUser() {
      return getSession()?.user ?? null;
    },
    async signOut() {
      const session = getSession();
      if (session?.access_token) {
        await authRequest('/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
      }
      setSession(null);
    }
  },
  async select(table: string, query = '') {
    return restRequest(`${table}?select=*${query}`);
  },
  async insert(table: string, row: Record<string, unknown>) {
    return restRequest(table, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
  },
  async upsert(table: string, row: Record<string, unknown>, conflictColumn: string) {
    return restRequest(`${table}?on_conflict=${conflictColumn}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(row)
    });
  },
  async update(table: string, row: Record<string, unknown>, query: string) {
    return restRequest(`${table}?${query}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
  }
};
