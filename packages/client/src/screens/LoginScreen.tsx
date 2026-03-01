import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

type Mode = 'login' | 'signup';

const AVATARS = [
  { slug: 'strawberry-elephant', emoji: '🐘', label: 'Elephant' },
  { slug: 'ballerina-capuchina', emoji: '🩰', label: 'Dancer' },
  { slug: 'disco-panda', emoji: '🐼', label: 'Panda' },
  { slug: 'super-rocket', emoji: '🚀', label: 'Rocket' },
  { slug: 'ninja-turtle', emoji: '🐢', label: 'Turtle' },
  { slug: 'robo-cat', emoji: '🤖', label: 'Robot' },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-4 py-3.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/60 font-medium";

const LoginScreen = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<'PARENT' | 'KID'>('PARENT');
  const { t } = useTranslation();

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/login', {
        email: loginEmail,
        pin: loginPin,
        role,
      });
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/register', {
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        householdName: householdName || `${signupName}'s Household`,
      });
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="login-screen"
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}
    >
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

      <div className="absolute top-4 end-4 z-10">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-4 text-5xl shadow-xl">🏠</div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('appName')}</h1>
          <p className="text-white/70 mt-1 font-medium">{t('login.tagline')}</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl">
          {/* Login / Sign Up tabs */}
          <div className="flex bg-black/20 rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} data-testid={`tab-${m}`} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  mode === m ? 'bg-white text-indigo-600 shadow-md' : 'text-white/70 hover:text-white'
                }`}>
                {m === 'login' ? t('login.tab_login') : t('login.tab_signup')}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <>
              {/* Role switcher */}
              <div className="flex bg-black/20 rounded-2xl p-1 mb-6">
                <button data-testid="role-parent" onClick={() => setRole('PARENT')}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    role === 'PARENT' ? 'bg-white text-indigo-600 shadow-md' : 'text-white/60 hover:text-white'
                  }`}>
                  {t('login.role_parent')}
                </button>
                <button
                  data-testid="role-kid"
                  onClick={() => (window.location.href = '/kid-select')}
                  className="flex-1 py-2 rounded-xl text-sm font-bold transition-all text-white/60 hover:text-white hover:bg-white/10"
                >
                  {t('login.role_kid')}
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <Field label={role === 'PARENT' ? t('login.label_email') : t('login.label_name')}>
                  <input data-testid="input-identifier" type={role === 'PARENT' ? 'email' : 'text'} className={inputCls}
                    value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    placeholder={role === 'PARENT' ? t('login.placeholder_email') : t('login.placeholder_name')} required />
                </Field>
                <Field label={role === 'PARENT' ? t('login.label_password') : t('login.label_pin')}>
                  <input data-testid="input-secret" type="password" className={inputCls}
                    value={loginPin} onChange={e => setLoginPin(e.target.value)}
                    placeholder={role === 'PARENT' ? t('login.placeholder_password') : t('login.placeholder_pin')} />
                </Field>
                {error && <div className="bg-red-500/30 border border-red-400/50 text-white text-sm rounded-xl px-4 py-3">⚠️ {error}</div>}
                <button data-testid="btn-login" type="submit" disabled={loading}
                  className="w-full py-4 mt-2 rounded-2xl font-black text-white text-base transition-all shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }}>
                  {loading ? t('login.btn_entering') : role === 'KID' ? t('login.btn_login_kid') : t('login.btn_login_parent')}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <p className="text-white/60 text-sm mb-2">{t('login.signup_hint')}</p>
              <Field label={t('login.label_display_name')}>
                <input data-testid="signup-name" type="text" className={inputCls} value={signupName}
                  onChange={e => setSignupName(e.target.value)} placeholder={t('login.placeholder_name_parent')} required />
              </Field>
              <Field label={t('login.label_email')}>
                <input data-testid="signup-email" type="email" className={inputCls} value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)} placeholder={t('login.placeholder_email_you')} required />
              </Field>
              <Field label={t('login.label_password')}>
                <input data-testid="signup-password" type="password" className={inputCls} value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)} placeholder={t('login.placeholder_password_min')} required minLength={6} />
              </Field>
              <Field label={t('login.label_household')}>
                <input type="text" className={inputCls} value={householdName}
                  onChange={e => setHouseholdName(e.target.value)} placeholder={t('login.placeholder_household')} />
              </Field>
              {error && <div className="bg-red-500/30 border border-red-400/50 text-white text-sm rounded-xl px-4 py-3">⚠️ {error}</div>}
              <button data-testid="btn-signup" type="submit" disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl font-black text-white text-base transition-all shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#f093fb,#f5576c)' }}>
                {loading ? t('login.btn_creating') : t('login.btn_signup')}
              </button>
            </form>
          )}
        </div>

        {mode === 'login' && (
          <p className="text-center text-white/40 text-xs mt-5">
            {t('login.demo_hint')}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
