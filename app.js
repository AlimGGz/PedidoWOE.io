(function(){
'use strict';
const Core=window.WOECore;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MXN=x=>Core.format(x,2);
const EMPTY=()=>({version:1,storeId:'',storeName:'',inventoryGenerated:'',inventoryFilename:'',inventory:[],motor01:{file:'',sales:[]},motor02:{file:'',asOf:'',articles:[],usage:[],usageCatalog:[]},motor03:{file:'',posCatalog:{},sales:[]}});
let state={data:EMPTY(),settings:{...Core.DEFAULTS},overrides:{},view:'pedido'};
let usageIndex=new Map(), currentDetail=null, editingOptions=[], changed=false;
let filter={search:'',family:'',status:''};
const LS='woe-pedidos-local-v1';
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast._timer);toast._timer=setTimeout(()=>t.classList.remove('show'),4200);}
function scheduleSave(){changed=true;clearTimeout(scheduleSave._timer);scheduleSave._timer=setTimeout(()=>{try{localStorage.setItem(LS,JSON.stringify({data:state.data,settings:state.settings,overrides:state.overrides}));changed=false;}catch(e){toast('El navegador no pudo guardar automáticamente los datos. Descarga un respaldo privado para conservar tus cambios.');}},550);}
function restore(){try{const saved=JSON.parse(localStorage.getItem(LS)||'null');if(saved?.data?.inventory&&Array.isArray(saved.data.inventory)){state={...state,data:saved.data,settings:{...Core.DEFAULTS,...saved.settings},overrides:saved.overrides||{}};}}catch(e){console.warn('Sin sesión guardada',e);}reindex();}
function reindex(){usageIndex=Core.indexUsage(state.data);}
function allResults(){return state.data.inventory.map(item=>Core.derive(item,state,usageIndex));}
function effectiveResults(){return allResults().filter(x=>x.ready&&x.order>0);}
function haveData(){return state.data.inventory.length>0;}
function sourceStatus(){
  const d=state.data;
  for(const id of ['01','02','03']){
    const value=d['motor'+id];const loaded=!!(value&&value.file);
    $('status'+id).textContent=loaded?'Cargado':'Sin cargar';$('status'+id).classList.toggle('loaded',loaded);
  }
  $('summary01').textContent=d.motor01?.sales?.length?`${d.motor01.sales.length} días de actividad y venta`:'Actividad y venta diaria';
  $('summary02').textContent=d.motor02?.usage?.length?`${d.motor02.usage.length.toLocaleString('es-MX')} registros tienda ${d.storeId||''}${d.motor02.excludedOtherStores?' · '+d.motor02.excludedOtherStores.toLocaleString('es-MX')+' excluidos':''}`:'Uso ideal diario de artículos';
  $('summary03').textContent=d.motor03?.sales?.length?`${d.motor03.sales.length.toLocaleString('es-MX')} combinaciones producto/día`:'Ventas por producto, sin duplicar insumos';
  $('statusInv').textContent=haveData()?'Cargado':'Sin cargar';$('statusInv').classList.toggle('loaded',haveData());
  const ts=d.inventoryGenerated?d.inventoryGenerated.slice(0,10):'';
  $('sourceDate').textContent=ts?`Stock base: inventario generado el ${ts.split('-').reverse().join('/')}. El nombre del archivo puede mostrar otra fecha.`:'El inventario es la referencia para el stock inicial.';
  $('storeTag').textContent=d.storeId?`${d.storeId} · ${d.storeName||'Tienda'}`:'Sin datos';
}
function populateFamilies(){const families=[...new Set(state.data.inventory.map(x=>x.family))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
  for(const id of ['familyFilter','levelFilter']){const sel=$(id),v=sel.value;sel.innerHTML='<option value="">Todas las familias</option>'+families.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');sel.value=families.includes(v)?v:'';}
}
function render(){
  sourceStatus();populateFamilies();$('onboarding').classList.toggle('hidden',haveData());
  for(const [key,val] of Object.entries(state.settings)){if($(key))$(key).value=val;}
  const rows=allResults();const ready=rows.filter(x=>x.ready).length;
  $('statProducts').textContent=Core.format(rows.length,0);$('statReady').textContent=Core.format(ready,0);$('statPending').textContent=Core.format(rows.length-ready,0);$('statOrder').textContent=Core.format(rows.filter(x=>x.order>0).length,0);
  renderTable(rows);renderLevels(rows);renderReconciliation(rows);renderTrendSelect(rows);renderContext();
}
function includesQuery(r,query){return !query||Core.norm([r.item.sap,r.item.name,r.item.family,r.linkId].join(' ')).includes(Core.norm(query));}
function itemLabel(r){return `<strong class="product-name">${esc(r.item.name)}</strong><span class="product-code">SAP ${esc(r.item.sap)} · ${esc(r.item.family)}</span>`;}
function stockText(r){return r.stock===null?'<span class="cell-muted">Revisar</span>':`${Core.format(r.stock,3)} <small class="cell-muted">${esc(r.item.unit)}</small>`;}
function sourceTag(r){
  if(r.manual)return '<span class="usage-tag manual">Manual</span>';
  if(r.linkId&&r.series.valid&&r.override.confirmed)return '<span class="usage-tag">Motor 02</span>';
  if(r.linkId&&r.series.valid)return '<span class="usage-tag suggested">Sugerido</span>';
  return '<span class="usage-tag manual">Por capturar</span>';
}
function statusChip(r){
  if(!r.ready)return `<span title="${esc(r.reasons.join(' · '))}" class="status-chip warn">◌ Por revisar</span>`;
  if(r.order>0)return '<span class="status-chip good">● Solicitar</span>';
  return '<span class="status-chip neutral">✓ Cubierto</span>';
}
function renderTable(rows){const q=$('searchInput').value||'';const fam=$('familyFilter').value;const status=$('statusFilter').value;
  const display=rows.filter(r=>includesQuery(r,q)&&(!fam||r.item.family===fam)&&(!status||(status==='manual'?!r.linkId&&!r.manual:status==='pendiente'?!r.ready:status==='pedido'?r.order>0:r.ready)));
  $('tableCount').textContent=`${display.length} de ${rows.length} artículos`;
  $('mainBody').innerHTML=display.map(r=>`<tr data-order="${r.order>0?1:0}"><td>${itemLabel(r)}</td><td>${sourceTag(r)}</td><td class="numeric">${stockText(r)}</td><td class="numeric light">${r.daily===null?`<input class="inline-manual" data-quick-use="${esc(r.item.sap)}" type="number" min="0" step="any" placeholder="Capturar" title="Consumo diario manual en ${esc(r.item.unit)}" />`:Core.format(r.daily,3)}</td><td class="numeric light">${r.coverage===Infinity?'>99':r.coverage===null?'—':Core.format(r.coverage,1)+' d'}</td><td class="numeric">${r.order===null?'<span class="cell-muted">—</span>':r.order>0?`<b>${Core.format(r.order,3)} ${esc(r.item.unit)}</b>`:'0'}</td><td>${statusChip(r)}</td><td><button class="action-link" data-edit="${esc(r.item.sap)}">Editar</button></td></tr>`).join('')||'<tr><td colspan="8" class="cell-muted" style="padding:25px;text-align:center">No se encontraron artículos.</td></tr>';
}
function renderLevels(rows){const q=$('levelSearch').value||'';const family=$('levelFilter').value;const d=rows.filter(r=>includesQuery(r,q)&&(!family||r.item.family===family));
 $('levelsBody').innerHTML=d.map(r=>`<tr><td>${itemLabel(r)}</td><td class="numeric">${r.daily===null?'—':Core.format(r.daily,3)}</td><td class="numeric">${r.min===null?'—':Core.format(r.min,3)}</td><td class="numeric">${r.max===null?'—':Core.format(r.max,3)}</td><td class="numeric">${stockText(r)}</td><td class="numeric">${r.coverage===null?'—':r.coverage===Infinity?'>99':Core.format(r.coverage,1)}</td><td>${statusChip(r)}</td><td><button class="action-link" data-edit="${esc(r.item.sap)}">Editar</button></td></tr>`).join('');
}
function renderReconciliation(rows){$('reconcileBody').innerHTML=rows.map(r=>{
  const s=r.item.suggestions?.[0];const suggestions=s?`<strong class="product-name">${esc(s.name)}</strong><span class="product-code">ID uso ${esc(s.id)} · ${esc(s.usageUnit)}</span>`:'<span class="cell-muted">Sin coincidencias</span>';
  const label=r.manual?'Captura manual':r.linkId?(r.override.confirmed?'Confirmado':'Por confirmar'):'Sin vínculo';
  return `<tr><td>${itemLabel(r)}</td><td>${suggestions}</td><td class="numeric">${s?`${Core.format(s.score,1)}%`:'—'}</td><td>${r.override.confirmed?'<span class="status-chip good">✓ '+label+'</span>':'<span class="status-chip warn">◌ '+label+'</span>'}</td><td><button class="action-link" data-edit="${esc(r.item.sap)}">Conciliar</button></td></tr>`;
 }).join('');}
function renderTrendSelect(rows){const el=$('trendItemSelect'),prev=el.value;
  el.innerHTML='<option value="">Selecciona un artículo...</option>'+rows.map(r=>`<option value="${esc(r.item.sap)}">${esc(r.item.sap)} · ${esc(r.item.name)}</option>`).join('');
  el.value=rows.some(r=>r.item.sap===prev)?prev:(rows.find(r=>r.series.valid)?.item.sap||'');renderTrend();
}
function renderTrend(){const sap=$('trendItemSelect').value;const r=sap?Core.derive(state.data.inventory.find(x=>x.sap===sap),state,usageIndex):null;
  const s=r?.series;const unit=r?.item.unit||'';
  $('trendRecent').textContent=s?.valid?`${Core.format(s.recent,3)} ${unit}`:'—';
  $('trendPrevious').textContent=s?.valid?`${Core.format(s.previous,3)} ${unit}`:'—';
  $('trendChange').textContent=s?.valid&&s.previous>0?`${s.recent>=s.previous?'+':''}${Core.format(100*(s.recent/s.previous-1),1)}%`:'—';
  $('trendDays').textContent=s?.valid?`${s.daysObserved} de 28`:'—';
  if(!s?.valid){$('chartArea').innerHTML='<div class="empty-chart">El artículo no cuenta con historial conciliado y convertible.</div>';$('trendNotes').textContent=s?.reason||'';return;}
  const values=s.series.map(p=>p.value);const top=Math.max(.001,...values)*1.12;const W=890,H=290,pl=52,pr=14,pt=20,pb=35,dx=(W-pl-pr)/(values.length-1);
  const x=i=>pl+dx*i,y=v=>pt+(H-pt-pb)*(1-v/top);
  const points=values.map((v,i)=>[x(i),y(v)]);const path=points.map((p,i)=>(i?'L':'M')+p.map(z=>z.toFixed(1)).join(',')).join(' ');
  const fill=path+` L ${x(values.length-1)},${H-pb} L ${pl},${H-pb} Z`;
  const lines=[0,.25,.5,.75,1].map(t=>`<line x1="${pl}" y1="${y(top*t)}" x2="${W-pr}" y2="${y(top*t)}" stroke="#e4ebe4" stroke-dasharray="4 4"/><text x="${pl-10}" y="${y(top*t)+4}" text-anchor="end" font-size="11" fill="#91a497">${esc(Core.format(top*t,2))}</text>`).join('');
  const labels=[0,7,14,21,27].map(i=>`<text x="${x(i)}" y="${H-11}" text-anchor="middle" fill="#92a79a" font-size="11">${esc(s.series[i].date.slice(5))}</text>`).join('');
  $('chartArea').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de consumo diario de las últimas cuatro semanas"><defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#006241" stop-opacity=".18"/><stop offset="100%" stop-color="#006241" stop-opacity="0"/></linearGradient></defs>${lines}<path d="${fill}" fill="url(#trendGrad)"/><path d="${path}" fill="none" stroke="#006241" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>${points.filter((_,i)=>i%3===0).map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.7" fill="#006241"/>`).join('')}${labels}</svg>`;
  $('trendNotes').textContent=`Las fechas sin registro de consumo se muestran como cero dentro del periodo histórico. Conversión: ${s.units.join(' · ')}. El promedio pondera ${state.settings.recentWeight}% de los últimos 7 días y ${100-state.settings.recentWeight}% de los 28 días.`;
}
function renderContext(){const sales=state.data.motor01?.sales||[];const last=sales[sales.length-1];
  $('lastTransactions').textContent=last?Core.format(last.trxs,0):'—';$('lastTransactionsDay').textContent=last?.date||'Sin datos';$('lastSales').textContent=last?'$'+Core.format(last.sales,2):'—';$('posLines').textContent=Core.format(state.data.motor03?.sales?.length||0,0);
}
function switchView(view){state.view=view;for(const el of document.querySelectorAll('.nav-item[data-view]'))el.classList.toggle('active',el.dataset.view===view);
  for(const v of ['pedido','niveles','tendencia','conciliacion'])$('view-'+v).classList.toggle('hidden',v!==view);
  const title={pedido:'Pedido WOE',niveles:'Máximos y mínimos',tendencia:'Tendencia de uso',conciliacion:'Conciliación de artículos'};
  $('pageTitle').textContent=title[view];$('pageSubtitle').textContent={pedido:'Proyección basada en el inventario contado y en el consumo ideal registrado.',niveles:'Niveles de seguridad editables y cobertura para cada artículo.',tendencia:'Visualiza el consumo real modelado sin duplicar transacciones.',conciliacion:'Relaciona cada código SAP con la clave de uso correspondiente.'}[view];
  $('exportBtn').textContent=view==='pedido'?'↓ Exportar Excel':'↓ Exportar Excel';
  if(view==='tendencia')renderTrend();window.scrollTo({top:0,behavior:'smooth'});
}
// ---------- DETALLE / EDICIÓN ----------
function detailItem(){return state.data.inventory.find(x=>x.sap===currentDetail);}
function detailOverride(){return state.overrides[currentDetail]||{};}
function availableUsageOptions(q){const units=state.data.motor02?.usageCatalog||[];const query=Core.norm(q);
  let list=units.filter(x=>!query||Core.norm(`${x.name} ${x.id}`).includes(query));
  const current=String($('editUsageId').value||'');if(current&&!list.some(x=>x.id===current)){const found=units.find(x=>x.id===current);if(found)list.unshift(found);}
  return list.slice(0,query?100:300);
}
function updateUsageSelect(query=''){const list=availableUsageOptions(query);const s=$('editUsageId'),selected=s.value;
  s.innerHTML='<option value="">Sin vincular · captura manual</option>'+list.map(x=>`<option value="${esc(x.id)}">${esc(x.id)} · ${esc(x.name)} — ${esc(x.usageUnit)}</option>`).join('');s.value=list.some(x=>x.id===selected)?selected:'';
}
function openDetail(sap){const item=state.data.inventory.find(x=>x.sap===sap);if(!item)return;
  currentDetail=sap;const r=Core.derive(item,state,usageIndex),o=detailOverride();
  $('detailTitle').textContent=item.name;$('detailSubtitle').textContent=`SAP ${sap} · ${item.family} · ${item.unit}`;
  $('detailSource').innerHTML=`<strong>Inventario del PDF</strong><div>PIEZAS: ${Core.format(item.pieces,3)} · CANT. UNID.: ${item.bulk===null?'—':Core.format(item.bulk,3)} ${esc(item.unit)}</div><div>Sugerencia de asociación: ${item.suggestions?.[0]?`${esc(item.suggestions[0].name)} (${Core.format(item.suggestions[0].score,1)}%)`:'ninguna'}</div>`;
  $('editUsageId').value='';updateUsageSelect();$('editUsageId').value=r.linkId||'';
  $('usageSearch').value='';$('editStock').value=r.stock===null?'':r.stock;
  $('editInbound').value=o.inbound??0;$('editManual').value=o.manual??'';
  const defaultFactor=r.linkId?(state.data.motor02.usageCatalog||[]).find(x=>x.id===r.linkId)?.usageUnit:'';
  $('editFactor').value=o.factor??(Core.unitFactor(item.unit,defaultFactor)??'');
  $('editMultiple').value=o.multiple??(['PZA','UND','ST'].includes(item.unit)?1:'');
  $('editNote').value=o.note||'';$('editConfirmed').checked=!!o.confirmed;
  $('stockVerifiedWrap').classList.toggle('hidden',!['KG','L'].includes(item.unit));$('editStockVerified').checked=!!o.stockVerified;
  $('stockUnitLabel').textContent=`${item.unit} · Edita si hay cantidades mixtas`;
  $('conversionHint').textContent=`En ${item.unit} por cada unidad de consumo`;
  $('multipleHint').textContent=item.packHint>1?`Descripción SAP sugiere caja de ${item.packHint} unidades; valida su equivalencia en ${item.unit}`:('En KG/L, captura el múltiplo real si debes pedir.');
  $('detailWarnings').textContent=r.reasons.join(' · ');
  updateDetailMath();$('detailOverlay').classList.remove('hidden');$('editUsageId').focus();
}
function readDetailForm(){const o={};const id=$('editUsageId').value;o.usageId=id;
  for(const [field,el] of [['stock','editStock'],['inbound','editInbound'],['manual','editManual'],['factor','editFactor'],['multiple','editMultiple']]){
    const v=$(el).value.trim();if(v!=='')o[field]=Number(v);
  }
  o.confirmed=$('editConfirmed').checked&&!!id;o.stockVerified=$('editStockVerified').checked;o.note=$('editNote').value.trim();return o;
}
function updateDetailMath(){if(!currentDetail)return;const item=detailItem();const temp={...state,overrides:{...state.overrides,[currentDetail]:readDetailForm()}};
  const r=Core.derive(item,temp,usageIndex);
  $('detailMath').innerHTML=`<strong>Previsualización</strong><div>Uso estimado: <strong>${r.daily===null?'Pendiente':Core.format(r.daily,3)+' '+esc(item.unit)+'/día'}</strong></div><div>Mínimo: ${Core.format(r.min,3)} · Máximo: ${Core.format(r.max,3)} · Stock: ${Core.format(r.stock,3)}</div><div>Pedido: <strong>${r.order===null?'Necesita revisión':Core.format(r.order,3)+' '+esc(item.unit)}</strong></div>`;
  $('detailWarnings').textContent=r.reasons.length?r.reasons.join(' · '):'El artículo tiene los datos necesarios para calcular el pedido.';
}
function closeDetail(){$('detailOverlay').classList.add('hidden');currentDetail=null;}
function saveDetail(){if(!currentDetail)return;const o=readDetailForm();if(Object.entries(o).some(([k,v])=>['stock','inbound','manual','factor','multiple'].includes(k)&&v!==undefined&&(!Number.isFinite(v)||v<0))){toast('Revisa cantidades: no se admiten negativos.');return;}
  if(o.factor!==undefined&&o.factor<=0){toast('La conversión debe ser mayor que cero.');return;}
  if(o.multiple!==undefined&&o.multiple<=0){toast('El múltiplo debe ser mayor que cero.');return;}
  state.overrides[currentDetail]=o;closeDetail();scheduleSave();render();toast('Ajustes guardados para este artículo.');
}
// ---------- LECTURA SEGURA DE XLSX / XLSM ----------
function xmlText(xml){return new DOMParser().parseFromString(xml,'application/xml');}
async function openWorkbook(file){if(!window.JSZip)throw Error('No se encuentra la biblioteca local de archivos Excel.');
  const zip=await window.JSZip.loadAsync(await file.arrayBuffer());
  const wb=zip.file('xl/workbook.xml');if(!wb)throw Error('Archivo Excel inválido: falta xl/workbook.xml.');
  const wbdoc=xmlText(await wb.async('string'));
  const relation=zip.file('xl/_rels/workbook.xml.rels');const relMap=new Map();
  if(relation){const rel=xmlText(await relation.async('string'));for(const node of rel.getElementsByTagName('Relationship'))relMap.set(node.getAttribute('Id'),node.getAttribute('Target'));}
  const sheets=new Map();const sheetsEl=wbdoc.getElementsByTagName('sheet');
  for(const sheet of sheetsEl){const name=sheet.getAttribute('name');const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let path=relMap.get(rid)||'';path=path.replace(/^\//,'').replace(/^xl\//,'');if(path.startsWith('worksheets/'))path='xl/'+path;else if(!path.startsWith('xl/'))path='xl/'+path;
    sheets.set(name,path);
  }
  const shared=zip.file('xl/sharedStrings.xml');const strings=[];
  if(shared){const doc=xmlText(await shared.async('string'));for(const si of doc.getElementsByTagName('si')){let txt='';for(const t of si.getElementsByTagName('t'))txt+=t.textContent||'';strings.push(txt);}}
  return {zip,sheets,strings};
}
const cellRE=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
const rowRE=/<row\b[^>]*>([\s\S]*?)<\/row>/g;
const validNum=/^-?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i;
function decodeXml(s){return s.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,c=>{
  if(c==='&amp;')return '&';if(c==='&lt;')return '<';if(c==='&gt;')return '>';if(c==='&quot;')return '"';if(c==='&apos;')return "'";
  const n=c.startsWith('&#x')?parseInt(c.slice(3,-1),16):parseInt(c.slice(2,-1),10);return Number.isFinite(n)?String.fromCodePoint(n):c;
 });}
function eachRow(xml,strings,handler){let header=null,rowMatch,idx=0;rowRE.lastIndex=0;
  while((rowMatch=rowRE.exec(xml))!==null){const cells={},raw=rowMatch[1];cellRE.lastIndex=0;let cm;
    while((cm=cellRE.exec(raw))!==null){const attrs=cm[1],inner=cm[2]||'';const col=(attrs.match(/\br="([A-Z]+)\d+"/)||[])[1];if(!col)continue;
      const t=(attrs.match(/\bt="([^"]+)"/)||[])[1];let v=(inner.match(/<v>([\s\S]*?)<\/v>/)||[])[1];
      if(t==='inlineStr'){v=decodeXml((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)||[])[1]||'');}
      else if(t==='s'){v=v==null?'':(strings[Number(v)]??'');}
      else if(v!=null&&validNum.test(v)){v=Number(v);}
      else if(v==null){continue;}
      cells[col]=v;
    }
    if(!header){header=cells;idx++;continue;}
    const out={};for(const [col,title] of Object.entries(header)){if(title!==undefined)out[String(title).trim()]=cells[col]??null;}
    handler(out,idx++);
  }
  return idx;
}
async function sheetRows(wb,preferred,handler){let name=preferred.find(n=>wb.sheets.has(n));if(!name)throw Error('No se encontró la hoja requerida: '+preferred.join(' o '));
  const filepath=wb.sheets.get(name);const zipFile=wb.zip.file(filepath);
  if(!zipFile)throw Error('No se pudo abrir la hoja '+name+' ('+filepath+').');
  const xml=await zipFile.async('string');let count=eachRow(xml,wb.strings,handler);return {name,count:Math.max(0,count-1)};
}
function storeGuard(rawStore,fileName){const target=state.data.storeId;if(target&&rawStore&&String(Number(rawStore))!==String(Number(target)))throw Error(`${fileName} corresponde a la tienda ${rawStore}, no a ${target}. No se mezclaron los datos.`);}
async function uploadMotor(n,file){let out;
  const wb=await openWorkbook(file);
  if(n==='01'){
    const sales=[];await sheetRows(wb,['venta_dia_base','venta_dia_ac'],r=>{storeGuard(r.IDTienda,file.name);const date=Core.dayFromExcel(r.Fecha);if(date&&r.Transacciones!=null)sales.push({date,trxs:Number(r.Transacciones)||0,sales:Number(r.VentaNeta)||0});});
    if(!sales.length)throw Error('El Motor 01 no contiene filas de venta diaria.');
    sales.sort((a,b)=>a.date.localeCompare(b.date));out={file:file.name,sales};
  }else if(n==='02'){
    const usage=[];const catalog=new Map();const stockCatalog=[];let asOf='',excludedOtherStores=0;
    await sheetRows(wb,['uso_ac','uso_base'],r=>{
      if(state.data.storeId&&String(Number(r.IDTienda))!==String(Number(state.data.storeId))){excludedOtherStores++;return;}
      const date=Core.dayFromExcel(r.Fecha);const id=String(r.IDArticulo??'');
      if(!date||!id||!Number.isFinite(Number(r.UsoIdeal)))return;
      const unit=String(r.Unidad||'');usage.push({day:date,id,unit,qty:Number(r.UsoIdeal)||0});
      if(!catalog.has(id))catalog.set(id,{id,name:String(r.NombreArticulo||''),usageUnit:unit,group:String(r.NombreClasificador||'')});
      if(date>asOf)asOf=date;
    });
    await sheetRows(wb,['stock_base'],r=>{const id=String(r.IDArticulo??'');if(id)stockCatalog.push({id,name:String(r.NombreArticuloStock||''),group:String(r.GrupoMayor||''),category:String(r.ClasificacionStock||''),unit:String(r.UnidadStock||''),pickPack:String(r.PickPack||'')});});
    if(!usage.length||!stockCatalog.length)throw Error('El Motor 02 no contiene el uso ideal o catálogo de stock.');
    out={file:file.name,asOf,usage,articles:stockCatalog,usageCatalog:[...catalog.values()],excludedOtherStores};
    // Reconciliar las sugerencias contra el catálogo nuevo, sin equiparar IDs entre hojas.
    const ids=new Set(out.usageCatalog.map(x=>x.id));
    for(const item of state.data.inventory){
      item.suggestions=(item.suggestions||[]).filter(x=>ids.has(String(x.id)));
      if(item.autoLink&&!ids.has(String(item.autoLink)))delete item.autoLink;
      if(!item.suggestions.length){
        const normalized=Core.norm(item.name).replace(/\b(?:CJ|PZAS?|PZA|BTE|CJA|KG|LT|MLS?)\b/g,'').trim();
        const tokens=new Set(normalized.split(' ').filter(x=>x.length>=4&&!/^\d+$/.test(x)));
        item.suggestions=out.usageCatalog.map(x=>{
          const t=new Set(Core.norm(x.name).split(' ').filter(v=>v.length>=4&&!/^\d+$/.test(v)));
          const overlap=[...tokens].filter(k=>t.has(k)).length;
          return {id:x.id,name:x.name,usageUnit:x.usageUnit,score:Math.round(100*overlap/Math.max(1,tokens.size,t.size))};
        }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
      }
    }
    // Los enlaces no disponibles quedan pendientes, nunca se reasignan sin confirmación.
  }else if(n==='03'){
    const catalog={};await sheetRows(wb,['producto_base'],r=>{const id=r.IDProducto;if(id!=null)catalog[String(id)]={name:String(r.Descripcion||''),family:String(r.DescripcionFam||''),category:String(r.CatDescripcion||'')};});
    const aggregate=new Map();await sheetRows(wb,['detalleventa_base'],r=>{storeGuard(r.IDTienda,file.name);
      const day=Core.dayFromExcel(r.FechaHora);const id=String(r.IDProducto??'');if(!day||!id||!/^[0-9]+$/.test(id))return;
      const key=day+'~'+id;aggregate.set(key,(aggregate.get(key)||0)+(Number(r.CantidadAjustada??r.Cantidad)||0));
    });
    if(!aggregate.size)throw Error('El Motor 03 no tiene productos vendidos válidos.');
    out={file:file.name,posCatalog:catalog,sales:[...aggregate].map(([key,qty])=>{const [day,id]=key.split('~');return [day,id,Math.round(qty*1e4)/1e4];})};
  }
  state.data['motor'+n]=out;
  reindex();scheduleSave();render();toast(`Motor ${n} actualizado: ${file.name}`+(n==='02'&&out.excludedOtherStores?' · '+out.excludedOtherStores+' registros de otras tiendas excluidos.':''));
}
// ---------- INVENTARIO Y RESPALDOS ----------
function validatePrivate(obj){return obj&&Array.isArray(obj.inventory)&&obj.inventory.every(p=>p.sap&&p.unit);}
function loadSession(obj){
  const full=obj.data&&obj.data.inventory?obj:{data:obj,settings:{...Core.DEFAULTS},overrides:{}};
  if(!validatePrivate(full.data))throw Error('El archivo privado no contiene un inventario válido con códigos SAP.');
  state.data=full.data;state.settings={...Core.DEFAULTS,...full.settings};state.overrides=full.overrides||{};
  reindex();scheduleSave();render();toast(`Importados ${state.data.inventory.length} artículos de inventario.`);
}
function parseCsv(text){const result=[],raw=text.replace(/^\ufeff/,'');let cells=[],cell='',quoted=false;
  const delim=raw.split(/\r?\n/,1)[0].includes(';')?';':',';
  for(let i=0;i<raw.length;i++){const c=raw[i];if(quoted){if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
    else if(c==='"')quoted=true;else if(c===delim){cells.push(cell);cell='';}else if(c==='\n'){cells.push(cell.replace(/\r$/,''));result.push(cells);cells=[];cell='';}else cell+=c;
  }
  if(cell||cells.length){cells.push(cell);result.push(cells);}return result;
}
function normalizeInventoryRows(rows){if(!rows.length)throw Error('Archivo de inventario vacío.');const records=[];
  for(const row of rows){const mapped={};for(const [k,v] of Object.entries(row))mapped[Core.norm(k)]=v;
    const sap=String(mapped.SAP||mapped.CODIGO_SAP||mapped.CODIGO||'').replace(/\.0$/,'').trim();if(!/^\d{5,8}$/.test(sap))continue;
    const name=String(mapped['PRODUCTO DESCRIPCION']||mapped['PRODUCTO']||mapped['DESCRIPCION']||mapped['ITEM NAME']||'').replace(/^\d+\s*[-–]\s*/,'');
    const qty=x=>{if(x==null||x==='—'||x==='')return null;const normalized=String(x).replace(/,/g,'');return Number.isFinite(Number(normalized))?Number(normalized):null;};
    const unit=String(mapped.UNIDAD||mapped.UM||'PZA').trim().toUpperCase().replace(/\W/g,'')||'PZA';
    const pieces=qty(mapped.PIEZAS??mapped['CANTIDAD PIEZAS']??mapped.CANTIDAD??null);
    const bulk=qty(mapped['CANT UNID']??mapped['CANTIDAD UNID']??mapped['CANT UNIDADES']??null);
    if(pieces===null&&bulk===null)continue;
    records.push({sap,name,unit,pieces:pieces??0,bulk,family:String(mapped.FAMILIA||'Sin familia')});
  }
  if(!records.length)throw Error('No se detectaron columnas SAP, producto y piezas en el inventario.');
  const original=new Map(state.data.inventory.map(i=>[i.sap,i]));let updated=0,added=0;
  for(const entry of records){const prev=original.get(entry.sap);if(prev){Object.assign(prev,{...entry,name:entry.name||prev.name,unit:entry.unit||prev.unit});updated++;}
    else{state.data.inventory.push({...entry,packHint:1,suggestions:[]});added++;}}
  state.data.inventory.sort((a,b)=>(a.family||'').localeCompare(b.family||'','es')||a.sap.localeCompare(b.sap));
  state.data.inventoryGenerated=new Date().toISOString();return {updated,added};
}
async function uploadInventory(file){if(file.name.toLowerCase().endsWith('.json')){loadSession(JSON.parse(await file.text()));return;}
  let rows=[];
  if(file.name.toLowerCase().endsWith('.csv')){const matrix=parseCsv(await file.text());const h=(matrix.shift()||[]).map(String);rows=matrix.map(r=>Object.fromEntries(h.map((col,i)=>[col,r[i]??''])));}
  else{const wb=await openWorkbook(file);const first=[...wb.sheets.keys()];let lastError=null;
    for(const name of first.slice(0,6)){let test=[];try{await sheetRows(wb,[name],r=>test.push(r));normalizeInventoryRows(test);rows=null;break;}catch(e){lastError=e;}}
    if(rows)throw lastError||Error('No se encontró tabla de inventario válida.');
  }
  if(rows){const {updated,added}=normalizeInventoryRows(rows);toast(`${updated} artículos actualizados y ${added} agregados.`);}
  scheduleSave();render();
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);}
function saveBackup(){if(!haveData()){toast('Carga primero tus datos iniciales.');return;}
  const serialized=JSON.stringify({format:'WOE-PEDIDOS-SESION',version:1,data:state.data,settings:state.settings,overrides:state.overrides});
  downloadBlob(new Blob([serialized],{type:'application/json'}),`Respaldo_Privado_WOE_${new Date().toISOString().slice(0,10)}.json`);toast('Respaldo privado generado. No publiques este archivo en GitHub.');
}
// ---------- EXPORTACIÓN A EXCEL SIN CONECTORES EXTERNOS ----------
const xesc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const colLetter=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
function sheetXML(matrix,headerAt=0){
  const ncol=Math.max(1,...matrix.map(r=>r.length));
  const columns=Array.from({length:ncol},(_,j)=>{
    const texts=matrix.slice(0,Math.min(matrix.length,220)).map(row=>String(row[j]??''));
    const length=Math.min(58,Math.max(12,...texts.map(v=>Math.min(58,v.length+2))));
    return `<col min="${j+1}" max="${j+1}" width="${length}" customWidth="1"/>`;
  }).join('');
  const rows=matrix.map((row,i)=>{
    const cells=row.map((value,j)=>{
      if(value===null||value===undefined||value==='')return '';
      const address=colLetter(j)+(i+1),style=i===headerAt?' s="1"':'';
      if(typeof value==='number'&&Number.isFinite(value))return `<c r="${address}"${style}><v>${value}</v></c>`;
      return `<c r="${address}" t="inlineStr"${style}><is><t xml:space="preserve">${xesc(value)}</t></is></c>`;
    }).join('');return `<row r="${i+1}">${cells}</row>`;
  }).join('');
  const end=colLetter(ncol-1)+Math.max(headerAt+1,matrix.length);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerAt+1}" topLeftCell="A${headerAt+2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>${columns}</cols><sheetData>${rows}</sheetData><autoFilter ref="A${headerAt+1}:${end}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.25" footer="0.25"/></worksheet>`;
}
async function createXlsx(sheets){const zip=new JSZip(),ns='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  let types=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;
  let entries='',links='';sheets.forEach((s,i)=>{types+=`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;entries+=`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`;links+=`<Relationship Id="rId${i+1}" Type="${ns}/worksheet" Target="worksheets/sheet${i+1}.xml"/>`;zip.file(`xl/worksheets/sheet${i+1}.xml`,sheetXML(s.rows,s.name==='Pedido WOE'?3:0));});
  zip.file('[Content_Types].xml',types+'</Types>');
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${ns}"><sheets>${entries}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links}<Relationship Id="rIdStyle" Type="${ns}/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF006241"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);
  return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
}
async function exportXlsx(){if(!haveData()){toast('Primero carga el inventario.');return;}
  $('exportBtn').disabled=true;try{
    const rows=allResults();const date=new Date().toISOString().slice(0,10);
    const sheet1=[['PEDIDO WOE · '+(state.data.storeName||'Tienda'),'Generado: '+date],['Importante: revisar los códigos, cantidades, paquetes y unidades antes de solicitar.'],[],['SAP','Producto','Familia','Unidad','Stock','En tránsito','Uso diario','Mínimo','Máximo','Cantidad a solicitar','Múltiplo','Origen','Nota']];
    for(const r of rows.filter(x=>x.ready&&x.order>0))sheet1.push([r.item.sap,r.item.name,r.item.family,r.item.unit,r.stock,r.inbound,r.daily,r.min,r.max,r.order,r.multiple,r.source==='manual'?'Manual':'Motor 02',r.override.note||'']);
    const sheet2=[['SAP','Producto','Familia','Stock validado','Unidad','Uso diario','Mínimo','Máximo','Cobertura días','Pedido','Estado','Motivo pendiente']];
    const sheet3=[['SAP','Producto','Fecha','Uso convertido a unidad del inventario','Unidad','Origen','ID de uso']];
    const sheet4=[['SAP','Producto','Razón de revisión','ID uso propuesto','Confianza de nombre']];
    for(const r of rows){sheet2.push([r.item.sap,r.item.name,r.item.family,r.stock,r.item.unit,r.daily,r.min,r.max,Number.isFinite(r.coverage)?r.coverage:null,r.order,r.ready?'Validado':'Pendiente',r.reasons.join('; ')]);
      if(r.series?.valid)for(const p of r.series.series)sheet3.push([r.item.sap,r.item.name,p.date,p.value,r.item.unit,r.manual?'Manual':'Motor 02',r.linkId]);
      if(!r.ready)sheet4.push([r.item.sap,r.item.name,r.reasons.join('; '),r.item.suggestions?.[0]?.id||'',r.item.suggestions?.[0]?.score||0]);
    }
    const blob=await createXlsx([{name:'Pedido WOE',rows:sheet1},{name:'Maximos y Minimos',rows:sheet2},{name:'Tendencia de Uso',rows:sheet3},{name:'Pendientes',rows:sheet4}]);
    downloadBlob(blob,`Pedido_WOE_${state.data.storeId||'Tienda'}_${date}.xlsx`);toast('Excel creado: pedido, máximos y mínimos, tendencia y pendientes.');
  }catch(e){console.error(e);toast('No se pudo exportar: '+e.message);}finally{$('exportBtn').disabled=false;}
}
// ---------- EVENTOS ----------
function init(){restore();render();
  document.querySelectorAll('.nav-item[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  $('gotoFiles').addEventListener('click',()=>{$('sources').classList.remove('hidden');$('filesSection').scrollIntoView({behavior:'smooth'});});
  $('toggleFiles').addEventListener('click',()=>{const hidden=$('sources').classList.toggle('hidden');$('toggleFiles').textContent=hidden?'Mostrar fuentes ⌄':'Ocultar fuentes ⌃';});
  $('onboardingImport').addEventListener('click',()=>$('sessionInput').click());
  $('sessionInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{loadSession(JSON.parse(await f.text()));}catch(err){console.error(err);toast('No se pudo cargar el archivo: '+err.message);}e.target.value='';});
  for(const id of ['01','02','03'])$('motor'+id+'Input').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const status=$('status'+id);status.textContent='Procesando…';status.classList.remove('loaded');
    // Dejar pintar al navegador antes del procesamiento de hojas voluminosas.
    await new Promise(resolve=>setTimeout(resolve,40));
    try{await uploadMotor(id,f);}catch(err){console.error(err);sourceStatus();toast('Motor '+id+': '+err.message);}e.target.value='';});
  $('invInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{await uploadInventory(f);}catch(err){console.error(err);toast('Inventario: '+err.message);}e.target.value='';});
  $('backupBtn').addEventListener('click',saveBackup);$('exportBtn').addEventListener('click',exportXlsx);$('printBtn').addEventListener('click',()=>{if(!haveData()){toast('Carga primero los datos iniciales.');return;}window.print();});
  $('helpBtn').addEventListener('click',()=>toast('Importa los datos privados, concilia códigos y revisa consumos y stock. Los pedidos se calculan solo con datos validados.'));
  $('resetConfigBtn').addEventListener('click',()=>{state.settings={...Core.DEFAULTS};scheduleSave();render();toast('Parámetros restablecidos.');});
  for(const key of ['leadDays','cycleDays','safetyDays','recentWeight'])$(key).addEventListener('change',()=>{
    const v=Number($(key).value);const mins={leadDays:0,cycleDays:1,safetyDays:0,recentWeight:0};const maxes={leadDays:30,cycleDays:60,safetyDays:30,recentWeight:100};
    state.settings[key]=Math.min(maxes[key],Math.max(mins[key],Number.isFinite(v)?v:Core.DEFAULTS[key]));
    scheduleSave();render();
  });
  for(const [id,fn] of [['searchInput',()=>renderTable(allResults())],['familyFilter',()=>renderTable(allResults())],['statusFilter',()=>renderTable(allResults())],['levelSearch',()=>renderLevels(allResults())],['levelFilter',()=>renderLevels(allResults())]])$(id).addEventListener(id.includes('Filter')?'change':'input',fn);
  $('trendItemSelect').addEventListener('change',renderTrend);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openDetail(b.dataset.edit);});
  document.addEventListener('change',e=>{const el=e.target.closest('[data-quick-use]');if(!el)return;
    const sap=el.dataset.quickUse;const val=el.value.trim();if(val===''||!Number.isFinite(Number(val))||Number(val)<0){toast('Captura un consumo diario válido, igual o mayor a cero.');return;}
    state.overrides[sap]={...(state.overrides[sap]||{}),manual:Number(val)};scheduleSave();render();toast('Consumo diario manual registrado para SAP '+sap+'.');
  });
  $('closeDetail').addEventListener('click',closeDetail);$('detailOverlay').addEventListener('click',e=>{if(e.target===$('detailOverlay'))closeDetail();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('detailOverlay').classList.contains('hidden'))closeDetail();});
  $('usageSearch').addEventListener('input',e=>{const was=$('editUsageId').value;updateUsageSelect(e.target.value);$('editUsageId').value=was;});
  $('editUsageId').addEventListener('change',()=>{const item=detailItem();const id=$('editUsageId').value;
    const u=(state.data.motor02.usageCatalog||[]).find(x=>x.id===id);$('editFactor').value=u?Core.unitFactor(item.unit,u.usageUnit)??'':'';$('editConfirmed').checked=false;updateDetailMath();});
  document.querySelectorAll('.drawer-form input,.drawer-form select').forEach(el=>el.addEventListener('input',updateDetailMath));
  $('saveDetail').addEventListener('click',saveDetail);$('clearDetail').addEventListener('click',()=>{if(!currentDetail)return;const sap=currentDetail;delete state.overrides[sap];closeDetail();scheduleSave();render();openDetail(sap);toast('Se restauraron los valores iniciales de este artículo.');});
  $('bulkConfirm').addEventListener('click',()=>{let count=0;for(const item of state.data.inventory){if(!item.autoLink)continue;const o=state.overrides[item.sap]||{};
    if(o.usageId&&o.usageId!==item.autoLink)continue;
    const updated={...o,usageId:item.autoLink,confirmed:true};const check=Core.derive(item,{...state,overrides:{...state.overrides,[item.sap]:updated}},usageIndex);
    if(check.series?.valid&&check.series.daysObserved>=3){state.overrides[item.sap]=updated;count++;}
  }scheduleSave();render();toast(`${count} asociaciones de alta similitud confirmadas. Verifica sus unidades antes de enviar el pedido.`);});
  switchView('pedido');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
