'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Settings,
  Loader2,
  Save,
  MessageSquare,
  Copy,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function TenantSettings() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  const router = useRouter();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // フォームステート
  const [lineChannelSecret, setLineChannelSecret] = useState('');
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${tenantId}/settings`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setSettings(data);
      setLineChannelSecret(data.lineChannelSecret || '');
      setLineChannelAccessToken(data.lineChannelAccessToken || '');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/${tenantId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineChannelSecret,
          lineChannelAccessToken,
        }),
      });

      if (res.ok) {
        alert('設定を保存しました。');
        await fetchSettings();
      } else {
        alert('設定の保存に失敗しました。');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Webhook URL の生成
  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}/webhook/${settings?.slug || tenantId}`;
    }
    return `/webhook/${tenantId}`;
  };

  const handleCopyWebhook = async () => {
    const url = getWebhookUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // フォールバック: execCommand を使用
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      // 最終手段: promptでURLを表示
      prompt('以下のURLをコピーしてください:', url);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-700">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">設定情報を読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* タイトル */}
      <div className="flex items-center gap-3 border-b border-sky-100 pb-4">
        <div className="p-2 bg-sky-50 text-sky-500 rounded-xl border border-sky-200">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-700 text-lg">店舗・連携設定</h3>
          <p className="text-xs text-slate-500">LINE BOT連携や店舗基本設定を管理します</p>
        </div>
      </div>

      {/* Webhook URL セクション */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl space-y-4">
        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-500" />
          LINE BOT Webhook URL
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          LINE Developers コンソールの「Webhook URL」に以下のURLを登録してください。これにより、LINEからの在庫照会や来店予測のメッセージがこの店舗のデータベースに紐づいて正しく処理されます。
        </p>

        <div className="flex items-center bg-white border border-sky-100 rounded-xl p-3 gap-3">
          <code className="text-xs text-sky-600 font-mono flex-1 select-all break-all">
            {getWebhookUrl()}
          </code>
          <button
            onClick={handleCopyWebhook}
            className="p-2 hover:bg-sky-50 rounded-lg text-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Webhook URLをコピー"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* LINE 認証設定フォーム */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-xl">
        <h4 className="font-bold text-slate-700 text-sm mb-4 border-b border-slate-805 pb-3">
          LINE Developers 認証情報設定
        </h4>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Channel Secret
              <span className="text-[10px] text-slate-500">(シークレット)</span>
            </label>
            <input
              type="text"
              required
              value={lineChannelSecret}
              onChange={(e) => setLineChannelSecret(e.target.value)}
              placeholder={settings?.hasSecret ? '********' : 'LINE Channel Secret を入力'}
              className="w-full bg-white border border-sky-100 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Channel Access Token
              <span className="text-[10px] text-slate-500">(アクセストークン)</span>
            </label>
            <textarea
              required
              rows={4}
              value={lineChannelAccessToken}
              onChange={(e) => setLineChannelAccessToken(e.target.value)}
              placeholder={settings?.hasToken ? '********' : 'LINE Channel Access Token を入力'}
              className="w-full bg-white border border-sky-100 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="flex items-start bg-indigo-500/5 border border-sky-400/10 p-4 rounded-xl gap-3">
            <HelpCircle className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-1">設定時の注意</span>
              LINE Developers の「Messaging API設定」タブでWebhookの送信を「有効(Enabled)」にしてください。
              また、アクセストークンは失効期限のない「長期(Long-lived)」のものを取得・入力してください。
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-lg shadow-indigo-900/20 active:scale-98 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            設定を保存
          </button>
        </form>
      </div>
    </div>
  );
}
