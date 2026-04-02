const MODEL_URIS = {
  tiny: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master/tiny_face_detector',
  ssd: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master/ssd_mobilenetv1',
  landmarks: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master/face_landmark_68',
  recognition: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master/face_recognition',
};

const STORAGE_KEY = 'petconnect-ghpages-library-v2';
const SEARCH_IMPORT_KEY = 'petconnect-ghpages-imported-library-v2';

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
  return slug || `person-${hashString(original || 'entry')}`;
}

function distanceToScore(distance) {
  return Math.max(0, Math.min(1, 1 - distance / 1.2));
}

function scoreLabel(distance) {
  if (distance <= 0.45) return 'high';
  if (distance <= 0.6) return 'medium';
  return 'low';
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

function descriptorDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function normalizeDescriptorArray(descriptor) {
  if (!Array.isArray(descriptor)) return [];
  const normalized = descriptor.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return normalized.length ? normalized : [];
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

async function loadModels(statusEl) {
  if (!window.faceapi) {
    throw new Error('הספרייה face-api.js לא נטענה. בדקי את חיבור האינטרנט או חסימת ה-CDN.');
  }
  if (window.__petconnectModelsReady) {
    if (statusEl) statusEl.textContent = 'המודלים מוכנים.';
    return;
  }
  if (statusEl) statusEl.textContent = 'טוען מודלי זיהוי פנים… בטעינה הראשונה זה עשוי לקחת רגע.';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URIS.tiny),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URIS.landmarks),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URIS.recognition),
  ]);
  window.__petconnectModelsReady = true;
  if (statusEl) statusEl.textContent = 'המודלים מוכנים.';
}

