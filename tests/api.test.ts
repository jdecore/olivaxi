import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { fetch } from "bun";

const API_URL = process.env.PUBLIC_API_URL || "http://localhost:3000";

describe("API Endpoints", () => {
  test("GET /api/clima returns valid data", async () => {
    const res = await fetch(`${API_URL}/api/clima`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const primera = data[0];
    expect(primera).toHaveProperty("provincia");
    expect(primera).toHaveProperty("lat");
    expect(primera).toHaveProperty("lon");
    expect(primera).toHaveProperty("temperatura");
    expect(primera).toHaveProperty("humedad");
    expect(primera).toHaveProperty("lluvia");
    expect(primera).toHaveProperty("riesgo");
    expect(primera).toHaveProperty("source");

    expect(typeof primera.provincia).toBe("string");
    expect(typeof primera.lat).toBe("number");
    expect(typeof primera.lon).toBe("number");
    expect(typeof primera.temperatura).toBe("number");
    expect(["alto", "medio", "bajo"]).toContain(primera.riesgo);
  });

  test("POST /api/alertas returns ok", async () => {
    const res = await fetch(`${API_URL}/api/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Test User",
        email: "test@example.com",
        provincia: "Jaén",
        tipo: "calor",
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("ok");
    expect(data.ok).toBe(true);
  });

  test("POST /api/alertas validates required fields", async () => {
    const res = await fetch(`${API_URL}/api/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Test" }),
    });

    expect(res.status).toBe(400);
  });

  test("GET /api/analisis/:provincia returns analysis", async () => {
    const res = await fetch(`${API_URL}/api/analisis/Ja%C3%A9n`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("provincia");
    expect(data).toHaveProperty("alertas");
    expect(data).toHaveProperty("recomendaciones");
    expect(data).toHaveProperty("cultivo");
    expect(Array.isArray(data.alertas)).toBe(true);
    expect(Array.isArray(data.recomendaciones)).toBe(true);
  });
});
