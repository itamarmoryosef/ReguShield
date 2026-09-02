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

`supabase/config.toml` כבר מוגדר ל-Resend, והמפתח נשאב מ-`RESEND_API_KEY`
בסביבה בזמן ה-push כדי שלא ייכנס ל-git.

### שלב חסר: אימות הדומיין

**מפתח API לבד לא מספיק.** עד שהדומיין מאומת, Resend מחזיר 403 לכל נמען שאינו
בעל חשבון Resend עצמו — כלומר מעבר ל-Resend לפני אימות הדומיין ישבור את
ההרשמה לכל לקוח אמיתי. לכן אין להריץ `config push` לפני שהאימות עבר.

הדומיין `bureaucracy.co.il` נרשם ב-Resend באזור `eu-west-1`. ה-DNS שלו מנוהל
ב-AWS Route 53, ושם צריך להוסיף שלוש רשומות:

| סוג | שם | ערך |
| --- | --- | --- |
| TXT | `resend._domainkey.bureaucracy.co.il` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDUr0gQ01irlJIYM5wyb0kD/QmC6tpxj2tfr3WPsvIKtUmaVcsdmW1OPU9qCdUf/5m8X/mxo+FA5fejATHv4WQ3JV6fK/n+ULUYCn3VfzSGbJn66Tig68Z27NxA3L/ScYVBfbJqazocLtEjolMN6y3yXs0SxnfzB9OWPf1Rvih88QIDAQAB` |
| MX | `send.bureaucracy.co.il` | `feedback-smtp.eu-west-1.amazonses.com` (עדיפות 10) |
| TXT | `send.bureaucracy.co.il` | `v=spf1 include:amazonses.com ~all` |

ב-Route 53 יש לעטוף ערכי TXT במרכאות כפולות.

מומלץ להוסיף גם רשומת DMARC לשיפור מסירה:
TXT על `_dmarc.bureaucracy.co.il` בערך `v=DMARC1; p=none;`.

### אחרי שהרשומות קיימות

```bash
# לאמת ב-Resend ולהמתין ל-status = verified
curl -X POST https://api.resend.com/domains/<domain-id>/verify \
  -H "Authorization: Bearer $RESEND_API_KEY"

# ורק אז להחליף את השולח בפועל
npx supabase config push
```

לשים לב: המסלול החינמי של Resend מוגבל ל-100 מיילים ביום. `email_sent = 100`
ב-`[auth.rate_limit]` הוא תקרת שימוש-לרעה לשעה, לא המגבלה האמיתית — המגבלה
היומית של הספק היא זו שתיפגע קודם.

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
