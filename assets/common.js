const STORAGE_KEY = 'petconnect-ghpages-animal-library-v2';
const SEARCH_IMPORT_KEY = 'petconnect-ghpages-animal-imported-library-v2';
const LAST_MATCH_GALLERY_KEY = 'petconnect-ghpages-last-matches-v1';
const IMPACT_STATS_KEY = 'petconnect-ghpages-impact-stats-v1';
const FOUND_REPORTS_KEY = window.FOUND_REPORTS_KEY || 'petconnect-ghpages-found-reports-v1';
const PENDING_FOUND_REPORT_KEY = window.PENDING_FOUND_REPORT_KEY || 'petconnect-ghpages-pending-found-report-v1';
const STATS_SUMMARY_CACHE_KEY = 'petconnect-ghpages-stats-summary-cache-v1';
const PET_LANG_STORAGE_KEY = 'petAppLang';
const USER_LANG_STORAGE_KEY = 'userLanguage';
const LANG_STORAGE_KEY = 'appLanguage';
const LANG_STORAGE_ALIAS_KEY = 'appLang';
const LEGACY_LANG_STORAGE_KEY = 'petconnect-ui-lang-v1';

window.FOUND_REPORTS_KEY = window.FOUND_REPORTS_KEY || FOUND_REPORTS_KEY;
window.PENDING_FOUND_REPORT_KEY = window.PENDING_FOUND_REPORT_KEY || PENDING_FOUND_REPORT_KEY;
window.PENDING_IMAGE_KEY = window.PENDING_IMAGE_KEY || 'pendingImage';
window.STATS_SUMMARY_CACHE_KEY = window.STATS_SUMMARY_CACHE_KEY || STATS_SUMMARY_CACHE_KEY;
window.PETCONNECT_KEYS = Object.freeze({
  LIBRARY: STORAGE_KEY,
  SEARCH_IMPORT: SEARCH_IMPORT_KEY,
  LAST_MATCHES: LAST_MATCH_GALLERY_KEY,
  IMPACT_STATS: IMPACT_STATS_KEY,
  FOUND_REPORTS: window.FOUND_REPORTS_KEY,
  PENDING_FOUND_REPORT: window.PENDING_FOUND_REPORT_KEY,
  STATS_SUMMARY_CACHE: window.STATS_SUMMARY_CACHE_KEY,
  LANG: LANG_STORAGE_KEY,
  PET_LANG: PET_LANG_STORAGE_KEY,
  USER_LANG: USER_LANG_STORAGE_KEY,
  LANG_ALIAS: LANG_STORAGE_ALIAS_KEY,
  LANG_LEGACY: LEGACY_LANG_STORAGE_KEY,
});
const DEFAULT_BREEDS = Object.freeze({
  'כלב': ['לברדור', 'גולדן רטריבר', 'רועה גרמני', 'האסקי סיבירי', 'פומרניאן', 'שיצו', 'בוקסר', 'כנעני', 'מלינואה', 'יורקשייר טרייר'],
  'חתול': ['אירופאי קצר-שיער', 'חתול רחוב', 'פרסי', 'בריטי קצר-שיער', 'סיאמי', 'מיין קון', 'רגדול'],
  'סוס': ['ערבי', 'קוורטר', 'פריזיאן', 'אנדלוסי'],
  'ארנב': ['ננסי', 'הולנדי', 'אנגורה'],
  'תוכי': ['קוקטייל', 'ג׳אקו', 'דררה'],
});

