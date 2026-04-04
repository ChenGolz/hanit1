(function () {
  const LANG_KEY = 'appLanguage';
  const LANG_ALIAS_KEY = 'appLang';
  const LEGACY_KEY = 'petconnect-ui-lang-v1';
  const RTL_LANGS = new Set(['he', 'ar']);

  function normalizeLang(value) {
    const lang = String(value || '').trim().slice(0, 2).toLowerCase();
    return ['he', 'en', 'ar'].includes(lang) ? lang : 'he';
  }

  function readStoredLang() {
    try {
      return normalizeLang(
        localStorage.getItem(LANG_KEY)
          || localStorage.getItem(LANG_ALIAS_KEY)
          || localStorage.getItem(LEGACY_KEY)
          || document.documentElement.lang
          || navigator.language
          || 'he'
      );
    } catch (error) {
      return normalizeLang(document.documentElement.lang || navigator.language || 'he');
    }
  }

  function writeStoredLang(lang) {
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, next);
      localStorage.setItem(LANG_ALIAS_KEY, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch (error) {}
    return next;
  }

  function updateDomLanguage(lang) {
    const next = normalizeLang(lang);
    const direction = RTL_LANGS.has(next) ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    document.documentElement.dir = direction;
    document.body?.classList.toggle('lang-is-rtl', direction === 'rtl');
    document.body?.classList.toggle('lang-is-ltr', direction === 'ltr');
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.classList.toggle('active', button.dataset.lang === next);
    });
    document.querySelectorAll('.lang-he').forEach((el) => { el.hidden = next !== 'he'; });
    document.querySelectorAll('.lang-en').forEach((el) => { el.hidden = next !== 'en'; });
    document.querySelectorAll('.lang-ar').forEach((el) => { el.hidden = next !== 'ar'; });
    return next;
  }

  function applyLanguage(lang, options = {}) {
    const next = updateDomLanguage(writeStoredLang(lang));
    if (typeof window.initLang === 'function') {
      try { window.initLang(next); } catch (error) { console.warn('initLang failed', error); }
    }
    if (typeof window.applyTranslations === 'function') {
      try { window.applyTranslations(options.root || document); } catch (error) { console.warn('applyTranslations failed', error); }
    }
    return next;
  }

  function currentLanguage() {
    return readStoredLang();
  }

  function switchLanguage(nextLang) {
    const current = currentLanguage();
    const next = nextLang ? normalizeLang(nextLang) : (current === 'he' ? 'en' : current === 'en' ? 'ar' : 'he');
    applyLanguage(next);
    if (window.location?.reload) window.location.reload();
  }

  function bootLanguage() {
    applyLanguage(currentLanguage(), { root: document });
  }

  window.PetConnectLang = {
    normalizeLang,
    get: currentLanguage,
    set: (lang, options = {}) => {
      const next = applyLanguage(lang, options);
      if (options.reload !== false && window.location?.reload) window.location.reload();
      return next;
    },
    boot: bootLanguage,
    switch: switchLanguage,
  };

  window.getAppLanguage = window.getAppLanguage || currentLanguage;
  window.setAppLanguage = window.setAppLanguage || ((lang, options = {}) => window.PetConnectLang.set(lang, options));
  window.switchLanguage = window.switchLanguage || switchLanguage;
  window.toggleLanguage = window.toggleLanguage || switchLanguage;
  window.__petconnectInitPageLanguage = bootLanguage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLanguage, { once: true });
  } else {
    bootLanguage();
  }

  window.addEventListener?.('storage', (event) => {
    if (![LANG_KEY, LANG_ALIAS_KEY, LEGACY_KEY].includes(event.key)) return;
    updateDomLanguage(readStoredLang());
    if (typeof window.applyTranslations === 'function') {
      try { window.applyTranslations(document); } catch (error) {}
    }
  });
})();
