import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const inputCls = "w-full px-4 py-3.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/60 font-medium";

const InviteJoinScreen = () => {
  const [params] = useSearchParams();
  const code = params.get('code') || '';
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [householdName, setHouseholdName] = useState('');
  const [validating, setValidating] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) { setInviteError('No invite code found in link.'); setValidating(false); return; }
    apiClient.get(`/invite/${code}`)
      .then((d: any) => { setHouseholdName(d.householdName); setValidating(false); })
      .catch((e: any) => { setInviteError(e.message || 'Invalid invite'); setValidating(false); });
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/join', { name, email, password, inviteToken: code });
      setAuth(data.user, data.token);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="invite-join-screen"
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4 text-5xl shadow-xl">🏠</div>
          <h1 className="text-4xl font-black text-white">HouseDuty Heroes</h1>
          <p className="text-white/70 mt-1 font-medium">You've been invited!</p>
        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30">
          {validating && (
            <p className="text-white text-center">Validating invite…</p>
          )}

          {!validating && inviteError && (
            <div className="text-center">
              <p className="text-4xl mb-4">❌</p>
              <p className="text-white font-bold text-lg">{inviteError}</p>
              <button onClick={() => navigate('/')} className="mt-6 text-white/70 hover:text-white underline text-sm">
                Back to home
              </button>
            </div>
          )}

          {!validating && !inviteError && (
            <>
              <div className="bg-white/20 rounded-2xl p-4 mb-6 text-center">
                <p className="text-white/70 text-sm">Joining household</p>
                <p data-testid="join-household-name" className="text-white text-xl font-black mt-1">🏡 {householdName}</p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Your Name</label>
                  <input data-testid="join-name" type="text" className={inputCls} value={name}
                    onChange={e => setName(e.target.value)} placeholder="E.g. Dad" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Email</label>
                  <input data-testid="join-email" type="email" className={inputCls} value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">Password</label>
                  <input data-testid="join-password" type="password" className={inputCls} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="min 6 characters" required minLength={6} />
                </div>
                {error && (
                  <div className="bg-red-500/30 border border-red-400/50 text-white text-sm rounded-xl px-4 py-3">
                    ⚠️ {error}
                  </div>
                )}
                <button data-testid="btn-join" type="submit" disabled={loading}
                  className="w-full py-4 mt-2 rounded-2xl font-black text-white text-base transition-all shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }}>
                  {loading ? '✨ Joining…' : '🚀 Join Household'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteJoinScreen;
