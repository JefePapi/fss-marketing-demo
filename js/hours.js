// Pure activity hours, validation and change records. Sunday is index zero.
import { MANAGERS } from './config.js';
import { addDays, diffDays, parseYmd, ymd, DAYS, MONTHS, isYmd } from './model.js';
export const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
const copy = x => structuredClone(x);
const trim = x => String(x ?? '').trim();
const day = s => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`; };
export const rangesText = r => r?.length ? r.map(x => x.join('–')).join(', ') : 'Closed';
export const closureText = c => `${day(c.date)}${c.to && c.to !== c.date ? '–'+day(c.to) : ''}: ${c.label}${c.closed ? '' : ', '+rangesText(c.ranges)}`;
export const specialText = s => `${s.title} (${day(s.from)}–${day(s.to || s.from)})${s.text ? ': '+s.text : ''}`;
function normalizeHours(info) {
  const ranges = r => (r || []).map(x=>x.map(trim)).sort((a,b)=>a[0].localeCompare(b[0]));
  return {
    week:Array.from({length:7},(_,i)=>ranges(info.week?.[i])),
    closures:(info.closures || []).map(c=>({...c,to:c.to || '',label:trim(c.label),ranges:c.closed ? [] : ranges(c.ranges)})).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),
  };
}
export const areaInfo = (info, blank=false) => ({
  ...normalizeHours(info),phone:blank?'':trim(info.phone),notes:blank?'':trim(info.notes),
});
export function normalize(a = {}) {
  const n = { id:'', name:'', section:'', archived:false, managers:[], updated:{at:'',by:''}, history:[], ...copy(a) };
  n.info = {location:'',description:'',phone:'',email:'',notes:'',week:Array.from({length:7},()=>[]),closures:[],specials:[],...n.info};
  for (const k of ['name','section']) n[k] = trim(n[k]);
  for (const k of ['location','description','phone','email','notes']) n.info[k] = trim(n.info[k]);
  n.managers = [...new Set(n.managers)].sort();
  Object.assign(n.info,normalizeHours(n.info));
  n.areas=(n.areas || []).map(a=>({id:a.id,name:trim(a.name),info:areaInfo(a.info)}));
  n.info.specials = n.info.specials.map(s=>({...s,title:trim(s.title),text:trim(s.text),to:s.to || s.from})).sort((a,b)=>a.from.localeCompare(b.from)||a.id.localeCompare(b.id));
  n.history = n.history.slice(-50);
  return n;
}
export function hoursOn(info, date) {
  const c = info.closures.find(c=>c.date <= date && (c.to || c.date) >= date);
  const ranges = c ? c.closed ? [] : c.ranges : info.week[parseYmd(date).getDay()];
  return {closed:!ranges.length,ranges,label:c?.label || '',special:!!c && !c.closed};
}
export function eventCheck(info, event, you = true) {
  const out = {level:'',text:'',near:[]};
  if (!info || !isYmd(event?.date)) return out;
  const end = event.endDate > event.date ? event.endDate : event.date;
  const count = Math.max(1,Math.min(31,diffDays(end,event.date)+1));
  const days = Array.from({length:count},(_,i)=>hoursOn(info,addDays(event.date,i)));
  out.near = info.closures.filter(c=>c.date <= addDays(end,7) && (c.to || c.date) >= addDays(event.date,-7));
  const closed = days.filter(d=>d.closed).length, whose = you ? 'your' : 'the';
  if (closed) return {...out,level:'closed',text:count>1 ? `Closed on ${closed} of ${whose} ${count} event days` : `Closed on ${whose} event day (${days[0].label || 'closed every '+DAYS[parseYmd(event.date).getDay()]})`};
  const outside=days.find(d=>!d.ranges.some(([o,c])=>event.start>=o && event.start<c && (!event.end || event.end<=c)));
  if (!event.allDay && event.start && outside) return {...out,level:'outside',text:`${you ? 'Your' : 'The'} event time is outside open hours that day (${rangesText(outside.ranges)})`};
  if(event.allDay || !event.start)return out;
  return {...out,level:'ok',text:`Open on ${whose} event day: ${rangesText(days[0].ranges)}`};
}
const validDate = s => isYmd(s) && ymd(parseYmd(s)) === s;
function rangeError(r) {
  if (!r.length) return '';
  if (r.length > 2 || r.some(x=>x.length!==2 || x.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))) return 'Add an opening time, or tick Closed.';
  if (r.some(([o,c])=>c<=o)) return 'Closing time must be after opening time.';
  const sorted = [...r].sort((a,b)=>a[0].localeCompare(b[0]));
  return sorted.length>1 && sorted[1][0]<sorted[0][1] ? 'The second opening overlaps the first.' : '';
}
export function validatePart(part, draft, others = []) {
  const e = {}, info = draft.info || draft;
  if (part==='hours') (info.week || []).forEach((r,i)=>{const m=rangeError(r);if(m)e['h-'+DAY_KEYS[i]]=m;});
  if (part==='closures') (info.closures || []).forEach((c,k,rows)=>{
    const p='c-'+k;
    if(!validDate(c.date)) e[p+'-date']='Choose the date.';
    if(c.to && (!validDate(c.to)||c.to<c.date)) e[p+'-to']='The last day must be on or after the first day.';
    if(!trim(c.label)) e[p+'-label']='Add a label, like Closed for Thanksgiving.';
    if(c.date && rows.some((x,j)=>j!==k && x.date<= (c.to || c.date) && (x.to || x.date)>=c.date)) e[p]='There is already an entry for that day.';
    if(!c.closed) {const m=!c.ranges?.length ? 'Add an opening time, or tick Closed.' : rangeError(c.ranges);if(m)e[p]=m;}
  });
  if(part==='specials') (info.specials || []).forEach((s,k)=>{
    const p='p-'+k;
    if(!trim(s.title))e[p+'-title']='Give the special a title.';
    if(!validDate(s.from))e[p+'-from']='Choose the first day.';
    if(!validDate(s.to)||s.to<s.from)e[p+'-to']='The last day must be on or after the first day.';
  });
  if(part==='details' && trim(info.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trim(info.email)))e['a-email']='Add an email like name@example.com.';
  if(part==='admin') {
    if(!trim(draft.name))e['a-name']='Give the activity a name.';
    else if(others.some(a=>a.id!==draft.id && a.name.trim().toLowerCase()===trim(draft.name).toLowerCase()))e['a-name']='That name is already used.';
  }
  return e;
}
const managerNames = ids => ids.map(id=>MANAGERS.find(m=>m.id===id)?.name || id).join(', ');
export function diffActivity(before, after) {
  const a=normalize(before), b=normalize(after), lines=[]; let hours=false;
  const line=(label,x,y)=>{if(x!==y)lines.push(`${label}: ${x || 'blank'} → ${y || 'blank'}`);};
  a.info.week.forEach((r,i)=>{const n=lines.length;line(DAY_KEYS[i][0].toUpperCase()+DAY_KEYS[i].slice(1),rangesText(r),rangesText(b.info.week[i]));if(lines.length>n)hours=true;});
  for(const [key,fmt,prefix] of [['closures',closureText,''],['specials',specialText,'special: ']]) {
    const old=a.info[key], next=b.info[key], start=lines.length;
    old.forEach(x=>{if(!next.some(y=>y.id===x.id))lines.push('Removed '+prefix+fmt(x));});
    next.forEach(x=>{const prev=old.find(y=>y.id===x.id);if(!prev)lines.push('Added '+prefix+fmt(x));else if(fmt(prev)!==fmt(x))lines.push('Changed '+prefix+fmt(prev)+' → '+fmt(x));});
    if(key==='closures' && lines.length>start)hours=true;
  }
  for(const [k,label] of [['phone','Phone'],['email','Email'],['location','Location'],['description','Description'],['notes','Notes for marketing']])line(label,a.info[k],b.info[k]);
  line('Name',a.name,b.name);line('Section',a.section,b.section);line('Managers',managerNames(a.managers),managerNames(b.managers));line('Archived',a.archived?'Yes':'No',b.archived?'Yes':'No');
  return {lines,hours};
}
export const canEdit = (ctx,a,part) => !!ctx.staff || !!(ctx.staffSide && ctx.manager && a?.managers.includes(ctx.manager.id) && part!=='admin');
export function applyEdit(activity, part, draft, actor, atIso, staffIds) {
  const next=normalize(activity), info=draft.info || draft;
  if(part==='areas')next.areas=draft.areas;
  else if(part==='admin')for(const k of ['name','section','managers','archived'])next[k]=copy(draft[k]);
  else for(const k of part==='hours'?['week']:part==='details'?['location','description','phone','email','notes']:[part])next.info[k]=copy(info[k]);
  const clean=normalize(next), diff=diffActivity(activity,clean), {lines}=diff;
  let hours=diff.hours;
  if(part==='areas') {
    for(const old of activity.areas)if(!clean.areas.some(a=>a.id===old.id)){lines.push('Area removed: '+old.name);hours=true;}
    for(const area of clean.areas) {
      const old=activity.areas.find(a=>a.id===area.id);
      if(!old)lines.push('Area added: '+area.name);
      else {
        if(old.name!==area.name)lines.push(`Area renamed: ${old.name} → ${area.name}`);
        const change=diffActivity(old,area);
        hours=hours || change.hours;
        lines.push(...change.lines.filter(line=>!line.startsWith('Name: ')).map(line=>area.name+' · '+line));
      }
    }
  }
  if(!lines.length)return null;
  const entry={at:atIso,by:actor.name,role:actor.role,hours,changes:lines,...(part==='areas'?{areaId:draft.areaId}:{})};
  clean.updated={at:atIso,by:actor.name};clean.history=[...clean.history,entry].slice(-50);Object.assign(activity,clean);
  const base={at:atIso,activityId:activity.id,by:actor.name,changes:lines};
  return {entry,notice:actor.role==='manager'?{...base,activityName:activity.name,read:false}:null,mail:actor.role==='manager'?{at:atIso,trigger:'activity-updated',activityId:activity.id,to:staffIds.map(id=>id+'@example.com'),cc:[],subject:`${activity.name}: updated by ${actor.name} — would email marketing`,lines}:null};
}
export const hoursChangedSince = (a,iso,areaId='') => !!a?.history.some(e=>e.hours && e.at>iso && (e.areaId || '')===areaId);
