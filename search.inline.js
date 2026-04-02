
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
        const needed = ['registerServiceWorker', 'setStatus', 'extractAnimalFeatures'];
        const start = Date.now();
        while (Date.now() - start < 5000) {
          if (needed.every((name) => typeof window[name] === 'function')) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error('קובץ העזר assets/common.js לא נטען. נסי רענון קשיח עם Ctrl + F5.');
      }

      async function runSearchPage() {
        await waitForCommonHelpers();
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
        const resultsEl = document.getElementById('results');
        const summaryEl = document.getElementById('summary');
        const libraryStatsEl = document.getElementById('library-stats');
        const importInput = document.getElementById('import-json');
        const clearImportedBtn = document.getElementById('clear-imported');
        const minScoreInput = document.getElementById('min-score');
        const minScoreOutput = document.getElementById('min-score-value');
        const prepNoteEl = document.getElementById('prep-note');
        const cityInput = document.getElementById('city-name');
        const locateBtn = document.getElementById('locate-btn');
        const locationStatusEl = document.getElementById('location-status');
        const resultsSection = document.getElementById('results-section');
        const selectionHintEl = document.getElementById('selection-hint');

        clearValidityOnInput(fileInput);
        clearValidityOnInput(cityInput);
        minScoreOutput.textContent = `${minScoreInput.value}%`;

        let currentPreviewImage = null;
        let currentSelection = null;
        let currentLibrary = [];
        let currentPreparedImage = null;
        let currentQueryFeatures = null;
        let geoState = { lat: null, lng: null };
        let dragState = { active: false, startX: 0, startY: 0 };

        await loadModels(statusEl);
        currentLibrary = await getMergedLibrary();
        libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);

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

          const cards = matches.map((match) => {
            const target = match.href && match.href !== '#' ? match.href : '';
            const safeLabel = escapeHtml(match.label);
            const safeNotes = escapeHtml(match.notes);
            const animalType = match.animalType ? `<span class="badge">${escapeHtml(match.animalType)}</span>` : '';
            const colors = match.colors ? `<span class="badge">${escapeHtml(match.colors)}</span>` : `<span class="badge">${escapeHtml(match.colorName)}</span>`;
            const notes = match.notes ? `<div class="small">${safeNotes}</div>` : '';
            const thumb = match.thumb ? `<div class="thumb-wrap"><img src="${match.thumb}" alt="${safeLabel}"></div>` : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
            const reportHref = buildMunicipalReportHref({
              city: cityInput.value,
              lat: geoState.lat,
              lng: geoState.lng,
              bestMatch: match,
            });
            const profileButton = target
              ? `<a class="button-link small" href="${escapeHtml(target)}">פתיחת פרופיל</a>`
              : '<span class="badge">אין קישור פרופיל</span>';
            const scoreText = bundle.kind === 'visual' ? formatPct(match.score) : `דמיון צבע ${formatPct(match.colorScore)}`;
            const reason = bundle.kind === 'visual'
              ? 'התאמה ויזואלית + צבע'
              : 'הצגה לפי צבעים דומים';
            return `
              <article class="result-card">
                ${thumb}
                <div class="body">
                  <div class="space-between">
                    <strong>${safeLabel}</strong>
                    <span class="score ${match.confidence}">${scoreText}</span>
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
                    <a class="button-link secondary small" href="${reportHref}">דיווח למוקד 106</a>
                  </div>
                </div>
              </article>
            `;
          }).join('');

          resultsEl.innerHTML = `<div class="result-grid">${cards}</div>`;
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
            if (top.score >= 0.84) {
              tone = 'high';
              title = `נמצאה התאמה חזקה: ${escapeHtml(top.label)}`;
              body = `המערכת מצאה דמיון ויזואלי גבוה של ${formatPct(top.score)}. כדאי לבדוק קודם את הכרטיס הראשון.`;
            } else if (top.score >= 0.7) {
              tone = 'medium';
              title = `מועמד מוביל: ${escapeHtml(top.label)}`;
              body = `ההתאמה הטובה ביותר כרגע היא ${formatPct(top.score)}. אפשר להמשיך לעבור על שאר הכרטיסים.`;
            }
          } else {
            tone = 'medium';
            title = 'לא הייתה התאמה ויזואלית חזקה — מציג חיות בצבעים דומים';
            body = 'כדי לא לפספס, מוצגות עכשיו רשומות עם דמיון צבעים לחיה שסימנת. נסי גם לבחור אזור מדויק יותר סביב החיה בלבד.';
          }

          const reportHref = buildMunicipalReportHref({
            city: cityInput.value,
            lat: geoState.lat,
            lng: geoState.lng,
            bestMatch: top,
          });
          const profileAction = top.href && top.href !== '#'
            ? `<a class="button-link small" href="${escapeHtml(top.href)}">פתיחת הפרופיל של ${escapeHtml(top.label)}</a>`
            : '';

          summaryEl.className = `summary-banner ${tone}`;
          summaryEl.innerHTML = `
            <div class="chip">נמצאו ${matches.length} תוצאות</div>
            <h3 style="margin:0;">${title}</h3>
            <div class="small">${body}</div>
            <div class="summary-actions">
              ${profileAction}
              <a class="button-link secondary small" href="${reportHref}">דיווח למוקד 106</a>
            </div>
          `;
          summaryEl.classList.remove('hidden');
        }

        async function runSearch() {
          if (!currentPreviewImage || !currentSelection) {
            setStatus(statusEl, 'קודם צריך להעלות תמונה ולסמן אזור של החיה.', { tone: 'warn' });
            return;
          }
          currentLibrary = await getMergedLibrary();
          libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
          if (!currentLibrary.length) {
            setStatus(statusEl, 'המאגר עדיין ריק. הוסיפי רשומות דרך עמוד בניית המאגר או דרך data/library.json.', { tone: 'warn' });
            return;
          }

          runSelectedBtn.disabled = true;
          setStatus(statusEl, 'סורק את אזור החיה ומחפש התאמות…', { busy: true });
          const queryCanvas = cropRectToCanvas(currentPreviewImage, currentSelection);
          currentQueryFeatures = await extractAnimalFeatures(queryCanvas);
          const bundle = computeSearchResults(currentQueryFeatures, currentLibrary, {
            minScore: Math.max(0.35, Math.min(0.9, Number(minScoreInput.value) / 100)),
          });
          renderSummary(bundle);
          renderResults(bundle);
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

          if (bundle.kind === 'visual') {
            setStatus(statusEl, `החיפוש הושלם. נמצאו ${bundle.matches.length} התאמות ויזואליות אפשריות.`, { tone: 'success' });
          } else {
            setStatus(statusEl, 'לא נמצאה התאמה ויזואלית חזקה, לכן מוצגות עכשיו חיות בצבעים דומים.', { tone: 'warn' });
          }
          runSelectedBtn.disabled = false;
        }

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
            geoState = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            locationStatusEl.textContent = `המיקום נשמר: ${formatCoordinates(geoState.lat, geoState.lng)}`;
            locateBtn.disabled = false;
          }, (error) => {
            locationStatusEl.textContent = `לא ניתן היה לקבל מיקום: ${error.message}`;
            locateBtn.disabled = false;
          }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
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
        });

        clearImportedBtn.addEventListener('click', async () => {
          saveImportedLibrary([]);
          currentLibrary = await getMergedLibrary();
          libraryStatsEl.textContent = formatEntryCount(currentLibrary.length);
          setStatus(statusEl, 'המאגר המיובא של הסשן נוקה.', { tone: 'success' });
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
          try {
            currentPreviewImage = null;
            currentSelection = null;
            currentQueryFeatures = null;
            redrawPreview();
            cropImg.classList.add('hidden');
            cropMetaEl.textContent = 'עדיין לא נבחר אזור חיה.';
            prepNoteEl.textContent = '';

            setStatus(statusEl, 'מכין את התמונה לסריקה…', { busy: true });
            const prepared = await fileToPreparedImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.88 });
            currentPreparedImage = prepared;
            try {
              currentPreviewImage = cropRectToCanvas(prepared.img, fullImageRect(prepared.img));
              currentSelection = defaultSelectionRect(currentPreviewImage);
              redrawPreview();
              updateSelectionPreview();
              runSelectedBtn.disabled = false;

              if (prepared.wasResized) {
                prepNoteEl.textContent = `התמונה נדחסה מקומית מ-${prepared.originalWidth}×${prepared.originalHeight} ל-${prepared.width}×${prepared.height} כדי לזרז את החיפוש.`;
              } else {
                prepNoteEl.textContent = 'התמונה עובדה בגודל המקורי שלה.';
              }

              selectionHintEl.textContent = 'גררי מלבן סביב החיה עצמה. אם יש גם אנשים בתמונה, חשוב לסמן רק את החיה.';
              setStatus(statusEl, 'התמונה נטענה. סַמְּנִי את אזור החיה או השאירי את ברירת המחדל, ואז לחצי על "חיפוש לפי האזור שסומן".', { tone: 'success' });
              await runSearch();
            } finally {
              prepared.cleanup();
            }
          } catch (error) {
            console.error(error);
            setStatus(statusEl, `החיפוש נכשל: ${error.message}`, { tone: 'warn' });
          } finally {
            currentPreparedImage = null;
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
    