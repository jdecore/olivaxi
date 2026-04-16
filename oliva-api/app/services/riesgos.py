from typing import TypedDict


class NivelRiesgo(TypedDict):
    nivel: str
    descripcion: str
    consejo: str
    impacto: str


class ResultadoRiesgoPlaga(TypedDict):
    mosca: NivelRiesgo
    polilla: NivelRiesgo
    xylella: NivelRiesgo
    repilo: NivelRiesgo
    tuberculosis: NivelRiesgo
    barrenillo: NivelRiesgo
    cochinilla: NivelRiesgo
    phytophthora: NivelRiesgo
    lepra: NivelRiesgo
    verticillium: NivelRiesgo


class ResultadoRiesgoOlivar(TypedDict):
    frio: NivelRiesgo
    calor: NivelRiesgo
    baja_humedad: NivelRiesgo
    alta_humedad: NivelRiesgo
    baja_lluvia: NivelRiesgo
    alta_lluvia: NivelRiesgo


def _get_nivel_riesgo(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if temp >= 18 and temp <= 32 and humedad > 60:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones perfectas para reproducción de mosca",
            "consejo": "Acción inmediata recomendada",
            "impacto": "",
        }
    if temp >= 15 and temp <= 35 and humedad > 40:
        return {
            "nivel": "medio",
            "descripcion": "Vigilar aparición de mosca del olivo",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de mosca del olivo",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_polilla(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if temp >= 16 and temp <= 24 and humedad >= 40 and humedad <= 75 and lluvia <= 2:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones favorables para polilla",
            "consejo": "Acción inmediata recomendada",
            "impacto": "",
        }
    if temp >= 12 and temp <= 30 and humedad >= 25 and lluvia < 8:
        return {
            "nivel": "medio",
            "descripcion": "Monitorear trampas de polilla",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de polilla",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_xylella(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if temp > 20 and humedad > 70 and lluvia > 10:
        return {
            "nivel": "alto",
            "descripcion": "⚠️ Condiciones de riesgo - Revisar vectores",
            "consejo": "Acción inmediata recomendada",
            "impacto": "",
        }
    if temp > 15 and humedad > 50:
        return {
            "nivel": "medio",
            "descripcion": "Condiciones moderadas - Vigilancia preventiva",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de Xylella",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_repilo(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if lluvia > 5 and 10 <= temp <= 20:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones ideales para repilo - Aplicar fungicida",
            "consejo": "Acción inmediata recomendada",
            "impacto": "",
        }
    if humedad > 70 and temp < 25:
        return {
            "nivel": "medio",
            "descripcion": "Humedad elevada - Vigilar manchas en hojas",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de repilo",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_tuberculosis(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if humedad > 75 and temp < 18:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones favorables a tuberculosis del olivo",
            "consejo": "Poda sanitaria y desinfección de herramientas",
            "impacto": "",
        }
    if humedad > 60 and temp < 22:
        return {
            "nivel": "medio",
            "descripcion": "Vigilar tuberculosis en heridas y poda",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de tuberculosis",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_barrenillo(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if temp > 28 and humedad < 55 and lluvia < 2:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones ideales para barrenillo",
            "consejo": "Retirar madera atacada y reforzar trampas",
            "impacto": "",
        }
    if temp > 24 and humedad < 65:
        return {
            "nivel": "medio",
            "descripcion": "Riesgo moderado de barrenillo",
            "consejo": "Vigilar ramas debilitadas",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de barrenillo",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_cochinilla(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if temp > 26 and humedad < 60:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones favorables a cochinilla",
            "consejo": "Revisar focos y aplicar control localizado",
            "impacto": "",
        }
    if temp > 22 and humedad < 70:
        return {
            "nivel": "medio",
            "descripcion": "Riesgo moderado de cochinilla",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de cochinilla",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_phytophthora(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if lluvia > 5 and humedad > 75:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones de riesgo para phytophthora",
            "consejo": "Mejorar drenaje y evitar encharcamientos",
            "impacto": "",
        }
    if lluvia > 2 and humedad > 65:
        return {
            "nivel": "medio",
            "descripcion": "Riesgo moderado de phytophthora",
            "consejo": "Vigilar zonas con mal drenaje",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de phytophthora",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_lepra(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if humedad > 70 and temp < 15:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones favorables a lepra del olivo",
            "consejo": "Aplicar cobre preventivo y saneo",
            "impacto": "",
        }
    if humedad > 60 and temp < 20:
        return {
            "nivel": "medio",
            "descripcion": "Riesgo moderado de lepra",
            "consejo": "Monitoreo preventivo",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de lepra",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def _get_nivel_verticillium(temp: float, humedad: float, lluvia: float) -> NivelRiesgo:
    if humedad > 75 and 15 <= temp <= 28:
        return {
            "nivel": "alto",
            "descripcion": "Condiciones favorables a verticillium",
            "consejo": "Evitar exceso de humedad y controlar drenaje",
            "impacto": "",
        }
    if humedad > 65 and 12 <= temp <= 30:
        return {
            "nivel": "medio",
            "descripcion": "Riesgo moderado de verticillium",
            "consejo": "Vigilancia del estado vascular del árbol",
            "impacto": "",
        }
    return {
        "nivel": "bajo",
        "descripcion": "Riesgo bajo de verticillium",
        "consejo": "Sin acción necesaria",
        "impacto": "",
    }


def calcular_riesgos_plaga(temp: float, humedad: float, lluvia: float) -> ResultadoRiesgoPlaga:
    return {
        "mosca": _get_nivel_riesgo(temp, humedad, lluvia),
        "polilla": _get_nivel_polilla(temp, humedad, lluvia),
        "xylella": _get_nivel_xylella(temp, humedad, lluvia),
        "repilo": _get_nivel_repilo(temp, humedad, lluvia),
        "tuberculosis": _get_nivel_tuberculosis(temp, humedad, lluvia),
        "barrenillo": _get_nivel_barrenillo(temp, humedad, lluvia),
        "cochinilla": _get_nivel_cochinilla(temp, humedad, lluvia),
        "phytophthora": _get_nivel_phytophthora(temp, humedad, lluvia),
        "lepra": _get_nivel_lepra(temp, humedad, lluvia),
        "verticillium": _get_nivel_verticillium(temp, humedad, lluvia),
    }


def calcular_riesgos_olivar(temp: float, humedad: float, lluvia: float) -> ResultadoRiesgoOlivar:
    if temp < 0:
        frio = {
            "nivel": "alto",
            "descripcion": "Helada - riesgo de daño en flores y frutos",
            "consejo": "",
            "impacto": "Daño en floración, pérdida de cosecha",
        }
    elif temp < 5:
        frio = {
            "nivel": "medio",
            "descripcion": "Temperatura muy baja - riesgo de helada",
            "consejo": "",
            "impacto": "Vigilar estado del olivo",
        }
    else:
        frio = {
            "nivel": "bajo",
            "descripcion": "Temperatura adecuada para olivo",
            "consejo": "",
            "impacto": "Sin riesgo de heladas",
        }

    if temp > 40:
        calor = {
            "nivel": "alto",
            "descripcion": "Calor extremo - cierre estomático",
            "consejo": "",
            "impacto": "Estrés hídrico severo, reducción fotosíntesis",
        }
    elif temp > 35:
        calor = {
            "nivel": "medio",
            "descripcion": "Temperatura alta - estrés térmico",
            "consejo": "",
            "impacto": "Mayor demanda de agua",
        }
    else:
        calor = {
            "nivel": "bajo",
            "descripcion": "Temperatura normal para olivo",
            "consejo": "",
            "impacto": "Condiciones óptimas",
        }

    if humedad < 20:
        baja_humedad = {
            "nivel": "alto",
            "descripcion": "Humedad muy baja - estrés hídrico severo",
            "consejo": "",
            "impacto": "Sequía, limitación de crecimiento",
        }
    elif humedad < 35:
        baja_humedad = {
            "nivel": "medio",
            "descripcion": "Humedad baja - precaución",
            "consejo": "",
            "impacto": "Aumentar riego",
        }
    else:
        baja_humedad = {
            "nivel": "bajo",
            "descripcion": "Humedad adecuada",
            "consejo": "",
            "impacto": "Sin riesgo",
        }

    if humedad > 85:
        alta_humedad = {
            "nivel": "alto",
            "descripcion": "Humedad muy alta - riesgo de enfermedades",
            "consejo": "",
            "impacto": "Fungal: repilo, verticilosis",
        }
    elif humedad > 75:
        alta_humedad = {
            "nivel": "medio",
            "descripcion": "Humedad elevada - vigilancia",
            "consejo": "",
            "impacto": "Monitorear enfermedades",
        }
    else:
        alta_humedad = {
            "nivel": "bajo",
            "descripcion": "Humedad normal",
            "consejo": "",
            "impacto": "Sin riesgo",
        }

    if lluvia < 0.5:
        baja_lluvia = {
            "nivel": "alto",
            "descripcion": "Sequía severa - reducción producción hasta 20%",
            "consejo": "",
            "impacto": "Reducción rendimiento aceituna",
        }
    elif lluvia < 2:
        baja_lluvia = {
            "nivel": "medio",
            "descripcion": "Lluvia baja - monitorear riego",
            "consejo": "",
            "impacto": "Posible déficit hídrico",
        }
    else:
        baja_lluvia = {
            "nivel": "bajo",
            "descripcion": "Precipitación adecuada",
            "consejo": "",
            "impacto": "Sin riesgo",
        }

    if lluvia > 20:
        alta_lluvia = {
            "nivel": "alto",
            "descripcion": "Lluvia intensa - riesgo de inundación",
            "consejo": "",
            "impacto": "Asfixia radicular, erosión suelo",
        }
    elif lluvia > 10:
        alta_lluvia = {
            "nivel": "medio",
            "descripcion": "Lluvia moderada - vigilancia",
            "consejo": "",
            "impacto": "Posible encharcamiento",
        }
    else:
        alta_lluvia = {
            "nivel": "bajo",
            "descripcion": "Precipitación normal",
            "consejo": "",
            "impacto": "Sin riesgo",
        }

    return {
        "frio": frio,
        "calor": calor,
        "baja_humedad": baja_humedad,
        "alta_humedad": alta_humedad,
        "baja_lluvia": baja_lluvia,
        "alta_lluvia": alta_lluvia,
    }


def calcular_score_riesgo(temp: float, humedad: float, lluvia: float, variedad_clima: dict) -> dict:
    if not variedad_clima:
        return {"score": 0, "nivel": "óptimo", "detalle": []}

    score = 0
    detalle = []

    rango_calor = variedad_clima.get("calor", {}).get("rango", 38)
    nivel_calor = variedad_clima.get("calor", {}).get("nivel", "media")

    if temp > rango_calor + 2:
        score += 3
        detalle.append(f"🔥 Calor crítico ({temp}°C)")
    elif temp > rango_calor:
        if nivel_calor == "baja":
            score += 3
            detalle.append(f"🔥 Calor sensible ({temp}°C)")
        elif nivel_calor == "media":
            score += 2
            detalle.append(f"🔥 Calor moderado ({temp}°C)")
        else:
            score += 1
            detalle.append(f"🌡️ Calor alto ({temp}°C)")
    elif temp > 35:
        score += 1
        detalle.append(f"🌡️ Estrés térmico ({temp}°C)")

    rango_frio = variedad_clima.get("frio", {}).get("rango", -7)
    nivel_frio = variedad_clima.get("frio", {}).get("nivel", "media")

    if temp < rango_frio - 3:
        score += 3
        detalle.append(f"❄️ Helada severa ({temp}°C)")
    elif temp < rango_frio:
        if nivel_frio == "baja":
            score += 3
            detalle.append(f"❄️ Helada sensible ({temp}°C)")
        elif nivel_frio == "media":
            score += 2
            detalle.append(f"❄️ Frío moderado ({temp}°C)")
        else:
            score += 1
            detalle.append(f"🌡️ Temperatura baja ({temp}°C)")
    elif temp < 5:
        score += 1
        detalle.append(f"🌡️ Temperatura fresca ({temp}°C)")

    rango_humedad = variedad_clima.get("sequia", {}).get("rangoHumedad", 30)
    nivel_sequia = variedad_clima.get("sequia", {}).get("nivel", "media")

    if humedad < rango_humedad - 10:
        if nivel_sequia == "baja":
            score += 3
            detalle.append(f"🏜️ Sequía severa ({humedad}%)")
        elif nivel_sequia in ("media", "media-alta"):
            score += 2
            detalle.append(f"🏜️ Sequía moderada ({humedad}%)")
        else:
            score += 1
            detalle.append(f"🏜️ Baja humedad ({humedad}%)")
    elif humedad < rango_humedad:
        if nivel_sequia == "baja":
            score += 2
            detalle.append(f"🏜️ Estrés hídrico ({humedad}%)")
        else:
            score += 1
            detalle.append(f"💧 Humedad baja ({humedad}%)")
    elif temp > 30 and humedad < 40:
        score += 1
        detalle.append("🌡️+🏜️ Calor + Sequía")

    rango_lluvia = variedad_clima.get("sequia", {}).get("rangoLluvia", 2)
    if 0 < lluvia < 0.5:
        score += 1
        detalle.append(f"🌧️ Lluvia mínima ({lluvia}mm)")

    rango_humedad_alta = variedad_clima.get("humedad_alta", {}).get("rango", 80)
    nivel_humedad_alta = variedad_clima.get("humedad_alta", {}).get("nivel", "media")

    if humedad > rango_humedad_alta + 10:
        if nivel_humedad_alta == "baja":
            score += 3
            detalle.append(f"🦠 Hongos riesgo alto ({humedad}%)")
        elif nivel_humedad_alta == "media":
            score += 2
            detalle.append(f"🦠 Humedad muy alta ({humedad}%)")
        else:
            score += 1
            detalle.append(f"💧 Humedad elevada ({humedad}%)")
    elif humedad > rango_humedad_alta:
        if nivel_humedad_alta == "baja":
            score += 2
            detalle.append(f"🦠 Riesgo hongos ({humedad}%)")
        else:
            score += 1
            detalle.append(f"💧 Alta humedad ({humedad}%)")

    if lluvia > 20:
        score += 2
        detalle.append(f"🌊 Lluvia intensa ({lluvia}mm)")
    elif lluvia > 10:
        score += 1
        detalle.append(f"🌧️ Lluvia moderada ({lluvia}mm)")

    score = min(score, 10)

    nivel = "óptimo"
    if score >= 7:
        nivel = "crítico"
    elif score >= 4:
        nivel = "medio"
    elif score >= 1:
        nivel = "bajo"

    return {"score": score, "nivel": nivel, "detalle": detalle}
