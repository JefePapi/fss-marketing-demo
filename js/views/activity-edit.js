import { h, page, field, input, textarea, toast } from '../ui.js';
import { MANAGERS } from '../config.js';
import { DAY_KEYS, normalize, areaInfo, canEdit } from '../hours.js';
import { DAYS } from '../model.js';
import * as store from '../store.js';
let state=null, rowSeq=0;
export const dropActivityDraft = () => {state=null;};
export function activityEdit(ctx, a, part, areaId='') {
  const areas=part==='areas', existing=areas && a?.areas.find(x=>x.id===areaId);
  const id=a?.id || 'new', key=id+'/'+part+'/'+areaId;
  if(!['hours','closures','specials','details','admin','areas'].includes(part) || !canEdit(ctx,a,part))return page(h('h1',{tabindex:-1},'Edit activity'),h('p',{id:'edit-blocked',class:'note'},'You cannot edit this activity in this demo role.'));
  if(areas && areaId && !existing)return page(h('h1',{tabindex:-1},'Area not found'));
  if(state?.key!==key)state={key,draft:areas
    ? {areaId,name:existing?.name || '',info:areaInfo(existing?.info || a.info,!existing)}
    : normalize(a),errors:{},unchanged:false};
  const d=state.draft, errors=state.errors;
  const redraw=()=>ctx.refresh();
  const button=(id,text,fn)=>h('button',{type:'button',class:'btn',id,onclick:fn},text);
  const text=(id,label,obj,k,type='text')=>field(id,label,(k==='description'||k==='notes'||k==='text'?textarea:input)(id,...(k==='description'||k==='notes'||k==='text'?[obj[k],e=>{obj[k]=e.target.value;},{maxlength:1000}]:[type,obj[k],e=>{obj[k]=e.target.value;},{maxlength:200}])),errors[id]);
  const check=(id,label,value,fn)=>h('label',{class:'choice small'},h('input',{type:'checkbox',id,checked:value,onchange:e=>fn(e.target.checked)}),h('span',null,label));
  function rangesEditor(prefix,ranges,closed,setClosed) {
    const times=h('div',{class:'stack',hidden:closed});
    const draw=()=>{
      times.replaceChildren(...ranges.map((r,j)=>h('div',{class:'two'},...['o','c'].map((k,i)=>field(`${prefix}-${k}${j+1}`,i?'Closes':'Opens',input(`${prefix}-${k}${j+1}`,'time',r[i],e=>{r[i]=e.target.value;}))))),
        ranges.length<2?button(prefix+'-add2','Add a second opening',()=>{ranges.push(['','']);draw();}):button(prefix+'-rm2','Remove second opening',()=>{ranges.splice(1);draw();}));
    };draw();
    return [check(prefix+'-closed','Closed all day',closed,v=>{setClosed(v);if(!v && !ranges.length)ranges.push(['','']);times.hidden=v;draw();}),times,
      h('p',{class:'err',id:prefix+'-err'},errors[prefix] || '')];
  }
  let body=[];
  if(part==='hours' || areas) {
    body.push(...DAY_KEYS.map((day,i)=>{
      const r=d.info.week[i], cache=r.length?r:[['','']];
      return h('section',{class:'card stack'},h('h2',null,DAYS[i]),rangesEditor('h-'+day,cache,!r.length,v=>{d.info.week[i]=v?[]:cache;}));
    }));
    body.push(button('h-copy-weekdays','Copy Monday to Tue–Fri',()=>{for(let i=2;i<=5;i++)d.info.week[i]=structuredClone(d.info.week[1]);redraw();}));
  }
  if(part==='closures' || areas) {
    if(areas)body.push(h('h2',null,'Closures and special hours'));
    body.push(...d.info.closures.map((c,k)=>{
      const p='c-'+k;
      return h('section',{class:'card stack','data-test':'closure-row'},text(p+'-date','First day',c,'date','date'),text(p+'-to','Last day (optional)',c,'to','date'),text(p+'-label','Label',c,'label'),rangesEditor(p,c.ranges,c.closed,v=>{c.closed=v;}),button(p+'-remove','Remove closure',()=>{d.info.closures.splice(k,1);redraw();}));
    }));
    body.push(button('closure-add','Add closure or special hours',()=>{d.info.closures.push({id:'draft-'+ ++rowSeq,date:'',to:'',label:'',closed:true,ranges:[]});redraw();}));
  }
  if(part==='specials') {
    body=d.info.specials.map((s,k)=>h('section',{class:'card stack','data-test':'special-row'},text(`p-${k}-title`,'Title',s,'title'),text(`p-${k}-from`,'First day',s,'from','date'),text(`p-${k}-to`,'Last day',s,'to','date'),text(`p-${k}-text`,'Details',s,'text'),h('p',{id:`p-${k}-err`,class:'err'},errors['p-'+k] || ''),button(`p-${k}-remove`,'Remove special',()=>{d.info.specials.splice(k,1);redraw();})));
    body.push(button('special-add','Add special',()=>{d.info.specials.push({id:'draft-'+ ++rowSeq,title:'',from:'',to:'',text:''});redraw();}));
  }
  if(areas) {
    body.unshift(text('area-name','Area name',d,'name'),h('h2',null,'Weekly hours'));
    body.push(text('a-phone','Phone (sample)',d.info,'phone'),text('a-notes','Notes for marketing',d.info,'notes'));
  }
  if(part==='details')body=['location','description','phone','email','notes'].map(k=>h('div',null,text('a-'+k,k==='notes'?'Notes for marketing':k[0].toUpperCase()+k.slice(1),d.info,k),['phone','email'].includes(k)&&h('p',{class:'hint'},'Demo: made-up details only')));
  if(part==='admin')body=[text('a-name','Name',d,'name'),text('a-section','Section',d,'section'),h('fieldset',{class:'stack'},h('legend',null,'Managers'),MANAGERS.map(m=>check('a-mgr-'+m.id,m.name,d.managers.includes(m.id),v=>{d.managers=d.managers.filter(id=>id!==m.id);if(v)d.managers.push(m.id);}))),check('a-archived','Archived',d.archived,v=>{d.archived=v;})];
  function save() {
    const result=store.saveActivity(id,part,d,ctx.actor,ctx.now);
    state.errors=result.errors || {};state.unchanged=!!result.unchanged;
    if(result.activity){state=null;toast(ctx.manager?'Saved. Marketing was notified (demo: nothing is sent).':'Saved.');ctx.go('#/activities/'+result.activity.id);return;}
    redraw();
    const first=Object.keys(state.errors)[0];
    const el=document.getElementById(first) || document.getElementById(first+'-o1') || document.getElementById('edit-errors');el?.focus();
  }
  return page(h('h1',{tabindex:-1},`${areas?(existing?'Edit area':'Add area'):id==='new'?'Add activity':'Edit '+part}: ${a?.name || 'New activity'}`),h('p',{class:'note'},'Demo: made-up information only. Nothing is sent.'),
    h('div',{id:'edit-errors',role:'alert',tabindex:-1},Object.values(errors).length ? h('p',{class:'note warn'},'Check the fields below. '+[...new Set(Object.values(errors))].join(' ')) : null),
    state.unchanged && h('p',{id:'no-changes',class:'note'},'Nothing changed, so nothing was saved.'),h('div',{id:'activity-editor',class:'stack'},body),
    h('div',{class:'row'},button(areas?'area-save':'activity-save','Save',save),h('a',{class:'btn',id:'activity-cancel',href:a?'#/activities/'+a.id:'#/activities',onclick:()=>{state=null;}},'Cancel')));
}
