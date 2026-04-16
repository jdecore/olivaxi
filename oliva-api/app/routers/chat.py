import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.routers.clima import _fetch_clima_open_meteo
from app.dependencies.database import get_db

router = APIRouter(tags=["chat"])

CHAT_RATE_LIMIT = 600
CHAT_RATE_WINDOW_MS = 60000

chat_rate_limit = {}


def _check_chat_rate_limit(ip: str) -> bool:
    import time

    now = int(time.time() * 1000)
    record = chat_rate_limit.get(ip)

    if not record or now > record.get("reset_at", 0):
        chat_rate_limit[ip] = {"count": 1, "reset_at": now + CHAT_RATE_WINDOW_MS}
        return True

    if record.get("count", 0) >= CHAT_RATE_LIMIT:
        return False

    record["count"] = record.get("count", 0) + 1
    return True


SKILL_PROMPTS = {
    "libre": "",
    "drought": "Eres un experto en gestión del estrés hídrico en olivares. Enfoca tus respuestas en técnicas de riego, cubiertas vegetales, y manejo del suelo para conservar agua. Da recomendaciones específicas para la situación actual.",
    "calor": "Eres un experto en protección térmica de olivares. Enfoca tus respuestas en estrategias de sombreo, riego temprano, protección contra olas de calor extremas, y mulch. Considera la variedad del usuario si se menciona.",
    "frio": "Eres un experto en protección contra heladas en olivares. Enfoca tus respuestas en técnicas de protección, momento de poda, prevención de daños por frío, y manejo de árboles dañados.",
    "humedad": "Eres un experto en enfermedades fúngicas del olivo. Enfoca tus respuestas en repilo, aceituna jabonosa, verticilosis, control de humedad, y tratamientos preventivos con fungicidas.",
    "plaga": "Eres un experto en control de plagas del olivo. Enfoca tus respuestas en mosca del olivo, polilla, tuberculosis, barrenillo, y control integrado de plagas (IPM).",
    "fenologia": "Eres un experto en fenología del olivo. Enfoca tus respuestas en las fases del ciclo: reposo (nov-ene), brotación (feb-mar), floración (abr-may), cuaje (may-jun), endurecimiento del hueso (jun-ago), envero (sep-oct), y recolección (oct-nov).",
}

SKILL_ALIASES = {"plaga": "plaga", "plagas": "plaga"}


def _sanitize(s: str, max_len: int = 1000) -> str:
    import re

    return re.sub(r"[<>'\";]", "", s).strip()[:max_len]


async def _llm_stream_response(messages: list, settings):
    import aiohttp
    import json

    providers = [
        {
            "name": "Groq",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "key": settings.groq_key,
            "model": "llama-3.3-70b-versatile",
        },
        {
            "name": "Gemini",
            "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            "key": settings.gemini_key,
            "model": "gemini-2.0-flash",
        },
        {
            "name": "OpenRouter",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "key": settings.openrouter_key,
            "model": "meta-llama/llama-3.1-8b-instruct",
        },
    ]

    available = [p for p in providers if p.get("key")]
    if not available:
        yield 'data: {"error": "API keys no configuradas"}\n\n'
        return

    for attempt, provider in enumerate(available):
        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(45):
                    headers = {
                        "Authorization": f"Bearer {provider['key']}",
                        "Content-Type": "application/json",
                    }
                    if provider["name"] == "OpenRouter":
                        headers["HTTP-Referer"] = "https://olivaxi.es"
                        headers["X-Title"] = "olivaξ"

                    payload = {
                        "model": provider["model"],
                        "messages": messages,
                        "stream": True,
                        "max_tokens": 1500,
                        "temperature": 0.7,
                    }

                    async with session.post(
                        provider["url"], json=payload, headers=headers
                    ) as response:
                        if response.status != 200:
                            error_body = await response.text()
                            print(
                                f"[LLM] {provider['name']} error {response.status}: {error_body[:100]}"
                            )
                            if attempt < len(available) - 1:
                                await asyncio.sleep(1.5)
                                continue
                            continue

                        buffer = ""
                        async for chunk in response.content:
                            if chunk:
                                decoded = chunk.decode("utf-8")
                                buffer += decoded
                                lines = buffer.split("\n")
                                buffer = lines.pop() if lines else ""

                                for line in lines:
                                    trimmed = line.strip()
                                    if not trimmed or trimmed == "data: [DONE]":
                                        continue
                                    if trimmed.startswith("data: "):
                                        try:
                                            json_str = trimmed[6:]
                                            if json_str == "[DONE]":
                                                continue
                                            data = json.loads(json_str)
                                            content = (
                                                data.get("choices", [{}])[0]
                                                .get("delta", {})
                                                .get("content")
                                            )
                                            if content:
                                                yield f"data: {json.dumps({'texto': content, 'provider': provider['name']})}\n\n"
                                        except:
                                            pass

                        print(f"[LLM] Éxito con {provider['name']}")
                        return

        except asyncio.TimeoutError:
            print(f"[LLM] Timeout: {provider['name']}")
            if attempt < len(available) - 1:
                await asyncio.sleep(1.5)
                continue
        except Exception as e:
            print(f"[LLM] Fallo {provider['name']}: {e}")
            if attempt < len(available) - 1:
                await asyncio.sleep(1.5)
                continue

    yield 'data: {"error": "Todos los proveedores fallaron"}\n\n'


