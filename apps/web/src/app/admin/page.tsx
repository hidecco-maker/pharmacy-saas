'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Power,
  Pencil,
  Check,
  X
} from 'lucide-react';

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 新規テナントフォーム
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [industry, setIndustry] = useState('pharmacy');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('店舗管理者');

  // 作成中メッセージ
  const [creationStatus, setCreationStatus] = useState<string | null>(null);

  // 店舗ID編集
  const [editingSlugId, setEditingSlugId] = useState<string | null>(null);
  const [editingSlugValue, setEditingSlugValue] = useState('');
  const [slugEditError, setSlugEditError] = useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // 新規テナント登録（Prisma自動マイグレーション＋初期管理者作成）
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim() || !displayName.trim() || !adminEmail.trim() || !adminPassword.trim()) return;

    // スラッグの検証（英数字とハイフンのみ）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      alert('店舗ID（URL用）は半角英数字とハイフン（-）のみ使用できます。');
      return;
    }

    setActionLoading('create-tenant');
    setCreationStatus('テナントデータベースを構築中。マイグレーションを実行しています（1〜2分かかる場合があります）...');

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          displayName,
          industry,
          adminEmail,
          adminPassword,
          adminName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSlug('');
        setDisplayName('');
        setAdminEmail('');
        setAdminPassword('');
        alert('テナントの追加・初期設定が完了しました！');
        await fetchTenants();
      } else {
        alert(`エラー: ${data.error || 'テナントの構築に失敗しました。'}`);
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。');
    } finally {
      setActionLoading(null);
      setCreationStatus(null);
    }
  };

  // テナントのアクティブトグル（有効・無効切り替え）
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setActionLoading(`toggle-${id}`);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });
      if (res.ok) {
        await fetchTenants();
      } else {
        alert('状態の変更に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // テナントの削除
  const handleDeleteTenant = async (id: string) => {
    if (!confirm('【警告】このテナントを削除すると、この店舗のすべてのデータ（SQLiteデータベースファイル、売上履歴、商品マスタ、顧客台帳など）が完全に消去されます。この操作は取り消せません。本当に削除しますか？')) return;
    setActionLoading(`delete-${id}`);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchTenants();
        alert('テナントが完全に削除されました。');
      } else {
        alert('テナントの削除に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // 店舗ID編集開始
  const startSlugEdit = (tenant: any) => {
    setEditingSlugId(tenant.id);
    setEditingSlugValue(tenant.slug);
    setSlugEditError(null);
  };

  // 店舗ID編集キャンセル
  const cancelSlugEdit = () => {
    setEditingSlugId(null);
    setEditingSlugValue('');
    setSlugEditError(null);
  };

  // 店舗ID保存
  const handleSaveSlug = async (id: string) => {
    const newSlug = editingSlugValue.trim().toLowerCase();

    if (!newSlug) {
      setSlugEditError('店舗IDは必須です。');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      setSlugEditError('半角英数字とハイフン（-）のみ使用できます。');
      return;
    }

    setActionLoading(`slug-${id}`);
    setSlugEditError(null);

    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: newSlug }),
      });
      const data = await res.json();

      if (res.ok) {
        await fetchTenants();
        setEditingSlugId(null);
        setEditingSlugValue('');
      } else {
        setSlugEditError(data.error || '保存に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      setSlugEditError('通信エラーが発生しました。');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-100">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">テナント一覧をロードしています...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* メインレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* テナント一覧 */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              登録店舗（テナント）一覧
            </h2>
            <button
              onClick={fetchTenants}
              className="p-2 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="リロード"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {tenants.map((tenant) => {
              const isToggleLoading = actionLoading === `toggle-${tenant.id}`;
              const isDeleteLoading = actionLoading === `delete-${tenant.id}`;
              const isSlugLoading = actionLoading === `slug-${tenant.id}`;
              const isEditingSlug = editingSlugId === tenant.id;

              return (
                <div
                  key={tenant.id}
                  className={`bg-slate-950/40 border border-slate-855 rounded-xl p-4 flex flex-col gap-3 transition-all ${
                    tenant.isActive ? 'border-slate-850' : 'border-rose-950/40 opacity-70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-slate-150 text-base">{tenant.displayName}</h3>
                        <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                          {tenant.industry === 'pharmacy' ? '薬局・調剤' : 'その他小売'}
                        </span>
                        {tenant.isActive ? (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                            有効
                          </span>
                        ) : (
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold">
                            無効化中
                          </span>
                        )}
                      </div>

                      {/* 店舗IDの表示 / 編集エリア */}
                      <div className="flex items-center gap-2">
                        {isEditingSlug ? (
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 shrink-0">店舗ID:</span>
                              <input
                                type="text"
                                value={editingSlugValue}
                                onChange={(e) => {
                                  setEditingSlugValue(e.target.value.toLowerCase());
                                  setSlugEditError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveSlug(tenant.id);
                                  if (e.key === 'Escape') cancelSlugEdit();
                                }}
                                disabled={isSlugLoading}
                                autoFocus
                                className="flex-1 bg-slate-900 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-indigo-400 min-w-0"
                                placeholder="例: yanagiya-honten"
                              />
                              <button
                                onClick={() => handleSaveSlug(tenant.id)}
                                disabled={isSlugLoading}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                                title="保存"
                              >
                                {isSlugLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={cancelSlugEdit}
                                disabled={isSlugLoading}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                                title="キャンセル"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {slugEditError && (
                              <p className="text-rose-400 text-[10px] pl-12">{slugEditError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">店舗ID:</span>
                            <span className="text-indigo-400 font-mono font-semibold text-xs">{tenant.slug}</span>
                            <button
                              onClick={() => startSlugEdit(tenant)}
                              disabled={!!actionLoading}
                              className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors cursor-pointer"
                              title="店舗IDを編集"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 ml-auto shrink-0">
                          登録日: <span className="text-slate-300">{formatDate(tenant.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* アクションボタン群 */}
                    <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                      {/* 店舗画面へアクセス */}
                      {tenant.isActive && (
                        <a
                          href={`/tenant/${tenant.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          開く
                        </a>
                      )}

                      {/* 有効/無効化スイッチ */}
                      <button
                        onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                        disabled={!!actionLoading}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          tenant.isActive
                            ? 'bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-900/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                        title={tenant.isActive ? '店舗を一時停止（無効化）' : '店舗をアクティブ化（有効化）'}
                      >
                        {isToggleLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>

                      {/* テナント削除 */}
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        disabled={!!actionLoading}
                        className="bg-slate-900 hover:bg-rose-955/40 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-400 p-2 rounded-lg transition-all cursor-pointer"
                        title="店舗の完全削除"
                      >
                        {isDeleteLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* テナント作成フォーム（簡単初期設定） */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-805 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              新規店舗（テナント）追加
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">
              自動でデータベースを分離構築し、初期アカウントを設定します。
            </p>
          </div>

          {creationStatus && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs flex gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
              <span>{creationStatus}</span>
            </div>
          )}

          <form onSubmit={handleCreateTenant} className="space-y-4">
            {/* 基本設定 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">店舗基本情報</h4>
              
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">店舗名（表示名）</label>
                <input
                  type="text"
                  required
                  placeholder="例: 柳屋薬局 本店"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">店舗ID (URL用スラッグ・半角英数/ハイフンのみ)</label>
                <input
                  type="text"
                  required
                  placeholder="例: yanagiya-honten"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">店舗業種</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="pharmacy">薬局・調剤</option>
                  <option value="retail">その他小売</option>
                  <option value="clinic">医療クリニック</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>

            {/* アカウント設定 */}
            <div className="space-y-3 border-t border-slate-850 pt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">初期管理者アカウント</h4>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">管理者名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 柳屋 太郎"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">メールアドレス</label>
                <input
                  type="email"
                  required
                  placeholder="例: admin@yanagiya.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">初期ログインパスワード</label>
                <input
                  type="password"
                  required
                  placeholder="8文字以上推奨"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={!!actionLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!!actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-lg active:scale-98 disabled:opacity-50"
            >
              {actionLoading === 'create-tenant' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              店舗を作成して初期構築
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
