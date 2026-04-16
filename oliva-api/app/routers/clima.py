import asyncio
import aiohttp
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from app.config import get_settings
from app.data.provincias import (
    PROVINCIAS,
    get_datos_provincia,
    get_plagas_provincia,
    get_consejo_suelo,
)
from app.data.varieties import VARIEDADES_INFO, CONSEJOS
from app.services.riesgos import (
    calcular_riesgos_plaga,
    calcular_riesgos_olivar,
    calcular_score_riesgo,
)
from app.dependencies.database import get_db

router = APIRouter(tags=["clima"])

CACHE_TTL = 6 * 60 * 60 * 1000  # 6 hours
TEMP_MEDIA_HISTORICA_DEFAULT = 22
PRECIPITACION_MEDIA_DIARIA_DEFAULT = 2


def _get_estado(temp: float) -> str:
    if temp < 10:
        return "Frío"
    if temp < 20:
        return "Fresco"
    if temp < 28:
        return "Templado"
    if temp < 35:
        return "Cálido"
    if temp < 38:
        return "Calor"
    return "Extremo"


def _normalizar_humedad_suelo(humedad_suelo: float | None) -> float:
    valor = float(humedad_suelo or 0)
    if not valor or valor != valor:
        return 0
    return valor * 100 if valor <= 1 else valor


def _riesgo_desde_activos(riesgos_activos: list[dict]) -> str:
    if not riesgos_activos:
        return "bajo"
    priority = {"crítico": 4, "alto": 3, "medio": 2, "bajo": 1}
    max_priority = max(
        (priority.get(r.get("nivel", "bajo"), 1) for r in riesgos_activos), default=1
    )
    if max_priority >= 3:
        return "alto"
    if max_priority >= 2:
        return "medio"
    return "bajo"


def _nivel_to_priority(nivel: str | None) -> int:
    priority_map = {"crítico": 4, "alto": 3, "medio": 2, "bajo": 1}
    return priority_map.get(nivel, 1)


