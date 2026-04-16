from typing import TypedDict


class PlagaEstado(TypedDict):
    polilla: str
    mosca: str
    repilo: str
    xylella: str | None
    tuberculosis: str | None
    barrenillo: str | None
    cochinilla: str | None
    phytophthora: str | None
    lepra: str | None
    verticillium: str | None
    ultimaActualizacion: str


class DatosProvincia(TypedDict):
    nombre: str
    lat: float
    lon: float
    altitud: int
    pluviometriaAnual: int
    suelo: str
    variedadPredominante: str
    epocaCritica: str
    plagasEndemicas: list[str]
    plagasActuales: PlagaEstado
    consejosSuelo: list[str]


PROVINCIAS_DATA: dict[str, DatosProvincia] = {
    "Jaén": {
        "nombre": "Jaén",
        "lat": 37.77,
        "lon": -3.79,
        "altitud": 800,
        "pluviometriaAnual": 600,
        "suelo": "calizo-arcilloso",
        "variedadPredominante": "picual",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["polilla", "mosca", "repilo"],
        "plagasActuales": {
            "polilla": "alto",
            "mosca": "medio",
            "repilo": "bajo",
            "xylella": None,
            "tuberculosis": "medio",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "medio",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "El suelo calizo retiene bien el agua",
            "Aplicar acolchado para retener humedad",
            "Evitar fertilización nitrogenada excesiva en primavera",
        ],
    },
    "Córdoba": {
        "nombre": "Córdoba",
        "lat": 37.88,
        "lon": -4.78,
        "altitud": 600,
        "pluviometriaAnual": 550,
        "suelo": "calizo",
        "variedadPredominante": "picual",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["mosca", "repilo"],
        "plagasActuales": {
            "polilla": "medio",
            "mosca": "bajo",
            "repilo": "medio",
            "xylella": None,
            "tuberculosis": None,
            "barrenillo": None,
            "cochinilla": None,
            "phytophthora": None,
            "lepra": None,
            "verticillium": None,
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo calizo con buen drenaje",
            "Controlar encharcamientos en invierno",
            "Aportar materia orgánica regularmente",
        ],
    },
    "Sevilla": {
        "nombre": "Sevilla",
        "lat": 37.38,
        "lon": -5.97,
        "altitud": 200,
        "pluviometriaAnual": 500,
        "suelo": "franco",
        "variedadPredominante": "manzanilla",
        "epocaCritica": "primavera-verano",
        "plagasEndemicas": ["mosca", "xylella"],
        "plagasActuales": {
            "polilla": "bajo",
            "mosca": "medio",
            "repilo": "bajo",
            "xylella": "bajo",
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "medio",
            "lepra": "bajo",
            "verticillium": "medio",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo franco ideal para olivar",
            "Buena retención de humedad",
            "Vigilancia activa de Xylella",
        ],
    },
    "Granada": {
        "nombre": "Granada",
        "lat": 37.18,
        "lon": -3.6,
        "altitud": 700,
        "pluviometriaAnual": 450,
        "suelo": "calizo",
        "variedadPredominante": "picual",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["repilo", "polilla"],
        "plagasActuales": {
            "polilla": "medio",
            "mosca": "bajo",
            "repilo": "medio",
            "xylella": None,
            "tuberculosis": None,
            "barrenillo": None,
            "cochinilla": None,
            "phytophthora": None,
            "lepra": None,
            "verticillium": None,
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo calizo de montaña",
            "Mayor riesgo de erosión - evitar laboreo",
            "Acolchado obligatorio en pendientes",
        ],
    },
    "Málaga": {
        "nombre": "Málaga",
        "lat": 36.72,
        "lon": -4.42,
        "altitud": 300,
        "pluviometriaAnual": 500,
        "suelo": "arenoso",
        "variedadPredominante": "hojiblanca",
        "epocaCritica": "verano",
        "plagasEndemicas": ["mosca"],
        "plagasActuales": {
            "polilla": "bajo",
            "mosca": "medio",
            "repilo": "bajo",
            "xylella": None,
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "medio",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "bajo",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo arenoso - drainage rápido",
            "Riego más frecuente necesario",
            "Aplicar mulch espeso para retener agua",
        ],
    },
    "Badajoz": {
        "nombre": "Badajoz",
        "lat": 38.87,
        "lon": -6.97,
        "altitud": 500,
        "pluviometriaAnual": 500,
        "suelo": "franco-arcilloso",
        "variedadPredominante": "picual",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["mosca"],
        "plagasActuales": {
            "polilla": "medio",
            "mosca": "bajo",
            "repilo": "medio",
            "xylella": None,
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "bajo",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo fértil de llanura",
            "Buena retención de agua",
            "Ideal para olivar intensivo",
        ],
    },
    "Toledo": {
        "nombre": "Toledo",
        "lat": 39.86,
        "lon": -4.02,
        "altitud": 550,
        "pluviometriaAnual": 400,
        "suelo": "calizo",
        "variedadPredominante": "cornicabra",
        "epocaCritica": "invierno-primavera",
        "plagasEndemicas": ["mosca"],
        "plagasActuales": {
            "polilla": "bajo",
            "mosca": "bajo",
            "repilo": "bajo",
            "xylella": None,
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "bajo",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo calizo de La Mancha",
            "Resistente a sequía",
            "Evitar riego por aspersión",
        ],
    },
    "Ciudad Real": {
        "nombre": "Ciudad Real",
        "lat": 38.98,
        "lon": -3.92,
        "altitud": 650,
        "pluviometriaAnual": 450,
        "suelo": "calizo-arcilloso",
        "variedadPredominante": "picual",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["repilo"],
        "plagasActuales": {
            "polilla": "bajo",
            "mosca": "bajo",
            "repilo": "bajo",
            "xylella": None,
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "bajo",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo de La Mancha",
            "Bien estructurado",
            "Aportar compost anualmente",
        ],
    },
    "Almería": {
        "nombre": "Almería",
        "lat": 36.83,
        "lon": -2.46,
        "altitud": 200,
        "pluviometriaAnual": 220,
        "suelo": "arenoso",
        "variedadPredominante": "arbequina",
        "epocaCritica": "verano",
        "plagasEndemicas": ["xylella"],
        "plagasActuales": {
            "polilla": "bajo",
            "mosca": "bajo",
            "repilo": "bajo",
            "xylella": "medio",
            "tuberculosis": "bajo",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "bajo",
            "verticillium": "bajo",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo arenoso semi-desértico",
            "Riego por goteo esencial",
            "Alta demanda de agua en verano",
        ],
    },
    "Huelva": {
        "nombre": "Huelva",
        "lat": 37.26,
        "lon": -6.94,
        "altitud": 400,
        "pluviometriaAnual": 600,
        "suelo": "franco",
        "variedadPredominante": "manzanilla",
        "epocaCritica": "primavera",
        "plagasEndemicas": ["mosca", "repilo"],
        "plagasActuales": {
            "polilla": "medio",
            "mosca": "bajo",
            "repilo": "medio",
            "xylella": None,
            "tuberculosis": "medio",
            "barrenillo": "bajo",
            "cochinilla": "bajo",
            "phytophthora": "bajo",
            "lepra": "medio",
            "verticillium": "medio",
            "ultimaActualizacion": "2025-05",
        },
        "consejosSuelo": [
            "Suelo atlántico",
            "Mayor humedad ambiental",
            "Controlar hongos en invierno",
        ],
    },
}


PROVINCIAS = [
    {"nombre": p["nombre"], "lat": p["lat"], "lon": p["lon"]}
    for p in PROVINCIAS_DATA.values()
]


def get_datos_provincia(nombre: str) -> DatosProvincia | None:
    return PROVINCIAS_DATA.get(nombre)


def get_plagas_provincia(nombre: str) -> PlagaEstado | None:
    return PROVINCIAS_DATA.get(nombre, {}).get("plagasActuales")


def get_consejo_suelo(nombre: str) -> list[str]:
    return PROVINCIAS_DATA.get(nombre, {}).get("consejosSuelo", [])
