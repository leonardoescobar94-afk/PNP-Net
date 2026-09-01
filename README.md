# Polineuropathy-Assistant Electrodiagnóstico PMR

**Herramienta Profesional para Especialistas en Medicina Física y Rehabilitación.**

Score electrodiagnóstico percentilar adaptado para apoyo al diagnóstico y cuantificación de la polineuropatía diabética. Emplea el marco conceptual compuesto 0–1–2 descrito por Davies et al. y límites normativos empíricos P3/P97 publicados por Buschbacher/AANEM; no reproduce el score original.

## Características Principales

*   **Análisis automático:** Score #2 compuesto basado en cuatro nervios y Score #4 provisional por amplitudes, ambos puntuados mediante límites absolutos P3/P97.
*   **Estandarización descriptiva:** La media, la desviación estándar y el percentil CDF descriptivo se ajustan de forma continua por edad y/o talla mediante las fórmulas LERP existentes. Los puntos no se interpolan: la puntuación determinista utiliza exclusivamente los estratos empíricos publicados P3/P97 que correspondan.
*   **Asistente con IA:** Integración con Google Gemini para generar resúmenes clínicos y sugerencias de seguimiento basadas en los hallazgos.
*   **Informes clínicos:** Copia prioritaria de un resumen determinista al portapapeles y exportación PDF secundaria.
*   **Trazabilidad científica:** Los percentiles de CDF normal se conservan únicamente como estandarización descriptiva; las clasificaciones adaptadas requieren validación clínica independiente.

## Requisitos Previos

*   Node.js (versión 18 o superior)
*   NPM

## Instalación y Ejecución Local

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` o `.env.local` en la raíz del proyecto y añade tu clave de API de Google Gemini. La aplicación soporta ambas nomenclaturas:
    ```env
    API_KEY=tu_clave_de_api_aqui
    # O alternativamente:
    GEMINI_API_KEY=tu_clave_de_api_aqui
    ```

3.  **Ejecutar la aplicación:**
    ```bash
    npm run dev
    ```

## Despliegue

El proyecto está configurado (ver `netlify.toml` y `vite.config.ts`) para desplegarse fácilmente en plataformas como Netlify. Asegúrate de configurar la variable de entorno `API_KEY` en el panel de configuración de tu proveedor de hosting.

## Autoría y Desarrollo

*   **Concepto y Desarrollo:** Dr. Leonardo Jurado - Residente de Medicina Física y Rehabilitación, Universidad Nacional de Colombia.
*   **Plataforma:** Desarrollada con asistencia de Inteligencia Artificial bajo la supervisión de Leo J Escobar.
*   **Propósito:** Académico y de apoyo clínico. Sin ánimo de lucro.

---
© 2024 Polineuropathy-Assistant Electrodiagnóstico PMR Specialist Platform
