import test from 'node:test';
import assert from 'node:assert/strict';
import { reports, overallStatus, detailLines, calendarEvents, calWindow, ymd, addDays } from '../js/model.js';
import { autoOwner, merge, resolve, ccError, matchesEmail, received, ownerEmail, requesterEmail } from '../js/actions.js';
import { buildSeeds } from '../js/seed.js';
import { toCSV, requestRows, toICS, exportRows } from '../js/export.js';

test('On hold stays open, closed requester wording wins, mixed states keep precedence',()=>{
 const req=(...statuses)=>({jobs:statuses.map(status=>({status}))});
 assert.equal(overallStatus(req('onhold','done','declined')),'onhold');
 assert.equal(overallStatus(req('onhold','waiting')),'waiting');
 assert.equal(overallStatus(req('onhold','inprogress')),'inprogress');
 assert.equal(overallStatus(req('onhold','new')),'new');
 assert.equal(overallStatus({...req('declined'),withdrawn:{}}),'withdrawn');
});
test('Per-size quantities and website answers remain readable',()=>{
 const pairs=detailLines({service:'print',details:{sizes:['A4','A3'],qty:{A4:50,A3:20}}},{});
 assert.deepEqual(pairs,[['Sizes','A4, A3'],['How many','A4: 50, A3: 20']]);
 assert.deepEqual(detailLines({service:'web',details:{url:'https://example.com',old:'old',new:'new'}},{}),[['Page address','https://example.com'],['Old text','old'],['New text','new']]);
});
test('Reports count last twelve months, lane status, owners, facility and surviving requests',()=>{
 const now=new Date(2026,10,17), rows=buildSeeds(now), report=reports(rows,now);
 assert.equal(report.month.length,12);assert.equal(report.month[0][0],'2025-12');assert.equal(report.month.at(-1)[0],'2026-11');
 assert.equal(report.facility.reduce((n,row)=>n+row[1],0),36);
 assert.equal(report.team.reduce((n,row)=>n+row.slice(1).reduce((a,b)=>a+b,0),0),rows.flatMap(r=>r.jobs).length);
 for(const [name,open,done]of report.staff) {assert.ok(name);assert.ok(open>=0);assert.ok(done>=0);}
 const tiny=[{submittedAt:'2026-11-01T00:00:00Z',kind:'other',event:{facilityId:''},jobs:[{team:'web',owner:'lena',status:'onhold'}]}];
 const exact=reports(tiny,now);
 assert.deepEqual(exact.month.at(-1),['2026-11',1]);assert.deepEqual(exact.team.at(-1),['Web',0,0,0,1,0,0]);assert.deepEqual(exact.staff.at(-1),['Lena Fischer',1,0]);assert.deepEqual(exact.facility.at(-1),['Non-event requests',1]);
 tiny[0].mergedInto='other';assert.equal(reports(tiny,now).month.at(-1)[1],0);
});
test('Non-event and merged requests never enter any calendar format',()=>{
 const now=new Date(2026,10,17), win=calWindow(now), r=buildSeeds(now)[0];
 const other={...r,id:'OTHER',kind:'other',event:{title:'Sample web change'}};
 const merged={...r,id:'MERGED',mergedInto:r.id};
 assert.equal(calendarEvents([other,merged],win).length,0);
 assert.equal(exportRows([other,merged],win,{},true).filter(x=>x.kind==='event').length,0);
 assert.ok(!toICS([other,merged],win,now).includes('BEGIN:VEVENT'));
});
test('Seeds keep counts while providing overdue and due-soon work every day',()=>{
 for(const now of [new Date(2026,0,1),new Date(2026,11,31),new Date(2028,1,29)]) {
  const rows=buildSeeds(now),today=ymd(now),open=rows.flatMap(r=>r.jobs).filter(j=>!['done','declined'].includes(j.status));
  assert.equal(rows.length,36);assert.ok(open.filter(j=>j.due<today).length>=2);assert.ok(open.filter(j=>j.due>=today && j.due<=addDays(today,7)).length>=2);
  assert.ok(rows.some(r=>r.priority==='critical'));assert.ok(rows.some(r=>r.priority==='high'));
 }
});
test('Auto assignment counts open work only, honors team and STAFF tie order',()=>{
 const lane={team:'design'};
 assert.equal(autoOwner([],lane),'maya');
 const rows=[{jobs:[{owner:'maya',status:'new'},{owner:'taylor',status:'done'}]}];
 assert.equal(autoOwner(rows,lane),'taylor');
 assert.equal(autoOwner(rows,{team:'web'}),'lena');
 rows[0].mergedInto='X';assert.equal(autoOwner(rows,lane),'maya');
});
test('Cc validation and case-insensitive lookup include followers',()=>{
 assert.equal(ccError('a@example.com, b@example.com'),'');assert.ok(ccError('bad'));assert.ok(ccError(Array(6).fill('a@example.com').join(',')));
 const r={requester:{email:'one@example.com'},cc:['two@example.com']};
 assert.ok(matchesEmail(r,'TWO@EXAMPLE.COM'));assert.ok(matchesEmail(r,'ONE@example.com'));assert.ok(!matchesEmail(r,'three@example.com'));
});
test('Email log has receipt Cc, staff-opened receipt, team recipients and owner triggers',()=>{
 const r={id:'SAMPLE',event:{title:'Sample'},requester:{email:'person@example.com'},cc:['follower@example.com'],jobs:[{team:'design',owner:'maya'}],openedBy:'Maya Chen'};
 received(r);assert.equal(r.outbox[0].trigger,'opened-for-you');assert.deepEqual(r.outbox[0].cc,['follower@example.com']);assert.deepEqual(r.outbox[1].to,['maya@example.com','taylor@example.com']);
 ownerEmail(r,r.jobs[0]);ownerEmail(r,r.jobs[0],'reminder');requesterEmail(r,'resend');
 assert.deepEqual(r.outbox.map(x=>x.trigger),['opened-for-you','new-work','assigned','reminder','resend']);assert.ok(r.outbox.every(x=>x.at && x.subject));
});
test('Merge preserves files, thread lane references, distinct services and reciprocal links',()=>{
 const source={id:'A',jobs:[{id:'j1',service:'flash'},{id:'j2',service:'print'}],thread:[{jobId:'j1',text:'Flash question'},{jobId:'j2',text:'Print reply'}],files:[{id:'file'}],outbox:[{trigger:'received'}],related:['C'],log:[],newReply:true};
 const target={id:'B',jobs:[{id:'j1',service:'print'}],thread:[],log:[]};
 const linked={id:'C',related:['A'],jobs:[]};const rows=[source,target,linked];merge(source,target,rows);
 assert.equal(source.mergedInto,'B');assert.equal(resolve(rows,'A'),target);assert.deepEqual(target.jobs.map(x=>x.service),['print','flash']);
 assert.equal(target.thread[0].jobId,'j2');assert.equal(target.thread[1].jobId,'j1');assert.equal(target.files[0].id,'file');assert.equal(target.outbox[0].trigger,'received');assert.deepEqual(linked.related,['B']);assert.deepEqual(target.related,['C']);assert.ok(target.newReply);assert.ok(target.log.some(l=>l.text==='Merged from A'));
});
test('Request-list CSV retains fixed columns, multiple lanes and formula neutralizing',()=>{
 const rows=buildSeeds(new Date(2026,10,17));rows[0].event.title='=SAMPLE()';rows[0].cc=['one@example.com'];
 const built=requestRows([rows[0]]),csv=toCSV(built);
 assert.equal(built[0].cells.length,22);assert.equal(built[1].cells.length,22);assert.equal(built[0].cells[0],'Request #');assert.ok(csv.includes("'=SAMPLE()"));assert.ok(csv.includes('one@example.com'));assert.ok(csv.includes('Maya Chen; Maya Chen'));
});
