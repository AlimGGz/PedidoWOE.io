# Pedidos WOE · Versión 3 — Un solo archivo

## Corrección de carga de Excel

La versión 2 requería instalar en el repositorio `vendor/jszip.min.js` junto a `index.html`. Cuando faltaba ese archivo, la app mostraba: “No se encuentra la biblioteca local de archivos Excel”.

Esta versión **incluye toda la aplicación, los estilos y el lector de Excel dentro del único archivo `index.html`**. No necesita carpetas `vendor`, `core.js`, `app.js` ni servicios externos. Es compatible con los motores XLSM/XLSX originales sin ejecutar macros. El archivo funciona localmente o desde GitHub Pages.

## Cómo actualizar GitHub Pages

1. En tu repositorio actual, reemplaza el `index.html` antiguo por el de esta versión. No hace falta subir más archivos para ejecutar la aplicación.
2. Si GitHub Pages ya está habilitado, conserva la configuración de rama y carpeta que ya utilizas. Espera a que GitHub termine de publicar el cambio.
3. Abre tu página y haz **Ctrl+F5** (en Windows) para forzar la recarga. En móvil, cierra y vuelve a abrir la pestaña.
4. Carga Motor 01, Motor 02 y Motor 03 en ese orden; después carga tu inventario inicial PDF o Excel.
5. Los datos operativos (motores, inventarios, respaldos) NO deben subirse a un repositorio público. Solo se cargan dentro del navegador.

## Parámetro “Importancia del consumo reciente”

La estimación automática diaria del Motor 02 se calcula así:

`Uso diario estimado = peso × promedio de últimos 7 días + (1 − peso) × promedio de últimos 28 días`.

Con el valor por defecto **70%**, si los últimos 7 días se consumieron 6 piezas/día y el promedio de los últimos 28 días es 4 piezas/día, el uso previsto será `0.70×6 + 0.30×4 = 5.4 piezas/día`. Los 28 días incluyen los 7 últimos: son promedios superpuestos (no dos períodos disjuntos).

- Un valor más alto prioriza cambios recientes (campañas, aumento repentino de ventas).
- Un valor más bajo hace el pronóstico menos sensible a fluctuaciones recientes.
- Los artículos con consumo manual NO se ven afectados por este parámetro.
- Se mantiene predeterminado en 70%, pero se puede ajustar entre 0 y 100%.

## Alcance

El programa conserva Pedido WOE, Máximos y Mínimos, Tendencia de Uso, conciliación de catálogo, calendario, carga de PDF o Excel, exportación XLSX y Borrar todo.

Las unidades y correspondencias SAP-ID de uso requieren confirmación antes de generar pedidos definitivos. El sitio no envía ni sincroniza pedidos con WOE.

## Código de terceros

Incluye JSZip bajo licencia MIT/GPLv3; se adjunta su aviso de licencia en `JSZip-LICENSE.md`. No se emplean bibliotecas en línea.
