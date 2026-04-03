(function(){
  const LANG_KEY = 'appLanguage';
  const LEGACY_KEY = 'petconnect-ui-lang-v1';
  function normalizeLang(value){
    const lang = String(value || '').slice(0,2).toLowerCase();
    return ['he','en','ar'].includes(lang) ? lang : 'he';
  }
  function applyStoredLanguage(){
    const saved = normalizeLang(localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_KEY) || document.documentElement.lang || 'he');
    try {
      localStorage.setItem(LANG_KEY, saved);
      localStorage.setItem(LEGACY_KEY, saved);
    } catch (e) {}
    document.documentElement.lang = saved;
    document.documentElement.dir = (saved === 'he' || saved === 'ar') ? 'rtl' : 'ltr';
    return saved;
  }
  function setAppLanguage(lang, opts){
    const next = normalizeLang(lang);
    try {
      localStorage.setItem(LANG_KEY, next);
      localStorage.setItem(LEGACY_KEY, next);
    } catch (e) {}
    document.documentElement.lang = next;
    document.documentElement.dir = (next === 'he' || next === 'ar') ? 'rtl' : 'ltr';
    if (window.initLang) window.initLang(next);
    if (window.applyTranslations) window.applyTranslations(document);
    document.querySelectorAll('[data-lang]').forEach((el)=>el.classList.toggle('active', el.dataset.lang === next));
    if (!opts || opts.reload !== false) window.location.reload();
  }
  window.toggleLanguage = function(){
    const current = normalizeLang(localStorage.getItem(LANG_KEY) || 'he');
    const next = current === 'he' ? 'en' : 'he';
    setAppLanguage(next);
  };
  window.setAppLanguage = setAppLanguage;
  window.getAppLanguage = function(){ return normalizeLang(localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_KEY) || 'he'); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStoredLanguage, {once:true});
  } else {
    applyStoredLanguage();
  }
})();
