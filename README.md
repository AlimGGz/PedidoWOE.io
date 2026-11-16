# Pedidos WOE · versión 6.0.0

Aplicación estática para GitHub Pages. Todo se procesa en el navegador. **No publiques archivos de inventario, motores, pedidos de proveedor ni respaldos** en el repositorio público.

## Publicación

1. Descomprime el ZIP.
2. Sube únicamente `index.html` y, si quieres, este `README.md` y el archivo de licencia, a la raíz de un repositorio GitHub.
3. Activa **Settings → Pages → Deploy from a branch → main / root**.
4. Cuando termine la publicación, actualiza la página con Ctrl + F5.
5. La aplicación puede recuperar información del navegador correspondiente a versiones anteriores. Antes de borrar datos, haz clic en **Guardar respaldo privado**.

## Orden de trabajo

1. **Inventario / stock inicial.** Carga el reporte PDF de inventario contado, o Excel/CSV con códigos SAP, descripción y cantidades en piezas. Confirma la fecha del conteo. La aplicación conserva todos los SAP del archivo, incluso si no tienen consumo histórico.
2. **Motores Excel.** Carga Motor 01 (auditoría de transacciones), Motor 02 (uso/stock) y Motor 03 (detalle de productos). Motor 01 identifica la tienda; luego Motor 02 filtra sus usos a esa tienda.
3. **Calendario.** Marca los días habituales de entrega; elige la fecha de entrega que quieres calcular. La fecha actual está bloqueada inicialmente, y solo se puede cambiar al desmarcar la casilla. Selecciona seguridad de **0 a 5 días**. Modifica el porcentaje global de demanda con el deslizador o el campo numérico.
4. **Transacciones semanales.** El histograma muestra el promedio por día de la semana en los últimos 56 días calendario disponibles en Motor 01, usando solo los días registrados. Si hay dos o más observaciones para cada uno de los siete días, se puede activar su distribución estacional; de lo contrario se usa consumo uniforme. Se trata de **transacciones**, no clientes únicos ni piezas.
5. **En tránsito (opcional).** Carga los pedidos pendientes de proveedor en PDF como el formato `4506782833.pdf`, o registra SAP, fecha prevista y piezas manualmente. El PDF debe tener NºMaterial Cliente (SAP) y cantidades identificables. Pedidos con fecha prevista vencida no se suman al stock sin confirmar recepción.
6. **Ya recibido (opcional).** Registra piezas y **fecha real** para entradas posteriores al conteo y no posteriores a la fecha de pedido. Para mover un renglón de tránsito, usa **Recibido**, confirma la fecha y guarda; se descuenta la misma cantidad del tránsito. También admite PDF/Excel/CSV de recibidos con SAP y piezas; bloquea importaciones que coincidan con artículos todavía en tránsito para evitar duplicidades.
7. **Proveedor y filtros.** Cambia de proveedor; solo aparecen sus SAP. Los filtros de familia y estado permiten seleccionar varias opciones con casillas. Ordena la tabla por sus encabezados. Los encabezados y las columnas SAP y artículo permanecen visibles al desplazarse dentro de la tabla.
8. **Borrados.** Al final están los botones de reinicio independientes: motores; inventario completo; tránsito (incluidos valores manuales en edición); recibidos; todos los usos por día (motor 02 y manuales); o todo. Todos requieren confirmación.

## Proyección y controles

Por defecto se trabaja en **piezas**. Si el inventario original usa L/KG, verifica su conversión a piezas al editar el artículo. No inventes conversiones para envases parciales o productos cuya presentación no sea clara.

- **Motor 02**: uso promedio ponderado = 70% del consumo medio de los últimos 7 días + 30% del consumo medio de los últimos 28 días (configurable).
- **Ajuste global**: uso base × (1 + porcentaje/100). Este ajuste se aplica **una sola vez**.
- **Distribución por día** (opcional): promedio de transacciones de lunes, martes, etc. ÷ media de los siete promedios. Así se redistribuye la demanda entre días más y menos concurridos sin sumar transacciones directamente como unidades de inventario. Los consumos diarios manuales también siguen el patrón, si está activado.
- **Stock proyectado a la entrega**: inventario inicial - consumo proyectado entre conteo y entrega + entradas reales posteriores al conteo + tránsito vigente que llega hasta la entrega + tránsito manual del artículo.
- **Demanda por cubrir**: consumo proyectado entre la entrega y la siguiente entrega + consumo proyectado durante 0–5 días adicionales de seguridad.
- **Propuesta**: demanda por cubrir - stock proyectado, teniendo en cuenta el tránsito futuro **solo desde su fecha**. Se comprueban faltantes intermedios para no suponer que se puede usar un envío antes de recibirlo. El resultado se redondea hacia arriba al múltiplo de compra validado.

### Suposiciones importantes

El modelo asume el conteo al **inicio de su fecha**, uso diario de acuerdo con los factores semanales y entregas al inicio del día. Sin horas de operación/entrega no se puede proyectar por fracciones de día. Una recepción pasada solo puede confirmar llegada si se registra como **Recibido**. Los productos sin asociación confiable al motor, conversión confirmada o stock validado se muestran como **provisionales o por validar**. El botón **Revisado** indica confirmación visual y **no** sustituye validar códigos, presentaciones, unidades ni condiciones reales de compra.

### Proveedores

- **Comercializadora de Lacteos y Derivados SA de CV**: 152630, 150178, 150180, 150181, 150186, 150187.
- **Cafe Sirena SA de CV**: 149299, 149300, 149303, 149305, 149398, 149410, 149416, 149881.
- **Distribuidora e Importadora Alsea SA de CV**: todos los demás SAP cargados.

### Formato de Excel de inventario / recibidos

La importación reconoce encabezados como `SAP`, `Código SAP`, `Producto`, `Descripción`, `Piezas`, `Cantidad piezas`, `Stock inicial` y `Existencia`. El importador de recibidos identifica `SAP` y `Piezas` o `Cantidad`, con un campo adicional de fecha real de recepción en la interfaz. Comprueba siempre los resultados después de cargar un formato Excel nuevo.

## Pruebas de esta versión

Se verificaron en navegador la carga del PDF de 253 artículos, los tres motores XLSM proporcionados, el histograma del Motor 01, el filtrado de los tres proveedores, seguridad 0–5, fecha actual desbloqueable, pedido en tránsito de cinco renglones, traslado de un renglón a recibido, filtros de estados, borrado de tránsito, borrado de inventario y la lectura de un Excel de muestra.

La aplicación es una **herramienta independiente de planeación**. No está conectada a sistemas transaccionales oficiales; el usuario debe validar antes de enviar cada pedido.

## Bibliotecas incluidas

`index.html` incluye JSZip 3.10.1 (licencia MIT) para leer y generar archivos Office sin conexión. Consulta `JSZip-LICENSE.md`.
