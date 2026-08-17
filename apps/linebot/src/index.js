require('dotenv').config();
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { middleware, messagingApi } = require('@line/bot-sdk');
const { handleStockMessage } = require('./lib/stock');
const { handleCalendarMessage } = require('./lib/calendar');
const { isWhitelisted, addToWhitelist, removeFromWhitelist, ensureWhitelistTable } = require('./lib/whitelist');
const { registerScheduler, unregisterScheduler, initScheduler, registerWeeklyScheduler, unregisterWeeklyScheduler } = require('./lib/scheduler');

const app = express();
const PORT = process.env.PORT || 3005;
const dataRoot = process.env.DATA_ROOT || '/data';

// System DB 接続
const systemDbPath = process.env.SYSTEM_DATABASE_URL
  ? process.env.SYSTEM_DATABASE_URL.replace('file:', '')
  : path.join(dataRoot, 'system', 'tenants.db');

console.log(`[起動] System DB パス: ${systemDbPath}`);

let systemDb;
try {
  systemDb = new Database(systemDbPath, { fileMustExist: false });
} catch (err) {
  console.error('[LINE BOT ERROR] Failed to connect to System DB:', err);
}

// ============================================================
// 認証セッション管理（メモリ内）
// 認証フロー（Webポータルと同じ店舗slug + email + パスワードで認証）:
//   step 1: ユーザーが店舗slug を送信
//   step 2: ユーザーがメールアドレスを送信
//   step 3: ユーザーがパスワードを送信 → bcrypt照合 → ホワイトリスト追加
//
// セッションキー: `${tenant.id}:${lineUserId}`
// セッション構造:
//   { step: 'awaiting_email', tenantId: string, tenantSlug: string, expireAt: number }
//   { step: 'awaiting_password', tenantId: string, email: string, expireAt: number }
// ============================================================
const authSessions = new Map();

// セッション有効期間（5分）
const SESSION_TTL_MS = 5 * 60 * 1000;

// テナント解決関数（System DB から id または slug で検索）
function resolveTenantBySlug(slug) {
  if (!systemDb) return null;
  try {
    return systemDb.prepare(
      `SELECT * FROM "Tenant" WHERE slug = ? AND isActive = 1`
    ).get(slug);
  } catch (err) {
    console.error(`[LINE BOT ERROR] Failed to resolve tenant by slug "${slug}":`, err);
    return null;
  }
}

// テナント解決関数（id or slug 両対応 - Webhook認証用）
function resolveTenant(tenantId) {
  if (!systemDb) return null;
  try {
    return systemDb.prepare(
      `SELECT * FROM "Tenant" WHERE (id = ? OR slug = ?) AND isActive = 1`
    ).get(tenantId, tenantId);
  } catch (err) {
    console.error(`[LINE BOT ERROR] Failed to resolve tenant ${tenantId}:`, err);
    return null;
  }
}

// テナントDBを取得する（better-sqlite3で直接接続）
function getTenantDb(tenantId) {
  const dbPath = path.join(dataRoot, 'tenants', tenantId, 'dev.db');
  const db = new Database(dbPath, { fileMustExist: false });
  // ホワイトリストテーブルを確実に作成
  ensureWhitelistTable(db);
  return db;
}

// テナントDBのUserテーブルからユーザーを検索する（better-sqlite3使用）
function findUserByEmail(tenantId, email) {
  try {
    const dbPath = path.join(dataRoot, 'tenants', tenantId, 'dev.db');
    const db = new Database(dbPath, { fileMustExist: false });
    const user = db.prepare(`SELECT id, email, name, password, role FROM "User" WHERE email = ?`).get(email);
    db.close();
    return user || null;
  } catch (err) {
    console.error(`[LINE BOT ERROR] Failed to find user by email for tenant ${tenantId}:`, err);
    return null;
  }
}

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  try {
    if (!systemDb) throw new Error('System DB is not connected');
    systemDb.prepare('SELECT 1').get();
    res.json({ status: 'healthy', systemDb: 'connected' });
  } catch (err) {
    console.error('[LINE BOT HEALTH CHECK ERROR]:', err);
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('PharmaSaaS LINE Bot Gateway is running.');
});