def _get_riesgos_suelo_y_hongos(prov_data: dict) -> list[dict]:
    suelo_temp = float(prov_data.get("suelo_temp") or 0)
    suelo_humedad = _normalizar_humedad_suelo(prov_data.get("suelo_humedad"))
    eto = float(prov_data.get("evapotranspiracion") or 0)
    lluvia = float(prov_data.get("lluvia") or 0)
    temp = float(prov_data.get("temperatura") or 0)
    humedad = float(prov_data.get("humedad") or 0)
    pluviometria_anual = float(prov_data.get("pluviometriaAnual") or 0)

    kc = 0.7
    necesidad_riego = eto * kc
    deficit_riego = max(0, necesidad_riego - lluvia)
    lluvia_media_diaria = pluviometria_anual / 365 if pluviometria_anual > 0 else 0

    riesgos = []

    if suelo_humedad < 20:
        riesgos.append(
            {
                "tipo": "suelo_seco",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "Suelo seco",
                "icono": "🏜️",
            }
        )
    elif suelo_humedad < 35:
        riesgos.append(
            {
                "tipo": "suelo_seco",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "Humedad de suelo baja",
                "icono": "💧",
            }
        )

    if suelo_humedad > 80:
        riesgos.append(
            {
                "tipo": "suelo_encharcado",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "Suelo encharcado",
                "icono": "🌊",
            }
        )
    elif suelo_humedad > 65:
        riesgos.append(
            {
                "tipo": "suelo_encharcado",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "Humedad de suelo alta",
                "icono": "🪨",
            }
        )

    if suelo_temp < 6:
        riesgos.append(
            {
                "tipo": "suelo_frio",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "Suelo muy frío",
                "icono": "🧊",
            }
        )
    elif suelo_temp < 10:
        riesgos.append(
            {
                "tipo": "suelo_frio",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "Suelo frío",
                "icono": "❄️",
            }
        )

    if suelo_temp > 32:
        riesgos.append(
            {
                "tipo": "suelo_caliente",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "Suelo caliente",
                "icono": "🔥",
            }
        )
    elif suelo_temp > 28:
        riesgos.append(
            {
                "tipo": "suelo_caliente",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "Suelo templado-alto",
                "icono": "🌡️",
            }
        )

    if eto > 6.5 or deficit_riego > 4:
        riesgos.append(
            {
                "tipo": "eto_alta",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "ETo muy alta",
                "icono": "☀️",
            }
        )
    elif eto > 4.5 or deficit_riego > 2:
        riesgos.append(
            {
                "tipo": "eto_alta",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "ETo alta",
                "icono": "📈",
            }
        )

    if lluvia_media_diaria > 0 and lluvia < lluvia_media_diaria * 0.25 and eto > 4:
        riesgos.append(
            {
                "tipo": "deficit_pluviometrico",
                "categoria": "suelo",
                "nivel": "alto",
                "titulo": "Déficit hídrico",
                "icono": "📉",
            }
        )
    elif lluvia_media_diaria > 0 and lluvia < lluvia_media_diaria * 0.5 and eto > 3:
        riesgos.append(
            {
                "tipo": "deficit_pluviometrico",
                "categoria": "suelo",
                "nivel": "medio",
                "titulo": "Lluvia bajo media",
                "icono": "🌧️",
            }
        )

    if humedad > 75 and lluvia > 2 and 10 <= temp <= 20:
        nivel = "alto" if lluvia > 6 else "medio"
        riesgos.append(
            {
                "tipo": "repilo_hongo",
                "categoria": "hongos",
                "nivel": nivel,
                "titulo": "Repilo fúngico",
                "icono": "🍂",
            }
        )

    if suelo_humedad > 75 and 18 <= suelo_temp <= 26 and 15 <= temp <= 30:
        nivel = "alto" if suelo_humedad > 85 else "medio"
        riesgos.append(
            {
                "tipo": "verticilosis",
                "categoria": "hongos",
                "nivel": nivel,
                "titulo": "Verticilosis",
                "icono": "🍄",
            }
        )

    if humedad > 80 and 15 <= temp <= 22 and lluvia > 3:
        nivel = "alto" if lluvia > 8 else "medio"
        riesgos.append(
            {
                "tipo": "antracnosis",
                "categoria": "hongos",
                "nivel": nivel,
                "titulo": "Antracnosis",
                "icono": "🦠",
            }
        )

    if lluvia > 8 and temp < 16 and humedad > 75:
        nivel = "alto" if lluvia > 15 else "medio"
        riesgos.append(
            {
                "tipo": "tuberculosis",
                "categoria": "hongos",
                "nivel": nivel,
                "titulo": "Tuberculosis olivo",
                "icono": "🧫",
            }
        )

    return riesgos


