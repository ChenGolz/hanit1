(function () {
  const LANG_KEY = 'appLang';
  const LEGACY_KEYS = ['petAppLang', 'userLanguage', 'appLanguage', 'lang', 'preferredLang'];
  const THEME_KEY = 'appTheme';
  const VALID_LANGS = new Set(['he', 'en', 'ar']);

  function normalizeLang(value) {
    const lang = String(value || '').trim().toLowerCase();
    return VALID_LANGS.has(lang) ? lang : 'he';
  }

  function getSavedLanguage() {
    try {
      const primary = localStorage.getItem(LANG_KEY);
      if (primary) return normalizeLang(primary);
      for (const key of LEGACY_KEYS) {
        const value = localStorage.getItem(key);
        if (value) {
          const lang = normalizeLang(value);
          localStorage.setItem(LANG_KEY, lang);
          return lang;
        }
      }
    } catch (error) {}
    return 'he';
  }

  function persistLanguage(lang) {
    const value = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, value);
      for (const key of LEGACY_KEYS) localStorage.setItem(key, value);
    } catch (error) {}
    return value;
  }

  function applyDirection(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }

  function toggleLanguageClasses(lang) {
    const show = (selector, visible) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.display = visible ? '' : 'none';
      });
    };
    show('.lang-he', lang === 'he');
    show('.lang-en', lang === 'en');
    show('.lang-ar', lang === 'ar');
    document.querySelectorAll('[data-lang-select]').forEach((el) => {
      if (el.value !== lang) el.value = lang;
    });
  }

  function applyTheme(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = value;
    document.body?.classList.toggle('dark-mode', value === 'dark');
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (error) {
      return 'light';
    }
  }

  function bootLanguage() {
    const lang = persistLanguage(getSavedLanguage());
    applyDirection(lang);
    toggleLanguageClasses(lang);
    if (typeof window.initLang === 'function') window.initLang(lang);
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    return lang;
  }

  function bindLanguagePickers() {
    document.querySelectorAll('[data-lang-select]').forEach((el) => {
      if (el.__petconnectBound) return;
      el.__petconnectBound = true;
      el.addEventListener('change', (event) => {
        const next = normalizeLang(event.target.value);
        persistLanguage(next);
        location.reload();
      });
    });
  }

  window.setLanguage = function setLanguage(lang) {
    persistLanguage(lang);
    location.reload();
  };

  window.changeLanguage = window.setLanguage;

  window.toggleLang = function toggleLang(nextLang) {
    if (nextLang) return window.setLanguage(nextLang);
    const current = getSavedLanguage();
    const next = current === 'he' ? 'en' : 'he';
    return window.setLanguage(next);
  };

  window.changeSetting = function changeSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
    location.reload();
  };

  // Apply immediately before the page paints translations.
  applyDirection(getSavedLanguage());

  document.addEventListener('DOMContentLoaded', () => {
    bootLanguage();
    bindLanguagePickers();
    applyTheme(getSavedTheme());
  });
})();
