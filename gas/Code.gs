/**
 * Yusuke & Aika Wedding Invitation Backend
 * GitHub Pages から JSONP で呼び出す Google Apps Script です。
 *
 * スプレッドシート列：
 * A URL / B ゲスト名 / C メールアドレス / D 挙式出欠 / E 披露宴出欠 / F アレルギー
 * G以降は、回答日時・メール送信日時・リマインド送信日時などを自動追加します。
 */

const APP_CONFIG = {
  spreadsheetId: '1micDJFsf6ktwZrq_tlIz9TiC4PjbBbv-7dlWgbhMjbs',
  sheetName: '', // 空欄なら一番左のシートを使います。
  timeZone: 'Asia/Tokyo',
  weddingDateIso: '2027-03-21T10:00:00+09:00',
  weddingDateLabel: '2027年3月21日（日）',
  ceremonyTimeLabel: '10:00〜10:30',
  receptionTimeLabel: '11:00〜14:00',
  groomName: '祐輔',
  brideName: '愛佳',
  senderName: 'Yusuke & Aika Wedding',
  venueName: 'キンプトン新宿東京',
  venueAddress: '〒160-0023 東京都新宿区西新宿3丁目4-7',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=%E3%82%AD%E3%83%B3%E3%83%97%E3%83%88%E3%83%B3%E6%96%B0%E5%AE%BF%E6%9D%B1%E4%BA%AC',
  baseInvitationUrl: 'https://Yusuke-Aika-Wedding.github.io/invitation-test/',
  guests: [
    { url: 'kekkon-hanako', displayName: '結婚太郎' },
    { url: 'konninn-hanako', displayName: '婚姻花子' }
  ]
};

const HEADERS = [
  'URL',
  'ゲスト名',
  'メールアドレス',
  '挙式出欠',
  '披露宴出欠',
  'アレルギー',
  '回答日時',
  '確認メール送信日時',
  '1週間前リマインド送信日時',
  '前日リマインド送信日時',
  '更新日時',
  '招待状URL'
];

const COL = {
  url: 1,
  name: 2,
  email: 3,
  ceremony: 4,
  reception: 5,
  allergy: 6,
  submittedAt: 7,
  confirmationSentAt: 8,
  reminder7SentAt: 9,
  reminder1SentAt: 10,
  updatedAt: 11,
  invitationUrl: 12
};

function setup() {
  const sheet = getMainSheet_();
  ensureHeaders_(sheet);
  seedGuests_(sheet);
  formatSheet_(sheet);
  resetReminderTrigger_();
  SpreadsheetApp.flush();
  Logger.log('Setup complete. Deploy this project as a web app.');
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  try {
    const action = params.action || 'status';
    if (action === 'ping') return output_({ ok: true, message: 'pong' }, params.callback);
    if (action === 'status') return output_(getStatus_(params.guestId), params.callback);
    if (action === 'submit') return output_(submitResponse_(params), params.callback);
    return output_({ ok: false, error: 'Unknown action.' }, params.callback);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return output_({ ok: false, error: error.message || String(error) }, params.callback);
  }
}

function doPost(e) {
  try {
    const params = parsePostParams_(e);
    return output_(submitResponse_(params));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return output_({ ok: false, error: error.message || String(error) });
  }
}

function getStatus_(guestIdRaw) {
  const guestId = normalizeGuestId_(guestIdRaw);
  if (!guestId) throw new Error('guestIdがありません。');

  const sheet = getMainSheet_();
  ensureHeaders_(sheet);
  const record = findGuestRecord_(sheet, guestId);
  if (!record) throw new Error('ゲスト情報が見つかりません。');

  const values = record.values;
  return {
    ok: true,
    guestId: values.url,
    displayName: values.name || 'ゲスト',
    completed: isCompleted_(values),
    email: values.email || '',
    ceremonyAttendance: values.ceremony || '',
    receptionAttendance: values.reception || '',
    allergy: values.allergy || '',
    submittedAt: values.submittedAt || ''
  };
}

function submitResponse_(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const guestId = normalizeGuestId_(params.guestId);
    const name = String(params.name || '').trim();
    const email = String(params.email || '').trim();
    const ceremonyAttendance = normalizeAttendance_(params.ceremonyAttendance);
    const receptionAttendance = normalizeAttendance_(params.receptionAttendance);
    const allergy = String(params.allergy || '').trim();

    if (!guestId) throw new Error('guestIdがありません。');
    if (!name) throw new Error('氏名を入力してください。');
    if (!isValidEmail_(email)) throw new Error('メールアドレスを確認してください。');
    if (!ceremonyAttendance) throw new Error('挙式の出欠を選択してください。');
    if (!receptionAttendance) throw new Error('披露宴の出欠を選択してください。');

    const sheet = getMainSheet_();
    ensureHeaders_(sheet);
    const record = findGuestRecord_(sheet, guestId);
    if (!record) throw new Error('ゲスト情報が見つかりません。');

    const now = new Date();
    const invitationUrl = getInvitationUrl_(guestId);
    sheet.getRange(record.rowNumber, 1, 1, HEADERS.length).setValues([[
      guestId,
      name,
      email,
      ceremonyAttendance,
      receptionAttendance,
      allergy,
      now,
      '',
      record.values.reminder7SentAt || '',
      record.values.reminder1SentAt || '',
      now,
      invitationUrl
    ]]);

    sendConfirmationEmail_({
      to: email,
      name: name,
      ceremonyAttendance: ceremonyAttendance,
      receptionAttendance: receptionAttendance,
      allergy: allergy,
      invitationUrl: invitationUrl
    });
    sheet.getRange(record.rowNumber, COL.confirmationSentAt).setValue(new Date());
    sheet.getRange(record.rowNumber, COL.updatedAt).setValue(new Date());

    return { ok: true, completed: true, displayName: name };
  } finally {
    lock.releaseLock();
  }
}