// LINE Webhook Endpoint (マルチテナント動的ルーティング)
app.post('/webhook/:tenantId', async (req, res, next) => {
  const { tenantId } = req.params;
  const tenant = resolveTenant(tenantId);

  if (!tenant) {
    console.warn(`[Webhook Warning] Tenant ${tenantId} not found or inactive.`);
    return res.status(404).send('Tenant not found');
  }

  if (!tenant.lineChannelSecret || !tenant.lineChannelAccessToken) {
    console.warn(`[Webhook Warning] Tenant ${tenant.slug} has no LINE Configuration.`);
    return res.status(400).send('LINE not configured');
  }

  const lineConfig = {
    channelSecret: tenant.lineChannelSecret,
    channelAccessToken: tenant.lineChannelAccessToken
  };

  const lineMiddleware = middleware(lineConfig);

  lineMiddleware(req, res, (err) => {
    if (err) {
      console.error(`[LINE BOT ERROR] Signature validation failed for tenant: ${tenant.slug}`, err);
      return res.status(401).send('Signature validation failed');
    }

    const client = new messagingApi.MessagingApiClient({
      channelAccessToken: tenant.lineChannelAccessToken
    });

    Promise.all(req.body.events.map(event => handleEvent(event, tenant, client)))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error(`[LINE BOT ERROR] Error handling events for tenant ${tenant.slug}:`, err);
        res.status(200).json({ success: false, error: err.message });
      });
  });
});

