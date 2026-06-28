const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

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

function getTenantDb(tenantId) {
  const dataRoot = process.env.DATA_ROOT || '/data';
  const dbPath = path.join(dataRoot, 'tenants', tenantId, 'dev.db');
  return new Database(dbPath, { fileMustExist: true });
}

/**
 * Add days to a date string in MM/DD or YYYY-MM-DD format
 */
function addDays(dateStr, days) {
  let date;
  let isMMDD = false;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr);
  } else if (/^\d{2}\/\d{2}$/.test(dateStr)) {
    const year = new Date().getFullYear();
    date = new Date(`${year}-${dateStr.replace('/', '-')}`);
    isMMDD = true;
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    return dateStr;
  }

  date.setDate(date.getDate() + parseInt(days, 10));

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  return isMMDD ? `${mm}/${dd}` : `${yyyy}-${mm}-${dd}`;
}

/**
 * Get a list of 28 Date objects representing 4 weeks:
 */
function get4WeekCalendarRange() {
  const today = getJSTDate();
  const dayOfWeek = today.getDay(); 
  
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - dayOfWeek);
  
  const startDate = new Date(currentSunday);
  startDate.setDate(currentSunday.getDate() - 7);
  
  const days = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Build the LINE Flex Message for the 4-week calendar
 */
function generateFlexCalendar(list) {
  const days = get4WeekCalendarRange();
  const today = getJSTDate();
  
  const weeks = [];
  for (let i = 0; i < 4; i++) {
    weeks.push(days.slice(i * 7, (i + 1) * 7));
  }

  const matchedAppointments = [];
  
  const weekRowsFlex = weeks.map((week) => {
    const dayColsFlex = week.map((d) => {
      const dayNum = d.getDate().toString();
      const isToday = d.getFullYear() === today.getFullYear() &&
                      d.getMonth() === today.getMonth() &&
                      d.getDate() === today.getDate();
                      
      const year = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyymmdd = `${year}-${mm}-${dd}`;
      const mmdd = `${mm}/${dd}`;

      // 予定があるかチェック
      const visits = list.filter(entry => entry.nextDate === yyyymmdd || entry.nextDate === mmdd);
      const hasVisits = visits.length > 0;

      if (hasVisits) {
        visits.forEach(v => {
          matchedAppointments.push({
            date: `${mm}/${dd}`,
            name: v.name,
            cycle: v.cycle
          });
        });
      }

      const dayOfWeek = d.getDay(); 
      let textColor = '#333333';
      if (dayOfWeek === 0) textColor = '#e52b50'; 
      if (dayOfWeek === 6) textColor = '#4267b2'; 

      if (hasVisits) {
        return {
          "type": "box",
          "layout": "vertical",
          "flex": 1,
          "alignItems": "center",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "width": "26px",
              "height": "26px",
              "cornerRadius": "xxl",
              "backgroundColor": "#2ecc71",
              "justifyContent": "center",
              "alignItems": "center",
              "contents": [
                {
                  "type": "text",
                  "text": dayNum,
                  "color": "#ffffff",
                  "size": "xs",
                  "align": "center",
                  "weight": "bold"
                }
              ]
            }
          ]
        };
      } else if (isToday) {
        return {
          "type": "box",
          "layout": "vertical",
          "flex": 1,
          "alignItems": "center",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "width": "26px",
              "height": "26px",
              "cornerRadius": "xxl",
              "borderColor": "#3498db",
              "borderWidth": "semi-bold",
              "justifyContent": "center",
              "alignItems": "center",
              "contents": [
                {
                  "type": "text",
                  "text": dayNum,
                  "color": "#3498db",
                  "size": "xs",
                  "align": "center",
                  "weight": "bold"
                }
              ]
            }
          ]
        };
      } else {
        return {
          "type": "box",
          "layout": "vertical",
          "flex": 1,
          "alignItems": "center",
          "justifyContent": "center",
          "height": "26px",
          "contents": [
            {
              "type": "text",
              "text": dayNum,
              "color": textColor,
              "size": "xs",
              "align": "center"
            }
          ]
        };
      }
    });

    return {
      "type": "box",
      "layout": "horizontal",
      "margin": "md",
      "contents": dayColsFlex
    };
  });

  const listItemsFlex = [];
  if (matchedAppointments.length === 0) {
    listItemsFlex.push({
      "type": "text",
      "text": "期間内の予定はありません",
      "size": "xs",
      "color": "#888888",
      "style": "italic",
      "margin": "sm"
    });
  } else {
    matchedAppointments.sort((a, b) => a.date.localeCompare(b.date));
    
    matchedAppointments.forEach((app) => {
      listItemsFlex.push({
        "type": "box",
        "layout": "horizontal",
        "margin": "sm",
        "alignItems": "center",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "width": "6px",
            "height": "6px",
            "cornerRadius": "xxl",
            "backgroundColor": "#2ecc71",
            "contents": []
          },
          {
            "type": "text",
            "text": `${app.date}  ${app.name} (${app.cycle}日周期)`,
            "size": "xs",
            "color": "#444444",
            "flex": 1,
            "margin": "md"
          }
        ]
      });
    });
  }

  return {
    "type": "flex",
    "altText": "来局予定カレンダー",
    "contents": {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "paddingAll": "lg",
        "contents": [
          {
            "type": "text",
            "text": "来局予想カレンダー",
            "weight": "bold",
            "size": "lg",
            "color": "#2c3e50"
          },
          {
            "type": "text",
            "text": "前1週 〜 今週・後2週 (4週間)",
            "size": "xxs",
            "color": "#7f8c8d",
            "margin": "xs"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "margin": "lg",
            "contents": [
              { "type": "text", "text": "日", "size": "xxs", "color": "#e52b50", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "月", "size": "xxs", "color": "#aaaaaa", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "火", "size": "xxs", "color": "#aaaaaa", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "水", "size": "xxs", "color": "#aaaaaa", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "木", "size": "xxs", "color": "#aaaaaa", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "金", "size": "xxs", "color": "#aaaaaa", "align": "center", "weight": "bold", "flex": 1 },
              { "type": "text", "text": "土", "size": "xxs", "color": "#4267b2", "align": "center", "weight": "bold", "flex": 1 }
            ]
          },
          {
            "type": "separator",
            "margin": "xs",
            "color": "#ecf0f1"
          },
          ...weekRowsFlex,
          {
            "type": "separator",
            "margin": "lg",
            "color": "#ecf0f1"
          },
          {
            "type": "text",
            "text": "来局予定リスト",
            "weight": "bold",
            "size": "xs",
            "color": "#2c3e50",
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "sm",
            "contents": listItemsFlex
          }
        ]
      }
    }
  };
}

