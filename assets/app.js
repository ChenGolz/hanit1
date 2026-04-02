(function () {
  async function postMultipart(url, formData, options = {}) {
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
      });
    }
    return payload;
  }

  Object.assign(window, {
    shrinkImage: window.shrinkImage || window.fileToPreparedImage,
    displayMatches: window.displayMatches,
    postMultipart,
  });
})();