function hashString(text) {
  const value = String(text || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function slugify(text) {
  const original = String(text || '').trim();
  const slug = original
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `animal-${hashString(original || 'entry')}`;
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function storageGet(storage, key, fallback = null) {
  try {
    const value = storage?.getItem?.(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function storageSet(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch {
    return false;
  }
}

function storageRemove(storage, key) {
  try {
    storage?.removeItem?.(key);
    return true;
  } catch {
    return false;
  }
}

function normalizeNumericArray(values) {
  if (!Array.isArray(values)) return [];
  const normalized = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return normalized.length ? normalized : [];
}

function normalizeVector(values) {
  const vector = normalizeNumericArray(values);
  if (!vector.length) return [];
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
  if (!norm) return vector;
  return vector.map((value) => value / norm);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clearValidityOnInput(field) {
  if (!field) return;
  const clear = () => field.setCustomValidity('');
  field.addEventListener('input', clear);
  field.addEventListener('change', clear);
}

function setRequiredValidity(field, message) {
  if (!field) return false;
  const value = field.type === 'file' ? (field.files?.length || 0) : String(field.value || '').trim();
  if (value) {
    field.setCustomValidity('');
    return true;
  }
  field.setCustomValidity(message);
  field.reportValidity();
  return false;
}

function isSafeProfileHref(value) {
  const href = String(value || '').trim();
  if (!href || href === '#') return true;
  return /^(https?:\/\/|\.\/?|\.\.\/|\/|#)/i.test(href);
}


function setButtonBusy(button, busy, busyText = 'טוען…') {
  if (!button) return;
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent || '';
    button.dataset.defaultHtml = button.innerHTML || '';
  }
  button.disabled = !!busy;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (busy) {
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${escapeHtml(busyText)}</span>`;
  } else {
    button.innerHTML = button.dataset.defaultHtml || escapeHtml(button.dataset.defaultText || button.textContent || '');
  }
}


function normalizeHebrewFuzzy(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'׳״`]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)תא(?=\s|$)/g, '$1תל אביב')
    .replace(/יפו-תל אביב|תל אביב-יפו/g, 'תל אביב יפו')
    .replace(/וו+/g, 'ו')
    .replace(/יי+/g, 'י')
    .trim();
}


function levenshteinDistance(left = '', right = '') {
  const a = normalizeHebrewFuzzy(left);
  const b = normalizeHebrewFuzzy(right);
  if (!a) return b.length;
  if (!b) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function fuzzySimilarity(left = '', right = '') {
  const a = normalizeHebrewFuzzy(left);
  const b = normalizeHebrewFuzzy(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const distance = levenshteinDistance(a, b);
  const longest = Math.max(a.length, b.length, 1);
  return Math.max(0, 1 - (distance / longest));
}

function fuzzyRankItems(items = [], query = '', limit = 12) {
  const cleanQuery = normalizeHebrewFuzzy(query);
  return items
    .map((item) => ({
      item,
      score: cleanQuery ? fuzzySimilarity(cleanQuery, item) : 1,
      starts: cleanQuery ? normalizeHebrewFuzzy(item).startsWith(cleanQuery) : true,
      includes: cleanQuery ? normalizeHebrewFuzzy(item).includes(cleanQuery) : true,
    }))
    .filter((row) => !cleanQuery || row.score >= 0.45 || row.includes)
    .sort((a, b) => (Number(b.starts) - Number(a.starts)) || (Number(b.includes) - Number(a.includes)) || (b.score - a.score) || String(a.item).localeCompare(String(b.item), 'he'))
    .slice(0, limit)
    .map((row) => row.item);
}

function getIsraeliCities() {
  return [
    'אבו גוש','אום אל-פחם','אופקים','אור יהודה','אור עקיבא','אילת','אלעד','אריאל','אשדוד','אשקלון','באר יעקב','באר שבע','בית שאן','בית שמש','ביתר עילית','בני ברק','בת ים','גבעת שמואל','גבעתיים','גדרה','גן יבנה','דימונה','הוד השרון','הרצליה','זכרון יעקב','חדרה','חולון','חיפה','טבריה','טייבה','טירה','טירת כרמל','יבנה','יהוד-מונוסון','ירוחם','ירושלים','יקנעם עילית','כפר יונה','כפר כנא','כפר סבא','כרמיאל','לוד','מבשרת ציון','מודיעין-מכבים-רעות','מגדל העמק','מזכרת בתיה','מעלה אדומים','מעלות-תרשיחא','נהריה','נס ציונה','נוף הגליל','נתיבות','נתניה','סחנין','עכו','עפולה','ערד','פתח תקווה','פרדס חנה-כרכור','צפת','קדימה-צורן','קצרין','קריית אונו','קריית אתא','קריית ביאליק','קריית גת','קריית ים','קריית מוצקין','קריית מלאכי','קריית שמונה','ראש העין','ראשון לציון','רהט','רחובות','רמלה','רמת גן','רמת השרון','רעננה','שדרות','שוהם','תל אביב-יפו'
  ];
}

function attachCityAutocomplete(input, datalistId = 'city-suggestions') {
  if (!input || typeof document === 'undefined') return;
  let datalist = document.getElementById(datalistId);
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = datalistId;
    document.body.appendChild(datalist);
  }
  input.setAttribute('list', datalistId);
  const cities = getIsraeliCities();
  const renderSuggestions = () => {
    const query = String(input.value || '').trim();
    const suggestions = fuzzyRankItems(cities, query, 12);
    datalist.innerHTML = suggestions.map((city) => `<option value="${escapeHtml(city)}"></option>`).join('');
  };
  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  renderSuggestions();
}

function inferAnimalTypeLabel(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (raw.includes('כלב') || lower.includes('dog')) return 'כלב';
  if (raw.includes('חת') || lower.includes('cat')) return 'חתול';
  if (raw.includes('סוס') || lower.includes('horse')) return 'סוס';
  if (raw.includes('ארנב') || lower.includes('rabbit')) return 'ארנב';
  if (raw.includes('תוכ') || lower.includes('parrot') || lower.includes('bird')) return 'תוכי';
  return raw;
}

function getBreedCatalog() {
  return DEFAULT_BREEDS;
}

function getBreedsForType(animalType = '') {
  const normalized = inferAnimalTypeLabel(animalType);
  return DEFAULT_BREEDS[normalized] || [];
}

function attachBreedAutocomplete(input, animalTypeSource = null, datalistId = 'breed-suggestions') {
  if (!input || typeof document === 'undefined') return;
  let datalist = document.getElementById(datalistId);
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = datalistId;
    document.body.appendChild(datalist);
  }
  input.setAttribute('list', datalistId);
  const resolveType = () => {
    if (!animalTypeSource) return '';
    if (typeof animalTypeSource === 'function') return animalTypeSource() || '';
    return animalTypeSource.value || '';
  };
  const renderSuggestions = () => {
    const query = String(input.value || '').trim();
    const directBreeds = getBreedsForType(resolveType());
    const fallbackBreeds = Object.values(DEFAULT_BREEDS).flat();
    const source = directBreeds.length ? directBreeds : fallbackBreeds;
    const suggestions = fuzzyRankItems(source, query, 12);
    datalist.innerHTML = suggestions.map((breed) => `<option value="${escapeHtml(breed)}"></option>`).join('');
  };
  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  if (animalTypeSource && animalTypeSource.addEventListener) {
    animalTypeSource.addEventListener('input', renderSuggestions);
    animalTypeSource.addEventListener('change', renderSuggestions);
  }
  renderSuggestions();
}

function formatReportedAt(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalizeAnswerText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function sha256Hex(value = '') {
  const normalized = normalizeAnswerText(value);
  if (!normalized) return '';
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyChallengeAnswer(entry = {}, answer = '') {
  const normalized = normalizeAnswerText(answer);
  if (!normalized) return false;
  const expected = String(entry.verificationAnswerHash || entry.verification_answer_hash || '').trim();
  if (!expected) return false;
  const actual = await sha256Hex(normalized);
  return actual === expected;
}

async function reverseGeocodeLatLng(lat, lng, language = 'he') {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    'accept-language': language,
    zoom: '18',
    addressdetails: '1',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) throw new Error(`שירות הכתובת החזיר ${response.status}`);
  const payload = await response.json();
  const address = payload?.address || {};
  const city = address.city || address.town || address.village || address.municipality || address.suburb || '';
  const road = [address.road, address.house_number].filter(Boolean).join(' ');
  const display = payload?.display_name || [road, city].filter(Boolean).join(', ');
  return {
    city: String(city || '').trim(),
    road: String(road || '').trim(),
    display: String(display || '').trim(),
  };
}

function loadImpactStats() {
  const parsed = safeJsonParse(localStorage.getItem(IMPACT_STATS_KEY), null);
  return {
    searches: Number(parsed?.searches || 0),
    strongMatches: Number(parsed?.strongMatches || 0),
    librariesExported: Number(parsed?.librariesExported || 0),
    karma: Number(parsed?.karma || 0),
    localAnimals: Number(loadLocalLibrary().length || 0),
    updatedAt: parsed?.updatedAt || null,
  };
}

function saveImpactStats(stats) {
  localStorage.setItem(IMPACT_STATS_KEY, JSON.stringify({
    searches: Number(stats?.searches || 0),
    strongMatches: Number(stats?.strongMatches || 0),
    librariesExported: Number(stats?.librariesExported || 0),
    karma: Number(stats?.karma || 0),
    updatedAt: new Date().toISOString(),
  }));
}

function recordImpactEvent(eventName, payload = {}) {
  const stats = loadImpactStats();
  if (eventName === 'search') { stats.searches += 1; stats.karma += 1; }
  if (eventName === 'strong-match') { stats.strongMatches += 1; stats.karma += 5; }
  if (eventName === 'export-library') { stats.librariesExported += 1; stats.karma += 2; }
  if (eventName === 'share-community') stats.karma += 2;
  if (eventName === 'poster') stats.karma += 1;
  saveImpactStats(stats);
  return { ...stats, localAnimals: Number(payload.localAnimals || loadLocalLibrary().length || 0) };
}

function getImpactBadges(stats = loadImpactStats()) {
  const badges = [];
  if (stats.searches >= 1) badges.push('תצפית ראשונה');
  if (stats.searches >= 5) badges.push('גיבורת שכונה');
  if (stats.strongMatches >= 1) badges.push('זיהוי מהיר');
  if (stats.strongMatches >= 5) badges.push('5 איחודים');
  if (stats.librariesExported >= 1) badges.push('מנהלת קטלוג');
  if (stats.karma >= 10) badges.push('לב זהב');
  if (stats.karma >= 25) badges.push('מתנדבת כוח');
  return badges;
}


function getConnectionProfile() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const effectiveType = String(conn?.effectiveType || '').toLowerCase();
  const saveData = Boolean(conn?.saveData);
  const downlink = Number(conn?.downlink || 0);
  const weak = saveData || ['slow-2g', '2g'].includes(effectiveType) || (effectiveType === '3g' && downlink > 0 && downlink < 1.1);
  return {
    effectiveType,
    saveData,
    downlink,
    weak,
    recommendedMaxWidth: weak ? 224 : 1200,
    recommendedQuality: weak ? 0.72 : 0.82,
    recommendedGrayscalePreview: weak,
    label: weak ? 'מצב חסכוני לגלישה חלשה' : 'מצב רגיל',
  };
}

async function requestNeighborhoodAlertsPermission() {
  if (!('Notification' in window)) return { supported: false, granted: false, state: 'unsupported' };
  if (Notification.permission === 'granted') return { supported: true, granted: true, state: 'granted' };
  const permission = await Notification.requestPermission();
  return { supported: true, granted: permission === 'granted', state: permission };
}

async function showLocalNeighborhoodAlert(payload = {}) {
  const permission = await requestNeighborhoodAlertsPermission();
  if (!permission.granted) return false;
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  const title = payload.title || 'התראת שכונה';
  const body = payload.body || 'דיווח חדש באזור שלך. פתחי את האתר כדי לראות פרטים.';
  const options = {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: payload.data || { url: './search.html' },
    tag: payload.tag || 'local-neighborhood-alert',
    renotify: true,
  };
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return true;
  }
  new Notification(title, options);
  return true;
}

function buildConnectionHint(profile = getConnectionProfile()) {
  if (profile.weak) return 'זוהתה רשת חלשה או מצב חיסכון בנתונים. התמונות ידחסו לגודל קטן יותר כדי שהחיפוש יישלח גם עם קליטה חלשה.';
  return 'החיפוש פועל במצב רגיל. אם הקליטה חלשה, אפשר לעבור ידנית למצב חסכוני.';
}

function buildFlyerText(payload = {}) {
  const parts = [
    'אבדה / נמצאה חיה',
    payload.bestMatch?.label ? `שם: ${payload.bestMatch.label}` : '',
    payload.bestMatch?.animalType ? `סוג: ${payload.bestMatch.animalType}` : '',
    payload.bestMatch?.breed ? `גזע: ${payload.bestMatch.breed}` : '',
    payload.city ? `עיר: ${payload.city}` : '',
    payload.locationText ? `אזור: ${payload.locationText}` : '',
    payload.reportedAt ? `דווח: ${formatReportedAt(payload.reportedAt)}` : '',
    payload.url ? `קישור: ${payload.url}` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

async function createCommunityFlyerDataUrl(payload = {}) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#131b39');
  gradient.addColorStop(1, '#6f4bff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(48, 48, width - 96, height - 96);
  ctx.fillStyle = '#fff';
  ctx.font = '800 72px Heebo, Assistant, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(payload.mode === 'found' ? 'נמצאה חיה' : 'מחפשים את החיה', width / 2, 120);

  const thumb = payload.bestMatch?.thumb || payload.thumb || '';
  if (thumb) {
    try {
      const img = await blobToImage(await (await fetch(thumb)).blob());
      const frameX = 120;
      const frameY = 180;
      const frameW = width - 240;
      const frameH = 650;
      ctx.fillStyle = '#0d1430';
      ctx.fillRect(frameX, frameY, frameW, frameH);
      const scale = Math.min(frameW / img.img.width, frameH / img.img.height);
      const drawW = img.img.width * scale;
      const drawH = img.img.height * scale;
      const dx = frameX + (frameW - drawW) / 2;
      const dy = frameY + (frameH - drawH) / 2;
      ctx.drawImage(img.img, dx, dy, drawW, drawH);
      img.cleanup?.();
    } catch (error) {
      // ignore image loading flyer failures
    }
  }

  ctx.textAlign = 'right';
  ctx.font = '700 42px Heebo, Assistant, sans-serif';
  const lines = [
    payload.bestMatch?.label ? `שם: ${payload.bestMatch.label}` : '',
    payload.bestMatch?.animalType ? `סוג: ${payload.bestMatch.animalType}` : '',
    payload.bestMatch?.breed ? `גזע: ${payload.bestMatch.breed}` : '',
    payload.locationText ? `אזור: ${payload.locationText}` : '',
    payload.city ? `עיר: ${payload.city}` : '',
    payload.url ? `קישור: ${payload.url}` : '',
  ].filter(Boolean);
  let y = 910;
  lines.forEach((line) => {
    ctx.fillText(line, width - 110, y);
    y += 58;
  });

  ctx.textAlign = 'center';
  ctx.font = '600 30px Heebo, Assistant, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('שתפי את הפלייר הזה בוואטסאפ, בטלגרם ובקבוצות שכונתיות', width / 2, height - 80);
  return canvas.toDataURL('image/png');
}

function downloadDataUrl(dataUrl, filename = 'petconnect-flyer.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function shareCommunityFlyer(payload = {}) {
  const dataUrl = await createCommunityFlyerDataUrl(payload);
  recordImpactEvent('share-community');
  if (navigator.share && navigator.canShare) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'petconnect-flyer.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'פלייר להצלה',
          text: buildFlyerText(payload),
          files: [file],
        });
        return { shared: true, dataUrl };
      }
    } catch (error) {
      // fall through to download
    }
  }
  downloadDataUrl(dataUrl, 'petconnect-flyer.png');
  return { shared: false, dataUrl };
}

async function openPrintablePoster(payload = {}) {
  const dataUrl = await createCommunityFlyerDataUrl(payload);
  const title = payload?.bestMatch?.label ? `פוסטר: ${payload.bestMatch.label}` : 'פוסטר חיה לאיתור';
  const details = [
    payload?.bestMatch?.animalType || '',
    payload?.bestMatch?.breed || '',
    payload?.bestMatch?.colors || payload?.bestMatch?.colorName || '',
    payload?.locationText || '',
  ].filter(Boolean).join(' · ');
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Assistant,Heebo,Arial,sans-serif;margin:0;padding:24px;background:#f4f5fb;color:#111}main{max-width:820px;margin:0 auto;background:#fff;border-radius:18px;padding:24px;box-shadow:0 18px 40px rgba(0,0,0,.12)}img{display:block;width:100%;max-width:760px;margin:0 auto 18px;border-radius:16px;border:1px solid #e5e7eb}h1{margin:0 0 8px;font-size:32px}p{margin:0 0 10px;line-height:1.6}.muted{color:#556}.bar{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.btn{border:0;border-radius:999px;padding:12px 18px;background:#6d4aff;color:#fff;font-weight:700;cursor:pointer}.btn.secondary{background:#e8eaf9;color:#1c2450}@media print{body{background:#fff;padding:0}main{box-shadow:none;border-radius:0;padding:0}.bar{display:none}}</style></head><body><main><h1>פוסטר איתור חיה</h1><p class="muted">${escapeHtml(details || 'שיתוף מהיר לקבוצות שכונתיות ולהדפסה')}</p><img src="${dataUrl}" alt="פוסטר"><div class="bar"><button class="btn" onclick="window.print()">הדפסה / שמירה כ-PDF</button><button class="btn secondary" onclick="window.close()">סגירה</button></div></main></body></html>`;
  const win = window.open('', '_blank', 'noopener');
  if (!win) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'petconnect-poster.png';
    a.click();
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

async function fetchSummaryStats(endpoint = './api/stats/summary') {
  const impact = loadImpactStats();
  if (/github\.io$/i.test(location.hostname) && (!endpoint || endpoint === './api/stats/summary')) {
    return {
      reunitedLast24h: Math.max(Number(impact.strongMatches || 0), Number(loadLastMatchGallery()?.matches?.length || 0)),
      localAnimals: Number(loadLocalLibrary().length || 0),
      searches: Number(impact.searches || 0),
      source: 'local',
    };
  }
  const fallback = {
    reunitedLast24h: Math.max(Number(impact.strongMatches || 0), Number(loadLastMatchGallery()?.matches?.length || 0)),
    localAnimals: Number(loadLocalLibrary().length || 0),
    searches: Number(impact.searches || 0),
    source: 'local',
  };
  try {
    const response = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error(`stats ${response.status}`);
    const payload = await response.json();
    const summary = {
      reunitedLast24h: Number(payload.reunited_last_24h ?? payload.reunitedLast24h ?? payload.reunions_last_24h ?? payload.reunions ?? 0),
      localAnimals: Number(payload.local_animals ?? payload.localAnimals ?? fallback.localAnimals),
      searches: Number(payload.searches ?? fallback.searches),
      updatedAt: payload.updated_at || payload.updatedAt || new Date().toISOString(),
      source: 'api',
    };
    localStorage.setItem(STATS_SUMMARY_CACHE_KEY, JSON.stringify(summary));
    return { ...fallback, ...summary };
  } catch (error) {
    const cached = safeJsonParse(localStorage.getItem(getStatsSummaryCacheKey()), null);
    if (cached) return { ...fallback, ...cached, source: 'cache' };
    return fallback;
  }
}

function setStatus(element, text, options = {}) {
  if (!element) return;
  const { tone = 'default', busy = false } = options;
  element.textContent = text;
  element.classList.remove('warn', 'success', 'busy');
  if (tone === 'warn') element.classList.add('warn');
  if (tone === 'success') element.classList.add('success');
  if (busy) element.classList.add('busy');
}

async function loadModels(statusEl) {
  if (!window.tf || !window.mobilenet) {
    throw new Error('ספריות TensorFlow.js או MobileNet לא נטענו. בדקי חיבור אינטרנט או חסימת CDN.');
  }
  if (window.__petconnectAnimalModel) {
    setStatus(statusEl, 'מודל החיפוש של בעלי החיים מוכן.', { tone: 'success' });
    return;
  }
  setStatus(statusEl, 'טוען את מודל החיפוש של בעלי החיים… בטעינה הראשונה זה עלול לקחת קצת זמן.', { busy: true });
  const model = await window.mobilenet.load({ version: 2, alpha: 1.0 });
  window.__petconnectAnimalModel = model;
  setStatus(statusEl, 'מודל החיפוש של בעלי החיים מוכן.', { tone: 'success' });
}
async function loadAnimalDetector(statusEl) {
  if (!window.cocoSsd) {
    throw new Error('ספריית הזיהוי coco-ssd לא נטענה. בדקי חיבור אינטרנט או חסימת CDN.');
  }
  if (window.__petconnectAnimalDetector) return window.__petconnectAnimalDetector;
  if (statusEl) setStatus(statusEl, 'טוען מנוע סריקה חכמה של חיות…', { busy: true });
  const model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
  window.__petconnectAnimalDetector = model;
  if (statusEl) setStatus(statusEl, 'מנוע הסריקה החכמה מוכן.', { tone: 'success' });
  return model;
}

const ANIMAL_CLASSES = new Set(['dog', 'cat', 'bird', 'horse', 'sheep', 'cow']);

function predictionToRect(source, prediction, paddingRatio = 0.1) {
  const [x, y, width, height] = Array.isArray(prediction?.bbox) ? prediction.bbox : [0, 0, 0, 0];
  const padX = width * paddingRatio;
  const padY = height * paddingRatio;
  return clampRectToImage(source, {
    x: x - padX,
    y: y - padY,
    width: width + (padX * 2),
    height: height + (padY * 2),
  });
}

function expandRectAroundCenter(img, rect, scaleX = 1.0, scaleY = 1.0, minWidthRatio = 0, minHeightRatio = 0) {
  if (!img || !rect) return null;
  const targetWidth = Math.max(rect.width * scaleX, img.width * minWidthRatio, 1);
  const targetHeight = Math.max(rect.height * scaleY, img.height * minHeightRatio, 1);
  const cx = rect.x + (rect.width / 2);
  const cy = rect.y + (rect.height / 2);
  return clampRectToImage(img, {
    x: cx - (targetWidth / 2),
    y: cy - (targetHeight / 2),
    width: targetWidth,
    height: targetHeight,
  });
}

function normalizeAnimalDetectionRect(source, prediction) {
  const className = String(prediction?.class || '').toLowerCase();
  const baseRect = predictionToRect(source, prediction, 0.12);
  if (!baseRect) return null;
  const imageArea = Math.max(1, (source?.width || 1) * (source?.height || 1));
  const rectArea = Math.max(1, baseRect.width * baseRect.height);
  const areaRatio = rectArea / imageArea;
  const tiny = areaRatio < 0.012 || baseRect.width < (source.width * 0.08) || baseRect.height < (source.height * 0.08);

  let rect = baseRect;
  let autoExpanded = false;
  if (className === 'dog' || className === 'cat') {
    if (tiny) {
      rect = expandRectAroundCenter(source, rect, 4.8, 4.8, 0.22, 0.22);
      autoExpanded = true;
    } else {
      rect = expandRectAroundCenter(source, rect, 1.5, 1.6, 0, 0);
      autoExpanded = rect.width > baseRect.width * 1.1 || rect.height > baseRect.height * 1.1;
    }
  } else if (ANIMAL_CLASSES.has(className)) {
    rect = tiny
      ? expandRectAroundCenter(source, rect, 3.8, 3.8, 0.18, 0.18)
      : expandRectAroundCenter(source, rect, 1.35, 1.4, 0, 0);
    autoExpanded = rect.width > baseRect.width * 1.1 || rect.height > baseRect.height * 1.1;
  }

  return {
    rect,
    areaRatio,
    tiny,
    autoExpanded,
    originalRect: baseRect,
  };
}

async function detectSubjects(source, options = {}) {
  const { minScore = 0.35 } = options;
  const model = await loadAnimalDetector();
  const predictions = await model.detect(source);
  const mapped = predictions
    .filter((item) => Number(item.score || 0) >= minScore)
    .map((item) => {
      const className = String(item.class || '').toLowerCase();
      const normalized = normalizeAnimalDetectionRect(source, { ...item, class: className });
      return {
        class: className,
        score: Number(item.score || 0),
        bbox: item.bbox || [0, 0, 0, 0],
        rect: normalized?.rect || predictionToRect(source, item),
        areaRatio: normalized?.areaRatio || 0,
        tiny: Boolean(normalized?.tiny),
        autoExpanded: Boolean(normalized?.autoExpanded),
        originalRect: normalized?.originalRect || null,
      };
    })
    .filter((item) => item.rect);
  return {
    raw: mapped,
    animals: mapped.filter((item) => ANIMAL_CLASSES.has(item.class)),
    people: mapped.filter((item) => item.class === 'person'),
  };
}

function rectIntersectionArea(left = null, right = null) {
  if (!left || !right) return 0;
  const x1 = Math.max(Number(left.x || 0), Number(right.x || 0));
  const y1 = Math.max(Number(left.y || 0), Number(right.y || 0));
  const x2 = Math.min(Number(left.x || 0) + Number(left.width || 0), Number(right.x || 0) + Number(right.width || 0));
  const y2 = Math.min(Number(left.y || 0) + Number(left.height || 0), Number(right.y || 0) + Number(right.height || 0));
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

function rectIoU(left = null, right = null) {
  const overlap = rectIntersectionArea(left, right);
  if (!overlap) return 0;
  const areaLeft = Math.max(1, Number(left.width || 0) * Number(left.height || 0));
  const areaRight = Math.max(1, Number(right.width || 0) * Number(right.height || 0));
  return overlap / Math.max(1, areaLeft + areaRight - overlap);
}

function pickBestAnimalDetection(detections) {
  const animals = Array.isArray(detections?.animals) ? detections.animals : [];
  const people = Array.isArray(detections?.people) ? detections.people : [];
  if (!animals.length) return null;
  return [...animals].sort((a, b) => {
    const areaA = (a.rect?.width || 0) * (a.rect?.height || 0);
    const areaB = (b.rect?.width || 0) * (b.rect?.height || 0);
    const personOverlapA = people.reduce((max, person) => Math.max(max, rectIoU(a.rect, person.rect)), 0);
    const personOverlapB = people.reduce((max, person) => Math.max(max, rectIoU(b.rect, person.rect)), 0);
    const qualityA = (a.score || 0) + Math.min(0.35, areaA / 120000) - (a.tiny ? 0.45 : 0) - (personOverlapA * 0.18);
    const qualityB = (b.score || 0) + Math.min(0.35, areaB / 120000) - (b.tiny ? 0.45 : 0) - (personOverlapB * 0.18);
    return qualityB - qualityA || areaB - areaA || (b.score - a.score);
  })[0];
}

async function blobToImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('לא ניתן היה להכין את התמונה.'));
      el.src = url;
    });
    return { img, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function fileToImage(file) {
  return blobToImage(file);
}

function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('לא ניתן היה לדחוס את התמונה.'));
    }, type, quality);
  });
}

