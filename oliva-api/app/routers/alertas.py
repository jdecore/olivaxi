import asyncio
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import aiosmtplib
import re

from app.config import get_settings
from app.data.provincias import PROVINCIAS
from app.data.varieties import VARIEDADES_INFO, CONSEJOS, normalizar_tipo_alerta, activar_por_tipo
from app.routers.clima import (
    _fetch_clima_open_meteo,
    _get_riesgos_activos,
    _normalizar_humedad_suelo,
    _clima_cache,
)
from app.services.riesgos import calcular_riesgos_plaga, calcular_riesgos_olivar
from app.dependencies.database import get_db

router = APIRouter(tags=["alertas"])

RATE_LIMIT_WINDOW = 60000
RATE_LIMIT_MAX = 10

request_counts = {}

AUDIT_LOG = []


def _get_client_ip(request: Request) -> str:
    return (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.headers.get("x-real-ip", "")
        or "unknown"
    )


def _check_rate_limit(ip: str) -> bool:
    now = datetime.now().timestamp() * 1000
    record = request_counts.get(ip)

    if not record or now > record.get("reset_time", 0):
        request_counts[ip] = {"count": 1, "reset_time": now + RATE_LIMIT_WINDOW}
        return True

    if record.get("count", 0) >= RATE_LIMIT_MAX:
        return False

    record["count"] = record.get("count", 0) + 1
    return True


def _log_audit(ip: str, action: str, success: bool, details: str = ""):
    entry = {
        "timestamp": datetime.now().timestamp() * 1000,
        "ip": ip,
        "action": action,
        "success": success,
        "details": details,
    }
    AUDIT_LOG.append(entry)
    if len(AUDIT_LOG) > 1000:
        AUDIT_LOG.pop(0)
    print(
        f"[AUDIT] {action} - {ip} - {'OK' if success else 'FAIL'}{' - ' + details if details else ''}"
    )


def _sanitize(s: str, max_len: int = 100) -> str:
    return re.sub(r"[<>'\";&\\]", "", s).strip()[:max_len]


def _is_valid_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def _get_email_config_state(settings) -> str:
    gmail_user = settings.gmail_user.strip()
    gmail_pass = settings.gmail_app_password.replace(" ", "").strip()
    print(
        f"[EmailConfig] GMAIL_USER: {'SET' if gmail_user else 'EMPTY'}, GMAIL_PASS: {'SET' if gmail_pass else 'EMPTY'}"
    )
    if not gmail_user and not gmail_pass:
        return "disabled"
    if gmail_user and gmail_pass:
        return "ready"
    return "invalid"


def _generate_token() -> str:
    return str(uuid.uuid4()) + "-" + str(int(datetime.now().timestamp() * 1000))


async def _save_pending_verification(token: str, data: dict, db: AsyncSession):
    await db.execute(
        text(
            "INSERT OR REPLACE INTO pending_verifications (token, data, expires) VALUES (:token, :data, :expires)"
        ),
        {"token": token, "data": str(data), "expires": data.get("expires", 0)},
    )
    await db.commit()


async def _get_pending_verification(token: str, db: AsyncSession) -> dict | None:
    result = await db.execute(
        text("SELECT data, expires FROM pending_verifications WHERE token = :token"),
        {"token": token},
    )
    row = result.fetchone()
    if not row:
        return None
    data_str, expires = row
    if datetime.now().timestamp() * 1000 > expires:
        await db.execute(
            text("DELETE FROM pending_verifications WHERE token = :token"), {"token": token}
        )
        await db.commit()
        return None
    return eval(data_str)


async def _delete_pending_verification(token: str, db: AsyncSession):
    await db.execute(
        text("DELETE FROM pending_verifications WHERE token = :token"), {"token": token}
    )
    await db.commit()


def _get_frontend_base_url(request: Request, settings) -> str:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto") or "http"
    if forwarded_host:
        host = forwarded_host.split(",")[0].strip()
        return (
            f"{forwarded_proto}://{host}".replace(":3000", ":4321")
            .replace(":3001", ":4321")
            .replace(":3002", ":4321")
            .rstrip("/")
        )

    host = request.headers.get("host")
    if host:
        return (
            f"http://{host}".replace(":3000", ":4321")
            .replace(":3001", ":4321")
            .replace(":3002", ":4321")
            .rstrip("/")
        )

    return "http://localhost:4321"


