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

## חובה: שרת SMTP משלכם

אימות כתובת אימייל מופעל, ולכן **בלי SMTP חיצוני ההרשמה תיפול אחרי שני
משתמשים בשעה.** שירות המייל המובנה של Supabase מוגבל ל-`email_sent = 2` בשעה
ומיועד לפיתוח בלבד; הרשמה שלישית מקבלת `over_email_send_rate_limit` ולא נשלח
שום קישור.

### המצב כיום: מוגדר ופעיל

השליחה עוברת דרך Resend מהדומיין המאומת `crmit.co.il`, וכתובת השולח היא
`noreply@crmit.co.il`. מגבלת המיילים הועלתה מ-2 ל-100 בשעה.

`supabase/config.toml` מתאר את אותה תצורה, והמפתח נשאב מ-`RESEND_API_KEY`
בסביבה בזמן ה-push כדי שלא ייכנס ל-git.

### כלל שאסור לשכוח: הדומיין חייב להיות מאומת

עד שדומיין מאומת ב-Resend, השירות מחזיר 403 לכל נמען שאינו בעל חשבון Resend
עצמו. המשמעות המעשית: **אין לשנות את `admin_email` לדומיין שלא אומת** — זה
ישבור את ההרשמה לכל לקוח אמיתי, בעוד שבדיקה עם הכתובת של בעל החשבון תיראה
תקינה לחלוטין. זו תקלה שמסתירה את עצמה.

הרשומות שמאמתות דומיין ב-Resend (הערכים ייחודיים לכל דומיין, יש לקחת אותם
מ-Resend):

| סוג | שם | תפקיד |
| --- | --- | --- |
| TXT | `resend._domainkey` | DKIM — זו הרשומה שמאמתת את הדומיין |
| MX | `send` | נתיב חזרה לטיפול בהחזרות (עדיפות 10) |
| TXT | `send` | SPF לנתיב החזרה |

שתי מלכודות שנתקלנו בהן בפועל:

- רשומת ה-MX חייבת לשבת על תת-הדומיין `send`, לא על השורש. רשומת MX של
  `feedback-smtp` בשורש הופכת לכתובת גיבוי לדואר הנכנס, ובזמן שהיא שם מיילים
  שנשלחים לדומיין יכולים להיעלם אם ספק הדואר הראשי לא יגיב לרגע.
- ערך ה-DKIM חייב להתחיל מיד ב-`p=`. תווי רווח שנדבקים בהעתקה מונעים אימות.

### פקודות שימושיות

```bash
# מצב האימות של דומיין
curl https://api.resend.com/domains -H "Authorization: Bearer $RESEND_API_KEY"

# בקשת אימות מחדש אחרי תיקון רשומות
curl -X POST https://api.resend.com/domains/<domain-id>/verify \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

לשים לב: המסלול החינמי של Resend מוגבל ל-100 מיילים ביום. `email_sent = 100`
ב-`[auth.rate_limit]` הוא תקרת שימוש-לרעה לשעה, לא המגבלה האמיתית — המגבלה
היומית של הספק היא זו שתיפגע קודם.

### תבניות המייל

התבניות יושבות ב-`supabase/templates/`, ומוגדרות ב-`config.toml` תחת
`[auth.email.template.recovery]` ו-`[auth.email.template.confirmation]`.

הן מקשרות דרך `{{ .TokenHash }}` ולא דרך `{{ .ConfirmationURL }}` שהוא
ברירת המחדל, וזה לא עניין של סגנון. הקישור של ברירת המחדל נושא קוד PKCE,
ו-PKCE שומר את המאמת שלו בעוגייה **בדפדפן שביקש את האיפוס**. לקוח שמבקש
איפוס במחשב ופותח את המייל באפליקציית הדואר בטלפון מקבל כשל — כלומר דווקא
השימוש הרגיל נשבר, לא מקרה קצה. אימות של `token_hash` נעשה בצד השרת ואינו
תלוי בדפדפן, ולכן עובד מכל מכשיר.

מי שמחליף את התבניות צריך לשמר את מבנה הקישור:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=%2Freset-password
```

## זרימת אימות האימייל

הרשמה לא יוצרת יותר את רשומות העסק, כי בשלב הזה אין session. הפרטים נשמרים
ב-`raw_user_meta_data` של המשתמש, והפונקציה `ensure_account_provisioned` הופכת
אותם לפרופיל בפעם הראשונה שמופיע session מאומת. היא אידמפוטנטית ונקראת גם
מ-`/auth/callback` וגם מהתחברות רגילה, כדי שקולבק שנקטע לא ישאיר חשבון חצי-בנוי.

הפונקציה בודקת `email_confirmed_at`, כך שמשתמש לא מאומת לא יקבל עסק גם אם יגיע
אליה בדרך אחרת.

## מה עוד חסר לפני גביית כספים

- **תשלומים** — מסך התשלום באשף ההרשמה מדומה. צריך ספק אמיתי
  (Stripe / Tranzila / Cardcom) ואימות מצד שרת לפני פתיחת גישה.
- **וואטסאפ** — `deliverWhatsAppReminder` הוא עדיין קצה מדומה; העבודות נרשמות
  ומסומנות כנשלחו בלי שהודעה יוצאת בפועל.
- **מדיניות פרטיות ותנאי שימוש** — נדרשים בגלל אחזקת מסמכים עסקיים.