async function fileToPreparedImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    type = 'image/jpeg',
    quality = 0.82,
  } = options;

  const initial = await fileToImage(file);
  const cleanupInitial = () => URL.revokeObjectURL(initial.url);
  try {
    const { img } = initial;
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    if (scale >= 0.999) {
      return {
        img,
        url: initial.url,
        cleanup: cleanupInitial,
        originalWidth: width,
        originalHeight: height,
        width,
        height,
        wasResized: false,
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, type, quality);
    const prepared = await blobToImage(blob);

    return {
      img: prepared.img,
      url: prepared.url,
      cleanup: () => {
        URL.revokeObjectURL(prepared.url);
        cleanupInitial();
      },
      originalWidth: width,
      originalHeight: height,
      width: canvas.width,
      height: canvas.height,
      wasResized: true,
    };
  } catch (error) {
    cleanupInitial();
    throw error;
  }
}


function prepareCanvasForEmbedding(source, options = {}) {
  const { size = 512, grayscale = true } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || size;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || size;
  const scale = Math.min(size / sourceWidth, size / sourceHeight);
  const drawWidth = Math.max(1, Math.round(sourceWidth * scale));
  const drawHeight = Math.max(1, Math.round(sourceHeight * scale));
  const dx = Math.round((size - drawWidth) / 2);
  const dy = Math.round((size - drawHeight) / 2);
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, dx, dy, drawWidth, drawHeight);

  if (grayscale) {
    const image = ctx.getImageData(0, 0, size, size);
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
      const normalized = Math.max(0, Math.min(255, Math.round(((luminance - 128) * 1.08) + 128)));
      data[i] = normalized;
      data[i + 1] = normalized;
      data[i + 2] = normalized;
    }
    ctx.putImageData(image, 0, 0);
  }
  return canvas;
}

