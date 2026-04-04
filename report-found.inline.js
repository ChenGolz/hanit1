
async function waitForReportHelpers() {
  const needed = [
    'registerServiceWorker','setStatus','clearValidityOnInput','setRequiredValidity','attachCityAutocomplete','attachBreedAutocomplete',
    'loadPendingFoundReportDraft','savePendingFoundReportDraft','clearPendingFoundReportDraft','saveFoundReport','loadFoundReports',
    'buildFoundReportShareText','buildFoundReportWhatsAppHref','renderFoundReportCards','reverseGeocodeLatLng','shareResult','blobToImage','cropRectToCanvas','extractColorProfile','estimateAnimalSizeLabel','vibrateIfPossible'
  ];
  const start = Date.now();
  while (Date.now() - start < 8000) {
    if (needed.every((name) => typeof window[name] === 'function')) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('קובץ העזר assets/common.js לא נטען. נסי Ctrl + F5 או חלון אינקוגניטו.');
}

async function runReportFoundPage() {
  await waitForReportHelpers();
  window.bootUiShell?.(document);
  window.registerServiceWorker?.();

  const statusEl = document.getElementById('report-status');
  const imgEl = document.getElementById('report-image');
  const imgEmptyEl = document.getElementById('report-image-empty');
  const fileEl = document.getElementById('report-image-file');
  const animalTypeEl = document.getElementById('report-animal-type');
  const breedEl = document.getElementById('report-breed');
  const breedChipEl = document.getElementById('report-breed-chips');
  const colorEl = document.getElementById('report-color');
  const sizeEl = document.getElementById('report-size');
  const cityEl = document.getElementById('report-city');
  const locationEl = document.getElementById('report-location');
  const timeEl = document.getElementById('report-time');
  const quickToggle = document.getElementById('quick-post-toggle');
  const phoneEl = document.getElementById('report-phone');
  const whatsappOptinEl = document.getElementById('report-whatsapp-optin');
  const detailsEl = document.getElementById('report-extra-details');
  const submitBtn = document.getElementById('submit-report-btn');
  const shareBtn = document.getElementById('share-report-btn');
  const whatsappBtn = document.getElementById('whatsapp-report-btn');
  const posterBtn = document.getElementById('poster-report-btn');
  const clearBtn = document.getElementById('clear-draft-btn');
  const backBtn = document.getElementById('back-to-search-btn');
  const successEl = document.getElementById('report-success');
  const localReportsEl = document.getElementById('local-found-reports');
  const voiceStartBtn = document.getElementById('voice-start-btn');
  const voiceStopBtn = document.getElementById('voice-stop-btn');
  const voiceClearBtn = document.getElementById('voice-clear-btn');
  const step1El = document.getElementById('report-step-1');
  const step2El = document.getElementById('report-step-2');
  const step3El = document.getElementById('report-step-3');
  const voiceStatusEl = document.getElementById('voice-status');
  const voiceAudioEl = document.getElementById('voice-audio');

  [animalTypeEl, breedEl, colorEl, cityEl].forEach(clearValidityOnInput);
  attachCityAutocomplete?.(cityEl);
  attachBreedAutocomplete?.(breedEl, animalTypeEl);

  function renderBreedChips(type = '', preferredBreed = '') {
    if (!breedChipEl) return;
    const breeds = getBreedsForType?.(type) || [];
    if (!breeds.length) {
      breedChipEl.innerHTML = '<div class="small">אפשר להשאיר את שדה הגזע פתוח או לבחור אחת מההצעות אחרי שהתמונה נטענה.</div>';
      return;
    }
    const icons = { 'לברדור':'🦮', 'גולדן רטריבר':'🐕', 'רועה גרמני':'🐕‍🦺', 'האסקי סיבירי':'🐺', 'פומרניאן':'🐶', 'שיצו':'🐶', 'בוקסר':'🐕', 'כנעני':'🐕', 'מלינואה':'🐕‍🦺', 'יורקשייר טרייר':'🐾', 'אירופאי קצר-שיער':'🐈', 'חתול רחוב':'🐈', 'פרסי':'😺', 'סיאמי':'🐱' };
    breedChipEl.innerHTML = breeds.map((breed) => `<button class="chip-btn ${breed === preferredBreed ? 'active' : ''}" type="button" data-breed="${escapeHtml(breed)}">${icons[breed] || '🐾'} ${escapeHtml(breed)}</button>`).join('');
    breedChipEl.querySelectorAll('[data-breed]').forEach((button) => {
      button.addEventListener('click', () => {
        breedEl.value = button.dataset.breed || '';
        renderBreedChips(animalTypeEl.value, breedEl.value.trim());
        updateFormProgress();
      });
    });
  }

  function updateFormProgress() {
    const hasImage = Boolean(currentImageData);
    const hasCore = Boolean((animalTypeEl.value || '').trim() || (breedEl.value || '').trim() || (colorEl.value || '').trim());
    const hasSubmitReady = hasImage && (Boolean((cityEl.value || '').trim()) || Boolean((locationEl.value || '').trim()) || Number.isFinite(currentLat));
    [step1El, step2El, step3El].forEach((el) => el?.classList.remove('active', 'done'));
    if (step1El) step1El.classList.add(hasImage ? 'done' : 'active');
    if (step2El) step2El.classList.add(hasCore ? 'done' : hasImage ? 'active' : '');
    if (step3El) step3El.classList.add(hasSubmitReady ? 'active' : '');
  }

  let draft = loadPendingFoundReportDraft() || null;
  let currentImageData = draft?.imageData || '';
  let currentLat = Number.isFinite(draft?.lat) ? Number(draft.lat) : null;
  let currentLng = Number.isFinite(draft?.lng) ? Number(draft.lng) : null;
  let currentAudioData = draft?.audioData || '';
  let isOffline = navigator.onLine === false;

  function updateConnectivityStatus() {
    isOffline = navigator.onLine === false;
    document.body.classList.toggle('is-offline', isOffline);
    if (isOffline) {
      setStatus(statusEl, 'אין כרגע חיבור יציב. נמשיך לשמור את הדיווח מקומית כדי שלא ילך לאיבוד.', { tone: 'warn' });
    }
  }
  const REPORT_FORM_BACKUP_KEY = 'petconnect-report-form-backup-v1';
  let recorder = null;
  let recorderChunks = [];

  function loadReportFormBackup() {
    try { return JSON.parse(localStorage.getItem(REPORT_FORM_BACKUP_KEY) || 'null'); } catch (error) { return null; }
  }

  function saveReportFormBackup() {
    try {
      const payload = {
        imageData: currentImageData || '',
        animalType: animalTypeEl?.value || '',
        breed: breedEl?.value || '',
        colorName: colorEl?.value || '',
        sizeLabel: sizeEl?.value || '',
        city: cityEl?.value || '',
        locationText: locationEl?.value || '',
        reportedAt: draft?.reportedAt || new Date().toISOString(),
        notes: detailsEl?.value || '',
        phone: phoneEl?.value || '',
        whatsappOptIn: Boolean(whatsappOptinEl?.checked),
        audioData: currentAudioData || '',
        lat: currentLat,
        lng: currentLng,
        quickPost: Boolean(quickToggle?.checked),
      };
      localStorage.setItem(REPORT_FORM_BACKUP_KEY, JSON.stringify(payload));
    } catch (error) { console.warn(error); }
  }

  function clearReportFormBackup() {
    try { localStorage.removeItem(REPORT_FORM_BACKUP_KEY); } catch (error) {}
  }

  function renderLocalReports() {
    localReportsEl.innerHTML = renderFoundReportCards(loadFoundReports());
  }

  function setImage(dataUrl) {
    currentImageData = dataUrl || '';
    if (currentImageData) {
      window.currentReportImage = currentImageData;
      imgEl.src = currentImageData;
      imgEl.classList.remove('hidden');
      imgEmptyEl.classList.add('hidden');
      try {
        if (sessionStorage.getItem('petconnect-report-arrival-v1') === '1') {
          sessionStorage.removeItem('petconnect-report-arrival-v1');
          imgEl.classList.remove('arrival-pop');
          requestAnimationFrame(() => imgEl.classList.add('arrival-pop'));
        }
      } catch (error) { console.warn(error); }
    } else {
      imgEl.src = '';
      imgEl.classList.add('hidden');
      imgEmptyEl.classList.remove('hidden');
    }
    updateFormProgress();
  }


function setAudioData(dataUrl) {
  currentAudioData = dataUrl || '';
  if (voiceAudioEl) {
    voiceAudioEl.src = currentAudioData;
    voiceAudioEl.classList.toggle('hidden', !currentAudioData);
  }
  if (voiceClearBtn) voiceClearBtn.disabled = !currentAudioData;
  if (voiceStatusEl) voiceStatusEl.textContent = currentAudioData ? 'הקלטה קולית נשמרה.' : 'עדיין אין הקלטה.';
  updateFormProgress();
}

async function startVoiceRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus(statusEl, 'הדפדפן הזה לא תומך בהקלטת קול.', { tone: 'warn' });
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorderChunks = [];
  recorder = new MediaRecorder(stream);
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) recorderChunks.push(event.data); });
  recorder.addEventListener('stop', async () => {
    const blob = new Blob(recorderChunks, { type: recorder.mimeType || 'audio/webm' });
    const reader = new FileReader();
    reader.onload = () => setAudioData(String(reader.result || ''));
    reader.readAsDataURL(blob);
    stream.getTracks().forEach((track) => track.stop());
    if (voiceStartBtn) voiceStartBtn.disabled = false;
    if (voiceStopBtn) voiceStopBtn.disabled = true;
  });
  recorder.start();
  if (voiceStartBtn) voiceStartBtn.disabled = true;
  if (voiceStopBtn) voiceStopBtn.disabled = false;
  if (voiceStatusEl) voiceStatusEl.textContent = 'מקליט… אפשר לעצור אחרי כמה שניות.';
}

  async function maybeAutofillImageTraits(dataUrl) {
    if (!dataUrl) return;
    try {
      const img = await blobToImage(await (await fetch(dataUrl)).blob());
      const canvas = cropRectToCanvas(img, fullImageRect(img));
      const profile = extractColorProfile(canvas);
      if (!colorEl.value.trim()) colorEl.value = profile.colorName || '';
      if (!sizeEl.value.trim()) sizeEl.value = estimateAnimalSizeLabel(fullImageRect(img), img) || '';
    } catch (error) {
      console.warn('Autofill from image failed', error);
    }
  }

  function hydratePendingImageFallback() {
    if (draft) return false;
    const pendingImage = sessionStorage.getItem('pendingImage') || sessionStorage.getItem('pendingFoundImage') || sessionStorage.getItem('pendingReportImage') || localStorage.getItem('pendingImage') || '';
    if (!pendingImage) return false;
    draft = {
      imageData: pendingImage,
      animalType: '',
      breed: '',
      colorName: '',
      locationText: '',
      city: '',
      reportedAt: new Date().toISOString(),
      lat: null,
      lng: null,
      quickPost: false,
      sourcePage: './search.html',
    };
    return true;
  }

  async function hydrateFromDraft() {
    draft = loadPendingFoundReportDraft() || draft || loadReportFormBackup() || null;
    hydratePendingImageFallback();
    if (!draft) {
      setStatus(statusEl, 'אין כרגע טיוטה שהועברה מהחיפוש. אפשר לבחור תמונה ידנית ולמלא כמה פרטים.', { tone: 'warn' });
      timeEl.value = formatReportedAt(new Date()) || '';
      renderBreedChips(animalTypeEl.value, breedEl.value.trim());
      updateFormProgress();
      renderLocalReports();
      return;
    }
    setImage(draft.imageData || '');
    animalTypeEl.value = draft.animalType || '';
    breedEl.value = draft.breed || '';
    colorEl.value = draft.colorName || draft.colors || '';
    sizeEl.value = draft.sizeLabel || '';
    cityEl.value = draft.city || '';
    locationEl.value = draft.locationText || '';
    timeEl.value = formatReportedAt(draft.reportedAt) || '';
    detailsEl.value = draft.notes || '';
    if (phoneEl) phoneEl.value = draft.phone || '';
    if (whatsappOptinEl) whatsappOptinEl.checked = typeof draft.whatsappOptIn === 'boolean' ? draft.whatsappOptIn : true;
    if (quickToggle) quickToggle.checked = typeof draft.quickPost === 'boolean' ? draft.quickPost : quickToggle.checked;
    setAudioData(draft.audioData || '');
    await maybeAutofillImageTraits(draft.imageData || '');
    renderBreedChips(animalTypeEl.value, breedEl.value.trim());
    updateFormProgress();
    if (draft.quickPost) {
      setStatus(statusEl, 'הפרטים מהחיפוש הועברו לכאן. נשאר רק להוסיף פרטים נוספים ולשמור דיווח.', { tone: 'success' });
    } else {
      setStatus(statusEl, 'הטיוטה הועברה מהחיפוש. אפשר לערוך פרטים ואז לשמור דיווח.', { tone: 'success' });
    }
    renderLocalReports();
  }

  async function buildReportPayload() {
    if (!currentImageData) {
      setRequiredValidity(fileEl, 'צריך תמונה כדי לשמור דיווח.');
      throw new Error('צריך תמונה כדי לשמור דיווח.');
    }
    if (!animalTypeEl.value.trim()) animalTypeEl.value = 'חיה';
    const payload = {
      imageData: currentImageData,
      animalType: animalTypeEl.value,
      breed: breedEl.value,
      colorName: colorEl.value,
      colors: colorEl.value,
      sizeLabel: sizeEl.value,
      city: cityEl.value,
      locationText: locationEl.value,
      reportedAt: (draft?.reportedAt) || new Date().toISOString(),
      lat: currentLat,
      lng: currentLng,
      notes: detailsEl.value.trim(),
      phone: phoneEl?.value?.trim?.() || '',
      whatsappOptIn: Boolean(whatsappOptinEl?.checked),
      audioData: currentAudioData,
      sourcePage: draft?.sourcePage || './search.html',
    };
    if (!payload.locationText && Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
      try {
        const resolved = await reverseGeocodeLatLng(currentLat, currentLng, 'he');
        if (resolved?.display) payload.locationText = resolved.display;
        if (resolved?.city && !payload.city) payload.city = resolved.city;
      } catch (error) { console.warn(error); }
    }
    return payload;
  }

  async function showSuccess(report) {
    successEl.classList.remove('hidden');
    successEl.innerHTML = `
      <div class="chip">נשמר</div>
      <h2 class="section-title" style="margin:0;">הדיווח נשמר בהצלחה</h2>
      <div class="small">אפשר לחזור לדיווח הזה בקלות ולהמשיך ממנו בכל רגע.</div>
      ${isOffline ? '<div class="offline-draft-chip">נשמר גם ללא חיבור · יסתנכרן כשתחזרי לרשת</div>' : ''}
      <div class="row wrap compact-row">
        <button id="success-share-btn" class="small" type="button">שיתוף</button>
        <button id="success-wa-btn" class="secondary small" type="button">פוסט לוואטסאפ</button>
        <a class="button-link secondary small" id="success-106-btn" href="#">טיוטת 106</a>
      </div>
      <div class="notice success">מה לעשות עכשיו? בדקי אם יש קולר, פני לוטרינר/ית לסריקת שבב, הציעי מים, והישארי בקרבת האזור שבו החיה נמצאה.</div>
      ${report.audioData ? '<div class="small">נשמר גם תיאור קולי קצר עם הדיווח.</div>' : ''}`;
    vibrateIfPossible?.([18, 12, 18]);
    const shareText = buildFoundReportShareText(report);
    successEl.querySelector('#success-share-btn')?.addEventListener('click', async () => {
      const ok = await shareResult({ city: report.city, locationText: report.locationText, reportedAt: report.reportedAt, lat: report.lat, lng: report.lng, bestMatch: { label: report.animalType || 'חיה שנמצאה', animalType: report.animalType, breed: report.breed, colors: report.colors, href: './report-found.html' } });
      if (!ok && navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareText);
      setStatus(statusEl, 'הטקסט הוכן לשיתוף.', { tone: 'success' });
    });
    successEl.querySelector('#success-wa-btn')?.addEventListener('click', () => {
      window.open(buildFoundReportWhatsAppHref(report), '_blank', 'noopener');
    });
    const m106 = buildMunicipalReportHref({ city: report.city, locationText: report.locationText, reportedAt: report.reportedAt, lat: report.lat, lng: report.lng, bestMatch: { label: report.animalType || 'חיה שנמצאה', animalType: report.animalType, breed: report.breed, colors: report.colors } });
    successEl.querySelector('#success-106-btn')?.setAttribute('href', m106);
  }


  async function openPosterWindow(report) {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) return false;
    const title = `חיה שנמצאה${report.city ? ' · ' + report.city : ''}`;
    const subtitle = [report.animalType || '', report.breed || '', report.colorName || report.colors || '', report.locationText || report.city || ''].filter(Boolean).join(' • ');
    win.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Assistant,Arial,sans-serif;background:#f8f9fc;margin:0;padding:24px;color:#1c1c1e} .poster{max-width:820px;margin:0 auto;background:#fff;border-radius:28px;box-shadow:0 18px 50px rgba(0,0,0,.08);overflow:hidden;border:1px solid rgba(0,0,0,.04)} .hero{padding:22px 24px;background:linear-gradient(135deg,#007AFF,#0051FF);color:#fff} h1{margin:0;font-size:44px} .sub{opacity:.92;margin-top:8px;font-size:18px} .body{padding:24px;display:grid;gap:18px} img{width:100%;max-height:560px;object-fit:contain;background:#eef3fb;border-radius:22px} .meta{display:grid;gap:10px;font-size:18px} .qr{margin-top:10px;padding:14px 16px;border-radius:18px;background:#f8f9fc;border:1px dashed rgba(0,0,0,.12)} .print{position:fixed;left:18px;top:18px;padding:12px 16px;border-radius:14px;border:0;background:#FF9500;color:#fff;font-weight:700;cursor:pointer} @media print {.print{display:none} body{padding:0;background:#fff} .poster{box-shadow:none;border:0;max-width:none;border-radius:0}}</style></head><body><button class="print" onclick="window.print()">הדפסה / שמירה כ-PDF</button><div class="poster"><div class="hero"><h1>נמצאה חיה</h1><div class="sub">${subtitle || 'סרקי את הקוד או צרי קשר דרך הקישור'}</div></div><div class="body"><img src="${report.imageData}" alt="תמונת החיה"><div class="meta"><div><strong>עיר:</strong> ${report.city || 'לא צוין'}</div><div><strong>מיקום:</strong> ${report.locationText || 'לא צוין'}</div><div><strong>זמן:</strong> ${formatReportedAt(report.reportedAt) || ''}</div><div><strong>פרטים:</strong> ${report.notes || 'לא נוספו פרטים נוספים.'}</div></div><div class="qr"><strong>פתיחה מהירה:</strong><br><img alt="QR" style="width:160px;height:160px" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(location.href)}"><div style="font-size:14px;margin-top:8px;opacity:.8">אפשר לסרוק כדי לפתוח את הדף במכשיר אחר.</div></div></div></div></body></html>`);
    win.document.close();
    return true;
  }

  fileEl.addEventListener('change', async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    const prepared = await shrinkImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
    try {
      setImage(prepared.dataUrl || cropRectToDataUrl(prepared.img, fullImageRect(prepared.img)));
      await maybeAutofillImageTraits(currentImageData);
      saveReportFormBackup();
      setStatus(statusEl, 'התמונה נטענה לדיווח. אפשר להשלים כמה פרטים ולשמור.', { tone: 'success' });
    } finally {
      prepared.cleanup();
    }
  });

  backBtn.addEventListener('click', () => { window.location.href = './search.html'; });
  clearBtn.addEventListener('click', () => {
    clearPendingFoundReportDraft();
    clearReportFormBackup();
      try { sessionStorage.removeItem('pendingFoundImage'); sessionStorage.removeItem('pendingReportImage'); sessionStorage.removeItem('pendingImage'); localStorage.removeItem('pendingImage'); } catch (error) {}
    draft = null;
    currentLat = null; currentLng = null;
    setImage('');
    setAudioData('');
    [animalTypeEl, breedEl, colorEl, sizeEl, cityEl, locationEl, detailsEl].forEach((el) => { if (el) el.value = ''; });
    timeEl.value = formatReportedAt(new Date()) || '';
    successEl.classList.add('hidden');
    successEl.innerHTML = '';
    setStatus(statusEl, 'הטיוטה נוקתה. אפשר לבחור תמונה חדשה או לחזור לחיפוש.', { tone: 'success' });
  });

  submitBtn.addEventListener('click', async () => {
    try {
      setButtonBusy?.(submitBtn, true, quickToggle.checked ? 'שומר דיווח מהיר…' : 'שומר דיווח…');
      const payload = await buildReportPayload();
      const report = saveFoundReport(payload);
      recordImpactEvent?.('share-community');
      savePendingFoundReportDraft(payload);
      clearReportFormBackup();
      shareBtn.disabled = false;
      whatsappBtn.disabled = false;
      if (posterBtn) posterBtn.disabled = false;
      await showSuccess(report);
      setStatus(statusEl, 'הדיווח נשמר בהצלחה.', { tone: 'success' });
      renderLocalReports();
    } catch (error) {
      console.error(error);
      setStatus(statusEl, error.message || 'שמירת הדיווח נכשלה.', { tone: 'warn' });
    } finally {
      setButtonBusy?.(submitBtn, false);
    }
  });

  shareBtn.addEventListener('click', async () => {
    const payload = await buildReportPayload().catch(() => null);
    if (!payload) return;
    const ok = await shareResult({ city: payload.city, locationText: payload.locationText, reportedAt: payload.reportedAt, lat: payload.lat, lng: payload.lng, bestMatch: { label: payload.animalType || 'חיה שנמצאה', animalType: payload.animalType, breed: payload.breed, colors: payload.colors, href: './report-found.html' } });
    setStatus(statusEl, ok ? 'הדיווח הוכן לשיתוף.' : 'לא ניתן לשתף ישירות, אבל אפשר להשתמש בוואטסאפ.', { tone: ok ? 'success' : 'warn' });
  });

  whatsappBtn.addEventListener('click', async () => {
    const payload = await buildReportPayload().catch(() => null);
    if (!payload) return;
    window.open(buildFoundReportWhatsAppHref(payload), '_blank', 'noopener');
  });


  posterBtn?.addEventListener('click', async () => {
    const payload = await buildReportPayload().catch(() => null);
    if (!payload) return;
    await openPosterWindow(payload);
  });

  voiceStartBtn?.addEventListener('click', async () => { try { await startVoiceRecording(); } catch (error) { console.error(error); setStatus(statusEl, 'לא הצלחנו להתחיל הקלטה.', { tone: 'warn' }); } });
  voiceStopBtn?.addEventListener('click', () => { try { recorder?.stop(); } catch (error) { console.warn(error); } });
  voiceClearBtn?.addEventListener('click', () => setAudioData(''));
  [animalTypeEl, breedEl, colorEl, sizeEl, cityEl, locationEl, detailsEl, phoneEl].forEach((el) => {
    el?.addEventListener('input', () => {
      if (el === animalTypeEl || el === breedEl) renderBreedChips(animalTypeEl.value, breedEl.value.trim());
      updateFormProgress();
      saveReportFormBackup();
    });
    el?.addEventListener('change', () => {
      if (el === animalTypeEl || el === breedEl) renderBreedChips(animalTypeEl.value, breedEl.value.trim());
      updateFormProgress();
      saveReportFormBackup();
    });
  });


  window.addEventListener('online', () => { updateConnectivityStatus(); setStatus(statusEl, 'החיבור חזר. אפשר להמשיך או לשתף את הדיווח.', { tone: 'success' }); });
  window.addEventListener('offline', () => { updateConnectivityStatus(); });
  updateConnectivityStatus();
  await hydrateFromDraft();
}

window.addEventListener('DOMContentLoaded', () => {
  runReportFoundPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById('report-status');
    (window.setStatus || ((el, text) => { if (el) el.textContent = text; }))(statusEl, `הטעינה נכשלה: ${error.message}`, { tone: 'warn' });
  });
});
