# SantexPro — Ishlab Chiqarish (Production) va Deploy Qilish Qo‘llanmasi

Ushbu hujjat **SantexPro** platformasini ishlab chiqarish (production) serverlariga joylashtirish, sozlash, xavfsizlikni ta'minlash, ma'lumotlar bazasi zaxira nusxalarini boshqarish va monitoring qilish bo‘yicha to‘liq operatsion qo‘llanma hisoblanadi.

---

## 1. Tizim arxitekturasi va talablar

SantexPro ishlab chiqarishda yuqori xavfsizlik, ma'lumotlar yaxlitligi va tezkorlikni ta'minlash uchun quyidagi ko'p qatlamli arxitekturaga asoslanadi:

```
                  [ HTTPS Internet Mijozlar ]
                              │
                              ▼
           [ Nginx Reverse Proxy / SSL Termination ]
                     Port: 80 / 443
           ┌──────────────────┴──────────────────┐
           │                                     │
           ▼                                     ▼
 [ Frontend SPA Container ]            [ Backend API Gunicorn ]
      Nginx (Static)                     Python 3.12 / Django
         Port: 80                             Port: 8000
                                                 │
                                                 ▼
                                     [ PostgreSQL 16+ Database ]
                                              Port: 5432
                                       (Persistent Docker Volume)
```

