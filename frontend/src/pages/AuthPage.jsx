import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TABS = ['login', 'register'];

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState(1); // 1: form, 2: otp
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Login form
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register form
  const [regForm, setRegForm] = useState({ username: '', password: '', mobile: '', avatar: null });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const navigate = useNavigate();
  const { login, setUser } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(loginForm.username, loginForm.password);
    setLoading(false);
    if (result.success) { toast.success('Welcome back!'); navigate('/'); }
    else toast.error(result.error);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRegForm(f => ({ ...f, avatar: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!regForm.username || !regForm.password || !regForm.mobile) {
      return toast.error('All fields are required');
    }
    if (!/^\+?[1-9]\d{9,14}$/.test(regForm.mobile.replace(/\s/g, ''))) {
      return toast.error('Enter a valid mobile number');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', {
        username: regForm.username,
        password: regForm.password,
        mobile: regForm.mobile,
      });
      setDevOtp(res.data.devOtp || '');
      toast.success('OTP sent to your mobile number!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (!val && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpStr = otp.join('');
    if (otpStr.length < 6) return toast.error('Enter complete OTP');
    setLoading(true);
    try {
      let avatarUrl = null;
      if (regForm.avatar) {
        const fd = new FormData();
        fd.append('avatar', regForm.avatar);
        const uploadRes = await api.post('/upload/avatar', fd);
        avatarUrl = uploadRes.data.url;
      }
      const res = await api.post('/auth/verify-otp', {
        mobile: regForm.mobile,
        otp: otpStr,
        avatar: avatarUrl,
      });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      toast.success('Account created! Welcome 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  const pasteOtp = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 6).split('');
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden px-4">
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary-700 opacity-[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-cyan opacity-[0.05] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500 mb-4 shadow-lg shadow-primary-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" opacity="0.9"/>
              <circle cx="8" cy="11" r="1" fill="#4F6EF7"/>
              <circle cx="12" cy="11" r="1" fill="#4F6EF7"/>
              <circle cx="16" cy="11" r="1" fill="#4F6EF7"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pulse</h1>
          <p className="text-sm text-white/40 mt-1">Real-time messaging, reimagined</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/50">
          {/* Tabs */}
          <div className="flex bg-surface-200 rounded-xl p-1 mb-8">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setStep(1); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-600 transition-all duration-200 capitalize ${
                  tab === t ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-600 text-white/50 uppercase tracking-wider mb-2 block">Username</label>
                <input
                  className="input-field"
                  placeholder="Enter your username"
                  value={loginForm.username}
                  onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-xs font-600 text-white/50 uppercase tracking-wider mb-2 block">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-600 transition-all duration-200 mt-2 disabled:opacity-50 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* REGISTER - Step 1: Form */}
          {tab === 'register' && step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3 mb-2">
                <label className="cursor-pointer group">
                  <div className={`w-20 h-20 rounded-2xl border-2 border-dashed border-primary-500/40 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary-500 bg-surface-200 ${avatarPreview ? 'border-solid border-primary-500' : ''}`}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-[10px] text-white/30">Upload</div>
                        </div>
                    }
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <span className="text-xs text-white/30">Profile photo (optional)</span>
              </div>

              <div>
                <label className="text-xs font-600 text-white/50 uppercase tracking-wider mb-2 block">Username</label>
                <input
                  className="input-field"
                  placeholder="Choose a unique username"
                  value={regForm.username}
                  onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="text-xs font-600 text-white/50 uppercase tracking-wider mb-2 block">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Create a strong password"
                  value={regForm.password}
                  onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-xs font-600 text-white/50 uppercase tracking-wider mb-2 block">Mobile Number</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+91 99999 99999"
                  value={regForm.mobile}
                  onChange={e => setRegForm(f => ({ ...f, mobile: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-600 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? 'Sending OTP…' : 'Send OTP →'}
              </button>
            </form>
          )}

          {/* REGISTER - Step 2: OTP */}
          {tab === 'register' && step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📲</div>
                <h3 className="text-white font-600 text-lg">Verify Your Number</h3>
                <p className="text-white/40 text-sm mt-1">
                  OTP sent to <span className="text-primary-400">{regForm.mobile}</span>
                </p>
                {devOtp && (
                  <div className="mt-3 px-4 py-2 bg-accent-green/10 border border-accent-green/20 rounded-xl">
                    <span className="text-xs text-accent-green font-mono">Dev OTP: {devOtp}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => (otpRefs.current[i] = el)}
                    className="otp-input"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={e => { e.preventDefault(); pasteOtp(e.clipboardData.getData('text')); }}
                    inputMode="numeric"
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-600 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary-500/25"
              >
                {loading ? 'Verifying…' : 'Verify & Create Account'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button onClick={() => setStep(1)} className="text-white/30 hover:text-white/60 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleSendOtp}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          End-to-end encrypted · Built with ❤️
        </p>
      </div>
    </div>
  );
}