async def _obtener_contexto_alerta(
    provincia: str, variedad: str, fenologia: str, nombre: str, tipo: str, settings
) -> dict | None:
    from app.routers.clima import _clima_cache

    if not _clima_cache:
        await _fetch_clima_open_meteo(settings)

    prov_data = next((p for p in _clima_cache if p.get("provincia") == provincia), None)

    if not prov_data:
        return {
            "nombre": nombre,
            "provincia": provincia,
            "variedad": variedad,
            "variedadNombre": VARIEDADES_INFO.get(variedad, {}).get("nombre", variedad),
            "fenologia": fenologia or "No especificada",
            "tipo": tipo,
            "temp": 20,
            "humedad": 50,
            "lluvia": 0,
            "suelo": {"temperatura": 18, "humedad": 50, "evapotranspiracion": 3},
            "sueloAnalitica": {
                "humedadPorcentaje": 50,
                "necesidadRiego": 2.1,
                "deficitRiego": 2.1,
                "lluviaMediaDiaria": 1.5,
            },
            "riesgosActivos": [],
            "riesgos_olivar": calcular_riesgos_olivar(20, 50, 0),
            "riesgos_plaga": calcular_riesgos_plaga(20, 50, 0),
            "faseFenologica": fenologia or "No especificada",
        }

    temp = prov_data.get("temperatura", 20)
    humedad = prov_data.get("humedad", 50)
    lluvia = prov_data.get("lluvia", 0)
    suelo_humedad = _normalizar_humedad_suelo(prov_data.get("suelo_humedad"))
    eto = prov_data.get("evapotranspiracion", 0)
    kc = 0.7
    necesidad_riego = round(eto * kc, 1)
    deficit_riego = round(max(0, necesidad_riego - lluvia), 1)
    lluvia_media_diaria = (
        round(prov_data.get("pluviometriaAnual", 0) / 365, 1)
        if prov_data.get("pluviometriaAnual")
        else 0
    )

    riesgos_olivar = calcular_riesgos_olivar(temp, humedad, lluvia)
    riesgos_plaga = calcular_riesgos_plaga(temp, humedad, lluvia)
    riesgos_activos = _get_riesgos_activos(prov_data)

    var_info = VARIEDADES_INFO.get(variedad, {})
    fase_fenologica = fenologia or "No especificada"

    return {
        "nombre": nombre,
        "provincia": provincia,
        "variedad": variedad,
        "variedadNombre": var_info.get("nombre", variedad),
        "fenologia": fase_fenologica,
        "tipo": tipo,
        "temp": temp,
        "humedad": humedad,
        "lluvia": lluvia,
        "suelo": {
            "temperatura": prov_data.get("suelo_temp", 0),
            "humedad": suelo_humedad,
            "evapotranspiracion": eto,
        },
        "sueloAnalitica": {
            "humedadPorcentaje": suelo_humedad,
            "necesidadRiego": necesidad_riego,
            "deficitRiego": deficit_riego,
            "lluviaMediaDiaria": lluvia_media_diaria,
        },
        "riesgosActivos": riesgos_activos,
        "riesgos_olivar": riesgos_olivar,
        "riesgos_plaga": riesgos_plaga,
        "faseFenologica": fase_fenologica,
    }


def _build_personalized_fallback_email(
    alerta: dict, contexto: dict | None, riesgos_activos: list, tipo: str, temp: float
) -> str:
    top = riesgos_activos[0] if riesgos_activos else {}
    top_riesgos = riesgos_activos[:4]
    clima = (
        f"{temp:.1f}°C"
        if not contexto
        else f"{contexto.get('temp', 0)}°C · {contexto.get('humedad', 0)}% humedad · {contexto.get('lluvia', 0)}mm lluvia"
    )
    suelo = (
        ""
        if not contexto
        else f"{contexto.get('suelo', {}).get('temperatura', 0)}°C suelo · {contexto.get('suelo', {}).get('humedad', 0)}% humedad suelo · ETo {contexto.get('suelo', {}).get('evapotranspiracion', 0)} mm/día"
    )

    por_riesgo_html = "".join(
        [
            f"<li><strong>{r.get('icono', '⚠️')} {r.get('titulo', r.get('tipo'))}</strong> ({r.get('nivel', 'medio').upper()}): "
            + " · ".join(
                CONSEJOS.get(r.get("tipo"), CONSEJOS.get(tipo, []))[:2]
                or "Monitoriza y actúa de forma preventiva."
            )
            + "</li>"
            for r in top_riesgos
        ]
    )

    ahora = "".join(
        [f"<li>{c}</li>" for c in CONSEJOS.get(top.get("tipo", tipo), CONSEJOS.get(tipo, []))[:3]]
    )
    vigilar = "".join(
        [
            f"<li>📈 Revisa evolución de {top.get('titulo', 'riesgos')} cada 6-12h</li>",
            "<li>🧪 Verifica humedad de suelo antes del siguiente riego</li>",
            "<li>🍃 Inspecciona hojas/fruto para síntomas tempranos</li>",
        ]
    )

    return f"""<p>Hola <strong>{alerta.get("nombre", "")}</strong>,</p>
<p><strong>{top.get("icono", "🚨")} Alerta personalizada para {alerta.get("provincia", "")}</strong></p>
<p><strong>Situación actual:</strong> {clima}{" · " + suelo if contexto else ""}</p>
<p><strong>Qué hacer ahora (0-6h):</strong></p>
<ul>{ahora or "<li>Refuerza monitoreo y aplica medidas preventivas inmediatas.</li>"}</ul>
<p><strong>Qué vigilar en 24h:</strong></p>
<ul>{vigilar}</ul>
<p><strong>Recomendaciones por riesgo detectado:</strong></p>
<ul>{por_riesgo_html or "<li>Sin riesgos críticos, mantén monitoreo preventivo.</li>"}</ul>
<p>🫒 Equipo olivaξ</p>"""


