/* Lector local para reportes PDF estructurados de inventario contado.
   No hace OCR ni transmite el archivo. Acepta streams sin comprimir y FlateDecode. */
(function(root){
'use strict';
const dec=new TextDecoder('windows-1252');
function decodePdfString(value){
  return value.replace(/\\([0-7]{1,3}|[nrtbf()\\])/g,(_,code)=>{
    if(/^[0-7]/.test(code))return String.fromCharCode(parseInt(code,8));
    const esc={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'};return esc[code]||code;
  });
}
async function inflate(bytes){
  if(typeof DecompressionStream==='undefined')throw Error('Tu navegador no admite la descompresión del PDF. Utiliza Excel.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return dec.decode(await new Response(stream).arrayBuffer());
}
async function extractPdfStreams(bytes){
  const raw=dec.decode(bytes),streams=[];
  // Los reportes de inventario de la aplicación de conteo usan objetos de contenido PDF.
  const re=/(\d+)\s+\d+\s+obj\s*<<([\s\S]*?)>>\s*stream\r?\n/g;
  let m;
  while((m=re.exec(raw))!==null){
    const bodyStart=re.lastIndex, close=raw.indexOf('endstream',bodyStart);
    if(close<0)break;
    let end=close;while(end>bodyStart&&/\r|\n/.test(raw[end-1]))end--;
    const dict=m[2],rawText=raw.slice(bodyStart,end);
    let content='';
    if(dict.includes('ASCII85Decode')){re.lastIndex=close+9;continue;}
    if(dict.includes('FlateDecode')){
      const array=bytes.slice(bodyStart,bodyStart+rawText.length);
      try{content=await inflate(array);}catch(e){re.lastIndex=close+9;continue;}
    } else content=rawText;
    if(content.includes(' Tj')||content.includes(' TJ'))streams.push(content);
    re.lastIndex=close+9;
  }
  return streams;
}
async function parse(file){
  const streams=await extractPdfStreams(new Uint8Array(await file.arrayBuffer()));
  if(!streams.length)throw Error('No se encontró texto de inventario dentro del PDF. Los PDF escaneados requieren Excel o un PDF con texto seleccionable.');
  const rows=[],seen=new Set(),pageText=[];
  for(const content of streams){
    const spans=[];const re=/BT\s*([\s\S]*?)\s+ET\b/g;let match;
    while((match=re.exec(content))!==null){
      const segment=match[1];
      const tm=/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\s*\(((?:\\.|[^\\)])*)\)\s*Tj/.exec(segment);
      if(!tm)continue;
      spans.push({x:Number(tm[1]),y:Number(tm[2]),text:decodePdfString(tm[3])});
    }
    pageText.push(spans.map(s=>s.text).join('\n'));
    for(const sapCell of spans.filter(s=>Math.abs(s.x-158)<7&&/^\d{5,8}$/.test(s.text))){
      const siblings=spans.filter(s=>Math.abs(s.y-sapCell.y)<2.6);
      const at=x=>siblings.find(s=>Math.abs(s.x-x)<20)?.text||'';
      const sap=sapCell.text;
      const description=at(226),family=at(40),unit=at(759),pieces=at(594),bulk=at(682);
      if(!description||!unit||!family||seen.has(sap))continue;
      seen.add(sap);
      rows.push({'SAP':sap,'FAMILIA':family,'PRODUCTO DESCRIPCION':description,'PIEZAS':pieces,'CANT. UNID.':bulk,'UNIDAD':unit});
    }
  }
  const text=pageText.join('\n');
  const match=text.match(/Generado:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date=match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:'';
  const expectedMatch=text.match(/Productos incluidos:\s*(\d+)/);
  const expected=expectedMatch?Number(expectedMatch[1]):null;
  if(!rows.length)throw Error('Este PDF no tiene el formato de tabla esperado (Familia, SAP, Producto, Piezas, Cant. Unid. y Unidad). Usa el Excel de inventario.');
  if(expected!==null&&rows.length!==expected)throw Error(`Se identificaron ${rows.length} artículos de ${expected}. No se cargó un inventario incompleto; utiliza el reporte Excel.`);
  return {rows,date,expected};
}
root.WOEPdfInventory={parse};
})(typeof window!=='undefined'?window:globalThis);
