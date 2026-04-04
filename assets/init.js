(function () {
  const LANG_KEY = 'appLang';
  const MIRROR_KEYS = ['petAppLang', 'userLanguage', 'appLanguage', 'petconnect-ui-lang-v1'];
  const THEME_KEY = 'appTheme';
  const THEME_LEGACY_KEY = 'petconnect-ui-theme-v1';
  const SUPPORTED = new Set(['he', 'en', 'ar']);
  const RTL = new Set(['he', 'ar']);

  function normalizeLang(value) {
    const lang = String(value || '').trim().slice(0, 2).toLowerCase();
    return SUPPORTED.has(lang) ? lang : 'he';
  }

  function getSavedLanguage() {
    try {
      const stored = localStorage.getItem(LANG_KEY)
        || MIRROR_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
        || document.documentElement.lang
        || navigator.language
        || 'he';
      return normalizeLang(stored);
    } catch (error) {
      return normalizeLang(document.documentElement.lang || navigator.language || 'he');
    }
  }

  function saveLanguage(lang) {
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, next);
      MIRROR_KEYS.forEach((key) => localStorage.setItem(key, next));
    } catch (error) {}
    return next;
  }

  function updateLangClassVisibility(lang) {
    document.querySelectorAll('.lang-he').forEach((el) => { el.hidden = lang !== 'he'; });
    document.querySelectorAll('.lang-en').forEach((el) => { el.hidden = lang !== 'en'; });
    document.querySelectorAll('.lang-ar').forEach((el) => { el.hidden = lang !== 'ar'; });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.classList.toggle('active', button.dataset.lang === lang);
    });
    document.querySelectorAll('[data-lang-select]').forEach((select) => {
      select.value = lang;
    });
  }

  function applyLanguage(lang, options = {}) {
    const next = saveLanguage(lang);
    const dir = RTL.has(next) ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    document.documentElement.dir = dir;
    document.body?.classList.toggle('lang-is-rtl', dir === 'rtl');
    document.body?.classList.toggle('lang-is-ltr', dir === 'ltr');
    try {
      const theme = localStorage.getItem(THEME_KEY) || localStorage.getItem(THEME_LEGACY_KEY) || '';
      if (theme) document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    } catch (error) {}
    updateLangClassVisibility(next);
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

  function setLanguage(lang) {
    saveLanguage(lang);
    window.location.reload();
  }

  function switchLanguage() {
    const current = getSavedLanguage();
    const next = current === 'he' ? 'en' : current === 'en' ? 'ar' : 'he';
    setLanguage(next);
  }

  function changeLanguage(lang) {
    setLanguage(lang);
  }

  function changeSetting(key, value) {
    try {
      if (key === 'appTheme') {
        localStorage.setItem(THEME_KEY, value);
        localStorage.setItem(THEME_LEGACY_KEY, value);
      } else if (['appLang', 'petAppLang', 'userLanguage', 'appLanguage'].includes(key)) {
        saveLanguage(value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {}
    window.location.reload();
  }

  window.setLanguage = window.setLanguage || setLanguage;
  window.switchLanguage = window.switchLanguage || switchLanguage;
  window.toggleLanguage = window.toggleLanguage || switchLanguage;
  window.changeLanguage = window.changeLanguage || changeLanguage;
  window.toggleLang = window.toggleLang || changeLanguage;
  window.changeSetting = window.changeSetting || changeSetting;
  window.bootLanguage = window.bootLanguage || bootLanguage;
  window.__petconnectLanguage = {
    getSavedLanguage,
    saveLanguage,
    applyLanguage,
    bootLanguage,
    setLanguage,
    switchLanguage,
    normalizeLang,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLanguage, { once: true });
  } else {
    bootLanguage();
  }

  window.addEventListener?.('storage', (event) => {
    if (![LANG_KEY, ...MIRROR_KEYS, THEME_KEY, THEME_LEGACY_KEY].includes(event.key)) return;
    applyLanguage(getSavedLanguage(), { root: document });
  });
})();
