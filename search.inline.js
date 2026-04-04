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
    'loadAnimalDetector',
    'detectSubjects',
    'pickBestAnimalDetection',
    'applyCircleMask',
    'cropRectToDataUrlMasked',
    'getConnectionProfile',
    'buildConnectionHint',
    'requestNeighborhoodAlertsPermission',
    'shareCommunityFlyer',
    'savePendingFoundReportDraft',
    'estimateAnimalSizeLabel',
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
  window.mountLanguageSwitcher?.();
  window.registerServiceWorker?.();
  window.flushQueuedBackgroundReports?.().catch(() => {});

  const statusEl = document.getElementById('status');
  const searchForm = document.getElementById('search-form');
  const fileInput = document.getElementById('query-file');
  const loadBtn = document.getElementById('search-btn');
  const runSelectedBtn = document.getElementById('run-selected-btn');
  const smartScanBtn = document.getElementById('smart-scan-btn');
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
  const detectionStatusEl = document.getElementById('detection-status');
  const subjectOnlyToggle = document.getElementById('subject-only-toggle');
  const circleMaskToggle = document.getElementById('circle-mask-toggle');
  const filterAnimalTypeEl = document.getElementById('filter-animal-type');
  const filterBreedEl = document.getElementById('filter-breed');
  const breedQuickFiltersEl = document.getElementById('breed-quick-filters');
  const filterSourceEl = document.getElementById('filter-source');
  const strongOnlyEl = document.getElementById('filter-strong-only');
  const shareTopBtn = document.getElementById('share-top-btn');
  const whatsappTopBtn = document.getElementById('whatsapp-top-btn');
  const communityTopBtn = document.getElementById('community-top-btn');
  const posterTopBtn = document.getElementById('poster-top-btn');
  const printPosterTopBtn = document.getElementById('print-poster-top-btn');
  const alertOptInBtn = document.getElementById('alert-optin-btn');
  const lowDataToggle = document.getElementById('low-data-toggle');
  const connectionNoteEl = document.getElementById('connection-note');
  const reportTopBtn = document.getElementById('report-top-btn');
  const reportDirectBtn = document.getElementById('report-direct-btn');
  const reportCtaContainer = document.getElementById('report-cta-container');
  const stickyReportBar = document.getElementById('sticky-report-bar');
  const stickyReportBtn = document.getElementById('sticky-report-btn');
  const stickyQuickBtn = document.getElementById('sticky-quick-btn');
  const searchMode = (new URLSearchParams(window.location.search).get('mode') || sessionStorage.getItem('petconnect-search-mode-v1') || 'found').toLowerCase() === 'lost' ? 'lost' : 'found';
  try { sessionStorage.setItem('petconnect-search-mode-v1', searchMode); } catch (error) {}

  function getReportKindForSearchMode() {
    return searchMode === 'lost' ? 'missing' : 'found';
  }

  function getSearchToReportTitle() {
    return searchMode === 'lost' ? 'לא נמצאה התאמה? פרסמי מודעת אובדן עם אותה תמונה.' : 'לא נמצאה התאמה? פרסמי עכשיו דיווח על חיה שנמצאה עם אותה תמונה — בלי להעלות שוב.';
  }

  function hydrateSearchModeUi() {
    document.getElementById('sticky-report-bar')?.querySelector('strong')?.replaceChildren(document.createTextNode(searchMode === 'lost' ? 'לא נמצאה התאמה לחיה שלך?' : 'לא נמצאה התאמה?'));
    const stickyText = document.getElementById('sticky-report-bar')?.querySelector('.small');
    if (stickyText) stickyText.textContent = searchMode === 'lost' ? 'הפכי את אותה תמונה למודעת אובדן — בלי להעלות שוב.' : 'הפכי את התמונה שכבר חיפשת לדיווח על חיה שנמצאה — בלי להעלות שוב.';
    if (stickyReportBtn) stickyReportBtn.textContent = searchMode === 'lost' ? 'פרסמי מודעת אובדן' : 'פרסמי עכשיו כחיה שנמצאה';
    if (stickyQuickBtn) stickyQuickBtn.textContent = searchMode === 'lost' ? 'מודעת אובדן מהירה' : 'דיווח מהיר';
    const reportDirectBtn = document.getElementById('report-direct-btn');
    if (reportDirectBtn) reportDirectBtn.textContent = searchMode === 'lost' ? 'יצירת מודעת אובדן' : 'דיווח כחיה שנמצאה';
  }
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
  const initialConnectionProfile = getConnectionProfile?.() || { weak: false, label: 'מצב רגיל' };
  if (lowDataToggle) lowDataToggle.checked = Boolean(initialConnectionProfile.weak);
  if (connectionNoteEl) connectionNoteEl.textContent = buildConnectionHint?.(initialConnectionProfile) || '';


  let currentPreviewImage = null;
  let currentSelection = null;
  let currentLibrary = [];
  let currentResultBundle = null;
  let currentQueryFeatures = null;
  let currentDetections = { animals: [], people: [], raw: [] };
  let geoState = { lat: null, lng: null };
  let dragState = { active: false, startX: 0, startY: 0 };
  let currentReportTimestamp = '';

