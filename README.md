# Pedidos WOE · v8.0.0 — Complemento de uso promedio diario

Esta versión mantiene todas las funciones de la v7 y agrega en la parte superior de **Pedido WOE** el botón **↥ Cargar usos alternos**. Se puede utilizar antes o después de cargar los motores o el inventario. El Excel solo se lee en el navegador; no debes publicarlo en GitHub.

## Cómo utilizar `Libro1.xlsx`

1. Carga primero el inventario (PDF o Excel) como de costumbre, o deja ese paso pendiente y carga el suplemento directamente.
2. Haz clic en **↥ Cargar usos alternos** (encima del cuadro de indicadores, junto a los botones de exportación).
3. Elige `Libro1.xlsx`. Debe tener las columnas **SAP**, **Producto** y **Promedio**. La columna **DIA** puede estar presente, pero **no se usa** para identificar el producto ni como fecha; el vínculo es exclusivamente por **SAP**.
4. Sigue cargando los Motores 01, 02 y 03 según corresponda. Se recalculan automáticamente las propuestas de pedido.
5. En **Tipo de uso**, los artículos que están utilizando el complemento aparecen como **Excel alterno**. Los demás conservan **Motor 02**, **Manual** o **Por capturar**.

**Orden de prioridad por artículo:**

1. **Consumo diario manual** guardado en Editar, incluso si es cero.
2. **Motor 02** si su promedio estimado para el artículo es **mayor que cero**.
3. **Excel alterno**, por código SAP, cuando el Motor 02 no esté asociado, esté vacío, tenga un promedio de cero o no proporcione un consumo utilizable.
4. Si no hay consumo utilizable en ninguna fuente, queda pendiente de captura o validación.

El campo **Promedio** se interpreta como **piezas por día**. Si eliges trabajar un artículo en KG o L, se exige una conversión válida antes de tratar el pedido como definitivo. La variación global y el patrón semanal del Motor 01 se aplican **una sola vez** después de seleccionar el consumo base.

### Validaciones del archivo enviado

- Hoja: `Hoja3` · Encabezados: `DIA`, `SAP`, `Producto`, `Promedio`.
- **156 códigos SAP únicos con promedio mayor que cero**, de los que **143** coinciden con los 253 SAP del inventario consolidado de muestra.
- Los valores en blanco y cero del Excel alterno no sustituyen el consumo existente. Las filas sin SAP válido se omiten.
- Se encontraron tres SAP repetidos con el **mismo** promedio; se consolidan en una sola entrada por código, **sin sumarlos**.
- Si un archivo futuro contiene dos promedios diferentes para el mismo SAP, se excluye ese código del complemento para evitar elegir un valor arbitrariamente. Se indica en el resumen de carga.

El botón **Borrar solo uso alterno Excel**, al final de la página, elimina únicamente este complemento y recalcula los pedidos. **Borrar todos los usos por día** también elimina el complemento. **Borrar motores** lo conserva, porque es una fuente independiente de los motores. Los respaldos privados incluyen el suplemento si estaba cargado.

## Instalación GitHub Pages

Sube el nuevo `index.html` a la raíz de tu repositorio, reemplazando el anterior. No publiques tus archivos Excel, datos de inventario ni respaldos privados. Recarga el sitio publicado con `Ctrl + F5` y realiza una prueba del pedido antes de utilizarlo para compras reales.

## Qué no cambia

Se mantienen proveedor filtrado por SAP, stock inicial, ingresos recibidos, inventario en tránsito, calendario de entregas, factor de transacciones por día, días de seguridad, variación global, revisiones, exportación, borrados selectivos y el resto de reglas de la versión 7.