@router.post("/")
async def chat_post(request: Request, db: AsyncSession = Depends(get_db)):
    ip = (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("x-forwarded-for")
        or "unknown"
    )
    ip = ip.split(",")[0].strip() if "," in ip else ip

    if not _check_chat_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Demasiadas peticiones. Intenta más tarde.")

    try:
        body = await request.json()
    except:
        body = {}

    mensaje_raw = body.get("mensaje", "")
    provincia_raw = body.get("provincia", "")
    skill_raw = body.get("skill", "")

    if not mensaje_raw:
        raise HTTPException(status_code=400, detail="Falta mensaje")

    mensaje = _sanitize(mensaje_raw, 1000)
    provincia = _sanitize(provincia_raw, 50)
    variedad = _sanitize(body.get("variedad", ""), 20)
    historial_raw = body.get("historial", [])
    historial = (
        " | ".join([str(m) for m in historial_raw[-3:]]) if isinstance(historial_raw, list) else ""
    )

    if len(mensaje) < 2:
        raise HTTPException(status_code=400, detail="Mensaje demasiado corto")

    settings = get_settings()
    has_api_key = settings.groq_key or settings.gemini_key or settings.openrouter_key
    if not has_api_key:
        raise HTTPException(status_code=503, detail="API keys no configuradas")

    # Get clima data
    data = await _fetch_clima_open_meteo(settings)
    provincia_info = (
        next((p for p in data if p.get("provincia") == provincia), data[0]) if data else {}
    )
    provincia_nombre = provincia_info.get("provincia") or provincia or "Andalucía"

    # Build context
    temp = provincia_info.get("temperatura", "")
    hum = provincia_info.get("humedad", "")
    llov = provincia_info.get("lluvia", "")
    estado = provincia_info.get("estado", "")
    suelo_temp = provincia_info.get("suelo_temp", "")
    suelo_hum_raw = provincia_info.get("suelo_humedad", "")
    suelo_hum = float(suelo_hum_raw) * 100 if float(suelo_hum_raw or 0) <= 1 else suelo_hum_raw
    eto = provincia_info.get("evapotranspiracion", "")
    tipo_suelo = provincia_info.get("tipoSuelo", "")
    variedad_local = provincia_info.get("variedadPredominante", "")

    # Riesgos activos
    riesgos_activos_raw = provincia_info.get("riesgosActivos") or []
    riesgos_activos_txt = (
        " | ".join(
            [
                f"{r.get('icono', '⚠️')} {r.get('titulo', r.get('tipo'))} [{r.get('categoria', 'general')}] ({r.get('nivel', 'medio').upper()})"
                for r in riesgos_activos_raw[:8]
            ]
        )
        if riesgos_activos_raw
        else "✅ Sin riesgos activos"
    )

    contexto_anterior = f"Historial previo: {historial}" if historial else ""
    contexto_variedad = f"Variedad del usuario: {variedad}" if variedad else ""

    # Resolve skill
    resolved_skill = SKILL_ALIASES.get(skill_raw, skill_raw)
    skill = SKILL_PROMPTS.get(resolved_skill, "")

    base_prompt = f"""Eres Olivo, conselheiro experto en olivicultura española.
Provincia: {provincia_nombre} (variedad: {variedad_local}, suelo: {tipo_suelo})
Clima: {temp}°C, {hum}% humedad, {llov}mm lluvia - {estado}
Suelo: temp {suelo_temp}°C, humedad {suelo_hum}%, ETo {eto}mm
⚠️ RIESGOS: {riesgos_activos_txt}
{contexto_variedad}
{contexto_anterior}
Reglas: Español cercano, práctico, máximo 3 párrafos"""

    if skill:
        base_prompt = f"""Eres Olivo, conseillers de olivicultura.
{skill}
Provincia: {provincia_nombre}
Clima: {temp}°C, {hum}% humedad, {llov}mm lluvia
Suelo: {suelo_temp}°C, humedad {suelo_hum}%
⚠️ Riesgos: {riesgos_activos_txt}
{contexto_variedad}
{contexto_anterior}
Responde en español, máximo 2 párrafos, sé práctico."""

    system_prompt = base_prompt

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": mensaje},
    ]

    async def event_generator():
        async for chunk in _llm_stream_response(messages, settings):
            yield chunk
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
