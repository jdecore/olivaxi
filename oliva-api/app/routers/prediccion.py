import subprocess
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies.database import get_db
from app.data.provincias import PROVINCIAS

router = APIRouter(tags=["prediccion"])


def _pick_first_existing(candidates: list) -> str | None:
    for candidate in candidates:
        if not candidate:
            continue
        if "/" not in candidate:
            return candidate
        if os.path.exists(candidate):
            return candidate
    return None


@router.get("/")
async def get_prediccion(provincia: str, db: AsyncSession = Depends(get_db)):
    if not provincia:
        raise HTTPException(status_code=400, detail="Provincia requerida")

    provincia_valida = next(
        (p for p in PROVINCIAS if p.get("nombre", "").lower() == provincia.lower()),
        None,
    )
    if not provincia_valida:
        raise HTTPException(status_code=400, detail="Provincia no válida")

    settings = get_settings()

    ml_python = _pick_first_existing(
        [
            settings.ml_python_path,
            "/app/ml_env/bin/python",
            "python3",
        ]
    )

    predict_script = _pick_first_existing(
        [
            settings.ml_predict_script,
            "/app/ml/predict.py",
            "./ml/predict.py",
        ]
    )

    if not ml_python or not predict_script:
        raise HTTPException(status_code=500, detail="Configuración ML inválida")

    try:
        result = subprocess.run(
            [ml_python, predict_script, provincia],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=Path(predict_script).parent if predict_script else None,
        )

        if result.returncode != 0:
            stderr = result.stderr.strip()
            stdout = result.stdout.strip()
            raise Exception(
                stderr or stdout or f"Proceso ML terminó con código {result.returncode}"
            )

        output = result.stdout.strip()
        if not output.strip():
            raise Exception("El script de predicción no devolvió salida")

        lines = output.strip().split("\n")
        datos = {}
        for line in lines:
            parts = line.split(":", 1)
            if len(parts) == 2:
                datos[parts[0].strip()] = parts[1].strip()

        riesgo = datos.get("Riesgo mosca (48h)", "bajo")
        nivel_map = {"bajo": "bajo", "medio": "medio", "alto": "alto"}
        nivel_normalizado = nivel_map.get(riesgo, "bajo")

        return {
            "ok": True,
            "provincia": datos.get("Provincia", provincia),
            "plaga": "mosca",
            "nivel": nivel_normalizado,
            "confianza": "100%",
            "detalles": {
                "temperatura": datos.get("Temperatura", "N/A"),
                "humedad": datos.get("Humedad", "N/A"),
                "lluvia": datos.get("Lluvia", "N/A"),
                "mes": datos.get("Mes", "N/A"),
            },
            "recomendaciones": {
                "bajo": ["Monitoreo estándar", "Trampas de feromonas opcionales"],
                "medio": ["Aumentar monitoreo", "Considerar tratamiento preventivo"],
                "alto": [
                    "Tratamiento inmediato recomendado",
                    "Revisar trampas cada 48h",
                ],
            }.get(nivel_normalizado, []),
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout al generar predicción")
    except Exception as e:
        print(f"ERROR PREDICCION: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar predicción: {str(e)}")
