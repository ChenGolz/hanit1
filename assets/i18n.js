const I18N_STORAGE_KEY = 'petconnect-ui-lang-v1';
const I18N_STRINGS = {
  he: {
    lastMatchesTitle: 'התוצאות האחרונות שלך',
    lastMatchesSubtitle: 'אחרי חיפוש, שלוש ההתאמות המובילות נשמרות כאן כדי שתוכלי לחזור אליהן מיד.',
    noRecentMatches: 'עדיין אין תוצאות אחרונות. בצעי חיפוש כדי לראות כאן את שלוש ההתאמות המובילות.',
    openSearch: 'פתיחת חיפוש חיה',
    openProfile: 'פתיחת פרופיל',
    potentialMatches: 'התאמות אפשריות',
    previous: 'הקודם',
    next: 'הבא',
  },
  en: {
    lastMatchesTitle: 'Your recent matches',
    lastMatchesSubtitle: 'After a search, the top 3 matches stay here so you can reopen them instantly.',
    noRecentMatches: 'No recent matches yet. Run a search to see the top 3 matches here.',
    openSearch: 'Open animal search',
    openProfile: 'Open profile',
    potentialMatches: 'Potential matches',
    previous: 'Previous',
    next: 'Next',
  },
  ar: {
    lastMatchesTitle: 'آخر النتائج',
    lastMatchesSubtitle: 'بعد كل بحث، يتم حفظ أفضل 3 نتائج هنا لتتمكني من الرجوع إليها فورًا.',
    noRecentMatches: 'لا توجد نتائج حديثة بعد. أجري بحثًا لرؤية أفضل 3 نتائج هنا.',
    openSearch: 'فتح بحث الحيوان',
    openProfile: 'فتح الملف',
    potentialMatches: 'مطابقات محتملة',
    previous: 'السابق',
    next: 'التالي',
  },
};

function initLang(defaultLang = 'he') {
  const stored = localStorage.getItem(I18N_STORAGE_KEY);
  const preferred = (stored || document.documentElement.lang || navigator.language || defaultLang || 'he').slice(0, 2).toLowerCase();
  const lang = I18N_STRINGS[preferred] ? preferred : defaultLang;
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
  return lang;
}

function t(key, fallback = '') {
  const lang = document.documentElement.lang?.slice(0, 2).toLowerCase() || 'he';
  return I18N_STRINGS[lang]?.[key] ?? I18N_STRINGS.he?.[key] ?? fallback ?? key;
}

function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const text = t(key, el.textContent);
    if (text != null) el.textContent = text;
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    const text = t(key, el.getAttribute('aria-label') || '');
    if (text != null) el.setAttribute('aria-label', text);
  });
}

if (typeof window !== 'undefined') {
  Object.assign(window, { I18N_STRINGS, initLang, t, applyTranslations });
}
