/* Sugerencias por similitud de texto. No equipara SAP e IDArticulo por número. */
(function(root){
'use strict';
const replacement=[
 ['XMAS','NAVIDAD'],['XM','NAVIDAD'],['NAVIDENA','NAVIDAD'],['NAVIDENO','NAVIDAD'],
 ['JARABE','SYRUP'],['SALSA','SAUCE'],['AVELLANA','HAZELNUT'],['VAINILLA','VANILLA'],['CHOCOLATE','CHOCO'],
 ['COCO','COCONUT'],['ALMENDRA','ALMOND'],['CARAMELO','CARAMEL'],['BLANCO','WHITE'],
 ['FRAMBUESA','RASPBERRY'],['DOBLE','DOUBLE'],['NARANJA','ORANGE'],['QUESO','CHEESE'],
 ['CANELA','CINNAMON'],['LECHE','MILK'],['AZUCAR','SUGAR'],['PASTEL','CAKE'],['CREMA','CREAM'],
 ['BOLSA','BAG'],['FAJILLA','SLEEVE']
];
const stop=new Set('PZA KG L UND ST NAL BEBF BEBC ECOF COMPOST SBX SD IFC MAP NUEVO NUEVA BTE BTL BOT PQT CJ CJA BIS MEX MX MOD ORGANIC LOCAL NACIONAL EMP P C DE D DEL CON S Y EN PARA REF BOL PACK NO O N BEBIDA SABOR CARTON'.split(' '));
function tokens(input){
 let s=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 s=s.replace(/\b\d{4,7}\b/g,' ');
 s=s.replace(/\bCJ\s*\d+\s*(?:PZA?S?|BOL|BOT|BTL|BLISTER|UND|SOB|REB|B)?/g,' ');
 s=s.replace(/\bC\d+[BP]\b/g,' ');
 s=s.replace(/\b\d+(?:[.,]\d+)?\s*(?:KG|GR|ML|LT|LTS|LB|OZ|PZA?S?|UND|REB|SOB|BOL)\b/g,' ');
 s=s.replace(/[^A-Z ]/g,' ');
 for(const [from,to] of replacement)s=s.replace(new RegExp('\\b'+from+'\\b','g'),to);
 return s.split(/\s+/).filter(v=>v.length>=2&&!stop.has(v));
}
function dice(a,b){if(a===b)return 100;if(a.length<2||b.length<2)return 0;
 const grams=new Map();for(let i=0;i<a.length-1;i++){const g=a.slice(i,i+2);grams.set(g,(grams.get(g)||0)+1);}
 let matches=0;for(let i=0;i<b.length-1;i++){const g=b.slice(i,i+2),n=grams.get(g)||0;if(n){matches++;grams.set(g,n-1);}}
 return 200*matches/(a.length+b.length-2);
}
function suggest(item,catalog){
 const a=tokens(item.name),A=new Set(a);if(!a.length)return [];
 const aSort=[...a].sort().join(' '), aString=a.join(' '),hasSeason=A.has('NAVIDAD');
 const candidates=[];
 for(const u of catalog){
  const b=tokens(u.name),B=new Set(b);if(!b.length)continue;
  const overlap=[...A].filter(t=>B.has(t)).length;
  const cover=100*overlap/Math.max(A.size,B.size);
  let score=.25*dice(aString,b.join(' '))+.35*dice(aSort,[...b].sort().join(' '))+.4*cover;
  if(hasSeason!==B.has('NAVIDAD'))score-=20;
  if(!overlap)score=Math.min(score,20);
  if(overlap===1&&(A.size>1||B.size>1))score=Math.min(score,67);
  if(score>0)candidates.push({id:String(u.id),name:u.name,usageUnit:u.usageUnit,score:Math.round(score*10)/10});
 }
 return candidates.sort((x,y)=>y.score-x.score).slice(0,4);
}
root.WOEMatcher={tokens,suggest};
if(typeof module==='object'&&module.exports)module.exports=root.WOEMatcher;
})(typeof window!=='undefined'?window:globalThis);
