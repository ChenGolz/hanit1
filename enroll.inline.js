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
  const needed = ['registerServiceWorker', 'setStatus', 'extractAnimalFeaturesForEnrollment', 'attachBreedAutocomplete', 'sha256Hex'];
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (needed.every((name) => typeof window[name] === 'function')) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('קובץ העזר assets/common.js לא נטען. נסי רענון קשיח עם Ctrl + F5.');
}

async function runEnrollPage() {
  await waitForCommonHelpers();
  window.initLang?.('he');
  window.applyTranslations?.();
  window.mountLanguageSwitcher?.();
  window.registerServiceWorker?.();
  window.flushQueuedBackgroundReports?.().catch(() => {});

  const statusEl = document.getElementById('status');
  const createForm = document.getElementById('create-entry-form');
  const labelInput = document.getElementById('animal-label');
  const typeInput = document.getElementById('animal-type');
  const breedInput = document.getElementById('animal-breed');
  const colorsInput = document.getElementById('animal-colors');
  const hrefInput = document.getElementById('animal-href');
  const notesInput = document.getElementById('animal-notes');
  const verificationPromptInput = document.getElementById('verification-prompt-input');
  const verificationAnswerInput = document.getElementById('verification-answer-input');
  const fileInput = document.getElementById('animal-files');
  const addBtn = document.getElementById('add-btn');
  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');
  const outputEl = document.getElementById('output-json');
  const libraryEl = document.getElementById('library-list');
  const prepNoteEl = document.getElementById('prep-note');
  const breedChipPicker = document.getElementById('breed-chip-picker');
  const progressFillEl = document.getElementById('enroll-progress-fill');
  const progressLabelEl = document.getElementById('enroll-progress-label');

  [labelInput, typeInput, breedInput, colorsInput, hrefInput, notesInput, verificationPromptInput, verificationAnswerInput, fileInput].forEach(clearValidityOnInput);
  attachBreedAutocomplete?.(breedInput, typeInput, 'breed-suggestions-enroll');
  await loadModels(statusEl);

  function setProgress(percent = 0, label = '') {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    progressFillEl.style.width = `${safePercent}%`;
    progressFillEl.setAttribute('aria-valuenow', String(Math.round(safePercent)));
    progressLabelEl.textContent = label || (safePercent >= 100 ? 'העיבוד הושלם.' : `עיבוד: ${Math.round(safePercent)}%`);
  }

  function renderBreedChips(type = '', preferred = '') {
    if (!breedChipPicker) return;
    const breeds = getBreedsForType(type);
    if (!breeds.length) {
      breedChipPicker.innerHTML = '<div class="small">הגדירי קודם סוג חיה כדי לקבל הצעות גזע מהירות.</div>';
      return;
    }
    breedChipPicker.innerHTML = breeds.map((breed) => `<button class="chip-btn ${breed === preferred ? 'active' : ''}" type="button" data-breed="${escapeHtml(breed)}">${escapeHtml(breed)}</button>`).join('');
    breedChipPicker.querySelectorAll('[data-breed]').forEach((button) => {
      button.addEventListener('click', () => {
        breedInput.value = button.dataset.breed || '';
        renderBreedChips(typeInput.value, breedInput.value.trim());
      });
    });
  }

  function render() {
    const entries = loadLocalLibrary();
    if (!entries.length) {
      libraryEl.innerHTML = '<div class="empty">עדיין אין רשומות להצגה.</div>';
      outputEl.textContent = JSON.stringify({ version: 3, updated_at: new Date().toISOString().slice(0, 10), entries: [] }, null, 2);
      return;
    }
    const cards = entries.map((entry, idx) => {
      const safeLabel = escapeHtml(entry.label);
      const safeNotes = escapeHtml(entry.notes || '');
      const safeType = escapeHtml(entry.animalType || 'לא צוין');
      const safeBreed = escapeHtml(entry.breed || 'לא צוין');
      const safeColors = escapeHtml(entry.colors || entry.colorName || 'לא צוין');
      const thumb = entry.thumb ? `<div class="thumb-wrap blur-shell"><img class="blur-up is-loading" loading="lazy" decoding="async" onload="this.classList.remove('is-loading')" src="${entry.thumb}" alt="${safeLabel}"></div>` : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
      return `
        <article class="library-card">
          ${thumb}
          <div class="body">
            <strong>${safeLabel}</strong>
            <div class="row">
              <span class="badge">${safeType}</span>
              <span class="badge">${safeBreed}</span>
              <span class="badge">${safeColors}</span>
              <span class="badge">${formatSampleCount(entry.descriptors.length)}</span>
              ${entry.verificationPrompt ? '<span class="badge">כולל סימן זיהוי</span>' : ''}
            </div>
            <div class="small">${safeNotes}</div>
            <button class="bad small" type="button" data-remove="${idx}">הסרה</button>
          </div>
        </article>
      `;
    }).join('');
    libraryEl.innerHTML = `<div class="library-grid">${cards}</div>`;
    outputEl.textContent = JSON.stringify({ version: 3, updated_at: new Date().toISOString().slice(0, 10), entries }, null, 2);
    libraryEl.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const items = loadLocalLibrary();
        items.splice(Number(button.dataset.remove), 1);
        saveLocalLibrary(items);
        render();
      });
    });
  }

  typeInput.addEventListener('input', () => renderBreedChips(typeInput.value, breedInput.value.trim()));
  typeInput.addEventListener('change', () => renderBreedChips(typeInput.value, breedInput.value.trim()));
  breedInput.addEventListener('input', () => renderBreedChips(typeInput.value, breedInput.value.trim()));

  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!setRequiredValidity(labelInput, 'שם החיה הוא שדה חובה.')) {
      setStatus(statusEl, 'יש להזין שם או מזהה לחיה קודם.', { tone: 'warn' });
      return;
    }
    if (!setRequiredValidity(fileInput, 'נא לבחור לפחות תמונה אחת.')) {
      setStatus(statusEl, 'יש לבחור לפחות תמונה אחת.', { tone: 'warn' });
      return;
    }

    const label = labelInput.value.trim();
    const href = hrefInput.value.trim();
    const files = Array.from(fileInput.files || []);
    if (href && !isSafeProfileHref(href)) {
      hrefInput.setCustomValidity('יש להזין נתיב יחסי כמו ./profiles/dog.html, נתיב אתר, או כתובת http(s) מלאה.');
      hrefInput.reportValidity();
      setStatus(statusEl, 'נא לתקן את שדה קישור הפרופיל.', { tone: 'warn' });
      return;
    }

    const verificationPrompt = verificationPromptInput.value.trim();
    const verificationAnswer = verificationAnswerInput.value.trim();
    if ((verificationPrompt && !verificationAnswer) || (!verificationPrompt && verificationAnswer)) {
      const target = verificationPrompt ? verificationAnswerInput : verificationPromptInput;
      target.setCustomValidity('יש למלא גם שאלה וגם תשובה כדי להפעיל סימן זיהוי.');
      target.reportValidity();
      setStatus(statusEl, 'אם מוסיפים סימן זיהוי, צריך למלא גם שאלה וגם תשובה.', { tone: 'warn' });
      return;
    }

    setButtonBusy?.(addBtn, true, 'מעבד תמונות…');
    setProgress(8, 'בודק את התמונות…');
    try {
      const descriptors = [];
      const colorHistograms = [];
      let thumb = '';
      let usable = 0;
      let resizedCount = 0;
      let avgHex = '#7f7f7f';
      let avgRgb = [127, 127, 127];
      let colorName = 'מעורב';
      setStatus(statusEl, `מעבד ${files.length} תמונות…`, { busy: true });

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const prepared = await fileToPreparedImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
        try {
          if (prepared.wasResized) resizedCount += 1;
          const features = await extractAnimalFeaturesForEnrollment(prepared.img);
          descriptors.push(...features.embeddings);
          colorHistograms.push(...features.colorHistograms);
          usable += 1;
          if (!thumb) thumb = features.preview;
          if (usable === 1) {
            avgHex = features.avgHex;
            avgRgb = features.avgRgb;
            colorName = features.colorName;
          }
          setProgress(15 + (((index + 1) / files.length) * 75), `עובד על תמונה ${index + 1} מתוך ${files.length}…`);
        } finally {
          prepared.cleanup();
        }
      }

      prepNoteEl.textContent = resizedCount
        ? `${resizedCount} תמונות כבדות נדחסו מקומית ל-1200px, ולמנוע ההתאמה נבנה גם עותק מנורמל של 512×512 בגווני אפור כדי לייצב מאפיינים.`
        : 'התמונות נשמרו להצגה, ולמנוע ההתאמה נבנה עותק מנורמל של 512×512 בגווני אפור.';

      if (!descriptors.length) {
        setProgress(0, 'לא נמצאו תמונות שימושיות.');
        setStatus(statusEl, 'לא ניתן היה להפיק מאפיינים מהקבצים האלה. נסי תמונות שבהן החיה תופסת חלק ברור מהפריים, ועדיף בלי אנשים ליד.', { tone: 'warn' });
        return;
      }

      const verificationAnswerHash = verificationAnswer ? await sha256Hex(verificationAnswer) : '';
      const entry = normalizeEntry({
        id: slugify(label),
        label,
        animalType: typeInput.value.trim(),
        breed: breedInput.value.trim(),
        colors: colorsInput.value.trim(),
        href: href || '#',
        thumb,
        notes: notesInput.value.trim(),
        verificationPrompt,
        verificationAnswerHash,
        descriptors,
        colorHistograms,
        avgRgb,
        avgHex,
        colorName,
        source: 'local',
      });

      const entries = loadLocalLibrary();
      const existingIndex = entries.findIndex((item) => normalizeEntry(item).id === entry.id);
      if (existingIndex >= 0) {
        const existing = normalizeEntry(entries[existingIndex]);
        entries[existingIndex] = normalizeEntry({
          ...existing,
          label: entry.label,
          animalType: entry.animalType || existing.animalType,
          breed: entry.breed || existing.breed,
          colors: entry.colors || existing.colors,
          href: entry.href || existing.href || '#',
          thumb: entry.thumb || existing.thumb || '',
          notes: entry.notes || existing.notes || '',
          verificationPrompt: entry.verificationPrompt || existing.verificationPrompt || '',
          verificationAnswerHash: entry.verificationAnswerHash || existing.verificationAnswerHash || '',
          descriptors: [...existing.descriptors, ...entry.descriptors],
          colorHistograms: [...existing.colorHistograms, ...entry.colorHistograms],
          avgRgb: entry.avgRgb || existing.avgRgb,
          avgHex: entry.avgHex || existing.avgHex,
          colorName: entry.colorName || existing.colorName,
          source: 'local',
        });
      } else {
        entries.push(entry);
      }
      saveLocalLibrary(entries.map((item) => normalizeEntry({ ...item, source: 'local' })));
      render();
      createForm.reset();
      verificationPromptInput.setCustomValidity('');
      verificationAnswerInput.setCustomValidity('');
      renderBreedChips('', '');
      setProgress(100, 'הרשומה נשמרה.');
      setStatus(statusEl, `${existingIndex >= 0 ? 'עודכנה' : 'נוספה'} הרשומה ${label} עם ${usable} ${usable === 1 ? 'תמונה תקינה אחת' : 'תמונות תקינות'}${verificationPrompt ? ' וגם סימן זיהוי פרטי.' : '.'}`, { tone: 'success' });
    } catch (error) {
      console.error(error);
      setProgress(0, 'העיבוד נכשל.');
      setStatus(statusEl, `לא ניתן היה ליצור את הרשומה: ${error.message}`, { tone: 'warn' });
    } finally {
      setButtonBusy?.(addBtn, false);
    }
  });

  exportBtn.addEventListener('click', () => {
    const entries = loadLocalLibrary().map((entry) => normalizeEntry({ ...entry, source: 'local' }))
      .filter((entry) => entry.descriptors.length || entry.colorHistograms.length);
    if (!entries.length) {
      setStatus(statusEl, 'יש להוסיף לפחות רשומת חיה תקינה אחת לפני ייצוא library.json.', { tone: 'warn' });
      return;
    }
    exportJson('library.json', { version: 3, updated_at: new Date().toISOString().slice(0, 10), entries });
    recordImpactEvent('export-library', { localAnimals: entries.length });
    setStatus(statusEl, 'הקובץ library.json יוצא בהצלחה.', { tone: 'success' });
  });

  clearBtn.addEventListener('click', () => {
    saveLocalLibrary([]);
    render();
    setProgress(0, 'הקטלוג נוקה.');
    setStatus(statusEl, 'הקטלוג נוקה בהצלחה.', { tone: 'success' });
  });

  setProgress(0, 'ממתין לתמונות.');
  renderBreedChips(typeInput.value, breedInput.value.trim());
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  runEnrollPage().catch((error) => {
    console.error(error);
    const statusEl = document.getElementById('status');
    (window.setStatus || fallbackSetStatus)(statusEl, `הטעינה נכשלה: ${error.message}`, { tone: 'warn' });
  });
});
