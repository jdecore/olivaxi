import { Hono } from "hono";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { PROVINCIAS } from "../data/provincias";

const prediccion = new Hono();

function pickFirstExisting(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!candidate.includes("/")) return candidate;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const ML_ENV_PYTHON = pickFirstExisting([
  process.env.ML_ENV_PYTHON || "",
  "/app/ml_env/bin/python",
  resolve(process.cwd(), "ml_env/bin/python"),
  resolve(process.cwd(), "../ml_env/bin/python"),
  "python3",
]);

const PREDICT_SCRIPT = pickFirstExisting([
  process.env.ML_PREDICT_SCRIPT || "",
  "/app/ml/predict.py",
  resolve(process.cwd(), "ml/predict.py"),
  resolve(process.cwd(), "../ml/predict.py"),
]);

if (!ML_ENV_PYTHON || !PREDICT_SCRIPT) {
  throw new Error("Configuración ML inválida: no se encontró intérprete Python o script predict.py");
}

prediccion.get("/", async (c) => {
  const provincia = c.req.query("provincia");
  
  if (!provincia) {
    return c.json({ error: "Provincia requerida" }, 400);
  }
  
  const provinciaValida = PROVINCIAS.find(p => p.nombre.toLowerCase() === provincia.toLowerCase());
  if (!provinciaValida) {
    return c.json({ error: "Provincia no válida" }, 400);
  }
  
  try {
    const proc = spawnSync(ML_ENV_PYTHON, [PREDICT_SCRIPT, provincia], {
      encoding: "utf-8",
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (proc.error) {
      throw proc.error;
    }

    if (proc.status !== 0) {
      const stderr = proc.stderr?.trim();
      const stdout = proc.stdout?.trim();
      throw new Error(stderr || stdout || `Proceso ML terminó con código ${proc.status}`);
    }

    const output = proc.stdout || "";
    if (!output.trim()) {
      throw new Error("El script de predicción no devolvió salida");
    }
    
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
    const errMsg = error?.message || String(error) || 'Unknown error';
    return c.json({ 
      ok: false,
      error: "Error al generar predicción: " + errMsg,
      nivel: "bajo"
    }, 500);
  }
});

export default prediccion;
