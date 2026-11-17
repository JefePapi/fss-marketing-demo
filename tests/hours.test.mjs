import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_KEYS, rangesText, hoursOn, eventCheck, validatePart, normalize, diffActivity, applyEdit, hoursChangedSince, canEdit } from '../js/hours.js';
import { buildActivities } from '../js/seed.js';
import { FACILITIES, MANAGERS, activities, facility, setActivities, STAFF } from '../js/config.js';
import { ymd, addDays } from '../js/model.js';
import * as store from '../js/store.js';
const now=new Date(2026,10,17), at=now.toISOString(), actor={name:'Avery Lane',role:'manager'};
const fresh=()=>buildActivities(now)[0], clone=x=>structuredClone(x), change=(fn,a=fresh())=>{const b=clone(a);fn(b);return [a,b];};
const event=(extra={})=>({date:'2026-11-22',start:'09:00',end:'10:00',...extra});
test('rangesText shows Closed, one range and two ranges',()=>{
 assert.equal(rangesText([]),'Closed');assert.equal(rangesText([['10:00','18:00']]),'10:00–18:00');assert.equal(rangesText([['10:00','13:00'],['14:00','18:00']]),'10:00–13:00, 14:00–18:00');
});
test('hoursOn uses the weekly row for the weekday, Sunday first',()=>{
 const a=fresh();assert.deepEqual(DAY_KEYS,['sun','mon','tue','wed','thu','fri','sat']);assert.equal(rangesText(hoursOn(a.info,'2026-11-22').ranges),'08:00–18:00');assert.equal(rangesText(hoursOn(a.info,'2026-11-23').ranges),'05:00–22:00');
});
test('hoursOn: a closure on the date wins over weekly hours',()=>assert.equal(hoursOn(fresh().info,'2026-11-26').closed,true));
test('hoursOn: special hours and a multi-day closure',()=>{
 const a=fresh();assert.equal(rangesText(hoursOn(a.info,'2026-12-24').ranges),'09:00–13:00');a.info.closures.push({date:'2026-12-30',to:'2027-01-02',closed:true,label:'Sample'});assert.equal(hoursOn(a.info,'2027-01-01').label,'Sample');
});
test('eventCheck: closed day, outside hours, inside hours, all-day, multi-day count',()=>{
 const i=fresh().info;assert.match(eventCheck(i,event({date:'2026-11-26'})).text,/Closed on your event day/);assert.equal(eventCheck(i,event({start:'23:00'})).level,'outside');assert.equal(eventCheck(i,event()).level,'ok');assert.equal(eventCheck(i,event({allDay:true,start:'23:00'})).level,'');assert.equal(eventCheck(i,event({start:''})).level,'');assert.equal(eventCheck(i,event({date:'2026-11-25',endDate:'2026-11-27'})).text,'Closed on 1 of your 3 event days');assert.match(eventCheck(i,event({date:'2026-11-26'}),false).text,/the event day/);
 const a=buildActivities(now).find(a=>a.id==='auto');assert.match(eventCheck(a.info,event()).text,/closed every Sunday/);
});
test('eventCheck lists closures within 7 days of the event',()=>{
 assert.equal(eventCheck(fresh().info,event({date:'2026-11-19'})).near.length,1);assert.equal(eventCheck(fresh().info,event({date:'2026-11-18'})).near.length,0);
});
test('validatePart hours: close after open, both times needed, overlap, touching ranges allowed',()=>{
 const check=r=>Object.values(validatePart('hours',{week:[r]}));assert.deepEqual(check([['10:00','09:00']]),['Closing time must be after opening time.']);assert.deepEqual(check([['10:00','']]),['Add an opening time, or tick Closed.']);assert.deepEqual(check([['10:00','14:00'],['13:00','18:00']]),['The second opening overlaps the first.']);assert.deepEqual(check([['10:00','14:00'],['14:00','18:00']]),[]);
});
test('validatePart closures: date and label required, end before start, duplicate day, special hours need valid ranges',()=>{
 const check=closures=>validatePart('closures',{closures});assert.equal(Object.keys(check([{date:'',label:'',closed:true}])).length,2);assert.ok(check([{date:'2026-11-23',to:'2026-11-22',label:'x',closed:true}])['c-0-to']);assert.ok(check([{date:'2026-11-23',to:'2026-11-25',label:'x',closed:true},{date:'2026-11-24',label:'y',closed:true}])['c-1']);assert.ok(check([{date:'2026-11-23',label:'x',closed:false,ranges:[]}])['c-0']);assert.ok(check([{date:'2026-02-30',label:'x',closed:true}])['c-0-date']);
});
test('validatePart specials, details and admin: title, dates, email, name, duplicate name',()=>{
 assert.equal(Object.keys(validatePart('specials',{specials:[{title:'',from:'',to:''}]})).length,3);assert.ok(validatePart('details',{email:'bad'})['a-email']);assert.deepEqual(validatePart('details',{email:''}),{});assert.ok(validatePart('admin',{name:''})['a-name']);assert.ok(validatePart('admin',{id:'new',name:' Fitness Center '},buildActivities(now))['a-name']);
});
test('diffActivity: weekly change, closed to open, second range added',()=>{
 const [a,b]=change(b=>{b.info.week[6]=[['08:00','16:00']];b.info.week[0]=[];b.info.week[1]=[['10:00','13:00'],['14:00','18:00']];});assert.deepEqual(diffActivity(a,b),{lines:['Sun: 08:00–18:00 → Closed','Mon: 05:00–22:00 → 10:00–13:00, 14:00–18:00','Sat: 08:00–18:00 → 08:00–16:00'],hours:true});assert.equal(diffActivity(b,a).lines[0],'Sun: Closed → 08:00–18:00');
});
test('diffActivity: closure added, removed, changed; specials; scalar fields; managers; archived',()=>{
 const [a,b]=change(b=>{b.info.closures.find(c=>c.id==='c3').ranges=[['09:00','12:00']];b.info.closures.shift();b.info.closures.push({id:'new',date:'2026-11-28',to:'2026-11-30',label:'Sample',closed:true,ranges:[]});b.info.specials.push({id:'p',title:'Offer',from:'2026-12-01',to:'2026-12-31',text:''});b.info.phone='sample';b.info.email='new@example.com';b.info.location='B';b.info.description='C';b.info.notes='D';b.name='Name';b.section='NEW';b.managers.push('mgrB');b.archived=true;});
 const d=diffActivity(a,b);assert.ok(d.lines.includes('Removed 26 Nov: Closed for Thanksgiving'));assert.ok(d.lines.includes('Added 28 Nov–30 Nov: Sample'));assert.ok(d.lines.includes('Changed 24 Dec: Holiday hours, 09:00–13:00 → 24 Dec: Holiday hours, 09:00–12:00'));assert.ok(d.lines.includes('Added special: Offer (1 Dec–31 Dec)'));assert.ok(d.lines.includes('Managers: Avery Lane → Avery Lane, Bo Kim'));assert.ok(d.lines.includes('Archived: No → Yes'));for(const label of ['Phone','Email','Location','Description','Notes for marketing','Name','Section'])assert.ok(d.lines.some(x=>x.startsWith(label+':')));
 const c=clone(b);c.info.specials[0].title='New offer';assert.match(diffActivity(b,c).lines[0],/^Changed special:/);assert.match(diffActivity(c,a).lines.find(x=>x.startsWith('Removed special')),/New offer/);
});
test('diffActivity returns no lines for the same data in a different order or with extra spaces',()=>{
 const [a,b]=change(b=>{b.name=' '+b.name+' ';b.info.location+=' ';b.info.closures.reverse();b.managers.reverse();});assert.deepEqual(diffActivity(a,b),{lines:[],hours:false});
});
test('applyEdit by a manager returns history, notice and would-email entry and sets updated',()=>{
 const [a,b]=change(b=>{b.info.week[6]=[];});const r=applyEdit(a,'hours',b,actor,at,STAFF.map(s=>s.id));assert.equal(r.entry.hours,true);assert.equal(r.notice.read,false);assert.ok(r.mail.to.includes('maya@example.com'));assert.equal(a.updated.at,at);assert.equal(a.history.length,1);
});
test('applyEdit by marketing returns history only',()=>{
 const [a,b]=change(b=>{b.info.location='Changed';});const r=applyEdit(a,'details',b,{...actor,role:'marketing'},at,[]);assert.equal(r.notice,null);assert.equal(r.mail,null);assert.equal(r.entry.hours,false);
});
test('applyEdit with no change returns null and leaves updated alone',()=>{
 const a=fresh(), before=clone(a);assert.equal(applyEdit(a,'hours',clone(a),actor,at,[]),null);assert.deepEqual(a,before);
});
test('hoursChangedSince is true only for hours or closure changes after the given time',()=>{
 const a=fresh();a.history=[{at,hours:true}];assert.equal(hoursChangedSince(a,'2020'),true);assert.equal(hoursChangedSince(a,at),false);a.history[0].hours=false;assert.equal(hoursChangedSince(a,'2020'),false);
});
const dates=[new Date(2026,10,17),new Date(2026,11,1),new Date(2027,0,31),new Date(2026,11,31),new Date(2028,1,29)];
test('activity seeds: 12 with the facility ids, example.com emails, no phone-shaped numbers except the sample text',()=>{
 for(const date of dates){const list=buildActivities(date);assert.deepEqual(list.map(a=>a.id),FACILITIES.map(a=>a.id));for(const a of list){assert.equal(a.info.email,a.id+'@example.com');assert.equal(a.info.phone,'DSN 000-0000 (sample)');}assert.doesNotMatch(JSON.stringify(list).replaceAll('DSN 000-0000 (sample)',''),/\d{3}[-.\s]\d{4}/);}
});
test('seeded closures are today or later on every test date',()=>{for(const date of dates)for(const a of buildActivities(date))for(const c of a.info.closures)assert.ok(c.date>=ymd(date));});
test('seeded managers: A and B are the only demo roles and every activity has a manager',()=>{assert.deepEqual(MANAGERS.filter(m=>m.demo).map(m=>m.id),['mgrA','mgrB']);assert.ok(buildActivities(now).every(a=>a.managers.length));});
test('store.upgrade adds activities, notices and mail to old saved state and keeps requests and counter',()=>{
 const saved={version:1,counter:900,requests:[{id:'old'}]}, before=clone(saved), next=store.upgrade(saved,now);assert.deepEqual(saved,before);assert.equal(next.counter,900);assert.deepEqual(next.requests,saved.requests);assert.equal(next.activities.length,12);assert.deepEqual(next.notices,[]);assert.deepEqual(next.mail,[]);assert.ok(next.activities.every(a=>!a.history.length));
});
test('store.upgrade fills missing fields on a half-built activity',()=>{
 const next=store.upgrade({activities:[{id:'half',name:'Half',info:{phone:'sample'}}]},now).activities[0];assert.equal(next.info.week.length,7);assert.deepEqual(next.info.closures,[]);assert.equal(next.info.phone,'sample');assert.deepEqual(next.managers,[]);
});
test('facility() still names an archived activity; reset restores the 12',()=>{
 setActivities([{id:'old',name:'Old name',archived:true}]);assert.equal(facility('old').name,'Old name');store.reset(now);assert.equal(activities().length,12);assert.equal(store.notices().length,1);
});
test('store enforces role ownership, validation, unique ids, caps and no-op saves',()=>{
 store.reset(now);store.pref('staff',true);store.pref('role','mgrA');const a=store.activity('fitness'), b=clone(a);b.info.week[6]=[];
 assert.equal(store.saveActivity('club','hours',b,actor,now).blocked,true);assert.equal(store.saveActivity('fitness','admin',b,actor,now).blocked,true);assert.equal(store.saveActivity('fitness','hours',b,actor,now).activity.id,'fitness');assert.equal(store.notices().length,2);assert.equal(store.saveActivity('fitness','hours',b,actor,now).unchanged,true);
 for(let i=0;i<105;i++){const d=clone(a);d.info.location='Sample '+i;store.saveActivity('fitness','details',d,actor,new Date(now.getTime()+i));}assert.equal(a.history.length,50);assert.equal(store.notices().length,100);assert.equal(store.mail().length,100);
 store.pref('role','marketing');const draft=normalize({name:'New',managers:['mgrB']});const r=store.saveActivity('new','admin',draft,{name:'Maya Chen'},now);assert.equal(r.activity.id,'new-2');
 const c=clone(a);c.info.closures.push({id:'draft-1',date:addDays(ymd(now),100),to:'',label:'Sample',closed:true,ranges:[]});store.saveActivity('fitness','closures',c,{name:'Maya Chen'},now);assert.equal(new Set(a.info.closures.map(c=>c.id)).size,a.info.closures.length);
 store.pref('staff',false);assert.equal(store.saveActivity('fitness','hours',b,actor,now).blocked,true);assert.equal(canEdit({staff:false,staffSide:true,manager:MANAGERS[0]},store.activity('club'),'hours'),false);store.reset(now);
});