async function ensureSsdModel(statusEl) {
  if (window.__petconnectSsdReady) return;
  if (statusEl) statusEl.textContent = 'מנסה גלאי פנים חזק יותר לתמונות קשות…';
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URIS.ssd);
  window.__petconnectSsdReady = true;
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`לא ניתן היה לטעון את התמונה ${file.name}`));
      el.src = url;
    });
    return { img, url };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function createScaledCanvas(img, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

function remapDetection(detection, mapper) {
  const { box } = detection.detection;
  return {
    ...detection,
    detection: {
      ...detection.detection,
      box: {
        ...box,
        x: mapper.offsetX + (box.x / mapper.scaleX),
        y: mapper.offsetY + (box.y / mapper.scaleY),
        width: box.width / mapper.scaleX,
        height: box.height / mapper.scaleY,
      },
    },
  };
}

async function detectFacesWithTiny(image, options) {
  return faceapi
    .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions(options))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

async function detectFacesWithSsd(image) {
  return faceapi
    .detectAllFaces(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

async function detectFaces(img, statusEl) {
  const tinyPasses = [
    { inputSize: 512, scoreThreshold: 0.35 },
    { inputSize: 608, scoreThreshold: 0.25 },
    { inputSize: 800, scoreThreshold: 0.2 },
  ];

  for (const options of tinyPasses) {
    const detections = await detectFacesWithTiny(img, options);
    if (detections?.length) return detections;
  }

  const longestSide = Math.max(img.width, img.height) || 1;
  const upscale = Math.min(2, 1600 / longestSide);
  if (upscale > 1.05) {
    const scaled = createScaledCanvas(img, upscale);
    for (const options of tinyPasses) {
      const detections = await detectFacesWithTiny(scaled, options);
      if (detections?.length) {
        return detections.map((detection) => remapDetection(detection, {
          offsetX: 0,
          offsetY: 0,
          scaleX: upscale,
          scaleY: upscale,
        }));
      }
    }
  }

  const cropConfigs = [
    { x: img.width * 0.2, y: 0, w: img.width * 0.8, h: img.height },
    { x: 0, y: 0, w: img.width * 0.8, h: img.height },
    { x: img.width * 0.1, y: img.height * 0.05, w: img.width * 0.8, h: img.height * 0.9 },
    { x: img.width * 0.35, y: 0, w: img.width * 0.65, h: img.height },
  ];

  for (const crop of cropConfigs) {
    const sx = Math.max(0, Math.floor(crop.x));
    const sy = Math.max(0, Math.floor(crop.y));
    const sw = Math.min(img.width - sx, Math.floor(crop.w));
    const sh = Math.min(img.height - sy, Math.floor(crop.h));
    if (sw < 64 || sh < 64) continue;
    const cropped = createCropCanvas(img, sx, sy, sw, sh);
    for (const options of tinyPasses) {
      const detections = await detectFacesWithTiny(cropped, options);
      if (detections?.length) {
        return detections.map((detection) => remapDetection(detection, {
          offsetX: sx,
          offsetY: sy,
          scaleX: 1,
          scaleY: 1,
        }));
      }
    }
  }

  await ensureSsdModel(statusEl);
  let detections = await detectFacesWithSsd(img);
  if (detections?.length) return detections;

  for (const crop of cropConfigs) {
    const sx = Math.max(0, Math.floor(crop.x));
    const sy = Math.max(0, Math.floor(crop.y));
    const sw = Math.min(img.width - sx, Math.floor(crop.w));
    const sh = Math.min(img.height - sy, Math.floor(crop.h));
    if (sw < 64 || sh < 64) continue;
    const cropped = createCropCanvas(img, sx, sy, sw, sh);
    detections = await detectFacesWithSsd(cropped);
    if (detections?.length) {
      return detections.map((detection) => remapDetection(detection, {
        offsetX: sx,
        offsetY: sy,
        scaleX: 1,
        scaleY: 1,
      }));
    }
  }

  return [];
}

function pickBestDetection(detections) {
  if (!detections.length) return null;
  return [...detections].sort((a, b) => {
    const areaA = a.detection.box.width * a.detection.box.height;
    const areaB = b.detection.box.width * b.detection.box.height;
    return areaB - areaA;
  })[0];
}

function drawDetection(canvas, img, detection, options = {}) {
  const { showBox = true } = options;
  const ratio = Math.min(1, 900 / img.width);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (!detection || !showBox) return;
  const { x, y, width, height } = detection.detection.box;
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 4;
  ctx.strokeRect(x * ratio, y * ratio, width * ratio, height * ratio);
}

function cropFaceDataUrl(img, detection, paddingRatio = 0.35) {
  const { x, y, width, height } = detection.detection.box;
  const padX = width * paddingRatio;
  const padY = height * paddingRatio;
  const sx = Math.max(0, Math.floor(x - padX));
  const sy = Math.max(0, Math.floor(y - padY));
  const sw = Math.min(img.width - sx, Math.floor(width + padX * 2));
  const sh = Math.min(img.height - sy, Math.floor(height + padY * 2));
  const size = 280;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.9);
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

function normalizeEntry(entry) {
  const descriptors = Array.isArray(entry.descriptors)
    ? entry.descriptors.map((descriptor) => normalizeDescriptorArray(descriptor)).filter((descriptor) => descriptor.length)
    : [];
  return {
    id: entry.id || slugify(entry.label || 'רשומה'),
    label: String(entry.label || 'ללא שם').trim() || 'ללא שם',
    href: isSafeProfileHref(entry.href) ? (String(entry.href || '').trim() || '#') : '#',
    thumb: String(entry.thumb || '').trim(),
    notes: String(entry.notes || '').trim(),
    descriptors,
    source: entry.source || 'repo',
  };
}

async function getMergedLibrary() {
  const repo = (await loadRepoLibrary()).map((entry) => normalizeEntry({ ...entry, source: 'repo' }));
  const local = loadLocalLibrary().map((entry) => normalizeEntry({ ...entry, source: 'local' }));
  const imported = loadImportedLibrary().map((entry) => normalizeEntry({ ...entry, source: 'imported' }));
  return [...repo, ...local, ...imported].filter((entry) => entry.descriptors.length);
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
  return `ספריית החיפוש נטענה: ${count} ${count === 1 ? 'רשומה' : 'רשומות'}.`;
}

function formatSampleCount(count) {
  return `${count} ${count === 1 ? 'דוגמה' : 'דוגמאות'}`;
}

function formatDescriptorCount(count) {
  return `${count} ${count === 1 ? 'וקטור' : 'וקטורים'}`;
}

function sourceLabel(source) {
  const map = {
    repo: 'מהמאגר',
    local: 'מקומי',
    imported: 'מיובא',
  };
  return map[source] || source || 'לא ידוע';
}
