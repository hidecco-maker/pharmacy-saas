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
      <aside className="w-full md:w-52 bg-white/95 backdrop-blur-md border-r border-sky-100 flex flex-col z-10 shrink-0 shadow-sm">
        {/* 店舗名表示 */}
        <div className="p-4 border-b border-sky-100 flex items-center gap-3">
          <div className="bg-sky-600 p-2.5 rounded-2xl shadow-md shadow-sky-600/20 shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-slate-800 tracking-wide text-xs sm:text-sm truncate">
              {tenant.displayName}
            </h2>
            <span className="text-[10px] text-sky-600 font-bold uppercase tracking-wider block mt-0.5">
              店舗ポータル
            </span>
          </div>
        </div>

        {/* ナビゲーションメニュー（6つの大きなボタン） */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3.5 bg-sky-50/60 hover:bg-sky-100/70 border border-sky-100/80 hover:border-sky-300 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 hover:text-sky-800 shadow-sm hover:shadow transition-all duration-150 group active:scale-[0.98]"
              >
                <div className="p-1.5 bg-white rounded-xl border border-sky-100 group-hover:border-sky-300 shadow-2xs shrink-0">
                  <Icon className="w-5 h-5 text-sky-500 group-hover:text-sky-600 transition-colors" />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 下部メニュー */}
        <div className="p-3 border-t border-sky-100">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 p-3 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/60 hover:border-rose-300 text-rose-600 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.98]"
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
