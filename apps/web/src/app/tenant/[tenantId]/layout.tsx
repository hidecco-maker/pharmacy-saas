import { requireAuth } from '@/lib/auth';
import { resolveTenant } from '@/lib/utils';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Calendar,
  Package,
  Users,
  History,
  Settings,
  LogOut,
  Store,
  LayoutDashboard
} from 'lucide-react';
import React from 'react';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantId } = await params;

  // 認証と認可の確認
  const session = await requireAuth(tenantId);

  // テナントの取得
  const tenant = await resolveTenant(tenantId);
  if (!tenant) {
    redirect('/login');
  }

  const navItems = [
    { href: `/tenant/${tenantId}/calendar`, label: 'カレンダー', icon: Calendar },
    { href: `/tenant/${tenantId}/inventory`, label: '在庫・仕入れ管理', icon: Package },
    { href: `/tenant/${tenantId}/customers`, label: '顧客・薬品 管理', icon: Users },
    { href: `/tenant/${tenantId}/sales`, label: '売上・廃棄履歴', icon: History },
    { href: `/tenant/${tenantId}/settings`, label: 'LINE BOT設定', icon: Settings },
    { href: `/tenant/${tenantId}/dashboard`, label: 'ダッシュボード', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-800 flex flex-col md:flex-row relative">
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-sky-200/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[120px]" />
      </div>

      {/* サイドバー */}
      <aside className="w-full md:w-44 bg-white/95 backdrop-blur-md border-r border-sky-100 flex flex-col z-10 shrink-0 shadow-sm">
        {/* 店舗名表示 */}
        <div className="p-3.5 border-b border-sky-100 flex items-center gap-2.5">
          <div className="bg-sky-600 p-2 rounded-xl shadow-md shadow-sky-600/20 shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 tracking-wide text-xs truncate">
              {tenant.displayName}
            </h2>
            <span className="text-[9px] text-sky-600 font-bold uppercase tracking-wider block">
              ポータル
            </span>
          </div>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 px-2.5 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-3 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl text-xs font-semibold transition-all duration-150 group"
              >
                <Icon className="w-4.5 h-4.5 text-sky-500 group-hover:text-sky-600 transition-colors shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 下部メニュー */}
        <div className="p-2.5 border-t border-sky-100">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ログアウト</span>
            </button>
          </form>
        </div>
      </aside>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col z-10 overflow-hidden">
        {/* トップバー */}
        <header className="border-b border-sky-100 bg-white/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">システム正常動作中</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>ログイン中:</span>
            <span className="font-semibold text-slate-600">{session.userName}</span>
            {session.isAdmin && (
              <span className="bg-sky-500/10 text-sky-600 border border-sky-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                管理者
              </span>
            )}
          </div>
        </header>

        {/* ページ個別コンテンツ */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
