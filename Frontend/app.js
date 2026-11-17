'use strict';

/* Buildless bilingual frontend. Selected guides are educational references. */
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const safeStore = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
};
let lang = safeStore.get('cc-language', 'en');
if (!['en', 'bn'].includes(lang)) lang = 'en';
let reports = safeStore.get('cc-observations-v2', []);
if (!Array.isArray(reports)) reports = [];
reports = reports.filter(r => r && r.mode === 'guide' && DISEASES.some(d => d.id === r.disease) && typeof r.id === 'string' && Number.isFinite(Date.parse(r.date))).slice(0, 100);
let tasks = safeStore.get('cc-tasks', [false, false, false]);
tasks = Array.from({ length: 3 }, (_, i) => Array.isArray(tasks) && tasks[i] === true);
let route = 'dashboard', filter = 'all', query = '', file = null, preview = '', result = null;
let analyzing = false, runId = 0, uploadId = 0, lastFocus = null;
let selection = DISEASES[0].id, fieldNote = '';
const L = (en, bn) => lang === 'bn' ? bn : en;
const A = value => value[lang === 'bn' ? 1 : 0];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const n = value => new Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-US').format(value);
const date = value => new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(value));
const projectTitle = () => L('CropCare | Crop Health Guide', 'CropCare | ফসলের যত্নের গাইড');
const icons = {
  leaf: 'M20 4C8 2 3 8 5 15c4 9 16 2 15-11ZM4 21 16 9m-7 7-1-5m5 1 5-1',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  scan: 'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 12h10m-5-5v10',
  book: 'M12 5C8 2 3 3 3 3v16s5-1 9 2m0-16c4-3 9-2 9-2v16s-5-1-9 2V5',
  chart: 'M4 3v18h17M8 16v-4m5 4V7m5 9v-6',
  file: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-12a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01',
  arrow: 'M4 12h15m-6-6 6 6-6 6', upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3V7Zm9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  check: 'm5 12 4 4L19 6', search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6',
  calendar: 'M4 5h16v16H4V5Zm3-3v6m10-6v6M4 10h16',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-10h.01',
  globe: 'M3 12h18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c-5 6-5 12 0 18 5-6 5-12 0-18Z',
  menu: 'M3 6h18M3 12h18M3 18h18', close: 'm6 6 12 12M6 18 18 6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  trash: 'M3 6h18M6 6l1 15h10l1-15M9 6V3h6v3m-5 4v7m4-7v7',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l4 2',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z'
};
const icon = key => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[key] || icons.leaf}"/></svg>`;
const navs = [
  ['dashboard', 'grid', ['Overview', 'সংক্ষিপ্ত চিত্র']],
  ['diagnose', 'scan', ['Crop diagnosis', 'ফসল পরীক্ষা']],
  ['library', 'book', ['Disease library', 'রোগের তথ্যভান্ডার']],
  ['reports', 'chart', ['My reports', 'আমার রিপোর্ট']],
  ['research', 'file', ['Guide sources', 'গাইডের সূত্র']],
  ['about', 'help', ['About CropCare', 'CropCare পরিচিতি']]
];
const btn = (label, action, style = '', ico = 'arrow') => `<button class="btn ${style}" data-action="${action}">${label}${icon(ico)}</button>`;
const cropOf = disease => CROP_DATA.find(c => c.id === disease.crop);
const motionEnabled = () => safeStore.get('cc-motion', true) && !matchMedia('(prefers-reduced-motion: reduce)').matches;

