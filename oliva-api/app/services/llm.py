import asyncio
import aiohttp
from typing import AsyncGenerator


PROVIDERS = [
    {
        "name": "Groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key": "groq_key",
        "model": "llama-3.3-70b-versatile",
    },
    {
        "name": "Gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "key": "gemini_key",
        "model": "gemini-2.0-flash",
    },
    {
        "name": "OpenRouter",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key": "openrouter_key",
        "model": "meta-llama/llama-3.1-8b-instruct",
    },
]

RETRY_DELAY = 1.5
TIMEOUT_MS = 45000


async def llamar_llm_stream(
    messages: list[dict[str, str]], on_chunk: callable, settings
) -> AsyncGenerator[str, None]:
    available_providers = [p for p in PROVIDERS if getattr(settings, p["key"], "")]

    if not available_providers:
        raise Exception("No hay API keys configuradas")

    for attempt, provider in enumerate(available_providers):
        key = getattr(settings, provider["key"], "")
        if not key:
            continue

        print(
            f"[LLM] Intento {attempt + 1}/{len(available_providers)}: {provider['name']}"
        )

        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(TIMEOUT_MS / 1000):
                    headers = {
                        "Authorization": f"Bearer {key}",
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
                            error_msg = f"{provider['name']} error {response.status}: {error_body[:100]}"
                            print(f"[LLM] {error_msg}")

                            if response.status in (401, 403):
                                raise Exception(error_msg)

                            if attempt < len(available_providers) - 1:
                                await asyncio.sleep(RETRY_DELAY)
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
                                            json_data = trimmed[6:]
                                            if json_data == "[DONE]":
                                                continue
                                            data = __import__("json").loads(json_data)
                                            content = (
                                                data.get("choices", [{}])[0]
                                                .get("delta", {})
                                                .get("content")
                                            )
                                            if content:
                                                yield content
                                                on_chunk(content, provider["name"])
                                        except:
                                            pass

                        print(f"[LLM] Éxito con {provider['name']}")
                        return

        except asyncio.TimeoutError:
            print(f"[LLM] Timeout: {provider['name']}")
            if attempt < len(available_providers) - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue
        except Exception as e:
            print(f"[LLM] Fallo {provider['name']}: {e}")
            if attempt < len(available_providers) - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue

    raise Exception("Todos los proveedores fallaron")


LLM_ALERTAS_PROVIDERS = [
    {
        "name": "GeminiAlertas",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "key": "gemini_alertas_key",
        "model": "gemini-2.0-flash",
    },
    {
        "name": "Cerebras1",
        "url": "https://api.cerebras.ai/v1/chat/completions",
        "key": "cerebras_key_1",
        "model": "llama3.1-70b",
    },
    {
        "name": "Cerebras2",
        "url": "https://api.cerebras.ai/v1/chat/completions",
        "key": "cerebras_key_2",
        "model": "llama3.1-70b",
    },
]

llm_provider_cursor = 0


def get_rotated_providers():
    global llm_provider_cursor
    if not LLM_ALERTAS_PROVIDERS:
        return []
    start = llm_provider_cursor % len(LLM_ALERTAS_PROVIDERS)
    llm_provider_cursor = (llm_provider_cursor + 1) % len(LLM_ALERTAS_PROVIDERS)
    return LLM_ALERTAS_PROVIDERS[start:] + LLM_ALERTAS_PROVIDERS[:start]


async def generar_email_llm(contexto: dict, tipo: str, settings) -> str | None:
    if tipo == "bienvenida":
        prompt = _construir_prompt_bienvenida(contexto)
    else:
        prompt = _construir_prompt_alerta(contexto)

    messages = [
        {
            "role": "system",
            "content": "Eres un experto en olivar y comunicación con agricultores. Escribes emails claros, prácticos y útiles.",
        },
        {"role": "user", "content": prompt},
    ]

    errors = []

    for provider in get_rotated_providers():
        key = getattr(settings, provider["key"], "")
        if not key:
            errors.append(f"{provider['name']} sin API key")
            continue

        print(f"[LLM-Alertas] Llamando a {provider['name']}...")

        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(45):
                    headers = {
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                    }
                    if provider["name"].startswith("Gemini"):
                        headers["x-goog-api-key"] = key

                    payload = {
                        "model": provider["model"],
                        "messages": messages,
                        "max_tokens": 1000,
                        "temperature": 0.55 if tipo == "alerta" else 0.7,
                    }

                    async with session.post(
                        provider["url"], json=payload, headers=headers
                    ) as response:
                        if response.status != 200:
                            raise Exception(
                                f"{provider['name']} error: {response.status}"
                            )

                        data = await response.json()
                        content = (
                            data.get("choices", [{}])[0]
                            .get("message", {})
                            .get("content")
                        )

                        if content and len(content.strip()) > 40:
                            print(
                                f"[LLM-Alertas] Email generado con {provider['name']}"
                            )
                            return _normalizar_html_email(content)

        except Exception as e:
            print(f"[LLM-Alertas] Error con {provider['name']}: {e}")
            errors.append(str(e))
            continue

    print(f"[LLM-Alertas] Todos los providers fallaron: {errors}")
    return None


def _construir_prompt_bienvenida(contexto: dict) -> str:
    return f"""Eres un asistente experto en olivar y cambio climático. Escribe un email de bienvenida personalizado y cálido para un usuario que ha activado una alerta de olivar.

INFORMACIÓN DEL USUARIO:
- Nombre: {contexto.get("nombre", "")}
- Provincia: {contexto.get("provincia", "")}
- Variedad de olivo: {contexto.get("variedadNombre", "")}
- Fase fenológica: {contexto.get("faseFenologica", "")}

DATOS CLIMÁTICOS ACTUALES DE LA ZONA:
- Temperatura: {contexto.get("temp", 0)}°C
- Humedad: {contexto.get("humedad", 0)}%
- Lluvia: {contexto.get("lluvia", 0)}mm

DATOS DE SUELO Y RIEGO:
- Temperatura suelo: {contexto.get("suelo", {}).get("temperatura", 0)}°C
- Humedad suelo: {contexto.get("suelo", {}).get("humedad", 0)}%
- Evapotranspiración (ETo): {contexto.get("suelo", {}).get("evapotranspiracion", 0)} mm/día
- Necesidad de riego: {contexto.get("sueloAnalitica", {}).get("necesidadRiego", 0)} mm/día
- Déficit hídrico: {contexto.get("sueloAnalitica", {}).get("deficitRiego", 0)} mm/día

RIESGOS ACTIVOS PRIORIZADOS:
{chr(10).join([f"- {r.get("icono", "⚠️")} {r.get("titulo", r.get("tipo", "N/A"))} [{r.get("categoria", "general")}] ({r.get("nivel", "medio").upper()})" for r in contexto.get("riesgosActivos", [])[:6]])}

INSTRUCCIONES:
1. Usa el nombre del usuario
2. Menciona la variedad de olivo que tiene
3. Da la bienvenida de manera cálida y profesional
4. Explica brevemente qué recibirá (alertas cuando el clima afecte su cultivo)
5. Añade 3-4 consejos prácticos basados en la situación climática actual de su zona
6. Usa emojis relevantes para hacerlo más visual
7. El email debe ser corto (máximo 200 palabras)
8. Firma como "🫒 Equipo olivaξ"

Devuelve SOLO el contenido HTML del body del email (sin etiquetas <html> ni <body>)."""


def _construir_prompt_alerta(contexto: dict) -> str:
    return f"""Eres un asistente experto en olivar y cambio climático. Escribe un email de ALERTA URGENTE personalizada para un usuario cuyo olivar está en riesgo.

INFORMACIÓN DEL USUARIO:
- Nombre: {contexto.get("nombre", "")}
- Provincia: {contexto.get("provincia", "")}
- Variedad de olivo: {contexto.get("variedadNombre", "")}
- Fase fenológica: {contexto.get("faseFenologica", "")}
- Tipo de alerta activada: {contexto.get("tipo", "")}

DATOS CLIMÁTICOS CRÍTICOS ACTUALES:
- Temperatura: {contexto.get("temp", 0)}°C
- Humedad: {contexto.get("humedad", 0)}%
- Lluvia: {contexto.get("lluvia", 0)}mm

DATOS DE SUELO Y RIEGO:
- Temperatura suelo: {contexto.get("suelo", {}).get("temperatura", 0)}°C
- Humedad suelo: {contexto.get("suelo", {}).get("humedad", 0)}%
- Evapotranspiración (ETo): {contexto.get("suelo", {}).get("evapotranspiracion", 0)} mm/día

RIESGOS ACTIVOS PRIORIZADOS:
{chr(10).join([f"- {r.get("icono", "⚠️")} {r.get("titulo", r.get("tipo", "N/A"))} [{r.get("categoria", "general")}] ({r.get("nivel", "medio").upper()})" for r in contexto.get("riesgosActivos", [])[:6]])}

INSTRUCCIONES:
1. Usa el nombre del usuario
2. El asunto debe ser claro y urgente (ej: "🔥 ALERTA: Calor extremo en Jaén")
3. Indica la temperatura actual y qué significa para su olivo
4. Da acciones concretas por cada riesgo activo relevante (máximo 4 riesgos)
5. Considera su variedad de olivo específica al dar recomendaciones
6. El email debe ser moderado (150-250 palabras)
7. Firma como "🫒 Equipo olivaξ"
8. Estructura recomendada:
   - Resumen de situación (2-3 líneas)
   - "Qué hacer ahora (0-6h)" con bullets
   - "Qué vigilar en 24h" con bullets

Devuelve SOLO el contenido HTML del body del email (sin etiquetas <html> ni <body>)."""


def _normalizar_html_email(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```html"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    if "<p" in cleaned or "<div" in cleaned or "<ul" in cleaned:
        return cleaned

    return f"<p>{cleaned.replace(chr(10) + chr(10), '</p><p>').replace(chr(10), '<br/>')}</p>"
