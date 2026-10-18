/**
 * PrivatDashboard – Rechnungs-Import aus Gmail
 * ------------------------------------------------------------
 * Läuft als Google Apps Script im Rechnungs-Postfach (z.B. zuhause.rechnungen@gmail.com).
 * Alle 10 Minuten werden neue Mails gelesen, Betrag / Fälligkeit / Rechnungsnummer / IBAN
 * erkannt und als Rechnung in Firestore gespeichert. Die App plant sie automatisch im
 * Monat der Fälligkeit als offene Ausgabe ein. PDF- und Bild-Anhänge landen im Safe (Belege).
 *
 * Einrichtung: siehe tools/ANLEITUNG-Rechnungen.md
 */

// ===== Einstellungen =====
const PROJECT_ID = 'mein-pdf-plan-manager';
// Nur Mails von diesen Absendern importieren (eure privaten Adressen, von denen ihr weiterleitet).
// Schutz vor Spam: Mails anderer Absender werden ignoriert. Leere Liste = alle Absender erlauben.
const ALLOWED_FROM = ['ajdin.slijepcevic1@gmail.com'];
const LABEL_DONE = 'Zuhause-importiert';
const SEARCH = 'in:inbox -label:Zuhause-importiert newer_than:60d';

// ===== Ab hier nichts ändern =====
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/households/main';
const CHUNK = 600000;

/** Einmal manuell ausführen: legt Label + 10-Minuten-Trigger an und importiert sofort. */
function setup() {
  label_();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('importRechnungen').timeBased().everyMinutes(10).create();
  importRechnungen();
}

/** Wird vom Trigger aufgerufen. */
function importRechnungen() {
  const done = label_();
  const threads = GmailApp.search(SEARCH, 0, 25);
  threads.forEach(function (th) {
    th.getMessages().forEach(function (msg) {
      try { importMessage_(msg); } catch (e) { console.error('Fehler bei Mail "' + msg.getSubject() + '": ' + e); }
    });
    th.addLabel(done);
  });
}

