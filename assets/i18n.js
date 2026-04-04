
const I18N_STORAGE_USER_KEY = 'userLanguage';
const I18N_STORAGE_EXTRA_KEY = 'petAppLang';
const I18N_STORAGE_KEY = 'appLanguage';
const I18N_ALIAS_STORAGE_KEY = 'appLang';
const I18N_LEGACY_STORAGE_KEY = 'petconnect-ui-lang-v1';


function getStoredI18nLanguage() {
  try {
    return window.getAppLanguage?.()
      || localStorage.getItem(I18N_STORAGE_USER_KEY)
      || localStorage.getItem(I18N_STORAGE_EXTRA_KEY)
      || localStorage.getItem(I18N_STORAGE_KEY)
      || localStorage.getItem(I18N_ALIAS_STORAGE_KEY)
      || localStorage.getItem(I18N_LEGACY_STORAGE_KEY)
      || document.documentElement.lang
      || 'he';
  } catch (error) {
    return document.documentElement.lang || 'he';
  }
}
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

const PAGE_TRANSLATIONS = {
  '/index.html': {
    he: {
      title: 'פאטקונקט',
      selectors: {
        '.nav .nav-actions a.button-link.secondary.small': 'התחברות מתנדב',
        '.links a[href="./index.html"]': 'דף הבית',
        '.links a[href="./search.html"]': 'חיפוש חיה',
        '.links a[href="./enroll.html"]': 'בניית מאגר',
        '.links a[href="./report-found.html"]': 'דיווח חיה שנמצאה',
        '.hero .chip': 'עזרה מהירה מהשטח',
        '.hero h1': 'מאחדים חיות עם המשפחות שלהן — מהר, רגוע, ובשפה שלך.',
        '.hero p.meta': 'פלטפורמת ההצלה בנויה עכשיו כמו מוצר מובייל מודרני: מצלמה קודם, מסלולים ברורים לחיה שאבדה או נמצאה, ועיצוב רגוע ואמין שמתאים לרגעי לחץ.',
        '.cta-note': '<strong>זמן הוא קריטי.</strong> אם ראית עכשיו חיה משוטטת, אפשר לפתוח את המצלמה מיד, לשמור את זמן ומיקום הדיווח אוטומטית, ולהמשיך למסלול קצר של חיפוש או דיווח.',
        '#hero-found-now': 'מצאתי כלב עכשיו!',
        '.hero-actions a[href="./search.html"]': 'איבדתי חיה',
        '.hero-actions a[href="./report-found.html"]': 'ראיתי חיה משוטטת',
        '.hero-actions a[href="./enroll.html"]': 'בניית המאגר שלך',
        '.hero-subcta .badge:nth-child(1)': 'חיפוש מיידי עוד לפני שליחת הטופס',
        '.hero-subcta .badge:nth-child(2)': 'מיקום אוטומטי',
        '.hero-subcta .badge:nth-child(3)': 'עובד טוב יותר במובייל',
        '#hero-stats .hero-stat-card:nth-child(1) .small': 'איחודים ב-24 השעות האחרונות',
        '#impact-counter-note': 'נטען מהשרת, או מגיבוי מקומי אם אין API זמין.',
        '#hero-stats .hero-stat-card:nth-child(2) .small:first-child': 'חיפושים שבוצעו מהדפדפן הזה',
        '#hero-stats .hero-stat-card:nth-child(2) .small:last-child': 'מדד מקומי שנותן תחושת התקדמות גם לפני שרת מלא.',
        '.hero .notice.warn': 'GitHub Pages יכול לארח את האתר עצמו, אבל הוא לא מפעיל Backend של FastAPI ולא שומר העלאות ציבוריות משותפות. למאגר חי ומשותף עדיין תצטרכי אחסון אמיתי בהמשך.',
        'section.card.stack:nth-of-type(1) h2.section-title': 'זרימה מהירה בשטח',
        'section.card.stack:nth-of-type(1) .small': 'אחרי צילום תמונה אפשר לבחור מיד: לחפש בעלים או לפרסם כחיה שנמצאה — בלי להעלות שוב את הקובץ.',
        'section.card.stack:nth-of-type(1) .chip': 'One-Tap',
        'section.card.stack:nth-of-type(1) a[href="./search.html"]': 'חיפוש בעלים',
        'section.card.stack:nth-of-type(1) a[href="./report-found.html"]': 'דיווח חיה שנמצאה',
        '#nearby-context-card h2.section-title': 'עדכון אזורי חכם',
        '#nearby-context-text': 'נבדוק אם יש דיווחים מקומיים שנשמרו קרוב אלייך.',
        '#nearby-context-btn': 'בדיקה לפי המיקום שלי',
        '#success-stories .section-title': 'נמצאו לאחרונה / סיפורי תקווה',
        '#success-stories .small': 'כרגע זה נשען על דיווחים ותוצאות שנשמרו במכשיר הזה, כדי לתת תחושת קהילה גם לפני חיבור שרת מלא.',
        '#impact-section .section-title': 'השפעה מקומית',
        '#impact-section > .space-between .small': 'החלק הזה נשמר בדפדפן שלך בלבד, כדי לתת תחושת התקדמות גם לפני שיש שרת מלא.',
        '#enable-alerts-btn': 'הפעלת התראות שכונתיות',
        '#alerts-note': 'הגרסה הסטטית יכולה לבקש הרשאת התראות מקומית. Web Push אמיתי יתחבר בשלב השרת.',
      }
    },
    en: {
      title: 'PetConnect',
      selectors: {
        '.nav .nav-actions a.button-link.secondary.small': 'Volunteer sign in',
        '.links a[href="./index.html"]': 'Home',
        '.links a[href="./search.html"]': 'Animal search',
        '.links a[href="./enroll.html"]': 'Build library',
        '.links a[href="./report-found.html"]': 'Found animal report',
        '.hero .chip': 'Rapid help from the field',
        '.hero h1': 'Reuniting animals with their families — fast, calm, and in your language.',
        '.hero p.meta': 'This rescue platform now feels like a modern mobile product: camera first, clear paths for lost or found animals, and a calm trustworthy design for stressful moments.',
        '.cta-note': '<strong>Time is critical.</strong> If you just saw a stray animal, you can open the camera immediately, save time and location automatically, and continue in a short search-or-report flow.',
        '#hero-found-now': 'I found a dog now!',
        '.hero-actions a[href="./search.html"]': 'I lost a pet',
        '.hero-actions a[href="./report-found.html"]': 'I saw a stray animal',
        '.hero-actions a[href="./enroll.html"]': 'Build your library',
        '.hero-subcta .badge:nth-child(1)': 'Instant search before submitting',
        '.hero-subcta .badge:nth-child(2)': 'Automatic location',
        '.hero-subcta .badge:nth-child(3)': 'Works better on mobile',
        '#hero-stats .hero-stat-card:nth-child(1) .small': 'Reunions in the last 24 hours',
        '#impact-counter-note': 'Loaded from the server, or from local fallback if no API is available.',
        '#hero-stats .hero-stat-card:nth-child(2) .small:first-child': 'Searches from this browser',
        '#hero-stats .hero-stat-card:nth-child(2) .small:last-child': 'A local metric that still gives a sense of progress before a full backend exists.',
        '.hero .notice.warn': 'GitHub Pages can host the site itself, but it does not run a FastAPI backend or store shared public uploads. You will still need real hosting later for a live shared database.',
        '.compact-home-zone .action-slab.urgent strong': 'I lost a pet',
        '.compact-home-zone .action-slab.urgent small': 'Open a fast search flow, upload a photo, and start looking immediately.',
        '.compact-home-zone .action-slab.found-now strong': 'I found a pet now',
        '.compact-home-zone .action-slab.found-now small': 'Open the camera now and keep the photo ready for search or a found report.',
        '.live-feed-shell .section-title': 'Community live now',
        '.live-feed-shell .section-subtitle': 'A quick local pulse so the homepage feels active, not like a developer log.',
        '.live-feed-shell a.button-link.secondary.small': 'Quick report',
        'section.card.stack:nth-of-type(1) h2.section-title': 'Fast field flow',
        'section.card.stack:nth-of-type(1) .small': 'Right after taking a photo you can choose immediately: search for an owner or post the animal as found — without uploading the file again.',
        'section.card.stack:nth-of-type(1) .chip': 'One-Tap',
        'section.card.stack:nth-of-type(1) a[href="./search.html"]': 'Search for owner',
        'section.card.stack:nth-of-type(1) a[href="./report-found.html"]': 'Post found animal',
        '#nearby-context-card h2.section-title': 'Smart nearby update',
        '#nearby-context-text': 'We will check whether there are local saved reports close to you.',
        '#nearby-context-btn': 'Check using my location',
        '#success-stories .section-title': 'Recently found / hope stories',
        '#success-stories .small': 'For now this is based on reports and results saved on this device, so the app can still feel communal before a full server is connected.',
        '#impact-section .section-title': 'Local impact',
        '#impact-section > .space-between .small': 'This section is stored only in your browser, so you still get a sense of progress before a full backend exists.',
        '#enable-alerts-btn': 'Enable neighborhood alerts',
        '#alerts-note': 'The static version can ask for local notification permission. Real Web Push will connect later in the hosted phase.',
      }
    },
    ar: {
      title: 'بيت كونيكت',
      selectors: {
        '.nav .nav-actions a.button-link.secondary.small': 'دخول متطوع',
        '.links a[href="./index.html"]': 'الرئيسية',
        '.links a[href="./search.html"]': 'بحث عن حيوان',
        '.links a[href="./enroll.html"]': 'بناء المكتبة',
        '.links a[href="./report-found.html"]': 'بلاغ عن حيوان تم العثور عليه',
        '.hero .chip': 'مساعدة سريعة من الميدان',
        '.hero h1': 'نعيد الحيوانات إلى بيوتها بالذكاء الاصطناعي.',
        '.hero p.meta': 'كل ثانية مهمة. ابدئي البحث أو بلاغ المشاهدة من هنا.',
        '.cta-note': '<strong>مسار واحد واضح لكل حالة.</strong> اختاري إن كنتِ فقدت حيوانًا أو وجدتِ حيوانًا الآن، ثم تابعي مباشرة إلى الإجراء المناسب.',
        '#hero-found-now': 'وجدت كلبًا الآن!',
        '.hero-actions a[href="./search.html"]': 'فقدت حيوانًا',
        '.hero-actions a[href="./report-found.html"]': 'رأيت حيوانًا شاردًا',
        '.hero-actions a[href="./enroll.html"]': 'ابني مكتبتك',
        '.hero-subcta .badge:nth-child(1)': 'بحث فوري قبل إرسال النموذج',
        '.hero-subcta .badge:nth-child(2)': 'موقع تلقائي',
        '.hero-subcta .badge:nth-child(3)': 'أفضل على الهاتف',
        '#hero-stats .hero-stat-card:nth-child(1) .small': 'لمّ شمل خلال آخر 24 ساعة',
        '#impact-counter-note': 'يتم التحميل من الخادم أو من نسخة محلية احتياطية إذا لم تتوفر واجهة API.',
        '#hero-stats .hero-stat-card:nth-child(2) .small:first-child': 'عمليات بحث من هذا المتصفح',
        '#hero-stats .hero-stat-card:nth-child(2) .small:last-child': 'مؤشر محلي يمنح شعورًا بالتقدّم حتى قبل وجود خادم كامل.',
        '.hero .notice.warn': 'يمكن لـ GitHub Pages استضافة الموقع نفسه، لكنه لا يشغّل FastAPI ولا يخزن الرفع العام المشترك. ستحتاجين لاحقًا إلى استضافة حقيقية لقاعدة بيانات حيّة مشتركة.',
        '.compact-home-zone .action-slab.urgent strong': 'فقدت حيوانًا',
        '.compact-home-zone .action-slab.urgent small': 'افتحي مسار بحث سريعًا وابدئي البحث مباشرة.',
        '.compact-home-zone .action-slab.found-now strong': 'وجدت حيوانًا الآن',
        '.compact-home-zone .action-slab.found-now small': 'افتحي الكاميرا الآن واحتفظي بالصورة جاهزة للبحث أو للبلاغ.',
        '.live-feed-shell .section-title': 'المجتمع نشط الآن',
        '.live-feed-shell .section-subtitle': 'نبضة محلية سريعة حتى لا تبدو الصفحة الرئيسية كسجل مطوّر.',
        '.live-feed-shell a.button-link.secondary.small': 'بلاغ سريع',
        'section.card.stack:nth-of-type(1) h2.section-title': 'تدفق ميداني سريع',
        'section.card.stack:nth-of-type(1) .small': 'بعد التقاط صورة يمكنك اختيار فورًا: البحث عن المالك أو نشر الحيوان كموجود — من دون رفع الملف مرة أخرى.',
        'section.card.stack:nth-of-type(1) .chip': 'نقرة واحدة',
        'section.card.stack:nth-of-type(1) a[href="./search.html"]': 'البحث عن المالك',
        'section.card.stack:nth-of-type(1) a[href="./report-found.html"]': 'الإبلاغ عن حيوان موجود',
        '#nearby-context-card h2.section-title': 'تحديث ذكي قريب منك',
        '#nearby-context-text': 'سنفحص إن كانت هناك بلاغات محلية محفوظة قريبة منك.',
        '#nearby-context-btn': 'افحص باستخدام موقعي',
        '#success-stories .section-title': 'تم العثور مؤخرًا / قصص أمل',
        '#success-stories .small': 'حاليًا يعتمد هذا على البلاغات والنتائج المحفوظة في هذا الجهاز، ليمنح شعورًا بالمجتمع حتى قبل ربط خادم كامل.',
        '#impact-section .section-title': 'الأثر المحلي',
        '#impact-section > .space-between .small': 'يتم حفظ هذا القسم في متصفحك فقط، حتى تحصلي على شعور بالتقدّم قبل وجود خادم كامل.',
        '#enable-alerts-btn': 'تفعيل تنبيهات الحي',
        '#alerts-note': 'الإصدار الثابت يمكنه طلب إذن إشعارات محلية. إشعارات الويب الحقيقية ستأتي في مرحلة الاستضافة.',
      }
    },
  },
  '/search.html': {
    he: { title: 'חיפוש חיה לפי תמונה · פאטקונקט', selectors: {} },
    en: {
      title: 'Search animal by photo · PetConnect',
      selectors: {
        '.links a[href="./index.html"]': 'Home',
        '.links a[href="./search.html"]': 'Animal search',
        '.links a[href="./enroll.html"]': 'Build library',
        '.links a[href="./report-found.html"]': 'Found animal report',
        'section.card.stack .chip': 'Public search',
        'section.card.stack h1': 'Search animal by photo',
        'section.card.stack p.meta': 'This page is for animals only. There is no person recognition here. Upload a photo, manually mark the animal area, and the site compares it against the library you published. If there is no strong visual match, similar-colored animals are shown as fallback.',
        '#query-file': { ariaLabel: 'Choose animal photo' },
        '#search-btn': 'Search for owner',
        '#report-direct-btn': 'Post as found animal',
        '#locate-btn': 'Use current location',
        '#location-status': 'No location saved yet.',
        '#selection-hint': 'You can drag a rectangle around the animal. This is especially important when people or busy background appear in the image.',
        '#smart-scan-btn': 'Smart animal scan',
        '#use-whole-btn': 'Use whole image',
        '#run-selected-btn': 'Search using selected area',
        'article#preview-card h2.section-title': 'Mark the animal area',
        'article.card.stack:nth-of-type(2) h2.section-title': 'Area sent for search',
        '#clear-imported': 'Clear imported data',
        '#results-section h2.section-title': 'Search results',
      }
    },
    ar: {
      title: 'البحث عن حيوان بالصورة · بيت كونيكت',
      selectors: {
        '.links a[href="./index.html"]': 'الرئيسية',
        '.links a[href="./search.html"]': 'بحث عن حيوان',
        '.links a[href="./enroll.html"]': 'بناء المكتبة',
        '.links a[href="./report-found.html"]': 'بلاغ عن حيوان تم العثور عليه',
        'section.card.stack .chip': 'بحث عام',
        'section.card.stack h1': 'البحث عن حيوان بواسطة الصورة',
        'section.card.stack p.meta': 'هذه الصفحة مخصصة للحيوانات فقط. لا يوجد هنا تعرّف على الأشخاص. ارفعي صورة، حددي يدويًا منطقة الحيوان، وسيقارن الموقع الصورة بالمكتبة التي نشرتها. إذا لم توجد مطابقة بصرية قوية، ستظهر حيوانات ذات ألوان مشابهة.',
        '#query-file': { ariaLabel: 'اختيار صورة الحيوان' },
        '#search-btn': 'البحث عن المالك',
        '#report-direct-btn': 'الإبلاغ كحيوان تم العثور عليه',
        '#locate-btn': 'استخدام موقعي الحالي',
        '#location-status': 'لم يتم حفظ موقع بعد.',
        '#selection-hint': 'يمكنك سحب مستطيل حول الحيوان. هذا مهم خصوصًا عندما تظهر أشخاص أو خلفية مزدحمة في الصورة.',
        '#smart-scan-btn': 'فحص ذكي للحيوان',
        '#use-whole-btn': 'استخدام الصورة كاملة',
        '#run-selected-btn': 'ابحث باستخدام المنطقة المحددة',
        'article#preview-card h2.section-title': 'تحديد منطقة الحيوان',
        'article.card.stack:nth-of-type(2) h2.section-title': 'المنطقة المرسلة للبحث',
        '#clear-imported': 'مسح المستورد',
        '#results-section h2.section-title': 'نتائج البحث',
      }
    },
  },
  '/report-found.html': {
    he: { title: 'דיווח חיה שנמצאה · פאטקונקט', selectors: {} },
    en: {
      title: 'Found animal report · PetConnect',
      selectors: {
        '.links a[href="./index.html"]': 'Home',
        '.links a[href="./search.html"]': 'Animal search',
        '.links a[href="./report-found.html"]': 'Found animal report',
        '.links a[href="./enroll.html"]': 'Build library',
        'section.card.stack .chip': 'Quick Post',
        'section.card.stack h1': 'Found animal report',
        'section.card.stack p.meta': 'If you arrived here from search, the image, location and time were already transferred automatically. In the GitHub Pages version the report is saved locally in your browser so you do not need to upload everything again.',
        '#report-step-1': '1/3 Photo & location',
        '#report-step-2': '2/3 Animal details',
        '#report-step-3': '3/3 Save & share',
        'article.card.stack:nth-of-type(1) h2.section-title': 'Preview',
        '#report-image-empty': 'No image has been loaded yet. You can go back to search or choose an image manually below.',
        '#back-to-search-btn': 'Back to search',
        '#clear-draft-btn': 'Clear draft',
        'article.card.stack:nth-of-type(2) h2.section-title': 'Auto-detected details',
        '#submit-report-btn': 'Save report',
        '#share-report-btn': 'Local share',
        '#whatsapp-report-btn': 'Post to WhatsApp',
      }
    },
    ar: {
      title: 'بلاغ عن حيوان تم العثور عليه · بيت كونيكت',
      selectors: {
        '.links a[href="./index.html"]': 'الرئيسية',
        '.links a[href="./search.html"]': 'بحث عن حيوان',
        '.links a[href="./report-found.html"]': 'بلاغ عن حيوان تم العثور عليه',
        '.links a[href="./enroll.html"]': 'بناء المكتبة',
        'section.card.stack .chip': 'نشر سريع',
        'section.card.stack h1': 'بلاغ عن حيوان تم العثور عليه',
        'section.card.stack p.meta': 'إذا وصلتِ إلى هنا من صفحة البحث، فالصورة والموقع والوقت انتقلت تلقائيًا. في نسخة GitHub Pages يتم حفظ البلاغ محليًا في متصفحك حتى لا تحتاجي إلى رفع كل شيء مرة أخرى.',
        '#report-step-1': '1/3 الصورة والموقع',
        '#report-step-2': '2/3 تفاصيل الحيوان',
        '#report-step-3': '3/3 الحفظ والمشاركة',
        'article.card.stack:nth-of-type(1) h2.section-title': 'معاينة',
        '#report-image-empty': 'لم يتم تحميل صورة بعد. يمكنك العودة إلى البحث أو اختيار صورة يدويًا بالأسفل.',
        '#back-to-search-btn': 'العودة إلى البحث',
        '#clear-draft-btn': 'مسح المسودة',
        'article.card.stack:nth-of-type(2) h2.section-title': 'تفاصيل تم التعرف عليها تلقائيًا',
        '#submit-report-btn': 'حفظ البلاغ',
        '#share-report-btn': 'مشاركة محلية',
        '#whatsapp-report-btn': 'نشر إلى واتساب',
      }
    },
  },
  '/enroll.html': {
    he: { title: 'בניית מאגר חיות · פאטקונקט', selectors: {} },
    en: {
      title: 'Build animal library · PetConnect',
      selectors: {
        '.links a[href="./index.html"]': 'Home',
        '.links a[href="./search.html"]': 'Animal search',
        '.links a[href="./enroll.html"]': 'Build library',
        '.links a[href="./report-found.html"]': 'Found animal report',
        'section.card.stack .chip': 'Admin tool',
        'section.card.stack h1': 'Build an animal library in the browser',
        'section.card.stack p.meta': 'This page is for you, not for visitors. Upload example photos of one animal, compute visual features in the browser, and then export JSON for data/library.json. The system supports animals only, not people recognition.',
        'article.card.stack:nth-of-type(1) h2.section-title': 'Create one entry',
        '#add-btn': 'Add to local library',
        '#export-btn': 'Export library.json',
        '#clear-btn': 'Clear local library',
        'article.card.stack:nth-of-type(2) h2.section-title': 'How search works now',
      }
    },
    ar: {
      title: 'بناء مكتبة حيوانات · بيت كونيكت',
      selectors: {
        '.links a[href="./index.html"]': 'الرئيسية',
        '.links a[href="./search.html"]': 'بحث عن حيوان',
        '.links a[href="./enroll.html"]': 'بناء المكتبة',
        '.links a[href="./report-found.html"]': 'بلاغ عن حيوان تم العثور عليه',
        'section.card.stack .chip': 'أداة إدارة',
        'section.card.stack h1': 'بناء مكتبة حيوانات داخل المتصفح',
        'section.card.stack p.meta': 'هذه الصفحة مخصصة لك وليست للزوار. ارفعي صورًا مرجعية لحيوان واحد، واحسبي الخصائص البصرية داخل المتصفح، ثم صدّري JSON لملف data/library.json. النظام يدعم الحيوانات فقط وليس التعرّف على الأشخاص.',
        'article.card.stack:nth-of-type(1) h2.section-title': 'إنشاء سجل واحد',
        '#add-btn': 'إضافة إلى المكتبة المحلية',
        '#export-btn': 'تصدير library.json',
        '#clear-btn': 'مسح المكتبة المحلية',
        'article.card.stack:nth-of-type(2) h2.section-title': 'كيف يعمل البحث الآن',
      }
    },
  },
};

