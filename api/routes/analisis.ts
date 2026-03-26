import { Hono } from "hono";
import { getClimaData, type DatosClima } from "../routes/clima";
import { analizarProvincia } from "../services/analisisAgricola";

const VALID_PROVINCIAS = ['Jaén', 'Córdoba', 'Sevilla', 'Granada', 'Málaga', 'Badajoz', 'Toledo', 'Ciudad Real', 'Almería', 'Huelva'];

const analisis = new Hono();

analisis.get("/:provincia", async (c) => {
  try {
    const provinciaRaw = c.req.param("provincia");
    const provincia = provinciaRaw.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '').trim().slice(0, 50);
    
    const isValid = VALID_PROVINCIAS.some(p => p.toLowerCase() === provincia.toLowerCase());
    if (!isValid) {
      return c.json({ error: "Provincia inválida" }, 400);
    }
    
    const data = await getClimaData();
    const provinciaData = (data as DatosClima[]).find(
      (d) => d.provincia.toLowerCase() === provincia.toLowerCase()
    );
    
    if (!provinciaData) {
      return c.json({ error: "Provincia no encontrada" }, 404);
    }
    
    const resultado = analizarProvincia(provinciaData);
    return c.json(resultado);
  } catch (error) {
    console.error("ERROR ANALISIS:", error);
    return c.json({ error: "Error interno" }, 500);
  }
});

export default analisis;