async def _generar_email_llm(contexto: dict, tipo: str, settings) -> str | None:
    from app.services.llm import generar_email_llm as gen_llm

    return await gen_llm(contexto, tipo, settings)


async def _enviar_alerta_inmediata(alerta: dict, ip: str, db: AsyncSession, settings):
    from app.services.llm import generar_email_llm as gen_llm

    tipo = normalizar_tipo_alerta(alerta.get("tipo", "condiciones_optimas"))
    await _fetch_clima_open_meteo(settings)

    prov_data = next(
        (p for p in _clima_cache if p.get("provincia") == alerta.get("provincia")), None
    )
    temp = prov_data.get("temperatura", 0) if prov_data else 0
    riesgos_activos = _get_riesgos_activos(prov_data) if prov_data else []
    activar = activar_por_tipo(tipo, riesgos_activos)

    contexto = await _obtener_contexto_alerta(
        alerta.get("provincia", ""),
        alerta.get("variedad", ""),
        alerta.get("fenologia", ""),
        alerta.get("nombre", ""),
        tipo,
        settings,
    )

    email_html = None
    llm_used = False

    if contexto:
        email_html = await gen_llm(contexto, "alerta", settings)
        if email_html:
            llm_used = True

    if not email_html:
        email_html = _build_personalized_fallback_email(
            alerta, contexto, riesgos_activos, tipo, temp
        )

    top_risk = riesgos_activos[0] if riesgos_activos else {}
    no_riesgo_ahora = not activar

    if no_riesgo_ahora:
        subject = f"✅ Alerta activa - {alerta.get('provincia')}: monitoreo iniciado"
        email_html = f"""<p>Hola <strong>{alerta.get("nombre")}</strong>,</p>
<p>✅ Tu alerta en <strong>{alerta.get("provincia")}</strong> está activa y monitorizando riesgos.</p>
<p>Ahora mismo no hay un riesgo que dispare aviso urgente para tu tipo seleccionado (<strong>{tipo.replace("_", " ")}</strong>), pero te notificaremos automáticamente cuando aparezca.</p>
<p>🫒 Equipo olivaξ</p>"""
    else:
        icon = top_risk.get("icono", "🚨")
        titulo = top_risk.get("titulo", tipo)
        subject = f"{icon} {'ALERTA URGENTE' if llm_used else 'ALERTA INMEDIATA'} - {alerta.get('provincia')}: {titulo}"

    # Send email
    email_state = _get_email_config_state(settings)
    if email_state == "ready":
        try:
            server = aiosmtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(settings.gmail_user, settings.gmail_app_password)
            msg = f"From: {settings.gmail_user}\r\nTo: {alerta.get('email')}\r\nSubject: {subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{email_html}"
            server.sendmail(settings.gmail_user, alerta.get("email"), msg)
            server.quit()

            await db.execute(
                text("UPDATE alertas SET last_notified_at = :now WHERE id = :id"),
                {"now": int(datetime.now().timestamp() * 1000), "id": alerta.get("id")},
            )
            await db.commit()
            _log_audit(
                ip,
                no_riesgo_ahora and "VERIFY_IMMEDIATE_ARMED" or "VERIFY_IMMEDIATE_SENT",
                True,
                f"id={alerta.get('id')} email={alerta.get('email')}",
            )
        except Exception as e:
            _log_audit(ip, "EMAIL_SEND_FAIL", False, str(e))

    return True