function convertToReport() {
  goToReport();
}
window.convertToReport = convertToReport;
  let currentVerificationMatch = null;
  const PENDING_CAPTURE_KEY = 'petconnect-home-pending-capture-v1';


  function animateReportTransition() {
    const source = cropImg && !cropImg.classList.contains('hidden') ? cropImg : canvas;
    if (!source || typeof document === 'undefined') return Promise.resolve();
    let src = '';
    if (source.tagName === 'IMG' && source.src) src = source.src;
    if (!src && currentPreviewImage && currentSelection) {
      try { src = cropRectToDataUrlMasked(currentPreviewImage, currentSelection, 420, circleMaskToggle?.checked ? 'circle' : 'rect'); } catch (error) { console.warn(error); }
    }
    if (!src) return Promise.resolve();
    const rect = source.getBoundingClientRect();
    const ghost = document.createElement('img');
    ghost.src = src;
    ghost.className = 'flying-report-image';
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${Math.max(88, rect.width)}px`;
    ghost.style.height = `${Math.max(88, rect.height)}px`;
    document.body.appendChild(ghost);
    const targetX = window.innerWidth - 88;
    const targetY = window.innerHeight - 124;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${targetX - rect.left}px, ${targetY - rect.top}px) scale(0.2) rotate(-8deg)`;
      ghost.style.opacity = '0';
    });
    return new Promise((resolve) => {
      window.setTimeout(() => {
        ghost.remove();
        resolve();
      }, 280);
    });
  }

  async function processInputImageBlob(fileOrBlob, sourceLabel = 'מכין את התמונה לסריקה…') {
    if (!fileOrBlob) return false;
    if (!currentReportTimestamp) setAutoTimestamp(new Date());
    setSearchButtonsBusy(true, 'מכין תמונה…');
    resultsEl.innerHTML = '';
    summaryEl.innerHTML = '';
    summaryEl.classList.add('hidden');
    currentResultBundle = null;
    updateTopActions(null);
    renderReportCta(null);
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
      setStatus(statusEl, sourceLabel, { busy: true });
      const connectionBase = getConnectionProfile?.() || {};
      const connectionProfile = { ...connectionBase, weak: Boolean(lowDataToggle?.checked) || Boolean(connectionBase.weak) };
      const prepared = await shrinkImage(fileOrBlob, {
        connectionProfile,
        maxWidth: connectionProfile.weak ? 224 : 1200,
        maxHeight: connectionProfile.weak ? 224 : 1200,
        quality: connectionProfile.weak ? 0.72 : 0.82,
      });
      try {
        currentPreviewImage = cropRectToCanvas(prepared.img, fullImageRect(prepared.img));
        currentSelection = defaultSelectionRect(currentPreviewImage);
        if (subjectOnlyToggle?.checked) {
          try {
            await runSmartAnimalScan(currentPreviewImage);
          } catch (smartError) {
            console.warn('Smart scan failed:', smartError);
            updateDetectionStatus('❌ הסריקה החכמה לא הצליחה. אפשר להמשיך עם סימון ידני.', 'warn');
          }
        }
        redrawPreview();
        updateSelectionPreview();
        runSelectedBtn.disabled = false;
        setSearchProgress(24, 'התמונה נדחסה ומוכנה להצגה.');
        prepNoteEl.textContent = prepared.wasResized
          ? `התמונה נדחסה מקומית מ-${prepared.originalWidth}×${prepared.originalHeight} ל-${prepared.width}×${prepared.height}. בנוסף, מנוע ההתאמה מנרמל פנימית עותק בגודל 512×512 בגווני אפור כדי לייצב את ההשוואה.${(lowDataToggle?.checked || connectionProfile.weak) ? ' כרגע מופעל מצב חסכוני כדי לעבוד גם עם קליטה חלשה.' : ''}`
          : `התמונה נשמרה בגודל המקורי להצגה, אך מנוע ההתאמה מנרמל פנימית עותק בגודל 512×512 בגווני אפור.${(lowDataToggle?.checked || connectionProfile.weak) ? ' כרגע מופעל מצב חסכוני כדי לעבוד גם עם קליטה חלשה.' : ''}`;
        selectionHintEl.textContent = 'גררי מלבן סביב החיה עצמה. אם יש גם אנשים בתמונה, חשוב לסמן רק את החיה. אפשר גם ללחוץ על סריקה חכמה של החיה.';
        setStatus(statusEl, 'התמונה נטענה. אם צריך, תקני את אזור החיה ידנית ואז לחצי על "חיפוש לפי האזור שסומן".', { tone: 'success' });
        await runSearch();
      } finally {
        prepared.cleanup();
      }
      return true;
    } catch (error) {
      console.error(error);
      setSearchProgress(0, 'הסריקה נעצרה.');
      setStatus(statusEl, `החיפוש נכשל: ${error.message}`, { tone: 'warn' });
      return false;
    } finally {
      setButtonBusy?.(loadBtn, false);
      setButtonBusy?.(runSelectedBtn, !currentPreviewImage, 'חיפוש לפי האזור שסומן');
      if (!currentPreviewImage) runSelectedBtn.disabled = true;
    }
  }

  async function hydratePendingCaptureFromHome() {
    try {
      const pending = sessionStorage.getItem(PENDING_CAPTURE_KEY);
      if (!pending) return;
      sessionStorage.removeItem(PENDING_CAPTURE_KEY);
      const blob = await (await fetch(pending)).blob();
      await processInputImageBlob(blob, 'התמונה מהמצלמה הועברה אוטומטית מדף הבית.');
    } catch (error) {
      console.warn('Pending home capture failed:', error);
    }
  }

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
    document.body.classList.toggle('search-loading-pulse', Boolean(busy));
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
  function updateDetectionStatus(message, tone = 'default') {
    if (!detectionStatusEl) return;
    detectionStatusEl.textContent = message;
    detectionStatusEl.classList.remove('success', 'warn');
    if (tone === 'success') detectionStatusEl.classList.add('success');
    if (tone === 'warn') detectionStatusEl.classList.add('warn');
  }

  async function runSmartAnimalScan(source, options = {}) {
    updateDetectionStatus('מנסה לזהות את החיה אוטומטית…');
    const detections = await detectSubjects(source, { minScore: 0.28 });
    currentDetections = detections;
    const bestAnimal = pickBestAnimalDetection(detections);
    if (bestAnimal?.rect) {
      const label = bestAnimal.class === 'dog' ? 'כלב' : bestAnimal.class === 'cat' ? 'חתול' : bestAnimal.class;
      const confidencePct = Math.round(Number(bestAnimal.score || 0) * 100);
      const expandedNote = bestAnimal.autoExpanded ? ' האזור הורחב אוטומטית כדי לכלול יותר מגוף החיה.' : '';
      setSelection(bestAnimal.rect, `✅ זוהתה חיה מסוג ${label}.${expandedNote}`);
      const peopleCount = detections.people?.length || 0;
      const tinyNote = bestAnimal.tiny ? ' הזיהוי הראשוני היה קטן, לכן הרחבנו את האזור סביב החיה.' : '';
      const confidenceNote = confidencePct && confidencePct < 70
        ? ` נראה לנו שזה ${label}, אבל אפשר לתקן ידנית אם צריך (${confidencePct}% ביטחון).`
        : confidencePct ? ` (${confidencePct}% ביטחון).` : '';
      updateDetectionStatus(`✅ זוהתה חיה אוטומטית${peopleCount ? ` · ${peopleCount} אזורי אדם יישארו מחוץ לזום ככל האפשר` : ''}.${tinyNote}${confidenceNote}`, confidencePct && confidencePct < 55 ? 'warn' : 'success');
      vibrateIfPossible?.(18);
      selectionHintEl.textContent = bestAnimal.tiny
        ? 'הסריקה החכמה מצאה את החיה אבל הרחיבה את האזור אוטומטית. אפשר עדיין לגרור ידנית אם צריך לכלול יותר מהגוף.'
        : confidencePct && confidencePct < 70
          ? 'המערכת מצאה אזור שנראה כמו חיה, אבל אפשר לגרור ידנית אם רוצים לדייק.'
          : 'הסריקה החכמה בחרה אזור סביב החיה. אפשר עדיין לגרור ידנית אם צריך לתקן.';
      return true;
    }
    if ((detections.people?.length || 0) && !(detections.animals?.length || 0)) {
      updateDetectionStatus('❌ זוהה אדם אבל לא זוהתה חיה. נסי תמונה שבה החיה גדולה וברורה יותר, או סמני ידנית את החיה.', 'warn');
      selectionHintEl.textContent = 'לא נמצאה חיה אוטומטית. אפשר עדיין לגרור ידנית אזור סביב החיה ולחפש.';
      return false;
    }
    updateDetectionStatus('❌ לא זוהתה חיה אוטומטית. אפשר לגרור ידנית את אזור החיה ולהמשיך.', 'warn');
    return false;
  }

  function openVerificationModal(match) {
    currentVerificationMatch = match || null;
    if (!verificationModal || !currentVerificationMatch) return;
    verificationTitleEl.textContent = `בדיקת סימן זיהוי: ${currentVerificationMatch.label || 'חיה ללא שם'}`;
    verificationPromptEl.textContent = currentVerificationMatch.verificationPrompt || 'אין שאלה פרטית זמינה לרשומה זו.';
    verificationAnswerEl.value = '';
    verificationResultEl.textContent = 'האימות נשמר פרטי ומאובטח.';
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
    if (posterTopBtn) posterTopBtn.disabled = disabled;
    if (printPosterTopBtn) printPosterTopBtn.disabled = disabled;
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
    document.body.classList.toggle('has-preview-image', Boolean(currentPreviewImage));
    if (!currentPreviewImage) {
      cropImg.classList.add('hidden');
      cropMetaEl.textContent = 'עדיין לא נבחר אזור חיה.';
      return;
    }
    const rect = currentSelection || fullImageRect(currentPreviewImage);
    const maskShape = circleMaskToggle?.checked ? 'circle' : 'rect';
    cropImg.src = cropRectToDataUrlMasked(currentPreviewImage, rect, 320, maskShape);
    cropImg.classList.remove('hidden');
    const previewCanvas = cropRectToCanvas(currentPreviewImage, rect);
    const featureCanvas = circleMaskToggle?.checked ? applyCircleMask(previewCanvas) : previewCanvas;
    const colorProfile = extractColorProfile(featureCanvas);
    cropMetaEl.innerHTML = `האזור שנבחר: ${Math.round(rect.width)}×${Math.round(rect.height)} פיקסלים · צבע דומיננטי משוער: <span class="color-chip"><span class="swatch" style="background:${colorProfile.avgHex};"></span>${escapeHtml(colorProfile.colorName)}</span>${circleMaskToggle?.checked ? ' · מסכה עגולה פעילה' : ''}`;
  }

  function setSelection(rect, message = '') {
    currentSelection = rect ? clampRectToImage(currentPreviewImage, rect) : fullImageRect(currentPreviewImage);
    redrawPreview();
    updateSelectionPreview();
    if (message) setStatus(statusEl, message, { tone: 'success' });
    runSelectedBtn.disabled = !currentPreviewImage;
  }



  function buildZeroResultsCtaCard() {
    const reportKind = getReportKindForSearchMode();
    const title = reportKind === 'missing' ? 'לא מצאת את החיה?' : 'לא נמצאה התאמה?';
    const desc = reportKind === 'missing'
      ? 'אל תעצרי כאן. אפשר להפוך את אותה תמונה למודעת אובדן ברגע אחד — בלי להעלות שוב.'
      : 'אל תתנו להם להישאר לבד. פרסמו דיווח "חיה שנמצאה" עם התמונה הזו ברגע אחד.';
    const cta = reportKind === 'missing' ? 'הפוך למודעת אובדן עכשיו' : 'הפוך לדיווח עכשיו';
    return `
      <div class="card notice success zero-results-cta-card">
        <div class="chip">חיפוש → דיווח</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(desc)}</p>
        <button id="zero-results-report-btn" class="action-btn strong-cta" type="button">${escapeHtml(cta)}</button>
      </div>`;
  }

