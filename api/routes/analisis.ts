import { Hono } from "hono";
import { getClimaData, type DatosClima } from "../routes/clima";
import { analizarTodas } from "../services/analisisAgricola";

const analisis = new Hono();

analisis.get("/", async (c) => {
  try {
    const data = await getClimaData();
    const resultados = analizarTodas(data as DatosClima[]);
    return c.json(resultados);
  } catch (error) {
    console.error("ERROR ANALISIS:", error);
    return c.json({ error: String(error) }, 500);
  }
});

analisis.get("/:provincia", async (c) => {
  try {
    const provincia = c.req.param("provincia");
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
    return c.json({ error: String(error) }, 500);
  }
});

import { analizarProvincia } from "../services/analisisAgricola";

export default analisis;