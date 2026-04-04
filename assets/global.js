(function () {
  function manager() {
    return window.PetConnectLang || null;
  }

  window.getAppLanguage = window.getAppLanguage || function () {
    return manager()?.get?.() || document.documentElement.lang || 'he';
  };

  window.setAppLanguage = window.setAppLanguage || function (lang, options = {}) {
    if (manager()?.set) return manager().set(lang, options);
    document.documentElement.lang = lang || 'he';
    document.documentElement.dir = (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr';
    if (options.reload !== false && window.location?.reload) window.location.reload();
    return document.documentElement.lang;
  };

  window.toggleLanguage = window.toggleLanguage || function () {
    return manager()?.switch?.() || window.setAppLanguage(window.getAppLanguage() === 'he' ? 'en' : 'he');
  };

  window.switchLanguage = window.switchLanguage || window.toggleLanguage;
  window.__petconnectInitPageLanguage = window.__petconnectInitPageLanguage || function () {
    return manager()?.boot?.();
  };
})();
