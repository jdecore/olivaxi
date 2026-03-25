import { Hono } from "hono";
import { getClimaData, type DatosClima } from "../routes/clima";
import { analizarProvincia } from "../services/analisisAgricola";

const analisis = new Hono();

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

export default analisis;