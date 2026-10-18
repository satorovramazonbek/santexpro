from django.http import HttpResponse, JsonResponse


def api_root_view(request):
    """
    Backendning asosiy ildiz (/) manzili uchun ma'lumot beruvchi ko'rinish.
    Foydalanuvchi brauzerda 8000 portiga kirganda frontend manziliga yo'naltiruvchi
    yoki to'liq API yo'llarini ko'rsatuvchi sahifa taqdim etadi.
    """
    accept_header = request.headers.get('Accept', '')

    if 'text/html' in accept_header:
        html_content = """
        <!DOCTYPE html>
        <html lang="uz">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SantexPro — Backend API Server</title>
            <style>
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    background-color: #f8fafc;
                    color: #0f172a;
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 80vh;
                }
                .card {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 36px;
                    max-width: 620px;
                    width: 100%;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
                }
                .badge {
                    display: inline-block;
                    padding: 6px 12px;
                    background: #dbeafe;
                    color: #1d4ed8;
                    border-radius: 9999px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 16px;
                }
                h1 {
                    font-size: 26px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    color: #0f172a;
                }
                p {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #475569;
                    margin-bottom: 24px;
                }
                .btn-primary {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                    padding: 14px 28px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: background 0.2s;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                }
                .btn-primary:hover {
                    background: #1d4ed8;
                }
                .endpoints {
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid #f1f5f9;
                }
                .endpoints h3 {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #64748b;
                    margin: 0 0 12px 0;
                }
                .list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .list li {
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .list a {
                    color: #2563eb;
                    text-decoration: none;
                    font-family: monospace;
                    font-weight: 600;
                }
                .list a:hover {
                    text-decoration: underline;
                }
                .list span {
                    color: #64748b;
                    margin-left: 8px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <span class="badge">Backend REST API Faol</span>
                <h1>SantexPro Backend Serveri</h1>
                <p>
                    Siz hozirda <strong>8000-portdagi</strong> backend API manzilidasiz. Asosiy foydalanuvchi interfeysi (xona muharriri, smeta va hisob-kitoblar) <strong>5173-portda</strong> ishlamoqda.
                </p>
                <a href="http://127.0.0.1:5173/" class="btn-primary">
                    🚀 Frontend Ilovasiga O‘tish (http://127.0.0.1:5173)
                </a>

                <div class="endpoints">
                    <h3>Mavjud API va Boshqaruv Yo‘llari:</h3>
                    <ul class="list">
                        <li><a href="/admin/">/admin/</a> <span>— Django boshqaruv paneli</span></li>
                        <li><a href="/api/health/">/api/health/</a> <span>— PostgreSQL salomatlik tekshiruvi</span></li>
                        <li><a href="/api/projects/projects/">/api/projects/projects/</a> <span>— Loyihalar va xonalar API</span></li>
                        <li><a href="/api/catalog/radiators/">/api/catalog/radiators/</a> <span>— Radiatorlar katalogi API</span></li>
                        <li><a href="/api/materials/items/">/api/materials/items/</a> <span>— Materiallar smetasi API</span></li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html; charset=utf-8')

    return JsonResponse({
        'service': 'SantexPro REST API',
        'status': 'healthy',
        'database': 'postgresql',
        'frontend_url': 'http://127.0.0.1:5173/',
        'endpoints': {
            'admin': '/admin/',
            'health': '/api/health/',
            'auth': '/api/auth/',
            'catalog': '/api/catalog/',
            'projects': '/api/projects/',
            'materials': '/api/materials/',
            'reports': '/api/reports/',
        }
    })