### Minimal tizim talablari:
- **Operatsion tizim:** Linux (Ubuntu 22.04 LTS / 24.04 LTS yoki Debian 12 tavsiya etiladi)
- **CPU:** 2 vCPU
- **RAM:** 4 GB (kamida 2 GB bo'sh xotira)
- **Disk:** 30 GB SSD / NVMe
- **Dasturiy ta'minot:** Docker Engine 24.0+, Docker Compose v2.20+, yoki Python 3.12+, PostgreSQL 16+

---

## 2. Muhit konfiguratsiyasi (.env)

Ishlab chiqarishda hech qachon maxfiy kalitlarni kodda saqlamang. `.env.example` faylidan nusxa olib, serverda `.env` faylini shakllantiring:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

### Tavsiya etilgan ishlab chiqarish konfiguratsiyasi:

```ini
# Asosiy Django sozlamalari
DJANGO_ENV=production
DJANGO_SETTINGS_MODULE=santexpro.settings.production
DEBUG=False
SECRET_KEY=haqiqiy-kamida-50-belgili-tasodifiy-kriptografik-maxfiy-kalit-2026!
ALLOWED_HOSTS=santexpro.uz,www.santexpro.uz,api.santexpro.uz

# PostgreSQL konfiguratsiyasi
DB_NAME=santexpro
DB_USER=santexpro_user
DB_PASSWORD=juda_kuchli_va_murakkab_parol_2026
DB_HOST=db
DB_PORT=5432

# CORS va Xavfsizlik
CORS_ALLOWED_ORIGINS=https://santexpro.uz,https://www.santexpro.uz
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Log darajasi
LOG_LEVEL=INFO
```

---

## 3. Docker Compose orqali deploy qilish (Tavsiya etilgan)

SantexPro to'liq Docker muhitiga ega bo'lib, bitta buyruq orqali barcha xizmatlarni (PostgreSQL, Gunicorn Backend, Frontend SPA va Nginx) ishga tushiradi.

### 3.1. Konteynerlarni yig'ish va ishga tushirish

```bash
# 1. Kodni yuklab olish
git clone <repository_url> /opt/santexpro
cd /opt/santexpro

# 2. .env faylini sozlash
cp .env.example .env
nano .env

# 3. Docker konteynerlarini orqa fonda ishga tushirish
docker compose up -d --build

# 4. Holatni tekshirish
docker compose ps
```

### 3.2. Baza migratsiyasi va boshlang'ich ma'lumotlarni yuklash

```bash
# Migratsiyalarni qo'llash
docker compose exec backend python manage.py migrate

# Standart kataloglarni (radiatorlar, quvurlar) to'ldirish
docker compose exec backend python manage.py seed_catalog

# Admin (superfoydalanuvchi) yaratish
docker compose exec backend python manage.py createsuperuser
```

---

## 4. Bare-Metal (Docker-siz) ishlab chiqarishda o'rnatish

Agar loyiha to'g'ridan-to'g'ri server operatsion tizimiga o'rnatilsa:

### 4.1. PostgreSQL o'rnatish va sozlash

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib

sudo -u postgres psql
CREATE DATABASE santexpro;
CREATE USER santexpro_user WITH ENCRYPTED PASSWORD 'kuchli_parol';
GRANT ALL PRIVILEGES ON DATABASE santexpro TO santexpro_user;
ALTER DATABASE santexpro OWNER TO santexpro_user;
\q
```

### 4.2. Backend (Systemd + Gunicorn)

`/etc/systemd/system/santexpro-backend.service` faylini yarating:

```ini
[Unit]
Description=SantexPro Gunicorn Daemon
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/santexpro/backend
EnvironmentFile=/opt/santexpro/.env
ExecStart=/opt/santexpro/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/santexpro/access.log \
    --error-logfile /var/log/santexpro/error.log \
    santexpro.wsgi:application

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Xizmatni faollashtiring:
```bash
sudo mkdir -p /var/log/santexpro
sudo chown -R www-data:www-data /var/log/santexpro
sudo systemctl daemon-reload
sudo systemctl enable santexpro-backend
sudo systemctl start santexpro-backend
```

### 4.3. Nginx teskari proksi va SSL (Certbot)

`/etc/nginx/sites-available/santexpro` konfiguratsiyasi:

```nginx
server {
    server_name santexpro.uz www.santexpro.uz;

    # Frontend statik fayllari
    root /opt/santexpro/frontend/dist;
    index index.html;

    # Gzip siqish
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Xavfsizlik sarlavhalari
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proksi
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django statik fayllar
    location /static/ {
        alias /opt/santexpro/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    listen 80;
}
```

SSL sertifikatini o'rnatish:
```bash
sudo certbot --nginx -d santexpro.uz -d www.santexpro.uz
```

---

## 5. Zaxira nusxa olish (Backup) va Tiklash (Restore)

Ma'lumotlar bazasining doimiy zaxira nusxalarini saqlash uchun tayyor skriptlar mavjud.

### 5.1. Zaxira nusxa yaratish:
```bash
# Skriptni ishga tushirish (sana bilan siqilgan .sql.gz fayl yaratadi)
./scripts/backup_db.sh

# Nusxalar /opt/santexpro/backups/ katalogida saqlanadi.
```

### 5.2. Avtomatik kundalik zaxira olish (Cron):
`crontab -e` orqali quyidagi qatorni qo'shing (har kecha soat 02:00 da):
```cron
0 2 * * * /opt/santexpro/scripts/backup_db.sh >> /var/log/santexpro/backup.log 2>&1
```

### 5.3. Zaxira nusxadan tiklash:
```bash
./scripts/restore_db.sh /opt/santexpro/backups/santexpro_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 6. Salomatlik tekshiruvi (Health Check) va Monitoring

Tizimda ma'lumotlar bazasi va server holatini doimiy nazorat qiluvchi endpoint mavjud:

- **URL:** `GET /api/health/`
- **Muvaffaqiyatli javob:**
```json
{
  "status": "healthy",
  "database": "postgresql",
  "database_connected": true,
  "timestamp": "2026-10-16T18:42:33.137375+00:00"
}
```

UptimeRobot, Datadog yoki Prometheus/Grafana orqali ushbu endpointni har 1 daqiqada tekshirish tavsiya etiladi. HTTP kodi `200` bo'lmaganda yoki `"status": "unhealthy"` qaytganida avtomatik ogohlantirish (alert) o'rnating.

---

## 7. Versiyalarni yangilash va Rollback qilish

Yangi versiya chiqqanda:

```bash
# 1. Zaxira nusxa oling
./scripts/backup_db.sh

# 2. Yangi kodni oling
git pull origin main

# 3. Docker konteynerlarini qayta yig'ing
docker compose up -d --build

# 4. Yangi migratsiyalarni bajaring
docker compose exec backend python manage.py migrate

# 5. Salomatlikni tekshiring
curl -s http://127.0.0.1:8000/api/health/
```

### Muammo yuz berganda avvalgi versiyaga qaytish (Rollback):
```bash
# 1. Oldingi git commitiga qayting
git checkout <oldingi_barqaror_tag_yoki_commit>

# 2. Konteynerlarni qayta quring
docker compose up -d --build

# 3. Zarur bo'lsa, zaxiradan bazani tiklang
./scripts/restore_db.sh /opt/santexpro/backups/santexpro_backup_OLD.sql.gz
```

---

## 8. Muhandislik Mas'uliyati va Huquqiy Ogohlantirish

SantexPro platformasi isitish tizimlari hisoblarini EN 12831, EN 442, EN 1264 va KMK standartlari asosida amalga oshiradi. 

**Eslatma:** Dastur tomonidan berilgan hisob-kitoblar, radiator va truba tavsiyalari loyiha-smeta hujjatlarining dastlabki muhandislik hisobi hisoblanadi. Qurilish-montaj ishlarini boshlashdan oldin litsenziyaga ega mutaxassis tomonidan obyektning amaldagi arxitekturasi va issiqlik izolyatsiyasi tekshirilishi shart.
