# 🫒 olivaξ

Olivaξ es una web enfocada para ayudar a los agricultores españoles para proteger el olivar español
frente al cambio climático, usando mis conocimientos de estudiante de maestria en biologia computacional, articulos cientificos y LLMs opensource.

## Demo
[URL aquí]

## Qué hace
Párrafo explicando el problema y la solución.

## Páginas
- /            Mapa de riesgo climático en tiempo real
- /consejero   Chat experto en olivicultura con IA
- /variedades  Comparador científico de variedades
- /alertas     Registro de alertas de calor por email

## Stack
Astro 6 · Bun · Hono · N8N · SQLite
CubePath · Dokploy · Open-Meteo · Groq · Resend
Se uso ubuntu 22.02 por que es más estable, que versiones recientes.

## Cómo conseguir las API keys
| Key | Dónde | Uso |
|-----|-------|-----|
| GROQ_KEY | console.groq.com | Chat principal (gratis) |
| GEMINI_KEY | aistudio.google.com | Fallback LLM (gratis) |
| OPENROUTER_KEY | openrouter.ai | Fallback final (gratis) |
| RESEND_API_KEY | resend.com | Emails (3000/mes gratis) |

## Cómo usar CubePath en este proyecto
Explicación de 3 párrafos de cómo se usa
CubePath y Dokploy para el deploy automático.

## Variables de entorno
Tabla con las 6 variables y sus valores de ejemplo.
```
