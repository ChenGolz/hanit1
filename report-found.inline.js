
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
  window.initLang?.('he');
  window.applyTranslations?.();
  window.registerServiceWorker?.();

  const statusEl = document.getElementById('report-status');
  const imgEl = document.getElementById('report-image');
  const imgEmptyEl = document.getElementById('report-image-empty');
  const fileEl = document.getElementById('report-image-file');
  const animalTypeEl = document.getElementById('report-animal-type');
  const breedEl = document.getElementById('report-breed');
  const colorEl = document.getElementById('report-color');
  const sizeEl = document.getElementById('report-size');
  const cityEl = document.getElementById('report-city');
  const locationEl = document.getElementById('report-location');
  const timeEl = document.getElementById('report-time');
  const quickToggle = document.getElementById('quick-post-toggle');
  const detailsEl = document.getElementById('report-extra-details');
  const submitBtn = document.getElementById('submit-report-btn');
  const shareBtn = document.getElementById('share-report-btn');
  const whatsappBtn = document.getElementById('whatsapp-report-btn');
  const clearBtn = document.getElementById('clear-draft-btn');
  const backBtn = document.getElementById('back-to-search-btn');
  const successEl = document.getElementById('report-success');
  const localReportsEl = document.getElementById('local-found-reports');
  const voiceStartBtn = document.getElementById('voice-start-btn');
  const voiceStopBtn = document.getElementById('voice-stop-btn');
  const voiceClearBtn = document.getElementById('voice-clear-btn');
  const voiceStatusEl = document.getElementById('voice-status');
  const voiceAudioEl = document.getElementById('voice-audio');

  [animalTypeEl, breedEl, colorEl, cityEl].forEach(clearValidityOnInput);
  attachCityAutocomplete?.(cityEl);
  attachBreedAutocomplete?.(breedEl, animalTypeEl);

  let draft = loadPendingFoundReportDraft() || null;
  let currentImageData = draft?.imageData || '';
  let currentLat = Number.isFinite(draft?.lat) ? Number(draft.lat) : null;
  let currentLng = Number.isFinite(draft?.lng) ? Number(draft.lng) : null;
  let currentAudioData = draft?.audioData || '';
  let recorder = null;
  let recorderChunks = [];

  function renderLocalReports() {
    localReportsEl.innerHTML = renderFoundReportCards(loadFoundReports());
  }

  function setImage(dataUrl) {
    currentImageData = dataUrl || '';
    if (currentImageData) {
      imgEl.src = currentImageData;
      imgEl.classList.remove('hidden');
      imgEmptyEl.classList.add('hidden');
    } else {
      imgEl.src = '';
      imgEl.classList.add('hidden');
      imgEmptyEl.classList.remove('hidden');
    }
  }


function setAudioData(dataUrl) {
  currentAudioData = dataUrl || '';
  if (voiceAudioEl) {
    voiceAudioEl.src = currentAudioData;
    voiceAudioEl.classList.toggle('hidden', !currentAudioData);
  }
  if (voiceClearBtn) voiceClearBtn.disabled = !currentAudioData;
  if (voiceStatusEl) voiceStatusEl.textContent = currentAudioData ? 'נשמרה הקלטה קולית מקומית.' : 'עדיין אין הקלטה.';
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

  async function hydrateFromDraft() {
    draft = loadPendingFoundReportDraft() || draft;
    if (!draft) {
      setStatus(statusEl, 'אין כרגע טיוטה שהועברה מהחיפוש. אפשר לבחור תמונה ידנית ולמלא כמה פרטים.', { tone: 'warn' });
      timeEl.value = formatReportedAt(new Date()) || '';
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
    setAudioData(draft.audioData || '');
    await maybeAutofillImageTraits(draft.imageData || '');
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
      <div class="chip">Saved locally</div>
      <h2 class="section-title" style="margin:0;">הדיווח נשמר במכשיר הזה</h2>
      <div class="small">בגרסת GitHub Pages הדיווח נשמר מקומית כדי לחסוך זמן. כשתחברי שרת, אותו מסך יוכל לשלוח אותו גם אונליין.</div>
      <div class="row wrap compact-row">
        <button id="success-share-btn" class="small" type="button">שיתוף מקומי</button>
        <button id="success-wa-btn" class="secondary small" type="button">פוסט לוואטסאפ</button>
        <a class="button-link secondary small" id="success-106-btn" href="#">טיוטת 106</a>
      </div>
      <div class="notice success">מה לעשות עכשיו? בדקי אם יש קולר, פני לוטרינר/ית לסריקת שבב, הציעי מים, והישארי בקרבת האזור שבו החיה נמצאה.</div>
      ${report.audioData ? '<div class="small">נשמר גם תיאור קולי קצר יחד עם הדיווח.</div>' : ''}`;
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

  fileEl.addEventListener('change', async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    const prepared = await shrinkImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
    try {
      setImage(prepared.dataUrl || cropRectToDataUrl(prepared.img, fullImageRect(prepared.img)));
      await maybeAutofillImageTraits(currentImageData);
      setStatus(statusEl, 'התמונה נטענה לדיווח. אפשר להשלים כמה פרטים ולשמור.', { tone: 'success' });
    } finally {
      prepared.cleanup();
    }
  });

  backBtn.addEventListener('click', () => { window.location.href = './search.html'; });
  clearBtn.addEventListener('click', () => {
    clearPendingFoundReportDraft();
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
      shareBtn.disabled = false;
      whatsappBtn.disabled = false;
      await showSuccess(report);
      setStatus(statusEl, 'הדיווח נשמר מקומית בהצלחה.', { tone: 'success' });
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

  voiceStartBtn?.addEventListener('click', async () => { try { await startVoiceRecording(); } catch (error) { console.error(error); setStatus(statusEl, 'לא הצלחנו להתחיל הקלטה.', { tone: 'warn' }); } });
  voiceStopBtn?.addEventListener('click', () => { try { recorder?.stop(); } catch (error) { console.warn(error); } });
  voiceClearBtn?.addEventListener('click', () => setAudioData(''));

  await hydrateFromDraft();
}

window.addEventListener('DOMContentLoaded', () => {
  runReportFoundPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById('report-status');
    (window.setStatus || ((el, text) => { if (el) el.textContent = text; }))(statusEl, `הטעינה נכשלה: ${error.message}`, { tone: 'warn' });
  });
});
