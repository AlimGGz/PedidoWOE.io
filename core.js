/* Cálculo transparente de pedidos WOE; sin dependencias y sin conexiones externas. */
(function(root){
  'use strict';
  const DAY=86400000;
  const DEFAULTS={leadDays:2,cycleDays:4,safetyDays:1,recentWeight:70};
  const n=(v,fallback=null)=>v===''||v===null||v===undefined?fallback:(Number.isFinite(Number(v))?Number(v):fallback);
  const num=(v,d=0)=>n(v,d);
  const cleanDate=day=>/^\d{4}-\d\d-\d\d$/.test(String(day||''))?String(day):'';
  const dayFromExcel=x=>{
    if(typeof x==='string'&&/^\d{4}-\d\d-\d\d/.test(x))return x.slice(0,10);
    if(!Number.isFinite(Number(x)))return '';
    const ms=Date.UTC(1899,11,30)+Math.floor(Number(x))*DAY;
    return new Date(ms).toISOString().slice(0,10);
  };
  const addDays=(day,delta)=>new Date(Date.parse(day+'T00:00:00Z')+delta*DAY).toISOString().slice(0,10);
  const format=(v,dec=2)=>v==null||!Number.isFinite(v)?'—':new Intl.NumberFormat('es-MX',{minimumFractionDigits:0,maximumFractionDigits:dec}).format(v);
  const norm=(s)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
  const round=(qty,unit)=>['PZA','UND','ST'].includes(unit)?Math.ceil(qty-1e-9):Math.ceil(qty*1000-1e-9)/1000;
  function stockFromPdf(item,override){
    if(override&&override.stock!==undefined&&override.stock!==null&&override.stock!=='')return Math.max(0,num(override.stock,0));
    const pieces=num(item.pieces,0),bulk=num(item.bulk,0);
    if(['PZA','UND','ST'].includes(item.unit))return pieces;
    // El PDF no informa cómo convertir cajas a kg/L. Si hay dos cantidades,
    // NO sumamos números de unidades físicas diferentes.
    if(pieces>0&&bulk>0)return null;
    return Math.max(0,pieces||bulk);
  }
  function unitFactor(stockUnit, motorUnit){
    const u=String(motorUnit||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); const prefix=String(motorUnit||'').split(':')[0].toUpperCase();
    const stock=String(stockUnit||'').toUpperCase();
    if(['PZA','UND','ST'].includes(stock)){
      if(['PZA','UND','ST','REB'].includes(prefix))return 1;
      if(prefix==='BLI'){
        const m=u.match(/(\d+(?:\.\d+)?)\s*PZ/);return m?Number(m[1]):null;
      }
      return null;
    }
    const matches=[...u.matchAll(/(\d+(?:[.,]\d+)?)\s*(ML|MILILITRO[S]?|LITRO[S]?|LTS?|L|KG|KILO[S]?|GR[S]?|G|GRAMO[S]?|LB[S]?|LIBRA[S]?|OZ)/g)];
    if(stock==='KG'){
      if(prefix==='KG')return 1;
      for(const m of matches){const size=Number(m[1].replace(',','.'));const key=m[2];
        if(['KG','KILO','KILOS'].includes(key))return size;
        if(['GR','GRS','G','GRAMO','GRAMOS'].includes(key))return size/1000;
        if(['LB','LBS','LIBRA','LIBRAS'].includes(key))return size*0.45359237;
        if(key==='OZ')return size*0.028349523125;
      }
      return null;
    }
    if(stock==='L'){
      if(prefix==='LT'&&!matches.length)return 1;
      for(const m of matches){const size=Number(m[1].replace(',','.'));const key=m[2];
        if(['LITRO','LITROS','LT','LTS','L'].includes(key))return size;
        if(['ML','MILILITRO','MILILITROS'].includes(key))return size/1000;
        if(key==='OZ')return size*0.0295735295625;
      }
      return null;
    }
    return null;
  }
  function indexUsage(data){
    const ix=new Map();
    for(const entry of data?.motor02?.usage||[]){
      const id=String(entry.id);if(!ix.has(id))ix.set(id,[]);
      ix.get(id).push(entry);
    }
    return ix;
  }
  function getSeries(item,linkId,override,data,usageIndex,days=28){
    const last=cleanDate(data?.motor02?.asOf);
    if(!last||!linkId)return {valid:false,reason:'Artículo sin asociación al motor'};
    const records=usageIndex.get(String(linkId))||[];
    if(!records.length)return {valid:false,reason:'Este ID no tiene historial de uso'};
    const first=addDays(last,-days+1);const dayTotals=new Map(),obs=new Set(),unsupported=new Set(),unitSet=new Set();
    for(const entry of records){
      const date=cleanDate(entry.day);if(!date||date<first||date>last)continue;
      const unit=String(entry.unit||'');unitSet.add(unit);
      const factor=override?.factor!==undefined&&override?.factor!==null&&override.factor!==''?num(override.factor,null):unitFactor(item.unit,unit);
      if(!(factor>0)){unsupported.add(unit);continue;}
      const qty=Math.max(0,num(entry.qty,0))*factor;
      dayTotals.set(date,(dayTotals.get(date)||0)+qty);
      obs.add(date);
    }
    if(unsupported.size)return {valid:false,reason:'Conversión de unidad pendiente: '+[...unsupported].join(', '),units:[...unitSet]};
    const dates=Array.from({length:days},(_,i)=>addDays(last,i-days+1));
    const series=dates.map(date=>({date,value:dayTotals.get(date)||0}));
    const sum=(a)=>a.reduce((v,r)=>v+r.value,0);
    const recent=sum(series.slice(-7))/7,previous=sum(series.slice(-14,-7))/7,historical=sum(series)/days;
    const w=Math.max(0,Math.min(1,num(data?._recentWeight,70)/100));
    return {valid:true,series,recent,previous,historical,forecast:w*recent+(1-w)*historical,daysObserved:obs.size,units:[...unitSet],first,last};
  }
  function derive(item, state, usageIndex){
    const cfg={...DEFAULTS,...state.settings};const o=state.overrides?.[item.sap]||{};
    const linkId=(o.usageId!==undefined)?String(o.usageId||''):String(item.autoLink||'');
    const manual=o.manual!==undefined&&o.manual!==null&&o.manual!=='';
    const stock=stockFromPdf(item,o),inbound=Math.max(0,num(o.inbound,0));
    const context={...state.data,_recentWeight:cfg.recentWeight};
    const series=getSeries(item,linkId,o,context,usageIndex);
    let daily=manual?Math.max(0,num(o.manual,0)):(series.valid?Math.max(0,series.forecast):null);
    const shortageReasons=[];
    if(stock===null)shortageReasons.push('Conciliar piezas y kg/L del inventario');
    if(['L','KG'].includes(item.unit)&&!o.stockVerified)shortageReasons.push('Validar stock convertido a '+item.unit);
    if(daily===null)shortageReasons.push(series.reason||'Capturar consumo diario');
    if(!manual && linkId && !o.confirmed)shortageReasons.push('Confirmar artículo del Motor 02');
    if(!manual && series.valid && series.daysObserved<3)shortageReasons.push('Historial insuficiente: requiere validación');
    const min=daily==null?null:round(daily*(num(cfg.leadDays)+num(cfg.safetyDays)),item.unit);
    const max=daily==null?null:round(daily*(num(cfg.leadDays)+num(cfg.cycleDays)+num(cfg.safetyDays)),item.unit);
    const coverage=stock!==null&&daily>0?stock/daily:(daily===0?Infinity:null);
    const defaultMultiple=['PZA','UND','ST'].includes(item.unit)?1:.001;
    const multiple=(num(o.multiple,defaultMultiple)>0)?num(o.multiple,defaultMultiple):defaultMultiple;
    const position=stock===null?null:stock+inbound;
    if(['L','KG'].includes(item.unit)&&daily>0&&position!==null&&position<=min&&max>position&&!(num(o.multiple,null)>0))shortageReasons.push('Definir múltiplo de compra en '+item.unit);
    const ready=shortageReasons.length===0;
    let order=ready?0:null;
    if(ready && position<=min && daily>0){
      order=Math.max(0,Math.ceil((max-position-1e-9)/multiple)*multiple);
      order=Math.round(order*1e6)/1e6;
    }
    const status=!ready?'pendiente':order>0?'pedido':'listo';
    const source=manual?'manual':(linkId&&series.valid?'motor':'sin-historial');
    return {item,override:o,linkId,daily,stock,inbound,position,min,max,coverage,order,status,source,ready,reasons:shortageReasons,series,multiple,manual};
  }
  root.WOECore={DEFAULTS,n,num,norm,dayFromExcel,addDays,format,stockFromPdf,unitFactor,indexUsage,getSeries,derive,round};
  if(typeof module==='object'&&module.exports)module.exports=root.WOECore;
})(typeof window!=='undefined'?window:globalThis);