function importMessage_(msg) {
  const fromAddr = (msg.getFrom().match(/<([^>]+)>/) || [null, msg.getFrom()])[1].trim().toLowerCase();
  if (ALLOWED_FROM.length && ALLOWED_FROM.map(norm_).indexOf(norm_(fromAddr)) < 0) {
    console.log('Ignoriert (Absender nicht erlaubt): ' + fromAddr);
    return;
  }
  const id = 'm_' + msg.getId();
  if (exists_('bills/' + id)) return;

  const body = msg.getPlainBody() || '';
  let text = msg.getSubject() + '\n' + body;
  msg.getAttachments({includeInlineImages: false}).forEach(function (att) {
    const type = att.getContentType() || '';
    if (!/pdf|image\//i.test(type) || att.getSize() > 15e6) return;
    const fid = 'f' + Utilities.getUuid().replace(/-/g, '').slice(0, 18);
    uploadBlob_(fid, att.copyBlob());
    put_('files/' + fid, {id: fid, name: att.getName(), type: type, size: att.getSize(), date: ymd_(new Date()), by: '', tags: 'Rechnung',
      module: 'safe', folder: 'Belege', link: 'bills:' + id, createdAt: Date.now()});
    if (/pdf/i.test(type)) text += '\n' + pdfText_(att.copyBlob());
  });

  const p = parse_(text, msg.getDate());
  put_('bills/' + id, {
    id: id, source: 'mail', from: fromAddr, vendor: vendor_(msg.getFrom(), body), subject: msg.getSubject(),
    received: ymd_(msg.getDate()), amount: p.amount, due: p.due, invoiceNo: p.invoiceNo, iban: p.iban, reference: p.reference,
    cName: p.cName, cStreet: p.cStreet, cHouse: p.cHouse, cZip: p.cZip, cCity: p.cCity, cCountry: 'CH',
    status: 'neu', category: 'Sonstiges', note: '', createdAt: Date.now(),
  });
  console.log('Importiert: ' + msg.getSubject() + ' → ' + p.amount + ' CHF, fällig ' + p.due);
}

// ===== Erkennung =====
function parse_(text, date) {
  const t = String(text).replace(/ /g, ' ');
  const num = function (s) {
    s = String(s).replace(/['’\s]/g, '').replace(/\.[-–]$/, '');
    if (/,\d{2}$/.test(s) && s.indexOf('.') < 0) s = s.replace(',', '.'); else s = s.replace(/,/g, '');
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  };
  const amounts = [];
  const re = /(?:CHF|Fr\.|SFr\.?)\s*([0-9][0-9'’ .,]*[0-9](?:\.[-–])?)|([0-9][0-9'’.,]*[0-9])\s*(?:CHF|Fr\.)/gi;
  let m;
  while ((m = re.exec(t))) { const v = num(m[1] || m[2]); if (v !== null && v > 0 && v < 100000) amounts.push({v: v, i: m.index}); }
  let best = null;
  const kw = /(total|gesamtbetrag|gesamt|endbetrag|rechnungsbetrag|zu bezahlen|zahlbetrag|betrag|amount due|summe)/gi;
  while ((m = kw.exec(t))) {
    const near = amounts.filter(function (a) { return a.i >= m.index - 5 && a.i - m.index < 120; });
    if (near.length) { best = near[0].v; if (/total|gesamt|endbetrag|zu bezahlen|rechnungsbetrag/i.test(m[1])) break; }
  }
  if (best === null && amounts.length) best = Math.max.apply(null, amounts.map(function (a) { return a.v; }));

  let due = null;
  const dm = t.match(/(zahlbar bis|zahlbar am|fällig(?: am| bis)?|faellig|zahlungsfrist|bitte bis|bis spätestens|spätestens am|due date|fälligkeit)[^0-9]{0,30}(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/i);
  if (dm) { let y = +dm[4]; if (y < 100) y += 2000; due = y + '-' + pad_(dm[3]) + '-' + pad_(dm[2]); }
  else {
    const nd = t.match(/innert\s+(\d{1,3})\s+tag/i) || t.match(/(\d{1,3})\s+tage?\s+netto/i) || t.match(/zahlbar\s+(?:in|innerhalb)\s+(\d{1,3})\s+tag/i);
    if (nd) { const d = new Date(date); d.setDate(d.getDate() + Number(nd[1])); due = ymd_(d); }
  }
  const ibanM = t.match(/\b(?:CH|LI)\d{2}(?:\s?[0-9A-Z]{4}){4}\s?[0-9A-Z]\b/);
  const invM = t.match(/(rechnungs?\s?(?:-?nr\.?|nummer)|invoice (?:no\.?|number)|bestell(?:nummer|-?nr\.?))\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\/]{3,})/i);
  // Zahlungsreferenz: QR-Referenz (27 Ziffern) oder Creditor Reference (RF..)
  let reference = '';
  const qrr = t.match(/referenz[^\d]{0,25}((?:\d\s?){27})(?!\d)/i);
  const scor = t.match(/\bRF\d{2}(?:\s?[0-9A-Z]{1,4}){1,6}\b/);
  if (qrr) reference = qrr[1].replace(/\s/g, ''); else if (scor) reference = scor[0].replace(/\s/g, '');
  // Empfänger-Adresse: auf dem QR-Einzahlungsschein stehen nach der IBAN Name, Strasse, PLZ Ort
  const cred = {cName: '', cStreet: '', cHouse: '', cZip: '', cCity: ''};
  if (ibanM) {
    const lines = t.slice(ibanM.index + ibanM[0].length).split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 5);
    for (let i = 0; i < lines.length; i++) {
      const z = lines[i].match(/^(?:CH-)?(\d{4})\s+([A-Za-zÀ-ÿ .'\-]{2,35})$/);
      if (z) {
        cred.cZip = z[1]; cred.cCity = z[2].trim();
        const st = i >= 1 ? lines[i - 1] : '';
        const sm = st.match(/^(.*?)[\s,]+(\d+[a-zA-Z]?)$/);
        if (sm) { cred.cStreet = sm[1]; cred.cHouse = sm[2]; } else cred.cStreet = st;
        cred.cName = i >= 2 ? lines[i - 2] : (i === 1 ? lines[0] : '');
        if (/^\d|referenz|zahlbar|betrag/i.test(cred.cName)) cred.cName = '';
        break;
      }
    }
  }
  return {amount: best, due: due, iban: ibanM ? ibanM[0].replace(/\s/g, '') : '', invoiceNo: invM ? invM[2] : '', reference: reference,
    cName: cred.cName, cStreet: cred.cStreet, cHouse: cred.cHouse, cZip: cred.cZip, cCity: cred.cCity};
}

function vendor_(from, body) {
  // Bei weitergeleiteten Mails den ursprünglichen Absender aus dem Text holen
  const fw = String(body).match(/(?:^|\n)\s*(?:Von|From)\s*:\s*"?([^<"\n]+?)"?\s*(?:<[^>]+>|\n)/i);
  // Ohne Weiterleitungs-Kopf ist der Absender man selbst -> Firma unbekannt (App zeigt dann den Betreff)
  if (!fw && ALLOWED_FROM.length) return '';
  const raw = fw ? fw[1] : String(from).replace(/<[^>]+>/, '').replace(/"/g, '');
  const name = raw.trim();
  if (name && name.indexOf('@') < 0) return name.slice(0, 60);
  const dom = (String(fw ? fw[0] : from).match(/@([\w.-]+)/) || [null, ''])[1];
  return dom ? dom.replace(/^(mail|info|noreply|no-reply)\./, '').split('.').slice(-2, -1)[0] : 'Rechnung';
}

function pdfText_(blob) {
  // Benötigt den erweiterten Dienst "Drive API" (v3). Ohne ihn wird nur der Mailtext ausgewertet.
  try {
    const f = Drive.Files.create({name: 'zuhause-ocr-tmp', mimeType: 'application/vnd.google-apps.document'}, blob, {ocrLanguage: 'de'});
    const txt = DocumentApp.openById(f.id).getBody().getText();
    Drive.Files.remove(f.id);
    return txt;
  } catch (e) {
    console.warn('PDF-Text nicht lesbar: ' + e);
    return '';
  }
}

// ===== Firestore (REST) =====
function token_() { return ScriptApp.getOAuthToken(); }
function value_(v) {
  if (v === null || v === undefined) return {nullValue: null};
  if (typeof v === 'boolean') return {booleanValue: v};
  if (typeof v === 'number') return Number.isInteger(v) ? {integerValue: String(v)} : {doubleValue: v};
  if (typeof v === 'string') return {stringValue: v};
  if (Array.isArray(v)) return {arrayValue: {values: v.map(value_)}};
  return {mapValue: {fields: fields_(v)}};
}
function fields_(o) { const f = {}; Object.keys(o).forEach(function (k) { f[k] = value_(o[k]); }); return f; }
function put_(path, obj) {
  const r = UrlFetchApp.fetch(BASE + '/' + path, {
    method: 'patch', contentType: 'application/json', muteHttpExceptions: true,
    headers: {Authorization: 'Bearer ' + token_()}, payload: JSON.stringify({fields: fields_(obj)}),
  });
  if (r.getResponseCode() >= 300) throw new Error('Firestore ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
}
function exists_(path) {
  const r = UrlFetchApp.fetch(BASE + '/' + path, {headers: {Authorization: 'Bearer ' + token_()}, muteHttpExceptions: true});
  return r.getResponseCode() === 200;
}
function uploadBlob_(id, blob) {
  const bytes = blob.getBytes(), b64 = Utilities.base64Encode(bytes), n = Math.max(1, Math.ceil(b64.length / CHUNK));
  for (let i = 0; i < n; i++) put_('blobs/' + id + '/chunks/' + i, {d: b64.slice(i * CHUNK, (i + 1) * CHUNK)});
  put_('blobs/' + id, {n: n, type: blob.getContentType(), size: bytes.length});
}

// ===== Hilfsfunktionen =====
function label_() { return GmailApp.getUserLabelByName(LABEL_DONE) || GmailApp.createLabel(LABEL_DONE); }
function pad_(n) { return ('0' + n).slice(-2); }
// Gmail ignoriert Punkte und "+zusatz" im Namen: a.b+x@gmail.com == ab@gmail.com
function norm_(a) {
  a = String(a).trim().toLowerCase();
  const p = a.split('@');
  if (p[1] === 'gmail.com' || p[1] === 'googlemail.com') return p[0].split('+')[0].replace(/\./g, '') + '@gmail.com';
  return a;
}
function ymd_(d) { return Utilities.formatDate(d, 'Europe/Zurich', 'yyyy-MM-dd'); }

/** Zum Testen der Erkennung ohne Mail: im Editor ausführen und Protokoll ansehen. */
function testErkennung() {
  console.log(JSON.stringify(parse_('Rechnung Nr. 2026-1043\nTotal CHF 1\'249.90\nZahlbar bis 15.11.2026\nIBAN CH44 3199 9123 0008 8901 2', new Date())));
  console.log(JSON.stringify(parse_('Vielen Dank für Ihre Bestellung. Gesamtbetrag: 89,50 CHF. Zahlbar innert 30 Tagen.', new Date())));
}