def _get_riesgos_activos(prov_data: dict) -> list[dict]:
    activos = []
    riesgos_olivar = prov_data.get("riesgos_olivar") or {}
    riesgos_plaga = prov_data.get("riesgos_plaga") or {}

    # Clima - Calor
    if riesgos_olivar.get("calor", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "ola_calor",
                "categoria": "clima",
                "nivel": "alto",
                "titulo": "Calor extremo",
                "icono": "🔥",
            }
        )
    elif riesgos_olivar.get("calor", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "calor_critico",
                "categoria": "clima",
                "nivel": "medio",
                "titulo": "Calor",
                "icono": "🌡️",
            }
        )

    # Clima - Frío
    if riesgos_olivar.get("frio", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "helada",
                "categoria": "clima",
                "nivel": "alto",
                "titulo": "Helada",
                "icono": "❄️",
            }
        )
    elif riesgos_olivar.get("frio", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "helada_critica",
                "categoria": "clima",
                "nivel": "medio",
                "titulo": "Frío",
                "icono": "🌡️",
            }
        )

    # Clima - Sequía
    if riesgos_olivar.get("baja_humedad", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "sequia_extrema",
                "categoria": "clima",
                "nivel": "alto",
                "titulo": "Sequía",
                "icono": "🏜️",
            }
        )
    elif riesgos_olivar.get("baja_humedad", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "estres_hidrico",
                "categoria": "clima",
                "nivel": "medio",
                "titulo": "Baja humedad",
                "icono": "💧",
            }
        )

    # Clima - Humedad alta
    if riesgos_olivar.get("alta_humedad", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "alta_humedad",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Humedad alta",
                "icono": "🍄",
            }
        )
    elif riesgos_olivar.get("alta_humedad", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "alta_humedad",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Humedad elevada",
                "icono": "🍄",
            }
        )

    # Clima - Lluvia alta
    if riesgos_olivar.get("alta_lluvia", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "inundacion",
                "categoria": "clima",
                "nivel": "alto",
                "titulo": "Lluvia intensa",
                "icono": "🌊",
            }
        )
    elif riesgos_olivar.get("alta_lluvia", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "inundacion",
                "categoria": "clima",
                "nivel": "medio",
                "titulo": "Lluvia moderada",
                "icono": "🌧️",
            }
        )

    # Plagas
    if riesgos_plaga.get("mosca", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "mosca",
                "categoria": "plagas",
                "nivel": "alto",
                "titulo": "Mosca",
                "icono": "🪰",
            }
        )
    elif riesgos_plaga.get("mosca", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "mosca",
                "categoria": "plagas",
                "nivel": "medio",
                "titulo": "Mosca",
                "icono": "🪰",
            }
        )

    if riesgos_plaga.get("polilla", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "polilla",
                "categoria": "plagas",
                "nivel": "alto",
                "titulo": "Polilla",
                "icono": "🦋",
            }
        )
    elif riesgos_plaga.get("polilla", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "polilla",
                "categoria": "plagas",
                "nivel": "medio",
                "titulo": "Polilla",
                "icono": "🦋",
            }
        )

    if riesgos_plaga.get("repilo", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "repilo",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Repilo",
                "icono": "🍂",
            }
        )
    elif riesgos_plaga.get("repilo", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "repilo",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Repilo",
                "icono": "🍂",
            }
        )

    if riesgos_plaga.get("xylella", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "xylella",
                "categoria": "plagas",
                "nivel": "alto",
                "titulo": "Xylella",
                "icono": "🚨",
            }
        )
    elif riesgos_plaga.get("xylella", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "xslella",
                "categoria": "plagas",
                "nivel": "medio",
                "titulo": "Xylella",
                "icono": "🚨",
            }
        )

    if riesgos_plaga.get("tuberculosis", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "tuberculosis",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Tuberculosis olivo",
                "icono": "🧫",
            }
        )
    elif riesgos_plaga.get("tuberculosis", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "tuberculosis",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Tuberculosis olivo",
                "icono": "🧫",
            }
        )

    if riesgos_plaga.get("barrenillo", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "barrenillo",
                "categoria": "plagas",
                "nivel": "alto",
                "titulo": "Barrenillo",
                "icono": "🪲",
            }
        )
    elif riesgos_plaga.get("barrenillo", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "barrenillo",
                "categoria": "plagas",
                "nivel": "medio",
                "titulo": "Barrenillo",
                "icono": "🪲",
            }
        )

    if riesgos_plaga.get("cochinilla", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "cochinilla",
                "categoria": "plagas",
                "nivel": "alto",
                "titulo": "Cochinilla",
                "icono": "🐛",
            }
        )
    elif riesgos_plaga.get("cochinilla", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "cochinilla",
                "categoria": "plagas",
                "nivel": "medio",
                "titulo": "Cochinilla",
                "icono": "🐛",
            }
        )

    if riesgos_plaga.get("phytophthora", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "phytophthora",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Phytophthora",
                "icono": "🍄",
            }
        )
    elif riesgos_plaga.get("phytophthora", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "phytophthora",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Phytophthora",
                "icono": "🍄",
            }
        )

    if riesgos_plaga.get("lepra", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "lepra",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Lepra",
                "icono": "🤕",
            }
        )
    elif riesgos_plaga.get("lepra", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "lepra",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Lepra",
                "icono": "🤕",
            }
        )

    if riesgos_plaga.get("verticillium", {}).get("nivel") == "alto":
        activos.append(
            {
                "tipo": "verticilosis",
                "categoria": "hongos",
                "nivel": "alto",
                "titulo": "Verticilosis",
                "icono": "🥀",
            }
        )
    elif riesgos_plaga.get("verticillium", {}).get("nivel") == "medio":
        activos.append(
            {
                "tipo": "verticilosis",
                "categoria": "hongos",
                "nivel": "medio",
                "titulo": "Verticilosis",
                "icono": "🥀",
            }
        )

    # Riesgos de suelo y hongos
    activos.extend(_get_riesgos_suelo_y_hongos(prov_data))

    # Sort by priority
    priority = {"alto": 3, "medio": 2, "bajo": 1}
    return sorted(activos, key=lambda r: priority.get(r.get("nivel"), 1), reverse=True)


