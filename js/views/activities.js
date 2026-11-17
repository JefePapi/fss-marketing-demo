import { h, page, facts } from '../ui.js';
import { activities, MANAGERS } from '../config.js';
import { ymd, parseYmd, DAYS, fmtStamp } from '../model.js';
import { DAY_KEYS, rangesText, hoursOn, eventCheck, closureText, specialText, canEdit } from '../hours.js';
import * as store from '../store.js';
import { activityEdit } from './activity-edit.js';
const names = a => a.managers.map(id=>MANAGERS.find(m=>m.id===id)?.name || id).join(', ');
export const updatedText = a => a.updated.at ? `Last updated ${fmtStamp(a.updated.at).split(',')[0]} by ${a.updated.by}` : 'Not updated yet';
export function hoursCheck(a,event,you=true) {
  const c=eventCheck(a?.info,event,you);
  return c.text ? h('p',{class:c.level==='ok'?'note':'note warn','data-test':c.level==='ok'?'hours-ok':'hours-warning','data-level':c.level},c.text) : null;
}
export function activityBrief(a, {event, today=ymd(new Date()), staff=false, checkLine=true} = {}) {
  if(!a?.info)return h('p',null,'No activity information listed.');
  const check=eventCheck(a.info,event || {date:today},!staff), hours=hoursOn(a.info,event?.date || today);
  return h('div',{class:'stack'},
    event && checkLine && hoursCheck(a,event,!staff),
    h('p',{id:'activity-info-hours'},`${event?'That day':'Today'}: ${rangesText(hours.ranges)}${hours.label?' · '+hours.label:''}`),
    check.near.map(c=>h('p',{'data-test':'closure-near'},closureText(c))),
    a.info.specials.filter(s=>s.to>=today).map(s=>h('p',null,specialText(s))),
    facts([['Location',a.info.location],['Phone',a.info.phone],['Email',a.info.email],['About',a.info.description],staff && ['Notes for marketing',a.info.notes],staff && ['Managers',names(a)]]),
    h('p',{class:'sub'},updatedText(a)),h('a',{href:'#/activities/'+a.id},a.name+': hours and info'));
}
export function requestActivityInfo(a,event,today) {
  if(!a?.info)return [];
  return [hoursCheck(a,event),h('details',{id:'activity-info','data-test':'activity-info'},h('summary',null,a.name+': hours and info'),activityBrief(a,{event,today,checkLine:false}))].filter(Boolean);
}
function cards(list,ctx) {
  return list.map(a=>h('a',{class:'card link-card',href:'#/activities/'+a.id,'data-test':'activity-card','data-activity':a.id},
    h('strong',null,a.name),h('span',null,`Today: ${rangesText(hoursOn(a.info,ymd(ctx.now)).ranges)}`),
    ctx.staffSide && h('span',{class:'sub'},names(a)),a.archived && h('span',{class:'pill','data-test':'activity-archived'},'Archived')));
}
export function managerView(ctx) {
  return page(h('h1',{tabindex:-1},'My activities'),h('p',{class:'note'},'Demo: sample activities and managers.'),
    ctx.manager ? h('div',{id:'my-activities',class:'stack'},cards(activities().filter(a=>!a.archived && a.managers.includes(ctx.manager.id)),ctx)) : h('p',{id:'pick-role'},'Turn on Staff view and pick a manager role to see My activities.'));
}
export function activitiesView(ctx) {
  const id=ctx.parts[1];
  if(!id)return page(h('h1',{tabindex:-1},'Activities'),h('p',{class:'note'},'Demo: made-up hours and contact details.'),
    ctx.staff && h('a',{class:'btn',id:'activity-add',href:'#/activities/new'},'Add activity'),h('div',{class:'stack'},cards(activities().filter(a=>ctx.staff || !a.archived),ctx)));
  const a=store.activity(id);
  if(id==='new' || ctx.parts[2]==='edit')return activityEdit(ctx,a,id==='new'?'admin':ctx.parts[3]);
  if(!a)return page(h('h1',{tabindex:-1},'Activity not found'));
  const today=ymd(ctx.now), on=hoursOn(a.info,today);
  return page(h('h1',{id:'activity-name',tabindex:-1},a.name),h('p',{class:'note'},'Demo: made-up hours and contact details.'),
    a.archived && h('span',{id:'activity-archived',class:'pill'},'Archived'),
    h('p',{id:'activity-today'},on.closed?'Closed today':`Open today: ${rangesText(on.ranges)}`),
    h('section',{class:'surface stack'},h('h2',null,'Weekly hours'),h('table',{id:'activity-hours'},h('tbody',null,DAY_KEYS.map((key,i)=>h('tr',{'data-day':key,'data-today':parseYmd(today).getDay()===i?'1':null},h('th',{scope:'row'},DAYS[i]),h('td',null,rangesText(a.info.week[i]))))))),
    h('section',{class:'surface stack',id:'activity-closures'},h('h2',null,'Closures and special hours'),a.info.closures.filter(c=>(c.to || c.date)>=today).map(c=>h('p',{'data-test':'closure'},closureText(c))),!a.info.closures.some(c=>(c.to || c.date)>=today) && h('p',null,'None listed')),
    h('section',{class:'surface stack',id:'activity-specials'},h('h2',null,'Specials'),a.info.specials.filter(s=>s.to>=today).map(s=>h('p',{'data-test':'special'},specialText(s))),!a.info.specials.some(s=>s.to>=today) && h('p',null,'None listed')),
    h('section',{class:'surface',id:'activity-contact'},h('h2',null,'Contact and details'),facts([['Location',a.info.location],['Phone',a.info.phone],['Email',a.info.email],['About',a.info.description]])),
    ctx.staffSide && h('p',{id:'activity-notes'},'Notes for marketing: '+a.info.notes),ctx.staffSide && h('p',{id:'activity-managers'},'Managers: '+names(a)),
    h('p',{id:'activity-updated'},updatedText(a)),
    h('div',{class:'row wrap'},['hours','closures','specials','details','admin'].filter(part=>canEdit(ctx,a,part)).map(part=>h('a',{class:'btn',id:'edit-'+part,href:`#/activities/${a.id}/edit/${part}`},part==='admin'?'Name and managers':'Edit '+part))),
    ctx.staffSide && h('details',{id:'activity-history'},h('summary',null,'Change history'),[...a.history].reverse().map(e=>h('div',{class:'card','data-test':'history-entry'},h('p',null,`${fmtStamp(e.at)} · ${e.by}`),e.changes.map(line=>h('p',{'data-test':'change-line'},line))))));
}
