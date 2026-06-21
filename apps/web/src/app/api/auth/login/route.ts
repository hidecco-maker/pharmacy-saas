import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SessionData, sessionOptions } from '@/lib/session';
import { isAdminCredentials } from '@/lib/auth';
import { systemDb } from '@/lib/system-db';
import { getTenantDb } from '@/lib/tenant-db';

// IPごとのログイン失敗記録（管理者ログイン用）
const adminLoginAttempts = new Map<string, { count: number; blockUntil: number }>();

// テナントIDごとのログイン失敗記録（テナントユーザーログイン用）
const tenantLoginAttempts = new Map<string, { count: number; blockUntil: number }>();

function checkLoginBlock(key: string, store: Map<string, { count: number; blockUntil: number }>): { blocked: boolean; timeLeftMinutes: number } {
  const record = store.get(key);
  if (!record) return { blocked: false, timeLeftMinutes: 0 };

  const now = Date.now();
  if (now < record.blockUntil) {
    return { blocked: true, timeLeftMinutes: Math.ceil((record.blockUntil - now) / 60000) };
  }
  return { blocked: false, timeLeftMinutes: 0 };
}

function recordLoginAttempt(key: string, success: boolean, store: Map<string, { count: number; blockUntil: number }>) {
  const now = Date.now();
  const record = store.get(key) || { count: 0, blockUntil: 0 };

  if (success) {
    store.delete(key);
    return;
  }

  record.count += 1;
  if (record.count >= 5) {
    record.blockUntil = now + 15 * 60 * 1000; // 15分ブロック
  }
  store.set(key, record);
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    const { email, password, tenantId, isAdmin } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    // スーパー管理者ログイン（IPベースのロック）
    if (isAdmin) {
      const adminBlockStatus = checkLoginBlock(ip, adminLoginAttempts);
      if (adminBlockStatus.blocked) {
        return NextResponse.json(
          { error: `ログイン試行回数が上限に達しました。${adminBlockStatus.timeLeftMinutes}分後に再度お試しください。` },
          { status: 429 }
        );
      }
      if (!isAdminCredentials(email, password)) {
        recordLoginAttempt(ip, false, adminLoginAttempts);
        return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
      }
      recordLoginAttempt(ip, true, adminLoginAttempts);
      session.isLoggedIn = true;
      session.isAdmin = true;
      session.userEmail = email;
      session.userName = 'システム管理者';
      session.userRole = 'admin';
      await session.save();
      return NextResponse.json({ isAdmin: true, message: 'ログイン成功' });
    }

    // テナントユーザーログイン
    if (!tenantId) {
      return NextResponse.json({ error: '店舗IDを入力してください' }, { status: 400 });
    }

    // テナントIDベースのロックチェック
    const tenantLockKey = `tenant:${tenantId.trim()}`;
    const tenantBlockStatus = checkLoginBlock(tenantLockKey, tenantLoginAttempts);
    if (tenantBlockStatus.blocked) {
      return NextResponse.json(
        { error: `この店舗のログイン試行回数が上限に達しました。${tenantBlockStatus.timeLeftMinutes}分後に再度お試しください。` },
        { status: 429 }
      );
    }

    // テナントの存在確認（スラッグで検索）
    const tenant = await systemDb.tenant.findFirst({
      where: { slug: tenantId.trim(), isActive: true },
    });

    if (!tenant) {
      recordLoginAttempt(tenantLockKey, false, tenantLoginAttempts);
      return NextResponse.json({ error: '店舗IDが見つかりません' }, { status: 404 });
    }

    // テナントDBでユーザー認証
    const db = getTenantDb(tenant.id);
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      recordLoginAttempt(tenantLockKey, false, tenantLoginAttempts);
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      recordLoginAttempt(tenantLockKey, false, tenantLoginAttempts);
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
    }

    recordLoginAttempt(tenantLockKey, true, tenantLoginAttempts);
    session.isLoggedIn = true;
    session.isAdmin = false;
    session.tenantId = tenant.id;
    session.tenantSlug = tenant.slug;
    session.userId = user.id;
    session.userEmail = user.email;
    session.userName = user.name;
    session.userRole = user.role;
    await session.save();

    return NextResponse.json({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      message: 'ログイン成功',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
