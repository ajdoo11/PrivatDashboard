'use strict';
/* =========================================================
   Unser Zuhause – Familien-App (Prototyp, lokale Speicherung)
   Datenhaltung: localStorage (Daten) + IndexedDB (Dateien).
   Später: Store-Funktionen durch Firebase (Firestore/Storage) ersetzen.
   ========================================================= */

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d || 1); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate()+n); return iso(d); };
const daysIn = (y, m) => new Date(y, m, 0).getDate(); // m = 1..12
const addMonths = (s, n) => {
  const d = parse(s), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n);
  d.setDate(Math.min(day, daysIn(d.getFullYear(), d.getMonth()+1))); return iso(d);
};
const curMonth = () => today().slice(0, 7);
const mAdd = (mk, n) => { const [y,m] = mk.split('-').map(Number); const d = new Date(y, m-1+n, 1); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
const mDiff = (a, b) => { const [ay,am] = a.split('-').map(Number), [by,bm] = b.split('-').map(Number); return (by-ay)*12 + (bm-am); };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const mondayOf = s => addDays(s, -((parse(s).getDay()+6) % 7));
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MSHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const WD = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const WDL = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const fmtD = s => s ? `${s.slice(8,10)}.${s.slice(5,7)}.${s.slice(0,4)}` : '';
const fmtDs = s => s ? `${s.slice(8,10)}.${s.slice(5,7)}.` : '';
const fmtM = mk => `${MONTHS[+mk.slice(5,7)-1]} ${mk.slice(0,4)}`;
const wdShort = s => ['So','Mo','Di','Mi','Do','Fr','Sa'][parse(s).getDay()];
const wdLong = s => WDL[parse(s).getDay()];
const chf = n => 'CHF ' + Number(n || 0).toLocaleString('de-CH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const chf0 = n => 'CHF ' + Math.round(Number(n || 0)).toLocaleString('de-CH');
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sizeFmt = b => b > 1e6 ? (b/1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b/1e3)) + ' KB';
const ext = n => (n.split('.').pop() || '').slice(0, 4);
const relDay = s => { const d = daysBetween(today(), s); return d === 0 ? 'Heute' : d === 1 ? 'Morgen' : d === -1 ? 'Gestern' : `${wdShort(s)} ${fmtDs(s)}`; };
const inDays = d => d === 0 ? 'heute' : d === 1 ? 'morgen' : d < 0 ? `vor ${-d} Tagen` : `in ${d} Tagen`;

// ---------- Konstanten ----------
const CATS = ['Wohnen','Lebensmittel','Kinder','Haushalt','Mobilität','Versicherungen','Gesundheit','Abos & Verträge','Freizeit','Restaurant','Kleidung','Geschenke','Haus/Bau','Steuern','Sonstiges'];
const INC_CATS = ['Lohn','Nebeneinkommen','Kinderzulagen','Sonstiges'];
const KINDS = [['variable','Variable Kosten'],['fixed','Fixkosten'],['income','Einnahme'],['saving','Sparen']];
const KIND_L = {variable:'Variable Kosten', fixed:'Fixkosten', income:'Einnahmen', saving:'Sparen'};
const REPEAT = [['none','Keine'],['weekly','Wöchentlich'],['biweekly','Alle 2 Wochen'],['monthly','Monatlich'],['yearly','Jährlich']];
const INTERVALS = [['1','Monatlich'],['3','Vierteljährlich'],['6','Halbjährlich'],['12','Jährlich']];
const ivLabel = v => ({1:'monatlich',3:'vierteljährlich',6:'halbjährlich',12:'jährlich'}[+v] || 'monatlich');
const SAFE_FOLDERS = ['Ausweise','Versicherungen','Verträge','Steuern','Bank & Finanzen','Gesundheit','Kinder','Fahrzeug','Wohnen','Belege','Sonstiges'];
const CONTRACT_CATS = ['Krankenkasse','Versicherung','Telefon & Internet','Streaming & Abos','Strom & Energie','Fahrzeug','Bank','Mitgliedschaft','Sonstiges'];
const HOUSE_STATUS = [['geplant','Geplant'],['offeriert','Offeriert'],['vergeben','Vergeben'],['bezahlt','Bezahlt']];
const HOUSE_FCAT = ['Plan','Foto','Dokument','Inspiration'];
const COLORS = ['#2563eb','#db2777','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#84cc16'];

// ---------- Icons ----------
const I = {
  grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  cal:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  wallet:'<rect x="2.5" y="5.5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.5-1.2L21 7.5H6.4"/>',
  house:'<path d="M3 21h18"/><path d="M5 21V10l7-5.5 7 5.5v11"/><path d="M9.5 21v-5.5h5V21"/>',
  lock:'<rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  unlock:'<rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.8-1.2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  right:'<path d="m9 18 6-6-6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  gear:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  clip:'<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15.5 7"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M15 9.3c-.5-.9-1.6-1.4-3-1.4-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.4M12 6.3v11.4"/>',
  task:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  alert:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  phone:'<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  food:'<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2.5 1-4 4-4 8h4"/>',
  chart:'<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cake:'<path d="M4 21v-8h16v8M2 21h20M4 16.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5M12 9v4M12 5.5v.01"/>',
  shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21a2.1 2.1 0 0 1-3-3L18 9.7"/><path d="M14.7 6.3 17.5 3.5a4 4 0 0 0-5 5L3.5 17.5"/>',
  note:'<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  ruler:'<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
};
const ic = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;

// ---------- Store ----------
const KEY = 'zuhause.v1';
const SKEY = 'zuhause.settings';
let S = null;
function blank() {
  return {
    v: 1,
    settings: {activeUser: null, theme: 'auto', pinHash: null, pinSalt: null},
    flags: {demo: false},
    members: [], events: [], tasks: [],
    templates: [], months: {}, entries: [], goals: [],
    lists: [], items: [], recipes: [], meals: {},
    house: {name: 'Unser Haus', budget: null, start: '', moveIn: '', address: '', note: ''},
    units: [], rooms: [], hcosts: [], offers: [], milestones: [], contacts: [], defects: [], hnotes: [],
    files: [], contracts: [], warranties: [], bills: [],
  };
}
function migrate() {
  const b = blank();
  for (const k in b) if (S[k] == null) S[k] = b[k];
  S.settings = {...b.settings, ...S.settings};
  S.house = {...b.house, ...S.house};
  if (!S.members.length) S.members = [
    {id: 'u1', name: 'Ajdin', role: 'adult', color: COLORS[0]},
    {id: 'u2', name: 'Elma', role: 'adult', color: COLORS[1]},
  ];
  if (!byId('members', S.settings.activeUser)) S.settings.activeUser = S.members[0].id;
}
function persist() { try { localStorage.setItem(SKEY, JSON.stringify(S.settings)); } catch (e) {} syncDiff(); }
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(persist, 120); }
function commit() { save(); render(); }
const col = n => S[n] || (S[n] = []);
const byId = (n, id) => id ? col(n).find(x => x.id === id) : undefined;
function upsert(n, obj) {
  if (obj.id) {
    const i = col(n).findIndex(x => x.id === obj.id);
    if (i >= 0) { col(n)[i] = {...col(n)[i], ...obj}; return col(n)[i]; }
  }
  const o = {...obj, id: obj.id || uid(), createdAt: obj.createdAt || Date.now()};
  col(n).push(o); return o;
}
function remove(n, id) { S[n] = col(n).filter(x => x.id !== id); }
const myEmail = () => (cloud.user && cloud.user.email || '').toLowerCase();
const me = () => S.members.find(m => m.email && m.email === myEmail()) || byId('members', S.settings.activeUser) || adults()[0] || S.members[0];
const mem = id => byId('members', id);
const adults = () => S.members.filter(m => m.role !== 'kind');
const avatar = (m, size = 28) => m ? `<span class="av" style="background:${esc(m.color)};width:${size}px;height:${size}px;font-size:${Math.round(size*.45)}px">${esc((m.name || '?')[0].toUpperCase())}</span>` : '';
const memberOpts = (withAll) => [...(withAll ? [['all', 'Alle / gemeinsam']] : []), ...S.members.map(m => [m.id, m.name])];