function sendReminderEmails() {
  const daysBefore = daysBeforeWedding_(new Date());
  if (![7, 1].includes(daysBefore)) {
    Logger.log(`Reminder skipped. daysBefore=${daysBefore}`);
    return;
  }
  sendReminderEmailsByDays_(daysBefore, false);
}

function testReminder7Days() {
  sendReminderEmailsByDays_(7, true);
}

function testReminder1Day() {
  sendReminderEmailsByDays_(1, true);
}

function sendReminderEmailsByDays_(daysBefore, isTest) {
  const sheet = getMainSheet_();
  ensureHeaders_(sheet);
  const records = readRecords_(sheet);
  const sentColumn = daysBefore === 7 ? COL.reminder7SentAt : COL.reminder1SentAt;
  let sentCount = 0;

  records.forEach(record => {
    const v = record.values;
    if (!isCompleted_(v)) return;
    if (!isValidEmail_(v.email)) return;
    if (!isAttending_(v.ceremony, v.reception)) return;
    if (!isTest && v[daysBefore === 7 ? 'reminder7SentAt' : 'reminder1SentAt']) return;

    sendReminderEmail_({
      to: v.email,
      name: v.name || 'ゲスト',
      ceremonyAttendance: v.ceremony,
      receptionAttendance: v.reception,
      allergy: v.allergy || '',
      daysBefore: daysBefore,
      invitationUrl: v.invitationUrl || getInvitationUrl_(v.url)
    });

    if (!isTest) {
      sheet.getRange(record.rowNumber, sentColumn).setValue(new Date());
      sheet.getRange(record.rowNumber, COL.updatedAt).setValue(new Date());
    }
    sentCount++;
  });
  Logger.log(`Reminder completed. daysBefore=${daysBefore}, sent=${sentCount}, test=${Boolean(isTest)}`);
}

function sendConfirmationEmail_(data) {
  const subject = '【ご回答控え】祐輔・愛佳 結婚式Web招待状';
  const body = [
    `${data.name} 様`,
    '',
    'この度は、祐輔・愛佳の結婚式Web招待状にご回答いただきありがとうございます。',
    '以下の内容で承りました。',
    '',
    '【ご回答内容】',
    `氏名：${data.name}`,
    `挙式：${data.ceremonyAttendance}`,
    `披露宴：${data.receptionAttendance}`,
    `アレルギー：${data.allergy || 'なし'}`,
    '',
    '【日時】',
    APP_CONFIG.weddingDateLabel,
    `挙式：${APP_CONFIG.ceremonyTimeLabel}`,
    `披露宴：${APP_CONFIG.receptionTimeLabel}`,
    '',
    '【会場】',
    APP_CONFIG.venueName,
    APP_CONFIG.venueAddress,
    APP_CONFIG.mapUrl,
    '',
    data.invitationUrl ? `招待状ページ：${data.invitationUrl}` : '',
    '',
    '内容に変更がある場合は、新郎新婦まで直接ご連絡ください。',
    '',
    'Yusuke & Aika'
  ].filter(line => line !== null && line !== undefined).join('\n');

  MailApp.sendEmail({
    to: data.to,
    subject: subject,
    body: body,
    name: APP_CONFIG.senderName
  });
}

function sendReminderEmail_(data) {
  const subject = data.daysBefore === 7
    ? '【1週間前リマインド】祐輔・愛佳 結婚式のご案内'
    : '【前日リマインド】祐輔・愛佳 結婚式のご案内';

  const body = [
    `${data.name} 様`,
    '',
    data.daysBefore === 7
      ? '祐輔・愛佳の結婚式まで、あと1週間となりました。'
      : '祐輔・愛佳の結婚式は、いよいよ明日となりました。',
    '当日のご案内をあらためてお送りします。',
    '',
    '【ご回答内容】',
    `挙式：${data.ceremonyAttendance}`,
    `披露宴：${data.receptionAttendance}`,
    `アレルギー：${data.allergy || 'なし'}`,
    '',
    '【日時】',
    APP_CONFIG.weddingDateLabel,
    `挙式：${APP_CONFIG.ceremonyTimeLabel}`,
    `披露宴：${APP_CONFIG.receptionTimeLabel}`,
    '',
    '【会場】',
    APP_CONFIG.venueName,
    APP_CONFIG.venueAddress,
    APP_CONFIG.mapUrl,
    '',
    data.invitationUrl ? `招待状ページ：${data.invitationUrl}` : '',
    '',
    'お気をつけてお越しください。',
    '',
    'Yusuke & Aika'
  ].filter(line => line !== null && line !== undefined).join('\n');

  MailApp.sendEmail({
    to: data.to,
    subject: subject,
    body: body,
    name: APP_CONFIG.senderName
  });
}

