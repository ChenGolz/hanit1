(function () {
  async function queueBackgroundReport(url, payload = {}) {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (!registration?.active) return false;
    try {
      registration.active.postMessage({
      type: 'queue-report',
      payload: {
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
    });
    } catch (error) {
      console.warn('שליחת הודעה ל-Service Worker נכשלה:', error);
      return false;
    }
    if ('sync' in registration) {
      try {
        await registration.sync.register('send-report');
      } catch (error) {
        console.warn('רישום Background Sync נכשל:', error);
      }
    }
    return true;
  }


  async function flushQueuedBackgroundReports() {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (!registration?.active) return false;
    try { registration.active.postMessage({ type: 'flush-report-queue' }); } catch (error) { console.warn('בקשת flush ל-Service Worker נכשלה:', error); return false; }
    if ('sync' in registration) {
      try {
        await registration.sync.register('send-report');
      } catch (error) {
        console.warn('רישום סנכרון-מחדש נכשל:', error);
      }
    }
    return true;
  }

  async function postMultipart(url, formData, options = {}) {
    const button = options.button || null;
    const setBusy = options.setBusy || window.setButtonBusy;
    const statusEl = options.statusEl || null;
    const busyText = options.busyText || 'מעלה…';
    try {
      setBusy?.(button, true, busyText);
      if (statusEl && window.setStatus) window.setStatus(statusEl, 'מעלה את התמונה ומחפש התאמות…', { busy: true });
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: options.headers || undefined,
        credentials: options.credentials || 'same-origin',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || `Request failed with status ${response.status}`);
      }
      if (Array.isArray(payload?.matches)) {
        window.displayMatches?.(payload.matches, {
          kind: payload.kind || 'visual',
          heading: payload.heading || 'נמצאו התאמות!',
          container: options.resultsContainer || null,
        });
      }
      return payload;
    } catch (error) {
      if (options.queueOnFailure && options.serializablePayload) {
        try {
          const queued = await queueBackgroundReport(url, options.serializablePayload);
          if (queued && statusEl && window.setStatus) {
            window.setStatus(statusEl, 'אין חיבור כרגע. הדיווח נשמר לניסיון שליחה אוטומטי כשיחזור חיבור.', { tone: 'warn' });
          }
        } catch (queueError) {
          console.warn('שמירת הדיווח לסנכרון נכשלה:', queueError);
        }
      }
      throw error;
    } finally {
      setBusy?.(button, false);
    }
  }

  window.addEventListener?.('online', () => {
    flushQueuedBackgroundReports().catch(() => {});
  });

  Object.assign(window, {
    shrinkImage: window.shrinkImage || window.fileToPreparedImage,
    displayMatches: window.displayMatches,
    postMultipart,
    queueBackgroundReport,
    flushQueuedBackgroundReports,
  });
})();