def _get_consejos_by_riesgos(
    riesgos_olivar: dict, riesgos_plaga: dict, riesgos_activos: list[dict] | None = None
) -> list[str]:
    consejos = []
    riesgos_activos = riesgos_activos or []

    if riesgos_olivar.get("calor", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("ola_calor", [])[:2])
    elif riesgos_olivar.get("calor", {}).get("nivel") == "medio":
        consejos.extend(CONSEJOS.get("calor_critico", [])[:2])

    if riesgos_olivar.get("frio", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("helada", [])[:2])

    if (
        riesgos_olivar.get("baja_humedad", {}).get("nivel") == "alto"
        or riesgos_olivar.get("baja_lluvia", {}).get("nivel") == "alto"
    ):
        consejos.extend(CONSEJOS.get("sequia_extrema", [])[:2])

    if riesgos_olivar.get("alta_humedad", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("alta_humedad", [])[:2])

    if riesgos_olivar.get("alta_lluvia", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("inundacion", [])[:2])

    if riesgos_plaga.get("mosca", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("mosca", [])[:2])

    if riesgos_plaga.get("polilla", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("polilla", [])[:2])

    if riesgos_plaga.get("repilo", {}).get("nivel") == "alto":
        consejos.extend(CONSEJOS.get("repilo", [])[:2])

    tipos_activos = set(r.get("tipo") for r in riesgos_activos)
    if "suelo_seco" in tipos_activos or "eto_alta" in tipos_activos:
        consejos.extend(
            [
                "🚿 Ajusta riego diario según ETo y lluvia",
                "🌅 Prioriza riego al amanecer para reducir pérdidas",
            ]
        )

    if "suelo_encharcado" in tipos_activos:
        consejos.append("🕳️ Mejora drenaje y evita compactación del suelo")

    if "deficit_pluviometrico" in tipos_activos:
        consejos.append("📉 Mantén estrategia de riego deficitario controlado")

    if (
        "verticilosis" in tipos_activos
        or "antracnosis" in tipos_activos
        or "tuberculosis" in tipos_activos
    ):
        consejos.extend(
            [
                "🍄 Refuerza vigilancia fúngica y evita heridas en poda",
                "✂️ Desinfecta herramientas y mejora ventilación del olivar",
            ]
        )

    if not consejos:
        return CONSEJOS.get("condiciones_optimas", [])

    return list(dict.fromkeys(consejos))


# Var iedad resistencias
VARIEDADES_RESISTENCIAS = {
    key: {
        "nombre": val.get("nombre", key),
        "clima": {
            "frio": {
                "nivel": val.get("clima", {}).get("frio", "media"),
                "rango": -10
                if key == "cornicabra"
                else -7
                if key == "picual"
                else -5
                if key == "arbequina"
                else -3,
            },
            "calor": {
                "nivel": val.get("clima", {}).get("calor", "media"),
                "rango": 35
                if key == "arbequina"
                else 38
                if key in ("hojiblanca", "manzanilla", "empeltre")
                else 40,
            },
            "sequia": {
                "nivel": val.get("clima", {}).get("sequia", "media"),
                "rangoHumedad": 20
                if key in ("cornicabra", "empeltre")
                else 30
                if key == "picual"
                else 50
                if key in ("arbequina", "manzanilla")
                else 35,
                "rangoLluvia": 0.5
                if key in ("cornicabra", "empeltre")
                else 2
                if key in ("picual", "hojiblanca")
                else 5,
            },
            "humedad_alta": {
                "nivel": val.get("clima", {}).get("humedad_alta", "media"),
                "rango": 80
                if key == "cornicabra"
                else 70
                if key in ("arbequina", "manzanilla")
                else 75,
            },
        },
    }
    for key, val in VARIEDADES_INFO.items()
}


