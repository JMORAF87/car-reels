'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (urlError) setMessage({ type: 'error', text: urlError });
  }, [urlError]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sign in failed. Check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-2xl font-bold text-white">Car Reels Creator</h1>
          <p className="text-zinc-400 text-sm mt-1">AI-powered dealership reels</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#26C4A2] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#26C4A2] transition-colors"
              />
            </div>

            {message && (
              <div className={`text-sm px-3 py-2.5 rounded-lg ${
                message.type === 'error'
                  ? 'bg-red-950 border border-red-800 text-red-300'
                  : 'bg-green-950 border border-green-800 text-green-300'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#26C4A2] hover:bg-[#1CAF8F] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-zinc-600 text-xs mt-5">
            Access is by invitation only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
