
function fallbackSetStatus(element, text, options = {}) {
  if (!element) return;
  const { tone = 'default', busy = false } = options;
  element.textContent = text;
  element.classList.remove('warn', 'success', 'busy');
  if (tone === 'warn') element.classList.add('warn');
  if (tone === 'success') element.classList.add('success');
  if (busy) element.classList.add('busy');
}

async function waitForCommonHelpers() {
  const needed = ['registerServiceWorker', 'setStatus', 'extractAnimalFeatures', 'buildWhatsAppHref', 'shareResult'];
  const start = Date.now();
  while (Date.now() - start < 8000) {
    if (needed.every((name) => typeof window[name] === 'function')) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('קובץ העזר assets/common.js לא נטען. נסי Ctrl + F5 או חלון אינקוגניטו.');
}

async function runSearchPage() {
  await waitForCommonHelpers();
  window.initLang?.('he');
  window.applyTranslations?.();
  window.registerServiceWorker?.();

  const statusEl = document.getElementById('status');
  const searchForm = document.getElementById('search-form');
  const fileInput = document.getElementById('query-file');
  const loadBtn = document.getElementById('search-btn');
  const runSelectedBtn = document.getElementById('run-selected-btn');
  const useWholeBtn = document.getElementById('use-whole-btn');
  const canvas = document.getElementById('preview-canvas');
  const cropImg = document.getElementById('query-crop');
  const cropMetaEl = document.getElementById('crop-meta');
  const showBoxInput = document.getElementById('show-box');
  const resultsEl = document.getElementById('match-results-container');
  const summaryEl = document.getElementById('summary');
  const libraryStatsEl = document.getElementById('library-stats');
  const importInput = document.getElementById('import-json');
  const clearImportedBtn = document.getElementById('clear-imported');
  const minScoreInput = document.getElementById('min-score');
  const minScoreOutput = document.getElementById('min-score-value');
  const prepNoteEl = document.getElementById('prep-note');
  const progressFillEl = document.getElementById('search-progress-fill');
  const progressLabelEl = document.getElementById('search-progress-label');
  const cityInput = document.getElementById('city-name');
  const locateBtn = document.getElementById('locate-btn');
  const locationStatusEl = document.getElementById('location-status');
  const resultsSection = document.getElementById('results-section');
  const selectionHintEl = document.getElementById('selection-hint');
  const filterAnimalTypeEl = document.getElementById('filter-animal-type');
  const filterSourceEl = document.getElementById('filter-source');
  const strongOnlyEl = document.getElementById('filter-strong-only');
  const shareTopBtn = document.getElementById('share-top-btn');
  const whatsappTopBtn = document.getElementById('whatsapp-top-btn');
  const reportTopBtn = document.getElementById('report-top-btn');
  const privacyNoteEl = document.getElementById('privacy-note');

  clearValidityOnInput(fileInput);
  clearValidityOnInput(cityInput);
  minScoreOutput.textContent = `${minScoreInput.value}%`;

  let currentPreviewImage = null;
  let currentSelection = null;
  let currentLibrary = [];
  let currentResultBundle = null;
  let currentQueryFeatures = null;
  let geoState = { lat: null, lng: null };
  let dragState = { active: false, startX: 0, startY: 0 };

  function setSearchProgress(percent = 0, label = '') {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    progressFillEl.style.width = `${safePercent}%`;
    progressFillEl.setAttribute('aria-valuenow', String(Math.round(safePercent)));
    progressLabelEl.textContent = label || (safePercent >= 100 ? 'הסריקה הושלמה.' : `סריקה: ${Math.round(safePercent)}%`);
  }

  function resetSearchProgress() {
    setSearchProgress(0, 'ממתין לתמונה לחיפוש.');
  }

  function updatePrivacyNote() {
    if (!privacyNoteEl) return;
    if (Number.isFinite(geoState.lat) && Number.isFinite(geoState.lng)) {
      const blurred = privacyBlurCoordinates(geoState.lat, geoState.lng, 100);
      privacyNoteEl.textContent = `לפרטיות, בשיתוף ובטיוטת 106 נשתמש באזור משוער של כ-${blurred.radiusMeters} מטר ולא בכתובת מדויקת.`;
    } else {
      privacyNoteEl.textContent = 'אם תשתמשי במיקום, בשיתופים ובטיוטת 106 יופיע אזור משוער בלבד כדי לשמור על פרטיות.';
    }
  }

  function isStrongMatch(match, kind) {
    if (kind === 'visual') return Number(match.score || 0) >= 0.75;
    return Number(match.colorScore || match.score || 0) >= 0.72;
  }

  function applyResultFilters(bundle) {
    if (!bundle) return { kind: 'visual', matches: [] };
    const selectedType = filterAnimalTypeEl.value;
    const selectedSource = filterSourceEl.value;
    const strongOnly = strongOnlyEl.checked;
    const filtered = (bundle.matches || []).filter((match) => {
      if (selectedType && (match.animalType || '') !== selectedType) return false;
      if (selectedSource && (match.source || '') !== selectedSource) return false;
      if (strongOnly && !isStrongMatch(match, bundle.kind)) return false;
      return true;
    });
    return { ...bundle, matches: filtered };
  }

  function refreshResultFilters(bundle) {
    const types = Array.from(new Set((bundle?.matches || []).map((match) => (match.animalType || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he'));
    const previous = filterAnimalTypeEl.value;
    filterAnimalTypeEl.innerHTML = '<option value="">כל הסוגים</option>' + types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
    if (types.includes(previous)) filterAnimalTypeEl.value = previous;
  }

  function updateTopActions(bundle) {
    const top = bundle?.matches?.[0];
    const disabled = !top;
    shareTopBtn.disabled = disabled;
    whatsappTopBtn.disabled = disabled;
    reportTopBtn.classList.toggle('disabled-link', disabled);
    reportTopBtn.href = buildMunicipalReportHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top || null });
  }

  function redrawPreview() {
    if (!currentPreviewImage) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawImageSelection(canvas, currentPreviewImage, currentSelection, {
      showBox: showBoxInput.checked,
      label: 'אזור החיה',
    });
  }

  function updateSelectionPreview() {
    if (!currentPreviewImage) {
      cropImg.classList.add('hidden');
      cropMetaEl.textContent = 'עדיין לא נבחר אזור חיה.';
      return;
    }
    const rect = currentSelection || fullImageRect(currentPreviewImage);
    cropImg.src = cropRectToDataUrl(currentPreviewImage, rect, 320);
    cropImg.classList.remove('hidden');
    const colorProfile = extractColorProfile(cropRectToCanvas(currentPreviewImage, rect));
    cropMetaEl.innerHTML = `האזור שנבחר: ${Math.round(rect.width)}×${Math.round(rect.height)} פיקסלים · צבע דומיננטי משוער: <span class="color-chip"><span class="swatch" style="background:${colorProfile.avgHex};"></span>${escapeHtml(colorProfile.colorName)}</span>`;
  }

  function setSelection(rect, message = '') {
    currentSelection = rect ? clampRectToImage(currentPreviewImage, rect) : fullImageRect(currentPreviewImage);
    redrawPreview();
    updateSelectionPreview();
    if (message) setStatus(statusEl, message, { tone: 'success' });
    runSelectedBtn.disabled = !currentPreviewImage;
  }

  function renderResults(bundle) {
    const matches = bundle.matches || [];
    if (!matches.length) {
      resultsEl.innerHTML = '<div class="empty">אין כרגע תוצאות להצגה.</div>';
      return;
    }
    resultsEl.innerHTML = `<div class="result-grid">${matches.map((match) => {
      const target = match.href && match.href !== '#' ? match.href : '';
      const safeLabel = escapeHtml(match.label);
      const safeNotes = escapeHtml(match.notes || '');
      const animalType = match.animalType ? `<span class="badge">${escapeHtml(match.animalType)}</span>` : '';
      const colors = match.colors ? `<span class="badge">${escapeHtml(match.colors)}</span>` : `<span class="badge">${escapeHtml(match.colorName || '')}</span>`;
      const notes = match.notes ? `<div class="small">${safeNotes}</div>` : '';
      const thumb = match.thumb ? `<div class="thumb-wrap"><img src="${match.thumb}" alt="${safeLabel}"></div>` : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
      const reportHref = buildMunicipalReportHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: match });
      const profileButton = target ? `<a class="button-link small" href="${escapeHtml(target)}">פתיחת פרופיל</a>` : '<span class="badge">אין קישור פרופיל</span>';
      const score = bundle.kind === 'visual' ? Number(match.score || 0) : Number(match.colorScore || 0);
      const scoreText = bundle.kind === 'visual' ? `${Math.round(score * 100)}% התאמה` : `צבע ${Math.round(score * 100)}%`;
      const reason = bundle.kind === 'visual' ? 'התאמה ויזואלית + צבע' : 'גיבוי לפי צבעים דומים';
      return `
        <article class="result-card">
          ${thumb}
          <div class="body">
            <div class="space-between">
              <strong>${safeLabel}</strong>
              <span class="score-pill ${match.confidence || 'low'}">${scoreText}</span>
            </div>
            <div class="row">
              ${animalType}
              ${colors}
              <span class="badge">${sourceLabel(match.source)}</span>
            </div>
            <div class="small">${reason}</div>
            ${notes}
            <div class="card-actions">
              ${profileButton}
              <a class="button-link secondary small" href="${buildWhatsAppHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: match })}" target="_blank" rel="noopener">וואטסאפ</a>
              <a class="button-link secondary small" href="${reportHref}">דיווח למוקד 106</a>
            </div>
          </div>
        </article>`;
    }).join('')}</div>`;
  }

  function renderSummary(bundle) {
    const matches = bundle.matches || [];
    if (!matches.length) {
      summaryEl.innerHTML = '';
      summaryEl.classList.add('hidden');
      return;
    }

    const top = matches[0];
    let tone = 'low';
    let title = 'נמצאו בעלי חיים דומים';
    let body = 'עברו על הכרטיסים למטה ובדקו מי מהם נראה הכי קרוב לחיה שבתמונה.';
    if (bundle.kind === 'visual') {
      if (top.score >= 0.85) {
        tone = 'high';
        title = `נמצאה התאמה חזקה: ${escapeHtml(top.label)}`;
        body = `נמצאה התאמה חזקה של ${Math.round((top.score || 0) * 100)}%. כדאי ליצור קשר קודם עם הבעלים של הכרטיס הראשון.`;
      } else if (top.score >= 0.70) {
        tone = 'medium';
        title = `מועמד מוביל: ${escapeHtml(top.label)}`;
        body = `המערכת מצאה מועמד מוביל של ${Math.round((top.score || 0) * 100)}%. מומלץ לעבור גם על 2–3 הכרטיסים שאחריו.`;
      }
    } else {
      tone = 'medium';
      title = 'לא נמצאה התאמה ויזואלית חזקה — מציג חיות בצבעים דומים';
      body = 'כדי לא לפספס, מוצגות עכשיו חיות עם פרופיל צבע דומה. אם צריך, נסי לסמן אזור מדויק יותר סביב החיה בלבד.';
    }

    const reportHref = buildMunicipalReportHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top });
    const profileAction = top.href && top.href !== '#' ? `<a class="button-link small" href="${escapeHtml(top.href)}">פתיחת הפרופיל של ${escapeHtml(top.label)}</a>` : '';
    summaryEl.className = `summary-banner ${tone}`;
    summaryEl.innerHTML = `
      <div class="chip">נמצאו ${matches.length} תוצאות</div>
      <h3 style="margin:0;">${title}</h3>
      <div class="small">${body}</div>
      <div class="summary-actions">
        ${profileAction}
        <button id="share-top-inline" class="small" type="button">שיתוף</button>
        <a class="button-link secondary small" href="${buildWhatsAppHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top })}" target="_blank" rel="noopener">וואטסאפ</a>
        <a class="button-link secondary small" href="${reportHref}">דיווח למוקד 106</a>
      </div>`;
    summaryEl.classList.remove('hidden');
    summaryEl.querySelector('#share-top-inline')?.addEventListener('click', async () => {
      const ok = await shareResult({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top });
      setStatus(statusEl, ok ? 'קישור ההתאמה הוכן לשיתוף.' : 'לא ניתן היה לשתף ישירות. נסי את כפתור הוואטסאפ או דיווח 106.', { tone: ok ? 'success' : 'warn' });
    });
  }

  function rerenderResults() {
    const filteredBundle = applyResultFilters(currentResultBundle);
    renderSummary(filteredBundle);
    renderResults(filteredBundle);
    updateTopActions(filteredBundle);
    saveLastMatchGallery(filteredBundle, { city: cityInput.value, pageUrl: window.location.href });
  }

  async function runSearch() {
    if (!currentPreviewImage || !currentSelection) {
      setStatus(statusEl, 'קודם צריך להעלות תמונה ולסמן אזור של החיה.', { tone: 'warn' });
      return;
    }
    setSearchProgress(12, 'טוען את ספריית החיפוש…');
    currentLibrary = await getMergedLibrary();
    libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
    if (!currentLibrary.length) {
      setStatus(statusEl, 'המאגר עדיין ריק. הוסיפי רשומות דרך עמוד בניית המאגר או דרך data/library.json.', { tone: 'warn' });
      resetSearchProgress();
      clearLastMatchGallery();
      return;
    }

    runSelectedBtn.disabled = true;
    setStatus(statusEl, 'סורק את אזור החיה ומחפש התאמות…', { busy: true });
    setSearchProgress(34, 'מכין את אזור החיה להשוואה…');
    const queryCanvas = cropRectToCanvas(currentPreviewImage, currentSelection);
    setSearchProgress(62, 'מפיק מאפיינים ויזואליים…');
    currentQueryFeatures = await extractAnimalFeatures(queryCanvas);
    setSearchProgress(84, 'משווה מול המאגר ומסנן תוצאות…');
    currentResultBundle = computeSearchResults(currentQueryFeatures, currentLibrary, {
      minScore: Math.max(0.35, Math.min(0.9, Number(minScoreInput.value) / 100)),
    });
    refreshResultFilters(currentResultBundle);
    rerenderResults();
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSearchProgress(100, currentResultBundle.kind === 'visual' ? 'נסרקו התאמות ויזואליות.' : 'לא נמצאה התאמה חזקה, מוצגות חיות בצבעים דומים.');
    setStatus(
      statusEl,
      currentResultBundle.kind === 'visual'
        ? `החיפוש הושלם. נמצאו ${currentResultBundle.matches.length} התאמות ויזואליות אפשריות.`
        : 'לא נמצאה התאמה ויזואלית חזקה, לכן מוצגות עכשיו חיות בצבעים דומים.',
      { tone: currentResultBundle.kind === 'visual' ? 'success' : 'warn' },
    );
    runSelectedBtn.disabled = false;
  }

  await loadModels(statusEl);
  currentLibrary = await getMergedLibrary();
  libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
  resetSearchProgress();
  updateTopActions(null);
  updatePrivacyNote();

  minScoreInput.addEventListener('input', () => {
    minScoreOutput.textContent = `${minScoreInput.value}%`;
  });
  showBoxInput.addEventListener('change', redrawPreview);
  useWholeBtn.addEventListener('click', () => {
    if (!currentPreviewImage) return;
    setSelection(fullImageRect(currentPreviewImage), 'נבחרה כל התמונה. אם יש גם אנשים בפריים, עדיף לסמן רק את החיה.');
  });

  locateBtn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      locationStatusEl.textContent = 'הדפדפן הזה לא תומך בגישה למיקום.';
      return;
    }
    locateBtn.disabled = true;
    locationStatusEl.textContent = 'מבקש הרשאה למיקום…';
    navigator.geolocation.getCurrentPosition((position) => {
      geoState = { lat: position.coords.latitude, lng: position.coords.longitude };
      const blurred = privacyBlurCoordinates(geoState.lat, geoState.lng, 100);
      locationStatusEl.textContent = `המיקום נשמר כאזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}`;
      locateBtn.disabled = false;
      updatePrivacyNote();
      updateTopActions(applyResultFilters(currentResultBundle));
    }, (error) => {
      locationStatusEl.textContent = `לא ניתן היה לקבל מיקום: ${error.message}`;
      locateBtn.disabled = false;
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

  [filterAnimalTypeEl, filterSourceEl, strongOnlyEl].forEach((element) => element.addEventListener('change', rerenderResults));

  shareTopBtn.addEventListener('click', async () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    const ok = await shareResult({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top });
    setStatus(statusEl, ok ? 'קישור ההתאמה הוכן לשיתוף.' : 'לא ניתן היה לשתף ישירות. נסי את כפתור הוואטסאפ או דיווח 106.', { tone: ok ? 'success' : 'warn' });
  });

  whatsappTopBtn.addEventListener('click', () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    window.open(buildWhatsAppHref({ city: cityInput.value, lat: geoState.lat, lng: geoState.lng, bestMatch: top }), '_blank', 'noopener');
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = safeJsonParse(text, null);
    if (!parsed || !Array.isArray(parsed.entries)) {
      setStatus(statusEl, 'קובץ ה-JSON הזה לא נראה כמו ייצוא תקין של המאגר.', { tone: 'warn' });
      return;
    }
    const sanitizedEntries = parsed.entries.map((entry) => normalizeEntry({ ...entry, source: 'imported' }))
      .filter((entry) => entry.descriptors.length || entry.colorHistograms.length);
    if (!sanitizedEntries.length) {
      setStatus(statusEl, 'בקובץ הזה עדיין אין רשומות חיה תקינות לשימוש.', { tone: 'warn' });
      return;
    }
    saveImportedLibrary(sanitizedEntries);
    currentLibrary = await getMergedLibrary();
    libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
    setStatus(statusEl, 'המאגר המיובא נוסף לדפדפן עבור הסשן הנוכחי.', { tone: 'success' });
    if (currentResultBundle) rerenderResults();
  });

  clearImportedBtn.addEventListener('click', async () => {
    saveImportedLibrary([]);
    currentLibrary = await getMergedLibrary();
    libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
    setStatus(statusEl, 'המאגר המיובא של הסשן נוקה.', { tone: 'success' });
    if (currentResultBundle) rerenderResults();
  });

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!setRequiredValidity(fileInput, 'נא לבחור תמונה לחיפוש.')) {
      setStatus(statusEl, 'בחרי תמונה כדי להתחיל.', { tone: 'warn' });
      return;
    }
    const file = fileInput.files?.[0];
    loadBtn.disabled = true;
    runSelectedBtn.disabled = true;
    resultsEl.innerHTML = '';
    summaryEl.innerHTML = '';
    summaryEl.classList.add('hidden');
    currentResultBundle = null;
    updateTopActions(null);
    clearLastMatchGallery();
    resetSearchProgress();

    try {
      currentPreviewImage = null;
      currentSelection = null;
      currentQueryFeatures = null;
      redrawPreview();
      cropImg.classList.add('hidden');
      cropMetaEl.textContent = 'עדיין לא נבחר אזור חיה.';
      prepNoteEl.textContent = '';

      setSearchProgress(8, 'מכין את התמונה לסריקה…');
      setStatus(statusEl, 'מכין את התמונה לסריקה…', { busy: true });
      const prepared = await shrinkImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.80 });
      try {
        currentPreviewImage = cropRectToCanvas(prepared.img, fullImageRect(prepared.img));
        currentSelection = defaultSelectionRect(currentPreviewImage);
        redrawPreview();
        updateSelectionPreview();
        runSelectedBtn.disabled = false;
        setSearchProgress(24, 'התמונה נדחסה ומוכנה להצגה.');
        prepNoteEl.textContent = prepared.wasResized
          ? `התמונה נדחסה מקומית מ-${prepared.originalWidth}×${prepared.originalHeight} ל-${prepared.width}×${prepared.height} כדי לזרז את החיפוש ברשת סלולרית.`
          : 'התמונה עובדה בגודל המקורי שלה.';
        selectionHintEl.textContent = 'גררי מלבן סביב החיה עצמה. אם יש גם אנשים בתמונה, חשוב לסמן רק את החיה.';
        setStatus(statusEl, 'התמונה נטענה. סַמְּנִי את אזור החיה או השאירי את ברירת המחדל, ואז לחצי על "חיפוש לפי האזור שסומן".', { tone: 'success' });
        await runSearch();
      } finally {
        prepared.cleanup();
      }
    } catch (error) {
      console.error(error);
      setSearchProgress(0, 'הסריקה נעצרה.');
      setStatus(statusEl, `החיפוש נכשל: ${error.message}`, { tone: 'warn' });
    } finally {
      loadBtn.disabled = false;
      runSelectedBtn.disabled = !currentPreviewImage;
    }
  });

  runSelectedBtn.addEventListener('click', async () => {
    try {
      await runSearch();
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `החיפוש נכשל: ${error.message}`, { tone: 'warn' });
    }
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!currentPreviewImage) return;
    canvas.setPointerCapture(event.pointerId);
    const point = imagePointFromEvent(canvas, currentPreviewImage, event);
    dragState = { active: true, startX: point.x, startY: point.y };
    currentSelection = normalizeDragRect(currentPreviewImage, point.x, point.y, point.x + 1, point.y + 1);
    redrawPreview();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragState.active || !currentPreviewImage) return;
    const point = imagePointFromEvent(canvas, currentPreviewImage, event);
    const rect = normalizeDragRect(currentPreviewImage, dragState.startX, dragState.startY, point.x, point.y);
    if (!rect) return;
    currentSelection = rect;
    redrawPreview();
  });
  function finishDrag(event) {
    if (!dragState.active || !currentPreviewImage) return;
    if (event) canvas.releasePointerCapture?.(event.pointerId);
    dragState.active = false;
    if (!currentSelection || currentSelection.width < 24 || currentSelection.height < 24) {
      currentSelection = defaultSelectionRect(currentPreviewImage);
    }
    updateSelectionPreview();
    setStatus(statusEl, 'אזור החיה עודכן. אפשר עכשיו ללחוץ על "חיפוש לפי האזור שסומן".', { tone: 'success' });
  }
  canvas.addEventListener('pointerup', finishDrag);
  canvas.addEventListener('pointercancel', finishDrag);
}

window.addEventListener('DOMContentLoaded', () => {
  runSearchPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById('status');
    (window.setStatus || fallbackSetStatus)(statusEl, `הטעינה נכשלה: ${error.message}`, { tone: 'warn' });
  });
});
