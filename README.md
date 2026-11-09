# Pedidos WOE · GitHub Pages

Aplicación web estática para calcular propuestas de pedido usando el **inventario contado por SAP**, el **consumo diario del Motor 02** y el contexto de operaciones y ventas de los Motores 01 y 03. Dispone de las vistas **Pedido WOE**, **Máximos y mínimos**, **Tendencia de uso** y **Conciliación de códigos**.

## 1. Instalación en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `pedidos-woe`.
2. Sube **solamente los archivos que están en esta carpeta**, conservando la estructura:

   ```text
   index.html
   styles.css
   core.js
   app.js
   .gitignore
   .nojekyll
   vendor/
       jszip.min.js
       JSZip-LICENSE.md
   README.md
   ```

3. En el repositorio, abre **Settings > Pages > Build and deployment**. Selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
4. Cuando GitHub Pages publique el sitio, ábrelo desde la dirección indicada en Settings > Pages. Si abres `index.html` en tu equipo, la aplicación también puede funcionar localmente en un navegador moderno.

**Muy importante:** NO subas a GitHub los motores Excel reales, el PDF de inventario, el JSON privado de inicio ni los respaldos generados. Si GitHub Pages es público, cualquier persona podría descargarlos. **El ZIP del sitio NO incluye datos privados**.

## 2. Primer arranque y datos iniciales

Se entrega **por separado** el archivo `Inicio_Pedidos_WOE_2026-11-09.json`, derivado de los cuatro archivos suministrados. Dentro de la página, haz clic en **Cargar archivo inicial**, selecciona ese JSON y verifica la información de la tienda.

El archivo privado trae, entre otras cosas:

- Los **253 códigos SAP** del PDF de inventario entregado. La fecha real de generación que figura dentro del reporte es **8 de noviembre de 2026 a las 21:11:25**, aunque el nombre del PDF contiene 9 de noviembre.
- Motor 01: 21 registros de operaciones y venta diaria, tienda **38118**, desde el 19 de octubre hasta el 8 de noviembre de 2026.
- Motor 02: **2,462 registros** de consumo de la tienda **38118** desde el 20 de octubre hasta el 8 de noviembre de 2026; 212 ID de uso distintos. Se descartaron **3,103 registros** de la tienda **38604** que se encontraban mezclados en la hoja `uso_ac`.
- Motor 02, catálogo `stock_base`: 915 claves de stock, que **no son las mismas claves** que la hoja `uso_ac` ni los códigos SAP.
- Motor 03: catálogo de productos y detalle de ventas agregadas por producto y día para análisis contextual. El detalle puede incluir el 9 de noviembre; sus ventas **no se suman al consumo del Motor 02**.

La aplicación guarda la sesión y los cambios en el almacenamiento local del navegador cuando está disponible. Usa **Guardar respaldo privado** con frecuencia: esos archivos incluyen información operativa de la tienda y tampoco deben publicarse.

## 3. Recargar motores semanales

Haz clic en cada tarjeta de Motor 01, Motor 02 y Motor 03. Puedes seleccionar los archivos originales `.xlsm` o `.xlsx` sin convertirlos. Las macros **no se ejecutan**: el navegador solo lee los datos de las hojas necesarias usando la biblioteca JSZip incluida localmente.

| Motor | Hojas utilizadas | Función |
|---|---|---|
| 01 | `venta_dia_base` (o `venta_dia_ac`) | Transacciones y venta diaria, **solo como contexto** |
| 02 | `uso_ac` (o `uso_base`), `stock_base` | **Fuente principal del uso ideal diario** y catálogo de stock |
| 03 | `detalleventa_base`, `producto_base` | Movimiento y tendencia de productos vendidos, **sin convertirlos en consumo de insumos** |

Si vuelves a cargar el Motor 02, la aplicación **filtra los registros por el ID de tienda activo**. Los registros de otras sucursales se omiten y se indica su cantidad. No cruza claves solo por el número del identificador.

### Actualizar inventario

El primer inventario del PDF ya está convertido en el archivo privado de inicio. Para **inventarios posteriores**, utiliza el botón **Inventario inicial**, cargando un archivo `.xlsx`, `.xlsm` o `.csv` con columnas `SAP`, `Producto Descripción`, `PIEZAS`, `CANT. UNID.` y `UNIDAD` (con variantes usuales de estos nombres). También acepta un respaldo `.json` previamente exportado por la propia aplicación.

**En esta versión no se admite subir otro PDF directamente desde el navegador**; para actualizar el inventario desde un PDF nuevo, expórtalo primero al formato de Excel/CSV que produce tu herramienta de conteo. No es necesario convertir el PDF original ya incluido.

## 4. Conciliar códigos con seguridad

Los distintos sistemas usan **tres identificadores distintos**: código SAP del inventario, `IDArticulo` de `uso_ac` y `IDArticulo` de `stock_base`.