function renderLoadingResultsSkeleton() {
  resultsEl.innerHTML = buildSearchSkeleton?.(3) || '<div class="empty">טוען תוצאות…</div>';
  summaryEl.innerHTML = '<div class="search-skeleton-grid"><div class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-line medium"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div><div class="skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-line medium"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>';
  summaryEl.classList.remove('hidden');
}

  function renderResults(bundle) {
    const matches = bundle.matches || [];
    if (!matches.length) {
      resultsEl.innerHTML = `${buildZeroResultsCtaCard()}<div class="empty">אין כרגע תוצאות להצגה.</div>`;
      resultsEl.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      resultsEl.querySelector('#zero-results-report-btn')?.addEventListener('click', () => goToReport());
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
      const confettiKey = `${top.id || top.label || 'top'}:${Math.round(score * 100)}`;
      if (window.__petconnectLastConfettiKey !== confettiKey) {
        window.__petconnectLastConfettiKey = confettiKey;
        window.launchConfettiBurst?.({ count: 22 });
        window.vibrateIfPossible?.([20, 30, 20]);
      }
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
          <div class="small muted">שילוב ציונים: הטמעה/מבנה ${Math.round(Number(top.embeddingScore || top.rawScore || 0) * 100)}% · צבע פרווה ${Math.round(Number(top.colorScore || 0) * 100)}%${Number(top.breedScore || 0) ? ` · גזע ${Math.round(Number(top.breedScore || 0) * 100)}%` : ''}</div>
          <div class="small">${reportedAtInput.value ? `דווח אוטומטית ב-${escapeHtml(reportedAtInput.value)}.` : ''} ${locationTextInput.value ? `אזור: ${escapeHtml(locationTextInput.value)}.` : ''}</div>
          ${state.band === 'high' ? `<div class="match-safety-card"><strong>מגן בטיחות למפגש</strong><ul><li>עדיף להיפגש במקום ציבורי ומואר.</li><li>לא לשתף כתובת בית פרטית בצעד הראשון.</li><li>אפשר להשתמש בשאלת האימות לפני מסירת פרטים.</li></ul></div>` : ''}<div class="summary-actions">
            <button id="share-inline" class="small" type="button">שיתוף עכשיו</button>
            <button id="whatsapp-inline" class="secondary small" type="button">וואטסאפ</button>
            <button id="poster-inline" class="secondary small" type="button">פלייר PNG</button>
            <button id="print-inline" class="secondary small" type="button">פוסטר להדפסה</button>
            <button id="report-inline" class="secondary small" type="button">פרסמי כחיה שנמצאה</button>
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
    summaryEl.querySelector('#poster-inline')?.addEventListener('click', async () => {
      const payload = { city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top, url: window.location.href, mode: 'lost' };
      await shareCommunityFlyer(payload);
      recordImpactEvent('poster');
      setStatus(statusEl, 'נוצר פלייר PNG לשיתוף בקבוצות שכונתיות.', { tone: 'success' });
    });
    summaryEl.querySelector('#print-inline')?.addEventListener('click', async () => {
      const payload = { city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top, url: window.location.href, mode: 'lost' };
      await openPrintablePoster(payload);
      recordImpactEvent('poster');
      setStatus(statusEl, 'נפתח פוסטר מוכן להדפסה או שמירה כ-PDF.', { tone: 'success' });
    });
    summaryEl.querySelector('#report-inline')?.addEventListener('click', () => {
      goToReport();
    });
    summaryEl.querySelector('#retry-search-inline')?.addEventListener('click', () => {
      document.getElementById('preview-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setStatus(statusEl, 'בחרי אזור חדש סביב החיה ונסי שוב. תמונה קרובה יותר בדרך כלל תשפר את התוצאה.', { tone: 'warn' });
    });
  }



function buildCurrentReportDraft(overrides = {}) {
  if (!currentPreviewImage || !currentSelection) return null;
  const queryCanvasRaw = cropRectToCanvas(currentPreviewImage, currentSelection);
  const queryCanvas = circleMaskToggle?.checked ? applyCircleMask(queryCanvasRaw) : queryCanvasRaw;
  const colorProfile = currentQueryFeatures ? {
    colorName: currentQueryFeatures.colorName,
    avgHex: currentQueryFeatures.avgHex,
  } : extractColorProfile(queryCanvas);
  const topMatch = currentResultBundle?.matches?.[0] || null;
  const inferredType = inferAnimalTypeLabel(queryAnimalTypeEl.value || topMatch?.animalType || currentDetections?.animals?.[0]?.class || '');
  const inferredBreed = String(breedInput.value || topMatch?.breed || '').trim();
  const inferredColor = String(colorProfile.colorName || topMatch?.colors || topMatch?.colorName || '').trim();
  const draft = savePendingFoundReportDraft({
    reportKind: getReportKindForSearchMode(),
    imageData: cropRectToDataUrlMasked(currentPreviewImage, currentSelection, 720, circleMaskToggle?.checked ? 'circle' : 'rect'),
    animalType: inferredType,
    breed: inferredBreed,
    colorName: inferredColor,
    colors: inferredColor,
    city: cityInput.value,
    locationText: locationTextInput.value,
    reportedAt: currentReportTimestamp || new Date().toISOString(),
    lat: geoState.lat,
    lng: geoState.lng,
    sizeLabel: estimateAnimalSizeLabel(currentSelection, currentPreviewImage),
    searchRadiusKm: Number(radiusInput?.value || 0),
    sourcePage: window.location.href,
    querySummary: currentResultBundle?.matches?.[0]?.label ? `התוצאה המובילה כרגע: ${currentResultBundle.matches[0].label}` : '',
    ...overrides,
  });
  return draft;
}

async function ensurePreparedPreviewForReporting() {
  if (currentPreviewImage && currentSelection) return true;
  const file = fileInput.files?.[0];
  if (!file) return false;
  const connectionProfile = { ...(getConnectionProfile?.() || {}), weak: Boolean(lowDataToggle?.checked) || Boolean(getConnectionProfile?.().weak) };
  const prepared = await shrinkImage(file, {
    connectionProfile,
    maxWidth: connectionProfile.weak ? 224 : 1200,
    maxHeight: connectionProfile.weak ? 224 : 1200,
    quality: connectionProfile.weak ? 0.72 : 0.82,
  });
  try {
    currentPreviewImage = cropRectToCanvas(prepared.img, fullImageRect(prepared.img));
    currentSelection = defaultSelectionRect(currentPreviewImage);
    if (!currentReportTimestamp) setAutoTimestamp(new Date());
    if (subjectOnlyToggle?.checked) {
      try { await runSmartAnimalScan(currentPreviewImage); } catch (error) { console.warn(error); }
    }
    redrawPreview();
    updateSelectionPreview();
    runSelectedBtn.disabled = false;
    return true;
  } finally {
    prepared.cleanup();
  }
}

function getCurrentReportImageData() {
  try {
    const cropCanvas = document.getElementById('query-crop');
    if (cropCanvas?.toDataURL) return cropCanvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {}
  try {
    const previewCanvas = document.getElementById('preview-canvas');
    if (previewCanvas?.toDataURL) return previewCanvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {}
  try {
    if (cropImg && !cropImg.classList.contains('hidden') && cropImg.src) return cropImg.src;
  } catch (error) {}
  return '';
}

async function goToReport(overrides = {}) {
  const ok = await ensurePreparedPreviewForReporting();
  if (!ok) {
    setStatus(statusEl, 'צריך קודם לבחור תמונה כדי לעבור לדיווח.', { tone: 'warn' });
    return;
  }
  const draft = buildCurrentReportDraft(overrides);
  let croppedData = '';
  try {
    croppedData = getCurrentReportImageData();
    if (!croppedData) {
      const croppedCanvasRaw = cropRectToCanvas(currentPreviewImage, currentSelection);
      const croppedCanvas = circleMaskToggle?.checked ? applyCircleMask(croppedCanvasRaw) : croppedCanvasRaw;
      croppedData = croppedCanvas.toDataURL('image/jpeg', 0.9);
    }
  } catch (error) {
    console.warn(error);
    try {
      croppedData = (cropImg && !cropImg.classList.contains('hidden') && cropImg.src)
        ? cropImg.src
        : cropRectToDataUrlMasked(currentPreviewImage, currentSelection, 900, circleMaskToggle?.checked ? 'circle' : 'rect');
    } catch (innerError) {
      console.warn(innerError);
      croppedData = draft?.imageData || '';
    }
  }
  try {
    const finalImage = croppedData || draft?.imageData || '';
    if (finalImage) {
      sessionStorage.setItem('pendingFoundImage', finalImage);
      sessionStorage.setItem('pendingReportImage', finalImage);
      sessionStorage.setItem('pendingImage', finalImage);
      sessionStorage.setItem('petconnect-search-report-image-v1', finalImage);
      try { localStorage.setItem('pendingImage', finalImage); } catch (error) {}
    }
    sessionStorage.setItem('pendingFoundLocation', JSON.stringify({ lat: draft?.lat ?? null, lng: draft?.lng ?? null, label: draft?.locationText || '' }));
    sessionStorage.setItem('pendingReportLocation', JSON.stringify({ lat: draft?.lat ?? null, lng: draft?.lng ?? null, label: draft?.locationText || '' }));
    sessionStorage.setItem('petconnect-report-arrival-v1', '1');
  } catch (error) { console.warn(error); }
  await animateReportTransition();
  const url = new URL('./report-found.html', window.location.href);
  url.searchParams.set('kind', getReportKindForSearchMode());
  url.searchParams.set('fromSearch', 'true');
  if (overrides.quickPost) url.searchParams.set('quick', '1');
  window.location.href = url.toString();
}

function renderReportCta(bundle) {
  if (!reportCtaContainer) return;
  const state = classifyResultState(bundle);
  const showProminent = !bundle || state.band === 'empty' || state.band === 'low' || state.band === 'fallback';
  const reportKind = getReportKindForSearchMode();
  const heading = showProminent ? (reportKind === 'missing' ? 'לא מצאת את החיה?' : 'לא נמצאה התאמה?') : (reportKind === 'missing' ? 'רוצה גם לפרסם מודעת אובדן?' : 'רוצה גם לפרסם את החיה שנמצאה?');
  const text = showProminent
    ? (reportKind === 'missing' ? 'לא נמצאה התאמה חזקה. אפשר להפוך את אותה תמונה למודעת אובדן ברגע אחד — בלי להעלות שוב.' : 'לא נמצאה התאמה חזקה. אפשר להפוך את אותה תמונה לדיווח על חיה שנמצאה ברגע אחד — בלי להעלות שוב.')
    : 'אם תרצי, אפשר להמשיך מהחיפוש הזה ישר לדיווח מהיר עם אותה תמונה ואותו מיקום.';
  reportCtaContainer.className = `report-cta-card ${showProminent ? 'prominent' : ''}`;
  reportCtaContainer.classList.remove('hidden');
  reportCtaContainer.innerHTML = `
    <div class="space-between wrap-gap">
      <div class="stack" style="gap:6px;">
        <div class="chip">חיפוש → דיווח</div>
        <div class="predictive-title">${escapeHtml(heading)}</div>
        <div class="small">${escapeHtml(text)}</div>
        ${showProminent ? `<div class="small">${reportKind === 'missing' ? 'לא צריך להעלות את התמונה שוב — היא כבר תעבור אוטומטית למסך מודעת האובדן.' : 'לא צריך להעלות את התמונה שוב — היא כבר תעבור אוטומטית למסך הדיווח.'}</div>` : ''}
      </div>
      <div class="row wrap compact-row">
        <button id="cta-report-btn" class="${showProminent ? '' : 'secondary '}small strong-cta" type="button">${reportKind === 'missing' ? 'לא נמצאה התאמה? פרסמי מודעת אובדן עכשיו' : 'לא נמצאה התאמה? פרסמי דיווח עכשיו'}</button>
        <button id="cta-quick-post-btn" class="secondary small" type="button">${reportKind === 'missing' ? 'מודעת אובדן מהירה' : 'דיווח מהיר מהמיקום הזה'}</button>
      </div>
    </div>`;
  reportCtaContainer.querySelector('#cta-report-btn')?.addEventListener('click', () => goToReport());
  reportCtaContainer.querySelector('#cta-quick-post-btn')?.addEventListener('click', () => goToReport({ quickPost: true }));
  if (stickyReportBar) stickyReportBar.classList.toggle('hidden', !(showProminent || state.band === 'empty'));
}

  function setSearchingState(isSearching) {
  const previewCard = document.getElementById('preview-card');
  previewCard?.classList.toggle('is-searching', Boolean(isSearching));
  document.body?.classList.toggle('search-loading-pulse', Boolean(isSearching));
}

function rerenderResults() {
    const filteredBundle = applyResultFilters(currentResultBundle);
    renderSummary(filteredBundle);
    renderReportCta(filteredBundle);
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
    setSearchingState(true);
    try {
      if (!currentPreviewImage || !currentSelection) {
        setStatus(statusEl, 'קודם צריך להעלות תמונה ולסמן אזור של החיה.', { tone: 'warn' });
        return;
      }
      setSearchProgress(12, 'טוען את ספריית החיפוש…');
      currentLibrary = await getMergedLibrary();
      libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
      if (!currentLibrary.length) {
        setStatus(statusEl, 'עדיין אין חיות זמינות לחיפוש. אפשר להוסיף רשומות בקלות דרך עמוד ניהול החיות.', { tone: 'warn' });
        resetSearchProgress();
        clearLastMatchGallery();
        return;
      }

      setSearchButtonsBusy(true, 'מנתח תמונה…');
      vibrateIfPossible?.(10);
      renderLoadingResultsSkeleton();
      setStatus(statusEl, 'סורק את אזור החיה ומחפש התאמות…', { busy: true });
      setSearchProgress(34, 'מכין את אזור החיה להשוואה…');
      const queryCanvasRaw = cropRectToCanvas(currentPreviewImage, currentSelection);
      const queryCanvas = circleMaskToggle?.checked ? applyCircleMask(queryCanvasRaw) : queryCanvasRaw;
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
        vibrateIfPossible?.([35, 20, 45]);
        setStatus(statusEl, `נמצאה התאמה חזקה מאוד של ${Math.round(state.score * 100)}%. מומלץ לפתוח מיד את הכרטיס הראשון.`, { tone: 'success' });
      } else if (state.band === 'medium') {
        setStatus(statusEl, 'נמצאו כמה מועמדים טובים. עברי על הגלריה והשווי בין הכרטיסים.', { tone: 'success' });
      } else if (state.band === 'low') {
        setStatus(statusEl, 'נמצאו תוצאות חלשות בלבד. עדיף לנסות חיפוש נוסף עם אזור מדויק יותר או תמונה מזווית אחרת.', { tone: 'warn' });
      } else {
        setStatus(statusEl, 'לא נמצאה התאמה ויזואלית חזקה, לכן מוצגות עכשיו חיות בצבעים דומים.', { tone: 'warn' });
      }
    } finally {
      setSearchButtonsBusy(false);
      setSearchingState(false);
    }
  }

  await loadModels(statusEl);
  await loadAnimalDetector(statusEl).catch((error) => { console.warn('animal detector unavailable', error); updateDetectionStatus('הסריקה החכמה לא נטענה עדיין. אפשר להמשיך גם בלי זה.', 'warn'); });
  currentLibrary = await getMergedLibrary();
  libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
  resetSearchProgress();
  updateTopActions(null);
  renderReportCta(null);
  updatePrivacyNote();
  updateRadiusNote();
  renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim());

  minScoreInput.addEventListener('input', () => {
    minScoreOutput.textContent = `${minScoreInput.value}%`;
  const initialConnectionProfile = getConnectionProfile?.() || { weak: false, label: 'מצב רגיל' };
  if (lowDataToggle) lowDataToggle.checked = Boolean(initialConnectionProfile.weak);
  if (connectionNoteEl) connectionNoteEl.textContent = buildConnectionHint?.(initialConnectionProfile) || '';

  });
  radiusInput?.addEventListener('input', () => {
    updateRadiusNote();
    updateTopActions(applyResultFilters(currentResultBundle));
  });
  showBoxInput.addEventListener('change', redrawPreview);
  circleMaskToggle?.addEventListener('change', updateSelectionPreview);
  queryAnimalTypeEl.addEventListener('input', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  queryAnimalTypeEl.addEventListener('change', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  breedInput.addEventListener('input', () => renderBreedChips(queryAnimalTypeEl.value, breedInput.value.trim()));
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      setAutoTimestamp(new Date());
      setStatus(statusEl, 'התמונה נבחרה. זמן הדיווח נשמר אוטומטית.', { tone: 'success' });
      updateDetectionStatus('מוכן לסריקה חכמה של החיה.');
      setButtonBusy?.(reportDirectBtn, false);
    }
  });
  reportDirectBtn?.addEventListener('click', async () => {
    try {
      setButtonBusy?.(reportDirectBtn, true, 'מעביר לדיווח…');
      await goToReport();
    } catch (error) {
      console.error(error);
      setStatus(statusEl, `המעבר לדיווח נכשל: ${error.message}`, { tone: 'warn' });
    } finally {
      setButtonBusy?.(reportDirectBtn, false);
    }
  });

  smartScanBtn?.addEventListener('click', async () => {
    if (!currentPreviewImage) {
      setStatus(statusEl, 'צריך קודם להעלות תמונה כדי לבצע סריקה חכמה.', { tone: 'warn' });
      return;
    }
    setButtonBusy?.(smartScanBtn, true, 'סורק…');
    try {
      const ok = await runSmartAnimalScan(currentPreviewImage);
      if (!ok) setStatus(statusEl, 'לא נמצאה חיה אוטומטית. אפשר לגרור ידנית את אזור החיה.', { tone: 'warn' });
    } catch (error) {
      console.error(error);
      updateDetectionStatus(`❌ הסריקה החכמה נכשלה: ${error.message}`, 'warn');
    } finally {
      setButtonBusy?.(smartScanBtn, false);
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
    recordImpactEvent('share-community');
    window.open(buildCommunityWatchHref({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top }), '_blank', 'noopener');
  });

  posterTopBtn?.addEventListener('click', async () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    await shareCommunityFlyer({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top, url: window.location.href, mode: 'lost' });
    recordImpactEvent('poster');
    setStatus(statusEl, 'נוצר פלייר PNG מוכן לשיתוף.', { tone: 'success' });
  });

  printPosterTopBtn?.addEventListener('click', async () => {
    const top = applyResultFilters(currentResultBundle).matches?.[0];
    if (!top) return;
    await openPrintablePoster({ city: cityInput.value, locationText: `${locationTextInput.value}${radiusInput?.value ? ` · רדיוס ${radiusInput.value} ק"מ` : ''}`.trim(), reportedAt: currentReportTimestamp, lat: geoState.lat, lng: geoState.lng, bestMatch: top, url: window.location.href, mode: 'lost' });
    recordImpactEvent('poster');
    setStatus(statusEl, 'נפתח פוסטר מוכן להדפסה או שמירה כ-PDF.', { tone: 'success' });
  });

  alertOptInBtn?.addEventListener('click', async () => {
    const result = await requestNeighborhoodAlertsPermission?.();
    if (!result?.supported) {
      setStatus(statusEl, 'הדפדפן הזה לא תומך בהתראות.', { tone: 'warn' });
      return;
    }
    if (result.granted) {
      await showLocalNeighborhoodAlert?.({ title: 'התראות שכונתיות הופעלו', body: 'מעכשיו אפשר להציג התראות מקומיות גם כשהאפליקציה פתוחה ברקע.', data: { url: './search.html' }, tag: 'alerts-enabled' }).catch(() => {});
      setStatus(statusEl, 'התראות הופעלו בהצלחה.', { tone: 'success' });
    } else {
      setStatus(statusEl, 'לא ניתנה הרשאת התראות.', { tone: 'warn' });
    }
  });

  lowDataToggle?.addEventListener('change', () => {
    const profile = { ...(getConnectionProfile?.() || {}), weak: Boolean(lowDataToggle.checked) };
    if (connectionNoteEl) connectionNoteEl.textContent = buildConnectionHint?.(profile) || '';
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
      setStatus(statusEl, 'קובץ הקטלוג הזה לא נראה תקין.', { tone: 'warn' });
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
    setStatus(statusEl, 'הקטלוג הנוסף נוסף לחיפוש הנוכחי.', { tone: 'success' });
    if (currentResultBundle) rerenderResults();
  });

  clearImportedBtn.addEventListener('click', async () => {
    saveImportedLibrary([]);
    currentLibrary = await getMergedLibrary();
    libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
    setStatus(statusEl, 'הקטלוג הנוסף הוסר.', { tone: 'success' });
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
    await processInputImageBlob(file, 'מכין את התמונה לסריקה…');
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
    setStatus(statusEl, 'אזור החיה עודכן ידנית. אפשר עכשיו ללחוץ על "חיפוש לפי האזור שסומן".', { tone: 'success' });
    updateDetectionStatus('הבחירה הידנית פעילה. אפשר לחפש לפי האזור שסומן.', 'success');
  }
  stickyReportBtn?.addEventListener('click', () => goToReport());
  stickyQuickBtn?.addEventListener('click', () => goToReport({ quickPost: true }));
  hydratePendingCaptureFromHome().catch(() => {});

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
