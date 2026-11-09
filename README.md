# Pedidos WOE · Versión 4.0.0

Aplicación web estática y local para GitHub Pages, enfocada en **Pedido WOE**, **Máximos/Mínimos** y **Tendencia de Uso**, conservando el flujo de carga de los tres motores Excel y después el inventario inicial PDF o Excel.

## Instalación / actualización

1. Extrae el ZIP y copia `index.html` a la raíz del repositorio de GitHub Pages, reemplazando la versión anterior.
2. El sitio no necesita archivos `vendor/`, servidor, cuentas ni conexiones externas para procesar los Excel. `JSZip` está incluido dentro del HTML (ver licencia adjunta).
3. Si la versión anterior sigue visible, espera a que GitHub Pages publique la actualización y recarga con **Ctrl+F5**.
4. Los archivos XLSM/XLSX, PDF y respaldos son **privados**: no los subas al repositorio si es público. Solo se seleccionan desde la aplicación en tu navegador.
5. Los datos guardados por la versión anterior se conservan en el almacenamiento local del mismo navegador y origen cuando sea posible. **Borrar todo** elimina motores, inventario, configuraciones, capturas, revisiones y tránsito.

## Cambios incluidos

- Se retiró la demostración de pastel de chocolate del panel principal.
- `v4.0.0` aparece discretamente en el pie de página.
- La unidad de trabajo predeterminada es **PZA** para cada artículo. En **Editar** se puede elegir PZA, UND, KG o L. Al cambiar de unidad se limpia el campo de stock en el editor para no reinterpretar una cifra en otra unidad; confirma stock, equivalencia con consumo y múltiplo de compra.
- Se agregó **3. Artículos en tránsito (opcional)**, inicialmente cerrado, con carga de PDF de proveedor y captura manual de artículo/SAP, fecha y piezas.
- El lector de PDF de tránsito admite el formato textual enviado (con `NºMaterial Cliente`, `Cantidad`, `Unidad` y `Fecha de entrega`). Busca por **SAP cliente**, no por el número de material del proveedor. Calcula `CAJ` mediante la presentación explícita `CJ12...`, `CJ24...`, etc. Una botella `BTE` cuenta como una pieza. Si falta una equivalencia, se deja pendiente.
- Se consideran exclusivamente tránsitos con **fecha posterior a la del inventario contado y hasta la fecha de recepción seleccionada, inclusive**. Si el producto ya estaba contabilizado en el inventario, elimina el tránsito para evitar duplicación. Documentos repetidos con el mismo número de pedido sustituyen al anterior.
- La tabla de Pedido WOE tiene encabezado fijo durante el desplazamiento **dentro de la tabla**, ordenamiento haciendo clic en sus encabezados y una nueva columna **En tránsito**.
- Cuando el consumo y el stock permiten calcular una necesidad, **Pedir** se actualiza tras guardar los cambios, incluso si la asociación al Motor 02 todavía es provisional. En esos casos se indica **Por validar** y no se exporta al listado definitivo de pedidos.
- Para pedidos con propuesta cero se habilita **○ Revisar**, que pasa a **✓ Revisado** en verde. Esto confirma la revisión visual, **no sustituye la validación de consumo, SAP o conversión de unidades**. Si cambian stock, consumo, fecha o tránsito, la revisión caduca y debe repetirse.
- La exportación Excel incluye una quinta hoja **En Transito** con detalle de documentos y conversiones, además de las cuatro hojas anteriores.

## Validaciones

- Los archivos `.xlsm` se procesan como libro de datos; no se ejecutan macros.
- PDFs escaneados o con un diseño de proveedor diferente pueden requerir captura manual de tránsito.
- Si un SAP en tránsito no existe en el inventario cargado, se indica en la tabla de tránsito y no se incluye en la propuesta de pedido hasta disponer de un artículo conciliado.
- Para productos cuyo inventario se expresa en kg/L o mezcla piezas con kg/L, no se inventan conversiones a piezas. Es necesario validar cantidades y equivalencias en **Editar** antes del pedido definitivo.
- Si un producto tiene consumo desconocido, no se genera una cantidad de pedido numérica hasta capturar/conciliar su uso diario.

## Interpretación del cálculo

Stock proyectado al recibir = stock inicial − (consumo diario × días desde conteo) + tránsito aplicable + tránsito manual.

Pedido sugerido = máximo entre cero y (consumo diario × días hasta la siguiente recepción + días de seguridad − stock proyectado), redondeado al múltiplo de compra.

Las propuestas con validaciones pendientes son **indicativas** y solo pasan a `Pedido WOE` exportado como pedido definitivo cuando la validación está completa. La herramienta no envía pedidos al sistema oficial.