La conciliación propone coincidencias por similitud de nombre y mantiene separadas las unidades. La carga inicial contiene **46 enlaces sugeridos de alta similitud**, todavía sujetos a validación. En la pestaña **Conciliación**, puedes usar **Confirmar coincidencias seguras** o revisar artículo por artículo. El sistema nunca presenta un enlace pendiente como un pedido definitivo.

Para artículos no encontrados en el consumo diario, captura manualmente el **uso por día en la unidad de inventario**. En la tabla aparece una celda discreta **Capturar**, con borde punteado; también puedes entrar a **Editar** para asignar un ID de uso o escribir valores manuales. Estos artículos quedan marcados **Manual**, sin usar un color llamativo.

## 5. Stock en piezas, kg y litros

El PDF tiene columnas **PIEZAS**, **CANT. UNID.** y **UNIDAD**. En varios productos, especialmente café o ingredientes que se pesan, aparecen valores simultáneos de piezas y kilogramos. **No se suman automáticamente**, porque sin una conversión validada sumar 2 bolsas + 3 kg sería incorrecto. Estos casos exigen confirmar el stock convertido a una unidad común.

También se verifica la unidad de consumo del Motor 02:

- Piezas a piezas: 1 a 1; blister por 3 piezas, cuando se indica explícitamente.
- Litros: cantidades explícitas en litros o mililitros.
- Kilogramos: cantidades explícitas en kg, g, libras u onzas de masa.
- Si la unidad del motor no permite una conversión inequívoca, la sugerencia queda pendiente y puedes introducir el factor de conversión o el consumo diario manual.

En productos cuyo inventario se expresa en **kg o litros**, se debe marcar **Verifiqué el stock convertido** antes de considerarlos listos. Si el cálculo indica que es necesario pedir, también debe capturarse un **múltiplo de compra** apropiado en kg/L, evitando pedidos fraccionarios imposibles de suministrar.

Las equivalencias automáticas son **indicativas**: verifica las especificaciones del insumo, el empaque y el múltiplo de compra antes de enviar cualquier pedido.

## 6. Fórmulas del cálculo

Se usan parámetros editables (valores iniciales: **entrega 2 días, ciclo 4 días, seguridad 1 día, peso de últimos 7 días 70%**). El modelo es una propuesta transparente de **máximos y mínimos**, no una reproducción certificada de la lógica del sistema #GAS.

- `Uso reciente = total de consumo convertido en últimos 7 días / 7`.
- `Uso histórico = total convertido en últimos 28 días / 28`.
- `Uso proyectado/día = 0.70 × uso reciente + 0.30 × uso histórico`.
- `Mínimo = uso proyectado/día × (días de entrega + días de seguridad)`.
- `Máximo = uso proyectado/día × (días de entrega + días de ciclo + días de seguridad)`.
- Si `stock validado + recepciones en tránsito <= mínimo`, proponer `máximo − (stock + recepciones)` redondeado al **múltiplo configurado**. Si no, proponer cero.

Cuando el artículo tiene historial corto, un vínculo no confirmado, una conversión sin validar o stock mixto, **no genera pedido definitivo**. El uso manual se conserva separado de los valores obtenidos del motor.

**Observación:** los datos provienen de hojas con consumo ideal, no de una receta certificada ni de una garantía de disponibilidad. Revisa variaciones, promociones, campañas estacionales, pedidos pendientes y calendario de recepción antes de colocar una orden real.

## 7. Exportación y respaldos

- **Exportar Excel**: crea un `.xlsx` con cuatro hojas: `Pedido WOE` (solo cantidades validadas y mayores que cero), `Maximos y Minimos` (todos los 253 artículos), `Tendencia de Uso` (historial diario conciliado) y `Pendientes` (puntos por revisar).
- **Imprimir / PDF**: utiliza la función nativa del navegador para imprimir o guardar como PDF. Se imprime la tabla de pedido de la vista de operación.
- **Guardar respaldo privado**: descarga un archivo JSON que conserva inventario, motores procesados, ajustes por artículo y parámetros de pedido.

## 8. Seguridad y limitaciones

- No es una integración con WOE ni con servidores internos y **no envía órdenes automáticamente**. El Excel es un insumo para hacer y validar pedidos en el sistema oficial.
- No transmite información por red ni requiere contraseñas. La biblioteca JSZip se incluye en `vendor/` bajo licencia MIT.
- Los datos quedan en el almacenamiento local de cada navegador, no son compartidos automáticamente entre equipos. En un equipo compartido, elimina los datos del sitio desde la configuración del navegador al terminar.
- El documento HTML original de #GAS estaba guardado sin los archivos JavaScript externos necesarios para certificar su fórmula de cálculo. Este proyecto implementa explícitamente su propia metodología de pronóstico y niveles de stock.
- Puedes usar el repositorio GitHub **público para el código**, pero los archivos iniciales y de respaldo deben mantenerse **privados**.

---

Versión inicial: 9 de noviembre de 2026. Probado con los tres `.xlsm` facilitados, con el PDF del inventario y con la exportación del Excel de salida.
