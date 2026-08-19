'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loginMode, setLoginMode] = useState<'tenant' | 'admin'>('tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          tenantId: loginMode === 'tenant' ? tenantId.trim() : undefined,
          isAdmin: loginMode === 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }
      if (data.isAdmin) {
        router.push('/admin');
      } else {
        router.push(`/tenant/${data.tenantSlug}/calendar`);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#f0f9ff', border: '1px solid #bae6fd',
    borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#1e293b', fontSize: '0.875rem',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#0369a1',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', right: '15%', width: '450px', height: '450px', background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10 }}>
        {/* ロゴ */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem', boxShadow: '0 10px 25px rgba(2,132,199,0.35)' }}>💊</div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.025em' }}>PharmaSaaS</h1>
          <p style={{ color: '#0284c7', fontSize: '0.875rem', marginTop: '0.25rem', fontWeight: '500' }}>店舗・医療機関ポータル</p>
        </div>

        {/* カード */}
        <div style={{ background: '#ffffff', border: '1px solid #e0f2fe', borderRadius: '1.25rem', padding: '2.25rem', boxShadow: '0 20px 40px rgba(14,165,233,0.08), 0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* モード切替 */}
          <div style={{ display: 'flex', background: '#f0f9ff', borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '1.5rem', border: '1px solid #e0f2fe' }}>
            {(['tenant', 'admin'] as const).map((mode) => (
              <button key={mode} onClick={() => setLoginMode(mode)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700', transition: 'all 0.2s', background: loginMode === mode ? '#0284c7' : 'transparent', color: loginMode === mode ? 'white' : '#64748b', boxShadow: loginMode === mode ? '0 2px 8px rgba(2,132,199,0.3)' : 'none' }}>
                {mode === 'tenant' ? '店舗ログイン' : '管理者ログイン'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {loginMode === 'tenant' && (
              <div>
                <label style={labelStyle}>店舗ID（スラッグ）</label>
                <input type="text" required value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="例: yanagiya-pharmacy" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>メールアドレス</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@pharmacy.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>パスワード</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>

            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#e11d48', fontSize: '0.875rem', fontWeight: '500' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', padding: '0.875rem', borderRadius: '0.75rem', border: 'none', fontWeight: '700', fontSize: '0.925rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(2,132,199,0.3)', transition: 'all 0.2s', marginTop: '0.5rem' }}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