function createCropCanvas(img, sx, sy, sw, sh) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function makeSquareThumb(img, rect = null, size = 320) {
  const sourceRect = rect ? clampRectToImage(img, rect) : { x: 0, y: 0, width: img.width, height: img.height };
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d1430';
  ctx.fillRect(0, 0, size, size);

  const scale = Math.min(size / sourceRect.width, size / sourceRect.height);
  const drawW = sourceRect.width * scale;
  const drawH = sourceRect.height * scale;
  const dx = (size - drawW) / 2;
  const dy = (size - drawH) / 2;
  ctx.drawImage(img, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, dx, dy, drawW, drawH);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function fullImageRect(img) {
  return { x: 0, y: 0, width: img.width, height: img.height };
}

function defaultSelectionRect(img) {
  const width = Math.max(80, img.width * 0.5);
  const height = Math.max(80, img.height * 0.5);
  return clampRectToImage(img, {
    x: (img.width - width) / 2,
    y: (img.height - height) / 2,
    width,
    height,
  });
}

function clampRectToImage(img, rect) {
  if (!img || !rect) return null;
  let x = Number(rect.x || 0);
  let y = Number(rect.y || 0);
  let width = Number(rect.width || 0);
  let height = Number(rect.height || 0);
  if (width < 1 || height < 1) return null;
  x = Math.max(0, Math.min(x, img.width - 1));
  y = Math.max(0, Math.min(y, img.height - 1));
  width = Math.max(1, Math.min(width, img.width - x));
  height = Math.max(1, Math.min(height, img.height - y));
  return { x, y, width, height };
}

function normalizeDragRect(img, startX, startY, currentX, currentY) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return clampRectToImage(img, { x, y, width, height });
}

function drawImageSelection(canvas, img, rect = null, options = {}) {
  const { showBox = true, overlay = true, label = 'אזור החיה' } = options;
  const ratio = Math.min(1, 900 / img.width);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (!showBox || !rect) return ratio;

  const sx = rect.x * ratio;
  const sy = rect.y * ratio;
  const sw = rect.width * ratio;
  const sh = rect.height * ratio;

  if (overlay) {
    ctx.save();
    ctx.fillStyle = 'rgba(11,16,32,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, sx, sy, sw, sh);
  }

  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 4;
  ctx.strokeRect(sx, sy, sw, sh);

  ctx.font = 'bold 16px Assistant, Heebo, Arial';
  const textWidth = ctx.measureText(label).width;
  const pillX = sx;
  const pillY = Math.max(4, sy - 28);
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(pillX, pillY, textWidth + 18, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, pillX + 9, pillY + 17);
  return ratio;
}

function imagePointFromEvent(canvas, img, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const pointX = (event.clientX - rect.left) * scaleX;
  const pointY = (event.clientY - rect.top) * scaleY;
  const ratio = Math.min(1, 900 / img.width);
  return {
    x: pointX / ratio,
    y: pointY / ratio,
  };
}

function cropRectToCanvas(img, rect = null) {
  const sourceRect = rect ? clampRectToImage(img, rect) : fullImageRect(img);
  return createCropCanvas(img, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
}

function cropRectToDataUrl(img, rect = null, size = 320) {
  const canvas = cropRectToCanvas(img, rect);
  const thumb = document.createElement('canvas');
  thumb.width = size;
  thumb.height = size;
  const ctx = thumb.getContext('2d');
  ctx.fillStyle = '#0d1430';
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / canvas.width, size / canvas.height);
  const drawW = canvas.width * scale;
  const drawH = canvas.height * scale;
  const dx = (size - drawW) / 2;
  const dy = (size - drawH) / 2;
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, drawW, drawH);
  return thumb.toDataURL('image/jpeg', 0.9);
}
function applyCircleMask(sourceCanvas, options = {}) {
  const { background = '#ffffff' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  const radius = Math.max(10, Math.min(canvas.width, canvas.height) / 2);
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();
  return canvas;
}

function cropRectToDataUrlMasked(img, rect = null, size = 320, maskShape = 'rect') {
  const canvas = cropRectToCanvas(img, rect);
  const working = maskShape === 'circle' ? applyCircleMask(canvas) : canvas;
  const thumb = document.createElement('canvas');
  thumb.width = size;
  thumb.height = size;
  const ctx = thumb.getContext('2d');
  ctx.fillStyle = '#f6f3ff';
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / working.width, size / working.height);
  const drawW = working.width * scale;
  const drawH = working.height * scale;
  const dx = (size - drawW) / 2;
  const dy = (size - drawH) / 2;
  ctx.drawImage(working, 0, 0, working.width, working.height, dx, dy, drawW, drawH);
  return thumb.toDataURL('image/jpeg', 0.92);
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

function cosineSimilarity(a, b) {
  const left = normalizeNumericArray(a);
  const right = normalizeNumericArray(b);
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i];
    normA += left[i] * left[i];
    normB += right[i] * right[i];
  }
  if (!normA || !normB) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

function histogramSimilarity(a, b) {
  const left = normalizeNumericArray(a);
  const right = normalizeNumericArray(b);
  if (!left.length || left.length !== right.length) return 0;
  let overlap = 0;
  for (let i = 0; i < left.length; i += 1) {
    overlap += Math.min(left[i], right[i]);
  }
  return Math.max(0, Math.min(1, overlap));
}

function similarityLabel(score) {
  if (score >= 0.85) return 'high';
  if (score >= 0.7) return 'medium';
  return 'low';
}

function rgbToHex(rgb) {
  const values = rgb.map((value) => Math.max(0, Math.min(255, Math.round(value))));
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

function describeColor(avgRgb) {
  const rgb = normalizeNumericArray(avgRgb);
  if (rgb.length < 3) return 'לא ידוע';
  const { h, s, l } = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  if (l < 0.12) return 'שחור';
  if (l > 0.88 && s < 0.18) return 'לבן';
  if (s < 0.16) return l < 0.5 ? 'אפור כהה' : 'אפור';
  if (h < 18 || h >= 345) return 'אדום';
  if (h < 42) return 'כתום';
  if (h < 62) return 'צהוב';
  if (h < 95) return 'ירוק';
  if (h < 160) return 'טורקיז';
  if (h < 250) return 'כחול';
  if (h < 300) return 'סגול';
  if (h < 345) return 'חום';
  return 'מעורב';
}

function extractColorProfile(source, options = {}) {
  const { binsPerChannel = 4, sampleSize = 64 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const bins = binsPerChannel ** 3;
  const histogram = new Array(bins).fill(0);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 20) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;
    const rb = Math.min(binsPerChannel - 1, Math.floor((r / 256) * binsPerChannel));
    const gb = Math.min(binsPerChannel - 1, Math.floor((g / 256) * binsPerChannel));
    const bb = Math.min(binsPerChannel - 1, Math.floor((b / 256) * binsPerChannel));
    const index = (rb * binsPerChannel * binsPerChannel) + (gb * binsPerChannel) + bb;
    histogram[index] += 1;
  }

  const normalizedHistogram = count ? histogram.map((value) => value / count) : histogram;
  const avgRgb = count ? [sumR / count, sumG / count, sumB / count] : [127, 127, 127];
  return {
    histogram: normalizedHistogram,
    avgRgb,
    avgHex: rgbToHex(avgRgb),
    colorName: describeColor(avgRgb),
  };
}

async function extractAnimalEmbedding(source) {
  if (!window.__petconnectAnimalModel) {
    throw new Error('מודל בעלי החיים עדיין לא נטען.');
  }
  const cleanCanvas = prepareCanvasForEmbedding(source, { size: 512, grayscale: true });
  const tensor = window.tf.tidy(() => {
    const inferred = window.__petconnectAnimalModel.infer(cleanCanvas, true);
    return inferred.flatten();
  });
  try {
    const data = Array.from(await tensor.data());
    return normalizeVector(data);
  } finally {
    tensor.dispose();
  }
}

async function extractAnimalFeatures(source) {
  const embedding = await extractAnimalEmbedding(source);
  const colorProfile = extractColorProfile(source);
  return {
    embedding,
    colorHistogram: colorProfile.histogram,
    avgRgb: colorProfile.avgRgb,
    avgHex: colorProfile.avgHex,
    colorName: colorProfile.colorName,
  };
}