_clima_cache: list[dict] | None = None
_clima_cache_time: int = 0


async def _fetch_clima_open_meteo(settings) -> list[dict]:
    global _clima_cache, _clima_cache_time

    now = datetime.now().timestamp() * 1000

    if _clima_cache and _clima_cache_time > now - CACHE_TTL:
        return _clima_cache

    settings = get_settings()
    open_meteo_url = settings.open_meteo_url

    tareas = []
    for prov in PROVINCIAS:
        tareas.append(_fetch_provincia_clima(open_meteo_url, prov))

    resultados = await asyncio.gather(*tareas, return_exceptions=True)

    data = []
    stale_cache = _clima_cache

    for i, resultado in enumerate(resultados):
        prov = PROVINCIAS[i]
        if isinstance(resultado, Exception):
            print(f"Error fetch {prov['nombre']}: {resultado}")
            previous = (
                next(
                    (p for p in stale_cache if p.get("provincia") == prov["nombre"]),
                    None,
                )
                if stale_cache
                else None
            )
            if previous:
                data.append(
                    {
                        "provincia": prov,
                        "temp": previous.get("temperatura", 0),
                        "humedad": previous.get("humedad", 0),
                        "lluvia": previous.get("lluvia", 0),
                        "suelo_temp": previous.get("suelo_temp", 0),
                        "suelo_humedad": previous.get("suelo_humedad", 0),
                        "evapotranspiracion": previous.get("evapotranspiracion", 0),
                    }
                )
            else:
                data.append(
                    {
                        "provincia": prov,
                        "temp": 0,
                        "humedad": 0,
                        "lluvia": 0,
                        "suelo_temp": 0,
                        "suelo_humedad": 0,
                        "evapotranspiracion": 0,
                    }
                )
        else:
            data.append(resultado)

    processed = []
    for item in data:
        temp = item.get("temp", 0)
        humedad = item.get("humedad", 0)
        lluvia = item.get("lluvia", 0)

        riesgos_olivar = calcular_riesgos_olivar(temp, humedad, lluvia)
        estado = _get_estado(temp)
        riesgos_plaga = calcular_riesgos_plaga(temp, humedad, lluvia)

        # Riesgos por variedad
        riesgos_variedad = {}
        for key, var_data in VARIEDADES_RESISTENCIAS.items():
            riesgos_variedad[key] = calcular_score_riesgo(
                temp, humedad, lluvia, var_data.get("clima")
            )

        nombre_provincia = item.get("provincia", {}).get("nombre", "")
        datos_provincia = get_datos_provincia(nombre_provincia)
        riesgos_provincia = get_plagas_provincia(nombre_provincia)
        consejos = get_consejo_suelo(nombre_provincia)

        # Combinar con datos RAIF
        riesgos_plaga_combinados = {**riesgos_plaga}
        if riesgos_provincia:
            for plaga, nivel in riesgos_provincia.items():
                if nivel and plaga in riesgos_plaga_combinados:
                    riesgos_plaga_combinados[plaga] = {
                        **riesgos_plaga_combinados[plaga],
                        "fuente": "RAIF",
                        "nivelRAIF": nivel,
                    }

        prov_data = {
            "provincia": nombre_provincia,
            "lat": item.get("provincia", {}).get("lat", 0),
            "lon": item.get("provincia", {}).get("lon", 0),
            "temperatura": temp,
            "humedad": humedad,
            "lluvia": lluvia,
            "estado": estado,
            "source": "api",
            "suelo_temp": item.get("suelo_temp", 0),
            "suelo_humedad": item.get("suelo_humedad", 0),
            "evapotranspiracion": item.get("evapotranspiracion", 0),
            "altitud": datos_provincia.get("altitud") if datos_provincia else None,
            "pluviometriaAnual": datos_provincia.get("pluviometriaAnual")
            if datos_provincia
            else None,
            "tipoSuelo": datos_provincia.get("suelo") if datos_provincia else None,
            "variedadPredominante": datos_provincia.get("variedadPredominante")
            if datos_provincia
            else None,
            "epocaCritica": datos_provincia.get("epocaCritica") if datos_provincia else None,
            "consejosSuelo": consejos,
            "riesgos_plaga": riesgos_plaga_combinados,
            "riesgos_olivar": riesgos_olivar,
            "riesgos_variedad": riesgos_variedad,
        }

        riesgos_activos = _get_riesgos_activos(prov_data)
        riesgo = _riesgo_desde_activos(riesgos_activos)

        processed.append({**prov_data, "riesgo": riesgo, "riesgosActivos": riesgos_activos})

    _clima_cache = processed
    _clima_cache_time = now

    # Save to DB
    try:
        async for session in get_db():
            await session.execute(
                text(
                    "INSERT OR REPLACE INTO clima_cache (id, datos, cached_at) VALUES (1, :datos, :cached_at)"
                ),
                {"datos": json.dumps(processed), "cached_at": int(now)},
            )
            await session.commit()
            break
    except Exception as e:
        print(f"[Clima] Error saving cache: {e}")

    return processed


