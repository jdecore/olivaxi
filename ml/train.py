import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
import os

provincias = [
    "Jaén",
    "Córdoba",
    "Sevilla",
    "Granada",
    "Almería",
    "Huelva",
    "Cádiz",
    "Málaga",
    "Badajoz",
    "Toledo",
]
meses = list(range(1, 13))

np.random.seed(42)

data = []
for _ in range(2000):
    provincia = np.random.choice(provincias)
    mes = np.random.choice(meses)
    temp = np.random.uniform(10, 40)
    humedad = np.random.uniform(20, 90)
    lluvia = np.random.uniform(0, 30)

    if provincia in ["Jaén", "Córdoba"]:
        base = 0.6
    elif provincia in ["Sevilla", "Granada"]:
        base = 0.5
    else:
        base = 0.4

    if mes in [5, 6, 7, 8, 9]:
        estacional = 0.3
    else:
        estacional = 0.0

    riesgo = base + estacional
    if temp > 30:
        riesgo += 0.1
    if humedad > 60:
        riesgo += 0.1
    if lluvia > 10:
        riesgo -= 0.15

    riesgo = max(0, min(1, riesgo + np.random.uniform(-0.15, 0.15)))

    nivel = "bajo" if riesgo < 0.35 else "medio" if riesgo < 0.65 else "alto"

    data.append([provincia, mes, temp, humedad, lluvia, nivel])

df = pd.DataFrame(
    data, columns=["provincia", "mes", "temp", "humedad", "lluvia", "nivel"]
)

le_prov = LabelEncoder()
le_nivel = LabelEncoder()
df["provincia_enc"] = le_prov.fit_transform(df["provincia"])
df["nivel_enc"] = le_nivel.fit_transform(df["nivel"])

X = df[["provincia_enc", "mes", "temp", "humedad", "lluvia"]]
y = df["nivel_enc"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print(f"Precisión del modelo: {accuracy * 100:.2f}%")

joblib.dump(model, "/home/juan/Documentos/olivaxi/ml/modelo_mosca.joblib")
joblib.dump(le_prov, "/home/juan/Documentos/olivaxi/ml/label_encoder_prov.joblib")
joblib.dump(le_nivel, "/home/juan/Documentos/olivaxi/ml/label_encoder_nivel.joblib")

print("Modelos guardados en /home/juan/Documentos/olivaxi/ml/")