def _calcular_tipos_alerta(provincia: str, variedad: str) -> list[str]:
    prov_data = next((p for p in _clima_cache if p.get("provincia") == provincia), None)
    if not prov_data:
        return ["condiciones_optimas"]

    riesgos_activos = _get_riesgos_activos(prov_data)
    tipos = list(set(r.get("tipo") for r in riesgos_activos if r.get("tipo") in CONSEJOS.keys()))
    return ["todas_alertas", *tipos] if tipos else ["condiciones_optimas"]


@router.get("/tipos")
async def get_tipos(provincia: str, variedad: str = ""):
    if not provincia:
        raise HTTPException(status_code=400, detail="Provincia requerida")

    valid_provincias = [p.get("nombre") for p in PROVINCIAS]
    if provincia not in valid_provincias:
        raise HTTPException(status_code=400, detail="Provincia inválida")

    if variedad and variedad not in VARIEDADES_INFO:
        raise HTTPException(status_code=400, detail="Variedad inválida")

    tipos = _calcular_tipos_alerta(provincia, variedad)
    return {"tipos": tipos}


@router.post("/verify")
async def verify(request: Request, db: AsyncSession = Depends(get_db)):
    ip = _get_client_ip(request)

    if not _check_rate_limit(ip):
        _log_audit(ip, "VERIFY_RATE_LIMIT", False)
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes")

    try:
        body = await request.json()
    except:
        body = {}

    token = _sanitize(body.get("token", ""), 100)
    if not token:
        raise HTTPException(status_code=400, detail="Token requerido")

    verification = await _get_pending_verification(token, db)
    if not verification:
        _log_audit(ip, "VERIFY_INVALID", False, "Token inválido o expirado")
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    email = verification.get("email", "")
    nombre = verification.get("nombre", "")
    provincia = verification.get("provincia", "")
    variedad = verification.get("variedad", "")
    tipo = verification.get("tipo", "")
    fenologia = verification.get("fenologia", "")

    # Check limits
    result = await db.execute(
        text("SELECT COUNT(*) as count FROM alertas WHERE email = :email AND activa = 1"),
        {"email": email},
    )
    count = result.fetchone()[0]
    if count >= 3:
        _log_audit(ip, "VERIFY_LIMIT", False, "Máximo 3 alertas")
        await _delete_pending_verification(token, db)
        raise HTTPException(status_code=400, detail="Máximo 3 alertas por email")

    result = await db.execute(
        text(
            "SELECT id FROM alertas WHERE email = :email AND provincia = :provincia AND variedad = :variedad AND activa = 1"
        ),
        {"email": email, "provincia": provincia, "variedad": variedad or ""},
    )
    if result.fetchone():
        _log_audit(ip, "VERIFY_DUPLICATE", False, "Alerta duplicada")
        await _delete_pending_verification(token, db)
        raise HTTPException(
            status_code=400, detail="Ya tienes una alerta activa para esta combinación"
        )

    result = await db.execute(
        text(
            "SELECT COUNT(*) as count FROM alertas WHERE email = :email AND provincia = :provincia AND activa = 1"
        ),
        {"email": email, "provincia": provincia},
    )
    if result.fetchone()[0] >= 2:
        _log_audit(ip, "VERIFY_PROVINCIA_LIMIT", False, "Máximo 2 por provincia")
        await _delete_pending_verification(token, db)
        raise HTTPException(status_code=400, detail="Máximo 2 alertas por provincia")

    now = int(datetime.now().timestamp() * 1000)
    await db.execute(
        text(
            "INSERT INTO alertas (nombre, email, provincia, variedad, tipo, fenologia, activa, created_at) VALUES (:nombre, :email, :provincia, :variedad, :tipo, :fenologia, 1, :created_at)"
        ),
        {
            "nombre": nombre,
            "email": email,
            "provincia": provincia,
            "variedad": variedad or "",
            "tipo": tipo,
            "fenologia": fenologia,
            "created_at": now,
        },
    )
    await db.commit()

    await _delete_pending_verification(token, db)
    _log_audit(ip, "VERIFY_SUCCESS", True, f"Alerta creada para {email}")

    settings = get_settings()
    email_state = _get_email_config_state(settings)

    if email_state == "ready":
        try:
            var_info = VARIEDADES_INFO.get(variedad, {})
            email_html = f"""<p>Hola <strong>{nombre}</strong>,</p>
<p>✅ Tu alerta está confirmada en olivaξ para <strong>{provincia}</strong>.</p>
{var_info.get("nombre") and f"<p>Variedad: <strong>{var_info['nombre']}</strong></p>" or ""}
<p>Te avisaremos cuando las condiciones climáticas afecten a tu cultivo de olivo.</p>
<p>🫒 Equipo olivaξ</p>"""

            import aiosmtplib

            server = aiosmtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(settings.gmail_user, settings.gmail_app_password)
            msg = f"From: {settings.gmail_user}\r\nTo: {email}\r\nSubject: ✅ Alerta confirmada - {provincia}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{email_html}"
            server.sendmail(settings.gmail_user, email, msg)
            server.quit()
            _log_audit(ip, "EMAIL_SENT", True, "Confirmación enviada")
        except Exception as e:
            _log_audit(ip, "EMAIL_FAIL", False, str(e))

    # Fire immediate check
    if email_state == "ready":
        try:
            result = await db.execute(
                text(
                    "SELECT * FROM alertas WHERE email = :email AND provincia = :provincia AND created_at = :created_at ORDER BY id DESC LIMIT 1"
                ),
                {"email": email, "provincia": provincia, "created_at": now},
            )
            alerta = result.fetchone()
            if alerta:
                await _enviar_alerta_inmediata(
                    {
                        "id": alerta[0],
                        "nombre": nombre,
                        "email": email,
                        "provincia": provincia,
                        "variedad": variedad,
                        "tipo": tipo,
                    },
                    ip,
                    db,
                    settings,
                )
        except Exception as e:
            _log_audit(ip, "VERIFY_IMMEDIATE_FAIL", False, str(e))

    return {"ok": True, "message": "Alerta confirmada"}


