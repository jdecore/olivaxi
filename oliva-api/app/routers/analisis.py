from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies.database import get_db
from app.routers.clima import _fetch_clima_open_meteo
from app.data.provincias import PROVINCIAS

router = APIRouter(tags=["analisis"])

VALID_PROVINCIAS = [p.get("nombre") for p in PROVINCIAS]


def _evaluar_temperatura(temp: float) -> list[str]:
    alertas = []
    if temp > 42:
        alertas.append("Temperatura crítica: estrés térmico severo")
    elif temp > 38:
        alertas.append("Temperatura alta: riesgo de estrés térmico")
    if temp < 0:
        alertas.append("Temperatura de helada: riesgo para olivo")
    return alertas


def _evaluar_humedad(humedad: float) -> list[str]:
    alertas = []
    if humedad < 20:
        alertas.append("Humedad muy baja: estrés hídrico")
    elif humedad < 40:
        alertas.append("Humedad baja: precaución")
    if humedad > 85:
        alertas.append("Humedad alta: riesgo de enfermedades fúngicas")
    return alertas


def _generar_recomendaciones(temp: float, humedad: float, lluvia: float) -> list[str]:
    recomendaciones = []

    if temp > 35:
        recomendaciones.append("Aumentar frecuencia de riego")
        recomendaciones.append("Evitar poda en horas de sol")
    if humedad < 30 and lluvia < 1:
        recomendaciones.append("Iniciar programa de riego de emergencia")
    if lluvia < 0.5 and humedad < 50:
        recomendaciones.append("Aplicar acolchado para retener humedad")
    if humedad > 80:
        recomendaciones.append("Monitorear plagas como mosca del olivo")
        recomendaciones.append("Evitar aplicaciones foliares")

    return recomendaciones


def _calcular_estres_hidrico(humedad: float, lluvia: float) -> dict:
    if humedad < 30 or lluvia < 0.5:
        return {"nivel": "alto", "descripcion": "Estrés hídrico severo"}
    elif humedad < 50 or lluvia < 2:
        return {"nivel": "medio", "descripcion": "Estrés hídrico moderado"}
    else:
        return {"nivel": "bajo", "descripcion": "Hidratación adecuada"}


@router.get("/{provincia}")
async def get_analisis(provincia: str, db: AsyncSession = Depends(get_db)):
    try:
        settings = get_settings()
        data = await _fetch_clima_open_meteo(settings)

        provincia_data = next(
            (d for d in data if d.get("provincia", "").lower() == provincia.lower()),
            None,
        )

        if not provincia_data:
            raise HTTPException(status_code=404, detail="Provincia no encontrada")

        alertas_temp = _evaluar_temperatura(provincia_data.get("temperatura", 0))
        alertas_hum = _evaluar_humedad(provincia_data.get("humedad", 0))

        alertas = alertas_temp + alertas_hum
        recomendaciones = _generar_recomendaciones(
            provincia_data.get("temperatura", 0),
            provincia_data.get("humedad", 0),
            provincia_data.get("lluvia", 0),
        )

        estres = _calcular_estres_hidrico(
            provincia_data.get("humedad", 0), provincia_data.get("lluvia", 0)
        )

        return {
            "provincia": provincia_data.get("provincia"),
            "alertas": alertas,
            "recomendaciones": recomendaciones,
            "cultivo": "olivo",
            "estres_hidrico": stres.get("descripcion"),
            "estres_nivel": stres.get("nivel"),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR ANALISIS: {e}")
        raise HTTPException(status_code=500, detail="Error interno")