function normalizeLang(input = 'he', fallback = 'he') {
  const candidate = String(input || '').slice(0, 2).toLowerCase();
  return I18N_STRINGS[candidate] ? candidate : fallback;
}

function currentPageKey() {
  try {
    const pathname = window.location.pathname || '/index.html';
    const name = pathname.split('/').pop() || 'index.html';
    return `/${name}`;
  } catch (error) {
    return '/index.html';
  }
}

function initLang(defaultLang = 'he') {
  const stored = localStorage.getItem(I18N_STORAGE_KEY) || localStorage.getItem(I18N_LEGACY_STORAGE_KEY);
  const preferred = normalizeLang(stored || document.documentElement.lang || navigator.language || defaultLang, defaultLang);
  document.documentElement.lang = preferred;
  document.documentElement.dir = (preferred === 'ar' || preferred === 'he') ? 'rtl' : 'ltr';
  return preferred;
}

function t(key, fallback = '') {
  const lang = normalizeLang(document.documentElement.lang || 'he');
  return I18N_STRINGS[lang]?.[key] ?? I18N_STRINGS.he?.[key] ?? fallback ?? key;
}

function applyBaseTranslations(root = document) {
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

function applyPageTranslations(root = document) {
  const lang = normalizeLang(document.documentElement.lang || 'he');
  const page = PAGE_TRANSLATIONS[currentPageKey()] || {};
  const pageLang = page[lang] || page.he;
  if (!pageLang) return;
  if (pageLang.title) document.title = pageLang.title;
  const selectors = pageLang.selectors || {};
  Object.entries(selectors).forEach(([selector, value]) => {
    root.querySelectorAll(selector).forEach((el) => {
      if (typeof value === 'string') {
        el.textContent = value;
      } else if (value && typeof value === 'object') {
        if (value.text != null) el.textContent = value.text;
        if (value.html != null) el.innerHTML = value.html;
        if (value.placeholder != null) el.setAttribute('placeholder', value.placeholder);
        if (value.ariaLabel != null) el.setAttribute('aria-label', value.ariaLabel);
        if (value.title != null) el.setAttribute('title', value.title);
      }
    });
  });
}

function applyTranslations(root = document) {
  applyBaseTranslations(root);
  applyPageTranslations(root);
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    I18N_STRINGS,
    PAGE_TRANSLATIONS,
    initLang,
    t,
    applyTranslations,
  });
}
