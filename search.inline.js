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
  const needed = [
    'registerServiceWorker',
    'setStatus',
    'extractAnimalFeatures',
    'buildWhatsAppHref',
    'shareResult',
    'reverseGeocodeLatLng',
    'attachBreedAutocomplete',
    'renderMatchCards',
    'buildCommunityWatchHref',
    'verifyChallengeAnswer',
  ];
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
  const queryAnimalTypeEl = document.getElementById('query-animal-type');
  const breedInput = document.getElementById('breed-name');
  const breedChipEl = document.getElementById('breed-suggestion-chips');
  const locationTextInput = document.getElementById('location-text');
  const reportedAtInput = document.getElementById('reported-at');
  const locateBtn = document.getElementById('locate-btn');
  const locationStatusEl = document.getElementById('location-status');
  const resultsSection = document.getElementById('results-section');
  const selectionHintEl = document.getElementById('selection-hint');
  const filterAnimalTypeEl = document.getElementById('filter-animal-type');
  const filterBreedEl = document.getElementById('filter-breed');
  const breedQuickFiltersEl = document.getElementById('breed-quick-filters');
  const filterSourceEl = document.getElementById('filter-source');
  const strongOnlyEl = document.getElementById('filter-strong-only');
  const shareTopBtn = document.getElementById('share-top-btn');
  const whatsappTopBtn = document.getElementById('whatsapp-top-btn');
  const communityTopBtn = document.getElementById('community-top-btn');
  const reportTopBtn = document.getElementById('report-top-btn');
  const privacyNoteEl = document.getElementById('privacy-note');
  const smartHintEl = document.getElementById('smart-hint');
  const radiusInput = document.getElementById('search-radius');
  const radiusNoteEl = document.getElementById('search-radius-note');
  const verificationModal = document.getElementById('verification-modal');
  const verificationTitleEl = document.getElementById('verification-title');
  const verificationPromptEl = document.getElementById('verification-prompt');
  const verificationAnswerEl = document.getElementById('verification-answer');
  const verificationResultEl = document.getElementById('verification-result');
  const verificationCheckBtn = document.getElementById('verification-check-btn');

  [fileInput, cityInput, queryAnimalTypeEl, breedInput].forEach(clearValidityOnInput);
  attachCityAutocomplete?.(cityInput);
  attachBreedAutocomplete?.(breedInput, queryAnimalTypeEl);
  minScoreOutput.textContent = `${minScoreInput.value}%`;

  let currentPreviewImage = null;
  let currentSelection = null;
  let currentLibrary = [];
  let currentResultBundle = null;
  let currentQueryFeatures = null;
  let geoState = { lat: null, lng: null };
  let dragState = { active: false, startX: 0, startY: 0 };
  let currentReportTimestamp = '';
  let currentVerificationMatch = null;

  function setSearchProgress(percent = 0, label = '') {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    progressFillEl.style.width = `${safePercent}%`;
    progressFillEl.setAttribute('aria-valuenow', String(Math.round(safePercent)));
    progressLabelEl.textContent = label || (safePercent >= 100 ? 'הסריקה הושלמה.' : `סריקה: ${Math.round(safePercent)}%`);
  }

  function resetSearchProgress() {
    setSearchProgress(0, 'ממתין לתמונה לחיפוש.');
  }

  function setSearchButtonsBusy(busy, label = 'מעבד…') {
    setButtonBusy?.(loadBtn, busy, label);
    setButtonBusy?.(runSelectedBtn, busy, 'מחפש…');
  }

  function setAutoTimestamp(date = new Date()) {
    currentReportTimestamp = typeof date === 'string' ? date : new Date(date).toISOString();
    reportedAtInput.value = formatReportedAt(currentReportTimestamp) || '';
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

  function updateRadiusNote() {
    if (!radiusNoteEl || !radiusInput) return;
    radiusNoteEl.textContent = `רדיוס החיפוש כרגע מוגדר ל-${radiusInput.value} ק"מ. בגרסת שרת+מפה הוא יוכל לשמש גם לציור מעגל Leaflet סביב הדיווח.`;
  }

  function openVerificationModal(match) {
    currentVerificationMatch = match || null;
    if (!verificationModal || !currentVerificationMatch) return;
    verificationTitleEl.textContent = `בדיקת סימן זיהוי: ${currentVerificationMatch.label || 'חיה ללא שם'}`;
    verificationPromptEl.textContent = currentVerificationMatch.verificationPrompt || 'אין שאלה פרטית זמינה לרשומה זו.';
    verificationAnswerEl.value = '';
    verificationResultEl.textContent = 'התשובה לא נשלחת לשום שרת — ההשוואה נעשית בדפדפן.';
    if (typeof verificationModal.showModal === 'function') verificationModal.showModal();
    else verificationModal.setAttribute('open', 'open');
  }

  function renderBreedChips(type = '', preferredBreed = '') {
    if (!breedChipEl) return;
    const breeds = getBreedsForType(type);
    if (!breeds.length) {
      breedChipEl.innerHTML = '<div class="small">אפשר להשאיר גזע ריק, או לבחור אותו אחרי שקיבלת התאמות ראשוניות.</div>';
      return;
    }
    breedChipEl.innerHTML = breeds.map((breed) => `
      <button class="chip-btn ${breed === preferredBreed ? 'active' : ''}" type="button" data-breed="${escapeHtml(breed)}">${escapeHtml(breed)}</button>
    `).join('');
    breedChipEl.querySelectorAll('[data-breed]').forEach((button) => {
      button.addEventListener('click', () => {
        breedInput.value = button.dataset.breed || '';
        renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim());
        setStatus(statusEl, `הגזע "${breedInput.value}" נוסף לחיפוש כדי לשפר את הדירוג.`, { tone: 'success' });
      });
    });
  }

  function suggestBreedFromResults(bundle) {
    if (!smartHintEl) return;
    const breeds = (bundle?.matches || []).map((match) => String(match.breed || '').trim()).filter(Boolean).slice(0, 5);
    if (breedInput.value.trim()) {
      smartHintEl.textContent = 'שדה הגזע משמש לשיפור הדירוג. אפשר למחוק אותו אם אינך בטוחה.';
      return;
    }
    if (!breeds.length) {
      smartHintEl.textContent = 'אם אינך בטוחה בגזע, השאירי את השדה ריק. אחרי הסריקה נציע גזעים נפוצים לפי סוג החיה ולפי התוצאות המובילות.';
      renderBreedChips(queryAnimalTypeEl.value, '');
      return;
    }
    const tally = new Map();
    breeds.forEach((breed) => tally.set(breed, (tally.get(breed) || 0) + 1));
    const suggested = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    if (suggested) {
      smartHintEl.textContent = `לפי התוצאות הראשונות, כדאי לבדוק גם את הגזע "${suggested}".`;
      renderBreedChips(queryAnimalTypeEl.value || (bundle?.matches?.[0]?.animalType || ''), suggested);
    }
  }

  function isStrongMatch(match, kind) {
    if (kind === 'visual') return Number(match.score || 0) >= 0.75;
    return Number(match.colorScore || match.score || 0) >= 0.72;
  }

  function applyResultFilters(bundle) {
    if (!bundle) return { kind: 'visual', matches: [] };
    const selectedType = filterAnimalTypeEl.value;
    const selectedBreed = filterBreedEl.value;
    const selectedSource = filterSourceEl.value;
    const strongOnly = strongOnlyEl.checked;
    const filtered = (bundle.matches || []).filter((match) => {
      if (selectedType && (match.animalType || '') !== selectedType) return false;
      if (selectedBreed && (match.breed || '') !== selectedBreed) return false;
      if (selectedSource && (match.source || '') !== selectedSource) return false;
      if (strongOnly && !isStrongMatch(match, bundle.kind)) return false;
      return true;
    });
    return { ...bundle, matches: filtered };
  }

  function refreshResultFilters(bundle) {
    const types = Array.from(new Set((bundle?.matches || []).map((match) => (match.animalType || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he'));
    const breeds = Array.from(new Set((bundle?.matches || []).map((match) => (match.breed || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he'));
    const previous = filterAnimalTypeEl.value;
    const previousBreed = filterBreedEl.value;
    filterAnimalTypeEl.innerHTML = '<option value="">כל הסוגים</option>' + types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
    filterBreedEl.innerHTML = '<option value="">כל הגזעים</option>' + breeds.map((breed) => `<option value="${escapeHtml(breed)}">${escapeHtml(breed)}</option>`).join('');
    if (types.includes(previous)) filterAnimalTypeEl.value = previous;
    if (breeds.includes(previousBreed)) filterBreedEl.value = previousBreed;
    if (breedQuickFiltersEl) {
      breedQuickFiltersEl.innerHTML = breeds.length
        ? breeds.slice(0, 10).map((breed) => `<button class="chip-btn ${filterBreedEl.value === breed ? 'active' : ''}" type="button" data-quick-breed="${escapeHtml(breed)}">${escapeHtml(breed)}</button>`).join('')
        : '';
      breedQuickFiltersEl.querySelectorAll('[data-quick-breed]').forEach((button) => {
        button.addEventListener('click', () => {
          filterBreedEl.value = button.dataset.quickBreed || '';
          refreshResultFilters(bundle);
          if (currentResultBundle) rerenderResults();
        });
      });
    }
  }

  function updateTopActions(bundle) {
    const top = bundle?.matches?.[0];
    const disabled = !top;
    shareTopBtn.disabled = disabled;
    whatsappTopBtn.disabled = disabled;
    communityTopBtn.disabled = disabled;
    reportTopBtn.classList.toggle('disabled-link', disabled);
    reportTopBtn.href = buildMunicipalReportHref({
      city: cityInput.value,
      locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(),
      reportedAt: currentReportTimestamp,
      lat: geoState.lat,
      lng: geoState.lng,
      bestMatch: top || null,
    });
  }

  function classifyResultState(bundle) {
    const top = bundle?.matches?.[0];
    if (!top) return { band: 'empty', score: 0 };
    const score = bundle.kind === 'visual' ? Number(top.score || 0) : Number(top.colorScore || top.score || 0);
    if (bundle.kind !== 'visual') return { band: 'fallback', score };
    if (score >= 0.9) return { band: 'high', score };
    if (score >= 0.6) return { band: 'medium', score };
    return { band: 'low', score };
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
    const resultState = classifyResultState(bundle);
    const wrapperClass = resultState.band === 'medium' ? 'result-grid result-grid--swipe' : 'result-grid';
    resultsEl.innerHTML = `<div class="${wrapperClass}">${renderMatchCards(matches, { kind: bundle.kind })}</div>`;
  }

  function renderSummary(bundle) {
    const top = bundle.matches?.[0];
    if (!top) {
      summaryEl.innerHTML = '';
      summaryEl.classList.add('hidden');
      return;
    }
    const state = classifyResultState(bundle);
    const score = bundle.kind === 'visual' ? Number(top.score || 0) : Number(top.colorScore || top.score || 0);
    const scoreLabel = bundle.kind === 'visual' ? `${Math.round(score * 100)}% התאמה` : `צבע ${Math.round(score * 100)}%`;
    const topThumb = top.thumb ? `<img class="summary-hero-thumb blur-up is-loading" loading="lazy" decoding="async" onload="this.classList.remove('is-loading')" src="${top.thumb}" alt="${escapeHtml(top.label)}">` : '';
    let title = 'תוצאת החיפוש';
    let text = 'התוצאות מוצגות כאן.';
    if (state.band === 'high') {
      title = 'נמצאה התאמה חזקה מאוד';
      text = 'זה הזמן הטוב ביותר לפתוח מיד את הכרטיס הראשון ולשתף את ההתאמה.';
    } else if (state.band === 'medium') {
      title = 'נמצאו התאמות אפשריות';
      text = 'כדאי לעבור על המועמדים ולבדוק את התמונות והפרטים.';
    } else if (state.band === 'low') {
      title = 'ההתאמה חלשה כרגע';
      text = 'מומלץ לנסות שוב עם תמונה קרובה יותר או בחירת אזור מדויקת יותר של החיה.';
    } else if (state.band === 'fallback') {
      title = 'אין התאמה ויזואלית חזקה';
      text = 'הנה חיות בצבעים דומים שעדיין שווה לבדוק.';
    }
    summaryEl.innerHTML = `
      <div class="summary-hero summary-hero--${state.band}">
        ${topThumb}
        <div class="summary-hero-body stack">
          <div class="chip">${escapeHtml(title)}</div>
          <h3 style="margin:0;">${escapeHtml(top.label)}</h3>
          <div class="summary-hero-meta">${top.animalType ? `${escapeHtml(top.animalType)} · ` : ''}${top.breed ? `${escapeHtml(top.breed)} · ` : ''}${escapeHtml(top.colors || top.colorName || 'צבע מעורב')}</div>
          <div class="score-pill ${escapeHtml(String(top.confidence || 'medium'))}">${scoreLabel}</div>
          <div class="small">${escapeHtml(text)}</div>
          <div class="small">${reportedAtInput.value ? `דווח אוטומטית ב-${escapeHtml(reportedAtInput.value)}.` : ''} ${locationTextInput.value ? `אזור: ${escapeHtml(locationTextInput.value)}.` : ''}</div>
          <div class="summary-actions">
            <button id="share-inline" class="small" type="button">שיתוף עכשיו</button>
            <button id="whatsapp-inline" class="secondary small" type="button">וואטסאפ</button>
            ${state.band === 'low' ? '<button id="retry-search-inline" class="secondary small" type="button">בחירת אזור חדש</button>' : ''}
          </div>
        </div>
      </div>`;
    summaryEl.classList.remove('hidden');
    summaryEl.querySelector('#share-inline')?.addEventListener('click', async () => {
      const ok = await shareResult({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top });
      setStatus(statusEl, ok ? 'קישור ההתאמה הוכן לשיתוף.' : 'לא ניתן היה לשתף ישירות. נסי את כפתור הוואטסאפ או דיווח 106.', { tone: ok ? 'success' : 'warn' });
    });
    summaryEl.querySelector('#whatsapp-inline')?.addEventListener('click', () => {
      window.open(buildWhatsAppHref({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top }), '_blank', 'noopener');
    });
    summaryEl.querySelector('#retry-search-inline')?.addEventListener('click', () => {
      document.getElementById('preview-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setStatus(statusEl, 'בחרי אזור חדש סביב החיה ונסי שוב. תמונה קרובה יותר בדרך כלל תשפר את התוצאה.', { tone: 'warn' });
    });
  }

  function rerenderResults() {
    const filteredBundle = applyResultFilters(currentResultBundle);
    renderSummary(filteredBundle);
    renderResults(filteredBundle);
    updateTopActions(filteredBundle);
    saveLastMatchGallery(filteredBundle, {
      city: cityInput.value,
      pageUrl: window.location.href,
      reportedAt: currentReportTimestamp,
      locationText: locationTextInput.value,
    });
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

    setSearchButtonsBusy(true, 'מנתח תמונה…');
    setStatus(statusEl, 'סורק את אזור החיה ומחפש התאמות…', { busy: true });
    setSearchProgress(34, 'מכין את אזור החיה להשוואה…');
    const queryCanvas = cropRectToCanvas(currentPreviewImage, currentSelection);
    setSearchProgress(62, 'מפיק מאפיינים ויזואליים…');
    currentQueryFeatures = await extractAnimalFeatures(queryCanvas);
    setSearchProgress(84, 'משווה מול המאגר ומסנן תוצאות…');
    currentResultBundle = computeSearchResults(currentQueryFeatures, currentLibrary, {
      minScore: Math.max(0.35, Math.min(0.9, Number(minScoreInput.value) / 100)),
      queryAnimalType: queryAnimalTypeEl.value,
      queryBreed: breedInput.value,
    });
    refreshResultFilters(currentResultBundle);
    rerenderResults();
    suggestBreedFromResults(currentResultBundle);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSearchProgress(100, currentResultBundle.kind === 'visual' ? 'נסרקו התאמות ויזואליות.' : 'לא נמצאה התאמה חזקה, מוצגות חיות בצבעים דומים.');
    const state = classifyResultState(currentResultBundle);
    recordImpactEvent('search');
    if (state.band === 'high') {
      recordImpactEvent('strong-match');
      setStatus(statusEl, `נמצאה התאמה חזקה מאוד של ${Math.round(state.score * 100)}%. מומלץ לפתוח מיד את הכרטיס הראשון.`, { tone: 'success' });
    } else if (state.band === 'medium') {
      setStatus(statusEl, 'נמצאו כמה מועמדים טובים. עברי על הגלריה והשווי בין הכרטיסים.', { tone: 'success' });
    } else if (state.band === 'low') {
      setStatus(statusEl, 'נמצאו תוצאות חלשות בלבד. עדיף לנסות חיפוש נוסף עם אזור מדויק יותר או תמונה מזווית אחרת.', { tone: 'warn' });
    } else {
      setStatus(statusEl, 'לא נמצאה התאמה ויזואלית חזקה, לכן מוצגות עכשיו חיות בצבעים דומים.', { tone: 'warn' });
    }
    setSearchButtonsBusy(false);
  }

  await loadModels(statusEl);
  currentLibrary = await getMergedLibrary();
  libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
  resetSearchProgress();
  updateTopActions(null);
  updatePrivacyNote();
  updateRadiusNote();
  renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim());

  minScoreInput.addEventListener('input', () => {
    minScoreOutput.textContent = `${minScoreInput.value}%`;
  });
  radiusInput?.addEventListener('input', () => {
    updateRadiusNote();
    updateTopActions(applyResultFilters(currentResultBundle));
  });
  showBoxInput.addEventListener('change', redrawPreview);
  queryAnimalTypeEl.addEventListener('input', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  queryAnimalTypeEl.addEventListener('change', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  breedInput.addEventListener('input', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      setAutoTimestamp(new Date());
      setStatus(statusEl, 'התמונה נבחרה. זמן הדיווח נשמר אוטומטית.', { tone: 'success' });
    }
  });
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
    navigator.geolocation.getCurrentPosition(async (position) => {
      geoState = { lat: position.coords.latitude, lng: position.coords.longitude };
      const blurred = privacyBlurCoordinates(geoState.lat, geoState.lng, 100);
      locationStatusEl.textContent = `המיקום נשמר כאזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}`;
      locationTextInput.value = `אזור משוער: ${formatCoordinates(blurred.lat, blurred.lng)}`;
      try {
        const resolved = await reverseGeocodeLatLng(geoState.lat, geoState.lng, 'he');
        if (resolved?.city && !cityInput.value.trim()) cityInput.value = resolved.city;
        if (resolved?.display) locationTextInput.value = resolved.display;
        locationStatusEl.textContent = resolved?.city ? `הכתובת הוערכה ל-${resolved.city}.` : locationStatusEl.textContent;
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
      } finally {
        locateBtn.disabled = false;
        updatePrivacyNote();
        updateTopActions(applyResultFilters(currentResultBundle));
      }
    }, (error) => {
      locationStatusEl.textContent = `לא ניתן היה לקבל מיקום: ${error.message}`;
      locateBtn.disabled = false;
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

  [filterAnimalTypeEl, filterBreedEl, filterSourceEl, strongOnlyEl].forEach((element) => element.addEventListener('change', () => {
    if (currentResultBundle) rerenderResults();
  }));

  shareTopBtn.addEventListener('click', async () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    const ok = await shareResult({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top });
    setStatus(statusEl, ok ? 'קישור ההתאמה הוכן לשיתוף.' : 'לא ניתן היה לשתף ישירות. נסי את כפתור הוואטסאפ או דיווח 106.', { tone: ok ? 'success' : 'warn' });
  });

  whatsappTopBtn.addEventListener('click', () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    window.open(buildWhatsAppHref({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top }), '_blank', 'noopener');
  });

  communityTopBtn.addEventListener('click', () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    window.open(buildCommunityWatchHref({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top }), '_blank', 'noopener');
  });

  verificationCheckBtn?.addEventListener('click', async () => {
    if (!currentVerificationMatch) return;
    const answer = verificationAnswerEl.value.trim();
    if (!answer) {
      verificationResultEl.textContent = 'צריך להזין תשובה כדי לבצע בדיקה.';
      return;
    }
    verificationCheckBtn.disabled = true;
    try {
      const ok = await verifyChallengeAnswer(currentVerificationMatch, answer);
      verificationResultEl.textContent = ok
        ? 'התשובה מתאימה לסימן הזיהוי. אפשר להמשיך לשיתוף/יצירת קשר.'
        : 'התשובה לא התאימה. כדאי לבקש עוד פרט מזהה או לנסות מועמד אחר.';
      verificationResultEl.className = ok ? 'notice success' : 'notice warn';
    } catch (error) {
      verificationResultEl.textContent = `הבדיקה נכשלה: ${error.message}`;
      verificationResultEl.className = 'notice warn';
    } finally {
      verificationCheckBtn.disabled = false;
    }
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

  resultsEl.addEventListener('click', (event) => {
    const verifyButton = event.target.closest('[data-verify-index]');
    if (!verifyButton || !currentResultBundle?.matches?.length) return;
    const filtered = applyResultFilters(currentResultBundle).matches || [];
    const match = filtered[Number(verifyButton.dataset.verifyIndex)];
    if (!match?.verificationPrompt) return;
    openVerificationModal(match);
  });

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!setRequiredValidity(fileInput, 'נא לבחור תמונה לחיפוש.')) {
      setStatus(statusEl, 'בחרי תמונה כדי להתחיל.', { tone: 'warn' });
      return;
    }
    const file = fileInput.files?.[0];
    if (!currentReportTimestamp) setAutoTimestamp(new Date());
    setSearchButtonsBusy(true, 'מכין תמונה…');
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
      const prepared = await shrinkImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
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
        setStatus(statusEl, 'התמונה נטענה. סמני את אזור החיה או השאירי את ברירת המחדל, ואז לחצי על "חיפוש לפי האזור שסומן".', { tone: 'success' });
        await runSearch();
      } finally {
        prepared.cleanup();
      }
    } catch (error) {
      console.error(error);
      setSearchProgress(0, 'הסריקה נעצרה.');
      setStatus(statusEl, `החיפוש נכשל: ${error.message}`, { tone: 'warn' });
    } finally {
      setButtonBusy?.(loadBtn, false);
      setButtonBusy?.(runSelectedBtn, !currentPreviewImage, 'חיפוש לפי האזור שסומן');
      if (!currentPreviewImage) runSelectedBtn.disabled = true;
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