function buildEnrollmentRects(img) {
  const full = fullImageRect(img);
  const center = clampRectToImage(img, {
    x: img.width * 0.14,
    y: img.height * 0.12,
    width: img.width * 0.72,
    height: img.height * 0.72,
  });
  const lowerCenter = clampRectToImage(img, {
    x: img.width * 0.2,
    y: img.height * 0.28,
    width: img.width * 0.6,
    height: img.height * 0.58,
  });
  const square = (() => {
    const side = Math.min(img.width, img.height) * 0.72;
    return clampRectToImage(img, {
      x: (img.width - side) / 2,
      y: (img.height - side) / 2,
      width: side,
      height: side,
    });
  })();

  const rects = [full, center, lowerCenter, square].filter(Boolean);
  const unique = [];
  rects.forEach((rect) => {
    const key = `${Math.round(rect.x)}:${Math.round(rect.y)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (!unique.some((item) => item.key === key)) unique.push({ key, rect });
  });
  return unique.map((item) => item.rect);
}

async function extractAnimalFeaturesForEnrollment(img) {
  const rects = buildEnrollmentRects(img);
  const embeddings = [];
  const colorHistograms = [];
  let previewRect = rects[0] || fullImageRect(img);

  for (const rect of rects) {
    const canvas = cropRectToCanvas(img, rect);
    const features = await extractAnimalFeatures(canvas);
    embeddings.push(features.embedding);
    colorHistograms.push(features.colorHistogram);
    if (rect !== fullImageRect(img)) previewRect = rect;
  }

  const preview = cropRectToDataUrl(img, previewRect);
  const baseColor = extractColorProfile(cropRectToCanvas(img, previewRect));
  return {
    embeddings,
    colorHistograms,
    preview,
    avgRgb: baseColor.avgRgb,
    avgHex: baseColor.avgHex,
    colorName: baseColor.colorName,
  };
}

function normalizeEntry(entry) {
  const descriptors = Array.isArray(entry.descriptors || entry.embeddings)
    ? (entry.descriptors || entry.embeddings).map((descriptor) => normalizeVector(descriptor)).filter((descriptor) => descriptor.length)
    : [];
  const colorHistograms = Array.isArray(entry.color_histograms || entry.colorHistograms)
    ? (entry.color_histograms || entry.colorHistograms).map((histogram) => normalizeNumericArray(histogram)).filter((histogram) => histogram.length)
    : [];
  const avgRgb = normalizeNumericArray(entry.avg_rgb || entry.avgRgb || entry.palette).slice(0, 3);
  const colorName = String(entry.color_name || entry.colorName || describeColor(avgRgb)).trim() || 'מעורב';
  const avgHex = String(entry.avg_hex || entry.avgHex || rgbToHex(avgRgb.length ? avgRgb : [127, 127, 127])).trim();

  return {
    id: entry.id || slugify(entry.label || 'רשומה'),
    label: String(entry.label || 'ללא שם').trim() || 'ללא שם',
    animalType: String(entry.animal_type || entry.animalType || '').trim(),
    breed: String(entry.breed || entry.animal_breed || '').trim(),
    colors: String(entry.colors || '').trim(),
    href: isSafeProfileHref(entry.href) ? (String(entry.href || '').trim() || '#') : '#',
    thumb: String(entry.thumb || '').trim(),
    notes: String(entry.notes || '').trim(),
    verificationPrompt: String(entry.verification_prompt || entry.verificationPrompt || '').trim(),
    verificationAnswerHash: String(entry.verification_answer_hash || entry.verificationAnswerHash || '').trim(),
    descriptors,
    colorHistograms,
    avgRgb: avgRgb.length ? avgRgb : [127, 127, 127],
    avgHex,
    colorName,
    source: entry.source || 'repo',
  };
}

function bestEntryMatch(queryFeatures, entry) {
  const descriptors = entry.descriptors || [];
  const colorHistograms = entry.colorHistograms || entry.color_histograms || entry.colorHistograms || [];
  let bestEmbeddingScore = 0;
  let bestColorScore = 0;
  for (let i = 0; i < descriptors.length; i += 1) {
    const embeddingScore = cosineSimilarity(queryFeatures.embedding, descriptors[i]);
    const colorScore = histogramSimilarity(queryFeatures.colorHistogram, colorHistograms[i] || colorHistograms[0] || []);
    if (embeddingScore > bestEmbeddingScore || (Math.abs(embeddingScore - bestEmbeddingScore) < 0.0001 && colorScore > bestColorScore)) {
      bestEmbeddingScore = embeddingScore;
      bestColorScore = colorScore;
    }
  }
  if (!descriptors.length) {
    bestColorScore = histogramSimilarity(queryFeatures.colorHistogram, colorHistograms[0] || []);
  }
  return {
    embeddingScore: bestEmbeddingScore,
    colorScore: bestColorScore,
  };
}

function composeVisualScore({ embeddingScore = 0, colorScore = 0, breedScore = 0, typeBoost = 0, hasBreed = false } = {}) {
  const vectorWeight = hasBreed ? 0.72 : 0.8;
  const colorWeight = hasBreed ? 0.18 : 0.2;
  const breedWeight = hasBreed ? 0.10 : 0.0;
  const compositeBase = (embeddingScore * vectorWeight) + (colorScore * colorWeight) + (breedScore * breedWeight);
  return {
    compositeBase,
    score: Math.min(0.999, compositeBase + typeBoost),
  };
}

function computeSearchResults(queryFeatures, library, options = {}) {
  const minScore = Math.max(0, Math.min(1, Number(options.minScore ?? 0.55)));
  const queryAnimalType = inferAnimalTypeLabel(options.queryAnimalType || '');
  const queryBreed = String(options.queryBreed || '').trim();
  const normalizedQueryBreed = normalizeHebrewFuzzy(queryBreed);

  const visualMatches = library
    .map((entry) => {
      const match = bestEntryMatch(queryFeatures, entry);
      const entryBreed = String(entry.breed || '').trim();
      const breedScore = normalizedQueryBreed ? fuzzySimilarity(normalizedQueryBreed, entryBreed) : 0;
      const typeBoost = queryAnimalType && inferAnimalTypeLabel(entry.animalType) === queryAnimalType ? 0.04 : 0;
      const composed = composeVisualScore({
        embeddingScore: match.embeddingScore,
        colorScore: match.colorScore,
        breedScore,
        typeBoost,
        hasBreed: Boolean(normalizedQueryBreed),
      });
      return {
        ...entry,
        score: composed.score,
        compositeScore: composed.score,
        compositeBase: composed.compositeBase,
        embeddingScore: match.embeddingScore,
        rawScore: match.embeddingScore,
        structureScore: match.embeddingScore,
        colorScore: match.colorScore,
        breedScore,
        typeBoost,
        breedBoost: normalizedQueryBreed ? Math.max(0, composed.score - composed.compositeBase - typeBoost) : 0,
        confidence: similarityLabel(composed.score),
        matchKind: 'visual',
      };
    })
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  if (visualMatches.length) {
    return { kind: 'visual', matches: visualMatches };
  }

  const colorMatches = library
    .map((entry) => {
      const colorCandidates = entry.colorHistograms?.length ? entry.colorHistograms : [[]];
      let colorScore = Math.max(...colorCandidates.map((histogram) => histogramSimilarity(queryFeatures.colorHistogram, histogram)));
      const entryBreed = String(entry.breed || '').trim();
      const breedScore = normalizedQueryBreed ? fuzzySimilarity(normalizedQueryBreed, entryBreed) : 0;
      const typeBoost = queryAnimalType && inferAnimalTypeLabel(entry.animalType) === queryAnimalType ? 0.05 : 0;
      colorScore = Math.min(0.999, colorScore + typeBoost + (normalizedQueryBreed ? breedScore * 0.08 : 0));
      return {
        ...entry,
        score: colorScore,
        compositeScore: colorScore,
        colorScore,
        breedScore,
        typeBoost,
        breedBoost: normalizedQueryBreed ? breedScore * 0.08 : 0,
        confidence: similarityLabel(colorScore),
        matchKind: 'color',
      };
    })
    .sort((a, b) => b.colorScore - a.colorScore)
    .slice(0, 18);

  return { kind: 'color', matches: colorMatches };
}

async function loadRepoLibrary() {
  try {
    const response = await fetch('./data/library.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`קובץ library.json החזיר שגיאה ${response.status}`);
    const data = await response.json();
    return Array.isArray(data.entries) ? data.entries : [];
  } catch (error) {
    console.warn(error);
    return [];
  }
}

function loadLocalLibrary() {
  const data = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(data) ? data : [];
}

function saveLocalLibrary(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadImportedLibrary() {
  const data = safeJsonParse(sessionStorage.getItem(SEARCH_IMPORT_KEY), []);
  return Array.isArray(data) ? data : [];
}

function saveImportedLibrary(entries) {
  sessionStorage.setItem(SEARCH_IMPORT_KEY, JSON.stringify(entries));
}

async function getMergedLibrary() {
  const repo = (await loadRepoLibrary()).map((entry) => normalizeEntry({ ...entry, source: 'repo' }));
  const local = loadLocalLibrary().map((entry) => normalizeEntry({ ...entry, source: 'local' }));
  const imported = loadImportedLibrary().map((entry) => normalizeEntry({ ...entry, source: 'imported' }));
  return [...repo, ...local, ...imported].filter((entry) => entry.descriptors.length || entry.colorHistograms.length);
}

function exportJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatEntryCount(count) {
  return `ספריית החיפוש נטענה: ${count} ${count === 1 ? 'רשומת חיה' : 'רשומות חיה'}.`;
}

function formatSampleCount(count) {
  return `${count} ${count === 1 ? 'דוגמה' : 'דוגמאות'}`;
}

function sourceLabel(source) {
  const map = {
    repo: 'מהמאגר',
    local: 'מקומי',
    imported: 'מיובא',
  };
  return map[source] || source || 'לא ידוע';
}

function formatCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function buildMunicipalReportHref({ city = '', locationText = '', reportedAt = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const cleanCity = String(city || '').trim();
  const cleanLocation = String(locationText || '').trim();
  const cleanReportedAt = formatReportedAt(reportedAt);
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const subjectCity = cleanCity || 'עיר לא צוינה';
  const lines = [
    'שלום,',
    '',
    'ברצוני לדווח על בעל חיים שנבדק מול המאגר באתר.',
  ];
  if (cleanReportedAt) lines.push(`שעת הדיווח האוטומטית: ${cleanReportedAt}.`);
  if (cleanLocation) lines.push(`כתובת/אזור משוער שנמשכו אוטומטית: ${cleanLocation}.`);
  if (bestMatch) {
    lines.push(`התאמה מובילה במאגר: ${bestMatch.label} (${formatPct(bestMatch.score)}).`);
    if (bestMatch.animalType) lines.push(`סוג בעל החיים: ${bestMatch.animalType}.`);
    if (bestMatch.breed) lines.push(`גזע משוער/מדווח: ${bestMatch.breed}.`);
    if (bestMatch.colors || bestMatch.colorName) lines.push(`צבעים דומיננטיים: ${bestMatch.colors || bestMatch.colorName}.`);
  }
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) {
    lines.push(`מיקום משוער: ${formatCoordinates(blurred.lat, blurred.lng)} (רדיוס פרטי של כ-${blurred.radiusMeters} מטר)`);
    lines.push(`מפת גוגל: https://www.google.com/maps?q=${blurred.lat},${blurred.lng}`);
  }
  lines.push(`עמוד החיפוש: ${pageUrl}`);
  lines.push('הערה: התמונה עצמה אינה מצורפת אוטומטית להודעה.');
  const params = new URLSearchParams({
    subject: `דיווח על בעל חיים - מוקד 106 - ${subjectCity}`,
    body: lines.join('\n'),
  });
  return `mailto:?${params.toString()}`;
}


function buildWhatsAppHref({ city = '', locationText = '', reportedAt = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const parts = ['שלום, מצאתי בעל חיים ואני בודק התאמה דרך פאטקונקט.'];
  const cleanLocation = String(locationText || '').trim();
  const cleanReportedAt = formatReportedAt(reportedAt);
  if (bestMatch) {
    parts.push(`נראית התאמה אפשרית ל-${bestMatch.label} (${formatPct(bestMatch.score || bestMatch.colorScore || 0)}).`);
    if (bestMatch.animalType) parts.push(`סוג: ${bestMatch.animalType}.`);
    if (bestMatch.breed) parts.push(`גזע: ${bestMatch.breed}.`);
    if (bestMatch.colors || bestMatch.colorName) parts.push(`צבעים: ${bestMatch.colors || bestMatch.colorName}.`);
    if (bestMatch.href && bestMatch.href !== '#') parts.push(`פרופיל: ${new URL(bestMatch.href, pageUrl).href}`);
  }
  if (city) parts.push(`עיר: ${city}.`);
  if (cleanLocation) parts.push(`אזור: ${cleanLocation}.`);
  if (cleanReportedAt) parts.push(`זמן דיווח: ${cleanReportedAt}.`);
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) parts.push(`אזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}.`);
  parts.push(`עמוד החיפוש: ${pageUrl}`);
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`;
}

function buildCommunityWatchHref({ city = '', locationText = '', reportedAt = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const blurred = privacyBlurCoordinates(lat, lng, 120);
  const parts = ['שלום לכולם, נדרשת עזרה באיתור בעל חיים דרך פאטקונקט.'];
  if (bestMatch) {
    parts.push(`נמצאה התאמה אפשרית ל-${bestMatch.label} (${formatPct(bestMatch.score || bestMatch.colorScore || 0)}).`);
    if (bestMatch.animalType) parts.push(`סוג: ${bestMatch.animalType}.`);
    if (bestMatch.breed) parts.push(`גזע: ${bestMatch.breed}.`);
    if (bestMatch.colors || bestMatch.colorName) parts.push(`צבעים בולטים: ${bestMatch.colors || bestMatch.colorName}.`);
  }
  if (city) parts.push(`עיר: ${city}.`);
  if (locationText) parts.push(`אזור: ${locationText}.`);
  if (reportedAt) parts.push(`זמן דיווח: ${formatReportedAt(reportedAt)}.`);
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) parts.push(`אזור משוער במפה: ${formatCoordinates(blurred.lat, blurred.lng)}.`);
  parts.push(`עמוד החיפוש/הדיווח: ${pageUrl}`);
  parts.push('מי שמזהה — שיצור קשר דרך הקישור או דרך בעלת החיה. תודה!');
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`;
}

async function shareResult({ city = '', locationText = '', reportedAt = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const shareUrl = bestMatch?.href && bestMatch.href !== '#'
    ? new URL(bestMatch.href, pageUrl).href
    : pageUrl;
  const lines = ['התאמה אפשרית מפאטקונקט'];
  const cleanLocation = String(locationText || '').trim();
  const cleanReportedAt = formatReportedAt(reportedAt);
  if (bestMatch) {
    lines.push(`${bestMatch.label} (${formatPct(bestMatch.score || bestMatch.colorScore || 0)})`);
    if (bestMatch.animalType) lines.push(`סוג: ${bestMatch.animalType}`);
    if (bestMatch.breed) lines.push(`גזע: ${bestMatch.breed}`);
  }
  if (city) lines.push(`עיר: ${city}`);
  if (cleanLocation) lines.push(`אזור: ${cleanLocation}`);
  if (cleanReportedAt) lines.push(`זמן דיווח: ${cleanReportedAt}`);
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) lines.push(`אזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}`);
  const text = lines.join(' · ');
  if (navigator.share) {
    try {
      await navigator.share({
        title: bestMatch ? `התאמה אפשרית ל-${bestMatch.label}` : 'פאטקונקט',
        text,
        url: shareUrl,
      });
      return true;
    } catch (error) {
      if (error?.name !== 'AbortError') console.warn('שיתוף נכשל:', error);
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      return true;
    }
  } catch (error) {
    console.warn('העתקה ללוח נכשלה:', error);
  }
  return false;
}


function pickTopMatchesForGallery(bundle, limit = 3) {
  const matches = Array.isArray(bundle?.matches) ? bundle.matches.slice(0, limit) : [];
  return matches.map((match) => ({
    label: String(match.label || 'ללא שם'),
    score: Number(match.score || match.colorScore || 0),
    colorScore: Number(match.colorScore || 0),
    animalType: String(match.animalType || ''),
    breed: String(match.breed || ''),
    colors: String(match.colors || match.colorName || ''),
    source: String(match.source || ''),
    href: String(match.href || '#'),
    thumb: String(match.thumb || ''),
    notes: String(match.notes || ''),
    confidence: String(match.confidence || 'low'),
  }));
}

function saveLastMatchGallery(bundle, meta = {}) {
  try {
    const matches = pickTopMatchesForGallery(bundle, 3);
    if (!matches.length) {
      localStorage.removeItem(LAST_MATCH_GALLERY_KEY);
      return;
    }
    localStorage.setItem(LAST_MATCH_GALLERY_KEY, JSON.stringify({
      kind: String(bundle?.kind || 'visual'),
      timestamp: new Date().toISOString(),
      city: String(meta.city || ''),
      pageUrl: String(meta.pageUrl || window.location.href),
      matches,
    }));
  } catch (error) {
    console.warn('שמירת גלריית ההתאמות נכשלה:', error);
  }
}

function loadLastMatchGallery() {
  const parsed = safeJsonParse(localStorage.getItem(LAST_MATCH_GALLERY_KEY), null);
  if (!parsed || !Array.isArray(parsed.matches)) return null;
  parsed.matches = parsed.matches.filter((match) => match && match.label);
  return parsed.matches.length ? parsed : null;
}

function clearLastMatchGallery() {
  try {
    localStorage.removeItem(LAST_MATCH_GALLERY_KEY);
  } catch (error) {
    console.warn('ניקוי גלריית ההתאמות נכשל:', error);
  }
}

function privacyBlurCoordinates(lat, lng, radiusMeters = 100) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { lat: null, lng: null, radiusMeters };
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const angle = (Math.abs(Math.sin(lat + lng)) * Math.PI * 2) % (Math.PI * 2);
  const offset = radiusMeters * 0.65;
  return {
    lat: lat + ((Math.sin(angle) * offset) / metersPerDegreeLat),
    lng: lng + ((Math.cos(angle) * offset) / Math.max(1, metersPerDegreeLng)),
    radiusMeters,
  };
}


