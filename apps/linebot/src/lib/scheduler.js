'use strict';
const cron = require('node-cron');
const { isHoliday } = require('japanese-holidays');
const { messagingApi } = require('@line/bot-sdk');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

function getJSTDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const getPart = type => parts.find(p => p.type === type).value;
  return new Date(
    parseInt(getPart('year'), 10),
    parseInt(getPart('month'), 10) - 1,
    parseInt(getPart('day'), 10),
    parseInt(getPart('hour'), 10),
    parseInt(getPart('minute'), 10),
    parseInt(getPart('second'), 10)
  );
}

/**
 * テナントDBの LineScheduleConfig テーブルを作成・マイグレーションする
 * @param {import('better-sqlite3').Database} db テナントDB
 */
function ensureScheduleTable(db) {
  try {
    // テーブル作成（初回）
    db.prepare(`
      CREATE TABLE IF NOT EXISTS LineScheduleConfig (
        id          TEXT PRIMARY KEY,
        lineUserId  TEXT UNIQUE NOT NULL,
        isActive    INTEGER NOT NULL DEFAULT 1,
        sendTimes   TEXT NOT NULL DEFAULT '08:00',
        contentType INTEGER NOT NULL DEFAULT 1,
        createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();

    // 既存テーブルへのカラム追加（ALTER TABLE: 存在しない場合のみ）
    const cols = db.prepare(`PRAGMA table_info(LineScheduleConfig)`).all().map(c => c.name);
    if (!cols.includes('sendTimes')) {
      db.prepare(`ALTER TABLE LineScheduleConfig ADD COLUMN sendTimes TEXT NOT NULL DEFAULT '08:00'`).run();
    }
    if (!cols.includes('contentType')) {
      db.prepare(`ALTER TABLE LineScheduleConfig ADD COLUMN contentType INTEGER NOT NULL DEFAULT 1`).run();
    }
  } catch (err) {
    console.error('[Scheduler] ensureScheduleTable error:', err);
  }
}

/**
 * 定期送信を登録する（sendTimes: "HH:MM,HH:MM" カンマ区切り複数対応）
 * @param {import('better-sqlite3').Database} db テナントDB
 * @param {string} lineUserId LINE userId / groupId / roomId
 * @param {string} sendTimes カンマ区切り時刻文字列（例: "08:00,20:30"）
 * @param {number} contentType 1=両方 / 2=未処理のみ / 3=本日のみ
 * @returns {boolean}
 */
function registerScheduler(db, lineUserId, sendTimes = '08:00', contentType = 1) {
  try {
    ensureScheduleTable(db);
    db.prepare(`
      INSERT INTO LineScheduleConfig (id, lineUserId, isActive, sendTimes, contentType, createdAt, updatedAt)
      VALUES (lower(hex(randomblob(16))), ?, 1, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(lineUserId) DO UPDATE SET
        isActive = 1,
        sendTimes = excluded.sendTimes,
        contentType = excluded.contentType,
        updatedAt = datetime('now')
    `).run(lineUserId, sendTimes, contentType);
    return true;
  } catch (err) {
    console.error('[Scheduler] registerScheduler error:', err);
    return false;
  }
}

/**
 * 定期送信を終了（解除）する
 * @param {import('better-sqlite3').Database} db テナントDB
 * @param {string} lineUserId LINE userId / groupId / roomId
 * @returns {boolean}
 */
function unregisterScheduler(db, lineUserId) {
  try {
    ensureScheduleTable(db);
    const result = db.prepare(`
      UPDATE LineScheduleConfig
      SET isActive = 0, updatedAt = datetime('now')
      WHERE lineUserId = ?
    `).run(lineUserId);
    return result.changes > 0;
  } catch (err) {
    console.error('[Scheduler] unregisterScheduler error:', err);
    return false;
  }
}

/**
 * 本日予定の顧客リストを取得する
 * @param {import('better-sqlite3').Database} db テナントDB
 * @param {string} todayStr YYYY-MM-DD
 * @returns {string[]} 顧客名リスト
 */
function getTodayCustomers(db, todayStr) {
  const customers = db.prepare(`
    SELECT name, nextVisitDate
    FROM Customer
    WHERE visitInterval > 0
  `).all();

  return customers
    .filter(c => c.nextVisitDate && c.nextVisitDate.split('T')[0] === todayStr)
    .map(c => c.name);
}

/**
 * 昨日以前が予定日で未完了の顧客を日付でグループ化して取得する
 * @param {import('better-sqlite3').Database} db テナントDB
 * @param {string} todayStr YYYY-MM-DD
 * @returns {{ date: string, names: string[] }[]} 日付昇順のグループリスト
 */
function getOverdueCustomersByDate(db, todayStr) {
  const customers = db.prepare(`
    SELECT name, nextVisitDate
    FROM Customer
    WHERE visitInterval > 0
  `).all();

  const grouped = {};
  for (const c of customers) {
    if (!c.nextVisitDate) continue;
    const dateStr = c.nextVisitDate.split('T')[0];
    if (dateStr >= todayStr) continue; // 今日以降はスキップ
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(c.name);
  }

  // 日付昇順でソート
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, names]) => ({ date, names }));
}

/**
 * メッセージテキストを組み立てる
 * @param {string[]} todayList 本日タスクの顧客名
 * @param {{ date: string, names: string[] }[]} overdueGroups 未処理タスクグループ
 * @param {number} contentType 1=両方 / 2=未処理のみ / 3=本日のみ
 * @param {Date} today JSTの今日
 * @returns {string}
 */
function buildMessageText(todayList, overdueGroups, contentType, today) {
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  const dateLabel = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}（${DOW[today.getDay()]}）`;
  let lines = [`📅 ${dateLabel}のリマインドです。`];

  const showToday = contentType === 1 || contentType === 3;
  const showOverdue = contentType === 1 || contentType === 2;

  if (showToday) {
    lines.push('');
    lines.push(`【本日タスク】・・・${todayList.length}件`);
    if (todayList.length === 0) {
      lines.push('（本日の来局予定はありません）');
    } else {
      todayList.forEach(name => lines.push(`・${name}`));
    }
  }

  if (showOverdue) {
    const totalOverdue = overdueGroups.reduce((sum, g) => sum + g.names.length, 0);
    lines.push('');
    lines.push(`【未処理タスク】・・・${totalOverdue}件`);
    if (overdueGroups.length === 0) {
      lines.push('（未処理の来局予定はありません）');
    } else {
      for (const group of overdueGroups) {
        // YYYY-MM-DD → M/D 形式
        const [, m, d] = group.date.split('-');
        const label = `${parseInt(m, 10)}/${parseInt(d, 10)}`;
        lines.push(`●${label}・・・${group.names.length}件`);
        group.names.forEach(name => lines.push(`・${name}`));
      }
    }
  }

  return lines.join('\n');
}

/**
 * 現在時刻（HH:MM）と一致する設定のみ送信するジョブ
 * @param {import('better-sqlite3').Database} systemDb システムDB
 * @param {string} dataRoot データ領域ルート
 */
async function runScheduleJobAtCurrentMinute(systemDb, dataRoot) {
  try {
    const today = getJSTDate();
    const dayOfWeek = today.getDay();

    // 日曜・祝日はスキップ
    if (dayOfWeek === 0) return;
    if (isHoliday(today)) return;

    const hh = String(today.getHours()).padStart(2, '0');
    const mm = String(today.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const tenants = systemDb.prepare(`SELECT * FROM "Tenant" WHERE isActive = 1`).all();

    for (const tenant of tenants) {
      if (!tenant.lineChannelAccessToken) continue;

      const dbPath = path.join(dataRoot, 'tenants', tenant.id, 'dev.db');
      if (!fs.existsSync(dbPath)) continue;

      const db = new Database(dbPath, { fileMustExist: true });
      ensureScheduleTable(db);

      // 現在時刻を sendTimes に含む・かつ isActive なレコードを抽出
      const allConfigs = db.prepare(
        `SELECT lineUserId, sendTimes, contentType FROM LineScheduleConfig WHERE isActive = 1`
      ).all();

      const matchingConfigs = allConfigs.filter(cfg => {
        const times = (cfg.sendTimes || '08:00').split(',').map(t => t.trim());
        return times.includes(currentTime);
      });

      if (matchingConfigs.length === 0) {
        db.close();
        continue;
      }

      const todayList = getTodayCustomers(db, todayStr);
      const overdueGroups = getOverdueCustomersByDate(db, todayStr);
      db.close();

      const client = new messagingApi.MessagingApiClient({
        channelAccessToken: tenant.lineChannelAccessToken
      });

      for (const cfg of matchingConfigs) {
        const messageText = buildMessageText(
          todayList,
          overdueGroups,
          cfg.contentType || 1,
          today
        );
        try {
          await client.pushMessage({
            to: cfg.lineUserId,
            messages: [{ type: 'text', text: messageText }]
          });
          console.log(`[Scheduler] 送信成功: テナント=${tenant.slug}, 宛先=${cfg.lineUserId}, 時刻=${currentTime}`);
        } catch (err) {
          console.error(`[Scheduler] 送信失敗: テナント=${tenant.slug}, 宛先=${cfg.lineUserId}`, err);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] runScheduleJobAtCurrentMinute error:', err);
  }
}

/**
 * スケジューラを起動する（毎分実行で各設定の時刻と照合）
 * @param {import('better-sqlite3').Database} systemDb システムDB
 * @param {string} dataRoot データ領域ルート
 */
function initScheduler(systemDb, dataRoot) {
  cron.schedule('* * * * *', () => {
    runScheduleJobAtCurrentMinute(systemDb, dataRoot);
  }, {
    timezone: 'Asia/Tokyo'
  });
  console.log('[Scheduler] 定期送信ジョブがスケジュールされました（毎分チェック方式）。');
}

module.exports = {
  registerScheduler,
  unregisterScheduler,
  ensureScheduleTable,
  initScheduler,
  runScheduleJobAtCurrentMinute, // テスト用にエクスポート
};
