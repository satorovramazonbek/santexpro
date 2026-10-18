# SantexPro — Isitish Tizimlarini Loyihalash va Hisoblash Platformasi

[![SantexPro CI Pipeline](https://github.com/satorovramazonbek/santexpro/actions/workflows/ci.yml/badge.svg)](https://github.com/satorovramazonbek/santexpro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Django: 6.1](https://img.shields.io/badge/Django-6.1-green.svg)](https://www.djangoproject.com/)
[![React: 19](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![TypeScript: 6.0](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL: 17](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org/)

**SantexPro** — santexniklar, isitish tizimlari montajchilari va O‘zbekiston iqlim sharoitida ishlovchi muhandislar uchun mo‘ljallangan to‘liq funksional veb-platforma. Foydalanuvchi interfeysi to‘liq **O‘zbek lotin** alifbosida tayyorlangan bo‘lib, xalqaro va milliy qurilish me’yorlari (EN 12831, EN 442, EN 1264, KMK 2.01.04-97) asosida ishlaydi.

---


## 1. Asosiy imkoniyatlar

1. **Boshqaruv paneli (Dashboard):**
   - Jami loyihalar, xonalar soni va umumiy talab etiladigan issiqlik quvvati (kVt).
   - So‘nggi tahrirlangan loyihalar va tezkor navigatsiya.
   - Yangi loyiha yaratish modali.

2. **Loyihalar va binolar boshqaruvi (Projects & Buildings):**
   - Loyihalarni yaratish, tahrirlash, arxivlash va o‘chirish.
   - Buyurtmachi (mijoz) ma’lumotlari, telefon raqami, obyekt manzili.
   - Tashqi hisobiy harorat (masalan: Toshkent $-15^\circ\text{C}$, Samarqand $-12^\circ\text{C}$, Nukus $-19^\circ\text{C}$).
   - Xonalar bo‘yicha to‘liq hisoblar va agregatsiya.

3. **Interaktiv 2D Xona Muharriri (SVG Room Editor):**
   - Xona devorlarini masshtabli ($L \times W$) ko‘rsatish.
   - Derazalar va eshiklarni devorlarga joylashtirish, turlari (2 qavatli oynapaket, Low-E, 3 qavatli, yog‘och/metall eshik).
   - Radiatorlarni deraza ostiga yoki devorlarga o‘rnatish va koordinatalarini boshqarish.
   - Taqsimlash kollektorini joylashtirish.
   - Issiq pol konturlarini **Chig‘anoq (spiral)** va **Ilon izi (serpentine)** sxemalarida har bir konturni alohida yorqin ranglarda chizish.
   - Radiator uzatish va qaytish magistral trubalarini ko‘rsatish.
   - Zoom (+/-) va Pan boshqaruvi.

4. **Issiqlik yo‘qotilishini hisoblash moduli (Heat Loss Engine):**
   - $Q = \sum (U \times A \times \Delta T) + Q_{vent}$
   - Tashqi devorlar sof (opaque) maydonini deraza va eshiklarni ayirgan holda aniqlash.
   - Tabiiy havo almashinuvi (shamollatish) yo‘qotilishi ($Q_{vent} = 0.34 \times V \times n \times \Delta T$).
   - Pol va shift orqali yo‘qotilishlar (pastki/yuqori qavat isitilishiga qarab).
   - Har bir konstruksiya elementi bo‘yicha batafsil yo‘qotilish jadvali, Vt va $\text{Vt/m}^2$.

5. **Radiator hisoblash va tanlash moduli (EN 442):**
   - Nominal quvvatni ($75/65/20^\circ\text{C}$, $\Delta T_{norm}=50\text{K}$) haqiqiy harorat rejimiga qarab qayta hisoblash:
     $$Q_{haqiqiy} = Q_{nominal} \times \left( \frac{\Delta T_{haqiqiy}}{\Delta T_{nominal}} \right)^n$$
   - Korado, Purmo, Global va maxsus radiatorlar katalogidan tanlash.
   - Kerakli radiatorlar soni, umumiy quvvat, zaxira foizi va truba sarfi.

6. **Issiq pol hisoblash moduli (Underfloor Heating):**
   - Isitiladigan pol maydoni ($A_{isit} = A_{xona} - A_{mebel}$).
   - Truba qadami ($s = 100, 150, 200\text{ mm}$).
   - Truba uzunligi ($L \approx A/s \times 1.05 + L_{kollektor}$).
   - Konturlar soni va har bir konturning uzunligi bo‘yicha me’yor chegaralari ($L_{max} \le 85-90\text{ m}$).
   - Kollektor chiqishlari soni.

7. **Gidravlika va truba diametrini tanlash moduli:**
   - Suvning massaviy va hajmiy sarfi: $\dot{m} = \frac{Q}{c_p \times \Delta T}$.
   - Oqim tezligi: $v = \frac{4 \dot{V}}{\pi d_i^2}$.
   - Darsi-Veysbax va Haaland/Koulbruk formulalari bo‘yicha Reynolds soni ($Re$), ishqalanish koeffitsiyenti ($f$) va chiziqli/mahalliy bosim yo‘qotilishi ($\text{kPa}$).
   - Optimal tezlik ($0.3 - 0.7\text{ m/s}$) bo‘yicha standart diametrlar ($16\times2.0, 20\times2.0, 25\times2.3, 32\times2.9\text{ mm}$) tavsiyasi.

8. **Materiallar smetasi va xarajatlar (Bill of Materials):**
   - Radiatorlar, PEX-A / PE-RT trubalar, bossli izolyatsiya plitalari, dempfer lenta, kollektor shkafi, rotametrli kollektor, aralashtirish uzeli va fitinglar to‘liq ro‘yxati.
   - Har bir elementning miqdori, birligi, narxi va jami qiymati real vaqtda tahrirlanadi.
   - Yangi maxsus materiallar qo‘shish.

9. **PDF Muhandislik Hisoboti Eksporti:**
   - ReportLab yordamida A4 formatida loyiha pasporti, xonalar parametrlari, radiator va issiq pol hisoblari, gidravlika xulosasi, to‘liq materiallar smetasi va rasmiy muhandislik ogohlantirishi bilan PDF hujjat yuklab olish.

---

## 2. Texnologiyalar steki

- **Backend:** Python 3.12, Django 6.1, Django REST Framework, django-cors-headers, psycopg (v3), ReportLab, Gunicorn.
- **Ma'lumotlar bazasi:** PostgreSQL (development va production uchun yagona majburiy ma'lumotlar bazasi; SQLite butunlay chiqarib tashlangan).
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React piktogrammalari.
- **2D Grafik muharrir:** Interaktiv SVG vektor grafikasi (masshtab, deraza/eshik, radiator, kollektor, issiq pol spiral va meandr konturlari).
- **Autentifikatsiya:** TokenAuthentication va SessionAuthentication (ob'ekt darajasidagi xavfsizlik va ruxsatlar bilan).
- **Konteynerlashtirish:** Docker, Docker Compose, Nginx teskari proksi.

---

## 3. O‘rnatish va ishga tushirish

### A. Backendni tayyorlash va ishga tushirish:

```bash
# 1. Virtual muhitni faollashtirish
source venv/bin/activate

# 2. Bog'liqliklarni o'rnatish
pip install -r backend/requirements.txt

# 3. Ma'lumotlar bazasi migratsiyalari
cd backend
python manage.py migrate

# 4. Standart katalog va demo loyihani bazaga yuklash
python manage.py seed_catalog
python manage.py seed_demo_project

# 5. Backend serverini ishga tushirish
python manage.py runserver 127.0.0.1:8000
```

> **Demo hisob ma'lumotlari:**
> - Foydalanuvchi nomi: `usta_xasan`
> - Parol: `santex2026`

### B. Frontendni ishga tushirish:

```bash
cd frontend

# Bog'liqliklarni o'rnatish (agar o'rnatilmagan bo'lsa)
npm install

# Ishchi rejimda ishga tushirish
npm run dev
```

Brauzerda oching: **`http://localhost:5173/`**

---

## 4. Muhit o‘zgaruvchilari (Environment Variables)

Agar PostgreSQL ishlatmoqchi bo‘lsangiz, quyidagi muhit o‘zgaruvchilarini belgilash kifoya (aks holda `db.sqlite3` avtomatik ishlaydi):

```env
DEBUG=True
SECRET_KEY=santexpro-production-secret-key
DB_NAME=santexpro_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

---

## 5. Avtomatlashtirilgan testlarni ishga tushirish

Muhandislik hisoblash modullari va REST API uchun to‘liq test to‘plami yozilgan:

```bash
cd backend
../venv/bin/python manage.py test
```

**Test natijalari:**
```text
Found 13 test(s).
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
.............
----------------------------------------------------------------------
Ran 13 tests in 3.609s

OK
```

Testlar quyidagilarni tekshiradi:
- Xona maydoni va hajmi hisoblash aniqligi
- Deraza va eshiklar maydonini ayirish
- EN 12831 bo‘yicha issiqlik yo‘qotilishi (transmissiya va shamollatish)
- EN 442 bo‘yicha radiator quvvatini logarifmik harorat farqida korreksiya qilish
- Issiq pol trubalari sarfi ($L \approx A/s$) va maksimal kontur uzunligi chegaralari
- Darsi-Veysbax bo‘yicha suv sarfi, tezlik va bosim yo‘qotilishi
- REST API ruxsatlari va foydalanuvchilar ma’lumotlari izolyatsiyasi
- PDF generatsiya va HTTP 200 javob qaytarishi

---

## 6. Loyiha papkalar tuzilishi

```text
SantexPro/
├── backend/
│   ├── manage.py
│   ├── db.sqlite3
│   ├── requirements.txt
│   ├── santexpro/              # Asosiy sozlamalar va routing
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/                   # Autentifikatsiya (login, register, me, logout)
│   ├── projects/               # Loyiha, Bino, Xona, Deraza, Eshik, Uskunalar
│   ├── engineering/            # Muhandislik hisoblash yadrosi (sof Python)
│   │   ├── heat_loss.py        # Q = U*A*ΔT + Q_vent
│   │   ├── radiators.py        # EN 442 quvvat korreksiyasi
│   │   ├── underfloor.py       # Konturlar uzunligi va 2D koordinatalar
│   │   ├── hydraulics.py       # Darsi-Veysbax va quvur tanlash
│   │   └── tests.py            # Yadro testlari
│   ├── catalog/                # Radiatorlar va quvurlar ma'lumotlar bazasi
│   ├── materials/              # Smetani avtomatik shakllantirish
│   └── reports/                # ReportLab PDF hisobot generatori
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── api/client.ts       # REST API mijozi va autentifikatsiya
│   │   ├── types/index.ts      # TypeScript interfeyslari
│   │   ├── components/         # Navbar, LoginModal
│   │   ├── editor/             # RoomEditorCanvas (2D SVG), RoomCalculationsPanel
│   │   ├── pages/              # Dashboard, Projects, ProjectDetail, RoomEditor, Materials, QuickCalc, Catalog
│   │   ├── App.tsx             # Asosiy ilova marshrutlash va boshqaruv
│   │   └── main.tsx
└── README.md
```

---

## 7. Cheklovlar va keyingi rivojlantirish bosqichlari

- **Ko‘p burchakli (noto‘g‘ri shakldagi) xonalar:** Hozirgi versiyada xonalar to‘rtburchak shaklda qabul qilinadi. Kelgusida ixtiyoriy poligon devor koordinatalarini kiritish imkoniyati qo‘shiladi.
- **DXF / DWG eksport:** Hozirgi PDF formatiga qo‘shimcha ravishda montajchilar uchun AutoCAD / DXF formatida 2D chizmani eksport qilish.
- **Konditsionerlash va sovutish quvvati hisobi:** Yozgi mavsum uchun issiqlik oqimi va fankoyl/konditsioner tanlash moduli.

---

## 8. CI/CD Konfiguratsiyasi (GitHub Actions)

Loyiha uchun to‘liq avtomatlashtirilgan CI/CD konveyeri sozlangan:

### 1. Doimiy Integratsiya (`.github/workflows/ci.yml`)
Har bir `push` yoki `pull_request` asosiy `main` tarmoqqa yuborilganda quyidagi tekshiruvlar avtomatik ishga tushadi:
- **Backend Tests & Quality:**
  - Python 3.12 muhitida PostgreSQL 17 konteyneri bilan ulanish.
  - Django tizim tekshiruvi (`python manage.py check`).
  - 60 ta avtomatlashtirilgan testlar to‘plami (`python manage.py test`): issiq pol CAD marshrutlash, kollektor balansi, issiqlik yo‘qotilishi, gidravlika, autentifikatsiya va PDF hisobot generatsiyasi.
- **Frontend Quality & Build:**
  - Node.js 22 muhitida paketlarni toza o‘rnatish (`npm ci`).
  - Statik kod tekshiruvi (`npm run lint`).
  - TypeScript turlari va Vite ishlab chiqarish bundle kompilyatsiyasi (`npm run build`).
- **Docker Verification:**
  - `docker compose config` sintaksisini tekshirish.
  - Backend va Frontend Dockerfile imijlarini yig‘ish sinovi.

### 2. Doimiy Joylashtirish (`.github/workflows/cd.yml`)
`main` tarmog‘iga yangi versiya qo‘shilganda, GitHub Secrets (`SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`) orqali ishlab chiqarish serveriga (VPS / Cloud) avtomatik `git pull`, migratsiyalar qo‘llanishi va konteynerlar qayta yuklanishi ta’minlanadi.
