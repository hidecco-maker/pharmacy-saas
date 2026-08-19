'use client';

import Link from 'next/link';

export default function LandingPage() {
  const features = [
    { icon: '📦', title: '在庫管理', desc: '商品在庫のリアルタイム管理。小数・マイナス値にも対応。仕入れ・廃棄・売上を一括管理。' },
    { icon: '📅', title: '来店予測', desc: '周期に基づくカレンダー繰り返し表示。1週間単位で前後スクロール可能。' },
    { icon: '🤖', title: 'LINE BOT連携', desc: 'LINEメッセージで欠品確認・来局登録をスタッフが手軽に操作。' },
    { icon: '🏢', title: 'マルチテナント', desc: '複数店舗・施設を一つのプラットフォームで完全データ分離管理。' },
    { icon: '🔒', title: 'セキュリティ', desc: 'テナントごとに独立したDBでデータ漏洩リスクをゼロに。' },
    { icon: '📊', title: 'ダッシュボード', desc: '在庫不足アラート・不動在庫・来店スケジュールを一覧表示。' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
      color: '#1e293b',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 背景装飾 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* ヘッダー */}
      <header style={{ padding: '1.25rem 2rem', borderBottom: '1px solid #e0f2fe', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}>💊</div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0c4a6e' }}>PharmaSaaS</span>
        </div>
        <Link href="/login" style={{ background: '#0284c7', color: 'white', padding: '0.625rem 1.5rem', borderRadius: '0.75rem', fontWeight: '700', textDecoration: 'none', fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}>
          ログイン
        </Link>
      </header>

      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        {/* ヒーロー */}
        <section style={{ textAlign: 'center', padding: '5rem 2rem 3rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(2,132,199,0.08)', border: '1px solid #bae6fd', borderRadius: '9999px', padding: '0.375rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: '#0369a1', marginBottom: '2rem' }}>
            <span>✨</span><span>薬局・医療機関向け SaaS プラットフォーム</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: '800', lineHeight: 1.2, marginBottom: '1.5rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            薬局・店舗向け<br />クラウド管理システム
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#475569', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            在庫管理・来店予測・LINE BOT連携が一つに。<br />複数店舗を一元管理するマルチテナント対応SaaSプラットフォーム。
          </p>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', padding: '0.875rem 2.25rem', borderRadius: '0.875rem', fontWeight: '700', textDecoration: 'none', fontSize: '1rem', boxShadow: '0 8px 25px rgba(2,132,199,0.35)' }}>
            システムにログイン →
          </Link>
        </section>

        {/* 機能カード */}
        <section style={{ padding: '3rem 2rem 5rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '800', marginBottom: '2.5rem', color: '#0f172a' }}>主な機能</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: '#ffffff', border: '1px solid #e0f2fe', borderRadius: '1rem', padding: '1.75rem', boxShadow: '0 4px 20px rgba(14,165,233,0.05)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid #e0f2fe', color: '#64748b', fontSize: '0.875rem', background: '#ffffff' }}>
        © 2026 PharmaSaaS. All rights reserved.
      </footer>
    </div>
  );
}