function getMainSheet_() {
  const ss = SpreadsheetApp.openById(APP_CONFIG.spreadsheetId);
  if (APP_CONFIG.sheetName) {
    const named = ss.getSheetByName(APP_CONFIG.sheetName);
    if (named) return named;
  }
  return ss.getSheets()[0];
}

function ensureHeaders_(sheet) {
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  HEADERS.forEach((header, index) => {
    if (current[index] !== header) sheet.getRange(1, index + 1).setValue(header);
  });
}

function seedGuests_(sheet) {
  const records = readRecords_(sheet);
  const now = new Date();
  APP_CONFIG.guests.forEach(guest => {
    const guestId = normalizeGuestId_(guest.url);
    const invitationUrl = getInvitationUrl_(guestId);
    const record = records.find(r => r.values.url === guestId);
    if (record) {
      sheet.getRange(record.rowNumber, COL.url).setValue(guestId);
      sheet.getRange(record.rowNumber, COL.name).setValue(guest.displayName);
      sheet.getRange(record.rowNumber, COL.invitationUrl).setValue(invitationUrl);
      sheet.getRange(record.rowNumber, COL.updatedAt).setValue(now);
      return;
    }
    sheet.appendRow([
      guestId,
      guest.displayName,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      now,
      invitationUrl
    ]);
  });
}

function readRecords_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues();
  return values.map((row, index) => ({
    rowNumber: index + 2,
    values: {
      url: normalizeGuestId_(row[COL.url - 1]),
      name: row[COL.name - 1],
      email: row[COL.email - 1],
      ceremony: row[COL.ceremony - 1],
      reception: row[COL.reception - 1],
      allergy: row[COL.allergy - 1],
      submittedAt: row[COL.submittedAt - 1],
      confirmationSentAt: row[COL.confirmationSentAt - 1],
      reminder7SentAt: row[COL.reminder7SentAt - 1],
      reminder1SentAt: row[COL.reminder1SentAt - 1],
      updatedAt: row[COL.updatedAt - 1],
      invitationUrl: row[COL.invitationUrl - 1]
    }
  })).filter(record => record.values.url);
}

function findGuestRecord_(sheet, guestId) {
  return readRecords_(sheet).find(record => record.values.url === normalizeGuestId_(guestId));
}

function formatSheet_(sheet) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#8c2039')
    .setFontColor('#ffffff');
  sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), HEADERS.length)
    .setVerticalAlignment('middle');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function resetReminderTrigger_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendReminderEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('sendReminderEmails')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone(APP_CONFIG.timeZone)
    .create();
}

function output_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    const safeCallback = /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback) ? callback : 'callback';
    return ContentService.createTextOutput(`${safeCallback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function parsePostParams_(e) {
  if (!e) return {};
  if (e.postData && e.postData.type === 'application/json') return JSON.parse(e.postData.contents || '{}');
  return e.parameter || {};
}

function normalizeAttendance_(value) {
  const text = String(value || '').trim();
  if (['ご出席', '出席', 'attend', 'yes'].includes(text)) return 'ご出席';
  if (['ご欠席', '欠席', 'absent', 'no'].includes(text)) return 'ご欠席';
  return '';
}

function normalizeGuestId_(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^invitation-test\//, '')
    .replace(/index\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

function isCompleted_(values) {
  return isValidEmail_(values.email)
    && Boolean(normalizeAttendance_(values.ceremony))
    && Boolean(normalizeAttendance_(values.reception));
}

function isAttending_(ceremonyAttendance, receptionAttendance) {
  return ceremonyAttendance === 'ご出席' || receptionAttendance === 'ご出席';
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function daysBeforeWedding_(date) {
  const today = dateOnlyJst_(date);
  const wedding = dateOnlyJst_(new Date(APP_CONFIG.weddingDateIso));
  return Math.round((wedding.getTime() - today.getTime()) / 86400000);
}

function dateOnlyJst_(date) {
  const ymd = Utilities.formatDate(date, APP_CONFIG.timeZone, 'yyyy-MM-dd').split('-').map(Number);
  return new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2]));
}

function getInvitationUrl_(guestId) {
  return APP_CONFIG.baseInvitationUrl.replace(/\/$/, '/') + normalizeGuestId_(guestId) + '/';
}
