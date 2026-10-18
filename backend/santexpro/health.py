import datetime
from django.http import JsonResponse
from django.db import connection


def health_check_view(request):
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row and row[0] == 1:
                db_ok = True
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy",
            "database_connected": False,
            "error": str(e),
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }, status=503)

    return JsonResponse({
        "status": "healthy",
        "database": connection.vendor,
        "database_connected": db_ok,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