@router.post("/")
async def create_alerta(request: Request, db: AsyncSession = Depends(get_db)):
    ip = _get_client_ip(request)
    _log_audit(ip, "ALERTA_REQUEST", True)

    if not _check_rate_limit(ip):
        _log_audit(ip, "ALERTA_RATE_LIMIT", False)
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes")

    try:
        body = await request.json()
    except:
        body = {}

    nombre_raw = body.get("nombre", "")
    email_raw = body.get("email", "")
    provincia_raw = body.get("provincia", "")
    variedad_raw = body.get("variedad", "")
    tipo_raw = body.get("tipo", "condiciones_optimas")
    fenologia_raw = body.get("fenologia", "")

    if not nombre_raw or not email_raw or not provincia_raw:
        _log_audit(ip, "ALERTA_MISSING_FIELDS", False)
        raise HTTPException(status_code=400, detail="Faltan datos requeridos")

    nombre = _sanitize(nombre_raw, 50)
    email = _sanitize(email_raw, 100)
    provincia = _sanitize(provincia_raw, 50)
    variedad = _sanitize(variedad_raw, 30)
    tipo = normalizar_tipo_alerta(tipo_raw)
    fenologia = _sanitize(fenologia_raw, 20) if fenologia_raw else ""

    if not _is_valid_email(email):
        _log_audit(ip, "ALERTA_INVALID_EMAIL", False)
        raise HTTPException(status_code=400, detail="Email inválido")

    valid_provincias = [p.get("nombre") for p in PROVINCIAS]
    if provincia not in valid_provincias:
        _log_audit(ip, "ALERTA_INVALID_PROVINCIA", False)
        raise HTTPException(status_code=400, detail="Provincia inválida")

    if variedad and variedad not in VARIEDADES_INFO:
        _log_audit(ip, "ALERTA_INVALID_VARIEDAD", False)
        raise HTTPException(status_code=400, detail="Variedad inválida")

    # Check limits
    result = await db.execute(
        text("SELECT COUNT(*) as count FROM alertas WHERE email = :email AND activa = 1"),
        {"email": email},
    )
    if result.fetchone()[0] >= 3:
        _log_audit(ip, "ALERTA_LIMIT_3", False)
        raise HTTPException(status_code=400, detail="Máximo 3 alertas por email")

    result = await db.execute(
        text(
            "SELECT id FROM alertas WHERE email = :email AND provincia = :provincia AND variedad = :variedad AND activa = 1"
        ),
        {"email": email, "provincia": provincia, "variedad": variedad or ""},
    )
    if result.fetchone():
        _log_audit(ip, "ALERTA_DUPLICATE", False)
        raise HTTPException(
            status_code=400, detail="Ya tienes una alerta activa para esta combinación"
        )

    result = await db.execute(
        text(
            "SELECT COUNT(*) as count FROM alertas WHERE email = :email AND provincia = :provincia AND activa = 1"
        ),
        {"email": email, "provincia": provincia},
    )
    if result.fetchone()[0] >= 2:
        _log_audit(ip, "ALERTA_LIMIT_PROVINCIA", False)
        raise HTTPException(status_code=400, detail="Máximo 2 alertas por provincia")

    # Double opt-in
    verify_token = _generate_token()
    verify_expires = int(datetime.now().timestamp() * 1000) + (24 * 60 * 60 * 1000)

    await _save_pending_verification(
        verify_token,
        {
            "email": email,
            "nombre": nombre,
            "provincia": provincia,
            "variedad": variedad,
            "tipo": tipo,
            "fenologia": fenologia,
            "expires": verify_expires,
        },
        db,
    )
    _log_audit(ip, "ALERTA_VERIFY_SENT", True, f"Token enviado a {email}")

    settings = get_settings()
    email_state = _get_email_config_state(settings)

    if email_state == "ready":
        try:
            frontend_url = _get_frontend_base_url(request, settings)
            verify_url = f"{frontend_url}/alertas?verify={verify_token}"
            email_html = f"""<p>Hola <strong>{nombre}</strong>,</p>
<p>Confirma tu alerta para <strong>{provincia}</strong> haciendo clic en el botón:</p>
<p style="text-align: center; margin: 20px 0;">
  <a href="{verify_url}" style="background: #D4E849; color: #1C1C1C; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">✅ Confirmar mi alerta</a>
</p>
<p>Si no solicitaste esta alerta, ignora este email.</p>
<p style="color: #666; font-size: 12px;">Este enlace expira en 24 horas.</p>
<p>🫒 Equipo olivaξ</p>"""

            import aiosmtplib

            server = aiosmtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(settings.gmail_user, settings.gmail_app_password)
            msg = f"From: {settings.gmail_user}\r\nTo: {email}\r\nSubject: Confirma tu alerta - {provincia}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{email_html}"
            server.sendmail(settings.gmail_user, email, msg)
            server.quit()
        except Exception as e:
            _log_audit(ip, "ALERTA_VERIFY_EMAIL_FAIL", False, str(e))
            raise HTTPException(status_code=500, detail="Error al enviar email de verificación")
    elif email_state == "disabled":
        now = int(datetime.now().timestamp() * 1000)
        await db.execute(
            text(
                "INSERT INTO alertas (nombre, email, provincia, variedad, tipo, fenologia, activa, created_at) VALUES (:nombre, :email, :provincia, :variedad, :tipo, :fenologia, 1, :created_at)"
            ),
            {
                "nombre": nombre,
                "email": email,
                "provincia": provincia,
                "variedad": variedad or "",
                "tipo": tipo,
                "fenologia": fenologia,
                "created_at": now,
            },
        )
        await db.commit()
        _log_audit(ip, "ALERTA_CREATED_DEV", True)
        return {"ok": True, "message": "Alerta creada (modo desarrollo)"}
    else:
        _log_audit(
            ip,
            "ALERTA_VERIFY_EMAIL_CONFIG_INVALID",
            False,
            "GMAIL_USER o GMAIL_APP_PASSWORD incompletos",
        )
        raise HTTPException(status_code=500, detail="Configuración de email incompleta")

    return {"ok": True, "message": "Revisa tu email para confirmar la alerta"}


@router.get("/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    email_state = _get_email_config_state(settings)

    result = await db.execute(text("SELECT COUNT(*) as count FROM pending_verifications"))
    pendientes = result.fetchone()[0]

    message = (
        "Sistema de alertas operativo"
        if email_state == "ready"
        else "Email no configurado (modo desarrollo)"
        if email_state == "disabled"
        else "Configuración de email incompleta"
    )
    return {
        "ok": True,
        "email": email_state,
        "verificacionesPendientes": pendientes,
        "message": message,
    }


@router.get("/audit")
async def get_audit(request: Request):
    api_key = request.headers.get("x-api-key")
    settings = get_settings()

    if api_key != settings.alertas_audit_key:
        raise HTTPException(status_code=401, detail="No autorizado")

    since = datetime.now().timestamp() * 1000 - (24 * 60 * 60 * 1000)
    recent = [e for e in AUDIT_LOG if e.get("timestamp", 0) > since]
    return {"audit": recent, "total": len(AUDIT_LOG)}
