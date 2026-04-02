const STORAGE_KEY = 'petconnect-ghpages-animal-library-v2';
const SEARCH_IMPORT_KEY = 'petconnect-ghpages-animal-imported-library-v2';
const LAST_MATCH_GALLERY_KEY = 'petconnect-ghpages-last-matches-v1';

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
    maxWidth = 1024,
    maxHeight = 1024,
    type = 'image/jpeg',
    quality = 0.80,
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
  const tensor = window.tf.tidy(() => {
    const inferred = window.__petconnectAnimalModel.infer(source, true);
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
    colors: String(entry.colors || '').trim(),
    href: isSafeProfileHref(entry.href) ? (String(entry.href || '').trim() || '#') : '#',
    thumb: String(entry.thumb || '').trim(),
    notes: String(entry.notes || '').trim(),
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
  let bestVisualScore = 0;
  let bestColorScore = 0;
  for (let i = 0; i < descriptors.length; i += 1) {
    const visual = cosineSimilarity(queryFeatures.embedding, descriptors[i]);
    const color = histogramSimilarity(queryFeatures.colorHistogram, colorHistograms[i] || colorHistograms[0] || []);
    const combined = (visual * 0.78) + (color * 0.22);
    if (combined > bestVisualScore) {
      bestVisualScore = combined;
      bestColorScore = color;
    }
  }
  if (!descriptors.length) {
    bestColorScore = histogramSimilarity(queryFeatures.colorHistogram, colorHistograms[0] || []);
  }
  return {
    visualScore: bestVisualScore,
    colorScore: bestColorScore,
  };
}

function computeSearchResults(queryFeatures, library, options = {}) {
  const minScore = Math.max(0, Math.min(1, Number(options.minScore ?? 0.55)));
  const visualMatches = library
    .map((entry) => {
      const match = bestEntryMatch(queryFeatures, entry);
      return {
        ...entry,
        score: match.visualScore,
        colorScore: match.colorScore,
        confidence: similarityLabel(match.visualScore),
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
      const colorScore = Math.max(...colorCandidates.map((histogram) => histogramSimilarity(queryFeatures.colorHistogram, histogram)));
      return {
        ...entry,
        score: colorScore,
        colorScore,
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

function buildMunicipalReportHref({ city = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const cleanCity = String(city || '').trim();
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const subjectCity = cleanCity || 'עיר לא צוינה';
  const lines = [
    'שלום,',
    '',
    'ברצוני לדווח על בעל חיים שנבדק מול המאגר באתר.',
  ];
  if (bestMatch) {
    lines.push(`התאמה מובילה במאגר: ${bestMatch.label} (${formatPct(bestMatch.score)}).`);
    if (bestMatch.animalType) lines.push(`סוג בעל החיים: ${bestMatch.animalType}.`);
    if (bestMatch.colors || bestMatch.colorName) lines.push(`צבעים דומיננטיים: ${bestMatch.colors || bestMatch.colorName}.`);
  }
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) {
    lines.push(`מיקום משוער: ${formatCoordinates(blurred.lat, blurred.lng)} (רדיוס פרטי של כ-${blurred.radiusMeters} מטר)`);
    lines.push(`מפת גוגל: https://www.google.com/maps?q=${blurred.lat},${blurred.lng}`);
  }
  lines.push(`עמוד החיפוש: ${pageUrl}`);
  lines.push('הערה: התמונה עצמה נבדקה מקומית בדפדפן ולכן אינה מצורפת אוטומטית.');
  const params = new URLSearchParams({
    subject: `דיווח על בעל חיים - מוקד 106 - ${subjectCity}`,
    body: lines.join('\n'),
  });
  return `mailto:?${params.toString()}`;
}


function buildWhatsAppHref({ city = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const parts = ['שלום, מצאתי בעל חיים ואני בודק התאמה דרך פאטקונקט.'];
  if (bestMatch) {
    parts.push(`נראית התאמה אפשרית ל-${bestMatch.label} (${formatPct(bestMatch.score || bestMatch.colorScore || 0)}).`);
    if (bestMatch.animalType) parts.push(`סוג: ${bestMatch.animalType}.`);
    if (bestMatch.colors || bestMatch.colorName) parts.push(`צבעים: ${bestMatch.colors || bestMatch.colorName}.`);
    if (bestMatch.href && bestMatch.href !== '#') parts.push(`פרופיל: ${new URL(bestMatch.href, pageUrl).href}`);
  }
  if (city) parts.push(`עיר: ${city}.`);
  if (Number.isFinite(blurred.lat) && Number.isFinite(blurred.lng)) parts.push(`אזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}.`);
  parts.push(`עמוד החיפוש: ${pageUrl}`);
  return `https://wa.me/?text=${encodeURIComponent(parts.join('\n'))}`;
}

async function shareResult({ city = '', lat = null, lng = null, bestMatch = null, pageUrl = window.location.href } = {}) {
  const blurred = privacyBlurCoordinates(lat, lng, 100);
  const shareUrl = bestMatch?.href && bestMatch.href !== '#'
    ? new URL(bestMatch.href, pageUrl).href
    : pageUrl;
  const lines = ['התאמה אפשרית מפאטקונקט'];
  if (bestMatch) {
    lines.push(`${bestMatch.label} (${formatPct(bestMatch.score || bestMatch.colorScore || 0)})`);
    if (bestMatch.animalType) lines.push(`סוג: ${bestMatch.animalType}`);
  }
  if (city) lines.push(`עיר: ${city}`);
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
  return fileToPreparedImage(file, {
    maxWidth: Number(options.maxWidth || 1024),
    maxHeight: Number(options.maxHeight || 1024),
    quality: Number(options.quality || 0.80),
    type: options.type || 'image/jpeg',
  });
}

function renderMatchCards(matches = [], options = {}) {
  const kind = options.kind || 'visual';
  return matches.map((match) => {
    const target = match.href && match.href !== '#' ? match.href : '';
    const safeLabel = escapeHtml(String(match.label || 'ללא שם'));
    const safeNotes = escapeHtml(String(match.notes || ''));
    const animalType = match.animalType ? `<span class="badge">${escapeHtml(match.animalType)}</span>` : '';
    const colors = match.colors ? `<span class="badge">${escapeHtml(match.colors)}</span>` : (match.colorName ? `<span class="badge">${escapeHtml(match.colorName)}</span>` : '');
    const notes = match.notes ? `<div class="small">${safeNotes}</div>` : '';
    const thumb = match.thumb ? `<div class="thumb-wrap"><img src="${match.thumb}" alt="${safeLabel}"></div>` : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
    const score = kind === 'visual' ? Number(match.score || 0) : Number(match.colorScore || match.score || 0);
    const scoreText = kind === 'visual' ? `${Math.round(score * 100)}% התאמה` : `צבע ${Math.round(score * 100)}%`;
    const reason = kind === 'visual' ? 'התאמה מיידית מהסריקה' : 'תוצאת גיבוי לפי צבעים דומים';
    const profileButton = target ? `<a class="button-link small" href="${escapeHtml(target)}">פתיחת פרופיל</a>` : '<span class="badge">אין קישור פרופיל</span>';
    return `
      <article class="match-card result-card">
        ${thumb}
        <div class="body">
          <div class="space-between">
            <strong>${safeLabel}</strong>
            <span class="score-pill ${escapeHtml(String(match.confidence || 'low'))}">${scoreText}</span>
          </div>
          <div class="row">
            ${animalType}
            ${colors}
            ${match.source ? `<span class="badge">${sourceLabel(match.source)}</span>` : ''}
          </div>
          <div class="small">${reason}</div>
          ${notes}
          <div class="card-actions">${profileButton}</div>
        </div>
      </article>`;
  }).join('');
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
    shareResult,
    pickTopMatchesForGallery,
    saveLastMatchGallery,
    loadLastMatchGallery,
    clearLastMatchGallery,
    privacyBlurCoordinates,
    displayMatches,
    renderMatchCards,
    registerServiceWorker,
  });
}
