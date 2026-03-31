import { Hono } from "hono";
import { execSync } from "child_process";
import { PROVINCIAS } from "../data/provincias";

const prediccion = new Hono();

const ML_ENV_PYTHON = process.env.ML_ENV_PYTHON || "/app/ml_env/bin/python";
const PREDICT_SCRIPT = "/app/ml/predict.py";

prediccion.get("/test", (c) => {
  return c.json({ test: "ok" });
});

prediccion.get("/", async (c) => {
  const provincia = c.req.query("provincia");
  
  if (!provincia) {
    return c.json({ error: "Provincia requerida" }, 400);
  }
  
  const provinciaValida = PROVINCIAS.find(p => p.nombre.toLowerCase() === provincia.toLowerCase());
  if (!provinciaValida) {
    return c.json({ error: "Provincia no válida" }, 400);
  }
  
  const cmd = `${ML_ENV_PYTHON} ${PREDICT_SCRIPT} "${provincia}"`;
  console.error("CMD:", cmd);
  
  try {
    const cmd = `${ML_ENV_PYTHON} ${PREDICT_SCRIPT} "${provincia}"`;
    console.error("CMD:", cmd);
    
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    
    console.error("Raw output:", output);
    
    const lines = output.trim().split("\n");
    console.error("Lines:", lines);
    
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
      confianza: "100%",
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
    console.error("ERROR in prediction:", error);
    const errMsg = error?.message || String(error) || 'Unknown error';
    return c.json({ 
      ok: false,
      error: "Error al generar predicción: " + errMsg,
      nivel: "bajo"
    }, 500);
  }
});

export default prediccion;