async def _fetch_provincia_clima(url: str, provincia: dict) -> dict:
    lat = provincia.get("lat")
    lon = provincia.get("lon")

    params = f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,soil_temperature_0cm,soil_moisture_0_to_1cm,et0_fao_evapotranspiration&daily=et0_fao_evapotranspiration_sum&timezone=auto"

    async with aiohttp.ClientSession() as session:
        try:
            async with asyncio.timeout(10):
                async with session.get(f"{url}?{params}") as response:
                    if response.status != 200:
                        raise Exception(f"Status {response.status}")

                    d = await response.json()

                    eto_current = float(d.get("current", {}).get("et0_fao_evapotranspiration") or 0)
                    eto_daily = float(
                        d.get("daily", {}).get("et0_fao_evapotranspiration_sum", [0])[0] or 0
                    )
                    eto_fallback = (
                        eto_current if eto_current > 0 else (eto_daily if eto_daily > 0 else 0)
                    )

                    return {
                        "provincia": provincia,
                        "temp": d.get("current", {}).get("temperature_2m", 0),
                        "humedad": d.get("current", {}).get("relative_humidity_2m", 0),
                        "lluvia": d.get("current", {}).get("precipitation", 0),
                        "suelo_temp": d.get("current", {}).get("soil_temperature_0cm", 0),
                        "suelo_humedad": d.get("current", {}).get("soil_moisture_0_to_1cm", 0),
                        "evapotranspiracion": eto_fallback,
                    }
        except asyncio.TimeoutError:
            raise Exception(f"Timeout fetching {provincia.get('nombre')}")
        except Exception as e:
            raise Exception(f"Error fetching {provincia.get('nombre')}: {e}")


