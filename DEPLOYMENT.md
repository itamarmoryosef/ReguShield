# העלאה לאוויר (Vercel + Supabase)

המערכת רצה על Vercel, ומול Supabase לאימות, מסד נתונים ואחסון קבצים.
כל השירותים צריכים להיות באזור פרנקפורט (`fra1` / `eu-central-1`) כדי שהמסד
והפונקציות לא ידברו בין יבשות.

## ההתקנה הקיימת

| מה | איפה |
| --- | --- |
| אתר | <https://regushield.vercel.app> (פרויקט `regushield` ב-Vercel, אזור `fra1`) |
| מסד נתונים | פרויקט Supabase `regushield`, ref `naxcxnlepztmufcqbrjv`, אזור `eu-central-1` |
| בדיקת מצב | <https://regushield.vercel.app/api/health> |

פריסה מתבצעת אוטומטית בכל דחיפה ל-`main`.

## עדכון סכימה

`supabase/schema.sql` הוא המקור היחיד לאמת, והוא כתוב כך שאפשר להריץ אותו שוב
ושוב (`if not exists`, `create or replace`). כדי להחיל שינוי:

```bash
cp supabase/schema.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_update.sql
npx supabase db push
```

תיקיית `supabase/migrations/` היא רק תיעוד של מה שהורץ בפועל; אין לערוך שם
קבצים קיימים.

## שני מצבי הרצה

| מצב | מה קורה | מתי |
| --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE=true` | נתוני דמו בזיכרון ובקוקיז, בלי מסד נתונים. סריקת AI ומשלוח הודעות מדומים. | הדגמות ובדיקות UI |
| מצב חי | Supabase + OpenAI אמיתיים | ייצור |

בנייה לייצור בלי מפתחות Supabase **תיכשל בכוונה**, אלא אם הוגדר במפורש
`NEXT_PUBLIC_DEMO_MODE=true` (`next.config.mjs`). זה נועד למנוע מצב שבו לקוחות
משלמים רואים נתוני דמו בלי שאף אחד ישים לב.

## משתני סביבה

חובה במצב חי:

| משתנה | מאיפה משיגים |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | אותו מקום (מפתח `anon`) |
| `SUPABASE_SERVICE_ROLE_KEY` | אותו מקום (`service_role`) — סודי, לשרת בלבד |
| `OPENAI_API_KEY` | platform.openai.com → API keys |

אופציונלי:

| משתנה | לשם מה |
| --- | --- |
| `JOBS_WEBHOOK_SECRET` | אימות קריאות לעבודות הרקע |
| `CRON_SECRET` | Vercel Cron שולח אותו בכותרת `Authorization`. יש להגדיר לאותו ערך כמו `JOBS_WEBHOOK_SECRET` |
| `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `QSTASH_TOKEN` | תור עבודות של Upstash במקום Cron |
| `NEXT_PUBLIC_SITE_URL` | קישורים מוחלטים במיילים ובהזמנות |

## סדר ההקמה

1. **Supabase** — פרויקט חדש באזור פרנקפורט. להריץ את `supabase/schema.sql`
   ב-SQL Editor (אידמפוטנטי, אפשר להריץ שוב אחרי עדכוני סכימה). לוודא שקיים
   bucket פרטי בשם `client-documents`. ב-Authentication → URL Configuration
   להוסיף את הדומיין של Vercel.
2. **תבניות PDF** — לוודא שהקבצים ב-`public/templates/` נמצאים ב-Git:
   `fire-safety.pdf`, `accessibility.pdf`, `police-4-2a.pdf`, `police-4-2b.pdf`,
   `police-4-8.pdf`. בלעדיהם יצירת הטפסים מחזירה שגיאה מנומסת בעברית.
3. **Vercel** — לחבר את המחסן, אזור `fra1` (מוגדר ב-`vercel.json`), להזין את
   משתני הסביבה ולפרוס.
4. **דומיין** — להוסיף ב-Vercel, לעדכן את `NEXT_PUBLIC_SITE_URL` ואת כתובות
   ה-redirect ב-Supabase.

## בדיקות אחרי פריסה

- `GET /api/health` מחזיר `ok: true` ו-`mode: "live"`.
- הרשמה של עסק חדש, שמירת פרופיל, יצירת תצהיר בטיחות אש שמוריד PDF מלא.
- העלאת תמונת מסמך והרצת הסורק (בקשה ארוכה, עד 120 שניות).
- שני עסקים שונים לא רואים את המסמכים אחד של השני (בדיקת RLS).
- ב-Vercel → Cron Jobs לוודא ריצה מוצלחת של `/api/jobs/reminders/enqueue`.

## מה עוד חסר לפני גביית כספים

- **אימות כתובת אימייל** — כרגע כבוי (`enable_confirmations = false`), כי
  `signUp` בקוד מצפה ל-session מיד אחרי ההרשמה וקורא ל-RPC שיוצר את העסק.
  המשמעות: אפשר להירשם עם אימייל של מישהו אחר, ומי שיטעה בהקלדה יישאר עם
  חשבון בלי דרך שחזור. להפעלת אימות צריך לפצל את הזרימה — להציג "נשלח אימייל"
  ולהריץ את ה-RPC בהתחברות הראשונה.
- **תשלומים** — מסך התשלום באשף ההרשמה מדומה. צריך ספק אמיתי
  (Stripe / Tranzila / Cardcom) ואימות מצד שרת לפני פתיחת גישה.
- **וואטסאפ** — `deliverWhatsAppReminder` הוא עדיין קצה מדומה; העבודות נרשמות
  ומסומנות כנשלחו בלי שהודעה יוצאת בפועל.
- **מדיניות פרטיות ותנאי שימוש** — נדרשים בגלל אחזקת מסמכים עסקיים.
