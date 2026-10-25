# Car Advisor paneli (frontend)

Next.js 15 + TypeScript + Tailwind v4, shadcn üslubunda komponentlər. Portal backend-i (`car-advisor-portal-api`) ilə danışır; AI servisinə birbaşa qoşulmur.

```bash
npm install
cp .env.example .env.local     # PORTAL_API_URL=http://localhost:4000
npm run dev                    # http://localhost:3001
```

> `PORTAL_API_URL` `next build` zamanı oxunur (rewrite hədəfi build-ə yazılır). Production-da dəyəri dəyişsən, `npm run build`-i yenidən işlət.

Brauzer yalnız bu saytla danışır: `next.config.mjs` `/api/portal/*` sorğularını portal backend-inə yönləndirir, ona görə sessiya cookie-si (`ca_session`, httpOnly) bu saytın ünvanında qalır.

## Axın

1. `/register`: email + parol, emailə 6 rəqəmli kod gedir. `/verify`: kodu yaz, daxil olursan.
2. Yeni istifadəçi `/connection` səhifəsinə düşür: JSON faylı seçir və ya mətni yapışdırır, **Yoxla** (saytının API-sinə real sorğu), **Aktivləşdir**. API açarı bir dəfə göstərilir.
3. Sonra: `/` istifadə, `/playground` sınaq söhbəti, `/listings` elanlar, `/connection` konfiqurasiyanı yeniləmək, `/embed` saytına qoyulan çat vidjeti, `/settings` açar yeniləmə və davranış ayarları.
4. `/admin`: yalnız backend-də `ADMIN_EMAILS`-də olan email-lər. İstifadəçi siyahısı, istifadə, açar yeniləmə.

`/embed` səhifəsi müştəriyə bir sətir `<script>` kodu verir (vidjet açarı ilə). Başlıq, salamlama, rəng, icazəli saytlar və açarın yenilənməsi buradan idarə olunur.

Parol unudulubsa `/forgot`. Sessiya bitəndə panel avtomatik `/login`-ə yönləndirir.

Günlük statistika qrafiki hələ nümunə məlumatdır (`lib/sample.ts`): AI servisində bunun üçün endpoint yoxdur.