function shell() {
  document.documentElement.lang = lang;
  document.title = projectTitle();
  $('#sidebar').innerHTML = `
    <a class="brand" href="#dashboard"><img src="assets/logo.svg" alt=""><div><strong>CropCare <span>BD</span></strong><small>${L('CULTIVATE TOMORROW', 'আগামীর কৃষি, আজকের যত্ন')}</small></div></a>
    <div class="nav-label">${L('YOUR WORKSPACE', 'আপনার কর্মক্ষেত্র')}</div>
    <nav class="nav" aria-label="${L('Main navigation', 'প্রধান নেভিগেশন')}">${navs.map(([id, i, t]) => `<a href="#${id}" class="${route === id ? 'active' : ''}" ${route === id ? 'aria-current="page"' : ''}>${icon(i)}${A(t)}${id === 'reports' ? `<span class="count">${n(reports.length)}</span>` : ''}</a>`).join('')}</nav>
    <div class="sidebar-bottom">
      <div class="sidebar-note"><div class="sprout">${icon('leaf')}</div><h3>${L('Small steps.<br>Healthier crops.', 'ছোট পদক্ষেপে<br>সুস্থ ফসল।')}</h3><p>${L('Every healthy harvest starts with a closer look.', 'ভালো ফলনের শুরু ফসলের প্রতি একটু বাড়তি নজর থেকে।')}</p><a href="#diagnose">${L('Start an observation', 'পর্যবেক্ষণ শুরু করুন')}${icon('arrow')}</a></div>
      <a class="project-signature" href="#about">${icon('spark')}<strong>${projectTitle()}</strong></a>
    </div>`;
  $('#topbar').innerHTML = `
    <button class="menu-button" data-action="menu" aria-label="${L('Open navigation', 'মেনু খুলুন')}" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <div class="crumb"><span>${L('Workspace', 'কর্মক্ষেত্র')}</span><span>/</span><b>${A(navs.find(x => x[0] === route)[2])}</b></div>
    <div class="top-actions"><a class="top-search" href="#library" aria-label="${L('Find a crop guide', 'ফসলের গাইড খুঁজুন')}">${icon('search')}<span>${L('Find a crop guide', 'ফসলের গাইড খুঁজুন')}</span></a>
    <button class="motion-toggle" data-action="motion" aria-pressed="${motionEnabled()}" aria-label="${L('Toggle animation effects', 'অ্যানিমেশন চালু বা বন্ধ করুন')}" title="${L('Animation effects', 'অ্যানিমেশন')}">${icon('spark')}</button>
    <div class="language" role="group" aria-label="${L('Website language', 'ওয়েবসাইটের ভাষা')}"><button data-lang="en" lang="en" class="${lang === 'en' ? 'selected' : ''}" aria-pressed="${lang === 'en'}">EN</button><button data-lang="bn" lang="bn" class="${lang === 'bn' ? 'selected' : ''}" aria-pressed="${lang === 'bn'}">বাংলা</button></div></div>`;
}
function head(title, sub, extra = '') {
  return `<div class="page-head"><div><div class="section-kicker">${L('CROPCARE / FIELD INTELLIGENCE', 'CROPCARE / কৃষির তথ্যসঙ্গী')}</div><h1>${title}</h1><p>${sub}</p></div>${extra || `<span class="date">${icon('calendar')}${date(new Date())}</span>`}</div>`;
}
function cropCards() {
  return CROP_DATA.map(c => `<a class="crop-card" href="#library/${c.id}"><div class="photo"><img src="assets/${c.image}" alt="${A(c.name)}" loading="lazy"><span>${L('CROP GUIDE', 'ফসলের গাইড')}</span></div><div class="crop-info"><div><h3>${A(c.name)}</h3><small>${A(c.desc)}</small></div><span class="arrow-circle">${icon('arrow')}</span></div></a>`).join('');
}
function checklist() {
  const labels = [['Look closely at both sides of leaves', 'পাতার দুই পাশ ভালোভাবে দেখুন'], ['Photograph any new spots or changes', 'নতুন দাগ বা পরিবর্তনের ছবি তুলুন'], ['Keep a dated record of observations', 'তারিখসহ পর্যবেক্ষণ লিখে রাখুন']];
  return `<div class="panel-head"><div><h2>${L('Your field checklist', 'মাঠ পর্যবেক্ষণের তালিকা')}</h2><p>${L('A little attention goes a long way', 'নিয়মিত নজরদারিতে ফসলের যত্ন')}</p></div><span class="panel-icon">${icon('sun')}</span></div><div class="task-list">${labels.map((x, i) => `<label class="task"><input type="checkbox" data-task="${i}" ${tasks[i] ? 'checked' : ''}><span>${A(x)}</span></label>`).join('')}</div><div class="progress-track"><span style="width:${tasks.filter(Boolean).length / 3 * 100}%"></span></div><div class="task-foot"><span>${n(tasks.filter(Boolean).length)} / ${n(3)} ${L('completed', 'সম্পন্ন')}</span><button class="link" data-action="reset-tasks">${L('Reset', 'রিসেট')}</button></div>`;
}
function dashboard() {
  return head(L('A good day to grow.', 'ফসলের যত্নে সুন্দর একটি দিন।'), L('Your crops, your observations, one thoughtful workspace.', 'ফসল, পর্যবেক্ষণ ও প্রয়োজনীয় তথ্য—সব এক জায়গায়।')) + `
    <div class="hero"><section class="hero-main"><img src="assets/field.jpg" alt="${L('Lush green paddy field in Bangladesh', 'বাংলাদেশের সবুজ ধানক্ষেত')}"><div class="hero-orbit" aria-hidden="true"><span></span><i></i></div><div class="hero-copy"><span class="eyebrow">${L('SMARTER CARE, FROM THE FIRST LEAF', 'পাতার প্রথম লক্ষণ থেকেই যত্ন')}</span><h2>${L('Healthy crops.<br><em>A brighter tomorrow.</em>', 'সুস্থ ফসল।<br><em>সমৃদ্ধ আগামী।</em>')}</h2><p>${L('Explore crop symptoms, capture a clear photo, and keep your next steps close at hand.', 'ফসলের লক্ষণ চিনুন, পরিষ্কার ছবি তুলুন এবং প্রয়োজনীয় করণীয় হাতের কাছে রাখুন।')}</p><a class="btn lime" href="#diagnose">${icon('scan')}${L('Check your crop', 'ফসল পরীক্ষা করুন')}${icon('arrow')}</a></div><div class="hero-stamp">${icon('leaf')}${L('ROOTED IN BETTER CARE', 'সচেতন চাষির সঙ্গী')}</div></section>
    <aside class="hero-side"><span class="eyebrow">${L('THE FIELD NOTE', 'মাঠের কথা')}</span><div class="field-note-number">01 <span>/ ${L('GROW BETTER', 'ভালো ফলন')}</span></div><h3>${L('Look early.<br>Act thoughtfully.', 'আগে দেখুন।<br>বুঝে ব্যবস্থা নিন।')}</h3><p>${L('Similar symptoms can have different causes. A clear photo helps you discuss what you see with an expert.', 'একই লক্ষণের ভিন্ন কারণ হতে পারে। পরিষ্কার ছবি নিয়ে কৃষি বিশেষজ্ঞের সঙ্গে আলোচনা করুন।')}</p><a class="field-note-link" href="#library">${L('Explore crop care', 'ফসলের যত্ন জানুন')}${icon('arrow')}</a><div class="note-leaf" aria-hidden="true">${icon('leaf')}</div></aside></div>
    <div class="stats">${[['file', reports.length, L('Saved observations', 'সংরক্ষিত পর্যবেক্ষণ')], ['leaf', 3, L('Crops to explore', 'ফসলের গাইড')], ['book', 6, L('Disease guides', 'রোগের তথ্য')], ['globe', 2, L('Languages, one experience', 'ভাষায় একই অভিজ্ঞতা')]].map(([i, v, t]) => `<div class="stat"><span class="stat-icon">${icon(i)}</span><div><b>${n(v).padStart(lang === 'en' ? 2 : 1, '0')}</b><small>${t}</small></div><span class="stat-spark">↗</span></div>`).join('')}</div>
    <div class="grid-main"><section class="panel"><div class="panel-head"><div><h2>${L('Start with a leaf photo', 'শুরু করুন পাতার ছবি দিয়ে')}</h2><p>${L('A simple space to observe, learn and keep notes', 'পর্যবেক্ষণ, তথ্য ও নোট রাখার সহজ জায়গা')}</p></div><span class="panel-icon">${icon('scan')}</span></div><div class="upload-preview"><div class="upload-icon">${icon('upload')}</div><div><h3>${L('Something unusual on your crop?', 'ফসলে অস্বাভাবিক কিছু দেখছেন?')}</h3><p>${L('JPG, PNG or WebP · up to 10 MB', 'JPG, PNG বা WebP · সর্বোচ্চ ১০ মেগাবাইট')}</p><a class="btn small" href="#diagnose">${L('Upload a photo', 'ছবি আপলোড করুন')}${icon('arrow')}</a></div></div><div class="workflow">${[[1, L('Add a photo', 'ছবি দিন')], [2, L('Explore a guide', 'গাইড দেখুন')], [3, L('Save your notes', 'নোট রাখুন')]].map(([v, t], i) => `${i ? '<i></i>' : ''}<div><span>${n(v)}</span>${t}</div>`).join('')}</div></section><section class="panel" id="checklist">${checklist()}</section></div>
    <section class="section"><div class="section-head"><div><h2>${L('Know your crops', 'আপনার ফসল সম্পর্কে জানুন')}</h2><p>${L('Practical guides for the plants you grow', 'চাষ করা ফসলের প্রয়োজনীয় গাইড')}</p></div><a class="link" href="#library">${L('All guides', 'সব গাইড')}${icon('arrow')}</a></div><div class="crop-grid">${cropCards()}</div></section>
    <div class="bottom-grid section"><section class="panel"><div class="panel-head"><h2>${L('Recent observations', 'সাম্প্রতিক পর্যবেক্ষণ')}</h2><a class="link" href="#reports">${L('View all', 'সব দেখুন')}${icon('arrow')}</a></div>${reports.length ? reports.slice(0, 2).map(r => reportRow(r, true)).join('') : `<div class="empty">${icon('file')}<h3>${L('Your crop story starts here', 'এখানেই শুরু আপনার ফসলের গল্প')}</h3><p>${L('Save a guide with your notes to build an observation history.', 'গাইডের সঙ্গে নোট রেখে পর্যবেক্ষণের ইতিহাস তৈরি করুন।')}</p></div>`}</section><aside class="tip"><div>${icon('camera')}</div><div><h3>${L('A better photo. A better starting point.', 'ভালো ছবি, ভালোভাবে বোঝার শুরু।')}</h3><p>${L('Use natural light. Fill the frame with one leaf. Keep the affected area sharp and include both sides when possible.', 'প্রাকৃতিক আলো ব্যবহার করুন। একটি পাতা ফ্রেমে রাখুন। আক্রান্ত অংশ স্পষ্ট করুন; সম্ভব হলে দুই পাশের ছবি নিন।')}</p><a class="link" href="#diagnose">${L('See photo tips', 'ছবি তোলার পরামর্শ')}${icon('arrow')}</a></div></aside></div>`;
}
function diagnose() {
  return head(L('A closer look at your crop', 'আপনার ফসলকে আরও কাছ থেকে দেখুন'), L('Capture what you see. Explore a guide. Keep a useful record.', 'ছবি তুলুন। গাইড দেখুন। প্রয়োজনীয় তথ্য রাখুন।')) + `
    <div class="service-note">${icon('info')}<span>${L('This browser-based guide keeps your photo on your device. Choose a reference guide to review related symptoms and care.', 'এই ব্রাউজারভিত্তিক গাইডে আপনার ছবি ডিভাইসেই থাকে। সংশ্লিষ্ট লক্ষণ ও পরিচর্যা জানতে একটি তথ্যের গাইড বেছে নিন।')}</span></div>
    <div class="diagnose-grid"><section class="panel"><div class="panel-head"><h2>${L('01 · Add a crop photo', '০১ · ফসলের ছবি দিন')}</h2><span class="badge neutral">${icon('shield')}${L('On your device', 'আপনার ডিভাইসেই')}</span></div>
      <div class="upload-zone" id="dropzone">${preview ? `<img src="${preview}" alt="${L('Selected crop photo preview', 'নির্বাচিত ফসলের ছবির প্রিভিউ')}"><small>${esc(file?.name || L('Sample: tomato early blight', 'নমুনা: টমেটোর আর্লি ব্লাইট'))}</small>` : `<div class="upload-icon">${icon('upload')}</div><h3>${L('Drop your leaf photo here', 'পাতার ছবি এখানে ছাড়ুন')}</h3><p>${L('or choose a photo from your device', 'অথবা আপনার ডিভাইস থেকে ছবি বাছুন')}</p>`}<button class="btn outline small" data-action="choose">${icon('upload')}${L('Choose image', 'ছবি বাছুন')}</button><small class="muted">JPG, PNG, WebP · ${L('maximum 10 MB', 'সর্বোচ্চ ১০ মেগাবাইট')}</small></div>
      <input class="hidden" id="image-input" type="file" accept="image/jpeg,image/png,image/webp"><input class="hidden" id="camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment">
      <div class="file-row">${btn(L('Use sample photo', 'নমুনা ছবি ব্যবহার করুন'), 'sample', 'light', 'leaf')}${btn(L('Use camera', 'ক্যামেরা ব্যবহার করুন'), 'camera', 'outline', 'camera')}</div>
      <div class="field"><label class="small-label" for="scenario">${L('02 · Select a reference guide', '০২ · তথ্যের গাইড বাছুন')}</label><select id="scenario">${DISEASES.map(d => `<option value="${d.id}" ${selection === d.id ? 'selected' : ''}>${A(cropOf(d).name)} — ${A(d.name)}</option>`).join('')}</select><small>${L('Your selection opens a reference guide; it does not identify the uploaded leaf.', 'এই নির্বাচনে তথ্যের গাইড খুলবে; আপলোড করা পাতার রোগ শনাক্ত হবে না।')}</small></div>
      <div class="field"><label class="small-label" for="field-note">${L('03 · Your field notes', '০৩ · মাঠের পর্যবেক্ষণ')} <span class="muted">${L('(optional)', '(ঐচ্ছিক)')}</span></label><textarea id="field-note" rows="2" maxlength="500" placeholder="${L('Where did the spots appear? When did you first notice them?', 'কোন অংশে দাগ? প্রথম কবে দেখেছেন?')}">${esc(fieldNote)}</textarea></div>
      <div class="field"><button class="btn full" data-action="analyze" ${analyzing ? 'disabled' : ''}>${icon('scan')}${analyzing ? L('Preparing your workspace…', 'তথ্য প্রস্তুত হচ্ছে…') : L('Open crop guide', 'ফসলের গাইড খুলুন')}</button></div>
    </section><section class="panel" id="result-panel" aria-live="polite">${result ? resultHTML(result) : waitingHTML()}</section></div>
    <section class="section panel"><div class="panel-head"><h2>${L('Three ways to improve your photo', 'ভালো ছবি তোলার তিনটি উপায়')}</h2>${icon('camera')}</div><div class="team">${[[L('Natural, even light', 'সমান প্রাকৃতিক আলো'), L('Avoid harsh shadows and flash reflections.', 'তীব্র ছায়া ও ফ্ল্যাশের প্রতিফলন এড়িয়ে চলুন।')], [L('One clear subject', 'একটি স্পষ্ট বিষয়'), L('Focus on one leaf; keep the background simple.', 'একটি পাতায় ফোকাস করুন; পেছনের অংশ সহজ রাখুন।')], [L('Useful context', 'প্রয়োজনীয় প্রেক্ষাপট'), L('Note the crop, affected area and when symptoms began.', 'ফসল, আক্রান্ত অংশ ও লক্ষণ শুরুর সময় লিখে রাখুন।')]].map(([t, p]) => `<div><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></section>`;
}
function waitingHTML() {
  return `<div class="panel-head"><h2>${L('Your crop workspace', 'আপনার ফসলের তথ্য')}</h2>${icon('leaf')}</div><div class="empty waiting-visual"><div class="leaf-orbit" aria-hidden="true"><span>${icon('leaf')}</span><i></i></div><h3>${L('Every leaf tells a story', 'প্রতিটি পাতায় ফসলের কথা')}</h3><p>${L('Add a photo and select a guide to bring your observations together.', 'ছবি ও গাইড বেছে পর্যবেক্ষণের তথ্য এক জায়গায় আনুন।')}</p></div><div class="analysis-steps">${[[1, L('Preview your leaf photo', 'পাতার ছবি দেখুন')], [2, L('Read symptoms and care', 'লক্ষণ ও পরিচর্যা জানুন')], [3, L('Save your field observation', 'মাঠের পর্যবেক্ষণ রাখুন')]].map(([v, t]) => `<div><span class="step-n">${n(v)}</span>${t}</div>`).join('')}</div><div class="waiting-foot">${icon('shield')}${L('Private photos. Source-linked guidance.', 'ব্যক্তিগত ছবি। সূত্রসহ তথ্য।')}</div>`;
}
function resultHTML(record) {
  const d = DISEASES.find(x => x.id === record.disease);
  return `<div class="panel-head"><h2>${L('Selected crop guide', 'নির্বাচিত ফসলের গাইড')}</h2><span class="badge">${L('Reference', 'তথ্যসূত্র')}</span></div><div class="result-top"><div class="guide-emblem">${icon('leaf')}</div><div><span class="eyebrow">${A(cropOf(d).name)}</span><h2>${A(d.name)}</h2><p>${A(d.type)}</p></div></div><p class="result-context">${L('Opened from your selection. This is reference information, not an image diagnosis.', 'আপনার নির্বাচন থেকে খোলা হয়েছে। এটি তথ্যের গাইড, ছবির রোগ নির্ণয় নয়।')}</p><div class="result-block"><h3>${L('Symptoms to observe', 'যেসব লক্ষণ পর্যবেক্ষণ করবেন')}</h3><p>${A(d.symptom)}</p></div><div class="result-block"><h3>${L('Practical next steps', 'প্রাথমিক করণীয়')}</h3><ul>${d.care.map(x => `<li>${A(x)}</li>`).join('')}</ul></div>${record.note ? `<div class="result-block"><h3>${L('Your field notes', 'আপনার পর্যবেক্ষণ')}</h3><p class="saved-note">${esc(record.note)}</p></div>` : ''}<a class="link source-link" href="${d.source}" target="_blank" rel="noopener">${L('Source', 'সূত্র')}: ${d.sourceName} ↗</a><div class="actions">${btn(L('Save observation', 'পর্যবেক্ষণ রাখুন'), 'save', '', 'file')}${btn(L('Download report', 'রিপোর্ট ডাউনলোড'), 'download', 'outline', 'download')}</div><p class="result-context">${L('Discuss suspected disease and locally appropriate care with an agricultural expert.', 'সন্দেহজনক রোগ ও স্থানীয় ব্যবস্থাপনা কৃষি বিশেষজ্ঞের সঙ্গে আলোচনা করুন।')}</p>`;
}
function library() {
  return head(L('A field guide, always nearby', 'হাতের কাছেই ফসলের গাইড'), L('Explore common symptoms and source-backed prevention practices.', 'সাধারণ লক্ষণ ও সূত্রভিত্তিক প্রতিরোধের উপায় জানুন।')) + `<div class="toolbar"><div class="search-wrap">${icon('search')}<input class="input" id="disease-search" aria-label="${L('Search disease guides', 'রোগের গাইড খুঁজুন')}" placeholder="${L('Search crops, diseases or symptoms…', 'ফসল, রোগ বা লক্ষণ খুঁজুন…')}" value="${esc(query)}"></div><div class="filter">${[['all', L('All crops', 'সব ফসল')], ...CROP_DATA.map(c => [c.id, A(c.name)])].map(([v, t]) => `<button data-filter="${v}" class="${filter === v ? 'active' : ''}" aria-pressed="${filter === v}">${t}</button>`).join('')}</div></div><div class="service-note">${icon('info')}<span>${L('Photos illustrate the crop. Symptoms can overlap; confirm suspected disease with a local expert.', 'ছবিগুলো ফসল বোঝায়। একাধিক রোগের লক্ষণ মিলতে পারে; স্থানীয় বিশেষজ্ঞের মাধ্যমে নিশ্চিত করুন।')}</span></div><div class="disease-grid" id="disease-grid">${diseaseCards()}</div>`;
}
function diseaseCards() {
  const ds = DISEASES.filter(d => (filter === 'all' || d.crop === filter) && [...d.name, ...d.symptom, ...cropOf(d).name].join(' ').toLowerCase().includes(query.toLowerCase()));
  return ds.length ? ds.map(d => `<article class="disease-card"><img src="assets/${d.image}" alt="${A(cropOf(d).name)} — ${L('crop illustration', 'ফসলের ছবি')}" loading="lazy"><div class="body"><span class="badge neutral">${A(cropOf(d).name)}</span><h3>${A(d.name)}</h3><p>${A(d.symptom)}</p><button class="link" data-disease="${d.id}">${L('Symptoms & care', 'লক্ষণ ও যত্ন')}${icon('arrow')}</button><div class="meta">${A(d.type)}</div></div></article>`).join('') : `<div class="empty"><h3>${L('No matching guides', 'মিল পাওয়া যায়নি')}</h3><p>${L('Try another crop or a shorter search.', 'অন্য ফসল বা ছোট শব্দ দিয়ে খুঁজুন।')}</p></div>`;
}
function reportRow(record, compact = false) {
  const d = DISEASES.find(x => x.id === record.disease);
  return `<div class="report-row"><span class="report-icon">${icon('file')}</span><div><h3>${A(d.name)} · ${A(cropOf(d).name)}</h3><small>${date(record.date)} · ${L('Saved observation', 'সংরক্ষিত পর্যবেক্ষণ')}</small></div><div class="actions"><button class="btn small light" data-report="${esc(record.id)}">${L('View', 'দেখুন')}</button>${compact ? '' : `<button class="btn small outline" data-export="${esc(record.id)}" aria-label="${L('Download report', 'রিপোর্ট ডাউনলোড')}">${icon('download')}</button><button class="btn small danger" data-delete="${esc(record.id)}" aria-label="${L('Delete report', 'রিপোর্ট মুছুন')}">${icon('trash')}</button>`}</div></div>`;
}
function reportsPage() {
  const counts = CROP_DATA.map(c => reports.filter(r => DISEASES.find(d => d.id === r.disease).crop === c.id).length);
  const max = Math.max(1, ...counts);
  return head(L('Your observation journal', 'আপনার পর্যবেক্ষণের খাতা'), L('Your saved notes and reference guides, organised in one place.', 'সংরক্ষিত নোট ও তথ্যের গাইড—গুছিয়ে এক জায়গায়।'), reports.length ? btn(L('Export all', 'সব ডাউনলোড'), 'export-all', 'outline', 'download') : '') + `<div class="service-note">${icon('shield')}<span>${L('Records stay in this browser. Photos are not saved. The chart counts your observations, not confirmed disease cases.', 'রেকর্ড এই ব্রাউজারে থাকে। ছবি সংরক্ষিত হয় না। চার্ট পর্যবেক্ষণের সংখ্যা দেখায়, নিশ্চিত রোগের সংখ্যা নয়।')}</span></div><div class="grid-main"><section class="panel"><div class="panel-head"><h2>${L('Saved reports', 'সংরক্ষিত রিপোর্ট')} <span class="muted">(${n(reports.length)})</span></h2><a class="link" href="#diagnose">${L('New observation', 'নতুন পর্যবেক্ষণ')} +</a></div>${reports.length ? reports.map(r => reportRow(r)).join('') : `<div class="empty">${icon('file')}<h3>${L('No observations saved yet', 'এখনো পর্যবেক্ষণ রাখা হয়নি')}</h3><p>${L('Open a crop guide, add your notes and save an observation.', 'ফসলের গাইড খুলে নোটসহ পর্যবেক্ষণ রাখুন।')}</p><a href="#diagnose" class="btn empty-action">${L('Start an observation', 'পর্যবেক্ষণ শুরু করুন')}${icon('arrow')}</a></div>`}</section><section class="panel"><div class="panel-head"><div><h2>${L('Observations by crop', 'ফসল অনুযায়ী পর্যবেক্ষণ')}</h2><p>${L('Calculated from your saved records', 'সংরক্ষিত রেকর্ড থেকে গণনা')}</p></div>${icon('chart')}</div><div class="chart" role="img" aria-label="${esc(CROP_DATA.map((c, i) => A(c.name) + ': ' + n(counts[i])).join(', '))}">${counts.map(v => `<div class="chart-col"><b>${n(v)}</b><div class="bar" style="height:${v / max * 105}px"></div></div>`).join('')}</div><div class="chart-labels">${CROP_DATA.map(c => `<span>${A(c.name)}</span>`).join('')}</div><div class="result-block"><h3>${L('Private by design', 'ডেটা আপনার ব্রাউজারেই')}</h3><p>${L('Export a copy before clearing browser data. Changing the browser or localhost address opens a separate history.', 'ব্রাউজারের ডেটা মোছার আগে কপি ডাউনলোড করুন। ব্রাউজার বা localhost ঠিকানা বদলালে আলাদা ইতিহাস দেখাবে।')}</p></div></section></div>`;
}
function researchPage() {
  const sources = [...new Map(DISEASES.map(d => [d.source, d])).values()];
  return head(L('Crop guides & trusted sources', 'ফসলের গাইড ও নির্ভরযোগ্য সূত্র'), L('A simple browser-based workflow for crop photos, reference guides and field notes.', 'ফসলের ছবি, তথ্যের গাইড ও মাঠের নোটের জন্য সহজ ব্রাউজারভিত্তিক ব্যবস্থা।')) + `
    <section class="panel section"><div class="panel-head"><div><h2>${L('How CropCare works', 'CropCare যেভাবে কাজ করে')}</h2><p>${L('A frontend-only flow that runs in your browser.', 'শুধু ফ্রন্টএন্ডের কাজ—আপনার ব্রাউজারেই চলে।')}</p></div>${icon('scan')}</div>
    <div class="pipeline">${[['camera', L('Add a photo', 'ছবি দিন'), L('Choose or capture', 'ছবি বাছুন বা তুলুন')], ['shield', L('Preview', 'প্রিভিউ'), L('Check the image', 'ছবি দেখে নিন')], ['book', L('Choose a guide', 'গাইড বাছুন'), L('Browse crop information', 'ফসলের তথ্য দেখুন')], ['search', L('Review symptoms', 'লক্ষণ মিলিয়ে দেখুন'), L('Read care guidance', 'পরিচর্যার তথ্য পড়ুন')], ['file', L('Save notes', 'নোট রাখুন'), L('Keep a field record', 'মাঠের রেকর্ড রাখুন')]].map(([i, t, s], index) => `<div class="pipeline-node"><span class="pipeline-step">${n(index + 1)}</span>${icon(i)}<h3>${t}</h3><small>${s}</small></div>`).join('')}</div>
    <div class="method-objectives">${[[L('Easy to use', 'সহজ ব্যবহার'), L('Find crop guides and care information in a few steps.', 'কয়েকটি ধাপেই ফসলের গাইড ও পরিচর্যার তথ্য খুঁজে নিন।')], [L('Keep observations', 'পর্যবেক্ষণ সংরক্ষণ'), L('Add notes, save records and export them from this browser.', 'নোট লিখুন, রেকর্ড রাখুন এবং এই ব্রাউজার থেকেই ডাউনলোড করুন।')], [L('Bilingual access', 'দ্বিভাষিক সুবিধা'), L('Switch between English and Bangla across the interface.', 'পুরো ইন্টারফেসে ইংরেজি ও বাংলার মধ্যে পরিবর্তন করুন।')]].map(([t, p]) => `<div><h3>${t}</h3><p>${p}</p></div>`).join('')}</div></section>
    <div class="section-head section"><h2>${L('Crop guide references', 'ফসলের গাইডের তথ্যসূত্র')}</h2><span class="muted">${L('External agricultural sources', 'বাইরের কৃষি-তথ্যসূত্র')}</span></div>
    <div class="research-list">${sources.map((d, i) => `<article class="research-item"><div class="research-index">${n(i + 1).padStart(lang === 'en' ? 2 : 1, '0')}</div><div><span class="badge neutral">${A(cropOf(d).name)} · ${A(d.type)}</span><h3>${A(d.name)}</h3><p>${A(d.symptom)}</p><a class="link" href="${d.source}" target="_blank" rel="noopener">${d.sourceName} ↗</a></div></article>`).join('')}</div>
    <p class="research-footnote">${L('CropCare provides educational reference information. Similar symptoms can have different causes; confirm suspected disease with a local agricultural expert.', 'CropCare শিক্ষামূলক তথ্যের গাইড দেয়। একই লক্ষণের ভিন্ন কারণ হতে পারে; স্থানীয় কৃষি বিশেষজ্ঞের মাধ্যমে নিশ্চিত করুন।')}</p>`;
}
function aboutPage() {
  return head(L('About CropCare', 'CropCare পরিচিতি'), L('A bilingual, browser-based space for crop care and field observations.', 'ফসলের যত্ন ও মাঠের পর্যবেক্ষণের জন্য দ্বিভাষিক ব্রাউজারভিত্তিক জায়গা।')) + `<section class="panel about-intro"><span class="eyebrow">${L('GROW WITH UNDERSTANDING', 'জেনে বুঝে ফসলের যত্ন')}</span><h2>${L('A practical path from photo to useful information', 'ছবি থেকে প্রয়োজনীয় তথ্য পাওয়ার সহজ পথ')}</h2><p class="muted">${L('CropCare is a frontend project built with HTML, CSS and JavaScript. It brings crop photographs, source-linked disease guides and field observations into one bilingual workspace. Photos are previewed locally; notes and saved records stay in this browser.', 'CropCare হলো HTML, CSS ও JavaScript দিয়ে তৈরি একটি ফ্রন্টএন্ড প্রজেক্ট। এখানে ফসলের ছবি, সূত্রসহ রোগের গাইড এবং মাঠের পর্যবেক্ষণ এক দ্বিভাষিক জায়গায় রাখা হয়েছে। ছবি স্থানীয়ভাবে দেখা হয়; নোট ও সংরক্ষিত রেকর্ড এই ব্রাউজারেই থাকে।')}</p><div class="architecture">${[['camera', L('Capture / upload', 'ছবি তোলা / আপলোড')], ['scan', L('Preview photo', 'ছবি দেখা')], ['book', L('Choose a guide', 'গাইড বাছাই')], ['file', L('Save observation', 'পর্যবেক্ষণ রাখা')]].map(([i, t], j) => `${j ? '<span>→</span>' : ''}<div>${icon(i)}${t}</div>`).join('')}</div></section>
    <section class="section"><div class="section-head"><h2>${L('The people behind CropCare', 'CropCare-এর দল')}</h2></div><div class="team">${[['SZ', 'Sunjida Zaman Shifa', L('Crop information & guidance', 'ফসলের তথ্য ও নির্দেশনা')], ['AR', 'Md. Aktaruzzaman Rifat', L('Interface & interactions', 'ইন্টারফেস ও ইন্টারঅ্যাকশন')], ['PP', 'Priyotosh Kumer Priyo', L('Frontend & documentation', 'ফ্রন্টএন্ড ও ডকুমেন্টেশন')]].map(([a, name, role]) => `<div class="panel"><span class="avatar">${a}</span><h3>${name}</h3><p>${role}</p></div>`).join('')}</div></section>
    <section class="panel section"><h2>${L('A few useful answers', 'কিছু প্রয়োজনীয় উত্তর')}</h2><div class="faq">${[[L('Does CropCare diagnose a disease from a photo?', 'CropCare কি ছবি দেখে রোগ নির্ণয় করে?'), L('No. CropCare is a frontend guide and observation tool. It previews your photo and opens the reference guide you choose; it does not automatically identify a disease from the image.', 'না। CropCare একটি ফ্রন্টএন্ড গাইড ও পর্যবেক্ষণের টুল। এটি আপনার ছবি প্রিভিউ করে এবং আপনার বেছে নেওয়া তথ্যের গাইড দেখায়; ছবি থেকে স্বয়ংক্রিয়ভাবে রোগ শনাক্ত করে না।')], [L('Can I use it without internet?', 'ইন্টারনেট ছাড়া ব্যবহার করতে পারব?'), L('Yes. The interface, crop guides, images and fonts are included in the project. Internet is only needed to open external agricultural source links.', 'হ্যাঁ। ইন্টারফেস, ফসলের গাইড, ছবি ও ফন্ট প্রজেক্টের সঙ্গে আছে। শুধু বাইরের কৃষি-তথ্যসূত্র খুলতে ইন্টারনেট লাগবে।')], [L('Where are my photos and records stored?', 'ছবি ও রেকর্ড কোথায় থাকে?'), L('Photo previews are temporary and stay on this device. Saved guides, notes, checklist progress and language preferences stay in this browser. Export your records before clearing browser data.', 'ছবির প্রিভিউ সাময়িক এবং এই ডিভাইসেই থাকে। গাইড, নোট, তালিকার অগ্রগতি ও ভাষা এই ব্রাউজারে থাকে। ডেটা মোছার আগে রেকর্ড ডাউনলোড করুন।')], [L('How do I control the animation?', 'অ্যানিমেশন নিয়ন্ত্রণ করব কীভাবে?'), L('Use the sparkle button beside the language switch to control interface animations; it respects your system’s reduced-motion setting.', 'ভাষার সুইচের পাশে তারার বোতামটি দিয়ে ইন্টারফেসের অ্যানিমেশন নিয়ন্ত্রণ করুন; এটি সিস্টেমের reduced-motion সেটিংও মেনে চলে।')]].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>`;
}
function render() {
  shell();
  const pages = { dashboard, diagnose, library, reports: reportsPage, research: researchPage, about: aboutPage };
  $('#main').innerHTML = `<div class="page-enter">${pages[route]()}</div>`;
  if (route === 'diagnose') bindUpload();
  document.dispatchEvent(new CustomEvent('cropcare:render'));
}
function closeNavigation() {
  $('#sidebar').classList.remove('open');
  $('[data-action="menu"]')?.setAttribute('aria-expanded', 'false');
}
function navigate() {
  const [page, param] = (location.hash.slice(1) || 'dashboard').split('/');
  route = navs.some(x => x[0] === page) ? page : 'dashboard';
  if (route === 'library') { filter = CROP_DATA.some(c => c.id === param) ? param : 'all'; query = ''; }
  analyzing = false; runId++; uploadId++; closeNavigation(); render(); window.scrollTo(0, 0);
}
function toast(text) {
  $('#toast').textContent = text; $('#toast').classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function openModal(title, body) {
  lastFocus = document.activeElement;
  $('#detail-content').innerHTML = `<div class="modal-head"><h2 id="dialog-title">${title}</h2><button data-action="close" aria-label="${L('Close dialog', 'ডায়ালগ বন্ধ করুন')}">${icon('close')}</button></div><div class="modal-body">${body}</div>`;
  $('#detail').setAttribute('aria-labelledby', 'dialog-title'); $('#detail').showModal();
}
function showDisease(id) {
  const d = DISEASES.find(x => x.id === id); if (!d) return;
  openModal(A(d.name), `<span class="badge neutral">${A(cropOf(d).name)} · ${A(d.type)}</span><h3>${L('Recognize the symptoms', 'লক্ষণ চিনুন')}</h3><p>${A(d.symptom)}</p><h3>${L('Care and prevention', 'যত্ন ও প্রতিরোধ')}</h3><ul>${d.care.map(x => `<li>${A(x)}</li>`).join('')}</ul><div class="notice">${icon('info')}${L('Similar symptoms can have different causes. Seek local confirmation before treatment.', 'একই লক্ষণের ভিন্ন কারণ হতে পারে। ব্যবস্থা নেওয়ার আগে স্থানীয়ভাবে নিশ্চিত করুন।')}</div><a class="link" href="${d.source}" target="_blank" rel="noopener">${d.sourceName} ↗</a>`);
}
function showReport(id) {
  const r = reports.find(x => x.id === id); if (!r) return;
  const d = DISEASES.find(x => x.id === r.disease);
  openModal(L('Saved observation', 'সংরক্ষিত পর্যবেক্ষণ'), `<span class="badge">${L('Selected reference guide', 'নির্বাচিত তথ্যের গাইড')}</span><p>${date(r.date)}</p><h3>${A(cropOf(d).name)} · ${A(d.name)}</h3><p>${A(d.symptom)}</p><ul>${d.care.map(x => `<li>${A(x)}</li>`).join('')}</ul>${r.note ? `<h3>${L('Your notes', 'আপনার নোট')}</h3><p class="saved-note">${esc(r.note)}</p>` : ''}<div class="service-note">${L('This record contains the reference guide you selected; it is not a confirmed diagnosis.', 'এই রেকর্ডে আপনার নির্বাচিত তথ্যের গাইড আছে; এটি নিশ্চিত রোগ নির্ণয় নয়।')}</div><a class="link" href="${d.source}" target="_blank" rel="noopener">${d.sourceName} ↗</a><div class="actions"><button class="btn" data-export="${esc(r.id)}">${L('Download report', 'রিপোর্ট ডাউনলোড')}${icon('download')}</button></div>`);
}
function releasePreview() { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }
function acceptFile(f) {
  if (!f) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { toast(L('Choose a JPG, PNG or WebP image.', 'JPG, PNG বা WebP ছবি বেছে নিন।')); return; }
  if (f.size > 10 * 1024 * 1024) { toast(L('This image exceeds the 10 MB limit.', 'ছবিটি ১০ মেগাবাইট সীমার বেশি।')); return; }
  const token = ++uploadId, url = URL.createObjectURL(f), img = new Image();
  img.onload = () => {
    if (token !== uploadId || route !== 'diagnose') { URL.revokeObjectURL(url); return; }
    if (img.width < 64 || img.height < 64) { URL.revokeObjectURL(url); toast(L('Choose an image at least 64 × 64 pixels.', 'অন্তত ৬৪ × ৬৪ পিক্সেলের ছবি দিন।')); return; }
    releasePreview(); preview = url; file = f; result = null; runId++; analyzing = false; render();
  };
  img.onerror = () => { URL.revokeObjectURL(url); if (token === uploadId) toast(L('This file could not be decoded as an image.', 'ফাইলটি ছবি হিসেবে পড়া যাচ্ছে না।')); };
  img.src = url;
}
function bindUpload() {
  ['image-input', 'camera-input'].forEach(id => $('#' + id).addEventListener('change', e => acceptFile(e.target.files[0])));
  const zone = $('#dropzone');
  ['dragover', 'dragenter'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', e => acceptFile(e.dataTransfer.files[0]));
}
async function analyze() {
  if (analyzing) return;
  if (!preview) { toast(L('Add a photo or use the sample first.', 'আগে ছবি দিন অথবা নমুনা ছবি ব্যবহার করুন।')); return; }
  const disease = selection, note = fieldNote.trim(), token = ++runId;
  analyzing = true; result = null; $('[data-action="analyze"]').disabled = true;
  $('#result-panel').innerHTML = `<h2>${L('Preparing your crop guide', 'ফসলের গাইড প্রস্তুত হচ্ছে')}</h2><div class="scan-box"><img src="${preview}" alt=""></div><div class="analysis-steps">${[L('Photo preview ready', 'ছবির প্রিভিউ প্রস্তুত'), L('Opening your selected reference', 'নির্বাচিত তথ্যের গাইড খোলা হচ্ছে'), L('Bringing your notes together', 'আপনার নোট যুক্ত হচ্ছে')].map((t, i) => `<div id="step-${i}"><span class="step-n">${n(i + 1)}</span>${t}</div>`).join('')}</div>`;
  for (let i = 0; i < 3; i++) { await new Promise(resolve => setTimeout(resolve, motionEnabled() ? 360 : 40)); if (token !== runId || route !== 'diagnose') return; $('#step-' + i)?.classList.add('done'); }
  result = { id: 'obs-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2)), disease, note, date: new Date().toISOString(), mode: 'guide' };
  analyzing = false; render();
}
function saveReport() {
  if (!result) return;
  if (reports.some(r => r.id === result.id)) { toast(L('This observation is already saved.', 'এই পর্যবেক্ষণ আগেই রাখা আছে।')); return; }
  reports = [{ ...result }, ...reports].slice(0, 100);
  const ok = safeStore.set('cc-observations-v2', reports); shell();
  toast(ok ? L('Observation saved on this device.', 'পর্যবেক্ষণ এই ডিভাইসে রাখা হয়েছে।') : L('Saved for this session; browser storage is unavailable.', 'এই সেশনে রাখা হয়েছে; ব্রাউজারের স্থায়ী স্টোরেজ পাওয়া যায়নি।'));
}
function downloadBlob(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type })), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportReport(r) {
  if (!r) return;
  const d = DISEASES.find(x => x.id === r.disease);
  downloadBlob(`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${L('CropCare — Field observation', 'CropCare — মাঠের পর্যবেক্ষণ')}</title><style>body{font:17px/1.8 system-ui,sans-serif;max-width:760px;margin:45px auto;padding:24px;color:#172033}h1{font-size:30px}small{color:#475569}.note{padding:16px;background:#eff6ff;border-radius:8px}li{margin:10px 0}a{overflow-wrap:anywhere}.user-note{white-space:pre-wrap}@media print{body{margin:0}}</style></head><body><small>${projectTitle()}</small><h1>CropCare BD</h1><h2>${L('Field observation', 'মাঠের পর্যবেক্ষণ')}</h2><small>${date(r.date)}</small><p class="note">${L('Reference guide selected by the user. No automatic image diagnosis was performed; this is not a confirmed diagnosis.', 'ব্যবহারকারীর নির্বাচিত তথ্যের গাইড। এটি স্বয়ংক্রিয় বা নিশ্চিত রোগ নির্ণয় নয়।')}</p><h2>${A(cropOf(d).name)} · ${A(d.name)}</h2><p>${A(d.symptom)}</p>${r.note ? `<h3>${L('Your field notes', 'আপনার পর্যবেক্ষণ')}</h3><p class="user-note">${esc(r.note)}</p>` : ''}<h3>${L('General care', 'সাধারণ পরিচর্যা')}</h3><ul>${d.care.map(x => `<li>${A(x)}</li>`).join('')}</ul><p>${L('Confirm suspected disease and local management with an agricultural expert.', 'সন্দেহজনক রোগ ও স্থানীয় ব্যবস্থাপনা কৃষি বিশেষজ্ঞের মাধ্যমে নিশ্চিত করুন।')}</p><p>${L('Source', 'সূত্র')}: <a href="${d.source}">${d.sourceName}</a></p><small>${L('Open in a browser and use Print → Save as PDF if needed.', 'প্রয়োজনে ব্রাউজারে খুলে Print → Save as PDF করুন।')}</small></body></html>`, 'CropCare-Observation-' + r.id.replace(/[^a-zA-Z0-9-]/g, '') + '.html', 'text/html;charset=utf-8');
  toast(L('Report downloaded. Open it to read or print.', 'রিপোর্ট ডাউনলোড হয়েছে। খুলে পড়ুন বা প্রিন্ট করুন।'));
}
document.addEventListener('click', event => {
  const el = event.target.closest('button,a'); if (!el) return;
  if (el.dataset.lang) { lang = el.dataset.lang; safeStore.set('cc-language', lang); analyzing = false; runId++; render(); return; }
  if (el.dataset.filter) { filter = el.dataset.filter; render(); return; }
  if (el.dataset.disease) { showDisease(el.dataset.disease); return; }
  if (el.dataset.report) { showReport(el.dataset.report); return; }
  if (el.dataset.export) { exportReport(reports.find(r => r.id === el.dataset.export)); return; }
  if (el.dataset.delete) { reports = reports.filter(r => r.id !== el.dataset.delete); safeStore.set('cc-observations-v2', reports); render(); toast(L('Observation removed.', 'পর্যবেক্ষণ মুছে ফেলা হয়েছে।')); return; }
  switch (el.dataset.action) {
    case 'menu': $('#sidebar').classList.toggle('open'); el.setAttribute('aria-expanded', String($('#sidebar').classList.contains('open'))); break;
    case 'motion': safeStore.set('cc-motion', !safeStore.get('cc-motion', true)); document.dispatchEvent(new CustomEvent('cropcare:motion')); el.setAttribute('aria-pressed', String(motionEnabled())); toast(motionEnabled() ? L('Motion effects on', 'অ্যানিমেশন চালু') : L('Motion effects off', 'অ্যানিমেশন বন্ধ')); break;
    case 'close': $('#detail').close(); break;
    case 'reset-tasks': tasks = [false, false, false]; safeStore.set('cc-tasks', tasks); $('#checklist').innerHTML = checklist(); break;
    case 'choose': $('#image-input').click(); break;
    case 'camera': $('#camera-input').click(); break;
    case 'sample': uploadId++; releasePreview(); file = null; preview = 'assets/leaf-demo.jpg'; selection = 'tomato-early'; result = null; runId++; analyzing = false; render(); toast(L('Sample photo loaded: tomato early blight.', 'নমুনা ছবি এসেছে: টমেটোর আর্লি ব্লাইট।')); break;
    case 'analyze': analyze(); break;
    case 'save': saveReport(); break;
    case 'download': exportReport(result); break;
    case 'export-all': downloadBlob(JSON.stringify({ project: 'CropCare BD', schema: 2, mode: 'guide', note: 'User-selected reference guides and observations, not confirmed diagnoses.', reports }, null, 2), 'CropCare-observations.json', 'application/json'); break;
  }
  if (el.closest('.nav') || (el.closest('#sidebar') && el.matches('a'))) closeNavigation();
});
document.addEventListener('change', event => {
  if (event.target.dataset.task !== undefined) { tasks[Number(event.target.dataset.task)] = event.target.checked; safeStore.set('cc-tasks', tasks); const activeTask = event.target.dataset.task; $('#checklist').innerHTML = checklist(); $(`[data-task="${activeTask}"]`)?.focus(); }
  if (event.target.id === 'scenario') { selection = event.target.value; result = null; runId++; analyzing = false; $('#result-panel').innerHTML = waitingHTML(); $('[data-action="analyze"]').disabled = false; }
});
document.addEventListener('input', event => {
  if (event.target.id === 'disease-search') { query = event.target.value; $('#disease-grid').innerHTML = diseaseCards(); }
  if (event.target.id === 'field-note') { fieldNote = event.target.value; if (result || analyzing) { result = null; runId++; analyzing = false; $('#result-panel').innerHTML = waitingHTML(); $('[data-action="analyze"]').disabled = false; } }
});
document.addEventListener('click', e => { if ($('#sidebar').classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('[data-action="menu"]')) closeNavigation(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#sidebar').classList.contains('open')) { closeNavigation(); $('[data-action="menu"]')?.focus(); } });
$('#detail').addEventListener('click', e => { if (e.target === $('#detail')) $('#detail').close(); });
$('#detail').addEventListener('close', () => lastFocus?.focus());
window.addEventListener('hashchange', navigate);
window.addEventListener('beforeunload', releasePreview);
navigate();