// 送信再試行機能
async function replyMessageWithRetry(client, replyToken, replyMessage, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      await client.replyMessage({
        replyToken: replyToken,
        messages: [replyMessage]
      });
      return;
    } catch (error) {
      console.error(`[LINE BOT ERROR] Attempt ${attempt} failed to send reply:`, error);
      if (attempt > retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// LINEイベントハンドラ
async function handleEvent(event, tenant, client) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const lineUserId = event.source.userId;
  // グループ/ルームの場合はgroupId/roomIdを定期送信の宛先として使用する
  const schedulerTargetId =
    event.source.type === 'group' ? event.source.groupId
    : event.source.type === 'room' ? event.source.roomId
    : event.source.userId;
  const userText = event.message.text.trim();
  const sessionKey = `${tenant.id}:${lineUserId}`;
  let replyMessage = null;

  try {
    const tenantDb = getTenantDb(tenant.id);

    // ================================================================
    // 認証セッション処理
    // ================================================================
    const session = authSessions.get(sessionKey);

    // --- STEP 2: メールアドレス待ち ---
    if (session && session.step === 'awaiting_email') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度店舗IDから送信してください。' };
      } else {
        // メールアドレスを受け取ってパスワード待ちに遷移
        authSessions.set(sessionKey, {
          step: 'awaiting_password',
          tenantId: session.tenantId,
          email: userText,
          expireAt: Date.now() + SESSION_TTL_MS
        });
        replyMessage = { type: 'text', text: `📧 メールアドレス「${userText}」を受け付けました。\nパスワードを入力してください。\n（5分以内に送信してください）` };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // --- STEP 3: パスワード待ち ---
    if (session && session.step === 'awaiting_password') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度店舗IDから送信してください。' };
      } else {
        // テナントDBのユーザーをメールアドレスで検索
        const user = findUserByEmail(session.tenantId, session.email);
        if (!user) {
          authSessions.delete(sessionKey);
          replyMessage = { type: 'text', text: '❌ メールアドレスまたはパスワードが正しくありません。\n管理者にご確認の上、店舗IDから再度お試しください。' };
        } else {
          // bcryptでパスワード照合
          const passwordMatch = await bcrypt.compare(userText, user.password);
          if (passwordMatch) {
            // ホワイトリストに追加
            addToWhitelist(tenantDb, lineUserId);
            authSessions.delete(sessionKey);
            replyMessage = {
              type: 'text',
              text: `✅ 認証が完了しました！\n「${tenant.displayName}」のBot機能がご利用いただけます。\n\n「ヘルプ」と送信すると利用可能なコマンド一覧を確認できます。`
            };
          } else {
            authSessions.delete(sessionKey);
            replyMessage = { type: 'text', text: '❌ メールアドレスまたはパスワードが正しくありません。\n管理者にご確認の上、店舗IDから再度お試しください。' };
          }
        }
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 定期送信セットアップセッション
    // ================================================================

    // --- 毎週定期送信 Q1: 曜日入力待ち ---
    if (session && session.step === 'awaiting_weekly_day') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度「毎週定期送信」から設定してください。' };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      const dayMap = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
      const parsedDay = userText.trim();
      const dayOfWeek = dayMap[parsedDay];
      if (dayOfWeek === undefined) {
        replyMessage = {
          type: 'text',
          text: '⚠️ 曜日が正しくありません。\n（日、月、火、水、木、金、土 から選択してください）'
        };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      authSessions.set(sessionKey, {
        step: 'awaiting_weekly_time',
        schedulerTargetId: session.schedulerTargetId,
        dayOfWeek,
        expireAt: Date.now() + SESSION_TTL_MS
      });
      replyMessage = {
        type: 'text',
        text: `📅 曜日「${parsedDay}」を受け付けました。\n時間を教えてください。\n例）08:30`
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // --- 毎週定期送信 Q2: 時間入力待ち ---
    if (session && session.step === 'awaiting_weekly_time') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度「毎週定期送信」から設定してください。' };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const parsedTime = userText.trim();
      if (!timeRegex.test(parsedTime)) {
        replyMessage = {
          type: 'text',
          text: '⚠️ 時間の形式が正しくありません。\nHH:MM（24時間表記）で入力してください。\n例）08:30'
        };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      const registered = registerWeeklyScheduler(tenantDb, session.schedulerTargetId, session.dayOfWeek, parsedTime);
      authSessions.delete(sessionKey);
      const dayLabels = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      if (registered) {
        replyMessage = {
          type: 'text',
          text: `✅ 毎週定期送信を設定しました！\n\n📅 曜日：${dayLabels[session.dayOfWeek]}\n🕐 時間：${parsedTime}\n\n変更する場合は「毎週定期送信」で再設定、停止する場合は「毎週定期送信終了」を送信してください。`
        };
      } else {
        replyMessage = { type: 'text', text: '❌ 毎週定期送信の登録に失敗しました。時間をおいて再度お試しください。' };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // --- 定期送信 Q1: 送信時刻入力待ち ---
    if (session && session.step === 'awaiting_schedule_time') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度「定期送信開始」から設定してください。' };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      // 複数時刻を改行またはカンマで区切って入力できる
      const timeLines = userText.split(/[\n,]/).map(t => t.trim()).filter(Boolean);
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const invalidTimes = timeLines.filter(t => !timeRegex.test(t));
      if (timeLines.length === 0 || invalidTimes.length > 0) {
        replyMessage = {
          type: 'text',
          text: `⚠️ 時刻の形式が正しくありません。\nHH:MM（24時間表記）で入力してください。\n\n例）\n08:30\n20:30\n\n（複数設定する場合は改行で区切ってください）`
        };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      const sendTimes = timeLines.join(',');
      // Q2へ遷移
      authSessions.set(sessionKey, {
        step: 'awaiting_schedule_content',
        schedulerTargetId: session.schedulerTargetId,
        sendTimes,
        expireAt: Date.now() + SESSION_TTL_MS
      });
      const timeDisplay = timeLines.map(t => `  ・${t}`).join('\n');
      replyMessage = {
        type: 'text',
        text: `⏰ 送信時刻を設定しました：\n${timeDisplay}\n\n次に送信内容を番号で選択してください。\n\n１ → 未処理タスク＋本日タスク\n２ → 未処理タスクのみ\n３ → 本日タスクのみ`
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // --- 定期送信 Q2: 内容種別入力待ち ---
    if (session && session.step === 'awaiting_schedule_content') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度「定期送信開始」から設定してください。' };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      const contentType = parseInt(userText.trim(), 10);
      if (![1, 2, 3].includes(contentType)) {
        replyMessage = {
          type: 'text',
          text: '⚠️ 1・2・3のいずれかの番号を送信してください。\n\n１ → 未処理タスク＋本日タスク\n２ → 未処理タスクのみ\n３ → 本日タスクのみ'
        };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }
      // 登録実行
      const registered = registerScheduler(tenantDb, session.schedulerTargetId, session.sendTimes, contentType);
      authSessions.delete(sessionKey);
      const contentLabels = { 1: '未処理タスク＋本日タスク', 2: '未処理タスクのみ', 3: '本日タスクのみ' };
      const timeList = session.sendTimes.split(',').map(t => `  ・${t}`).join('\n');
      if (registered) {
        replyMessage = {
          type: 'text',
          text: `✅ 定期送信を設定しました！\n\n🕐 送信時刻：\n${timeList}\n📋 内容：${contentLabels[contentType]}\n\n日曜・祝日はお休みです。\n変更する場合は「定期送信開始」で再設定、停止する場合は「定期送信終了」を送信してください。`
        };
      } else {
        replyMessage = { type: 'text', text: '❌ 定期送信の登録に失敗しました。時間をおいて再度お試しください。' };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // STEP 1: 店舗slug 入力 → 認証フロー開始
    // ================================================================
    // テナントのslugかどうか確認（システムDBで検索）
    const inputTenant = resolveTenantBySlug(userText);
    if (inputTenant) {
      if (isWhitelisted(tenantDb, lineUserId)) {
        replyMessage = { type: 'text', text: '✅ すでに登録済みです。引き続きBot機能をご利用ください。' };
      } else {
        // 認証セッション開始（メールアドレス入力待ちに遷移）
        authSessions.set(sessionKey, {
          step: 'awaiting_email',
          tenantId: inputTenant.id,
          tenantSlug: inputTenant.slug,
          expireAt: Date.now() + SESSION_TTL_MS
        });
        replyMessage = {
          type: 'text',
          text: `🏥 「${inputTenant.displayName}」の認証を開始します。\nWebポータルのメールアドレスを入力してください。\n（5分以内に送信してください）`
        };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 退社コマンド
    // ================================================================
    if (userText === '退社') {
      const removed = removeFromWhitelist(tenantDb, lineUserId);
      if (removed) {
        replyMessage = { type: 'text', text: '👋 退社手続きが完了しました。お疲れ様でした。\nご利用ありがとうございました。' };
      } else {
        replyMessage = { type: 'text', text: 'ご登録情報が見つかりませんでした。' };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // ホワイトリストチェック（未登録ユーザーへの案内）
    // ================================================================
    // グループ/ルームの場合はuserIdでホワイトリスト確認
    if (!isWhitelisted(tenantDb, lineUserId)) {
      replyMessage = {
        type: 'text',
        text: '🔒 このBotを利用するには登録が必要です。\n\n店舗ID（スラッグ）を送信して登録を開始してください。\n店舗IDは管理者にご確認ください。'
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 在庫検索セッション処理
    // ================================================================
    if (session && session.step === 'awaiting_stock_keyword') {
      if (Date.now() > session.expireAt) {
        authSessions.delete(sessionKey);
        replyMessage = { type: 'text', text: '⏰ タイムアウトしました。もう一度「在庫」から検索してください。' };
        await replyMessageWithRetry(client, event.replyToken, replyMessage);
        return;
      }

      const keyword = userText.trim();
      const prevKeyword = session.keyword || '';
      const searchKeyword = prevKeyword + keyword;

      // テナントDBから商品を検索
      const tenantDb2 = getTenantDb(tenant.id);
      let products;
      try {
        products = tenantDb2.prepare(
          `SELECT name, currentStock, unit FROM "Product" WHERE name LIKE ? ORDER BY name`
        ).all(`${searchKeyword}%`);
        tenantDb2.close();
      } catch (err) {
        console.error('[在庫検索エラー]', err);
        products = [];
      }

      authSessions.delete(sessionKey);

      if (products.length === 0) {
        replyMessage = { type: 'text', text: `「${searchKeyword}」に一致する商品が見つかりませんでした。` };
      } else if (products.length > 10) {
        // 多すぎる場合は絞り込みを促す（セッション継続）
        authSessions.set(sessionKey, {
          step: 'awaiting_stock_keyword',
          keyword: searchKeyword,
          expireAt: Date.now() + SESSION_TTL_MS
        });
        replyMessage = {
          type: 'text',
          text: `「${searchKeyword}」で${products.length}品目あります。\nもう1文字以上追加して送信してください。`
        };
      } else {
        const lines = products.map(p => {
          const unit = p.unit || '個';
          return `・${p.name}：${p.currentStock}${unit}`;
        });
        replyMessage = {
          type: 'text',
          text: `📦 在庫一覧（${searchKeyword}）\n\n${lines.join('\n')}`
        };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 定期送信開始コマンド（認証済みユーザーのみ）→ セットアップフロー開始
    // グループラインの場合はgroupIdを、ルームの場合はroomIdを、
    // 個人の場合はuserIdを宛先として登録する
    // ================================================================
    if (userText === '定期送信開始') {
      // セットアップセッション開始（Q1: 送信時刻）
      authSessions.set(sessionKey, {
        step: 'awaiting_schedule_time',
        schedulerTargetId,
        expireAt: Date.now() + SESSION_TTL_MS
      });
      replyMessage = {
        type: 'text',
        text: '🔔 定期送信のセットアップを開始します。\n\n【Q1】毎日の送信時間を必要な回数分、24時間表記で教えてください。\n\n例）\n08:30\n20:30\n\n（複数設定する場合は改行で区切ってください）'
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    if (userText === '毎週定期送信') {
      authSessions.set(sessionKey, {
        step: 'awaiting_weekly_day',
        schedulerTargetId,
        expireAt: Date.now() + SESSION_TTL_MS
      });
      replyMessage = {
        type: 'text',
        text: '🔔 毎週定期送信のセットアップを開始します。\n\n何曜日に送信しますか？\n（日、月、火、水、木、金、土 から選択してください）'
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    if (userText === '毎週定期送信終了') {
      const unregistered = unregisterWeeklyScheduler(tenantDb, schedulerTargetId);
      if (unregistered) {
        replyMessage = { type: 'text', text: '🔇 毎週定期送信を終了しました。' };
      } else {
        replyMessage = { type: 'text', text: '毎週定期送信は登録されていないか、解除に失敗しました。' };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 定期送信終了コマンド（認証済みユーザーのみ）
    // ================================================================
    if (userText === '定期送信終了') {
      const unregistered = unregisterScheduler(tenantDb, schedulerTargetId);
      if (unregistered) {
        replyMessage = { type: 'text', text: '🔇 定期送信を終了しました。' };
      } else {
        replyMessage = { type: 'text', text: '定期送信は登録されていないか、解除に失敗しました。' };
      }
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // ================================================================
    // 通常のBotコマンド処理（ホワイトリスト済みユーザーのみ）
    // ================================================================

    // ヘルプコマンド
    if (userText === 'ヘルプ' || userText === 'help') {
      const helpText = `【利用可能なコマンド一覧】\n\n📦 在庫管理\n・「在庫」（商品在庫を名前で検索）\n・「欠品」または「欠品リスト」\n・「欠品登録 [商品名]」\n・「欠品解消 [商品名]」\n・「不動在庫」\n\n📅 来局管理\n・「来局」または「来局予定」\n・「来局登録 [名前] [周期(日)]」\n・「来局周期変更 [名前] [新周期(日)]」\n・「来局削除 [名前]」\n\n🔔 通知設定\n・「定期送信開始」（送信時刻・内容を対話設定）\n・「定期送信終了」（通知停止）\n・「毎週定期送信」（曜日・時刻を対話設定）\n・「毎週定期送信終了」（毎週通知の停止）\n\n🚪 その他\n・「退社」（アカウント削除）\n・「こんにちは」（疎通確認）`;
      replyMessage = { type: 'text', text: helpText };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // 在庫検索コマンド
    if (userText === '在庫') {
      authSessions.set(sessionKey, {
        step: 'awaiting_stock_keyword',
        keyword: '',
        expireAt: Date.now() + SESSION_TTL_MS
      });
      replyMessage = {
        type: 'text',
        text: '🔍 商品名の最初の文字を送ってください。\n（例：「ア」「鎮痛」など）'
      };
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
      return;
    }

    // 在庫管理キーワードの処理
    const stockResponse = await handleStockMessage(userText, tenant.id);
    if (stockResponse) {
      replyMessage = typeof stockResponse === 'object' ? stockResponse : { type: 'text', text: stockResponse };
    }
    // 来店予定キーワードの処理
    else {
      const calendarResponse = await handleCalendarMessage(userText, tenant.id);
      if (calendarResponse) {
        replyMessage = typeof calendarResponse === 'object' ? calendarResponse : { type: 'text', text: calendarResponse };
      }
      // 疎通確認
      else if (userText === 'こんにちは') {
        replyMessage = { type: 'text', text: `こんにちは！こちらは「${tenant.displayName}」のLINE窓口です。通信疎通確認に成功しました。` };
      }
      // 未認識コマンドは無視（返信しない）
    }

    // replyMessageがある場合のみ送信
    if (replyMessage) {
      await replyMessageWithRetry(client, event.replyToken, replyMessage);
    }

  } catch (error) {
    console.error(`[LINE BOT ERROR] Event handling failure for tenant ${tenant.slug}:`, error);
    try {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: '申し訳ありません。システムエラーが発生したため、メッセージを処理できませんでした。時間をおいてもう一度お試しください。' }]
      });
    } catch (sendErr) {
      console.error('[LINE BOT ERROR] Failed to send fallback error message:', sendErr);
    }
    throw error;
  }
}

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('[LINE BOT ERROR] Unhandled server error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`LINE Bot server is running on port ${PORT}`);
  console.log(`[認証] Webポータルと同じ店舗slug + メールアドレス + パスワードによるホワイトリスト登録が有効`);
  
  if (systemDb) {
    initScheduler(systemDb, dataRoot);
  } else {
    console.warn('[Scheduler Warning] System DB is not connected. Scheduler is disabled.');
  }
});
