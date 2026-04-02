# PetConnect GH Pages - בעלי חיים בלבד

זו גרסה סטטית ל-GitHub Pages שמיועדת **לחיפוש בעלי חיים בלבד**.

## מה חדש

- אין זיהוי אנשים
- בחירת אזור חיה ידנית בתוך התמונה
- חיפוש ויזואלי לחיות בעזרת MobileNet בדפדפן
- אם אין התאמה חזקה, מוצגות חיות עם צבעים דומים
- בניית מאגר חיות בדפדפן וייצוא ל-`data/library.json`

## פרסום

1. מעלים תמונות ב-`enroll.html`
2. מייצאים `library.json`
3. מחליפים את `data/library.json` בריפו
4. עושים commit + push
5. משתמשים ב-`search.html`

## הערה חשובה

זו עדיין מערכת סטטית. היא טובה לדמו, חיפוש ציבורי בסיסי, ומאגר שמתפרסם דרך הריפו — אבל לא למאגר משותף עם העלאות חיות בזמן אמת.

## מה חדש בגרסת ה-production upgrades

- פס התקדמות גלוי בחיפוש ובבניית מאגר
- פילטרים מיידיים לפי סוג בעל חיים, מקור, והתאמות חזקות בלבד
- שיתוף התוצאה המובילה, וואטסאפ, וטיוטת 106
- Service Worker מחוזק עם fallback בטוח יותר
- קבצי scaffold לשלב ה-hosted הבא


## New in this refreshed bundle
- PWA manifest and installable icons
- cache-first service worker strategy for CSS/JS/icons and CDN assets
- separate `assets/i18n.js` translation helper scaffold
- recent top-3 match gallery on the home page, fed by the last search
- privacy helper groundwork for approximate location display in a future hosted map flow


עדכון v4: נוספה גם שכבת תאימות `assets/app.js` עם `shrinkImage`, `displayMatches` ו-`postMultipart` כדי ליישר קו עם דפוסי Frontend נפוצים יותר.
