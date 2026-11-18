import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivities } from '../js/seed.js';
import { areaInfo, eventCheck, hoursChangedSince } from '../js/hours.js';
import { eventFacilityName } from '../js/config.js';
import * as store from '../js/store.js';

const now=new Date(2026,10,18), actor={name:'Marketing'};
const byId=(list,id)=>list.find(a=>a.id===id);
const taco=a=>byId(a.areas,'taco-bell');
function reset(role='marketing') {
  store.reset(now);
  store.pref('staff',true);
  store.pref('role',role);
  return store.activity('bowling');
}
const save=draft=>store.saveActivity('bowling','areas',draft,actor,now);

test('all 12 activities seed independent hours and holiday closures for their areas',()=>{
  const activities=buildActivities(now);
  assert.deepEqual(Object.fromEntries(activities.map(a=>[a.id,a.areas.length])),{
    bowling:5,club:6,fitness:2,outdoor:4,itt:2,community:3,arts:4,auto:3,youth:4,library:1,pet:1,lodging:1,
  });
  assert.deepEqual(byId(activities,'bowling').areas.map(a=>a.name),['Lanes',"Papa Joe's",'Taco Bell','Slots','Pro Shop']);
  for(const a of activities)for(const area of a.areas)assert.deepEqual(area.info.closures,a.info.closures.filter(c=>c.closed));
});

test('version-1 upgrade seeds missing areas and preserves deliberately empty areas',()=>{
  const activities=buildActivities(now);
  delete byId(activities,'bowling').areas;
  byId(activities,'club').areas=[];
  const saved=store.upgrade({version:1,activities},now);
  assert.equal(saved.version,1);
  assert.equal(taco(byId(saved.activities,'bowling')).name,'Taco Bell');
  assert.deepEqual(byId(saved.activities,'club').areas,[]);
});

test('Marketing validates, adds, renames and removes areas with history only',()=>{
  const a=reset(), info=areaInfo(a.info,true);
  for(const name of [' taco BELL ','   ','x'.repeat(61)])assert.ok(save({name,info}).errors['area-name']);
  assert.equal(save({name:' Car Wash '}).activity,a);
  const car=byId(a.areas,'car-wash');
  assert.deepEqual(car.info,info);
  assert.notEqual(car.info.week,a.info.week);
  assert.deepEqual(a.history.at(-1).changes,['Area added: Car Wash']);
  assert.equal(save({areaId:car.id,name:'Car Wash'}).unchanged,true);
  save({areaId:car.id,name:'Wash Bay'});
  assert.equal(byId(a.areas,car.id).name,'Wash Bay');
  assert.deepEqual(a.history.at(-1).changes,['Area renamed: Car Wash → Wash Bay']);
  save({areaId:car.id,remove:true});
  assert.equal(byId(a.areas,car.id),undefined);
  assert.deepEqual(a.history.at(-1).changes,['Area removed: Wash Bay']);
  assert.equal(store.notices().length,1);
  assert.equal(store.mail().length,1);
});

test('assigned manager edits validate the same hours and create a notice and mail',()=>{
  const a=reset('mgrA'), area=taco(a), info=structuredClone(area.info), draft={areaId:area.id,name:area.name,info};
  info.week[6][0][1]='08:00';
  assert.ok(save(draft).errors['h-sat']);
  info.week[6][0][1]='18:00';
  const line='Taco Bell · Sat: 10:30–20:00 → 10:30–18:00';
  assert.equal(save(draft).activity,a);
  assert.deepEqual(a.history.at(-1).changes,[line]);
  assert.deepEqual(store.notices().at(-1).changes,[line]);
  assert.deepEqual(store.mail().at(-1).lines,[line]);
  assert.ok(hoursChangedSince(a,'2026-01-01',area.id));
  assert.equal(eventCheck(taco(a).info,{date:'2026-11-22'}).level,'closed');
  assert.equal(eventCheck(a.info,{date:'2026-11-22'}).level,'');
});

test('other managers cannot add, edit or remove an area',()=>{
  const a=reset('mgrB'), area=taco(a);
  for(const draft of [{name:'Arcade'},{areaId:area.id,name:'Kiosk'},{areaId:area.id,remove:true}])assert.deepEqual(save(draft),{blocked:true});
  assert.equal(a.areas.length,5);
});

test('area selection is validated and removed areas retain the saved request name',()=>{
  const a=reset();
  const invalid=store.add({event:{facilityId:'fitness',areaId:'taco-bell'}},now).event;
  assert.equal(invalid.areaId,'');
  const event=store.add({event:{facilityId:a.id,areaId:taco(a).id}},now).event;
  assert.equal(event.areaName,'Taco Bell');
  save({areaId:event.areaId,remove:true});
  assert.equal(eventFacilityName(event),'Bowling Center — Taco Bell');
  assert.equal(eventFacilityName({...event,areaName:''}),'Bowling Center');
  save({name:'Taco Bell'});
  assert.notEqual(a.areas.at(-1).id,event.areaId);
});

test('area count stops at 30',()=>{
  const a=reset();
  for(let i=a.areas.length;i<30;i++)assert.equal(save({name:'Sample '+i}).activity,a);
  assert.ok(save({name:'One too many'}).errors['area-name']);
  assert.equal(a.areas.length,30);
});
