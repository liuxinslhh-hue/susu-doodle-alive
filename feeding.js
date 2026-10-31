/* Feeding story state. No recognition: the player chooses what the drawing means. */
(function(root){
  'use strict';
  const foods={
    rice:{name:'饭团',color:'#5f806a',label:'软乎乎',title:'饭团肚肚',lines:['嚼嚼……怎么连肚子都变圆了。','再吃一口。就一口。','我不是胖，是你画的饭团太香。']},
    chili:{name:'辣椒',color:'#df6b50',label:'会喷火',title:'喷火小怪',lines:['这口有点——呼！我会喷火了？！','知道很辣，还是想再挑战一次。','嘴：不要。手：再来一根。']},
    lemon:{name:'柠檬',color:'#c4a13c',label:'酸到变形',title:'酸成一团',lines:['酸酸酸！我的脸要皱成一团了。','你画得挺甜，吃起来怎么这么酸。','刚才那个表情……不许笑！']}
  };
  function create(){
    let count=0,seen=new Set(),perKind={rice:0,chili:0,lemon:0},current=null;
    function sample(t){
      if(!current)return{phase:'hungry',kind:null,progress:0,strength:0,count,discovered:seen.size,all:seen.size===3};
      const elapsed=t-current.at,phase=elapsed<.75?'flying':elapsed<4.75?'reacting':'settled';
      return{phase,kind:current.kind,progress:Math.max(0,Math.min(1,elapsed/.75)),strength:phase==='reacting'?Math.min(1,(elapsed-.75)/.22,Math.max(0,(4.75-elapsed)/.6)):0,count,discovered:seen.size,all:seen.size===3,line:current.line,newTaste:current.newTaste,at:current.at};
    }
    return{
      sample,
      feed(kind,t){if(!Object.prototype.hasOwnProperty.call(foods,kind)||!Number.isFinite(t)||['flying','reacting'].includes(sample(t).phase))return null;const newTaste=!seen.has(kind);seen.add(kind);const index=perKind[kind]++%foods[kind].lines.length;count++;current={kind,at:t,line:foods[kind].lines[index],newTaste};return sample(t);},
      reset(){count=0;seen=new Set();perKind={rice:0,chili:0,lemon:0};current=null;},
      collection(){return Object.keys(foods).filter(kind=>seen.has(kind));}
    };
  }
  const api={foods,create};if(typeof module!=='undefined')module.exports=api;else root.DoodleFeeding=api;
})(typeof window!=='undefined'?window:this);