/**
 * SQLiteデータベースからカレンダー予定を読込
 * visitInterval = 0 (来店不要) の顧客は除外！
 */
async function readCalendar(tenantId) {
  let db;
  try {
    db = getTenantDb(tenantId);
    const customers = db.prepare('SELECT * FROM "Customer" WHERE visitInterval > 0').all();
    
    return customers.map(c => {
      const dateObj = new Date(c.nextVisitDate);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const formattedNextDate = `${yyyy}-${mm}-${dd}`;
      
      return {
        id: c.id,
        name: c.name,
        date: formattedNextDate,
        cycle: c.visitInterval,
        nextDate: formattedNextDate,
        updatedAt: c.updatedAt
      };
    });
  } catch (error) {
    console.error(`Error querying SQLite calendar for ${tenantId}:`, error);
    return [];
  } finally {
    if (db) db.close();
  }
}

/**
 * 来店・カレンダー関連のコマンド処理
 */
async function handleCalendarMessage(text, tenantId) {
  if (!text) return null;

  const trimmedText = text.trim();

  // 1. 来局登録 [顧客名] [周期(日)]
  // 最終来店日/次回予定日の設定を追加
  const addMatch = trimmedText.match(/^来局登録\s+(\S+)\s+(\d+)$/);
  if (addMatch) {
    const name = addMatch[1].trim();
    const cycle = parseInt(addMatch[2], 10);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 次回予定日の計算
    const nextDateObj = new Date(today);
    nextDateObj.setDate(today.getDate() + cycle);

    const yyyy = nextDateObj.getFullYear();
    const mm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDateObj.getDate()).padStart(2, '0');
    const nextDateStr = `${yyyy}-${mm}-${dd}`;

    let db;
    try {
      db = getTenantDb(tenantId);
      
      const existing = db.prepare('SELECT * FROM "Customer" WHERE name = ?').get(name);
      
      if (existing) {
        db.prepare(`
          UPDATE "Customer" 
          SET visitInterval = ?, nextVisitDate = ?, lastVisitDate = ?, updatedAt = datetime('now')
          WHERE id = ?
        `).run(cycle, nextDateObj.toISOString(), today.toISOString(), existing.id);
      } else {
        db.prepare(`
          INSERT INTO "Customer" (id, name, visitInterval, lastVisitDate, nextVisitDate, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(crypto.randomUUID(), name, cycle, today.toISOString(), nextDateObj.toISOString());
      }

      return `【来局予定の登録完了】\n顧客名: ${name}\n周期: ${cycle}日${cycle === 0 ? ' (来店不要)' : ''}\n次回予定日: ${cycle === 0 ? 'なし' : nextDateStr}`;
    } catch (err) {
      console.error(err);
      return 'データベースの保存に失敗しました。';
    } finally {
      if (db) db.close();
    }
  }

  // 2. 来局周期変更 [顧客名] [新規周期(日)]
  const updateCycleMatch = trimmedText.match(/^来局周期変更\s+(\S+)\s+(\d+)$/);
  if (updateCycleMatch) {
    const name = updateCycleMatch[1].trim();
    const newCycle = parseInt(updateCycleMatch[2], 10);

    let db;
    try {
      db = getTenantDb(tenantId);
      const customer = db.prepare('SELECT * FROM "Customer" WHERE name = ?').get(name);
      
      if (!customer) {
        return `顧客「${name}」のデータが見つかりません。まず「来局登録」を行ってください。`;
      }

      // 最終来店日または今日を起点に次回予定日を再計算
      const baseDate = customer.lastVisitDate ? new Date(customer.lastVisitDate) : new Date();
      baseDate.setUTCHours(0, 0, 0, 0);

      const newNextDateObj = new Date(baseDate);
      newNextDateObj.setDate(baseDate.getDate() + newCycle);

      const yyyy = newNextDateObj.getFullYear();
      const mm = String(newNextDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(newNextDateObj.getDate()).padStart(2, '0');
      const newNextDateStr = `${yyyy}-${mm}-${dd}`;

      db.prepare(`
        UPDATE "Customer" 
        SET visitInterval = ?, nextVisitDate = ?, updatedAt = datetime('now')
        WHERE id = ?
      `).run(newCycle, newNextDateObj.toISOString(), customer.id);

      return `【来局周期変更完了】\n顧客名: ${name}\n新周期: ${newCycle}日${newCycle === 0 ? ' (来店不要)' : ''}\n次回予定日: ${newCycle === 0 ? 'なし' : newNextDateStr}`;
    } catch (err) {
      console.error(err);
      return 'データベースの更新に失敗しました。';
    } finally {
      if (db) db.close();
    }
  }

  // 3. 来局削除 [顧客名]
  // 実際には cycle = 0 (来店不要) に変更して残すか、完全削除するか。
  // コマンドは「削除」なので、完全に削除する設計にします。
  const removeMatch = trimmedText.match(/^来局削除\s+(.+)$/);
  if (removeMatch) {
    const name = removeMatch[1].trim();
    let db;
    try {
      db = getTenantDb(tenantId);
      const customer = db.prepare('SELECT * FROM "Customer" WHERE name = ?').get(name);
      
      if (!customer) {
        return `顧客「${name}」の予定が見つかりませんでした。`;
      }

      db.prepare('DELETE FROM "Customer" WHERE id = ?').run(customer.id);
      return `「${name}」の来局予定を削除しました。`;
    } catch (err) {
      console.error(err);
      return 'データベースからの削除に失敗しました。';
    } finally {
      if (db) db.close();
    }
  }

  // 4. カレンダーリスト表示 (Flex Message)
  if (trimmedText === '来局予定' || trimmedText === '来局' || trimmedText === '来局リスト' || trimmedText === 'カレンダー') {
    const list = await readCalendar(tenantId);
    return generateFlexCalendar(list);
  }

  return null;
}

module.exports = {
  readCalendar,
  handleCalendarMessage,
  addDays,
  generateFlexCalendar
};
