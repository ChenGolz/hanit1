(function(){
  const LANG_KEY = 'appLanguage';
  const APP_LANG_ALIAS_KEY = 'appLang';
  const LEGACY_KEY = 'petconnect-ui-lang-v1';
  function normalizeLang(value){
    const lang = String(value || '').slice(0,2).toLowerCase();
    return ['he','en','ar'].includes(lang) ? lang : 'he';
  }
  function readStoredLanguage(){
    return normalizeLang(localStorage.getItem(LANG_KEY) || localStorage.getItem(APP_LANG_ALIAS_KEY) || localStorage.getItem(LEGACY_KEY) || document.documentElement.lang || 'he');
  }
  function persistLanguage(lang){
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, next);
      localStorage.setItem(APP_LANG_ALIAS_KEY, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch (e) {}
    document.documentElement.lang = next;
    document.documentElement.dir = (next === 'he' || next === 'ar') ? 'rtl' : 'ltr';
    return next;
  }
  function applyStoredLanguage(){
    return persistLanguage(readStoredLanguage());
  }
  function setAppLanguage(lang, opts){
    const next = persistLanguage(lang);
    if (window.initLang) window.initLang(next);
    if (window.applyTranslations) window.applyTranslations(document);
    document.querySelectorAll('[data-lang]').forEach((el)=>el.classList.toggle('active', el.dataset.lang === next));
    if (!opts || opts.reload !== false) window.location.reload();
  }
  window.toggleLanguage = function(){
    const current = readStoredLanguage();
    const next = current === 'he' ? 'en' : current === 'en' ? 'ar' : 'he';
    setAppLanguage(next);
  };
  window.setAppLanguage = setAppLanguage;
  window.getAppLanguage = readStoredLanguage;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStoredLanguage, {once:true});
  } else {
    applyStoredLanguage();
  }
})();

window.switchLanguage = window.switchLanguage || window.toggleLanguage;

window.__petconnectInitPageLanguage = window.__petconnectInitPageLanguage || applyStoredLanguage;