@router.get("/")
async def get_clima(db: AsyncSession = Depends(get_db)):
    try:
        settings = get_settings()
        data = await _fetch_clima_open_meteo(settings)
        return data
    except Exception as e:
        print(f"ERROR CLIMA: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_dashboard(provincia: str, variedad: str = "", db: AsyncSession = Depends(get_db)):
    try:
        settings = get_settings()
        data = await _fetch_clima_open_meteo(settings)

        prov_data = next((p for p in data if p.get("provincia") == provincia), None)

        if not prov_data:
            raise HTTPException(status_code=404, detail="Provincia no encontrada")

        riesgos_activos = _get_riesgos_activos(prov_data)
        consejos = _get_consejos_by_riesgos(
            prov_data.get("riesgos_olivar"),
            prov_data.get("riesgos_plaga"),
            riesgos_activos,
        )
        suelo_humedad_pct = _normalizar_humedad_suelo(prov_data.get("suelo_humedad"))

        kc = 0.7
        necesidad_riego = round((float(prov_data.get("evapotranspiracion") or 0) * kc) * 10) / 10
        deficit_riego = (
            round(max(0, necesidad_riego - float(prov_data.get("lluvia") or 0)) * 10) / 10
        )
        lluvia_media_diaria = (
            round(((float(prov_data.get("pluviometriaAnual") or 0) / 365) or 0) * 10) / 10
        )

        temp_actual = prov_data.get("temperatura")
        variacion_temp = temp_actual - TEMP_MEDIA_HISTORICA_DEFAULT
        tendencia = (
            "subiendo" if variacion_temp > 1 else "bajando" if variacion_temp < -1 else "estable"
        )

        comparacion_historica = {
            "temperaturaActual": temp_actual,
            "temperaturaMedia": TEMP_MEDIA_HISTORICA_DEFAULT,
            "variacion": round(variacion_temp * 10) / 10,
            "tendencia": tendencia,
            "mensaje": f"+{int(variacion_temp)}°C respecto a la media"
            if variacion_temp > 0
            else f"{int(variacion_temp)}°C bajo la media"
            if variacion_temp < 0
            else "Similar a la media histórica",
            "riesgoCalor": temp_actual > 35,
            "riesgoFrio": temp_actual < 5,
            "precipitacionActual": prov_data.get("lluvia"),
            "precipitacionMedia": PRECIPITACION_MEDIA_DIARIA_DEFAULT,
            "deficitLluvia": prov_data.get("lluvia") < PRECIPITACION_MEDIA_DIARIA_DEFAULT,
        }

        return {
            "ok": True,
            "provincia": provincia,
            "clima": {
                "temperatura": prov_data.get("temperatura"),
                "humedad": prov_data.get("humedad"),
                "lluvia": prov_data.get("lluvia"),
                "estado": prov_data.get("estado"),
                "riesgo": prov_data.get("riesgo"),
            },
            "suelo": {
                "temperatura": prov_data.get("suelo_temp"),
                "humedad": suelo_humedad_pct,
                "evapotranspiracion": prov_data.get("evapotranspiracion"),
            },
            "sueloAnalitica": {
                "humedadPorcentaje": suelo_humedad_pct,
                "kc": kc,
                "necesidadRiego": necesidad_riego,
                "deficitRiego": deficit_riego,
                "lluviaMediaDiaria": lluvia_media_diaria,
            },
            "provinciaInfo": {
                "altitud": prov_data.get("altitud"),
                "pluviometriaAnual": prov_data.get("pluviometriaAnual"),
                "tipoSuelo": prov_data.get("tipoSuelo"),
                "variedadPredominante": prov_data.get("variedadPredominante"),
                "epocaCritica": prov_data.get("epocaCritica"),
                "consejosSuelo": prov_data.get("consejosSuelo", []),
            },
            "plagas": prov_data.get("riesgos_plaga"),
            "riesgos": {
                "olivar": prov_data.get("riesgos_olivar"),
                "variedad": prov_data.get("riesgos_variedad", {}).get(variedad)
                if variedad
                else None,
            },
            "riesgosActivos": riesgos_activos,
            "consejos": consejos,
            "variedadRiesgo": prov_data.get("riesgos_variedad", {}).get(variedad)
            if variedad
            else None,
            "comparacionHistorica": comparacion_historica,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR DASHBOARD: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/provincias")
async def get_provincias(db: AsyncSession = Depends(get_db)):
    try:
        settings = get_settings()
        data = await _fetch_clima_open_meteo(settings)
        return [
            {
                "provincia": p.get("provincia"),
                "lat": p.get("lat"),
                "lon": p.get("lon"),
                "temperatura": p.get("temperatura"),
                "riesgo": p.get("riesgo"),
                "variedadPredominante": p.get("variedadPredominante"),
                "tipoSuelo": p.get("tipoSuelo"),
            }
            for p in data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