function shrinkImage(file, options = {}) {
  const profile = options.connectionProfile || getConnectionProfile();
  const autoMax = profile.weak ? 224 : 1200;
  const autoQuality = profile.weak ? 0.72 : 0.80;
  return fileToPreparedImage(file, {
    maxWidth: Number(options.maxWidth || autoMax),
    maxHeight: Number(options.maxHeight || autoMax),
    quality: Number(options.quality || autoQuality),
    type: options.type || 'image/jpeg',
  });
}

function renderMatchCards(matches = [], options = {}) {
  const kind = options.kind || 'visual';
  return matches.map((match, index) => {
    const target = match.href && match.href !== '#' ? match.href : '';
    const safeLabel = escapeHtml(String(match.label || 'ללא שם'));
    const safeNotes = escapeHtml(String(match.notes || ''));
    const animalType = match.animalType ? `<span class="badge">${escapeHtml(match.animalType)}</span>` : '';
    const breed = match.breed ? `<span class="badge">${escapeHtml(match.breed)}</span>` : '';
    const colors = match.colors ? `<span class="badge">${escapeHtml(match.colors)}</span>` : (match.colorName ? `<span class="badge">${escapeHtml(match.colorName)}</span>` : '');
    const notes = match.notes ? `<div class="small">${safeNotes}</div>` : '';
    const thumb = match.thumb
      ? `<div class="thumb-wrap blur-shell"><img class="pet-result-avatar blur-up is-loading" loading="lazy" decoding="async" onload="this.classList.remove('is-loading')" src="${match.thumb}" alt="${safeLabel}"></div>`
      : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
    const score = kind === 'visual' ? Number(match.score || 0) : Number(match.colorScore || match.score || 0);
    const scoreText = kind === 'visual' ? `${Math.round(score * 100)}% התאמה` : `צבע ${Math.round(score * 100)}%`;
    const reason = kind === 'visual' ? 'התאמה מיידית מהסריקה' : 'תוצאת גיבוי לפי צבעים דומים';
    const breakdown = kind === 'visual'
      ? `<div class="small muted">הטמעה/מבנה ${Math.round(Number(match.embeddingScore || match.rawScore || 0) * 100)}% · צבע פרווה ${Math.round(Number(match.colorScore || 0) * 100)}%${Number(match.breedScore || 0) ? ` · גזע ${Math.round(Number(match.breedScore || 0) * 100)}%` : ''}</div>`
      : '';
    const profileButton = target ? `<a class="button-link small" href="${escapeHtml(target)}">פתיחת פרופיל</a>` : '<span class="badge">אין קישור פרופיל</span>';
    const verifyButton = match.verificationPrompt ? `<button class="secondary small" type="button" data-verify-index="${index}">בדיקת סימן זיהוי</button>` : '';
    return `
      <article class="match-card result-card" data-match-index="${index}">
        ${thumb}
        <div class="body">
          <div class="space-between">
            <strong>${safeLabel}</strong>
            <span class="score-pill ${escapeHtml(String(match.confidence || 'low'))}">${scoreText}</span>
          </div>
          <div class="row">
            ${animalType}
            ${breed}
            ${colors}
            ${match.source ? `<span class="badge">${sourceLabel(match.source)}</span>` : ''}
            ${match.verificationPrompt ? '<span class="badge">כולל סימן זיהוי</span>' : ''}
          </div>
          <div class="small">${reason}</div>
          ${breakdown}
          ${notes}
          <div class="card-actions">${profileButton}${verifyButton}</div>
        </div>
      </article>`;
  }).join('');
}