// ---------- Dateien (IndexedDB) ----------
const IDB = {
  db: null,
  open() {
    return this.db || (this.db = new Promise((res, rej) => {
      const r = indexedDB.open('zuhause-files', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('blobs', mode), req = fn(t.objectStore('blobs'));
      t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
    });
  },
  put(id, blob) { return this.run('readwrite', s => s.put(blob, id)); },
  get(id) { return this.run('readonly', s => s.get(id)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
  clear() { return this.run('readwrite', s => s.clear()); },
};
const urlCache = {};
async function fileURL(id) {
  if (urlCache[id]) return urlCache[id];
  try {
    let b = await IDB.get(id);
    if (!b && cloud.on) { b = await cloudGetBlob(id); if (b) IDB.put(id, b).catch(() => {}); }
    if (!b) return null;
    return urlCache[id] = URL.createObjectURL(b);
  } catch (e) { console.error(e); return null; }
}
function shrinkImage(file, max = 2400, q = .85) {
  return new Promise(res => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      if (k === 1 && file.size < 2.5e6) { URL.revokeObjectURL(u); return res(file); }
      const c = document.createElement('canvas'); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(u); res(b && b.size < file.size ? b : file); }, 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(u); res(file); };
    img.src = u;
  });
}
function pickFiles(meta, {accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv', after} = {}) {
  const inp = $('#filepick'); inp.value = ''; inp.accept = accept;
  inp.onchange = async () => {
    const files = [...inp.files]; if (!files.length) return;
    await storeFiles(files, meta);
    commit(); after && after();
  };
  inp.click();
}
async function storeFiles(files, meta) {
  if (!files.length) return 0;
  toast('Speichere …');
  let n = 0;
  for (const f of files) {
    let blob = f;
    if (/^image\/(jpeg|png|webp|heic)/.test(f.type)) blob = await shrinkImage(f);
    const id = uid();
    if (blob.size > 20e6) { toast(`${f.name} ist zu gross (max. 20 MB)`); continue; }
    try { await IDB.put(id, blob); } catch (e) {}
    try { await cloudPutBlob(id, blob); } catch (e) { console.error(e); toast('Upload fehlgeschlagen: ' + (e.code || e.message)); continue; }
    const name = blob !== f && !/\.jpe?g$/i.test(f.name) ? f.name.replace(/\.\w+$/, '') + '.jpg' : f.name;
    col('files').push({id, name, type: blob.type || f.type || 'application/octet-stream', size: blob.size, date: today(), by: me().id, tags: '', createdAt: Date.now(), ...meta});
    n++;
  }
  toast(n === 1 ? 'Datei gespeichert' : `${n} Dateien gespeichert`);
  return n;
}
// Anhänge als Chips: Bilder mit Vorschau, PDFs mit Symbol, plus «anhängen»-Knopf
function attachChips(c, id, addLabel = 'PDF / Foto anhängen') {
  const fs = linkedFiles(c + ':' + id);
  return `<div class="fchips">${fs.map(f => `<button class="fchip" data-a="fileOpen" data-id="${f.id}">${isImg(f) ? `<img data-fid="${f.id}" alt="">` : ic('file', 16)}<span>${esc(f.name)}</span></button>`).join('')}<button class="fchip add" data-a="attach" data-c="${c}" data-id="${id}">${ic('clip', 15)} ${fs.length ? 'weitere' : addLabel}</button></div>`;
}
function hydrate() {
  document.querySelectorAll('img[data-fid]:not([src])').forEach(async img => {
    const u = await fileURL(img.dataset.fid);
    if (u) img.src = u; else img.outerHTML = `<span class="fic">${ic('image', 26)}</span>`;
  });
}
const isImg = f => (f.type || '').startsWith('image/');
function fileTile(f) {
  return `<button class="ftile" data-a="fileOpen" data-id="${f.id}" title="${esc(f.name)}">${isImg(f) ? `<img data-fid="${f.id}" alt="">` : `<span class="fic">${ic('file', 26)}<small>${esc(ext(f.name))}</small></span>`}<span class="fname">${esc(f.name)}</span></button>`;
}
const linkedFiles = link => S.files.filter(f => f.link === link);
function fileStrip(link) { const fs = linkedFiles(link); return fs.length ? `<div class="strip">${fs.map(fileTile).join('')}</div>` : ''; }

// ---------- PIN / Safe ----------
let safeUnlocked = 0;
async function sha(s) {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0x811c9dc5, h2 = 0x1234567;
  for (let r = 0; r < 500; r++) for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = Math.imul(h2 ^ s.charCodeAt(i) ^ r, 2654435761); }
  return (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
}
const hashPin = (pin, salt) => sha(salt + ':' + pin);
const safeLocked = () => !!S.settings.pinHash && Date.now() - safeUnlocked > 5 * 60e3;

// ---------- UI-Grundgerüst ----------
const ui = {
  calMonth: curMonth(), calDay: today(), calFilter: 'all', finMonth: curMonth(), statMonth: curMonth(),
  shopList: null, mealWeek: mondayOf(today()), houseFilter: '', hFileCat: 'Alle', defectFilter: 'offen',
  safeFolder: 'Alle', safeQ: '', focusQuick: false,
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2400); }
function modal(html, {onMount, accent} = {}) {
  const m = $('#modal');
  const ac = accent || curAccent();
  m.innerHTML = `<div class="mbg" data-close></div><div class="sheet" style="--maccent:var(--${ac});--mgrad:var(--g-${ac})">${html}</div>`;
  m.classList.add('open'); document.body.classList.add('noscroll');
  onMount && onMount(m.querySelector('.sheet'));
}
function closeModal() { const m = $('#modal'); const was = m.classList.contains('open'); m.classList.remove('open'); m.innerHTML = ''; document.body.classList.remove('noscroll'); if (was && cloud.pendingRender) setTimeout(flushRemoteRender, 0); }
const MODS = [['home','Home','grid','primary'],['cal','Kalender','cal','cal'],['fin','Finanzen','wallet','fin'],['shop','Einkauf','cart','shop'],['house','Haus','house','house'],['safe','Safe','lock','safe']];
const curAccent = () => (MODS.find(m => m[0] === route().mod) || [0,0,0,'primary'])[3];

function fieldHTML(f, val) {
  if (f.t === 'html') return f.html;
  val = val ?? f.def ?? '';
  const cls = f.half ? ' class="half"' : '';
  let inp;
  switch (f.t) {
    case 'select':
      inp = `<select name="${f.k}">${f.opt.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`; break;
    case 'textarea':
      inp = `<textarea name="${f.k}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`; break;
    case 'check':
      return `<label class="chkline${f.half ? ' half' : ''}"><input type="checkbox" name="${f.k}"${val ? ' checked' : ''}><span>${esc(f.l)}</span></label>`;
    case 'number':
      inp = `<input name="${f.k}" type="text" inputmode="decimal" autocomplete="off" value="${val === '' || val == null ? '' : esc(val)}" placeholder="${esc(f.ph || '')}">`; break;
    default:
      inp = `<input name="${f.k}" type="${f.t || 'text'}" autocomplete="off" value="${esc(val)}" placeholder="${esc(f.ph || '')}"${f.list ? ` list="${f.list}"` : ''}${f.im ? ` inputmode="${f.im}"` : ''}>`;
  }
  return `<label${cls}>${esc(f.l)}${inp}</label>`;
}
function attachBox(attach, data) {
  const fs = data.id ? linkedFiles(attach.coll + ':' + data.id) : [];
  return `<div class="attach"><div class="l">${esc(attach.label || 'Dateien (PDF oder Foto)')}</div>
    ${fs.length ? `<div class="fchips" style="margin:0 0 10px">${fs.map(f => `<span class="fchip">${isImg(f) ? `<img data-fid="${f.id}" alt="">` : ic('file', 16)}<span>${esc(f.name)}</span><button type="button" class="x" data-a="attachDel" data-id="${f.id}" aria-label="Entfernen">${ic('x', 14)}</button></span>`).join('')}</div>` : ''}
    <label class="filebtn">${ic('clip', 16)} ${fs.length ? 'Weitere Datei' : 'Datei auswählen'}<input type="file" name="__files" multiple accept="${attach.accept || 'image/*,application/pdf'}" hidden></label>
    <div class="fsel"></div></div>`;
}
function form({title, fields, data = {}, onSave, onDelete, saveLabel = 'Speichern', extra = '', accent, attach}) {
  modal(`<div class="mh"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Schliessen">${ic('x')}</button></div>
    <form class="f" id="mform" novalidate>${fields.map(f => fieldHTML(f, data[f.k])).join('')}${attach ? attachBox(attach, data) : ''}${extra}
    <div class="mf">${onDelete ? `<button type="button" class="btn danger" id="mdel">${ic('trash', 17)} Löschen</button>` : ''}<span class="sp"></span><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">${esc(saveLabel)}</button></div></form>`,
  {accent, onMount(el) {
    const fm = el.querySelector('#mform');
    fm.onsubmit = async e => {
      e.preventDefault();
      const v = {};
      for (const f of fields) {
        if (f.t === 'html' || !f.k) continue;
        const inp = fm.elements[f.k]; if (!inp) continue;
        let val;
        if (f.t === 'check') val = inp.checked;
        else if (f.t === 'number') { const raw = inp.value.replace(/['’\s]/g, '').replace(',', '.'); val = raw === '' ? null : parseFloat(raw); if (raw !== '' && isNaN(val)) { inp.classList.add('err'); inp.focus(); return; } }
        else val = inp.value.trim();
        if (f.req && (val === '' || val == null)) { inp.classList.add('err'); inp.focus(); return; }
        v[f.k] = val;
      }
      const r = await onSave(v, fm);
      if (r === false) return;
      const fin = fm.elements.__files;
      if (attach && fin && fin.files.length && r && r.id) await storeFiles([...fin.files], {...(attach.meta ? attach.meta(r) : {}), link: attach.coll + ':' + r.id});
      closeModal(); commit();
    };
    const fin = fm.elements.__files;
    if (fin) fin.onchange = () => { fm.querySelector('.fsel').textContent = fin.files.length ? [...fin.files].map(f => '📎 ' + f.name).join(', ') + ' – wird beim Speichern hinzugefügt' : ''; };
    hydrate();
    if (onDelete) el.querySelector('#mdel').onclick = () => { if (confirm('Wirklich löschen?')) { onDelete(); closeModal(); commit(); } };
  }});
}

function route() { const p = (location.hash.replace(/^#\/?/, '') || 'home').split('/'); return {mod: p[0] || 'home', tab: p[1] || '', arg: p[2] || ''}; }
const go = h => { location.hash = h; };
const MOD_IC = {cal: 'cal', fin: 'wallet', shop: 'cart', house: 'house', safe: 'lock', settings: 'users'};
function page({title, accent, mod, tabs, tab, actions = '', body, back}) {
  return `<div class="pg" style="--accent:var(--${accent});--grad:var(--g-${accent})">
    <header class="top">${back ? `<a class="icon-btn" href="${back}" aria-label="Zurück">${ic('left')}</a>` : `<span class="hic">${ic(MOD_IC[mod] || 'grid', 21)}</span>`}<h1>${esc(title)}</h1><span class="sp"></span>${actions}</header>
    ${tabs ? `<div class="tabs">${tabs.map(([k, l]) => `<a class="tab${k === tab ? ' on' : ''}" href="#/${mod}/${k}">${esc(l)}</a>`).join('')}</div>` : ''}
    <div class="wrap">${body}</div></div>`;
}
function navHTML(cur) {
  return `<div class="in">${MODS.map(([k, l, i, c]) => `<a href="#/${k === 'home' ? '' : k}" class="${cur === k || (k === 'home' && cur === 'settings') ? 'on' : ''}" style="--c:var(--${c})"><span class="ni">${ic(i, 21)}</span><span>${l}</span></a>`).join('')}</div>`;
}
const views = {};
function applyTheme() { const t = S.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; }
function render() {
  const r = route();
  let html;
  try { html = (views[r.mod] || views.home)(r); }
  catch (e) { console.error(e); html = `<div class="wrap" style="padding-top:30px"><div class="card"><b>Fehler:</b> ${esc(e.message)}</div></div>`; }
  $('#app').innerHTML = html;
  $('#nav').innerHTML = navHTML(r.mod);
  document.body.style.setProperty('--accent-bg', `var(--${curAccent()})`);
  hydrate();
  if (ui.focusQuick) { ui.focusQuick = false; const q = $('#qadd input'); q && q.focus(); }
}

// ---------- Kalender-Logik ----------
function expand(start, rep, from, to) {
  const r = [];
  if (!start) return r;
  if (!rep || rep === 'none') { if (start >= from && start <= to) r.push(start); return r; }
  if (start > to) return r;
  if (rep === 'weekly' || rep === 'biweekly') {
    const step = rep === 'weekly' ? 7 : 14;
    let d = start;
    if (d < from) d = addDays(start, Math.floor(daysBetween(start, from) / step) * step);
    for (let g = 0; d <= to && g < 500; g++) { if (d >= from) r.push(d); d = addDays(d, step); }
  } else {
    const step = rep === 'monthly' ? 1 : 12;
    let n = start < from ? Math.max(0, Math.floor(mDiff(start.slice(0, 7), from.slice(0, 7)) / step) - 1) : 0;
    for (let g = 0; g < 500; g++, n++) { const d = addMonths(start, n * step); if (d > to) break; if (d >= from) r.push(d); }
  }
  return r;
}
function contractInfo(c) {
  if (!c.endDate) return {};
  let end = c.endDate;
  const notice = +c.noticeMonths || 0, renew = +c.renewMonths || 12;
  let deadline = addMonths(end, -notice);
  for (let g = 0; c.autoRenew && deadline < today() && g < 60; g++) { end = addMonths(end, renew); deadline = addMonths(end, -notice); }
  return {end, deadline, days: daysBetween(today(), deadline)};
}
const wEnd = w => w.date && w.months ? addMonths(w.date, +w.months) : '';
function occ(from, to) {
  const out = [], u = me().id;
  const push = (date, o) => { if (date >= from && date <= to) out.push({date, ...o}); };
  for (const e of S.events) {
    if (!e.shared && e.owner && e.owner !== u) continue;
    const color = e.color || mem(e.owner)?.color || 'var(--cal)';
    const base = {title: e.title, time: e.time || '', timeEnd: e.timeEnd || '', kind: e.type || 'termin', color, ref: ['events', e.id], shared: !!e.shared, owner: e.owner, icon: e.type === 'geburtstag' ? 'cake' : 'cal'};
    for (const d of expand(e.date, e.repeat, from, to)) {
      let t = base.title; if (e.type === 'geburtstag' && e.birthYear) t += ` (${+d.slice(0, 4) - e.birthYear})`;
      push(d, {...base, title: t});
    }
    if ((!e.repeat || e.repeat === 'none') && e.end && e.end > e.date) {
      let d = addDays(e.date, 1);
      for (let g = 0; d <= e.end && d <= to && g < 120; g++) { push(d, {...base, title: base.title + ' (Forts.)'}); d = addDays(d, 1); }
    }
  }
  for (const m of S.members) if (m.birthday) for (const d of expand(m.birthday, 'yearly', from, to))
    push(d, {title: `Geburtstag ${m.name} (${+d.slice(0, 4) - +m.birthday.slice(0, 4)})`, kind: 'geburtstag', color: m.color, icon: 'cake', ref: ['members', m.id]});
  for (const t of S.tasks) if (t.due && !t.done) push(t.due, {title: t.title, kind: 'aufgabe', color: 'var(--muted)', icon: 'task', ref: ['tasks', t.id], task: true});
  for (const m of S.milestones) if (m.date) push(m.date, {title: 'Haus: ' + m.title, kind: 'haus', color: 'var(--house)', icon: 'house', ref: ['milestones', m.id]});
  for (const c of S.hcosts) if (c.due && c.status !== 'bezahlt') push(c.due, {title: 'Zahlung Haus: ' + c.title, kind: 'haus', color: 'var(--house)', icon: 'coin', ref: ['hcosts', c.id]});
  for (const c of S.contracts) { const i = contractInfo(c); if (i.deadline) push(i.deadline, {title: 'Kündigungsfrist: ' + c.name, kind: 'safe', color: 'var(--safe)', icon: 'alert', ref: ['contracts', c.id]}); }
  for (const w of S.warranties) { const e = wEnd(w); if (e) push(e, {title: 'Garantie endet: ' + w.item, kind: 'safe', color: 'var(--safe)', icon: 'shield', ref: ['warranties', w.id]}); }
  for (const f of S.files) if (f.expiry) push(f.expiry, {title: 'Läuft ab: ' + f.name, kind: 'safe', color: 'var(--safe)', icon: 'file', ref: ['files', f.id]});
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'));
}
const KIND_LABEL = {termin: 'Termin', geburtstag: 'Geburtstag', erinnerung: 'Erinnerung', ferien: 'Ferien', aufgabe: 'Aufgabe', haus: 'Haus', safe: 'Safe'};
function occRow(o) {
  const [c, id] = o.ref || [];
  const who = o.owner && mem(o.owner) && o.kind !== 'geburtstag' ? mem(o.owner).name : '';
  const sub = [KIND_LABEL[o.kind] || 'Termin', c === 'events' ? (o.shared ? 'gemeinsam' : 'privat') : '', who].filter(Boolean).map(esc).join(' · ');
  const time = o.task ? `<button class="chk" data-a="taskToggle" data-id="${id}" aria-label="Erledigt"></button>`
    : o.time ? `<div class="evt"><b>${esc(o.time)}</b>${o.timeEnd ? `<small>${esc(o.timeEnd)}</small>` : ''}</div>` : `<div class="evt"><small>ganzer</small><small>Tag</small></div>`;
  return `<div class="ev" style="--ec:${o.color || 'var(--cal)'}">${time}<div class="grow clickable" data-a="edit" data-c="${c}" data-id="${id}"><div class="t">${esc(o.title)}</div><div class="s">${sub}</div></div><span class="evi">${ic(o.icon || 'cal', 17)}</span></div>`;
}
const EV_COLORS = [['', 'Farbe der Person'], ['#4f7cff', 'Blau'], ['#10b981', 'Grün'], ['#f59e0b', 'Orange'], ['#ef4444', 'Rot'], ['#8b5cf6', 'Lila'], ['#ec4899', 'Pink'], ['#0ea5a4', 'Türkis'], ['#64748b', 'Grau']];

// ---------- Finanz-Logik ----------
function tplApplies(t, mk) {
  if (t.active === false) return false;
  const s = t.startMonth || '2000-01';
  if (mk < s || (t.endMonth && mk > t.endMonth)) return false;
  return mDiff(s, mk) % (+t.interval || 1) === 0;
}
function ensureMonth(mk) {
  const m = S.months[mk] || (S.months[mk] = {closed: false, gen: []});
  if (m.closed) return;
  let ch = false;
  for (const t of S.templates) {
    if (m.gen.includes(t.id) || !tplApplies(t, mk)) continue;
    const [y, mo] = mk.split('-').map(Number);
    S.entries.push({id: 't_' + t.id + '_' + mk, month: mk, name: t.name, amount: +t.amount || 0, kind: t.kind, category: t.category, paid: false, paidAt: '', templateId: t.id,
      due: t.dueDay ? `${mk}-${pad(Math.min(+t.dueDay, daysIn(y, mo)))}` : '', createdAt: Date.now()});
    m.gen.push(t.id); ch = true;
  }
  if (ch) save();
}
const ents = mk => S.entries.filter(e => e.month === mk);
function totals(mk) {
  const t = {income: 0, fixed: 0, variable: 0, saving: 0};
  for (const e of ents(mk)) t[e.kind] = (t[e.kind] || 0) + (+e.amount || 0);
  t.out = t.fixed + t.variable; t.free = t.income - t.out; t.rest = t.free - t.saving;
  return t;
}
function syncTemplate(t) {
  const cm = curMonth();
  S.entries = S.entries.filter(e => {
    if (e.templateId !== t.id || e.paid || e.month < cm || S.months[e.month]?.closed) return true;
    if (!tplApplies(t, e.month)) return false;
    Object.assign(e, {name: t.name, amount: +t.amount || 0, category: t.category, kind: t.kind});
    return true;
  });
  for (const mk in S.months) if (mk >= cm && !S.months[mk].closed && !S.entries.some(e => e.templateId === t.id && e.month === mk))
    S.months[mk].gen = S.months[mk].gen.filter(x => x !== t.id);
}
function deleteTemplate(id) {
  const cm = curMonth();
  remove('templates', id);
  S.entries = S.entries.filter(e => !(e.templateId === id && !e.paid && e.month >= cm && !S.months[e.month]?.closed));
}
function deleteEntry(id) { remove('entries', id); S.items.forEach(i => { if (i.budgetEntryId === id) i.budgetEntryId = null; }); (S.bills || []).forEach(b => { if (b.entryId === id) { b.entryId = null; b.status = 'ignoriert'; } }); }
function syncContract(c) {
  const t = S.templates.find(t => t.contractId === c.id);
  if (!c.inBudget || !(+c.amount)) { if (t) deleteTemplate(t.id); return; }
  const data = {name: c.name, amount: +c.amount, kind: 'fixed', interval: +c.interval || 1,
    category: ['Krankenkasse', 'Versicherung'].includes(c.category) ? 'Versicherungen' : c.category === 'Fahrzeug' ? 'Mobilität' : c.category === 'Strom & Energie' ? 'Wohnen' : 'Abos & Verträge',
    dueDay: c.start ? parse(c.start).getDate() : 1, startMonth: c.start ? c.start.slice(0, 7) : curMonth(), contractId: c.id, active: true};
  if (t) { Object.assign(t, data); syncTemplate(t); } else upsert('templates', data);
}
function monthOpts(center = curMonth(), back = 12, fwd = 12) { const o = []; for (let i = -back; i <= fwd; i++) { const mk = mAdd(center, i); o.push([mk, fmtM(mk)]); } return o; }
function goalSaved(g) { return (+g.start || 0) + S.entries.filter(e => e.kind === 'saving' && e.goalId === g.id).reduce((a, e) => a + (+e.amount || 0), 0); }

// ---------- Haus-Logik ----------
const has = v => v !== null && v !== undefined && v !== '';
const costNow = c => has(c.actual) ? +c.actual : has(c.offer) ? +c.offer : (+c.budget || 0);
function houseStats() {
  let planned = 0, stand = 0, paid = 0;
  for (const c of S.hcosts) { planned += +c.budget || 0; stand += costNow(c); if (c.status === 'bezahlt') paid += costNow(c); }
  const budget = +S.house.budget || 0;
  return {budget, planned, stand, paid, reserve: budget - stand};
}
const roomStand = r => S.hcosts.filter(c => c.roomId === r.id).reduce((a, c) => a + costNow(c), 0);
const unitStand = u => S.hcosts.filter(c => c.unitId === u.id).reduce((a, c) => a + costNow(c), 0);
const unitBudget = u => has(u.budget) ? +u.budget : S.rooms.filter(r => r.unitId === u.id).reduce((a, r) => a + (+r.budget || 0), 0);
function scopeLabel(c) {
  if (c.roomId) { const r = byId('rooms', c.roomId), u = r && byId('units', r.unitId); return (u ? u.name + ' › ' : '') + (r ? r.name : '?'); }
  if (c.unitId) return byId('units', c.unitId)?.name || '?';
  return 'Allgemein';
}
function scopeOpts() {
  const o = [['', 'Allgemein / ganzes Haus']];
  for (const u of S.units) { o.push(['u:' + u.id, u.name + ' (gesamt)']); for (const r of S.rooms.filter(r => r.unitId === u.id)) o.push(['r:' + r.id, '   › ' + u.name + ' – ' + r.name]); }
  return o;
}
const scopeVal = c => c.roomId ? 'r:' + c.roomId : c.unitId ? 'u:' + c.unitId : '';
function applyScope(o, v) {
  o.roomId = v && v.startsWith('r:') ? v.slice(2) : null;
  o.unitId = v && v.startsWith('u:') ? v.slice(2) : (o.roomId ? byId('rooms', o.roomId)?.unitId || null : null);
}
const roomOpts = () => [['', '– kein Raum –'], ...S.rooms.map(r => [r.id, (byId('units', r.unitId)?.name ? byId('units', r.unitId).name + ' – ' : '') + r.name])];
const contactOpts = () => [['', '– kein Kontakt –'], ...S.contacts.map(c => [c.id, c.name + (c.company ? ' (' + c.company + ')' : '')])];
const statusBadge = s => `<span class="badge ${s === 'bezahlt' ? 'ok' : s === 'vergeben' ? 'house' : s === 'offeriert' ? 'warn' : ''}">${esc((HOUSE_STATUS.find(x => x[0] === s) || [0, 'Geplant'])[1])}</span>`;

// ---------- Hinweise ----------
function alerts() {
  const a = [], t = today();
  for (const c of S.contracts) { const i = contractInfo(c); if (i.deadline && i.days >= 0 && i.days <= 60) a.push({lvl: i.days <= 14 ? 'danger' : 'warn', icon: 'alert', t: `${c.name}: kündbar bis ${fmtD(i.deadline)}`, s: `Kündigungsfrist ${inDays(i.days)}`, c: 'contracts', id: c.id}); }
  for (const w of S.warranties) { const e = wEnd(w); if (e) { const d = daysBetween(t, e); if (d >= 0 && d <= 45) a.push({lvl: 'warn', icon: 'shield', t: `Garantie ${w.item} endet ${fmtD(e)}`, s: `noch ${d} Tage – Mängel jetzt melden`, c: 'warranties', id: w.id}); } }
  for (const f of S.files) if (f.expiry) { const d = daysBetween(t, f.expiry); if (d <= 90) a.push({lvl: d < 0 ? 'danger' : 'warn', icon: 'file', t: `${f.name} ${d < 0 ? 'ist abgelaufen' : 'läuft ab'}`, s: `${fmtD(f.expiry)} (${inDays(d)})`, c: 'files', id: f.id}); }
  for (const b of (S.bills || [])) { const st = billStatus(b); if (st === 'pruefen') a.push({lvl: 'warn', icon: 'receipt', t: `Rechnung ${b.vendor || b.subject || ''}: Betrag prüfen`, s: 'Betrag wurde nicht erkannt', c: 'bills', id: b.id}); else if (st === 'offen' && b.due) { const d = daysBetween(t, b.due); if (d <= 5) a.push({lvl: d < 0 ? 'danger' : 'warn', icon: 'receipt', t: `Rechnung ${b.vendor || ''} ${d < 0 ? 'überfällig' : 'bald fällig'}`, s: `zahlbar bis ${fmtD(b.due)} (${inDays(d)})`, c: 'bills', id: b.id}); } }
  const od = S.tasks.filter(x => !x.done && x.due && x.due < t);
  if (od.length) a.push({lvl: 'danger', icon: 'task', t: `${od.length} Aufgabe${od.length > 1 ? 'n' : ''} überfällig`, s: od.map(x => x.title).slice(0, 3).join(', '), href: '#/cal/aufgaben'});
  const uf = ents(curMonth()).filter(e => e.kind === 'fixed' && !e.paid && e.due && e.due < t);
  if (uf.length) a.push({lvl: 'warn', icon: 'coin', t: `${uf.length} Fixkosten noch nicht bezahlt`, s: uf.map(e => e.name).slice(0, 3).join(', '), href: '#/fin/monat'});
  for (const c of S.hcosts) if (c.due && c.status !== 'bezahlt') { const d = daysBetween(t, c.due); if (d <= 14) a.push({lvl: d < 0 ? 'danger' : 'warn', icon: 'house', t: `Hausbau-Zahlung: ${c.title}`, s: `fällig ${fmtD(c.due)} (${inDays(d)})`, c: 'hcosts', id: c.id}); }
  return a.sort((x, y) => (x.lvl === 'danger' ? 0 : 1) - (y.lvl === 'danger' ? 0 : 1));
}

/* =========================================================
   VIEWS
   ========================================================= */

// ---------- Dashboard ----------
views.home = () => {
  ensureMonth(curMonth());
  const u = me(), h = new Date().getHours();
  const greet = h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend';
  const cm = curMonth(), t = today();
  const up = occ(t, addDays(t, 7));
  const overdue = S.tasks.filter(x => !x.done && x.due && x.due < t);
  const al = alerts();
  const openItems = S.items.filter(i => !i.done).length;
  const openTasks = S.tasks.filter(x => !x.done).length;
  const todayEv = up.filter(o => o.date === t && o.ref?.[0] === 'events').length;
  const weekEv = up.filter(o => o.ref?.[0] === 'events').length;
  const msDone = pct(S.milestones.filter(m => m.done).length, S.milestones.length);
  const nextMs = S.milestones.filter(m => !m.done && m.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const safeDocs = S.files.filter(f => f.module === 'safe').length;
  const fixed = ents(cm).filter(e => e.kind === 'fixed');
  const tiles = [
    ['cal', 'Kalender', 'cal', `${weekEv} Termin${weekEv === 1 ? '' : 'e'} diese Woche`],
    ['fin', 'Finanzen', 'wallet', `${fixed.filter(e => e.paid).length} von ${fixed.length} Fixkosten bezahlt`],
    ['shop', 'Einkauf', 'cart', `${openItems} Artikel auf der Liste`],
    ['house', 'Haus', 'house', nextMs ? `Nächster Schritt: ${nextMs.title}` : `Zeitplan ${msDone} %`],
    ['safe', 'Safe', safeLocked() ? 'lock' : 'unlock', `${safeDocs} Dokumente · ${S.contracts.length} Verträge`],
    ['settings', 'Familie', 'users', `${S.members.length} Personen · Einstellungen`],
  ];
  const cmap = {cal: 'cal', fin: 'fin', shop: 'shop', house: 'house', safe: 'safe', settings: 'fam'};
  let agenda = '';
  if (overdue.length) agenda += `<div class="dayh" style="color:var(--danger)">Überfällig</div>` + overdue.map(x => occRow({date: x.due, title: x.title, kind: 'aufgabe', icon: 'task', color: 'var(--danger)', ref: ['tasks', x.id], task: true, time: ''})).join('');
  let lastD = '';
  for (const o of up.slice(0, 12)) { if (o.date !== lastD) { agenda += `<div class="dayh">${relDay(o.date)}</div>`; lastD = o.date; } agenda += occRow(o); }
  return `<div class="pg home" style="--accent:var(--primary);--grad:var(--g-primary)">
    <div class="hero"><div class="hero-card">
      <div class="hero-in"><img class="logo" src="icons/icon-192.png" alt="" onerror="this.style.display='none'"><div class="grow"><div class="hd">${wdLong(t)}, ${fmtD(t)}</div><h1>${greet}, ${esc(u.name)}</h1></div>
        <a class="acct" href="#/settings" title="Konto & Einstellungen">${avatar(u, 40)}<span>${esc(u.name)}</span></a></div>
      <div class="hero-chips"><a href="#/cal">${ic('cal', 15)} ${todayEv ? todayEv + ' heute' : 'Heute frei'}</a><a href="#/cal/aufgaben">${ic('task', 15)} ${openTasks} Aufgaben</a><a href="#/shop">${ic('cart', 15)} ${openItems} Einkäufe</a></div>
    </div></div>
    <div class="wrap">
      <div class="search">${ic('search', 18)}<input id="gsearch" data-in="gsearch" placeholder="Alles durchsuchen …" autocomplete="off"></div>
      <div id="gresults"></div>
      <div class="tiles">${tiles.map(([k, l, i, a]) => `<a class="tile" href="#/${k}" style="--c:var(--${cmap[k]});--g:var(--g-${cmap[k]})"><span class="ti">${ic(i, 22)}</span><span class="arr">${ic('right', 18)}</span><b>${l}</b><span class="s muted">${esc(a)}</span></a>`).join('')}</div>
      ${al.length ? `<div class="card"><div class="ch"><h3>Hinweise</h3><span class="badge danger">${al.length}</span></div>${al.slice(0, 6).map(x => `<div class="alert ${x.lvl} clickable" ${x.href ? `data-a="go" data-h="${x.href}"` : `data-a="edit" data-c="${x.c}" data-id="${x.id}"`}><span class="aic">${ic(x.icon, 18)}</span><div class="grow"><div class="t">${esc(x.t)}</div><div class="s">${esc(x.s)}</div></div>${ic('right', 16)}</div>`).join('')}</div>` : ''}
      <div class="card"><div class="ch"><h3>Nächste 7 Tage</h3><a class="btn sm" href="#/cal">Kalender</a></div>${agenda || '<p class="empty">Nichts geplant – geniesst die Ruhe.</p>'}</div>
      ${S.flags.demo ? `<div class="hint">${ic('bell', 16)}<span>Die App enthält Beispieldaten. Unter <a href="#/settings" style="text-decoration:underline">Familie → Daten</a> kannst du sie löschen und mit euren eigenen Daten starten.</span></div>` : ''}
    </div>
    <button class="fab" data-a="quick" aria-label="Schnell hinzufügen">${ic('plus', 26)}</button></div>`;
};

function searchHTML(q) {
  q = q.toLowerCase().trim();
  const hit = (...xs) => xs.some(x => String(x || '').toLowerCase().includes(q));
  const r = [];
  const add = (c, acc, icon, title, sub, coll, id, extraAttr) => r.push({c, acc, icon, title, sub, coll, id});
  const sOk = !safeLocked();
  S.events.forEach(e => { if ((e.shared || e.owner === me().id) && hit(e.title, e.notes)) add('cal', 'cal', 'cal', e.title, 'Termin · ' + fmtD(e.date), 'events', e.id); });
  S.tasks.forEach(t => { if (hit(t.title, t.notes)) add('cal', 'cal', 'task', t.title, 'Aufgabe' + (t.due ? ' · ' + fmtD(t.due) : ''), 'tasks', t.id); });
  S.entries.forEach(e => { if (hit(e.name, e.note, e.category)) add('fin', 'fin', 'coin', e.name, `${chf(e.amount)} · ${fmtM(e.month)}`, 'entries', e.id); });
  S.templates.forEach(t => { if (hit(t.name)) add('fin', 'fin', 'repeat', t.name, 'Fixposten · ' + chf(t.amount), 'templates', t.id); });
  S.items.forEach(i => { if (hit(i.text, i.note)) add('shop', 'shop', 'cart', i.text, 'Einkauf · ' + (byId('lists', i.listId)?.name || ''), 'items', i.id); });
  S.recipes.forEach(x => { if (hit(x.name, x.ingredients)) add('shop', 'shop', 'food', x.name, 'Rezept', 'recipes', x.id); });
  S.hcosts.forEach(c => { if (hit(c.title, c.note)) add('house', 'house', 'coin', c.title, 'Haus-Kosten · ' + scopeLabel(c), 'hcosts', c.id); });
  S.rooms.forEach(x => { if (hit(x.name)) add('house', 'house', 'ruler', x.name, 'Raum · ' + (byId('units', x.unitId)?.name || ''), 'rooms', x.id); });
  S.offers.forEach(o => { if (hit(o.trade, o.vendor, o.note)) add('house', 'house', 'receipt', o.vendor, 'Offerte ' + o.trade + ' · ' + chf0(o.amount), 'offers', o.id); });
  S.contacts.forEach(c => { if (hit(c.name, c.company, c.trade, c.phone, c.email)) add('house', 'house', 'users', c.name, 'Kontakt · ' + (c.trade || c.company || ''), 'contacts', c.id); });
  S.hnotes.forEach(n => { if (hit(n.title, n.text)) add('house', 'house', 'note', n.title, 'Notiz Haus', 'hnotes', n.id); });
  S.defects.forEach(d => { if (hit(d.text)) add('house', 'house', 'wrench', d.text, 'Mangel', 'defects', d.id); });
  S.files.forEach(f => { if ((f.module !== 'safe' || sOk) && hit(f.name, f.tags, f.folder)) add(f.module === 'safe' ? 'safe' : 'house', f.module === 'safe' ? 'safe' : 'house', 'file', f.name, (f.module === 'safe' ? 'Safe · ' + (f.folder || '') : 'Haus · ' + (f.category || '')), 'files', f.id); });
  if (sOk) {
    S.contracts.forEach(c => { if (hit(c.name, c.provider, c.customerNo, c.note)) add('safe', 'safe', 'shield', c.name, 'Vertrag · ' + (c.provider || ''), 'contracts', c.id); });
    S.bills.forEach(b => { if (hit(b.vendor, b.subject, b.invoiceNo, b.note)) add('fin', 'fin', 'receipt', b.vendor || b.subject, 'Rechnung' + (has(b.amount) ? ' · ' + chf(b.amount) : ''), 'bills', b.id); });
    S.warranties.forEach(w => { if (hit(w.item, w.store, w.serial)) add('safe', 'safe', 'receipt', w.item, 'Garantie', 'warranties', w.id); });
  }
  S.members.forEach(m => { if (hit(m.name, m.notes)) add('settings', 'fam', 'users', m.name, 'Familie', 'members', m.id); });
  if (!r.length) return `<div class="card"><p class="empty">Nichts gefunden${!sOk ? ' (Safe ist gesperrt)' : ''}.</p></div>`;
  return `<div class="card">${r.slice(0, 30).map(x => `<div class="sres" data-a="edit" data-c="${x.coll}" data-id="${x.id}" style="--c:var(--${x.acc})"><span class="ti">${ic(x.icon, 17)}</span><div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${esc(x.sub)}</div></div></div>`).join('')}${r.length > 30 ? `<p class="empty">… und ${r.length - 30} weitere</p>` : ''}</div>`;
}

// ---------- Kalender ----------
views.cal = r => {
  const tab = r.tab || 'monat';
  const body = tab === 'aufgaben' ? tasksView() : tab === 'liste' ? agendaView() : calView();
  const actions = `<button class="icon-btn pri" data-a="${tab === 'aufgaben' ? 'taskNew' : 'eventNew'}" aria-label="Neu">${ic('plus')}</button>`;
  return page({title: 'Kalender', accent: 'cal', mod: 'cal', tab, tabs: [['monat', 'Monat'], ['liste', 'Liste'], ['aufgaben', 'Aufgaben']], actions, body});
};
function filterOcc(list) {
  const f = ui.calFilter, u = me().id;
  if (f === 'shared') return list.filter(o => o.ref[0] !== 'events' || o.shared);
  if (f === 'mine') return list.filter(o => o.ref[0] === 'events' ? o.owner === u : o.ref[0] === 'members' ? false : o.ref[0] === 'tasks' ? true : false);
  return list;
}
const calChips = () => `<div class="chips">${[['all', 'Alles'], ['shared', 'Gemeinsam'], ['mine', 'Nur meine']].map(([k, l]) => `<button class="chip${ui.calFilter === k ? ' on' : ''}" data-a="calFilter" data-f="${k}">${l}</button>`).join('')}</div>`;
function calView() {
  const mk = ui.calMonth, startOff = (parse(mk + '-01').getDay() + 6) % 7;
  const gs = addDays(mk + '-01', -startOff), ge = addDays(gs, 41);
  const byDay = {};
  filterOcc(occ(gs, ge)).forEach(o => (byDay[o.date] = byDay[o.date] || []).push(o));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(gs, i), os = byDay[d] || [];
    const show = os.length > 3 ? os.slice(0, 2) : os;
    cells += `<button class="d${d.slice(0, 7) !== mk ? ' out' : ''}${d === today() ? ' today' : ''}${d === ui.calDay ? ' sel' : ''}" data-a="calDay" data-d="${d}"><span class="n">${+d.slice(8)}</span>${show.map(o => `<span class="evc" style="--ec:${o.color}">${esc(o.title.replace(/^(Haus|Zahlung Haus|Kündigungsfrist|Garantie endet|Läuft ab): /, ''))}</span>`).join('')}${os.length > 3 ? `<span class="more">+${os.length - 2}</span>` : ''}</button>`;
  }
  const dl = filterOcc(occ(ui.calDay, ui.calDay));
  const legend = S.members.map(m => `<span><i style="background:${esc(m.color)}"></i>${esc(m.name)}</span>`).join('') + `<span><i style="background:var(--house)"></i>Haus</span><span><i style="background:var(--safe)"></i>Safe</span>`;
  return `<div class="card"><div class="mnav"><button class="icon-btn" data-a="calMonth" data-n="-1" aria-label="Vorheriger Monat">${ic('left')}</button><b>${fmtM(mk)}</b><button class="icon-btn" data-a="calMonth" data-n="1" aria-label="Nächster Monat">${ic('right')}</button></div>
    ${calChips()}<div class="cal">${WD.map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div>
    <div class="legend2">${legend}</div>
    ${mk !== curMonth() ? `<div style="text-align:center;margin-top:10px"><button class="btn sm" data-a="calToday">Heute</button></div>` : ''}</div>
    <div class="card"><div class="ch"><h3>${wdLong(ui.calDay)}, ${fmtD(ui.calDay)}</h3><button class="btn sm pri" data-a="eventNew" data-d="${ui.calDay}">${ic('plus', 16)} Termin</button></div>
    ${dl.length ? dl.map(occRow).join('') : '<p class="empty">Keine Einträge</p>'}</div>
    <div class="hint">${ic('bell', 16)}<span>Im Kalender erscheinen automatisch auch Geburtstage der Familie, Aufgaben, Haus-Meilensteine, Zahlungen sowie Kündigungsfristen und Garantie-Enden aus dem Safe.</span></div>`;
}
function agendaView() {
  const t = today(), list = filterOcc(occ(t, addDays(t, 90)));
  let html = '', last = '';
  for (const o of list) {
    if (o.date.slice(0, 7) !== last.slice(0, 7)) html += `<div class="sech" style="margin-top:14px">${fmtM(o.date.slice(0, 7))}</div>`;
    if (o.date !== last) { html += `<div class="dayh">${relDay(o.date)}</div>`; last = o.date; }
    html += occRow(o);
  }
  return `<div class="card">${calChips()}${html || '<p class="empty">Keine Einträge in den nächsten 90 Tagen</p>'}</div>`;
}
function nextDue(d, rep) { return rep === 'weekly' ? addDays(d, 7) : rep === 'biweekly' ? addDays(d, 14) : rep === 'monthly' ? addMonths(d, 1) : rep === 'yearly' ? addMonths(d, 12) : d; }
function tasksView() {
  const t = today(), open = S.tasks.filter(x => !x.done), done = S.tasks.filter(x => x.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const row = x => {
    const m = x.assignee && x.assignee !== 'all' ? mem(x.assignee) : null;
    const late = x.due && x.due < t && !x.done;
    return `<div class="row"><button class="chk${x.done ? ' on' : ''}" data-a="taskToggle" data-id="${x.id}">${x.done ? ic('check', 16) : ''}</button>
      <div class="grow clickable" data-a="edit" data-c="tasks" data-id="${x.id}"><div class="t${x.done ? ' strike' : ''}">${esc(x.title)}</div>
      <div class="s"${late ? ' style="color:var(--danger)"' : ''}>${x.due ? (late ? 'überfällig · ' : '') + fmtD(x.due) : 'ohne Datum'}${x.repeat && x.repeat !== 'none' ? ' · ' + REPEAT.find(r => r[0] === x.repeat)[1] : ''}</div></div>
      ${m ? avatar(m, 26) : `<span class="badge">Alle</span>`}</div>`;
  };
  const groups = [
    ['Überfällig', open.filter(x => x.due && x.due < t)],
    ['Heute & diese Woche', open.filter(x => x.due && x.due >= t && x.due <= addDays(t, 7))],
    ['Später', open.filter(x => x.due && x.due > addDays(t, 7))],
    ['Ohne Datum', open.filter(x => !x.due)],
  ].map(([l, xs]) => [l, xs.sort((a, b) => (a.due || '').localeCompare(b.due || ''))]);
  return `<div class="card">${groups.filter(g => g[1].length).map(([l, xs]) => `<div class="sech">${l}<span>${xs.length}</span></div>${xs.map(row).join('')}`).join('') || '<p class="empty">Keine offenen Aufgaben 🎉</p>'}</div>
    ${done.length ? `<div class="card"><div class="sech">Erledigt<span>${done.length}</span></div>${done.slice(0, 10).map(row).join('')}${done.length ? `<div style="margin-top:8px"><button class="btn sm" data-a="tasksClear">Erledigte entfernen</button></div>` : ''}</div>` : ''}
    <div class="hint">${ic('repeat', 16)}<span>Wiederkehrende Aufgaben (z.B. «Wohnung putzen» wöchentlich) springen beim Abhaken automatisch auf den nächsten Termin.</span></div>`;
}

// ---------- Finanzen ----------
views.fin = r => {
  const tab = r.tab || 'monat';
  let body, actions = '';
  if (tab === 'fix') { body = finFix(); actions = `<button class="icon-btn pri" data-a="templateNew" aria-label="Neu">${ic('plus')}</button>`; }
  else if (tab === 'sparen') { body = finGoals(); actions = `<button class="icon-btn pri" data-a="goalNew" aria-label="Neu">${ic('plus')}</button>`; }
  else if (tab === 'auswertung') body = finStats();
  else if (tab === 'rechnungen') { body = finBills(); actions = `<button class="btn pri sm" data-a="billNew">${ic('plus', 16)} Rechnung</button>`; }
  else { ensureMonth(ui.finMonth); body = finMonth(); actions = `<button class="btn pri sm" data-a="entryNew">${ic('plus', 16)} Ausgabe</button>`; }
  return page({title: 'Finanzen', accent: 'fin', mod: 'fin', tab: tab === 'monat' || !r.tab ? 'monat' : tab, tabs: [['monat', 'Monat'], ['rechnungen', 'Rechnungen' + (S.bills.filter(b => ['pruefen', 'offen'].includes(billStatus(b))).length ? ' · ' + S.bills.filter(b => ['pruefen', 'offen'].includes(billStatus(b))).length : '')], ['fix', 'Fixposten'], ['sparen', 'Sparziele'], ['auswertung', 'Auswertung']], actions, body});
};
const CAT_IC = {'Wohnen': '🏠', 'Lebensmittel': '🛒', 'Kinder': '🧸', 'Haushalt': '🧴', 'Mobilität': '🚗', 'Versicherungen': '🛡️', 'Gesundheit': '💊', 'Abos & Verträge': '📺', 'Freizeit': '🎉', 'Restaurant': '🍽️', 'Kleidung': '👕', 'Geschenke': '🎁', 'Haus/Bau': '🔨', 'Steuern': '🧾', 'Sonstiges': '📦', 'Lohn': '💼', 'Nebeneinkommen': '💡', 'Kinderzulagen': '👶', 'Sparen': '🐷'};
const QCATS = ['Lebensmittel', 'Kinder', 'Haushalt', 'Restaurant', 'Freizeit', 'Mobilität', 'Kleidung', 'Gesundheit', 'Geschenke', 'Haus/Bau', 'Sonstiges'];
const catChipsHTML = kind => (kind === 'income' ? INC_CATS : QCATS).map(c => `<button type="button" class="catchip${ui.qCat === c ? ' on' : ''}" data-a="qCat" data-cat="${esc(c)}">${CAT_IC[c] || '📦'} ${esc(c)}</button>`).join('');
function quickEntry() {
  const k = ui.qKind || 'variable';
  if (!ui.qCat) ui.qCat = k === 'income' ? 'Lohn' : 'Lebensmittel';
  return `<div class="seg"><button class="${k === 'variable' ? 'on out' : ''}" data-a="qKind" data-k="variable">− Ausgabe</button><button class="${k === 'income' ? 'on in' : ''}" data-a="qKind" data-k="income">+ Einnahme</button></div>
    <form data-f="quickEntry" id="qentry" autocomplete="off">
      <div class="amtin"><span>CHF</span><input name="amount" inputmode="decimal" placeholder="0.00" enterkeyhint="next"></div>
      <input name="name" placeholder="${k === 'income' ? 'Wofür? z.B. Bonus, Verkauf …' : 'Wofür? z.B. Wocheneinkauf, Coiffeur …'}" enterkeyhint="done">
      <div class="catchips" id="qcats">${catChipsHTML(k)}</div>
      <button class="btn pri block">${ic('check', 18)} ${k === 'income' ? 'Einnahme' : 'Ausgabe'} erfassen</button>
    </form>`;
}
function entryRow(e) {
  const tpl = e.templateId && byId('templates', e.templateId);
  const late = !e.paid && e.due && e.due < today();
  const badges = (e.source?.type === 'shop' ? ' <span class="badge shop">Einkauf</span>' : '') + (e.source?.type === 'bill' ? ' <span class="badge warn">Rechnung</span>' : '') + (tpl?.contractId ? ' <span class="badge safe">Vertrag</span>' : '') + (e.goalId ? ' <span class="badge fin">Sparziel</span>' : '');
  const sub = [e.category, e.paid ? (e.paidAt ? (e.kind === 'income' ? 'erhalten ' : 'bezahlt ') + fmtDs(e.paidAt) : 'bezahlt') : e.due ? (late ? 'überfällig seit ' : 'fällig ') + fmtDs(e.due) : 'offen', e.by && mem(e.by) ? mem(e.by).name : ''].filter(Boolean).join(' · ');
  return `<div class="row"><span class="catic">${CAT_IC[e.category] || (e.kind === 'saving' ? '🐷' : '📦')}</span>
    <div class="grow clickable" data-a="edit" data-c="entries" data-id="${e.id}"><div class="t">${esc(e.name)}${badges}</div><div class="s"${late ? ' style="color:var(--danger)"' : ''}>${esc(sub)}</div></div>
    <div class="amt${e.kind === 'income' ? ' pos' : ''}">${e.kind === 'income' ? '+' : '−'} ${chf(e.amount).slice(4)}</div>
    <button class="chk${e.paid ? ' on' : ''}" data-a="entryPaid" data-id="${e.id}" title="${e.kind === 'income' ? 'erhalten' : 'bezahlt'}" aria-label="bezahlt">${e.paid ? ic('check', 16) : ''}</button></div>`;
}
function finMonth() {
  const mk = ui.finMonth, m = S.months[mk] || {}, T = totals(mk), E = ents(mk);
  const sec = (kind, label) => {
    const xs = E.filter(e => e.kind === kind).sort((a, b) => kind === 'variable' ? (b.paidAt || '').localeCompare(a.paidAt || '') || (b.createdAt || 0) - (a.createdAt || 0) : (a.due || '').localeCompare(b.due || ''));
    if (!xs.length && kind === 'saving') return '';
    const paid = xs.filter(e => e.paid).length;
    return `<div class="card"><div class="ch"><h3>${label}</h3><span class="badge">${kind === 'variable' ? xs.length : paid + '/' + xs.length}</span><b class="amt">${chf(xs.reduce((a, e) => a + (+e.amount || 0), 0))}</b></div>
      ${xs.map(entryRow).join('') || `<p class="empty">Noch keine Einträge</p>`}
      ${kind === 'variable' || kind === 'income' ? `<div class="addrow"><button class="btn sm" data-a="entryNew" data-kind="${kind}">${ic('plus', 15)} ${kind === 'income' ? 'Einnahme' : 'Ausgabe'} mit Details</button></div>` : kind === 'fixed' ? `<div class="addrow"><a class="btn sm" href="#/fin/fix">${ic('repeat', 15)} Fixposten verwalten</a></div>` : ''}</div>`;
  };
  const unpaidFixed = E.filter(e => e.kind === 'fixed' && !e.paid).reduce((a, e) => a + (+e.amount || 0), 0);
  return `<div class="card"><div class="mnav"><button class="icon-btn" data-a="finMonth" data-n="-1" aria-label="Vorheriger Monat">${ic('left')}</button><b>${fmtM(mk)}${m.closed ? ` <span class="badge">${ic('lock', 11)} abgeschlossen</span>` : ''}</b><button class="icon-btn" data-a="finMonth" data-n="1" aria-label="Nächster Monat">${ic('right')}</button></div>
    ${quickEntry()}</div>
    <div class="card">
    <div class="stats">
      <div class="stat"><div class="l">Einnahmen</div><div class="v" style="color:var(--ok)">${chf0(T.income)}</div></div>
      <div class="stat"><div class="l">Sparpotenzial</div><div class="v" style="color:${T.free < 0 ? 'var(--danger)' : 'var(--fin)'}">${chf0(T.free)}</div></div>
      <div class="stat"><div class="l">Fixkosten</div><div class="v">${chf0(T.fixed)}</div></div>
      <div class="stat"><div class="l">Variable Kosten</div><div class="v">${chf0(T.variable)}</div></div>
    </div>
    <div class="bar lg" style="margin:14px 0 6px"><i style="width:${clamp(pct(T.fixed, T.income), 0, 100)}%"></i><i class="b2" style="width:${clamp(pct(T.variable, T.income), 0, 100 - clamp(pct(T.fixed, T.income), 0, 100))}%"></i></div>
    <div class="small muted">${T.income ? `${pct(T.out, T.income)} % der Einnahmen verplant` : 'Noch keine Einnahmen erfasst'}${T.saving ? ` · ${chf0(T.saving)} in Sparziele` : ''}${unpaidFixed ? ` · noch offen: ${chf0(unpaidFixed)}` : ''}</div>
    ${mk === curMonth() ? '' : `<div style="text-align:center;margin-top:10px"><button class="btn sm" data-a="finToday">Zum aktuellen Monat</button></div>`}</div>
    ${sec('variable', 'Variable Kosten')}${sec('fixed', 'Fixkosten')}${sec('income', 'Einnahmen')}${sec('saving', 'Sparen')}
    <div class="gridbtns"><button class="btn" data-a="monthClose">${ic(m.closed ? 'unlock' : 'lock', 16)} ${m.closed ? 'Monat wieder öffnen' : 'Monat abschliessen'}</button></div>
    <div class="hint">${ic('repeat', 16)}<span>Fixposten (Lohn, Miete, Verträge aus dem Safe …) werden jeden Monat automatisch übernommen. Der Haken rechts bedeutet «bezahlt» bzw. «erhalten». Einkäufe kannst du mit einem Klick hier einbuchen.</span></div>`;
}
function finFix() {
  const monthly = t => (+t.amount || 0) / (+t.interval || 1);
  const inc = S.templates.filter(t => t.kind === 'income'), fix = S.templates.filter(t => t.kind !== 'income');
  const sI = inc.filter(t => t.active !== false).reduce((a, t) => a + monthly(t), 0), sF = fix.filter(t => t.active !== false).reduce((a, t) => a + monthly(t), 0);
  const row = t => `<div class="row clickable" data-a="edit" data-c="templates" data-id="${t.id}"><span class="bullet" style="background:${t.kind === 'income' ? 'var(--ok)' : 'var(--fin)'};${t.active === false ? 'opacity:.3' : ''}"></span>
    <div class="grow"><div class="t">${esc(t.name)}${t.contractId ? ' <span class="badge safe">Vertrag</span>' : ''}${t.active === false ? ' <span class="badge">pausiert</span>' : ''}</div><div class="s">${esc(t.category || '')} · ${ivLabel(t.interval)}${t.dueDay ? ' · am ' + t.dueDay + '.' : ''}${t.endMonth ? ' · bis ' + fmtM(t.endMonth) : ''}</div></div>
    <div style="text-align:right"><div class="amt${t.kind === 'income' ? ' pos' : ''}">${chf(t.amount)}</div>${+t.interval > 1 ? `<div class="s">Ø ${chf(monthly(t))}/Mt.</div>` : ''}</div></div>`;
  return `<div class="card"><div class="stats">
      <div class="stat"><div class="l">Fixe Einnahmen / Mt.</div><div class="v" style="color:var(--ok)">${chf0(sI)}</div></div>
      <div class="stat"><div class="l">Fixkosten / Mt. (Ø)</div><div class="v">${chf0(sF)}</div></div></div>
      <div class="small muted" style="margin-top:10px">Bleibt für variable Kosten & Sparen: <b style="color:${sI - sF < 0 ? 'var(--danger)' : 'var(--fin)'}">${chf0(sI - sF)}</b> pro Monat</div></div>
    <div class="card"><div class="sech">Einnahmen<span>${inc.length}</span></div>${inc.map(row).join('') || '<p class="empty">Noch keine fixen Einnahmen</p>'}
      <div class="sech">Fixkosten<span>${fix.length}</span></div>${fix.map(row).join('') || '<p class="empty">Noch keine Fixkosten</p>'}</div>
    <div class="hint">${ic('shield', 16)}<span>Verträge & Abos aus dem <a href="#/safe/vertraege" style="text-decoration:underline">Safe</a> mit «im Budget» erscheinen hier automatisch und bleiben synchron.</span></div>`;
}
function finGoals() {
  if (!S.goals.length) return `<div class="card"><p class="empty">Noch keine Sparziele.<br>Z.B. Ferien, Notgroschen oder Einrichtung fürs neue Haus.</p><div style="text-align:center"><button class="btn pri" data-a="goalNew">${ic('plus', 16)} Sparziel anlegen</button></div></div>`;
  const total = S.goals.reduce((a, g) => a + goalSaved(g), 0);
  return `<div class="card"><div class="l small muted">Total gespart</div><div class="big">${chf0(total)}</div></div>` + S.goals.map(g => {
    const s = goalSaved(g), p = pct(s, +g.target), rest = Math.max(0, (+g.target || 0) - s);
    const ml = g.deadline ? Math.max(1, mDiff(curMonth(), g.deadline.slice(0, 7))) : 0;
    return `<div class="card" style="--accent:${esc(g.color || 'var(--fin)')}"><div class="ch"><span class="ti" style="color:var(--accent)">${ic('target', 22)}</span><h3 class="clickable" data-a="edit" data-c="goals" data-id="${g.id}">${esc(g.name)}</h3><button class="btn sm pri" data-a="goalDeposit" data-id="${g.id}">${ic('plus', 15)} Einzahlen</button></div>
      <div class="bar lg"><i style="width:${clamp(p, 0, 100)}%"></i></div>
      <div class="cl" style="margin-top:6px"><span><b>${chf0(s)}</b> von ${chf0(g.target)}</span><span class="muted">${p} %</span></div>
      <div class="s">${rest ? `Noch ${chf0(rest)}` : 'Ziel erreicht 🎉'}${g.deadline && rest ? ` · bis ${fmtD(g.deadline)} → ca. ${chf0(rest / ml)} pro Monat` : ''}</div></div>`;
  }).join('') + `<div class="hint">${ic('coin', 16)}<span>Einzahlungen werden im jeweiligen Monat unter «Sparen» verbucht – so siehst du, wie viel vom Sparpotenzial wirklich gespart wurde.</span></div>`;
}
function barChart(months) {
  const data = months.map(mk => ({mk, ...totals(mk)}));
  const max = Math.max(1, ...data.map(d => Math.max(d.income, d.out)));
  const W = 360, H = 180, pb = 22, top = 10, bw = W / data.length, ih = H - pb - top;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Einnahmen und Ausgaben pro Monat">`;
  for (let g = 0; g <= 3; g++) { const y = top + ih * g / 3; s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="gl"/>`; }
  data.forEach((d, i) => {
    const x = i * bw, w = Math.min(14, bw * .3), h1 = ih * d.income / max, h2 = ih * d.out / max, cx = x + bw / 2;
    s += `<rect x="${cx - w - 1}" y="${H - pb - h1}" width="${w}" height="${h1}" rx="3" fill="var(--fin)"><title>${fmtM(d.mk)} – Einnahmen ${chf(d.income)}</title></rect>`;
    s += `<rect x="${cx + 1}" y="${H - pb - h2}" width="${w}" height="${h2}" rx="3" fill="${d.out > d.income ? 'var(--danger)' : 'var(--muted)'}" opacity=".6"><title>${fmtM(d.mk)} – Ausgaben ${chf(d.out)}</title></rect>`;
    s += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="axl">${MSHORT[+d.mk.slice(5) - 1]}</text>`;
  });
  return s + '</svg>';
}
function catBars(mk) {
  const m = {};
  ents(mk).filter(e => e.kind === 'fixed' || e.kind === 'variable').forEach(e => { const k = e.category || 'Sonstiges'; m[k] = (m[k] || 0) + (+e.amount || 0); });
  const arr = Object.entries(m).sort((a, b) => b[1] - a[1]), max = arr[0]?.[1] || 1, tot = arr.reduce((a, x) => a + x[1], 0);
  return arr.map(([k, v]) => `<div class="cbar"><div class="cl"><span>${esc(k)}</span><span><b>${chf0(v)}</b> <span class="muted">${pct(v, tot)} %</span></span></div><div class="bar"><i style="width:${v / max * 100}%"></i></div></div>`).join('') || '<p class="empty">Keine Ausgaben in diesem Monat</p>';
}
function finStats() {
  const cm = curMonth(), months = []; for (let i = 11; i >= 0; i--) months.push(mAdd(cm, -i));
  const used = months.filter(mk => ents(mk).length);
  const yr = cm.slice(0, 4), ym = Object.keys(S.months).concat(S.entries.map(e => e.month)).filter((v, i, a) => v.startsWith(yr) && a.indexOf(v) === i);
  const Y = ym.reduce((a, mk) => { const t = totals(mk); a.i += t.income; a.o += t.out; a.s += t.saving; return a; }, {i: 0, o: 0, s: 0});
  return `<div class="card"><div class="ch"><h3>Letzte 12 Monate</h3></div>${barChart(months)}
      <div class="legend"><span><i style="background:var(--fin)"></i>Einnahmen</span><span><i style="background:var(--muted);opacity:.6"></i>Ausgaben</span></div></div>
    <div class="card"><div class="ch"><h3>Jahr ${yr}</h3></div><div class="stats">
      <div class="stat"><div class="l">Einnahmen</div><div class="v">${chf0(Y.i)}</div></div><div class="stat"><div class="l">Ausgaben</div><div class="v">${chf0(Y.o)}</div></div>
      <div class="stat"><div class="l">Sparpotenzial</div><div class="v" style="color:var(--fin)">${chf0(Y.i - Y.o)}</div></div><div class="stat"><div class="l">Sparquote</div><div class="v">${pct(Y.i - Y.o, Y.i)} %</div></div></div></div>
    <div class="card"><div class="mnav"><button class="icon-btn" data-a="statMonth" data-n="-1">${ic('left')}</button><b>Ausgaben nach Kategorie · ${MSHORT[+ui.statMonth.slice(5) - 1]} ${ui.statMonth.slice(0, 4)}</b><button class="icon-btn" data-a="statMonth" data-n="1">${ic('right')}</button></div>${catBars(ui.statMonth)}</div>
    <div class="card"><div class="ch"><h3>Monatsauszüge</h3></div>${used.length ? `<table class="tb"><thead><tr><th>Monat</th><th>Ein</th><th>Aus</th><th>Frei</th></tr></thead><tbody>${used.slice().reverse().map(mk => { const t = totals(mk); return `<tr class="clickable" data-a="finGoto" data-m="${mk}"><td>${MSHORT[+mk.slice(5) - 1]} ${mk.slice(2, 4)}${S.months[mk]?.closed ? ' ' + ic('lock', 11).replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-1px"') : ''}</td><td>${chf0(t.income).slice(4)}</td><td>${chf0(t.out).slice(4)}</td><td style="color:${t.free < 0 ? 'var(--danger)' : 'var(--fin)'};font-weight:700">${chf0(t.free).slice(4)}</td></tr>`; }).join('')}</tbody></table>` : '<p class="empty">Noch keine Daten</p>'}</div>`;
}

// ---------- Rechnungen (Mail-Import + manuell) ----------
// Rechnungen landen in S.bills (vom Mail-Import-Skript oder manuell erfasst).
// Jede Rechnung mit Betrag wird automatisch als offene variable Ausgabe im Monat der Fälligkeit eingeplant.
const billMonth = b => { const d = b.due || b.received || today(); const mk = d.slice(0, 7); return mk < curMonth() ? curMonth() : mk; };
function billStatus(b) {
  if (b.status === 'ignoriert') return 'ignoriert';
  const e = b.entryId && byId('entries', b.entryId);
  if (e) return e.paid ? 'bezahlt' : 'offen';
  return has(b.amount) ? 'neu' : 'pruefen';
}
function planBill(b) {
  const id = 'b_' + b.id, existing = byId('entries', id);
  if (existing && existing.paid) { b.entryId = id; return; }
  const e = {id, month: billMonth(b), name: b.vendor || b.subject || 'Rechnung', amount: +b.amount, kind: 'variable', category: b.category || 'Sonstiges',
    paid: false, paidAt: '', due: b.due || '', source: {type: 'bill', billId: b.id}, note: b.invoiceNo ? 'Rechnung ' + b.invoiceNo : (b.subject || ''), by: existing?.by || '', createdAt: existing?.createdAt || Date.now()};
  if (existing) Object.assign(existing, e); else S.entries.push(e);
  b.entryId = id; b.status = 'eingeplant';
}
function unplanBill(b) { const e = b.entryId && byId('entries', b.entryId); if (e && !e.paid) remove('entries', e.id); if (!e || !e.paid) b.entryId = null; }
// Neue Rechnungen (z.B. frisch per Mail importiert) automatisch einplanen
function processBills() {
  let ch = false;
  for (const b of S.bills) if (b.status !== 'ignoriert' && has(b.amount) && !b.entryId) { planBill(b); ch = true; }
  if (ch) save();
  return ch;
}
function billRow(b) {
  const st = billStatus(b), t = today(), late = b.due && b.due < t && st === 'offen';
  const badge = {offen: `<span class="badge ${late ? 'danger' : 'warn'}">${late ? 'überfällig' : 'offen'}</span>`, bezahlt: '<span class="badge ok">bezahlt</span>', pruefen: '<span class="badge danger">Betrag prüfen</span>', neu: '<span class="badge">neu</span>', ignoriert: '<span class="badge">ignoriert</span>'}[st];
  return `<div class="row" style="align-items:flex-start"><span class="catic">${b.source === 'mail' ? '📧' : '🧾'}</span>
    <div class="grow"><div class="clickable" data-a="edit" data-c="bills" data-id="${b.id}"><div class="t">${esc(b.vendor || b.subject || 'Rechnung')} ${badge}</div>
      <div class="s"${late ? ' style="color:var(--danger)"' : ''}>${[b.due ? 'fällig ' + fmtD(b.due) : 'ohne Fälligkeit', b.entryId && st !== 'ignoriert' ? 'Budget ' + fmtM(byId('entries', b.entryId)?.month || billMonth(b)) : '', b.invoiceNo ? 'Nr. ' + b.invoiceNo : ''].filter(Boolean).map(esc).join(' · ')}</div>
      ${b.subject && b.vendor ? `<div class="s">${esc(b.subject)}</div>` : ''}</div>
      ${st === 'offen' || st === 'pruefen' ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${b.iban ? `<button class="btn sm pri" data-a="billQR" data-id="${b.id}" title="Zahlungs-QR-Code">${ic('grid', 14)} QR zum Bezahlen</button>` : ''}${st === 'offen' ? `<button class="btn sm" data-a="billPaid" data-id="${b.id}">${ic('check', 14)} bezahlt</button>` : ''}</div>` : ''}
      ${attachChips('bills', b.id, 'PDF / Foto anhängen')}</div>
    <div style="text-align:right">${has(b.amount) ? `<div class="amt">${chf(b.amount)}</div>` : '<div class="amt" style="color:var(--danger)">?</div>'}</div></div>`;
}
function finBills() {
  const mail = S.flags.billMail || 'zuhause.racuni@gmail.com', bs = S.bills.slice();
  const by = st => bs.filter(b => billStatus(b) === st);
  const pruefen = by('pruefen'), offen = by('offen').sort((a, b) => (a.due || '9').localeCompare(b.due || '9')), bezahlt = by('bezahlt').sort((a, b) => (b.received || '').localeCompare(a.received || '')), ign = by('ignoriert');
  const sumOffen = offen.reduce((a, b) => a + (+b.amount || 0), 0), next = offen.find(b => b.due);
  return `<div class="card"><div class="ch"><h3>Rechnungs-Eingang</h3><button class="icon-btn sm" data-a="billMailEdit" aria-label="Adresse ändern">${ic('edit', 18)}</button></div>
      ${mail ? `<p class="small" style="margin:0 0 10px">Rechnungen einfach an <b>${esc(mail)}</b> weiterleiten. Sie erscheinen hier automatisch (ca. alle 10 Minuten) und werden im Monat der Fälligkeit als offene Ausgabe eingeplant.</p>`
        : `<p class="small muted" style="margin:0 0 10px">Der automatische Mail-Import ist noch nicht eingerichtet. Bis dahin kannst du Rechnungen hier mit Foto oder PDF erfassen.</p>`}
      <div class="stats"><div class="stat"><div class="l">Offen</div><div class="v">${chf0(sumOffen)}</div></div><div class="stat"><div class="l">Nächste Fälligkeit</div><div class="v" style="font-size:16px">${next ? fmtD(next.due) : '–'}</div></div></div></div>
    ${pruefen.length ? `<div class="card"><div class="ch"><h3>Bitte prüfen</h3><span class="badge danger">${pruefen.length}</span></div><p class="s" style="margin:-4px 0 6px">Bei diesen Rechnungen konnte kein Betrag erkannt werden – antippen und ergänzen.</p>${pruefen.map(billRow).join('')}</div>` : ''}
    <div class="card"><div class="ch"><h3>Offen</h3><span class="badge">${offen.length}</span></div>${offen.map(billRow).join('') || '<p class="empty">Keine offenen Rechnungen 🎉</p>'}</div>
    ${bezahlt.length ? `<div class="card"><div class="ch"><h3>Bezahlt</h3><span class="badge ok">${bezahlt.length}</span></div>${bezahlt.slice(0, 15).map(billRow).join('')}</div>` : ''}
    ${ign.length ? `<div class="card"><div class="ch"><h3>Ignoriert</h3><span class="badge">${ign.length}</span></div>${ign.slice(0, 10).map(billRow).join('')}</div>` : ''}
    <div class="hint">${ic('receipt', 16)}<span>Erkannt werden Betrag (CHF), Fälligkeit («zahlbar bis», «innert 30 Tagen»), Rechnungsnummer und IBAN – auch aus PDF-Rechnungen und QR-Einzahlungsscheinen. Die PDFs werden im Safe unter «Belege» abgelegt.</span></div>`;
}
// ---------- Schweizer QR-Rechnung (Swiss Payments Code) ----------
// Erzeugt einen QR-Code, den Banking-Apps scannen können (Konto, Empfänger, Betrag, Referenz).
const cleanIban = s => String(s || '').replace(/\s/g, '').toUpperCase();
const isQrIban = iban => { const n = +cleanIban(iban).slice(4, 9); return n >= 30000 && n <= 31999; };
function qrMissing(b) {
  const m = [];
  if (!/^(CH|LI)\d{2}[0-9A-Z]{17}$/.test(cleanIban(b.iban))) m.push('IBAN');
  if (!b.cName) m.push('Empfänger');
  if (!b.cZip || !b.cCity) m.push('PLZ/Ort des Empfängers');
  if (isQrIban(b.iban) && String(b.reference || '').replace(/\s/g, '').length !== 27) m.push('QR-Referenz (27 Ziffern)');
  return m;
}
function spcPayload(b) {
  const ref = String(b.reference || '').replace(/\s/g, '');
  const refType = isQrIban(b.iban) ? 'QRR' : /^RF\d{2}/i.test(ref) ? 'SCOR' : 'NON';
  const t = s => String(s || '').replace(/[\r\n]+/g, ' ').trim();
  const msg = [b.invoiceNo ? 'Rechnung ' + b.invoiceNo : '', refType === 'NON' && ref ? ref : ''].filter(Boolean).join(' ').slice(0, 140);
  return ['SPC', '0200', '1', cleanIban(b.iban),
    'S', t(b.cName).slice(0, 70), t(b.cStreet).slice(0, 70), t(b.cHouse).slice(0, 16), t(b.cZip).slice(0, 16), t(b.cCity).slice(0, 35), (t(b.cCountry) || 'CH').toUpperCase().slice(0, 2),
    '', '', '', '', '', '', '',
    has(b.amount) ? (+b.amount).toFixed(2) : '', 'CHF',
    '', '', '', '', '', '', '',
    refType, refType === 'NON' ? '' : ref.toUpperCase(),
    msg, 'EPD'].join('\r\n');
}
function qrSvg(text) {
  if (typeof qrcode !== 'function') return '';
  const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make();
  const n = q.getModuleCount(); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  // Schweizerkreuz in der Mitte (7×7 mm bei 46×46 mm)
  const s = n * 7 / 46, o = (n - s) / 2, k = s / 7;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="qrsvg" role="img" aria-label="QR-Rechnung" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#000"/>
    <rect x="${o - k * .4}" y="${o - k * .4}" width="${s + k * .8}" height="${s + k * .8}" fill="#fff"/><rect x="${o}" y="${o}" width="${s}" height="${s}" fill="#000"/>
    <rect x="${o + 3 * k}" y="${o + 1.5 * k}" width="${k}" height="${4 * k}" fill="#fff"/><rect x="${o + 1.5 * k}" y="${o + 3 * k}" width="${4 * k}" height="${k}" fill="#fff"/></svg>`;
}
const fmtIban = i => cleanIban(i).replace(/(.{4})/g, '$1 ').trim();
const fmtRef = r => { r = String(r || '').replace(/\s/g, ''); return r.length === 27 ? r.slice(0, 2) + ' ' + r.slice(2).replace(/(.{5})/g, '$1 ').trim() : r.replace(/(.{4})/g, '$1 ').trim(); };
function billQR(id) {
  const b = byId('bills', id); if (!b) return;
  const miss = qrMissing(b);
  const row = (l, v, copy) => v ? `<div class="row"><div class="grow"><div class="s">${l}</div><div class="t" style="white-space:normal;word-break:break-word">${esc(v)}</div></div>${copy ? `<button class="icon-btn sm" data-a="copy" data-v="${esc(copy)}" aria-label="Kopieren">${ic('file', 17)}</button>` : ''}</div>` : '';
  modal(`<div class="mh"><h3>Bezahlen: ${esc(b.vendor || b.subject || 'Rechnung')}</h3><button class="icon-btn" data-close>${ic('x')}</button></div>
    ${miss.length ? `<div class="hint" style="margin-bottom:12px">${ic('alert', 16)}<span>Für den QR-Code fehlt noch: <b>${esc(miss.join(', '))}</b>. Ergänze die Angaben in der Rechnung.</span></div>`
      : `<div class="qrbox">${qrSvg(spcPayload(b))}</div><p class="s" style="text-align:center;margin:8px 0 12px">Mit der Banking-App scannen (Zahlung erfassen → QR-Code scannen)</p>`}
    ${row('Betrag', has(b.amount) ? chf(b.amount) : '', has(b.amount) ? (+b.amount).toFixed(2) : '')}
    ${row('Konto / Zahlbar an', fmtIban(b.iban), cleanIban(b.iban))}
    ${row('Empfänger', [b.cName, [b.cStreet, b.cHouse].filter(Boolean).join(' '), [b.cZip, b.cCity].filter(Boolean).join(' ')].filter(Boolean).join(', '), b.cName || '')}
    ${row('Referenz', fmtRef(b.reference), String(b.reference || '').replace(/\s/g, ''))}
    ${row('Zahlbar bis', b.due ? fmtD(b.due) : '', '')}
    <div class="mf"><button class="btn" data-a="billEditFromQR" data-id="${b.id}">${ic('edit', 16)} Angaben bearbeiten</button><span class="sp"></span>${billStatus(b) === 'offen' ? `<button class="btn pri" data-a="billPaid" data-id="${b.id}">${ic('check', 16)} Als bezahlt markieren</button>` : ''}</div>`, {accent: 'fin'});
}

function billForm(id) {
  const b = id ? byId('bills', id) : {source: 'manual', received: today(), category: 'Sonstiges', status: 'neu'};
  if (!b) return;
  const cats = [...new Set([...CATS])];
  form({title: id ? 'Rechnung' : 'Rechnung erfassen', accent: 'fin', data: {...b, ignore: b.status === 'ignoriert'}, fields: [
    {k: 'vendor', l: 'Von (Firma / Shop)', req: true, ph: 'z.B. Onlineshop'}, {k: 'amount', l: 'Betrag (CHF)', t: 'number', half: true}, {k: 'due', l: 'Zahlbar bis', t: 'date', half: true},
    {k: 'category', l: 'Kategorie', t: 'select', opt: cats, half: true}, {k: 'invoiceNo', l: 'Rechnungsnummer', half: true},
    {k: 'iban', l: 'IBAN / QR-IBAN', ph: 'CH..'}, {k: 'reference', l: 'Referenz (QR/RF)', ph: 'optional'},
    {t: 'html', html: '<div class="s" style="margin-top:2px">Empfänger (für den Zahlungs-QR-Code)</div>'},
    {k: 'cName', l: 'Name / Firma'}, {k: 'cStreet', l: 'Strasse', half: true}, {k: 'cHouse', l: 'Nr.', half: true},
    {k: 'cZip', l: 'PLZ', half: true}, {k: 'cCity', l: 'Ort', half: true},
    {k: 'note', l: 'Notiz', t: 'textarea', rows: 2},
    {k: 'ignore', l: 'Ignorieren (nicht ins Budget übernehmen)', t: 'check'}],
    extra: b.source === 'mail' ? `<div class="hint">${ic('mail', 16)}<span>Per Mail importiert${b.from ? ' von ' + esc(b.from) : ''}${b.received ? ' am ' + fmtD(b.received) : ''}${b.subject ? ' – «' + esc(b.subject) + '»' : ''}</span></div>` : '',
    attach: {coll: 'bills', label: 'Rechnung als PDF oder Foto', meta: () => ({module: 'safe', folder: 'Belege'})},
    onSave(v) {
      const ignore = v.ignore; delete v.ignore;
      const n = upsert('bills', {...b, ...v, status: ignore ? 'ignoriert' : (b.status === 'ignoriert' ? 'neu' : b.status)});
      if (ignore || !has(n.amount)) unplanBill(n); else planBill(n);
      return n;
    },
    onDelete: id ? () => { unplanBill(b); remove('bills', id); } : null});
}

// ---------- Einkauf ----------
views.shop = r => {
  const tab = r.tab || 'listen';
  let body, actions = '';
  if (tab === 'essen') { body = mealView(); }
  else if (tab === 'rezepte') { body = recipeView(); actions = `<button class="icon-btn pri" data-a="recipeNew" aria-label="Neues Rezept">${ic('plus')}</button>`; }
  else { body = listView(); actions = `<button class="icon-btn pri" data-a="listNew" aria-label="Neue Liste">${ic('plus')}</button>`; }
  return page({title: 'Einkauf', accent: 'shop', mod: 'shop', tab, tabs: [['listen', 'Listen'], ['essen', 'Essensplan'], ['rezepte', 'Rezepte']], actions, body});
};
function itemRow(i) {
  const by = i.addedBy && i.addedBy !== me().id && mem(i.addedBy) ? 'von ' + mem(i.addedBy).name : '';
  const sub = [i.note, by].filter(Boolean).join(' · ');
  return `<div class="row"><button class="chk${i.done ? ' on' : ''}" data-a="itemToggle" data-id="${i.id}" aria-label="Abhaken">${i.done ? ic('check', 16) : ''}</button>
    <div class="grow clickable" data-a="edit" data-c="items" data-id="${i.id}"><div class="t${i.done ? ' strike' : ''}">${i.qty ? `<b>${esc(i.qty)}${/^\d+([.,]\d+)?$/.test(String(i.qty).trim()) ? '×' : ''}</b> ` : ''}${esc(i.text)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>
    ${has(i.price) ? `<span class="amt sm">${chf(i.price)}</span>` : ''}
    ${i.budgetEntryId ? `<button class="badge fin" data-a="unbook" data-id="${i.budgetEntryId}" title="Buchung rückgängig machen">${ic('check', 12)} Budget</button>` : `<button class="icon-btn sm" data-a="bookOne" data-id="${i.id}" title="Ins Budget übernehmen" aria-label="Ins Budget">${ic('coin', 19)}</button>`}</div>`;
}
function listView() {
  if (!S.lists.length) return `<div class="card"><p class="empty">Noch keine Einkaufsliste.</p><div style="text-align:center"><button class="btn pri" data-a="listNew">${ic('plus', 16)} Liste anlegen</button></div></div>`;
  const L = byId('lists', ui.shopList) || S.lists[0]; ui.shopList = L.id;
  const its = S.items.filter(i => i.listId === L.id), open = its.filter(i => !i.done), done = its.filter(i => i.done);
  const unbookedDone = done.filter(i => !i.budgetEntryId), unbookedAll = its.filter(i => !i.budgetEntryId);
  const sumOpen = open.reduce((a, i) => a + (+i.price || 0), 0);
  return `<div class="chips">${S.lists.map(l => { const n = S.items.filter(i => i.listId === l.id && !i.done).length; return `<button class="chip${l.id === L.id ? ' on' : ''}" data-a="listSel" data-id="${l.id}">${esc(l.name)}${n ? `<small>${n}</small>` : ''}</button>`; }).join('')}</div>
    <div class="card"><div class="ch"><h3>${esc(L.name)}</h3><span class="badge fin" title="Budget-Kategorie">${ic('coin', 12)} ${esc(L.category || 'Sonstiges')}</span><button class="icon-btn sm" data-a="listEdit" data-id="${L.id}" aria-label="Liste bearbeiten">${ic('edit', 18)}</button></div>
      <form class="qadd" id="qadd" data-f="itemAdd"><input name="text" placeholder="Artikel hinzufügen … (z.B. 2 Milch)" autocomplete="off" enterkeyhint="done"><input name="price" class="w90" placeholder="CHF" inputmode="decimal" autocomplete="off"><button class="icon-btn pri" aria-label="Hinzufügen">${ic('plus')}</button></form>
      ${open.map(itemRow).join('') || '<p class="empty">Alles eingekauft ✓</p>'}
      ${sumOpen ? `<div class="small muted" style="text-align:right;padding-top:6px">Geschätzt offen: <b>${chf(sumOpen)}</b></div>` : ''}
    </div>
    ${done.length ? `<div class="card"><div class="ch"><h3>Erledigt <span class="muted" style="font-weight:600">(${done.length})</span></h3></div>${done.map(itemRow).join('')}
      <div class="gridbtns" style="margin-top:10px">${unbookedDone.length ? `<button class="btn sm pri" data-a="bookDone">${ic('coin', 15)} ${unbookedDone.length} erledigte ins Budget</button>` : ''}<button class="btn sm" data-a="clearDone">${ic('trash', 15)} Erledigte entfernen</button></div></div>` : ''}
    ${unbookedAll.length > 1 ? `<div class="gridbtns" style="margin-bottom:12px"><button class="btn" data-a="bookAll">${ic('coin', 16)} Ganze Liste fürs Budget einplanen</button></div>` : ''}
    <div class="hint">${ic('coin', 16)}<span>Mit dem Münz-Symbol übernimmst du Artikel mit einem Klick als variable Kosten ins Budget – standardmässig für den <b>nächsten Monat</b>. Mit «Budget» machst du es rückgängig.</span></div>`;
}
function mealView() {
  const ws = ui.mealWeek, days = [...Array(7)].map((_, i) => addDays(ws, i));
  const rows = days.map(d => {
    const m = S.meals[d] || {}, rec = byId('recipes', m.recipeId), label = rec ? rec.name : m.text;
    return `<div class="row clickable" data-a="mealEdit" data-d="${d}"><div class="daycol${d === today() ? ' today' : ''}"><b>${wdShort(d)}</b><small>${fmtDs(d)}</small></div><div class="grow"><div class="t">${label ? esc(label) : '<span class="muted" style="font-weight:500">– nichts geplant –</span>'}</div>${m.note ? `<div class="s">${esc(m.note)}</div>` : ''}</div>${rec ? `<span class="badge shop">Rezept</span>` : ''}</div>`;
  }).join('');
  return `<div class="card"><div class="mnav"><button class="icon-btn" data-a="mealWeek" data-n="-7">${ic('left')}</button><b>Woche ${fmtDs(ws)} – ${fmtDs(addDays(ws, 6))}</b><button class="icon-btn" data-a="mealWeek" data-n="7">${ic('right')}</button></div>${rows}</div>
    <div class="gridbtns" style="margin-bottom:12px"><button class="btn pri" data-a="mealToList">${ic('cart', 16)} Zutaten der Woche auf die Einkaufsliste</button></div>
    <div class="hint">${ic('food', 16)}<span>Wähle für einen Tag ein Rezept – die Zutaten landen dann mit einem Klick auf der Einkaufsliste (Doppelte werden übersprungen).</span></div>`;
}
function recipeView() {
  if (!S.recipes.length) return `<div class="card"><p class="empty">Noch keine Rezepte.</p></div>`;
  return `<div class="card">${S.recipes.slice().sort((a, b) => a.name.localeCompare(b.name)).map(x => { const n = (x.ingredients || '').split('\n').filter(s => s.trim()).length; return `<div class="row"><span class="muted">${ic('food', 20)}</span><div class="grow clickable" data-a="edit" data-c="recipes" data-id="${x.id}"><div class="t">${esc(x.name)}</div><div class="s">${n} Zutaten${x.tags ? ' · ' + esc(x.tags) : ''}</div></div><button class="btn sm" data-a="recipeToList" data-id="${x.id}">${ic('cart', 15)} Auf Liste</button></div>`; }).join('')}</div>`;
}
function addIngredients(listId, lines) {
  let n = 0;
  for (const raw of lines) {
    const text = raw.trim(); if (!text) continue;
    if (S.items.some(i => i.listId === listId && !i.done && i.text.toLowerCase() === text.toLowerCase())) continue;
    upsert('items', {listId, text, qty: '', price: null, done: false, addedBy: me().id}); n++;
  }
  return n;
}
function pickListThen(title, fn) {
  if (!S.lists.length) { toast('Bitte zuerst eine Einkaufsliste anlegen'); return; }
  const def = (S.lists.find(l => /lebensmittel/i.test(l.name)) || S.lists[0]).id;
  form({title, accent: 'shop', fields: [{k: 'listId', l: 'Auf welche Liste?', t: 'select', opt: S.lists.map(l => [l.id, l.name]), def}], saveLabel: 'Hinzufügen', onSave: v => fn(v.listId)});
}
function bookForm(listId, itemIds) {
  const L = byId('lists', listId), its = itemIds.map(id => byId('items', id)).filter(Boolean);
  if (!its.length) return;
  const sum = its.reduce((a, i) => a + (+i.price || 0), 0), nm = curMonth(), nx = mAdd(nm, 1);
  const allDone = its.every(i => i.done);
  form({title: 'Ins Budget übernehmen', accent: 'fin', fields: [
    {t: 'html', html: `<div class="hint">${ic('cart', 16)}<span>${its.length} Artikel: ${esc(its.map(i => i.text).slice(0, 8).join(', '))}${its.length > 8 ? ' …' : ''}</span></div>`},
    {k: 'name', l: 'Bezeichnung', def: its.length === 1 ? its[0].text : `Einkauf ${L ? L.name : ''}`},
    {k: 'amount', l: 'Betrag (CHF)', t: 'number', req: true, half: true, def: sum ? sum.toFixed(2) : '', ph: 'z.B. 79.90'},
    {k: 'month', l: 'Budget-Monat', t: 'select', half: true, def: nx, opt: [[nx, 'Nächster Monat · ' + MONTHS[+nx.slice(5) - 1]], [nm, 'Dieser Monat · ' + MONTHS[+nm.slice(5) - 1]], [mAdd(nm, 2), 'Übernächster · ' + MONTHS[+mAdd(nm, 2).slice(5) - 1]]]},
    {k: 'category', l: 'Kategorie', t: 'select', opt: CATS, def: L?.category || 'Sonstiges'},
    {k: 'paid', l: 'Bereits bezahlt', t: 'check', def: allDone},
  ], saveLabel: 'Ins Budget buchen', onSave(v) {
    const e = upsert('entries', {month: v.month, name: v.name || 'Einkauf', amount: v.amount, kind: 'variable', category: v.category, paid: v.paid, paidAt: v.paid ? today() : '', source: {type: 'shop', listId, itemIds: its.map(i => i.id)}, by: me().id});
    its.forEach(i => i.budgetEntryId = e.id);
    toast(`${chf(v.amount)} im Budget ${fmtM(v.month)} eingeplant`);
  }});
}

// ---------- Haus ----------
const HOUSE_TABS = [['uebersicht', 'Übersicht'], ['raeume', 'Räume'], ['kosten', 'Kosten'], ['offerten', 'Offerten'], ['zeitplan', 'Zeitplan'], ['maengel', 'Mängel'], ['kontakte', 'Kontakte'], ['plaene', 'Pläne & Notizen']];
views.house = r => {
  const tab = r.tab || 'uebersicht';
  if (tab === 'raum') return roomDetail(r.arg);
  const map = {uebersicht: [houseOverview, 'houseEdit', 'edit'], raeume: [houseRooms, 'unitNew', 'plus'], kosten: [houseCosts, 'costNew', 'plus'], offerten: [houseOffers, 'offerNew', 'plus'], zeitplan: [houseTimeline, 'milestoneNew', 'plus'], maengel: [houseDefects, 'defectNew', 'plus'], kontakte: [houseContacts, 'contactNew', 'plus'], plaene: [housePlans, 'noteNew', 'plus']};
  const [fn, act, icn] = map[tab] || map.uebersicht;
  return page({title: S.house.name || 'Haus', accent: 'house', mod: 'house', tab, tabs: HOUSE_TABS, actions: `<button class="icon-btn pri" data-a="${act}" aria-label="Hinzufügen">${ic(icn)}</button>`, body: fn()});
};
function houseOverview() {
  const H = S.house, st = houseStats(), t = today();
  const msOpen = S.milestones.filter(m => !m.done && m.date).sort((a, b) => a.date.localeCompare(b.date));
  const msPct = pct(S.milestones.filter(m => m.done).length, S.milestones.length);
  const pays = S.hcosts.filter(c => c.due && c.status !== 'bezahlt').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const openDef = S.defects.filter(d => d.status !== 'behoben').length;
  const cd = H.start ? daysBetween(t, H.start) : null, cm = H.moveIn ? daysBetween(t, H.moveIn) : null;
  return `<div class="card"><div class="ch"><h3>${esc(H.name || 'Unser Haus')}</h3><button class="icon-btn sm" data-a="houseEdit">${ic('edit', 18)}</button></div>
      <div class="kv">${H.address ? `<span>Adresse</span><span>${esc(H.address)}</span>` : ''}<span>Baustart</span><span>${H.start ? fmtD(H.start) + (cd > 0 ? ` <span class="badge house">in ${cd} Tagen</span>` : '') : '–'}</span><span>Bezug</span><span>${H.moveIn ? fmtD(H.moveIn) + (cm > 0 ? ` <span class="badge house">in ${cm} Tagen</span>` : '') : '–'}</span></div></div>
    <div class="card"><div class="ch"><h3>Budget</h3><a class="btn sm" href="#/house/kosten">Kosten</a></div>
      <div class="l small muted">Gesamtbudget</div><div class="big">${st.budget ? chf0(st.budget) : '–'}</div>
      <div class="bar lg" style="margin:10px 0 8px"><i style="width:${clamp(pct(st.paid, st.budget || st.stand), 0, 100)}%"></i><i class="b2" style="width:${clamp(pct(st.stand - st.paid, st.budget || st.stand), 0, 100 - clamp(pct(st.paid, st.budget || st.stand), 0, 100))}%"></i></div>
      <div class="stats"><div class="stat"><div class="l">Kostenstand</div><div class="v">${chf0(st.stand)}</div></div><div class="stat"><div class="l">davon bezahlt</div><div class="v">${chf0(st.paid)}</div></div>
      <div class="stat"><div class="l">Reserve</div><div class="v" style="color:${st.reserve < 0 ? 'var(--danger)' : 'var(--ok)'}">${st.budget ? chf0(st.reserve) : '–'}</div></div><div class="stat"><div class="l">Budget-Summe Posten</div><div class="v">${chf0(st.planned)}</div></div></div>
      <div class="s" style="margin-top:8px">Kostenstand = effektive Kosten, sonst Offerte, sonst Budget pro Posten.</div></div>
    ${S.units.length ? `<div class="card"><div class="ch"><h3>Pro Einheit</h3><a class="btn sm" href="#/house/raeume">Räume</a></div>${S.units.map(u => { const b = unitBudget(u), s = unitStand(u); return `<div class="cbar clickable" data-a="go" data-h="#/house/raeume"><div class="cl"><span>${esc(u.name)}</span><span><b>${chf0(s)}</b> <span class="muted">/ ${chf0(b)}</span></span></div><div class="bar"><i style="width:${clamp(pct(s, b || s), 0, 100)}%;${b && s > b ? 'background:var(--danger)' : ''}"></i></div></div>`; }).join('')}</div>` : ''}
    <div class="card"><div class="ch"><h3>Zeitplan</h3><span class="badge house">${msPct} %</span><a class="btn sm" href="#/house/zeitplan">Alle</a></div>
      <div class="bar" style="margin-bottom:6px"><i style="width:${msPct}%"></i></div>
      ${msOpen.slice(0, 3).map(m => `<div class="row clickable" data-a="edit" data-c="milestones" data-id="${m.id}"><span class="bullet" style="background:var(--house)"></span><div class="grow"><div class="t">${esc(m.title)}</div><div class="s">${fmtD(m.date)} · ${inDays(daysBetween(t, m.date))}</div></div></div>`).join('') || '<p class="empty">Keine offenen Meilensteine</p>'}</div>
    ${pays.length ? `<div class="card"><div class="ch"><h3>Anstehende Zahlungen</h3></div>${pays.map(c => `<div class="row clickable" data-a="edit" data-c="hcosts" data-id="${c.id}"><div class="grow"><div class="t">${esc(c.title)}</div><div class="s"${c.due < t ? ' style="color:var(--danger)"' : ''}>fällig ${fmtD(c.due)} · ${esc(scopeLabel(c))}</div></div><div class="amt">${chf0(costNow(c))}</div></div>`).join('')}</div>` : ''}
    <div class="gridbtns"><a class="btn" href="#/house/maengel">${ic('wrench', 16)} ${openDef} offene Mängel</a><a class="btn" href="#/house/plaene">${ic('image', 16)} ${S.files.filter(f => f.module === 'haus').length} Pläne & Fotos</a><a class="btn" href="#/house/kontakte">${ic('users', 16)} ${S.contacts.length} Kontakte</a></div>`;
}
function roomRow(r) {
  const s = roomStand(r), b = +r.budget || 0, nf = S.files.filter(f => f.roomId === r.id).length;
  return `<div class="row clickable" data-a="go" data-h="#/house/raum/${r.id}"><div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${r.area ? r.area + ' m² · ' : ''}${nf ? nf + ' Dateien · ' : ''}Budget ${chf0(b)}</div>
    ${b ? `<div class="bar" style="margin-top:6px;height:5px"><i style="width:${clamp(pct(s, b), 0, 100)}%;${s > b ? 'background:var(--danger)' : ''}"></i></div>` : ''}</div><div class="amt sm" style="color:${b && s > b ? 'var(--danger)' : 'inherit'}">${chf0(s)}</div>${ic('right', 16)}</div>`;
}
function houseRooms() {
  if (!S.units.length) return `<div class="card"><p class="empty">Lege zuerst eine Einheit an – z.B. «Appartement 1», «Einliegerwohnung» oder «Erdgeschoss».</p><div style="text-align:center"><button class="btn pri" data-a="unitNew">${ic('plus', 16)} Einheit anlegen</button></div></div>`;
  return S.units.map(u => {
    const rooms = S.rooms.filter(r => r.unitId === u.id), area = rooms.reduce((a, r) => a + (+r.area || 0), 0);
    return `<div class="card"><div class="ch"><h3>${esc(u.name)}</h3><span class="s">${area ? area + ' m²' : ''}</span><button class="icon-btn sm" data-a="unitEdit" data-id="${u.id}">${ic('edit', 18)}</button></div>
      <div class="small muted" style="margin-bottom:4px">Kostenstand ${chf0(unitStand(u))} von ${chf0(unitBudget(u))}</div>
      ${rooms.map(roomRow).join('') || '<p class="empty">Noch keine Räume</p>'}
      <div style="padding-top:8px"><button class="btn sm" data-a="roomNew" data-unit="${u.id}">${ic('plus', 15)} Raum</button></div></div>`;
  }).join('') + `<div class="gridbtns"><button class="btn" data-a="unitNew">${ic('plus', 16)} Einheit / Appartement</button></div>`;
}
function costRow(c) {
  const ct = byId('contacts', c.contactId);
  return `<div class="row clickable" data-a="edit" data-c="hcosts" data-id="${c.id}"><div class="grow"><div class="t">${esc(c.title)} ${statusBadge(c.status)}</div>
    <div class="s">${esc(scopeLabel(c))}${ct ? ' · ' + esc(ct.company || ct.name) : ''}${c.due && c.status !== 'bezahlt' ? ' · fällig ' + fmtDs(c.due) : ''}</div>
    <div class="s">Budget ${has(c.budget) ? chf0(c.budget) : '–'} · Offerte ${has(c.offer) ? chf0(c.offer) : '–'} · Effektiv ${has(c.actual) ? chf0(c.actual) : '–'}</div></div>
    <div class="amt" style="color:${has(c.budget) && costNow(c) > +c.budget ? 'var(--danger)' : 'inherit'}">${chf0(costNow(c))}</div></div>`;
}
function houseCosts() {
  const f = ui.houseFilter;
  const xs = S.hcosts.filter(c => !f || (f === 'general' ? !c.unitId && !c.roomId : f.startsWith('u:') ? c.unitId === f.slice(2) : c.roomId === f.slice(2)));
  const sb = xs.reduce((a, c) => a + (+c.budget || 0), 0), ss = xs.reduce((a, c) => a + costNow(c), 0), sp = xs.filter(c => c.status === 'bezahlt').reduce((a, c) => a + costNow(c), 0);
  const opts = [['', 'Alle Bereiche'], ['general', 'Allgemein / ganzes Haus'], ...scopeOpts().slice(1)];
  const groups = HOUSE_STATUS.map(([k, l]) => [l, xs.filter(c => (c.status || 'geplant') === k)]);
  return `<div class="card"><select data-ch="houseFilter" style="margin-bottom:10px">${opts.map(([v, l]) => `<option value="${v}"${v === f ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <div class="stats"><div class="stat"><div class="l">Budget</div><div class="v">${chf0(sb)}</div></div><div class="stat"><div class="l">Kostenstand</div><div class="v" style="color:${ss > sb && sb ? 'var(--danger)' : 'inherit'}">${chf0(ss)}</div></div></div>
      <div class="s" style="margin-top:8px">davon bezahlt ${chf0(sp)} · Differenz zum Budget ${chf0(sb - ss)}</div></div>
    <div class="card">${groups.filter(g => g[1].length).map(([l, cs]) => `<div class="sech">${l}<span>${chf0(cs.reduce((a, c) => a + costNow(c), 0))}</span></div>${cs.map(costRow).join('')}`).join('') || '<p class="empty">Keine Kostenposten</p>'}</div>`;
}
function houseOffers() {
  const trades = [...new Set(S.offers.map(o => o.trade))];
  if (!trades.length) return `<div class="card"><p class="empty">Noch keine Offerten.<br>Erfasse mehrere Offerten pro Gewerk (z.B. Küche, Fenster, Bodenbeläge), hänge das PDF oder ein Foto an und vergleiche sie.</p><div style="text-align:center"><button class="btn pri" data-a="offerNew">${ic('plus', 16)} Offerte erfassen</button></div></div>`;
  const star = on => on ? `<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${I.star}</svg>` : ic('star', 20);
  return trades.map(tr => {
    const os = S.offers.filter(o => o.trade === tr).sort((a, b) => (+a.amount || 0) - (+b.amount || 0)), min = Math.min(...os.map(o => +o.amount || Infinity));
    return `<div class="card"><div class="ch"><h3>${esc(tr)}</h3><span class="badge">${os.length} Offerte${os.length === 1 ? '' : 'n'}</span><button class="btn sm" data-a="offerNew" data-trade="${esc(tr)}">${ic('plus', 15)} Offerte</button></div>
      ${os.map(o => `<div class="offer${o.chosen ? ' chosen' : ''}"><div class="top2">
          <button class="icon-btn sm" data-a="offerChoose" data-id="${o.id}" title="Diese Offerte wählen" style="color:${o.chosen ? 'var(--shop)' : 'var(--muted)'}">${star(o.chosen)}</button>
          <div class="grow clickable" data-a="edit" data-c="offers" data-id="${o.id}"><div class="t">${esc(o.vendor)} ${o.chosen ? '<span class="badge house">gewählt</span>' : ''}${+o.amount === min && os.length > 1 ? ' <span class="badge ok">günstigste</span>' : ''}</div>${o.note ? `<div class="s">${esc(o.note)}</div>` : ''}</div>
          <div style="text-align:right"><div class="amt">${chf0(o.amount)}</div>${os.length > 1 && +o.amount !== min ? `<div class="s">+${chf0(o.amount - min)}</div>` : ''}</div></div>
        ${attachChips('offers', o.id, 'Offerte anhängen (PDF / Foto)')}</div>`).join('')}</div>`;
  }).join('') + `<div class="hint">${ic('star', 16)}<span>Mit dem Stern wählst du eine Offerte – sie wird automatisch als vergebener Posten in die Kosten übernommen. Das Offerte-PDF oder ein Foto hängst du direkt an jede Offerte.</span></div>`;
}
function houseTimeline() {
  const ms = S.milestones.slice().sort((a, b) => (a.date || '9').localeCompare(b.date || '9')), p = pct(ms.filter(m => m.done).length, ms.length), t = today();
  return `<div class="card"><div class="cl"><b>Fortschritt</b><span>${p} %</span></div><div class="bar lg"><i style="width:${p}%"></i></div></div>
    <div class="card"><div class="timeline">${ms.map(m => `<div class="ms"><div class="dotc"><button class="chk${m.done ? ' on' : ''}" data-a="msToggle" data-id="${m.id}">${m.done ? ic('check', 14) : ''}</button><span class="ln"></span></div>
      <div class="grow clickable" data-a="edit" data-c="milestones" data-id="${m.id}" style="padding-bottom:6px"><div class="t${m.done ? ' strike' : ''}">${esc(m.title)}</div><div class="s"${!m.done && m.date && m.date < t ? ' style="color:var(--danger)"' : ''}>${m.date ? fmtD(m.date) + (m.done ? '' : ' · ' + inDays(daysBetween(t, m.date))) : 'ohne Datum'}</div>${m.note ? `<div class="s">${esc(m.note)}</div>` : ''}</div></div>`).join('') || '<p class="empty">Noch keine Meilensteine</p>'}</div></div>
    <div class="hint">${ic('cal', 16)}<span>Meilensteine erscheinen automatisch im gemeinsamen Kalender.</span></div>`;
}
function defectRow(d) {
  const r = byId('rooms', d.roomId), ct = byId('contacts', d.contactId);
  return `<div class="row" style="align-items:flex-start"><button class="chk${d.status === 'behoben' ? ' on' : ''}" data-a="defectToggle" data-id="${d.id}" style="margin-top:2px">${d.status === 'behoben' ? ic('check', 16) : ''}</button>
    <div class="grow"><div class="clickable" data-a="edit" data-c="defects" data-id="${d.id}"><div class="t${d.status === 'behoben' ? ' strike' : ''}">${esc(d.text)}</div><div class="s">${[r ? r.name : '', ct ? ct.company || ct.name : '', d.date ? fmtD(d.date) : ''].filter(Boolean).map(esc).join(' · ')}</div></div>${attachChips('defects', d.id, 'Foto hinzufügen')}</div></div>`;
}
function houseDefects() {
  const f = ui.defectFilter, xs = S.defects.filter(d => f === 'alle' || (f === 'offen' ? d.status !== 'behoben' : d.status === 'behoben'));
  return `<div class="chips">${[['offen', 'Offen'], ['behoben', 'Behoben'], ['alle', 'Alle']].map(([k, l]) => `<button class="chip${f === k ? ' on' : ''}" data-a="defectFilter" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="card">${xs.map(defectRow).join('') || `<p class="empty">${f === 'offen' ? 'Keine offenen Mängel.' : 'Keine Einträge.'}<br><span class="small">Bei der Bauabnahme und danach: Mangel erfassen, Foto machen, Handwerker zuordnen.</span></p>`}</div>`;
}
function houseContacts() {
  return `<div class="card">${S.contacts.slice().sort((a, b) => (a.trade || '').localeCompare(b.trade || '')).map(c => `<div class="row"><span class="av" style="background:var(--house);width:36px;height:36px">${esc((c.name || '?')[0])}</span>
    <div class="grow clickable" data-a="edit" data-c="contacts" data-id="${c.id}"><div class="t">${esc(c.name)}</div><div class="s">${[c.trade, c.company].filter(Boolean).map(esc).join(' · ')}</div></div>
    ${c.phone ? `<a class="icon-btn sm" href="tel:${esc(c.phone.replace(/\s/g, ''))}" aria-label="Anrufen">${ic('phone', 18)}</a>` : ''}${c.email ? `<a class="icon-btn sm" href="mailto:${esc(c.email)}" aria-label="E-Mail">${ic('mail', 18)}</a>` : ''}</div>`).join('') || '<p class="empty">Noch keine Kontakte – Architekt, Bauleitung, Handwerker …</p>'}</div>`;
}
function housePlans() {
  const cat = ui.hFileCat, fs = S.files.filter(f => f.module === 'haus' && (cat === 'Alle' || f.category === cat)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return `<div class="card"><div class="ch"><h3>Pläne & Fotos</h3><button class="btn sm pri" data-a="houseUpload">${ic('upload', 15)} Hochladen</button></div>
      <div class="chips">${['Alle', ...HOUSE_FCAT].map(k => `<button class="chip${cat === k ? ' on' : ''}" data-a="hFileCat" data-f="${k}">${k}<small>${S.files.filter(f => f.module === 'haus' && (k === 'Alle' || f.category === k)).length}</small></button>`).join('')}</div>
      ${fs.length ? `<div class="gal">${fs.map(fileTile).join('')}</div>` : '<p class="empty">Noch keine Dateien. Grundrisse, Baustellenfotos, Inspiration …</p>'}</div>
    <div class="card"><div class="ch"><h3>Notizen & Entscheide</h3><button class="btn sm" data-a="noteNew">${ic('plus', 15)} Notiz</button></div>
      ${S.hnotes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(n => `<div class="row clickable" data-a="edit" data-c="hnotes" data-id="${n.id}"><span class="muted">${ic('note', 20)}</span><div class="grow"><div class="t">${esc(n.title)}</div><div class="s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${n.date ? fmtD(n.date) + ' · ' : ''}${esc((n.text || '').slice(0, 90))}</div></div></div>`).join('') || '<p class="empty">Noch keine Notizen</p>'}</div>`;
}
function roomDetail(id) {
  const r = byId('rooms', id);
  if (!r) return page({title: 'Raum', accent: 'house', mod: 'house', back: '#/house/raeume', body: '<div class="card"><p class="empty">Raum nicht gefunden.</p></div>'});
  const u = byId('units', r.unitId), cs = S.hcosts.filter(c => c.roomId === id), s = roomStand(r), b = +r.budget || 0;
  const fs = S.files.filter(f => f.roomId === id), ds = S.defects.filter(d => d.roomId === id);
  return page({title: r.name, accent: 'house', mod: 'house', back: '#/house/raeume', actions: `<button class="icon-btn" data-a="roomEdit" data-id="${id}" aria-label="Raum bearbeiten">${ic('edit')}</button>`, body:
    `<div class="card"><div class="s">${esc(u?.name || '')}${r.area ? ' · ' + r.area + ' m²' : ''}</div>
      <div class="stats" style="margin-top:8px"><div class="stat"><div class="l">Budget</div><div class="v">${chf0(b)}</div></div><div class="stat"><div class="l">Kostenstand</div><div class="v" style="color:${b && s > b ? 'var(--danger)' : 'inherit'}">${chf0(s)}</div></div></div>
      ${b ? `<div class="bar" style="margin-top:10px"><i style="width:${clamp(pct(s, b), 0, 100)}%;${s > b ? 'background:var(--danger)' : ''}"></i></div>` : ''}${r.note ? `<p class="small">${esc(r.note)}</p>` : ''}</div>
    <div class="card"><div class="ch"><h3>Kosten</h3><button class="btn sm" data-a="costNew" data-scope="r:${id}">${ic('plus', 15)} Posten</button></div>${cs.map(costRow).join('') || '<p class="empty">Noch keine Kosten für diesen Raum</p>'}</div>
    <div class="card"><div class="ch"><h3>Pläne & Fotos</h3><button class="btn sm" data-a="houseUpload" data-room="${id}">${ic('upload', 15)} Hochladen</button></div>${fs.length ? `<div class="gal">${fs.map(fileTile).join('')}</div>` : '<p class="empty">Noch keine Dateien</p>'}</div>
    <div class="card"><div class="ch"><h3>Mängel</h3><button class="btn sm" data-a="defectNew" data-room="${id}">${ic('plus', 15)} Mangel</button></div>${ds.map(defectRow).join('') || '<p class="empty">Keine Mängel erfasst</p>'}</div>`});
}

// ---------- Safe ----------
views.safe = r => {
  if (safeLocked()) return page({title: 'Safe', accent: 'safe', mod: 'safe', body: `<div class="lock"><div class="lockic">${ic('lock', 34)}</div><h2>Safe gesperrt</h2><p class="muted" style="margin:0">PIN eingeben, um Dokumente, Verträge und Belege zu sehen.</p>
    <form data-f="unlock" class="lockf"><input name="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN"><button class="btn pri">Öffnen</button></form></div>`});
  const tab = r.tab || 'dokumente';
  const map = {dokumente: [safeDocs, 'safeUpload', 'upload'], vertraege: [safeContracts, 'contractNew', 'plus'], garantien: [safeWarranties, 'warrantyNew', 'plus']};
  const [fn, act, icn] = map[tab] || map.dokumente;
  const lockBtn = S.settings.pinHash ? `<button class="icon-btn" data-a="safeLock" aria-label="Sperren">${ic('lock', 19)}</button>` : '';
  return page({title: 'Safe', accent: 'safe', mod: 'safe', tab, tabs: [['dokumente', 'Dokumente'], ['vertraege', 'Verträge & Abos'], ['garantien', 'Garantien & Belege']], actions: lockBtn + `<button class="icon-btn pri" data-a="${act}" aria-label="Hinzufügen">${ic(icn)}</button>`, body: fn()});
};
function safeDocList() {
  const q = ui.safeQ.toLowerCase(), fo = ui.safeFolder;
  const fs = S.files.filter(f => f.module === 'safe' && (fo === 'Alle' || f.folder === fo) && (!q || [f.name, f.tags, f.folder].join(' ').toLowerCase().includes(q))).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!fs.length) return `<p class="empty">${q ? 'Nichts gefunden.' : 'Noch keine Dokumente in diesem Ordner.'}</p>`;
  return fs.map(f => {
    const d = f.expiry ? daysBetween(today(), f.expiry) : null;
    const link = f.link ? f.link.split(':') : null, linked = link && byId(link[0], link[1]);
    return `<div class="row clickable" data-a="fileOpen" data-id="${f.id}"><span class="thumb">${isImg(f) ? `<img data-fid="${f.id}" alt="">` : ic('file', 22)}</span>
      <div class="grow"><div class="t" style="white-space:nowrap">${esc(f.name)}</div><div class="s">${esc(f.folder || '')} · ${fmtD(f.date)} · ${sizeFmt(f.size || 0)}${linked ? ' · ' + esc(linked.name || linked.item || '') : ''}${f.tags ? ' · ' + esc(f.tags) : ''}</div></div>
      ${d != null ? `<span class="badge ${d < 0 ? 'danger' : d < 90 ? 'warn' : ''}">${d < 0 ? 'abgelaufen' : 'bis ' + fmtDs(f.expiry) + f.expiry.slice(2, 4)}</span>` : ''}</div>`;
  }).join('');
}
function safeDocs() {
  const all = S.files.filter(f => f.module === 'safe');
  const folders = ['Alle', ...SAFE_FOLDERS.filter(fo => all.some(f => f.folder === fo) || ['Ausweise', 'Versicherungen', 'Steuern', 'Gesundheit', 'Kinder'].includes(fo))];
  return `${!S.settings.pinHash ? `<div class="hint" style="margin-bottom:12px">${ic('lock', 16)}<span>Tipp: Lege unter <a href="#/settings" style="text-decoration:underline">Familie → Safe-PIN</a> eine PIN fest, damit der Safe gesperrt ist.</span></div>` : ''}
    <div class="search">${ic('search', 18)}<input data-in="safeQ" value="${esc(ui.safeQ)}" placeholder="Dokumente durchsuchen …" autocomplete="off"></div>
    <div class="chips">${folders.map(fo => `<button class="chip${ui.safeFolder === fo ? ' on' : ''}" data-a="safeFolder" data-f="${esc(fo)}">${esc(fo)}<small>${fo === 'Alle' ? all.length : all.filter(f => f.folder === fo).length}</small></button>`).join('')}</div>
    <div class="card"><div class="ch"><h3>${esc(ui.safeFolder === 'Alle' ? 'Alle Dokumente' : ui.safeFolder)}</h3><button class="btn sm pri" data-a="safeUpload">${ic('upload', 15)} Hochladen</button></div><div id="safeList">${safeDocList()}</div></div>
    <div class="hint">${ic('camera', 16)}<span>Auf dem Handy kannst du beim Hochladen direkt die Kamera nutzen – z.B. um Ausweise, Policen oder Arztberichte abzufotografieren. Ein Ablaufdatum (z.B. beim Pass) erinnert dich rechtzeitig.</span></div>`;
}
function safeContracts() {
  const mon = c => (+c.amount || 0) / (+c.interval || 1);
  const tot = S.contracts.reduce((a, c) => a + mon(c), 0), inB = S.contracts.filter(c => c.inBudget).reduce((a, c) => a + mon(c), 0);
  const xs = S.contracts.slice().sort((a, b) => (contractInfo(a).deadline || '9999').localeCompare(contractInfo(b).deadline || '9999'));
  return `<div class="card"><div class="stats"><div class="stat"><div class="l">Kosten / Monat (Ø)</div><div class="v">${chf0(tot)}</div></div><div class="stat"><div class="l">pro Jahr</div><div class="v">${chf0(tot * 12)}</div></div></div>
      <div class="s" style="margin-top:8px">${chf0(inB)} / Mt. davon automatisch im Budget</div></div>
    <div class="card">${xs.map(c => {
      const i = contractInfo(c), nf = linkedFiles('contracts:' + c.id).length;
      return `<div class="row"><div class="grow clickable" data-a="edit" data-c="contracts" data-id="${c.id}"><div class="t">${esc(c.name)} ${c.inBudget ? '<span class="badge fin">im Budget</span>' : ''}</div>
        <div class="s">${[c.provider, c.category, chf(c.amount) + ' ' + ivLabel(c.interval)].filter(Boolean).map(esc).join(' · ')}</div>
        ${i.deadline ? `<div class="s" style="color:${i.days <= 30 ? 'var(--danger)' : i.days <= 90 ? 'var(--warn)' : 'var(--muted)'}">Kündbar bis ${fmtD(i.deadline)} (${inDays(i.days)}) · Ende ${fmtD(i.end)}${c.autoRenew ? ' · verlängert sich' : ''}</div>` : ''}${attachChips('contracts', c.id, 'Vertrag / Police anhängen')}</div></div>`;
    }).join('') || '<p class="empty">Noch keine Verträge – Krankenkasse, Versicherungen, Handy, Streaming …</p>'}</div>
    <div class="hint">${ic('bell', 16)}<span>Mit Vertragsende und Kündigungsfrist berechnet die App das letzte Kündigungsdatum und warnt dich auf dem Dashboard und im Kalender. «Im Budget» übernimmt die Kosten automatisch als Fixposten.</span></div>`;
}
function safeWarranties() {
  const xs = S.warranties.slice().sort((a, b) => (wEnd(a) || '9').localeCompare(wEnd(b) || '9')), t = today();
  return `<div class="card">${xs.map(w => {
    const e = wEnd(w), d = e ? daysBetween(t, e) : null;
    return `<div class="row"><div class="grow clickable" data-a="edit" data-c="warranties" data-id="${w.id}"><div class="t">${esc(w.item)}</div>
      <div class="s">${[w.store, w.date ? 'gekauft ' + fmtD(w.date) : '', has(w.price) ? chf(w.price) : ''].filter(Boolean).map(esc).join(' · ')}</div>
      ${e ? `<div class="s" style="color:${d < 0 ? 'var(--muted)' : d <= 45 ? 'var(--warn)' : 'var(--ok)'}">${d < 0 ? 'Garantie abgelaufen ' + fmtD(e) : 'Garantie bis ' + fmtD(e) + ' (' + inDays(d) + ')'}</div>` : ''}${attachChips('warranties', w.id, 'Quittung anhängen')}</div></div>`;
  }).join('') || '<p class="empty">Noch keine Garantien. Quittung fotografieren, Garantiedauer eintragen – fertig.</p>'}</div>`;
}

// ---------- Einstellungen / Familie ----------
views.settings = () => {
  const s = S.settings;
  return page({title: 'Familie & Einstellungen', accent: 'fam', mod: 'settings', back: '#/', body: `
    <div class="card"><div class="ch"><h3>Familie</h3><button class="btn sm" data-a="memberNew">${ic('plus', 15)} Person</button></div>
      ${S.members.map(m => `<div class="row clickable" data-a="edit" data-c="members" data-id="${m.id}">${avatar(m, 36)}<div class="grow"><div class="t">${esc(m.name)} ${m.id === s.activeUser ? '<span class="badge ok">das bist du</span>' : ''}</div><div class="s">${m.role === 'kind' ? 'Kind' : 'Erwachsen'}${m.birthday ? ' · ' + fmtD(m.birthday) : ''}${m.notes ? ' · ' + esc(m.notes.split('\n')[0]) : ''}</div></div>${ic('right', 16)}</div>`).join('')}
      <div class="s" style="margin-top:8px">Geburtstage erscheinen automatisch im Kalender. Bei Kindern kannst du in den Notizen Kleider- und Schuhgrössen, Allergien usw. festhalten.</div></div>
    <div class="card"><div class="ch"><h3>Konto</h3><span class="badge ok">${ic('shield', 12)} geschützt</span></div>
      <div class="kv" style="margin-bottom:12px"><span>Angemeldet als</span><span><b>${esc(myEmail())}</b></span><span>Person</span><span>${esc(me().name)}${me().email === myEmail() ? '' : ' <span class="badge warn">nicht verknüpft</span>'}</span></div>
      <div class="s" style="margin-bottom:8px">Welche Person bist du? (bestimmt deine Farbe, private Termine und «erstellt von»)</div>
      <div class="chips">${adults().map(m => `<button class="chip${m.email === myEmail() ? ' on' : ''}" data-a="linkMe" data-id="${m.id}">${esc(m.name)}</button>`).join('')}</div>
      <div class="gridbtns" style="margin:4px 0 0"><button class="btn danger" data-a="logout">${ic('unlock', 16)} Abmelden</button></div></div>
    <div class="card"><div class="ch"><h3>Safe-PIN</h3></div><p class="small muted" style="margin-top:0">${s.pinHash ? 'Der Safe ist mit einer PIN geschützt und sperrt sich nach 5 Minuten automatisch.' : 'Noch keine PIN festgelegt – der Safe ist offen.'}</p>
      <div class="gridbtns"><button class="btn" data-a="pinSet">${ic('lock', 16)} ${s.pinHash ? 'PIN ändern' : 'PIN festlegen'}</button>${s.pinHash ? `<button class="btn danger" data-a="pinRemove">PIN entfernen</button>` : ''}</div></div>
    <div class="card"><div class="ch"><h3>Darstellung</h3></div><div class="chips">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => `<button class="chip${s.theme === k ? ' on' : ''}" data-a="setTheme" data-t="${k}">${l}</button>`).join('')}</div></div>
    <div class="card"><div class="ch"><h3>Daten & Backup</h3></div>
      <p class="small muted" style="margin-top:0">Eure Daten werden verschlüsselt übertragen und in eurer privaten Firebase-Datenbank gespeichert – nur freigeschaltete Konten haben Zugriff. Änderungen erscheinen sofort auf beiden Handys, auch offline erfasste Einträge werden nachgereicht. Ein Backup als Datei schadet trotzdem nie.</p>
      <div id="storageInfo" class="s" style="margin-bottom:10px"></div>
      <div class="gridbtns"><button class="btn" data-a="exportData">${ic('download', 16)} Backup herunterladen</button><button class="btn" data-a="importData">${ic('upload', 16)} Backup laden</button></div>
      <div class="gridbtns" style="margin-top:8px">${S.flags.demo ? `<button class="btn danger" data-a="resetData">${ic('trash', 16)} Beispieldaten löschen</button>` : `<button class="btn danger" data-a="resetData">${ic('trash', 16)} Alle Daten löschen</button>`}<button class="btn" data-a="loadDemo">Beispieldaten laden</button></div></div>
    <p class="s" style="text-align:center">Unser Zuhause · v1.0 · PrivatDashboard</p>`});
};

/* =========================================================
   FORMULARE
   ========================================================= */
function eventForm(id, preset = {}) {
  const e = id ? byId('events', id) : {date: preset.date || ui.calDay || today(), shared: true, owner: me().id, repeat: 'none', type: 'termin'};
  if (!e) return;
  form({title: id ? 'Termin bearbeiten' : 'Neuer Termin', accent: 'cal', data: {...e, shared: e.shared ? '1' : '0'}, fields: [
    {k: 'title', l: 'Titel', req: true, ph: 'z.B. Elternabend'},
    {k: 'type', l: 'Art', t: 'select', half: true, opt: [['termin', 'Termin'], ['geburtstag', 'Geburtstag'], ['erinnerung', 'Erinnerung'], ['ferien', 'Ferien / Abwesenheit']]},
    {k: 'shared', l: 'Sichtbar für', t: 'select', half: true, opt: [['1', 'Gemeinsam'], ['0', 'Nur für mich (privat)']]},
    {k: 'date', l: 'Datum', t: 'date', req: true, half: true}, {k: 'end', l: 'Bis (mehrtägig)', t: 'date', half: true},
    {k: 'time', l: 'Von (leer = ganztägig)', t: 'time', half: true}, {k: 'timeEnd', l: 'Bis', t: 'time', half: true},
    {k: 'repeat', l: 'Wiederholung', t: 'select', opt: REPEAT, half: true}, {k: 'owner', l: 'Person', t: 'select', opt: memberOpts(), half: true},
    {k: 'color', l: 'Farbe im Kalender', t: 'select', opt: EV_COLORS},
    {k: 'birthYear', l: 'Geburtsjahr (nur Geburtstage, für Alter)', t: 'number', ph: 'z.B. 1985'},
    {k: 'notes', l: 'Notizen', t: 'textarea', rows: 2}],
    onSave(v) { v.shared = v.shared === '1'; if (v.type === 'geburtstag' && v.repeat === 'none') v.repeat = 'yearly'; if (v.end && v.end < v.date) v.end = ''; upsert('events', {...e, ...v}); ui.calDay = v.date; ui.calMonth = v.date.slice(0, 7); },
    onDelete: id ? () => remove('events', id) : null});
}
function taskForm(id) {
  const t = id ? byId('tasks', id) : {assignee: 'all', repeat: 'none', due: ''};
  if (!t) return;
  form({title: id ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', accent: 'cal', data: t, fields: [
    {k: 'title', l: 'Aufgabe', req: true, ph: 'z.B. Steuererklärung einreichen'},
    {k: 'assignee', l: 'Wer?', t: 'select', opt: memberOpts(true), half: true}, {k: 'due', l: 'Fällig am', t: 'date', half: true},
    {k: 'repeat', l: 'Wiederholen', t: 'select', opt: REPEAT}, {k: 'notes', l: 'Notizen', t: 'textarea', rows: 2}],
    onSave(v) { upsert('tasks', {...t, ...v, done: t.done || false}); }, onDelete: id ? () => remove('tasks', id) : null});
}
function entryForm(id, preset = {}) {
  const e = id ? byId('entries', id) : {month: ui.finMonth || curMonth(), kind: 'variable', category: preset.kind === 'income' ? 'Lohn' : 'Lebensmittel', paid: true, paidAt: today(), ...preset};
  if (!e) return;
  const cats = [...new Set([...CATS, ...INC_CATS])];
  form({title: id ? 'Eintrag bearbeiten' : (e.kind === 'income' ? 'Neue Einnahme' : 'Neue Ausgabe'), accent: 'fin', data: e, fields: [
    {k: 'name', l: 'Bezeichnung', req: true, ph: e.kind === 'income' ? 'z.B. Bonus' : 'z.B. Wocheneinkauf'},
    {k: 'amount', l: 'Betrag (CHF)', t: 'number', req: true, half: true, ph: '0.00'}, {k: 'kind', l: 'Art', t: 'select', opt: KINDS, half: true},
    {k: 'category', l: 'Kategorie', t: 'select', opt: cats, half: true}, {k: 'month', l: 'Budget-Monat', t: 'select', opt: monthOpts(e.month), half: true},
    {k: 'paid', l: 'Bezahlt / erhalten', t: 'check', half: true}, {k: 'paidAt', l: 'Datum', t: 'date', half: true},
    {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    extra: e.source?.type === 'shop' ? `<div class="hint">${ic('cart', 16)}<span>Aus der Einkaufsliste «${esc(byId('lists', e.source.listId)?.name || '–')}» übernommen</span></div>` : e.templateId ? `<div class="hint">${ic('repeat', 16)}<span>Automatisch aus Fixposten erstellt. Änderungen hier gelten nur für diesen Monat.</span></div>` : '',
    onSave(v) { if (v.paid && !v.paidAt) v.paidAt = today(); if (!v.paid) v.paidAt = ''; upsert('entries', {...e, ...v, by: e.by || me().id}); },
    onDelete: id ? () => deleteEntry(id) : null});
}
function templateForm(id) {
  const t = id ? byId('templates', id) : {kind: 'fixed', interval: 1, startMonth: curMonth(), category: 'Wohnen', dueDay: 1, active: true};
  if (!t) return;
  if (t.contractId) { contractForm(t.contractId); return; }
  form({title: id ? 'Fixposten bearbeiten' : 'Neuer Fixposten', accent: 'fin', data: {...t, active: t.active !== false}, fields: [
    {k: 'name', l: 'Bezeichnung', req: true, ph: 'z.B. Miete'},
    {k: 'kind', l: 'Art', t: 'select', opt: [['fixed', 'Fixkosten'], ['income', 'Einnahme']], half: true}, {k: 'amount', l: 'Betrag (CHF)', t: 'number', req: true, half: true},
    {k: 'category', l: 'Kategorie', t: 'select', opt: [...new Set([...CATS, ...INC_CATS])], half: true}, {k: 'interval', l: 'Intervall', t: 'select', opt: INTERVALS, half: true},
    {k: 'dueDay', l: 'Fällig am (Tag)', t: 'number', half: true, ph: '1–31'}, {k: 'startMonth', l: 'Ab Monat', t: 'select', opt: monthOpts(curMonth(), 24, 12), half: true},
    {k: 'endMonth', l: 'Bis Monat (optional)', t: 'select', opt: [['', '– unbefristet –'], ...monthOpts(curMonth(), 0, 60)], half: true}, {k: 'active', l: 'Aktiv', t: 'check', half: true}],
    extra: `<div class="hint">${ic('repeat', 16)}<span>Wird automatisch in jeden passenden Monat übernommen. Änderungen wirken ab dem aktuellen Monat auf noch nicht bezahlte Einträge.</span></div>`,
    onSave(v) { v.interval = +v.interval || 1; v.dueDay = v.dueDay ? clamp(Math.round(v.dueDay), 1, 31) : null; const n = upsert('templates', {...t, ...v}); syncTemplate(n); },
    onDelete: id ? () => deleteTemplate(id) : null});
}
function goalForm(id) {
  const g = id ? byId('goals', id) : {color: COLORS[3]};
  if (!g) return;
  form({title: id ? 'Sparziel bearbeiten' : 'Neues Sparziel', accent: 'fin', data: g, fields: [
    {k: 'name', l: 'Name', req: true, ph: 'z.B. Sommerferien'}, {k: 'target', l: 'Zielbetrag (CHF)', t: 'number', req: true, half: true},
    {k: 'start', l: 'Bereits gespart (CHF)', t: 'number', half: true}, {k: 'deadline', l: 'Ziel-Datum', t: 'date', half: true}, {k: 'color', l: 'Farbe', t: 'color', half: true}],
    onSave(v) { upsert('goals', {...g, ...v}); }, onDelete: id ? () => { remove('goals', id); S.entries.forEach(e => { if (e.goalId === id) e.goalId = null; }); } : null});
}
function goalDeposit(id) {
  const g = byId('goals', id);
  form({title: 'Einzahlen: ' + g.name, accent: 'fin', fields: [{k: 'amount', l: 'Betrag (CHF)', t: 'number', req: true, half: true, ph: 'negativ = Entnahme'}, {k: 'month', l: 'Monat', t: 'select', opt: monthOpts(curMonth(), 6, 3), def: curMonth(), half: true}],
    saveLabel: 'Einzahlen', onSave(v) { upsert('entries', {month: v.month, name: 'Sparziel: ' + g.name, amount: v.amount, kind: 'saving', category: 'Sparen', paid: true, paidAt: today(), goalId: id, by: me().id}); toast('Einzahlung verbucht'); }});
}
function listForm(id) {
  const l = id ? byId('lists', id) : {category: 'Lebensmittel'};
  if (!l) return;
  form({title: id ? 'Liste bearbeiten' : 'Neue Einkaufsliste', accent: 'shop', data: l, fields: [
    {k: 'name', l: 'Name', req: true, ph: 'z.B. Kinder, Drogerie, Baumarkt'}, {k: 'category', l: 'Budget-Kategorie (für «Ins Budget»)', t: 'select', opt: CATS}],
    onSave(v) { const n = upsert('lists', {...l, ...v}); ui.shopList = n.id; },
    onDelete: id ? () => { remove('lists', id); S.items = S.items.filter(i => i.listId !== id); ui.shopList = null; } : null});
}
function itemForm(id) {
  const i = byId('items', id); if (!i) return;
  form({title: 'Artikel bearbeiten', accent: 'shop', data: i, fields: [
    {k: 'text', l: 'Artikel', req: true}, {k: 'qty', l: 'Menge', half: true, ph: 'z.B. 2'}, {k: 'price', l: 'Preis (CHF)', t: 'number', half: true},
    {k: 'listId', l: 'Liste', t: 'select', opt: S.lists.map(l => [l.id, l.name])}, {k: 'note', l: 'Notiz', ph: 'z.B. Grösse 116, Marke …'}],
    extra: i.budgetEntryId ? `<div class="hint">${ic('coin', 16)}<span>Bereits ins Budget übernommen.</span></div>` : '',
    onSave(v) { upsert('items', {...i, ...v}); }, onDelete: () => remove('items', id)});
}
function recipeForm(id) {
  const x = id ? byId('recipes', id) : {};
  if (!x) return;
  form({title: id ? 'Rezept bearbeiten' : 'Neues Rezept', accent: 'shop', data: x, fields: [
    {k: 'name', l: 'Name', req: true, ph: 'z.B. Älplermagronen'}, {k: 'ingredients', l: 'Zutaten (eine pro Zeile)', t: 'textarea', rows: 6, ph: '500 g Hörnli\n300 g Kartoffeln\n…'},
    {k: 'steps', l: 'Zubereitung / Link', t: 'textarea', rows: 3}, {k: 'tags', l: 'Stichworte', ph: 'z.B. schnell, vegetarisch, Kinder'}],
    onSave(v) { upsert('recipes', {...x, ...v}); }, onDelete: id ? () => { remove('recipes', id); for (const d in S.meals) if (S.meals[d].recipeId === id) S.meals[d].recipeId = ''; } : null});
}
function mealForm(d) {
  const m = S.meals[d] || {};
  form({title: `${wdLong(d)}, ${fmtD(d)}`, accent: 'shop', data: m, fields: [
    {k: 'recipeId', l: 'Rezept', t: 'select', opt: [['', '– kein Rezept –'], ...S.recipes.map(r => [r.id, r.name])]},
    {k: 'text', l: 'oder Freitext', ph: 'z.B. Reste, auswärts essen …'}, {k: 'note', l: 'Notiz', ph: 'z.B. Gäste, nur Mittag'}],
    onSave(v) { if (!v.recipeId && !v.text && !v.note) delete S.meals[d]; else S.meals[d] = v; },
    onDelete: S.meals[d] ? () => { delete S.meals[d]; } : null});
}
function houseForm() {
  const H = S.house;
  form({title: 'Hausprojekt', accent: 'house', data: H, fields: [
    {k: 'name', l: 'Projektname', req: true}, {k: 'address', l: 'Adresse / Parzelle'},
    {k: 'budget', l: 'Gesamtbudget (CHF)', t: 'number', ph: 'z.B. 1350000'}, {k: 'start', l: 'Baustart', t: 'date', half: true}, {k: 'moveIn', l: 'Bezug', t: 'date', half: true},
    {k: 'note', l: 'Notizen (Finanzierung, Hypothek …)', t: 'textarea', rows: 3}],
    onSave(v) { Object.assign(S.house, v); }});
}
function unitForm(id) {
  const u = id ? byId('units', id) : {};
  if (!u) return;
  form({title: id ? 'Einheit bearbeiten' : 'Neue Einheit', accent: 'house', data: u, fields: [
    {k: 'name', l: 'Name', req: true, ph: 'z.B. Appartement 1, Einliegerwohnung, EG'}, {k: 'budget', l: 'Budget (CHF, leer = Summe der Räume)', t: 'number'}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    onSave(v) { upsert('units', {...u, ...v}); },
    onDelete: id ? () => { const rids = S.rooms.filter(r => r.unitId === id).map(r => r.id); remove('units', id); S.rooms = S.rooms.filter(r => r.unitId !== id); S.hcosts.forEach(c => { if (c.unitId === id || rids.includes(c.roomId)) { c.unitId = null; c.roomId = null; } }); } : null});
}
function roomForm(id, preset = {}) {
  const r = id ? byId('rooms', id) : {unitId: preset.unitId || S.units[0]?.id};
  if (!r) return;
  if (!S.units.length) { toast('Bitte zuerst eine Einheit anlegen'); return; }
  form({title: id ? 'Raum bearbeiten' : 'Neuer Raum', accent: 'house', data: r, fields: [
    {k: 'name', l: 'Name', req: true, ph: 'z.B. Küche'}, {k: 'unitId', l: 'Einheit', t: 'select', opt: S.units.map(u => [u.id, u.name])},
    {k: 'area', l: 'Fläche (m²)', t: 'number', half: true}, {k: 'budget', l: 'Budget (CHF)', t: 'number', half: true}, {k: 'note', l: 'Wünsche / Notizen', t: 'textarea', rows: 3}],
    onSave(v) { upsert('rooms', {...r, ...v}); S.hcosts.forEach(c => { if (c.roomId === r.id) c.unitId = v.unitId; }); },
    onDelete: id ? () => { remove('rooms', id); S.hcosts.forEach(c => { if (c.roomId === id) c.roomId = null; }); S.files.forEach(f => { if (f.roomId === id) f.roomId = null; }); go('#/house/raeume'); } : null});
}
function costForm(id, preset = {}) {
  const c = id ? byId('hcosts', id) : {status: 'geplant', ...preset};
  if (!c) return;
  form({title: id ? 'Kostenposten' : 'Neuer Kostenposten', accent: 'house', data: {...c, scope: preset.scope ?? scopeVal(c)}, fields: [
    {k: 'title', l: 'Posten', req: true, ph: 'z.B. Küche, Fenster, Baumeister'},
    {k: 'scope', l: 'Bereich', t: 'select', opt: scopeOpts()}, {k: 'status', l: 'Status', t: 'select', opt: HOUSE_STATUS, half: true}, {k: 'contactId', l: 'Anbieter', t: 'select', opt: contactOpts(), half: true},
    {k: 'budget', l: 'Budget', t: 'number', half: true}, {k: 'offer', l: 'Offerte', t: 'number', half: true}, {k: 'actual', l: 'Effektiv', t: 'number', half: true},
    {k: 'due', l: 'Zahlung fällig', t: 'date', half: true}, {k: 'paidAt', l: 'Bezahlt am', t: 'date', half: true}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    attach: {coll: 'hcosts', label: 'Rechnung / Vertrag (PDF oder Foto)', meta: x => ({module: 'haus', category: 'Dokument', roomId: x.roomId || null})},
    onSave(v) { const scope = v.scope; delete v.scope; const o = {...c, ...v}; applyScope(o, scope); if (o.status === 'bezahlt' && !o.paidAt) o.paidAt = today(); return upsert('hcosts', o); },
    onDelete: id ? () => remove('hcosts', id) : null});
}
function offerForm(id, preset = {}) {
  const o = id ? byId('offers', id) : {trade: preset.trade || ''};
  if (!o) return;
  const trades = [...new Set(S.offers.map(x => x.trade))];
  form({title: id ? 'Offerte bearbeiten' : 'Neue Offerte', accent: 'house', data: {...o, scope: scopeVal(o)}, fields: [
    {k: 'trade', l: 'Gewerk', req: true, ph: 'z.B. Küche Appartement 1', list: 'tradelist'}, {t: 'html', html: `<datalist id="tradelist">${trades.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`},
    {k: 'vendor', l: 'Anbieter', req: true, half: true}, {k: 'amount', l: 'Betrag (CHF)', t: 'number', req: true, half: true},
    {k: 'contactId', l: 'Kontakt', t: 'select', opt: contactOpts(), half: true}, {k: 'scope', l: 'Bereich', t: 'select', opt: scopeOpts(), half: true},
    {k: 'note', l: 'Notiz (Leistungsumfang, Termine …)', t: 'textarea', rows: 2}],
    attach: {coll: 'offers', label: 'Offerte als PDF oder Foto', meta: x => ({module: 'haus', category: 'Dokument', roomId: x.roomId || null})},
    onSave(v) { const scope = v.scope; delete v.scope; const x = {...o, ...v}; applyScope(x, scope); return upsert('offers', x); },
    onDelete: id ? () => remove('offers', id) : null});
}
function milestoneForm(id) {
  const m = id ? byId('milestones', id) : {};
  if (!m) return;
  form({title: id ? 'Meilenstein' : 'Neuer Meilenstein', accent: 'house', data: m, fields: [
    {k: 'title', l: 'Titel', req: true, ph: 'z.B. Baubewilligung'}, {k: 'date', l: 'Datum', t: 'date', half: true}, {k: 'done', l: 'Erledigt', t: 'check', half: true}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    onSave(v) { upsert('milestones', {...m, ...v}); }, onDelete: id ? () => remove('milestones', id) : null});
}
function defectForm(id, preset = {}) {
  const d = id ? byId('defects', id) : {status: 'offen', date: today(), roomId: preset.roomId || ''};
  if (!d) return;
  form({title: id ? 'Mangel' : 'Neuer Mangel', accent: 'house', data: d, fields: [
    {k: 'text', l: 'Beschreibung', req: true, ph: 'z.B. Kratzer am Fensterrahmen'}, {k: 'roomId', l: 'Raum', t: 'select', opt: roomOpts(), half: true},
    {k: 'contactId', l: 'Zuständig', t: 'select', opt: contactOpts(), half: true}, {k: 'date', l: 'Festgestellt am', t: 'date', half: true},
    {k: 'status', l: 'Status', t: 'select', opt: [['offen', 'Offen'], ['gemeldet', 'Gemeldet'], ['behoben', 'Behoben']], half: true}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    attach: {coll: 'defects', label: 'Fotos vom Mangel', accept: 'image/*', meta: x => ({module: 'haus', category: 'Foto', roomId: x.roomId || null})},
    onSave(v) { return upsert('defects', {...d, ...v}); }, onDelete: id ? () => remove('defects', id) : null});
}
function contactForm(id) {
  const c = id ? byId('contacts', id) : {};
  if (!c) return;
  form({title: id ? 'Kontakt' : 'Neuer Kontakt', accent: 'house', data: c, fields: [
    {k: 'name', l: 'Name', req: true}, {k: 'company', l: 'Firma', half: true}, {k: 'trade', l: 'Funktion / Gewerk', half: true, ph: 'z.B. Architekt, Elektriker'},
    {k: 'phone', l: 'Telefon', t: 'tel', half: true}, {k: 'email', l: 'E-Mail', t: 'email', half: true}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    onSave(v) { upsert('contacts', {...c, ...v}); }, onDelete: id ? () => remove('contacts', id) : null});
}
function noteForm(id) {
  const n = id ? byId('hnotes', id) : {date: today()};
  if (!n) return;
  form({title: id ? 'Notiz' : 'Neue Notiz', accent: 'house', data: n, fields: [
    {k: 'title', l: 'Titel', req: true, ph: 'z.B. Entscheid Heizung'}, {k: 'text', l: 'Text', t: 'textarea', rows: 7}, {k: 'date', l: 'Datum', t: 'date', half: true}],
    onSave(v) { upsert('hnotes', {...n, ...v}); }, onDelete: id ? () => remove('hnotes', id) : null});
}
function contractForm(id) {
  const c = id ? byId('contracts', id) : {interval: 1, inBudget: true, autoRenew: true, noticeMonths: 3, category: 'Versicherung'};
  if (!c) return;
  form({title: id ? 'Vertrag / Abo' : 'Neuer Vertrag / Abo', accent: 'safe', data: c, fields: [
    {k: 'name', l: 'Bezeichnung', req: true, ph: 'z.B. Krankenkasse Familie'}, {k: 'provider', l: 'Anbieter', half: true}, {k: 'category', l: 'Kategorie', t: 'select', opt: CONTRACT_CATS, half: true},
    {k: 'amount', l: 'Kosten (CHF)', t: 'number', half: true}, {k: 'interval', l: 'pro', t: 'select', opt: INTERVALS, half: true},
    {k: 'start', l: 'Vertragsbeginn', t: 'date', half: true}, {k: 'endDate', l: 'Vertragsende / nächste Verlängerung', t: 'date', half: true},
    {k: 'noticeMonths', l: 'Kündigungsfrist (Monate)', t: 'number', half: true}, {k: 'renewMonths', l: 'Verlängerung um (Monate)', t: 'number', half: true, ph: '12'},
    {k: 'autoRenew', l: 'Verlängert sich automatisch', t: 'check'}, {k: 'inBudget', l: 'Kosten automatisch als Fixposten ins Budget', t: 'check'},
    {k: 'customerNo', l: 'Kunden- / Policennummer'}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    attach: {coll: 'contracts', label: 'Vertrag / Police (PDF oder Foto)', meta: () => ({module: 'safe', folder: 'Verträge'})},
    onSave(v) { v.interval = +v.interval || 1; const n = upsert('contracts', {...c, ...v}); syncContract(n); return n; },
    onDelete: id ? () => { const t = S.templates.find(t => t.contractId === id); if (t) deleteTemplate(t.id); remove('contracts', id); } : null});
}
function warrantyForm(id) {
  const w = id ? byId('warranties', id) : {date: today(), months: 24};
  if (!w) return;
  form({title: id ? 'Garantie' : 'Neue Garantie / Beleg', accent: 'safe', data: w, fields: [
    {k: 'item', l: 'Gegenstand', req: true, ph: 'z.B. Waschmaschine'}, {k: 'store', l: 'Gekauft bei', half: true}, {k: 'price', l: 'Preis (CHF)', t: 'number', half: true},
    {k: 'date', l: 'Kaufdatum', t: 'date', half: true}, {k: 'months', l: 'Garantie (Monate)', t: 'number', half: true},
    {k: 'serial', l: 'Seriennummer'}, {k: 'note', l: 'Notiz', t: 'textarea', rows: 2}],
    attach: {coll: 'warranties', label: 'Quittung / Garantieschein', meta: () => ({module: 'safe', folder: 'Belege'})},
    onSave(v) { return upsert('warranties', {...w, ...v}); }, onDelete: id ? () => remove('warranties', id) : null});
}
function memberForm(id) {
  const m = id ? byId('members', id) : {role: 'adult', color: COLORS[S.members.length % COLORS.length]};
  if (!m) return;
  form({title: id ? 'Person bearbeiten' : 'Neue Person', accent: 'fam', data: m, fields: [
    {k: 'name', l: 'Name', req: true}, {k: 'role', l: 'Rolle', t: 'select', opt: [['adult', 'Erwachsen'], ['kind', 'Kind']], half: true}, {k: 'color', l: 'Farbe', t: 'color', half: true},
    {k: 'birthday', l: 'Geburtstag', t: 'date'}, {k: 'notes', l: 'Notizen (z.B. Kleidergrösse 116, Schuhe 30, Allergien)', t: 'textarea', rows: 3}],
    onSave(v) { upsert('members', {...m, ...v}); },
    onDelete: id && S.members.length > 1 && id !== S.settings.activeUser ? () => remove('members', id) : null});
}
function fileEditForm(id) {
  const f = byId('files', id); if (!f) return;
  const fields = [{k: 'name', l: 'Dateiname', req: true}];
  if (f.module === 'safe') fields.push({k: 'folder', l: 'Ordner', t: 'select', opt: SAFE_FOLDERS, half: true}, {k: 'expiry', l: 'Gültig bis (optional)', t: 'date', half: true});
  else fields.push({k: 'category', l: 'Kategorie', t: 'select', opt: HOUSE_FCAT, half: true}, {k: 'roomId', l: 'Raum', t: 'select', opt: roomOpts(), half: true});
  fields.push({k: 'tags', l: 'Stichworte', ph: 'z.B. Pass, Leo, 2026'});
  form({title: 'Datei bearbeiten', accent: f.module === 'safe' ? 'safe' : 'house', data: f, fields, onSave(v) { Object.assign(f, v); }});
}
const EDIT = {
  events: id => eventForm(id), tasks: taskForm, entries: id => entryForm(id), templates: templateForm, goals: goalForm,
  items: itemForm, recipes: recipeForm, hcosts: id => costForm(id), offers: id => offerForm(id), milestones: milestoneForm,
  defects: id => defectForm(id), contacts: contactForm, hnotes: noteForm, rooms: id => go('#/house/raum/' + id),
  contracts: contractForm, warranties: warrantyForm, bills: billForm, members: memberForm, files: id => A.fileOpen({id}),
};
const SAFE_COLLS = ['contracts', 'warranties'];

/* =========================================================
   AKTIONEN
   ========================================================= */
const A = {
  go: d => go(d.h),
  edit(d) {
    const f = d.c === 'files' ? byId('files', d.id) : null;
    if ((SAFE_COLLS.includes(d.c) || (f && f.module === 'safe')) && safeLocked()) { toast('Safe ist gesperrt'); go('#/safe'); return; }
    EDIT[d.c] && EDIT[d.c](d.id);
  },
  switchUser() { const as = adults(), i = as.findIndex(m => m.id === S.settings.activeUser), n = as[(i + 1) % as.length]; S.settings.activeUser = n.id; toast('Aktiv: ' + n.name); commit(); },
  setUser(d) { S.settings.activeUser = d.id; commit(); },
  setTheme(d) { S.settings.theme = d.t; applyTheme(); commit(); },
  quick() {
    const b = (a, c, i, l, extra = '') => `<button class="qbtn" data-a="${a}" ${extra} style="--c:var(--${c})"><span class="ti">${ic(i, 22)}</span>${l}</button>`;
    modal(`<div class="mh"><h3>Schnell hinzufügen</h3><button class="icon-btn" data-close>${ic('x')}</button></div><div class="qgrid">
      ${b('qEvent', 'cal', 'cal', 'Termin')}${b('qTask', 'cal', 'task', 'Aufgabe')}${b('qExpense', 'fin', 'coin', 'Ausgabe')}${b('qItem', 'shop', 'cart', 'Einkauf')}${b('qDefect', 'house', 'camera', 'Haus-Foto')}${b('qDoc', 'safe', 'upload', 'Dokument')}</div>`, {accent: 'primary'});
  },
  qEvent() { closeModal(); eventForm(null, {date: today()}); },
  qTask() { closeModal(); taskForm(null); },
  qExpense() { closeModal(); ui.finMonth = curMonth(); entryForm(null, {kind: 'variable', month: curMonth()}); },
  qItem() { closeModal(); ui.focusQuick = true; if (route().mod === 'shop' && (!route().tab || route().tab === 'listen')) render(); else go('#/shop/listen'); },
  qDefect() { closeModal(); pickFiles({module: 'haus', category: 'Foto', roomId: null}, {accept: 'image/*', after: () => go('#/house/plaene')}); },
  qDoc() { closeModal(); if (safeLocked()) { go('#/safe'); toast('Bitte zuerst den Safe öffnen'); return; } pickFiles({module: 'safe', folder: 'Sonstiges'}, {after: () => go('#/safe/dokumente')}); },
  // Kalender
  calMonth(d) { ui.calMonth = mAdd(ui.calMonth, +d.n); ui.calDay = ui.calMonth === curMonth() ? today() : ui.calMonth + '-01'; render(); },
  calToday() { ui.calMonth = curMonth(); ui.calDay = today(); render(); },
  calDay(d) { ui.calDay = d.d; ui.calMonth = d.d.slice(0, 7); render(); },
  calFilter(d) { ui.calFilter = d.f; render(); },
  eventNew(d) { eventForm(null, {date: d.d}); },
  taskNew() { taskForm(null); },
  taskToggle(d) {
    const t = byId('tasks', d.id); if (!t) return;
    if (!t.done && t.repeat && t.repeat !== 'none' && t.due) { let n = nextDue(t.due, t.repeat); for (let g = 0; n <= today() && g < 400; g++) n = nextDue(n, t.repeat); t.due = n; t.lastDone = today(); toast('Erledigt ✓ – nächstes Mal am ' + fmtD(n)); }
    else { t.done = !t.done; t.doneAt = t.done ? today() : ''; if (t.done) toast('Erledigt ✓'); }
    commit();
  },
  tasksClear() { S.tasks = S.tasks.filter(t => !t.done); commit(); },
  // Finanzen
  finMonth(d) { ui.finMonth = mAdd(ui.finMonth, +d.n); render(); },
  finToday() { ui.finMonth = curMonth(); render(); },
  finGoto(d) { ui.finMonth = d.m; go('#/fin/monat'); },
  statMonth(d) { ui.statMonth = mAdd(ui.statMonth, +d.n); render(); },
  entryNew(d) { entryForm(null, {kind: d.kind || 'variable', month: ui.finMonth}); },
  billNew() { billForm(null); },
  billQR(d) { billQR(d.id); },
  billEditFromQR(d) { closeModal(); billForm(d.id); },
  async copy(d) { try { await navigator.clipboard.writeText(d.v); toast('Kopiert'); } catch (e) { toast(d.v); } },
  billPaid(d) { const b = byId('bills', d.id), e = b && byId('entries', b.entryId); if (e) { e.paid = true; e.paidAt = today(); toast('Als bezahlt markiert'); commit(); } },
  billMailEdit() { form({title: 'Rechnungs-Eingang', accent: 'fin', data: {mail: S.flags.billMail || ''}, fields: [{k: 'mail', l: 'E-Mail-Adresse für Rechnungen', t: 'email', ph: 'z.B. zuhause.rechnungen@gmail.com'}],
    extra: `<div class="hint">${ic('mail', 16)}<span>Diese Adresse wird hier nur angezeigt. Den eigentlichen Import erledigt ein kleines Skript in diesem Postfach (Anleitung im GitHub-Repo unter <b>tools/</b>).</span></div>`,
    onSave(v) { S.flags = {...S.flags, billMail: v.mail.toLowerCase()}; }}); },
  qKind(d) {
    const fm = $('#qentry'), keep = fm ? {a: fm.amount.value, n: fm.name.value} : null;
    ui.qKind = d.k; ui.qCat = d.k === 'income' ? 'Lohn' : 'Lebensmittel'; render();
    const f2 = $('#qentry'); if (f2 && keep) { f2.amount.value = keep.a; f2.name.value = keep.n; }
  },
  qCat(d, el) { ui.qCat = d.cat; document.querySelectorAll('#qcats .catchip').forEach(b => b.classList.toggle('on', b === el)); },
  entryPaid(d) { const e = byId('entries', d.id); e.paid = !e.paid; e.paidAt = e.paid ? today() : ''; commit(); },
  monthClose() { const m = S.months[ui.finMonth] || (S.months[ui.finMonth] = {closed: false, gen: []}); m.closed = !m.closed; toast(m.closed ? 'Monat abgeschlossen – bleibt als Auszug gespeichert' : 'Monat wieder geöffnet'); commit(); },
  templateNew() { templateForm(null); },
  goalNew() { goalForm(null); },
  goalDeposit(d) { goalDeposit(d.id); },
  // Einkauf
  listNew() { listForm(null); },
  listEdit(d) { listForm(d.id); },
  listSel(d) { ui.shopList = d.id; render(); },
  itemToggle(d) { const i = byId('items', d.id); i.done = !i.done; i.doneAt = i.done ? Date.now() : null; commit(); },
  bookOne(d) { const i = byId('items', d.id); bookForm(i.listId, [i.id]); },
  bookDone() { bookForm(ui.shopList, S.items.filter(i => i.listId === ui.shopList && i.done && !i.budgetEntryId).map(i => i.id)); },
  bookAll() { bookForm(ui.shopList, S.items.filter(i => i.listId === ui.shopList && !i.budgetEntryId).map(i => i.id)); },
  unbook(d) { if (!confirm('Buchung im Budget rückgängig machen?')) return; deleteEntry(d.id); toast('Buchung entfernt'); commit(); },
  clearDone() {
    const done = S.items.filter(i => i.listId === ui.shopList && i.done), nb = done.filter(i => !i.budgetEntryId).length;
    if (nb && !confirm(`${nb} erledigte Artikel sind nicht im Budget gebucht. Trotzdem entfernen?`)) return;
    S.items = S.items.filter(i => !(i.listId === ui.shopList && i.done)); commit();
  },
  mealWeek(d) { ui.mealWeek = addDays(ui.mealWeek, +d.n); render(); },
  mealEdit(d) { mealForm(d.d); },
  mealToList() {
    const days = [...Array(7)].map((_, i) => addDays(ui.mealWeek, i)), lines = [];
    days.forEach(d => { const r = byId('recipes', S.meals[d]?.recipeId); if (r) lines.push(...(r.ingredients || '').split('\n')); });
    if (!lines.filter(s => s.trim()).length) { toast('Diese Woche sind keine Rezepte mit Zutaten geplant'); return; }
    pickListThen('Zutaten auf Liste', listId => { const n = addIngredients(listId, lines); ui.shopList = listId; toast(n ? `${n} Zutaten hinzugefügt` : 'Alles schon auf der Liste'); });
  },
  recipeNew() { recipeForm(null); },
  recipeToList(d) { const r = byId('recipes', d.id); pickListThen(r.name + ' → Liste', listId => { const n = addIngredients(listId, (r.ingredients || '').split('\n')); ui.shopList = listId; toast(n ? `${n} Zutaten hinzugefügt` : 'Alles schon auf der Liste'); }); },
  // Haus
  houseEdit() { houseForm(); },
  unitNew() { unitForm(null); }, unitEdit(d) { unitForm(d.id); },
  roomNew(d) { roomForm(null, {unitId: d.unit}); }, roomEdit(d) { roomForm(d.id); },
  costNew(d) { costForm(null, d.scope ? {scope: d.scope} : (ui.houseFilter && ui.houseFilter !== 'general' ? {scope: ui.houseFilter} : {})); },
  offerNew(d) { offerForm(null, {trade: d.trade}); },
  offerChoose(d) {
    const o = byId('offers', d.id);
    if (o.chosen) { o.chosen = false; commit(); return; }
    S.offers.forEach(x => { if (x.trade === o.trade) x.chosen = x.id === o.id; });
    let c = S.hcosts.find(c => c.offerTrade === o.trade);
    if (!c) c = upsert('hcosts', {title: o.trade, status: 'vergeben', budget: null, offerTrade: o.trade, roomId: o.roomId || null, unitId: o.unitId || null});
    c.offer = +o.amount; c.contactId = o.contactId || c.contactId || null;
    if (!c.status || c.status === 'geplant' || c.status === 'offeriert') c.status = 'vergeben';
    if (o.roomId || o.unitId) { c.roomId = o.roomId || null; c.unitId = o.unitId || null; }
    toast('Offerte gewählt und in die Kosten übernommen'); commit();
  },
  milestoneNew() { milestoneForm(null); },
  msToggle(d) { const m = byId('milestones', d.id); m.done = !m.done; commit(); },
  defectNew(d) { defectForm(null, {roomId: d.room}); },
  defectToggle(d) { const x = byId('defects', d.id); x.status = x.status === 'behoben' ? 'offen' : 'behoben'; commit(); },
  defectFilter(d) { ui.defectFilter = d.f; render(); },
  contactNew() { contactForm(null); },
  noteNew() { noteForm(null); },
  hFileCat(d) { ui.hFileCat = d.f; render(); },
  houseUpload(d) { pickFiles({module: 'haus', category: ui.hFileCat !== 'Alle' ? ui.hFileCat : (d.room ? 'Foto' : 'Plan'), roomId: d.room || null}); },
  attach(d) {
    const safe = SAFE_COLLS.includes(d.c) || d.c === 'bills';
    const meta = {link: d.c + ':' + d.id, module: safe ? 'safe' : 'haus'};
    if (safe) meta.folder = d.c === 'contracts' ? 'Verträge' : 'Belege';
    else { meta.category = d.c === 'offers' ? 'Dokument' : 'Foto'; const x = byId(d.c, d.id); meta.roomId = x?.roomId || null; }
    pickFiles(meta, {accept: d.c === 'defects' ? 'image/*' : undefined});
  },
  // Safe & Dateien
  safeLock() { safeUnlocked = 0; render(); },
  safeFolder(d) { ui.safeFolder = d.f; render(); },
  safeUpload() { pickFiles({module: 'safe', folder: ui.safeFolder !== 'Alle' ? ui.safeFolder : 'Sonstiges'}); },
  contractNew() { contractForm(null); },
  warrantyNew() { warrantyForm(null); },
  async fileOpen(d) {
    const f = byId('files', d.id); if (!f) return;
    if (f.module === 'safe' && safeLocked()) { toast('Safe ist gesperrt'); go('#/safe'); return; }
    const u = await fileURL(f.id), pdf = f.type === 'application/pdf';
    const link = f.link ? f.link.split(':') : null, linked = link && byId(link[0], link[1]);
    modal(`<div class="mh"><h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</h3><button class="icon-btn" data-close>${ic('x')}</button></div>
      <div class="preview">${!u ? '<p class="empty">Datei nicht gefunden.</p>' : isImg(f) ? `<img src="${u}" alt="">` : pdf ? `<iframe src="${u}" title="PDF"></iframe>` : `<p class="empty">${ic('file', 34)}<br>Keine Vorschau – öffne oder lade die Datei herunter.</p>`}</div>
      <div class="s" style="margin-bottom:10px">${[f.module === 'safe' ? 'Safe · ' + (f.folder || '') : 'Haus · ' + (f.category || ''), byId('rooms', f.roomId)?.name, linked ? 'gehört zu: ' + (linked.name || linked.item || linked.vendor || linked.text) : '', fmtD(f.date), sizeFmt(f.size || 0), mem(f.by)?.name ? 'von ' + mem(f.by).name : '', f.expiry ? 'gültig bis ' + fmtD(f.expiry) : '', f.tags].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="mf"><button class="btn danger" data-a="fileDel" data-id="${f.id}" aria-label="Löschen">${ic('trash', 17)}</button><span class="sp"></span><button class="btn" data-a="fileEdit" data-id="${f.id}">${ic('edit', 16)} Bearbeiten</button>
      ${u ? `<a class="btn" href="${u}" download="${esc(f.name)}" aria-label="Herunterladen">${ic('download', 17)}</a><a class="btn pri" href="${u}" target="_blank" rel="noopener">${ic('ext', 16)} Öffnen</a>` : ''}</div>`, {accent: f.module === 'safe' ? 'safe' : 'house'});
  },
  fileEdit(d) { closeModal(); fileEditForm(d.id); },
  async attachDel(d, el) {
    if (!confirm('Anhang entfernen?')) return;
    await deleteBlob(d.id);
    remove('files', d.id); save(); el.closest('.fchip').remove();
  },
  async fileDel(d) {
    if (!confirm('Datei endgültig löschen?')) return;
    await deleteBlob(d.id);
    remove('files', d.id); closeModal(); toast('Datei gelöscht'); commit();
  },
  // Einstellungen
  memberNew() { memberForm(null); },
  pinSet() {
    form({title: 'Safe-PIN festlegen', accent: 'safe', fields: [{k: 'pin', l: 'Neue PIN (mind. 4 Ziffern)', t: 'password', im: 'numeric', req: true}, {k: 'pin2', l: 'PIN wiederholen', t: 'password', im: 'numeric', req: true}],
      extra: `<div class="hint">${ic('alert', 16)}<span>Die PIN gilt nur auf diesem Gerät und schützt den Safe zusätzlich, z.B. wenn die Kinder das Handy haben.</span></div>`,
      async onSave(v) { if (v.pin.length < 4) { toast('Mindestens 4 Zeichen'); return false; } if (v.pin !== v.pin2) { toast('PINs stimmen nicht überein'); return false; }
        const salt = uid(); S.settings.pinSalt = salt; S.settings.pinHash = await hashPin(v.pin, salt); safeUnlocked = Date.now(); toast('PIN gespeichert'); }});
  },
  pinRemove() { if (!confirm('PIN entfernen? Der Safe ist dann offen.')) return; S.settings.pinHash = null; S.settings.pinSalt = null; commit(); },
  async exportData() {
    toast('Backup wird erstellt …');
    const files = {};
    for (const f of S.files) { try { const u = await fileURL(f.id); const b = u ? await (await fetch(u)).blob() : null; if (b) files[f.id] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) {} }
    const blob = new Blob([JSON.stringify({app: 'zuhause', v: 1, created: new Date().toISOString(), state: S, files})], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `zuhause-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  importData() {
    const inp = $('#filepick'); inp.value = ''; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.app !== 'zuhause' || !data.state) throw new Error('Keine gültige Backup-Datei');
        if (!confirm('Backup laden? Die aktuellen Daten auf diesem Gerät werden ersetzt.')) return;
        toast('Backup wird geladen …');
        for (const f of S.files) await deleteBlob(f.id);
        for (const [id, durl] of Object.entries(data.files || {})) { const blob = await (await fetch(durl)).blob(); await IDB.put(id, blob); await cloudPutBlob(id, blob); }
        const keepSettings = S.settings; S = data.state; S.settings = keepSettings; migrate(); persist(); applyTheme(); toast('Backup geladen'); go('#/'); render();
      } catch (e) { alert('Import fehlgeschlagen: ' + e.message); }
    };
    inp.click();
  },
  async resetData() {
    if (!confirm(S.flags.demo ? 'Alle Beispieldaten löschen und leer starten? (Familie & Einstellungen bleiben)' : 'Wirklich ALLE Daten löschen? (Familie & Einstellungen bleiben) – vorher ein Backup machen!')) return;
    const wasDemo = S.flags.demo, keep = {members: S.members, settings: S.settings};
    toast('Lösche …');
    for (const f of S.files) await deleteBlob(f.id);
    S = {...blank(), ...keep}; if (wasDemo) S.members = S.members.filter(m => m.id !== 'k1');
    S.lists = [{id: uid(), name: 'Lebensmittel', category: 'Lebensmittel'}, {id: uid(), name: 'Kinder', category: 'Kinder'}, {id: uid(), name: 'Drogerie', category: 'Haushalt'}];
    migrate(); persist(); toast('Daten gelöscht – viel Spass beim Einrichten!'); go('#/');  render();
  },
  async loadDemo() {
    if (!confirm('Beispieldaten laden? Alle aktuellen Daten (auch die deiner Partnerin) werden ersetzt.')) return;
    for (const f of S.files) await deleteBlob(f.id);
    const keep = S.settings; seed(); S.settings = {...keep, activeUser: 'u1'}; if (myEmail()) S.members[0].email = myEmail(); persist(); go('#/'); render();
  },
  async logout() {
    if (!confirm('Abmelden? Lokal zwischengespeicherte Daten werden von diesem Gerät entfernt.')) return;
    await cloudLogout();
  },
  linkMe(d) { const e = myEmail(); if (!e) return; S.members.forEach(m => { if (m.email === e) m.email = ''; }); const m = byId('members', d.id); m.email = e; S.settings.activeUser = m.id; toast(m.name + ' ist jetzt mit ' + e + ' verknüpft'); commit(); },
};
const F = {
  quickEntry(fm) {
    const raw = fm.amount.value.replace(/['’\s]/g, '').replace(',', '.'), amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) { fm.amount.classList.add('err'); fm.amount.focus(); toast('Bitte Betrag eingeben'); return; }
    const kind = ui.qKind || 'variable', category = ui.qCat || (kind === 'income' ? 'Lohn' : 'Sonstiges');
    const mk = ui.finMonth, paidAt = mk === curMonth() ? today() : mk + '-01';
    upsert('entries', {month: mk, name: fm.name.value.trim() || category, amount, kind, category, paid: true, paidAt, by: me().id});
    toast(`${kind === 'income' ? 'Einnahme' : 'Ausgabe'} ${chf(amount)} erfasst`);
    commit();
  },
  itemAdd(fm) {
    let text = fm.text.value.trim(); if (!text) return;
    let qty = '';
    const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|×|stk\.?)?\s+(.+)$/i);
    if (m) { qty = m[1]; text = m[2]; }
    const raw = fm.price.value.replace(/['’\s]/g, '').replace(',', '.');
    upsert('items', {listId: ui.shopList, text, qty, price: raw && !isNaN(+raw) ? +raw : null, done: false, addedBy: me().id});
    ui.focusQuick = true; commit();
  },
  async unlock(fm) {
    if (await hashPin(fm.pin.value, S.settings.pinSalt) === S.settings.pinHash) { safeUnlocked = Date.now(); render(); }
    else { toast('Falsche PIN'); fm.pin.value = ''; fm.pin.focus(); }
  },
};
const CH = { houseFilter(el) { ui.houseFilter = el.value; render(); } };
const IN = {
  gsearch(el) { const q = el.value.trim(); $('#gresults').innerHTML = q.length < 2 ? '' : searchHTML(q); },
  safeQ(el) { ui.safeQ = el.value; $('#safeList').innerHTML = safeDocList(); hydrate(); },
};

// ---------- Events ----------
document.addEventListener('click', e => {
  if (route().mod === 'safe' && !safeLocked()) safeUnlocked = Date.now();
  if (e.target.closest('[data-close]')) { closeModal(); return; }
  const el = e.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault();
  if (el.closest('#modal') && !['fileDel', 'fileEdit', 'attachDel', 'copy', 'qEvent', 'qTask', 'qExpense', 'qItem', 'qDefect', 'qDoc'].includes(el.dataset.a)) closeModal();
  fn({...el.dataset}, el, e);
});
document.addEventListener('submit', e => { const fm = e.target.closest('form[data-f]'); if (!fm) return; e.preventDefault(); F[fm.dataset.f] && F[fm.dataset.f](fm); });
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el) CH[el.dataset.ch] && CH[el.dataset.ch](el); });
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el) IN[el.dataset.in] && IN[el.dataset.in](el); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });
document.addEventListener('visibilitychange', () => { if (!booted) return; if (document.hidden) { clearTimeout(saveT); persist(); } else if (route().mod !== 'settings' && !$('#modal').classList.contains('open')) render(); });
document.addEventListener('focusout', () => { if (cloud.pendingRender) setTimeout(flushRemoteRender, 50); });
window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0, 0); });
setInterval(() => { if (route().mod === 'safe' && safeLocked() && !document.querySelector('.lock') && !$('#modal').classList.contains('open')) render(); }, 15000);
// Speicherinfo in den Einstellungen nachladen
const _render = render;
render = function () {
  if (!booted) return;
  _render();
  const si = $('#storageInfo');
  if (si && navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(x => { si.textContent = `Belegter Speicher: ${sizeFmt(x.usage || 0)} · ${S.files.length} Dateien`; });
};

/* =========================================================
   BEISPIELDATEN
   ========================================================= */
function seed() {
  S = blank();
  const t = today(), cm = curMonth(), y = +t.slice(0, 4), past = mAdd(cm, -3);
  const kb = addDays(t, 11), pb = addDays(t, 38);
  S.members = [
    {id: 'u1', name: 'Ajdin', role: 'adult', color: COLORS[0], birthday: ''},
    {id: 'u2', name: 'Elma', role: 'adult', color: COLORS[1], birthday: (y - 33) + pb.slice(4)},
    {id: 'k1', name: 'Kind 1', role: 'kind', color: COLORS[2], birthday: (y - 6) + kb.slice(4), notes: 'Kleider 116/122 · Schuhe 30'},
  ];
  S.settings = {...S.settings, activeUser: 'u1', demo: true};
  const T = (name, amount, kind, category, dueDay, interval = 1) => upsert('templates', {name, amount, kind, category, dueDay, interval, startMonth: past, active: true});
  T('Lohn', 6800, 'income', 'Lohn', 25); T('Lohn Partnerin', 3400, 'income', 'Lohn', 25); T('Kinderzulagen', 215, 'income', 'Kinderzulagen', 10);
  T('Miete', 2150, 'fixed', 'Wohnen', 1); T('Nebenkosten & Strom', 160, 'fixed', 'Wohnen', 28); T('Kita / Betreuung', 880, 'fixed', 'Kinder', 5); T('Steuern (Rate)', 650, 'fixed', 'Steuern', 15);
  const C = o => { const c = upsert('contracts', o); syncContract(c); return c; };
  C({name: 'Krankenkasse Familie', provider: 'Krankenkasse', category: 'Krankenkasse', amount: 985, interval: 1, start: `${y - 2}-01-01`, endDate: `${y}-12-31`, noticeMonths: 1, renewMonths: 12, autoRenew: true, inBudget: true, customerNo: '123.456.789'});
  C({name: 'Hausrat & Privathaftpflicht', provider: 'Versicherung', category: 'Versicherung', amount: 460, interval: 12, start: `${y - 1}-03-01`, endDate: `${y + 1}-02-28`, noticeMonths: 3, renewMonths: 12, autoRenew: true, inBudget: true});
  C({name: 'Handy-Abos (2×)', provider: 'Telekom', category: 'Telefon & Internet', amount: 118, interval: 1, start: `${y - 2}-05-01`, endDate: addMonths(t, 2), noticeMonths: 1, renewMonths: 12, autoRenew: true, inBudget: true});
  C({name: 'Streaming-Abo', provider: 'Streaming', category: 'Streaming & Abos', amount: 21.9, interval: 1, start: `${past}-12`, inBudget: true, autoRenew: true});
  C({name: 'Autoversicherung', provider: 'Versicherung', category: 'Fahrzeug', amount: 980, interval: 12, start: `${y - 1}-03-01`, endDate: `${y + 1}-02-28`, noticeMonths: 3, autoRenew: true, inBudget: true});
  S.goals = [{id: 'g1', name: 'Sommerferien', target: 4500, start: 1200, deadline: `${y + 1}-06-30`, color: '#0ea5e9'}, {id: 'g2', name: 'Notgroschen', target: 15000, start: 9000, color: '#10b981'}, {id: 'g3', name: 'Einrichtung neues Haus', target: 25000, start: 3500, deadline: `${y + 2}-02-28`, color: '#8b5cf6'}];
  const V = (mk, name, amount, category, day, extra = {}) => upsert('entries', {month: mk, name, amount, kind: 'variable', category, paid: true, paidAt: `${mk}-${pad(day)}`, by: day % 2 ? 'u1' : 'u2', ...extra});
  for (let i = 3; i >= 1; i--) {
    const mk = mAdd(cm, -i);
    ensureMonth(mk);
    S.entries.filter(e => e.month === mk).forEach(e => { e.paid = true; e.paidAt = e.due || `${mk}-01`; });
    V(mk, 'Wocheneinkäufe', [812, 765, 890][i - 1], 'Lebensmittel', 26); V(mk, 'Kinderkleider', [120, 85, 64][i - 1], 'Kinder', 12);
    V(mk, 'Restaurant & Ausflüge', [240, 180, 310][i - 1], 'Restaurant', 20); V(mk, 'Benzin', [140, 120, 155][i - 1], 'Mobilität', 8); V(mk, 'Drogerie', [65, 72, 58][i - 1], 'Haushalt', 14);
    upsert('entries', {month: mk, name: 'Sparziel: Sommerferien', amount: 300, kind: 'saving', category: 'Sparen', paid: true, paidAt: `${mk}-26`, goalId: 'g1'});
    upsert('entries', {month: mk, name: 'Sparziel: Notgroschen', amount: 500, kind: 'saving', category: 'Sparen', paid: true, paidAt: `${mk}-26`, goalId: 'g2'});
    S.months[mk].closed = true;
  }
  ensureMonth(cm);
  const d = +t.slice(8, 10);
  S.entries.filter(e => e.month === cm && e.due && +e.due.slice(8, 10) <= Math.max(1, d - 3)).forEach(e => { e.paid = true; e.paidAt = e.due; });
  if (d > 3) { V(cm, 'Wocheneinkäufe', 420, 'Lebensmittel', Math.min(d - 1, 28)); V(cm, 'Geburtstagsgeschenk', 60, 'Geschenke', Math.max(1, d - 2)); V(cm, 'Benzin', 95, 'Mobilität', Math.max(1, d - 3)); }
  // Einkauf
  S.lists = [{id: 'l1', name: 'Lebensmittel', category: 'Lebensmittel'}, {id: 'l2', name: 'Kinder', category: 'Kinder'}, {id: 'l3', name: 'Drogerie', category: 'Haushalt'}, {id: 'l4', name: 'Baumarkt', category: 'Haus/Bau'}];
  const It = (listId, text, qty = '', price = null, extra = {}) => upsert('items', {listId, text, qty, price, done: false, addedBy: 'u2', ...extra});
  It('l1', 'Milch', '2'); It('l1', 'Brot'); It('l1', 'Äpfel', '1 kg'); It('l1', 'Joghurt nature', '4'); It('l1', 'Käse für Raclette', '', null, {addedBy: 'u1'});
  It('l2', 'Gummistiefel Gr. 30', '', 34.9); It('l2', 'Malstifte', '', 12.5); It('l2', 'Znüni-Box', '', 9.9);
  const jacket = It('l2', 'Winterjacke Gr. 122', '', 79.9, {done: true});
  const nx = mAdd(cm, 1);
  const be = upsert('entries', {month: nx, name: 'Winterjacke Gr. 122', amount: 79.9, kind: 'variable', category: 'Kinder', paid: true, paidAt: t, source: {type: 'shop', listId: 'l2', itemIds: [jacket.id]}, by: 'u2'});
  jacket.budgetEntryId = be.id;
  It('l3', 'Zahnpasta'); It('l3', 'Waschmittel', '', 14.95);
  S.recipes = [
    {id: 'r1', name: 'Spaghetti Bolognese', ingredients: 'Spaghetti\nHackfleisch 500 g\nPassata\nZwiebel\nKnoblauch\nParmesan', tags: 'Kinder, schnell'},
    {id: 'r2', name: 'Älplermagronen', ingredients: 'Hörnli\nKartoffeln\nRahm\nBergkäse\nZwiebeln\nApfelmus', tags: 'Klassiker'},
    {id: 'r3', name: 'Gemüsecurry', ingredients: 'Kokosmilch\nCurrypaste\nReis\nPeperoni\nZucchetti\nKichererbsen', tags: 'vegetarisch'},
  ];
  const mo = mondayOf(t); S.meals[mo] = {recipeId: 'r1'}; S.meals[addDays(mo, 2)] = {recipeId: 'r3'}; S.meals[addDays(mo, 4)] = {text: 'Pizza-Abend'}; S.meals[addDays(mo, 5)] = {recipeId: 'r2'};
  // Kalender
  const E = o => upsert('events', {repeat: 'none', type: 'termin', shared: true, owner: 'u1', ...o});
  E({title: 'Elternabend Kindergarten', date: addDays(t, 3), time: '19:30', timeEnd: '21:00', owner: 'u2'});
  E({title: 'Zahnarzt', date: addDays(t, 5), time: '10:15', shared: false, owner: 'u1'});
  E({title: 'Besprechung Architekt', date: addDays(t, 9), time: '17:00', timeEnd: '18:30', notes: 'Grundrisse, Fensterliste mitnehmen'});
  E({title: 'Geburtstag Grosi', type: 'geburtstag', date: `1958-${addDays(t, 20).slice(5)}`, repeat: 'yearly', birthYear: 1958});
  E({title: 'Turnen', date: mondayOf(t), time: '16:30', repeat: 'weekly', owner: 'k1'});
  E({title: 'Skiferien', type: 'ferien', date: addMonths(mondayOf(t), 3), end: addDays(addMonths(mondayOf(t), 3), 6)});
  S.tasks = [
    {id: uid(), title: 'Steuererklärung einreichen', assignee: 'u1', due: `${y + 1}-03-31`, repeat: 'yearly', done: false},
    {id: uid(), title: 'Winterpneus montieren', assignee: 'u1', due: addDays(t, 4), repeat: 'none', done: false},
    {id: uid(), title: 'Anmeldung Schwimmkurs', assignee: 'u2', due: addDays(t, -1), repeat: 'none', done: false},
    {id: uid(), title: 'Wohnung putzen', assignee: 'all', due: addDays(t, 2), repeat: 'weekly', done: false},
    {id: uid(), title: 'Fotos fürs Fotobuch auswählen', assignee: 'all', due: '', repeat: 'none', done: false},
  ];
  // Haus
  S.house = {name: 'Unser Haus', budget: 1350000, start: `${y + 1}-04-01`, moveIn: `${y + 2}-03-01`, address: 'Parzelle 1234', note: 'Hypothek: Offerten von 3 Banken einholen'};
  S.units = [{id: 'a1', name: 'Appartement 1 (wir)', budget: 170000}, {id: 'a2', name: 'Appartement 2 (Einlieger)', budget: 60000}];
  const R = (id, unitId, name, area, budget) => S.rooms.push({id, unitId, name, area, budget, createdAt: Date.now()});
  R('r_k1', 'a1', 'Küche', 18, 45000); R('r_w1', 'a1', 'Wohnen / Essen', 38, 12000); R('r_b1', 'a1', 'Bad', 8, 35000); R('r_e1', 'a1', 'Elternzimmer', 16, 6000); R('r_c1', 'a1', 'Kinderzimmer 1', 13, 5000); R('r_c2', 'a1', 'Kinderzimmer 2', 13, 5000);
  R('r_k2', 'a2', 'Wohnküche', 30, 25000); R('r_b2', 'a2', 'Bad', 6, 22000); R('r_z2', 'a2', 'Zimmer', 15, 4000);
  S.contacts = [
    {id: 'c1', name: 'M. Muster', company: 'Muster Architektur AG', trade: 'Architekt', phone: '+41 44 000 00 00', email: 'info@example.ch'},
    {id: 'c2', name: 'P. Beispiel', company: 'Beispiel Bau GmbH', trade: 'Baumeister', phone: '+41 44 000 00 01'},
    {id: 'c3', name: 'Küchenbau A', company: 'Küchenbau A AG', trade: 'Küche'},
  ];
  const HC = o => upsert('hcosts', {status: 'geplant', budget: null, offer: null, actual: null, roomId: null, unitId: null, ...o});
  HC({title: 'Grundstück', budget: 480000, actual: 480000, status: 'bezahlt', paidAt: `${y}-02-15`});
  HC({title: 'Architekt & Bauleitung', budget: 95000, offer: 92000, status: 'vergeben', contactId: 'c1', due: addDays(t, 12), note: '1. Teilzahlung 30 %'});
  HC({title: 'Baumeister / Rohbau', budget: 380000, offer: 395000, status: 'offeriert', contactId: 'c2'});
  HC({title: 'Baugebühren & Anschlüsse', budget: 18000});
  HC({title: 'Küche Appartement 1', budget: 45000, offer: 48500, status: 'vergeben', contactId: 'c3', roomId: 'r_k1', unitId: 'a1', offerTrade: 'Küche Appartement 1'});
  HC({title: 'Sanitär Bad', budget: 35000, roomId: 'r_b1', unitId: 'a1'});
  HC({title: 'Küche Einlieger', budget: 22000, roomId: 'r_k2', unitId: 'a2'});
  HC({title: 'Bodenbeläge', budget: 42000, unitId: 'a1'});
  HC({title: 'Wärmepumpe & Erdsonde', budget: 65000});
  S.offers = [
    {id: uid(), trade: 'Küche Appartement 1', vendor: 'Küchenbau A', amount: 48500, chosen: true, contactId: 'c3', roomId: 'r_k1', unitId: 'a1', note: 'inkl. Geräte, Kochinsel'},
    {id: uid(), trade: 'Küche Appartement 1', vendor: 'Küchenstudio B', amount: 52300, note: 'inkl. Geräte, Lieferung 12 Wochen', roomId: 'r_k1', unitId: 'a1'},
    {id: uid(), trade: 'Küche Appartement 1', vendor: 'Küchenwelt C', amount: 46900, note: 'ohne Steamer', roomId: 'r_k1', unitId: 'a1'},
  ];
  const M = (title, date, done = false) => S.milestones.push({id: uid(), title, date, done});
  M('Vorprojekt abgeschlossen', addDays(t, -45), true); M('Baueingabe', addDays(t, 30)); M('Baubewilligung', `${y + 1}-02-15`); M('Spatenstich', `${y + 1}-04-01`);
  M('Aufrichte', `${y + 1}-09-15`); M('Innenausbau', `${y + 1}-11-01`); M('Bauabnahme', `${y + 2}-02-15`); M('Bezug', `${y + 2}-03-01`);
  S.hnotes = [
    {id: uid(), title: 'Entscheid Heizung', text: 'Wärmepumpe mit Erdsonde. Bohrbewilligung beim Kanton prüfen, PV-Anlage aufs Dach (ca. 12 kWp).', date: addDays(t, -20)},
    {id: uid(), title: 'Wünsche Küche', text: 'Kochinsel, Hochschrank für Backofen + Steamer, Vorratsschrank, Steckdosen in der Insel.', date: addDays(t, -10)},
  ];
  // Safe
  S.warranties = [
    {id: uid(), item: 'Waschmaschine', store: 'Elektrofachhandel', date: addDays(t, -400), price: 1890, months: 24},
    {id: uid(), item: 'Laptop', store: 'Onlineshop', date: addMonths(addDays(t, 30), -24), price: 1349, months: 24, serial: 'SN-0000-1111'},
    {id: uid(), item: 'Kinderwagen', store: 'Babyfachgeschäft', date: addDays(t, -200), price: 890, months: 24},
  ];
  S.files = [];
  seedFile();
}
function seedFile() {
  // kleiner Beispiel-Grundriss als SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f8fafc"/><g fill="none" stroke="#334155" stroke-width="5"><rect x="20" y="20" width="360" height="260"/><path d="M200 20v120M20 140h250M270 140v140M200 200v80"/></g><g font-family="Arial" font-size="16" fill="#475569"><text x="70" y="85">Küche</text><text x="250" y="85">Wohnen / Essen</text><text x="60" y="215">Elternzimmer</text><text x="215" y="245">Bad</text><text x="290" y="215">Kind</text></g><text x="20" y="298" font-family="Arial" font-size="11" fill="#94a3b8">Beispiel-Grundriss Appartement 1</text></svg>`;
  const id = uid(), blob = new Blob([svg], {type: 'image/svg+xml'});
  S.files.push({id, name: 'Grundriss Entwurf A1.svg', type: 'image/svg+xml', size: blob.size, date: today(), by: 'u1', module: 'haus', category: 'Plan', roomId: null, tags: 'Entwurf', createdAt: Date.now()});
  IDB.put(id, blob).catch(() => {});
  cloudPutBlob(id, blob).then(() => { if (route().mod === 'house') render(); }).catch(e => console.error(e));
}

/* =========================================================
   CLOUD: Firebase Auth + Firestore-Synchronisation
   Datenpfad: households/main/{sammlung}/{id}
   Zugriff nur für verifizierte, freigeschaltete Konten (Freigabeliste "allowlist").
   ========================================================= */
var booted = false;
var cloud = {on: false, user: null, synced: {}, unsubs: [], pendingRender: false, rt: null};
const HH = 'households/main';
const SYNC_COLS = ['members', 'events', 'tasks', 'templates', 'entries', 'goals', 'lists', 'items', 'recipes', 'units', 'rooms', 'hcosts', 'offers', 'milestones', 'contacts', 'defects', 'hnotes', 'files', 'contracts', 'warranties', 'bills'];
const META_KEYS = ['months', 'meals', 'house', 'flags'];
const fb = () => window.FB.fns;
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } };

// Lokale Änderungen mit dem letzten bekannten Cloud-Stand vergleichen und nur Unterschiede schreiben
function syncDiff() {
  if (!cloud.on) return;
  const {doc, writeBatch} = fb(), db = FB.db, ops = [], seen = new Set();
  for (const c of SYNC_COLS) for (const o of (S[c] || [])) {
    if (!o || !o.id) continue;
    const k = c + '/' + o.id; seen.add(k);
    const j = JSON.stringify(o);
    if (cloud.synced[k] !== j) { cloud.synced[k] = j; const data = JSON.parse(j); ops.push(b => b.set(doc(db, `${HH}/${c}/${o.id}`), data)); }
  }
  for (const k of Object.keys(cloud.synced)) {
    if (k.startsWith('meta:') || seen.has(k)) continue;
    delete cloud.synced[k];
    ops.push(b => b.delete(doc(db, `${HH}/${k}`)));
  }
  for (const m of META_KEYS) {
    const j = JSON.stringify(S[m] ?? null);
    if (cloud.synced['meta:' + m] !== j) { cloud.synced['meta:' + m] = j; const v = JSON.parse(j); ops.push(b => b.set(doc(db, `${HH}/meta/${m}`), {v})); }
  }
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(f => f(b));
    b.commit().catch(e => { console.error(e); toast('Speichern in der Cloud fehlgeschlagen: ' + (e.code || e.message)); });
  }
}
function remoteChanged() { clearTimeout(cloud.rt); cloud.rt = setTimeout(() => { if (booted) processBills(); cloud.pendingRender = true; flushRemoteRender(); }, 120); }
function flushRemoteRender() {
  if (!booted || !cloud.pendingRender) return;
  const ae = document.activeElement;
  if ($('#modal').classList.contains('open') || (ae && ae.closest && ae.closest('#app') && /INPUT|TEXTAREA|SELECT/.test(ae.tagName))) return;
  cloud.pendingRender = false;
  render();
}
function attachCloud(onLoaded) {
  const {collection, onSnapshot} = fb(), db = FB.db;
  let pending = SYNC_COLS.length + 1;
  const done = () => { if (--pending === 0) onLoaded(); };
  for (const c of SYNC_COLS) {
    let first = true;
    cloud.unsubs.push(onSnapshot(collection(db, `${HH}/${c}`), snap => {
      for (const ch of snap.docChanges()) {
        if (!first && ch.doc.metadata.hasPendingWrites) continue;
        const id = ch.doc.id, k = c + '/' + id;
        if (ch.type === 'removed') { S[c] = S[c].filter(x => x.id !== id); delete cloud.synced[k]; continue; }
        const d = ch.doc.data(); d.id = id;
        cloud.synced[k] = JSON.stringify(d);
        const i = S[c].findIndex(x => x.id === id);
        if (i >= 0) S[c][i] = d; else S[c].push(d);
      }
      if (first) { first = false; done(); } else remoteChanged();
    }, cloudError));
  }
  let firstMeta = true;
  cloud.unsubs.push(onSnapshot(collection(db, `${HH}/meta`), snap => {
    for (const ch of snap.docChanges()) {
      if (!firstMeta && ch.doc.metadata.hasPendingWrites) continue;
      const key = ch.doc.id; if (!META_KEYS.includes(key)) continue;
      const v = ch.type === 'removed' ? null : ch.doc.data().v;
      S[key] = v ?? blank()[key];
      cloud.synced['meta:' + key] = JSON.stringify(S[key]);
    }
    if (firstMeta) { firstMeta = false; done(); } else remoteChanged();
  }, cloudError));
}
function cloudError(e) {
  console.error(e);
  if (e.code === 'permission-denied') { cloud.unsubs.forEach(u => u()); cloud.unsubs = []; showDenied(cloud.user); }
  else toast('Verbindungsproblem: ' + (e.code || e.message));
}

// ---------- Dateien in Firestore (in Stücke von 600 KB aufgeteilt) ----------
const CHUNK = 600000;
const blobToB64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = rej; fr.readAsDataURL(b); });
async function cloudPutBlob(id, blob) {
  if (!cloud.on) return;
  const {doc, setDoc} = fb(), b64 = await blobToB64(blob), n = Math.max(1, Math.ceil(b64.length / CHUNK));
  for (let i = 0; i < n; i++) await setDoc(doc(FB.db, `${HH}/blobs/${id}/chunks/${i}`), {d: b64.slice(i * CHUNK, (i + 1) * CHUNK)});
  await setDoc(doc(FB.db, `${HH}/blobs/${id}`), {n, type: blob.type || 'application/octet-stream', size: blob.size});
}
async function cloudGetBlob(id) {
  const {doc, getDoc} = fb(), m = await getDoc(doc(FB.db, `${HH}/blobs/${id}`));
  if (!m.exists()) return null;
  const {n, type} = m.data();
  let s = '';
  for (let i = 0; i < n; i++) { const c = await getDoc(doc(FB.db, `${HH}/blobs/${id}/chunks/${i}`)); if (!c.exists()) return null; s += c.data().d; }
  const bin = atob(s), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], {type});
}
async function deleteBlob(id) {
  try { await IDB.del(id); } catch (e) {}
  if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; }
  if (!cloud.on) return;
  try {
    const {doc, getDoc, deleteDoc} = fb(), m = await getDoc(doc(FB.db, `${HH}/blobs/${id}`));
    const n = m.exists() ? m.data().n : 0;
    for (let i = 0; i < n; i++) await deleteDoc(doc(FB.db, `${HH}/blobs/${id}/chunks/${i}`));
    await deleteDoc(doc(FB.db, `${HH}/blobs/${id}`));
  } catch (e) { console.error(e); }
}

// ---------- Anmeldung ----------
const AUTH_ERR = {
  'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.', 'auth/wrong-password': 'E-Mail oder Passwort ist falsch.', 'auth/user-not-found': 'E-Mail oder Passwort ist falsch.',
  'auth/invalid-email': 'Bitte eine gültige E-Mail-Adresse eingeben.', 'auth/too-many-requests': 'Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.',
  'auth/network-request-failed': 'Keine Internetverbindung.', 'auth/user-disabled': 'Dieses Konto ist gesperrt.',
  'auth/password-does-not-meet-requirements': 'Dein Passwort erfüllt die Sicherheitsrichtlinie nicht. Bitte setze über «Passwort vergessen?» ein neues (mind. 12 Zeichen, Gross-/Kleinbuchstaben, Zahl, Sonderzeichen).',
};
function authShell(inner) {
  const nav = $('#nav'); nav.innerHTML = ''; nav.style.display = 'none';
  $('#app').innerHTML = `<div class="auth"><div class="auth-card"><img class="auth-logo" src="icons/icon-192.png" alt=""><h1>Unser Zuhause</h1>${inner}</div>
    <p class="s auth-foot">${ic('shield', 13)} Privat · verschlüsselt · nur für freigeschaltete Konten</p></div>`;
}
function showLogin(msg = '', info = '') {
  authShell(`<p class="muted">Melde dich mit deiner E-Mail an.</p>
    <form data-f="login" class="f1" autocomplete="on">
      <input name="email" type="email" autocomplete="username" placeholder="E-Mail" required>
      <input name="password" type="password" autocomplete="current-password" placeholder="Passwort" required>
      ${msg ? `<div class="aerr">${esc(msg)}</div>` : ''}${info ? `<div class="ainfo">${esc(info)}</div>` : ''}
      <button class="btn pri block" id="loginBtn">Anmelden</button>
    </form>
    <button class="linkbtn" data-a="forgot">Passwort vergessen?</button>`);
}
function showVerify(user, info = '') {
  authShell(`<p><b>Bitte bestätige deine E-Mail-Adresse.</b></p><p class="muted small">Aus Sicherheitsgründen ist die App erst nach der Bestätigung von <b>${esc(user.email)}</b> nutzbar. Öffne den Link in der E-Mail und tippe danach auf «Ich habe bestätigt».</p>
    ${info ? `<div class="ainfo">${esc(info)}</div>` : ''}
    <div class="f1"><button class="btn pri block" data-a="checkVerify">Ich habe bestätigt</button><button class="btn block" data-a="sendVerify">Bestätigungs-E-Mail senden</button></div>
    <button class="linkbtn" data-a="logout0">Abmelden</button>`);
}
function showDenied(user) {
  authShell(`<p><b>Kein Zugriff</b></p><p class="muted small">Das Konto <b>${esc(user ? user.email : '')}</b> ist angemeldet, aber noch nicht für diese App freigeschaltet.</p>
    <div class="hint" style="text-align:left">${ic('lock', 16)}<span>Freischalten in der Firebase-Konsole: <b>Firestore → Daten → Sammlung «allowlist»</b> → Dokument hinzufügen mit der <b>E-Mail-Adresse (Kleinbuchstaben) als Dokument-ID</b> und z.B. dem Feld <i>name</i>.</span></div>
    <div class="f1"><button class="btn pri block" data-a="recheck">Erneut prüfen</button></div>
    <button class="linkbtn" data-a="logout0">Abmelden</button>`);
}
function showSetup() {
  authShell(`<p><b>Willkommen, ${esc(myEmail())}!</b></p><p class="muted small">Eure Datenbank ist noch leer. Wie möchtet ihr starten?</p>
    <div class="f1"><button class="btn pri block" data-a="setupBlank">Leer starten</button><button class="btn block" data-a="setupDemo">Mit Beispieldaten ansehen</button></div>
    <p class="s">Die Beispieldaten kannst du später unter Familie → Daten wieder löschen.</p>`);
}
async function afterLogin(user) {
  if (!user.emailVerified) { showVerify(user); return; }
  authShell('<p class="muted">Lade eure Daten …</p>');
  const email = (user.email || '').toLowerCase();
  try {
    const a = await fb().getDoc(fb().doc(FB.db, 'allowlist', email));
    if (!a.exists()) { cloud.user = user; showDenied(user); return; }
  } catch (e) {
    if (e.code === 'permission-denied') { cloud.user = user; showDenied(user); return; }
    console.warn('Freigabe offline nicht prüfbar – nutze Cache', e);
  }
  cloud.user = user;
  S = blank(); S.settings = {...S.settings, ...loadSettings()};
  attachCloud(() => {
    cloud.on = true;
    if (!S.members.length && !S.lists.length && !S.entries.length && !S.events.length) { showSetup(); return; }
    enterApp();
  });
}
function enterApp() {
  booted = true;
  $('#nav').style.display = '';
  migrate();
  const ren = {Ich: 'Ajdin', Partnerin: 'Elma'}; S.members.forEach(m => { if (ren[m.name] && (m.id === 'u1' || m.id === 'u2')) m.name = ren[m.name]; });
  if (!S.members.some(m => m.email === myEmail())) { const free = adults().find(m => !m.email); if (free) { free.email = myEmail(); S.settings.activeUser = free.id; } }
  processBills(); applyTheme(); persist(); render();
}
async function cloudLogout() {
  try {
    cloud.unsubs.forEach(u => u()); cloud.unsubs = []; cloud.on = false;
    await fb().signOut(FB.auth);
    await fb().terminate(FB.db);
    await fb().clearIndexedDbPersistence(FB.db).catch(() => {});
    await IDB.clear().catch(() => {});
    localStorage.removeItem(SKEY);
  } finally { location.replace(location.pathname); }
}
Object.assign(A, {
  async forgot() {
    const em = (document.querySelector('form[data-f=login] input[name=email]')?.value || '').trim();
    if (!em) { showLogin('Bitte zuerst deine E-Mail-Adresse eingeben.'); return; }
    try { await fb().sendPasswordResetEmail(FB.auth, em); } catch (e) { if (e.code === 'auth/invalid-email') { showLogin(AUTH_ERR[e.code]); return; } }
    showLogin('', 'Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen des Passworts an ' + em + ' gesendet.');
  },
  async sendVerify() {
    try { await fb().sendEmailVerification(FB.auth.currentUser); showVerify(FB.auth.currentUser, 'E-Mail gesendet – bitte auch den Spam-Ordner prüfen.'); }
    catch (e) { showVerify(FB.auth.currentUser, AUTH_ERR[e.code] || 'Senden fehlgeschlagen: ' + e.code); }
  },
  async checkVerify() {
    const u = FB.auth.currentUser; if (!u) return;
    await fb().reload(u);
    if (u.emailVerified) { await u.getIdToken(true); afterLogin(u); } else showVerify(u, 'Noch nicht bestätigt. Bitte den Link in der E-Mail öffnen.');
  },
  recheck() { const u = FB.auth.currentUser; if (u) afterLogin(u); },
  async logout0() { await cloudLogout(); },
  setupBlank() {
    S.members = [{id: 'u1', name: 'Ajdin', role: 'adult', color: COLORS[0], email: myEmail()}, {id: 'u2', name: 'Elma', role: 'adult', color: COLORS[1]}];
    S.lists = [{id: uid(), name: 'Lebensmittel', category: 'Lebensmittel'}, {id: uid(), name: 'Kinder', category: 'Kinder'}, {id: uid(), name: 'Drogerie', category: 'Haushalt'}];
    S.settings.activeUser = 'u1'; S.flags = {demo: false};
    enterApp(); toast('Willkommen! Passe unter «Familie» die Namen an.'); go('#/settings');
  },
  setupDemo() {
    const keep = S.settings; seed(); S.settings = {...keep, activeUser: 'u1'}; S.members[0].email = myEmail();
    enterApp();
  },
});
F.login = async fm => {
  const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Anmelden …';
  try { await fb().signInWithEmailAndPassword(FB.auth, fm.email.value.trim(), fm.password.value); }
  catch (e) { showLogin(AUTH_ERR[e.code] || 'Anmeldung fehlgeschlagen (' + e.code + ').'); const f2 = document.querySelector('form[data-f=login]'); if (f2) f2.email.value = fm.email.value; }
};

// ---------- Start ----------
(function boot() {
  try { localStorage.removeItem(KEY); } catch (e) {} // alte Prototyp-Daten entfernen
  S = blank(); S.settings = {...S.settings, ...loadSettings()};
  applyTheme();
  authShell('<p class="muted">Lade …</p>');
  const start = () => {
    if (!window.FB || window.FB.error) { authShell(`<div class="aerr">${esc(window.FB?.error || 'Firebase konnte nicht geladen werden. Bitte Internetverbindung prüfen und neu laden.')}</div>`); return; }
    fb().onAuthStateChanged(FB.auth, u => {
      if (!u) { if (booted || cloud.user) location.replace(location.pathname); else showLogin(); }
      else if (!cloud.user) afterLogin(u);
    });
  };
  if (window.FB) start(); else {
    window.addEventListener('fb-ready', start, {once: true});
    setTimeout(() => { if (!window.FB) authShell('<div class="aerr">Keine Verbindung zu Firebase. Bitte Internet prüfen und neu laden.</div>'); }, 20000);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
