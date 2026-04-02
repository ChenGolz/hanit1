
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
        const needed = ['registerServiceWorker', 'setStatus', 'extractAnimalFeaturesForEnrollment'];
        const start = Date.now();
        while (Date.now() - start < 5000) {
          if (needed.every((name) => typeof window[name] === 'function')) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error('קובץ העזר assets/common.js לא נטען. נסי רענון קשיח עם Ctrl + F5.');
      }

      async function runEnrollPage() {
        await waitForCommonHelpers();
        window.registerServiceWorker?.();

        const statusEl = document.getElementById('status');
        const createForm = document.getElementById('create-entry-form');
        const labelInput = document.getElementById('animal-label');
        const typeInput = document.getElementById('animal-type');
        const colorsInput = document.getElementById('animal-colors');
        const hrefInput = document.getElementById('animal-href');
        const notesInput = document.getElementById('animal-notes');
        const fileInput = document.getElementById('animal-files');
        const addBtn = document.getElementById('add-btn');
        const exportBtn = document.getElementById('export-btn');
        const clearBtn = document.getElementById('clear-btn');
        const outputEl = document.getElementById('output-json');
        const libraryEl = document.getElementById('library-list');
        const prepNoteEl = document.getElementById('prep-note');

        [labelInput, typeInput, colorsInput, hrefInput, notesInput, fileInput].forEach(clearValidityOnInput);
        await loadModels(statusEl);

        function render() {
          const entries = loadLocalLibrary();
          if (!entries.length) {
            libraryEl.innerHTML = '<div class="empty">עדיין אין רשומות חיה מקומיות.</div>';
            outputEl.textContent = JSON.stringify({ version: 2, updated_at: new Date().toISOString().slice(0, 10), entries: [] }, null, 2);
            return;
          }
          const cards = entries.map((entry, idx) => {
            const safeLabel = escapeHtml(entry.label);
            const safeNotes = escapeHtml(entry.notes || '');
            const safeType = escapeHtml(entry.animalType || 'לא צוין');
            const safeColors = escapeHtml(entry.colors || entry.colorName || 'לא צוין');
            const thumb = entry.thumb ? `<div class="thumb-wrap"><img src="${entry.thumb}" alt="${safeLabel}"></div>` : '<div class="thumb-wrap"><div class="small">אין תמונה</div></div>';
            return `
              <article class="library-card">
                ${thumb}
                <div class="body">
                  <strong>${safeLabel}</strong>
                  <div class="row">
                    <span class="badge">${safeType}</span>
                    <span class="badge">${safeColors}</span>
                    <span class="badge">${formatSampleCount(entry.descriptors.length)}</span>
                  </div>
                  <div class="small">${safeNotes}</div>
                  <button class="bad small" type="button" data-remove="${idx}">הסרה</button>
                </div>
              </article>
            `;
          }).join('');
          libraryEl.innerHTML = `<div class="library-grid">${cards}</div>`;
          outputEl.textContent = JSON.stringify({ version: 2, updated_at: new Date().toISOString().slice(0, 10), entries }, null, 2);
          libraryEl.querySelectorAll('[data-remove]').forEach((button) => {
            button.addEventListener('click', () => {
              const items = loadLocalLibrary();
              items.splice(Number(button.dataset.remove), 1);
              saveLocalLibrary(items);
              render();
            });
          });
        }

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

          setButtonBusy?.(addBtn, true, 'מעבד תמונות…');
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

            for (const file of files) {
              const prepared = await fileToPreparedImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.80 });
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
              } finally {
                prepared.cleanup();
              }
            }

            prepNoteEl.textContent = resizedCount
              ? `${resizedCount} תמונות כבדות נדחסו מקומית ל-1024px כדי לקצר את זמן העיבוד וההעלאה.`
              : 'לא נדרשה דחיסה מקומית לתמונות שבחרת.';

            if (!descriptors.length) {
              setStatus(statusEl, 'לא ניתן היה להפיק מאפיינים מהקבצים האלה. נסי תמונות שבהן החיה תופסת חלק ברור מהפריים, ועדיף בלי אנשים ליד.', { tone: 'warn' });
              return;
            }

            const entry = normalizeEntry({
              id: slugify(label),
              label,
              animalType: typeInput.value.trim(),
              colors: colorsInput.value.trim(),
              href: href || '#',
              thumb,
              notes: notesInput.value.trim(),
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
                colors: entry.colors || existing.colors,
                href: entry.href || existing.href || '#',
                thumb: entry.thumb || existing.thumb || '',
                notes: entry.notes || existing.notes || '',
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
            setStatus(statusEl, `${existingIndex >= 0 ? 'עודכנה' : 'נוספה'} הרשומה ${label} עם ${usable} ${usable === 1 ? 'תמונה תקינה אחת' : 'תמונות תקינות'}.`, { tone: 'success' });
          } catch (error) {
            console.error(error);
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
          exportJson('library.json', { version: 2, updated_at: new Date().toISOString().slice(0, 10), entries });
          setStatus(statusEl, 'הקובץ library.json יוצא בהצלחה.', { tone: 'success' });
        });

        clearBtn.addEventListener('click', () => {
          saveLocalLibrary([]);
          render();
          setStatus(statusEl, 'המאגר המקומי בדפדפן נוקה.', { tone: 'success' });
        });

        render();
      }

      window.addEventListener('DOMContentLoaded', () => {
        runEnrollPage().catch((error) => {
          console.error(error);
          const statusEl = document.getElementById('status');
          (window.setStatus || fallbackSetStatus)(statusEl, `הטעינה נכשלה: ${error.message}`, { tone: 'warn' });
        });
      });
    