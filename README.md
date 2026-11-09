# Pedidos WOE · GitHub Pages — versión 2

Aplicación web estática para preparar un **Pedido WOE**, consultar **Máximos y Mínimos**, estudiar **Tendencia de Uso** y conciliar códigos de inventario. Se ha probado con los tres motores `.xlsm` del 9 de noviembre de 2026 y con el PDF `Inventario_Contado_2026-11-09.pdf` (253 SAP).

## Publicación en GitHub Pages

Sube el contenido de esta carpeta a la raíz de un repositorio de GitHub y configura **Settings → Pages → Deploy from a branch → main → / (root)**.

Archivos del sitio:

```
index.html
app.js
core.js
matcher.js
pdf-inventory.js
styles.css
.nojekyll
.gitignore
vendor/jszip.min.js
vendor/JSZip-LICENSE.md
README.md
```

No incluyas motores originales, inventarios, respaldos JSON, exportaciones ni ventas de una tienda en el repositorio. El código web puede estar publicado sin publicar los datos operativos.

## Nuevo flujo: sin pedir JSON

1. **Motor 01** (`.xlsm` o `.xlsx`, auditoría de transacciones). Se detecta la tienda y se verifica que el archivo contenga datos de una sola tienda.
2. **Motor 02** (`.xlsm` o `.xlsx`, uso y stock). Se usa el identificador de tienda del Motor 01 para filtrar el uso ideal y descartar datos de otras tiendas. Este motor alimenta el consumo diario.
3. **Motor 03** (`.xlsm` o `.xlsx`, detalle de productos). Se extraen movimientos de venta solo como contexto, no como consumo adicional del stock.
4. **Inventario / Stock inicial** (`.pdf`, `.xlsx`, `.xlsm` o `.csv`). Se habilita únicamente cuando los tres motores están cargados. El inventario define el catálogo SAP a pedir. Si se carga un nuevo inventario, sustituye la lista anterior para no arrastrar códigos obsoletos.
5. **Fecha del conteo**. Revisa la fecha detectada en el PDF. Si el Excel no indica una fecha de conteo legible, se usa la fecha local actual como propuesta, que debes confirmar o modificar.
6. **Calendario de entrega**. Marca los días habituales de recepción, elige el pedido del desplegable de fechas próximas y, si aplica, configura días de seguridad.
7. **Conciliación**. Revisa/valida la coincidencia entre el código SAP y el ID de uso del Motor 02. Artículos sin uso, o cuyo enlace no es seguro, admiten consumo diario manual y quedan diferenciados discretamente.
8. **Pedido**. Consulta stock inicial, stock estimado al recibir, uso diario, cantidad a solicitar y pendientes. Exporta Excel o imprime en PDF.

### Sobre los PDF

El lector PDF incorporado funciona **sin conexión y sin subir el PDF a un servidor** para reportes estructurados de inventario que contienen texto seleccionable y la tabla de campos **Familia, SAP, Producto Descripción, Piezas, Cant. Unid., Unidad**, como el PDF de inventario facilitado. Se validan todos los artículos frente al total anunciado en el documento y se rechaza una extracción incompleta. No incorpora reconocimiento óptico de texto: un PDF escaneado o uno con un formato diferente puede requerir Excel. Para Excel, la aplicación identifica la fila de encabezados aunque haya títulos o metadatos al inicio de la hoja.

### Cálculo por fecha seleccionada

- `Días hasta recepción = fecha de recepción − fecha del conteo inicial`.
- `Stock estimado al recibir = stock del conteo − uso diario × días hasta recepción + recepciones en tránsito registradas`.
- `Días a cubrir = fecha siguiente recepción − fecha de recepción actual`.
- `Necesidad = uso diario × (días a cubrir + días extra de seguridad)`.
- `Pedido sugerido = máximo(0, necesidad − stock estimado al recibir)`, **redondeado hacia arriba** al múltiplo de compra configurado.

El inventario pasado sigue siendo la base: si el conteo se hizo el 8 de noviembre y la recepción es el 10, se descuentan **dos días** de consumo. El cálculo no asume recepciones que no estén registradas como existencias en tránsito. Si el stock proyectado es negativo, la aplicación lo señala como riesgo de agotamiento previo a la entrega. Se debe comprobar la precisión de registros, uso, entradas y paquetes antes de colocar un pedido real.

**Máximos y mínimos**: mínimo = consumo para llegar a la recepción + seguridad; máximo = consumo para llegar a la recepción, más hasta la siguiente recepción, más seguridad. Se adaptan a la fecha de entrega elegida. La app no replica ni certifica fórmulas propietarias del sistema original.

### Ejemplo reproducible de pastel de chocolate

Suponiendo **lunes 9/11/2026**, **12 piezas disponibles hoy**, **4.8 piezas vendidas al día**, entregas **martes y sábado**, seguridad **0 días** y compra por pieza:

| Pedido para entrega | Stock al llegar | Consumo hasta siguiente entrega | Pedir |
|---|---:|---:|---:|
| Martes 10/11 | 12 − 4.8 = 7.2 | 4 × 4.8 = 19.2 | **12 piezas** |
| Sábado 14/11 (si se recibió el pedido del martes) | 0 | 3 × 4.8 = 14.4 | **15 piezas** |

El segundo cálculo es un escenario consecutivo: para simularlo en el pedido real, registra correctamente el stock o recepciones que hayan ocurrido desde el conteo anterior. La tabla inicial de la app muestra el mismo ejemplo, sin modificar ningún dato operativo.

### Botón «Borrar todo»

En la parte superior está **Borrar todo**. Pide confirmación antes de eliminar de ese navegador **motores, stock, calendario, consumos manuales, validaciones y ajustes**. Después reaparece el flujo inicial. Antes de borrar puedes guardar un **respaldo privado** opcional; el programa **nunca exige subir JSON** para comenzar.

## Limitaciones y resguardo de datos

- El cálculo es una **propuesta**, no coloca ni sincroniza pedidos con WOE.
- La biblioteca JSZip se utiliza localmente. Las macros del Excel no se ejecutan.
- Los ID SAP, `IDArticulo` de uso y `IDArticulo` de stock no se equiparan por número. Las coincidencias se sugieren por descripción y necesitan confirmación antes de ser elegibles para un pedido.
- Para cantidades mixtas de piezas/kg/L, conversión incierta o múltiplos de compra especiales, se bloquea el pedido hasta completar la validación correspondiente.
- Los datos y cambios se conservan localmente mediante almacenamiento del navegador cuando el entorno lo permite. Usa el botón de respaldo para conservar información entre navegadores o limpiar la sesión, y no publiques el respaldo.
- Para descargar un PDF con el pedido, utiliza **Imprimir / PDF** y selecciona *Guardar como PDF* en el navegador.

Versión 2 · 9 de noviembre de 2026.
