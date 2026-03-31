import joblib
import sys
import requests
import numpy as np
from datetime import datetime

if len(sys.argv) < 2:
    print("Usage: python predict.py <provincia>")
    sys.exit(1)

provincia = sys.argv[1]

model = joblib.load("/home/juan/Documentos/olivaxi/ml/modelo_mosca.joblib")
le_prov = joblib.load("/home/juan/Documentos/olivaxi/ml/label_encoder_prov.joblib")
le_nivel = joblib.load("/home/juan/Documentos/olivaxi/ml/label_encoder_nivel.joblib")

provincia_coords = {
    "Jaén": (37.7, -3.5),
    "Córdoba": (37.9, -4.8),
    "Sevilla": (37.4, -6.0),
    "Granada": (37.2, -3.6),
    "Almería": (36.8, -2.4),
    "Huelva": (37.2, -7.0),
    "Cádiz": (36.5, -6.3),
    "Málaga": (36.7, -4.4),
    "Badajoz": (38.9, -7.0),
    "Toledo": (39.8, -4.0),
}

lat, lon = provincia_coords.get(provincia, (37.5, -4.0))

try:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation"
    resp = requests.get(url, timeout=8)
    if resp.status_code == 200:
        datos = resp.json()["current"]
        temp = datos.get("temperature_2m", 20)
        humedad = datos.get("relative_humidity_2m", 50)
        lluvia = datos.get("precipitation", 0)
    else:
        temp, humedad, lluvia = 20, 50, 0
except Exception as e:
    print(f"Warning: {e}")
    temp, humedad, lluvia = 20, 50, 0

mes = datetime.now().month

provincia_enc = le_prov.transform([provincia])[0]

prov_base = {
    "Jaén": 0.60,
    "Córdoba": 0.60,
    "Sevilla": 0.50,
    "Granada": 0.50,
    "Almería": 0.40,
    "Huelva": 0.40,
    "Cádiz": 0.35,
    "Málaga": 0.35,
    "Badajoz": 0.30,
    "Toledo": 0.30,
}.get(provincia, 0.5)

mes_est = 0.30 if mes in [5, 6, 7, 8, 9] else 0.10 if mes in [4, 10] else 0.0
temp_alto = 1 if temp > 30 else 0
humedad_alta = 1 if humedad > 60 else 0
lluvia_alta = 1 if lluvia > 10 else 0

X = [
    [
        provincia_enc,
        mes,
        temp,
        humedad,
        lluvia,
        prov_base,
        mes_est,
        temp_alto,
        humedad_alta,
        lluvia_alta,
    ]
]

X = np.array(X, dtype=np.float64)

pred = model.predict(X)[0]
nivel = le_nivel.inverse_transform([pred])[0]

print(f"Provincia: {provincia}")
print(f"Mes: {mes}")
print(f"Temperatura: {temp:.1f}°C")
print(f"Humedad: {humedad:.1f}%")
print(f"Lluvia: {lluvia:.1f}mm")
print(f"Riesgo mosca (48h): {nivel}")
