import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
from sklearn.metrics import classification_report

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


def calcular_riesgo(provincia, mes, temp, humedad, lluvia):
    base = {
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

    estacional = 0.30 if mes in [5, 6, 7, 8, 9] else 0.10 if mes in [4, 10] else 0.0

    riesgo = base + estacional

    if temp > 30:
        riesgo += 0.10
    if humedad > 60:
        riesgo += 0.08
    if lluvia > 10:
        riesgo -= 0.15

    return max(0, min(1, riesgo))


def generar_datos(n):
    data = []
    for _ in range(n):
        provincia = np.random.choice(provincias)
        mes = np.random.choice(meses)
        temp = round(np.random.uniform(10, 40), 1)
        humedad = round(np.random.uniform(20, 90), 1)
        lluvia = round(np.random.uniform(0, 30), 1)

        riesgo = calcular_riesgo(provincia, mes, temp, humedad, lluvia)

        if riesgo < 0.33:
            nivel = "bajo"
        elif riesgo < 0.66:
            nivel = "medio"
        else:
            nivel = "alto"

        data.append([provincia, mes, temp, humedad, lluvia, nivel])

    return data


print("Generando 20000 muestras...")
datos = generar_datos(20000)
df = pd.DataFrame(
    datos, columns=["provincia", "mes", "temp", "humedad", "lluvia", "nivel"]
)

print(f"Distribución: {df['nivel'].value_counts().to_dict()}")

le_prov = LabelEncoder()
le_nivel = LabelEncoder()
df["provincia_enc"] = le_prov.fit_transform(df["provincia"])
df["nivel_enc"] = le_nivel.fit_transform(df["nivel"])

prov_base = (
    df["provincia"]
    .map(
        {
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
        }
    )
    .fillna(0.5)
)
df["prov_base"] = prov_base

mes_est = df["mes"].apply(
    lambda m: 0.30 if m in [5, 6, 7, 8, 9] else 0.10 if m in [4, 10] else 0.0
)
df["mes_est"] = mes_est

df["temp_alto"] = (df["temp"] > 30).astype(int)
df["humedad_alta"] = (df["humedad"] > 60).astype(int)
df["lluvia_alta"] = (df["lluvia"] > 10).astype(int)

X = df[
    [
        "provincia_enc",
        "mes",
        "temp",
        "humedad",
        "lluvia",
        "prov_base",
        "mes_est",
        "temp_alto",
        "humedad_alta",
        "lluvia_alta",
    ]
]
y = df["nivel_enc"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.10, random_state=42, stratify=y
)

print("Entrenando RandomForest...")
model = RandomForestClassifier(
    n_estimators=500,
    max_depth=None,
    min_samples_split=2,
    min_samples_leaf=1,
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print(f"Precisión: {accuracy * 100:.2f}%")

y_pred = model.predict(X_test)
print("\nReporte de clasificación:")
print(classification_report(y_test, y_pred, target_names=le_nivel.classes_))

joblib.dump(model, "/home/juan/Documentos/olivaxi/ml/modelo_mosca.joblib")
joblib.dump(le_prov, "/home/juan/Documentos/olivaxi/ml/label_encoder_prov.joblib")
joblib.dump(le_nivel, "/home/juan/Documentos/olivaxi/ml/label_encoder_nivel.joblib")

print(f"\n✅ Modelos guardados - Precisión: {accuracy * 100:.2f}%")
