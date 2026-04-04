(function () {
  const USER_LANG_KEY = 'userLanguage';
  const LANG_KEY = 'appLanguage';
  const LANG_ALIAS_KEY = 'appLang';
  const EXTRA_LANG_KEY = 'petAppLang';
  const LEGACY_KEY = 'petconnect-ui-lang-v1';
  const SUPPORTED = new Set(['he', 'en', 'ar']);
  const RTL = new Set(['he', 'ar']);

  function normalizeLang(value) {
    const lang = String(value || '').trim().slice(0, 2).toLowerCase();
    return SUPPORTED.has(lang) ? lang : 'he';
  }

  function getSavedLanguage() {
    try {
      return normalizeLang(
        localStorage.getItem(USER_LANG_KEY)
        || localStorage.getItem(EXTRA_LANG_KEY)
        || localStorage.getItem(LANG_KEY)
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

  function saveLanguage(lang) {
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(USER_LANG_KEY, next);
      localStorage.setItem(EXTRA_LANG_KEY, next);
      localStorage.setItem(LANG_KEY, next);
      localStorage.setItem(LANG_ALIAS_KEY, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch (error) {}
    return next;
  }

  function updateLangClasses(lang) {
    document.querySelectorAll('.lang-he').forEach((el) => { el.hidden = lang !== 'he'; });
    document.querySelectorAll('.lang-en').forEach((el) => { el.hidden = lang !== 'en'; });
    document.querySelectorAll('.lang-ar').forEach((el) => { el.hidden = lang !== 'ar'; });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.classList.toggle('active', button.dataset.lang === lang);
    });
    const currentLabel = lang === 'ar' ? 'عر' : lang === 'en' ? 'EN' : 'עב';
    document.querySelectorAll('[data-lang-current]').forEach((node) => { node.textContent = currentLabel; });
  }

  function applyLanguage(lang, options = {}) {
    const next = saveLanguage(lang);
    const dir = RTL.has(next) ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    document.documentElement.dir = dir;
    document.body?.classList.toggle('lang-is-rtl', dir === 'rtl');
    document.body?.classList.toggle('lang-is-ltr', dir === 'ltr');
    updateLangClasses(next);
    if (typeof window.initLang === 'function') {
      try { window.initLang(next); } catch (error) { console.warn('initLang failed', error); }
    }
    if (typeof window.applyTranslations === 'function') {
      try { window.applyTranslations(options.root || document); } catch (error) { console.warn('applyTranslations failed', error); }
    }
    return next;
  }

  function bootLanguage() {
    return applyLanguage(getSavedLanguage(), { root: document });
  }

  function switchLanguage(nextLang) {
    const current = getSavedLanguage();
    const next = nextLang ? normalizeLang(nextLang) : (current === 'he' ? 'en' : 'he');
    saveLanguage(next);
    window.location.reload();
  }

  window.switchLanguage = window.switchLanguage || switchLanguage;
  window.toggleLanguage = window.toggleLanguage || switchLanguage;
  window.setLanguage = window.setLanguage || ((lang) => switchLanguage(lang));
  window.getAppLanguage = window.getAppLanguage || getSavedLanguage;
  window.setAppLanguage = window.setAppLanguage || ((lang, options = {}) => {
    const next = applyLanguage(lang, options);
    if (options.reload !== false) window.location.reload();
    return next;
  });
  window.__petconnectInitPageLanguage = bootLanguage;
  window.PetConnectLang = {
    get: getSavedLanguage,
    set: (lang, options = {}) => window.setAppLanguage(lang, options),
    boot: bootLanguage,
    switch: switchLanguage,
    normalizeLang,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLanguage, { once: true });
  } else {
    bootLanguage();
  }

  window.addEventListener?.('storage', (event) => {
    if (![USER_LANG_KEY, EXTRA_LANG_KEY, LANG_KEY, LANG_ALIAS_KEY, LEGACY_KEY].includes(event.key)) return;
    applyLanguage(getSavedLanguage(), { root: document });
  });
})();
