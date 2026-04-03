(function(){
  const LANG_KEY = 'appLanguage';
  const LANG_ALIAS = 'appLang';
  const LEGACY_KEY = 'petconnect-ui-lang-v1';
  function normalizeLang(v){
    const lang = String(v || '').slice(0,2).toLowerCase();
    return ['he','en','ar'].includes(lang) ? lang : 'he';
  }
  function getSavedLang(){
    try {
      return normalizeLang(localStorage.getItem(LANG_KEY) || localStorage.getItem(LANG_ALIAS) || localStorage.getItem(LEGACY_KEY) || document.documentElement.lang || 'he');
    } catch (e) {
      return 'he';
    }
  }
  function persistLang(lang){
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, next);
      localStorage.setItem(LANG_ALIAS, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch (e) {}
    document.documentElement.lang = next;
    document.documentElement.dir = (next === 'he' || next === 'ar') ? 'rtl' : 'ltr';
    document.body?.classList.toggle('lang-is-rtl', document.documentElement.dir === 'rtl');
    document.body?.classList.toggle('lang-is-ltr', document.documentElement.dir === 'ltr');
    document.querySelectorAll('.lang-he').forEach((el) => { el.hidden = next !== 'he'; });
    document.querySelectorAll('.lang-en').forEach((el) => { el.hidden = next !== 'en'; });
    document.querySelectorAll('.lang-ar').forEach((el) => { el.hidden = next !== 'ar'; });
    document.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('active', el.dataset.lang === next));
    return next;
  }
  function applyAll(){
    const lang = persistLang(getSavedLang());
    try { window.initLang?.(lang); } catch (e) {}
    try { window.applyTranslations?.(document); } catch (e) {}
    return lang;
  }
  window.switchLanguage = function(){
    const current = getSavedLang();
    const next = current === 'he' ? 'en' : 'he';
    persistLang(next);
    window.location.reload();
  };
  window.__petconnectInitPageLanguage = applyAll;
  document.addEventListener('DOMContentLoaded', applyAll, { once: true });
})();
