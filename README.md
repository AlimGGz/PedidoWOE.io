# Pedidos WOE · versión 5.0.0

Aplicación estática para **GitHub Pages**, enfocada exclusivamente en **Pedido WOE, máximos y mínimos, tendencia de uso y conciliación de artículos**. Toda la lectura de Excel y PDF se realiza en el navegador del usuario. No envía pedidos al sistema oficial WOE.

## Publicación

1. Descomprime el ZIP y reemplaza el `index.html` del repositorio de GitHub Pages por este.
2. Mantén `JSZip-LICENSE.md` y este README junto al sitio. El lector Excel se incorpora al `index.html`; no hay carpeta `vendor` obligatoria ni dependencias de red.
3. Espera la publicación de GitHub Pages y recarga con **Ctrl+F5**.
4. No subas al repositorio público motores, inventarios, PDFs de proveedores ni archivos de respaldo: solo son datos privados para cargar en el navegador.
5. Los datos previos guardados por v4 normalmente persisten en el mismo dominio y navegador. La opción **Borrar todo** reinicia la aplicación.

## Orden recomendado

1. Cargar `Motor_01_Auditoria_Transacciones.xlsm`, `Motor_02_Uso_Stock.xlsm` y `Motor_03_Detalle_Productos.xlsm`, en cualquier orden compatible (el Motor 01 debe cargarse antes del 03 para identificar tienda).
2. Cargar **inventario inicial** en PDF de la aplicación de conteo o Excel.
3. Confirmar **fecha del conteo**, **días de recepción** y **fecha de pedido a recibir**. La fecha actual se toma del dispositivo; el cálculo es por días calendario.
4. Ajustar **un día de seguridad como mínimo** y, si procede, **variación global de demanda** (−100% a +300%; 0% por defecto).
5. Cargar opcionalmente órdenes en tránsito en PDF o capturar entregas previstas por artículo en piezas.
6. Elegir el **proveedor**, revisar stock, enlaces al motor y presentación, marcar **Revisado** en cada artículo y exportar el pedido del proveedor elegido.

**Importante:** el calendario de entregas es un ajuste **compartido** entre proveedores, no se infiere automáticamente del proveedor. Ajusta los días y la fecha de recepción cuando cambies de empresa.

## Reglas de proveedor (asignación exclusiva por SAP)

- **Comercializadora de Lacteos y Derivados SA de CV:** `152630`, `150178`, `150180`, `150181`, `150186`, `150187`.
- **Cafe Sirena SA de CV:** `149299`, `149300`, `149303`, `149305`, `149398`, `149410`, `149416`, `149881`.
- **Distribuidora e Importadora Alsea SA de CV:** todos los códigos SAP restantes.

La lista de la **Propuesta de pedido**, máximos y mínimos, tendencia, conciliación y la **exportación** se limitan al proveedor seleccionado. El modo «Todos los proveedores» sirve para consultar el conjunto.

## Cómo calcula el pedido

La unidad inicial es **PZA**. Si el usuario cambia un artículo a KG/L/UND, debe confirmar stock, conversión y múltiplo de compra.

- Consumo diario base: ponderación configurable entre promedio del Motor 02 de los últimos siete días y promedio de 28 días, o captura manual si no hay dato fiable.
- Consumo ajustado = consumo diario base × (1 + variación global de demanda / 100).
- Stock previsto a recepción = stock del conteo − consumo ajustado × días entre conteo y recepción + tránsito con entrega posterior al conteo y hasta recepción + tránsito manual en el editor.
- Objetivo final = consumo ajustado × (días entre recepción seleccionada y siguiente recepción + **1 o más días de seguridad**).
- Los artículos en tránsito que llegarán **después de la recepción seleccionada y antes de la siguiente** disminuyen la necesidad total **solo a partir de su fecha de llegada**. La app comprueba que no se agote stock antes de cada entrega posterior.
- Pedido sugerido = cantidad mínima que satisface el objetivo y las restricciones de fechas, redondeada **hacia arriba** al múltiplo de compra.
- Mínimo = consumo ajustado × días de seguridad. Máximo = consumo ajustado × (días hasta siguiente recepción + seguridad). Están expresados como niveles a la recepción, **no** al día del conteo.

**Suposiciones:** consumo uniformemente distribuido por día, entregas al principio del día, movimientos de inventario conocidos solo a través del motor de consumo y del tránsito registrado. La app no conoce horas exactas de recepción, ventas reales futuras, transferencias o mermas extraordinarias que no estén en las fuentes. Si una fecha de entrega coincide con el día del inventario contado, se excluye para evitar doble conteo; verifica que ya estuviera incluido o actualiza el registro.

## PDF de tránsito

Se reconoce el PDF estructurado aportado, con `NºMaterial`, `Denominación`, `Cantidad`, `Unidad`, `NºMaterial Cliente` (SAP), `Fecha de entrega`. **El SAP para el inventario se obtiene de NºMaterial Cliente**. Para cajas, `CJ12PZAS` se transforma en 12 PZA por caja; `BTE`/`BOT` equivale a 1 pieza. Cuando no hay presentación identificable, se solicita validación. Un mismo número de pedido reemplaza una carga anterior para evitar duplicados. Los archivos PDF escaneados o de estructura distinta pueden no ser compatibles; usa captura manual en ese caso.

Si el `NºMaterial` del proveedor aparece también de forma única en el catálogo de consumo del Motor 02, se propone una asociación documentada con el SAP; sigue requiriendo validación del vínculo antes de considerarse listo para un pedido definitivo.

## Revisión y exportación

- El botón `○ Revisar` está **siempre visible** en la columna `Revisión`, tanto si la propuesta es cero como si es positiva. Cambia a `✓ Revisado` en verde.
- La revisión es visual y **no** suple las validaciones técnicas ni implica que el pedido haya sido enviado.
- Si cambian fecha, stock, tránsito, demanda, consumo, múltiplo o unidad, la revisión de ese artículo caduca automáticamente.
- Se muestra propuesta de pedido **provisional** cuando hay datos calculables pero quedan validaciones técnicas. Solo los artículos `Listos` con pedido mayor a cero se incluyen en la hoja **Pedido WOE** del Excel. Los demás aparecen en **Pendientes** y en **Máximos y mínimos**.
- El Excel contiene 5 hojas: `Pedido WOE`, `Maximos y Minimos`, `Tendencia de Uso`, `Pendientes`, `En Transito`.

## Pruebas de verificación realizadas

- Carga real de los tres motores XLSM y del PDF de inventario con **253 artículos** de la tienda de prueba.
- Lectura del PDF de tránsito **4506782833.pdf**, con cinco renglones y entrega del 09/11/2026.
- Filtrado de 6 códigos SAP de Lácteos, 8 de Cafe Sirena y 239 del resto en la lista de prueba.
- Conteo de 12 piezas y uso de 4.8 PZA/día, entrega martes 10/11/2026 y sábado 14/11/2026: pedido **17 piezas** con un día de seguridad. Con +25% global, pedido de **24 piezas**.
- Tránsito posterior de 100 piezas el viernes 13/11/2026: el cálculo mantiene **8 piezas de pedido** para impedir faltantes antes de esa entrega, en el caso base.
- Encabezados ordenables, SAP/artículo fijos horizontalmente, revisión disponible con cantidades positivas, actualización tras editar y reinicio de revisión tras cambios.