function vibrateIfPossible(pattern = 24) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch (error) { console.warn('vibrate failed', error); }
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad((lat2 || 0) - (lat1 || 0));
  const dLng = toRad((lng2 || 0) - (lng1 || 0));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1 || 0)) * Math.cos(toRad(lat2 || 0)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearbyFoundReports(lat, lng, maxKm = 2) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return loadFoundReports().map((report) => ({
    ...report,
    distanceKm: Number.isFinite(report.lat) && Number.isFinite(report.lng)
      ? haversineDistanceKm(lat, lng, Number(report.lat), Number(report.lng))
      : Infinity,
  })).filter((report) => Number.isFinite(report.distanceKm) && report.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function buildSearchSkeleton(count = 3) {
  return `<div class="result-grid">${Array.from({ length: count }).map(() => `
    <article class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    </article>`).join('')}</div>`;
}

function displayMatches(matches = [], options = {}) {
  const container = options.container || document.getElementById('match-results-container') || document.getElementById('results');
  if (!container) return false;
  if (!Array.isArray(matches) || !matches.length) {
    container.innerHTML = '<div class="empty">אין כרגע התאמות להצגה.</div>';
    return false;
  }
  const heading = options.heading || 'נמצאו התאמות אפשריות!';
  const kind = options.kind || 'visual';
  const wrapperClass = options.wrapperClass || 'match-scroller';
  container.innerHTML = `
    <div class="stack" style="gap:12px;">
      <h3 class="match-title" style="margin:0;">${escapeHtml(heading)}</h3>
      <div class="${wrapperClass}">
        ${renderMatchCards(matches, { kind })}
      </div>
    </div>`;
  return true;
}



function buildPendingFoundReportDraft(payload = {}) {
  const imageData = String(payload.imageData || '').trim();
  const reportedAt = String(payload.reportedAt || new Date().toISOString()).trim();
  const animalType = inferAnimalTypeLabel(payload.animalType || '');
  const sizeLabel = String(payload.sizeLabel || '').trim();
  const colorName = String(payload.colorName || payload.colors || '').trim();
  return {
    id: payload.id || `draft-${Date.now()}`,
    reportKind: String(payload.reportKind || payload.kind || 'found').trim() || 'found',
    imageData,
    animalType,
    breed: String(payload.breed || '').trim(),
    colorName,
    colors: String(payload.colors || colorName || '').trim(),
    city: String(payload.city || '').trim(),
    locationText: String(payload.locationText || '').trim(),
    reportedAt,
    lat: Number.isFinite(payload.lat) ? Number(payload.lat) : null,
    lng: Number.isFinite(payload.lng) ? Number(payload.lng) : null,
    sizeLabel,
    notes: String(payload.notes || '').trim(),
    searchRadiusKm: Number(payload.searchRadiusKm || 0) || 0,
    sourcePage: String(payload.sourcePage || window.location.href).trim(),
    quickPost: Boolean(payload.quickPost),
    querySummary: String(payload.querySummary || '').trim(),
    audioData: String(payload.audioData || '').trim(),
    contactPhone: String(payload.contactPhone || '').trim(),
    whatsappOptIn: Boolean(payload.whatsappOptIn),
  };
}


function getPendingFoundReportKey() {
  return (typeof PENDING_FOUND_REPORT_KEY !== 'undefined' && PENDING_FOUND_REPORT_KEY) || window.PENDING_FOUND_REPORT_KEY || 'petconnect-ghpages-pending-found-report-v1';
}

function getFoundReportsKey() {
  return (typeof FOUND_REPORTS_KEY !== 'undefined' && FOUND_REPORTS_KEY) || window.FOUND_REPORTS_KEY || 'petconnect-ghpages-found-reports-v1';
}

function getStatsSummaryCacheKey() {
  return (typeof STATS_SUMMARY_CACHE_KEY !== 'undefined' && STATS_SUMMARY_CACHE_KEY) || window.STATS_SUMMARY_CACHE_KEY || 'petconnect-ghpages-stats-summary-cache-v1';
}

function savePendingFoundReportDraft(payload = {}) {
  const draft = buildPendingFoundReportDraft(payload);
  storageSet(sessionStorage, getPendingFoundReportKey(), JSON.stringify(draft));
  if (draft.imageData) {
    storageSet(sessionStorage, 'pendingFoundImage', draft.imageData);
    storageSet(sessionStorage, 'pendingReportImage', draft.imageData);
    storageSet(sessionStorage, 'pendingImage', draft.imageData);
    storageSet(localStorage, 'pendingImage', draft.imageData);
  }
  const locationPayload = JSON.stringify({
    lat: Number.isFinite(Number(draft.lat)) ? Number(draft.lat) : null,
    lng: Number.isFinite(Number(draft.lng)) ? Number(draft.lng) : null,
    label: draft.locationText || '',
  });
  storageSet(sessionStorage, 'pendingFoundLocation', locationPayload);
  storageSet(sessionStorage, 'pendingReportLocation', locationPayload);
  return draft;
}

function loadPendingFoundReportDraft() {
  const parsed = safeJsonParse(storageGet(sessionStorage, getPendingFoundReportKey(), ''), null);
  if (parsed && typeof parsed === 'object') return parsed;
  const legacyImage = storageGet(sessionStorage, 'pendingFoundImage', '')
    || storageGet(sessionStorage, 'pendingReportImage', '')
    || storageGet(sessionStorage, 'pendingImage', '')
    || storageGet(localStorage, 'pendingImage', '');
  const legacyLocation = safeJsonParse(
    storageGet(sessionStorage, 'pendingFoundLocation', '') || storageGet(sessionStorage, 'pendingReportLocation', ''),
    null,
  );
  if (!legacyImage) return null;
  return buildPendingFoundReportDraft({
    imageData: legacyImage,
    lat: Number.isFinite(Number(legacyLocation?.lat)) ? Number(legacyLocation.lat) : null,
    lng: Number.isFinite(Number(legacyLocation?.lng)) ? Number(legacyLocation.lng) : null,
    locationText: legacyLocation?.label || '',
  });
}

function clearPendingFoundReportDraft() {
  [
    getPendingFoundReportKey(),
    'pendingFoundImage',
    'pendingReportImage',
    'pendingImage',
    'pendingFoundLocation',
    'pendingReportLocation',
  ].forEach((key) => {
    storageRemove(sessionStorage, key);
  });
  storageRemove(localStorage, 'pendingImage');
}

function loadFoundReports() {
  const parsed = safeJsonParse(storageGet(localStorage, getFoundReportsKey(), '[]'), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveFoundReports(reports = []) {
  storageSet(localStorage, getFoundReportsKey(), JSON.stringify(Array.isArray(reports) ? reports : []));
}

function saveFoundReport(report = {}) {
  const reports = loadFoundReports();
  const saved = {
    id: report.id || `found-${Date.now()}`,
    reportKind: String(report.reportKind || report.kind || 'found').trim() || 'found',
    imageData: String(report.imageData || '').trim(),
    animalType: inferAnimalTypeLabel(report.animalType || ''),
    breed: String(report.breed || '').trim(),
    colorName: String(report.colorName || report.colors || '').trim(),
    colors: String(report.colors || report.colorName || '').trim(),
    city: String(report.city || '').trim(),
    locationText: String(report.locationText || '').trim(),
    reportedAt: String(report.reportedAt || new Date().toISOString()).trim(),
    lat: Number.isFinite(report.lat) ? Number(report.lat) : null,
    lng: Number.isFinite(report.lng) ? Number(report.lng) : null,
    sizeLabel: String(report.sizeLabel || '').trim(),
    notes: String(report.notes || '').trim(),
    verificationPrompt: String(report.verificationPrompt || '').trim(),
    verificationAnswerHash: String(report.verificationAnswerHash || '').trim(),
    sourcePage: String(report.sourcePage || '').trim(),
    audioData: String(report.audioData || '').trim(),
    contactPhone: String(report.contactPhone || '').trim(),
    whatsappOptIn: Boolean(report.whatsappOptIn),
    createdAt: new Date().toISOString(),
    status: 'local',
  };
  reports.unshift(saved);
  saveFoundReports(reports.slice(0, 50));
  return saved;
}

function buildFoundReportShareText(report = {}, options = {}) {
  const kind = String(report.reportKind || report.kind || 'found').trim() || 'found';
  const lines = [kind === 'missing' ? 'אבדה חיה דרך פאטקונקט' : 'נמצאה חיה דרך פאטקונקט'];
  if (report.animalType) lines.push(`סוג: ${report.animalType}`);
  if (report.breed) lines.push(`גזע: ${report.breed}`);
  if (report.colors || report.colorName) lines.push(`צבע: ${report.colors || report.colorName}`);
  if (report.city) lines.push(`עיר: ${report.city}`);
  if (report.locationText) lines.push(`אזור: ${report.locationText}`);
  if (report.reportedAt) lines.push(`זמן: ${formatReportedAt(report.reportedAt)}`);
  if (report.contactPhone) lines.push(`טלפון: ${report.contactPhone}`);
  if (report.notes) lines.push(`פרטים נוספים: ${report.notes}`);
  if (options.includeGuide !== false) lines.push(kind === 'missing' ? 'מה לעשות עכשיו: לשתף בקבוצות שכונתיות, לעדכן וטרינרים קרובים ולבדוק דיווחים חדשים.' : 'מה לעשות עכשיו: לבדוק קולר, לגשת לסריקת שבב, ולהציע מים בזהירות.');
  return lines.join('\n');
}

function buildFoundReportWhatsAppHref(report = {}, options = {}) {
  const text = buildFoundReportShareText(report, options);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function estimateAnimalSizeLabel(rect = null, image = null) {
  if (!rect || !image || !image.width || !image.height) return '';
  const ratio = (rect.width * rect.height) / (image.width * image.height);
  if (ratio < 0.08) return 'קטן';
  if (ratio < 0.22) return 'בינוני';
  return 'גדול';
}

function renderFoundReportCards(reports = []) {
  if (!Array.isArray(reports) || !reports.length) return '<div class="empty">עדיין אין דיווחים להצגה.</div>';
  return reports.map((report) => `
    <article class="match-card report-card">
      ${report.imageData ? `<div class="thumb-wrap blur-shell"><img class="pet-result-avatar pet-result-img blur-up" src="${report.imageData}" alt="${escapeHtml(report.animalType || (report.reportKind === 'missing' ? 'חיה שאבדה' : 'חיה שנמצאה'))}"></div>` : ''}
      <div class="body stack">
        <div class="space-between"><strong>${escapeHtml(report.animalType || (report.reportKind === 'missing' ? 'חיה שאבדה' : 'חיה שנמצאה'))}</strong><span class="badge">${escapeHtml(formatReportedAt(report.reportedAt) || 'עכשיו')}</span></div>
        <div class="row"><span class="chip">${report.reportKind === 'missing' ? 'דיווח אובדן' : 'דיווח מציאה'}</span></div>
        <div class="row">${report.breed ? `<span class="badge">${escapeHtml(report.breed)}</span>` : ''}${report.colors ? `<span class="badge">${escapeHtml(report.colors)}</span>` : ''}${report.city ? `<span class="badge">${escapeHtml(report.city)}</span>` : ''}</div>
        <div class="small">${escapeHtml(report.locationText || 'ללא אזור מפורט')}</div>
        ${report.notes ? `<div class="small">${escapeHtml(report.notes)}</div>` : ''}
        ${report.audioData ? `<audio controls preload="none" src="${report.audioData}"></audio>` : ''}
      </div>
    </article>`).join('');
}

function registerServiceWorker() {
  if (window.__petconnectSwRegistered) return;
  if (!('serviceWorker' in navigator)) return;
  window.__petconnectSwRegistered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('רישום Service Worker נכשל:', error);
    });
  });
}



function mountLanguageSwitcher(root = document) {
  const current = (window.getAppLanguage?.() || storageGet(localStorage, PET_LANG_STORAGE_KEY, null) || storageGet(localStorage, USER_LANG_STORAGE_KEY, null) || storageGet(localStorage, LANG_STORAGE_KEY, null) || storageGet(localStorage, LANG_STORAGE_ALIAS_KEY, null) || storageGet(localStorage, LEGACY_LANG_STORAGE_KEY, null) || document.documentElement.lang || 'he').slice(0, 2).toLowerCase();
  root.querySelectorAll('[data-lang]').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === current);
    if (button.__langBound) return;
    button.__langBound = true;
    button.addEventListener('click', () => {
      const next = button.dataset.lang || 'he';
      if (window.setAppLanguage) {
        window.setAppLanguage(next);
        return;
      }
      try {
        localStorage.setItem(PET_LANG_STORAGE_KEY, next);
        localStorage.setItem(USER_LANG_STORAGE_KEY, next);
        localStorage.setItem(LANG_STORAGE_KEY, next);
        localStorage.setItem(LANG_STORAGE_ALIAS_KEY, next);
        localStorage.setItem(LEGACY_LANG_STORAGE_KEY, next);
      } catch (error) {}
      document.documentElement.lang = next;
      document.documentElement.dir = (next === 'ar' || next === 'he') ? 'rtl' : 'ltr';
      root.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('active', el === button));
      applyTranslations(document);
      window.setTimeout(() => {
        try { window.location.reload(); } catch (error) {}
      }, 10);
    });
  });

  root.querySelectorAll('[data-lang-select]').forEach((select) => {
    select.value = current;
    if (select.__langBound) return;
    select.__langBound = true;
    select.addEventListener('change', () => {
      const next = String(select.value || 'he').slice(0, 2).toLowerCase();
      if (window.setLanguage) {
        window.setLanguage(next);
        return;
      }
      if (window.setAppLanguage) {
        window.setAppLanguage(next);
        return;
      }
      try {
        localStorage.setItem(PET_LANG_STORAGE_KEY, next);
      } catch (error) {}
      window.location.reload();
    });
  });
}

