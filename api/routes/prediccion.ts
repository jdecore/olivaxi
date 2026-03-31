import { Hono } from "hono";
import { execSync } from "child_process";
import db from "../db/sqlite";
import { PROVINCIAS } from "../data/provincias";

const app = new Hono();

const ML_ENV_PYTHON = "/home/juan/Documentos/olivaxi/ml_env/bin/python";
const PREDICT_SCRIPT = "/home/juan/Documentos/olivaxi/ml/predict.py";

app.get("/", async (c) => {
  const provincia = c.req.query("provincia");
  
  if (!provincia) {
    return c.json({ error: "Provincia requerida" }, 400);
  }
  
  const provinciaValida = PROVINCIAS.find(p => p.nombre.toLowerCase() === provincia.toLowerCase());
  if (!provinciaValida) {
    return c.json({ error: "Provincia no válida" }, 400);
  }
  
  try {
    const output = execSync(`${ML_ENV_PYTHON} ${PREDICT_SCRIPT} "${provincia}"`, {
      encoding: "utf-8",
      timeout: 10000
    });
    
    const lines = output.trim().split("\n");
    const datos: Record<string, string> = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        datos[key.trim()] = valueParts.join(":").trim();
      }
    }
    
    const riesgo = datos["Riesgo mosca (48h)"] || "bajo";
    const nivelMap: Record<string, string> = {
      "bajo": "bajo",
      "medio": "medio", 
      "alto": "alto"
    };
    
    const nivelNormalizado = nivelMap[riesgo] || "bajo";
    
    return c.json({
      ok: true,
      provincia: datos["Provincia"] || provincia,
      plaga: "mosca",
      nivel: nivelNormalizado,
      confianza: "75%",
      detalles: {
        temperatura: datos["Temperatura"] || "N/A",
        humedad: datos["Humedad"] || "N/A",
        lluvia: datos["Lluvia"] || "N/A",
        mes: datos["Mes"] || "N/A"
      },
      recomendaciones: {
        bajo: ["Monitoreo estándar", "Trampas de feromonas opcionales"],
        medio: ["Aumentar monitoreo", "Considerar tratamiento preventivo"],
        alto: ["Tratamiento inmediato recomendado", "Revisar trampas cada 48h"]
      }[nivelNormalizado] || []
    });
    
  } catch (error: any) {
    console.error("Error predicting:", error.message);
    return c.json({ 
      ok: false,
      error: "Error al generar predicción",
      nivel: "bajo"
    }, 500);
  }
});

export default app;