function bootUiShell(root = document) {
  try { const preferredLang = window.getAppLanguage?.() || storageGet(localStorage, PET_LANG_STORAGE_KEY, null) || storageGet(localStorage, USER_LANG_STORAGE_KEY, null) || storageGet(localStorage, LANG_STORAGE_KEY, null) || storageGet(localStorage, LANG_STORAGE_ALIAS_KEY, null) || storageGet(localStorage, LEGACY_LANG_STORAGE_KEY, null) || document.documentElement.lang || 'he'; window.initLang?.(preferredLang); } catch (error) {}
  try { window.applyTranslations?.(root); } catch (error) {}
  try { mountLanguageSwitcher(root); } catch (error) {}
  try { mountThemeToggle(root); } catch (error) {}
  try { applyTheme(); } catch (error) {}
  return document.documentElement.lang?.slice(0,2).toLowerCase() || 'he';
}



const THEME_KEY = 'petconnect-ui-theme-v1';

function getStoredThemePreference() {
  try { return localStorage.getItem(THEME_KEY) || ''; } catch (error) { return ''; }
}

function getResolvedTheme() {
  const stored = getStoredThemePreference();
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme = getResolvedTheme()) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#081225' : '#007AFF');
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const isDark = resolved === 'dark';
    button.classList.toggle('active', isDark);
    button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    button.setAttribute('title', isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה');
    button.innerHTML = isDark ? '☀️' : '🌙';
  });
  return resolved;
}

function toggleTheme() {
  const next = getResolvedTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (error) {}
  return applyTheme(next);
}

function mountThemeToggle(root = document) {
  const navActions = root.querySelector('.nav-actions') || root.querySelector('.nav');
  if (!navActions) return null;
  let button = root.querySelector('[data-theme-toggle]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.dataset.themeToggle = 'true';
    button.setAttribute('aria-label', 'החלפת ערכת צבעים');
    navActions.appendChild(button);
  }
  if (!button.__themeBound) {
    button.__themeBound = true;
    button.addEventListener('click', () => toggleTheme());
  }
  applyTheme();
  return button;
}

function launchConfettiBurst(options = {}) {
  if (typeof document === 'undefined') return;
  const count = Number(options.count || 18);
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const palette = options.colors || ['#007AFF', '#34C759', '#FF9500', '#7C3AED', '#FF5D2A'];
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = palette[index % palette.length];
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty('--rot', `${(Math.random() - 0.5) * 920}deg`);
    piece.style.animationDelay = `${Math.random() * 180}ms`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), Number(options.duration || 1500));
}

if (typeof window !== 'undefined' && !window.__petconnectUiShellBooted) {
  window.__petconnectUiShellBooted = true;
  const runBoot = () => bootUiShell(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runBoot, { once: true });
  } else {
    runBoot();
  }
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    hashString,
    slugify,
    safeJsonParse,
    normalizeNumericArray,
    normalizeVector,
    escapeHtml,
    clearValidityOnInput,
    setRequiredValidity,
    isSafeProfileHref,
    setStatus,
    loadModels,
    blobToImage,
    fileToImage,
    canvasToBlob,
    fileToPreparedImage,
    shrinkImage,
    createCropCanvas,
    makeSquareThumb,
    fullImageRect,
    defaultSelectionRect,
    clampRectToImage,
    normalizeDragRect,
    drawImageSelection,
    imagePointFromEvent,
    cropRectToCanvas,
    cropRectToDataUrl,
    cropRectToDataUrlMasked,
    applyCircleMask,
    loadAnimalDetector,
    detectSubjects,
    pickBestAnimalDetection,
    formatPct,
    cosineSimilarity,
    histogramSimilarity,
    similarityLabel,
    rgbToHex,
    rgbToHsl,
    describeColor,
    extractColorProfile,
    extractAnimalEmbedding,
    extractAnimalFeatures,
    buildEnrollmentRects,
    extractAnimalFeaturesForEnrollment,
    normalizeEntry,
    bestEntryMatch,
    computeSearchResults,
    loadRepoLibrary,
    loadLocalLibrary,
    saveLocalLibrary,
    loadImportedLibrary,
    saveImportedLibrary,
    getMergedLibrary,
    exportJson,
    formatEntryCount,
    formatSampleCount,
    sourceLabel,
    formatCoordinates,
    buildMunicipalReportHref,
    buildWhatsAppHref,
    buildCommunityWatchHref,
    shareResult,
    setButtonBusy,
    vibrateIfPossible,
    haversineDistanceKm,
    getNearbyFoundReports,
    buildSearchSkeleton,
    attachCityAutocomplete,
    normalizeHebrewFuzzy,
    fuzzySimilarity,
    fuzzyRankItems,
    prepareCanvasForEmbedding,
    pickTopMatchesForGallery,
    saveLastMatchGallery,
    loadLastMatchGallery,
    clearLastMatchGallery,
    privacyBlurCoordinates,
    displayMatches,
    renderMatchCards,
    registerServiceWorker,
    openPrintablePoster,
    buildPendingFoundReportDraft,
    savePendingFoundReportDraft,
    loadPendingFoundReportDraft,
    clearPendingFoundReportDraft,
    loadFoundReports,
    saveFoundReport,
    buildFoundReportShareText,
    buildFoundReportWhatsAppHref,
    estimateAnimalSizeLabel,
    renderFoundReportCards,
    mountLanguageSwitcher,
    bootUiShell,
    getResolvedTheme,
    applyTheme,
    toggleTheme,
    mountThemeToggle,
    launchConfettiBurst,
    LANG_STORAGE_KEY,
    FOUND_REPORTS_KEY: getFoundReportsKey(),
    PENDING_FOUND_REPORT_KEY: getPendingFoundReportKey(),
    STATS_SUMMARY_CACHE_KEY: getStatsSummaryCacheKey(),
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountThemeToggle(document);
      applyTheme();
    }, { once: true });
  } else {
    mountThemeToggle(document);
    applyTheme();
  }

  const themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (themeMedia && themeMedia.addEventListener) {
    themeMedia.addEventListener('change', () => {
      if (!getStoredThemePreference()) applyTheme();
    });
  }
}
