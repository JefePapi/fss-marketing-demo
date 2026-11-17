import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const year=String(new Date().getFullYear()).slice(2);
const seed=n=>`MKT-${year}-${String(n).padStart(4,'0')}`;
const sample=seed(106), second=seed(107);
const dateIn=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const $=(p,id)=>p.locator('#'+id);
const file={name:'sample.txt',mimeType:'text/plain',buffer:Buffer.from('Sample attachment bytes. <b>Plain text</b>')};
async function shell(p){await expect($(p,'demo-banner')).toBeVisible();await expect($(p,'site-footer')).toBeVisible();}
async function start(p){await p.goto('./#/request');await $(p,'fill-sample').click();}
async function step3(p){await start(p);await $(p,'btn-next').click();await $(p,'btn-next').click();}
async function send(p,services=['print']){await step3(p);for(const s of services)await $(p,'svc-'+s).check();await $(p,'btn-next').click();await $(p,'btn-send').click();await expect($(p,'confirmation-number')).toBeVisible();return (await $(p,'confirmation-number').textContent()).trim();}
async function staff(p,id=sample){await p.goto('./#/staff/'+id);await expect($(p,'staff-request-id')).toHaveText(id);}
async function status(p,id=sample){await p.goto('./#/status/'+id);await expect($(p,'status-id')).toHaveText(id);}
async function queue(p){await p.goto('./#/staff?show=all');await expect(p.locator('[data-test="queue-card"]').first()).toBeVisible();}
async function pick(p,id){await $(p,id).setInputFiles(file);await expect(p.locator('[data-test="file-item"]').last()).toContainText(file.name);}
async function download(p,action){const promise=p.waitForEvent('download');await action();const d=await promise;return {name:d.suggestedFilename(),bytes:await readFile(await d.path())};}
async function other(p,kind='web'){await p.goto('./#/other');await $(p,'o-kind-'+kind).check();for(const [k,v] of Object.entries({name:'Morgan Sample',email:'morgan@example.com',title:'Sample notice',text:'Sample notice wording'}))await $(p,'o-'+k).fill(v);if(kind==='web')for(const [k,v]of Object.entries({url:'https://example.com/page',old:'Old sample text',new:'New sample text'}))await $(p,'o-'+k).fill(v);}
async function reply(p,text='Sample staff reply',note=false){await $(p,'thread-text').fill(text);await $(p,note?'btn-note':'btn-reply').click();await expect(p.locator('[data-test="thread-'+(note?'note':'reply')+'"]').last()).toContainText(text);}
async function requesterReply(p){await status(p);await $(p,'status-message').fill('Final sample wording');await $(p,'status-send').click();}
async function withdraw(p){await status(p);await $(p,'withdraw-open').click();await $(p,'withdraw-reason').fill('No longer needed (sample)');await $(p,'withdraw-confirm').click();await expect(p.locator('#status-id').locator('..').locator('..')).toContainText('You closed this request');}
async function mergeRequests(p){await staff(p);await $(p,'merge-into').fill(second);await $(p,'merge-go').click();await $(p,'confirm-yes').click();await expect($(p,'merged-note')).toHaveText(`Request ${sample} was merged into ${second}`);}
async function emailEntry(p,trigger){await expect(p.locator(`[data-test="email-entry"][data-trigger="${trigger}"]`).last()).toBeVisible();}
async function print(p,route){await p.addInitScript(()=>{window.print=()=>{window.__printed=true;};});await p.goto('./#/'+route);await $(p,'print-request').click();await expect.poll(()=>p.evaluate(()=>window.__printed)).toBe(true);}

async function scenario(id,p){
  switch(id){
    case 'R01': await p.goto('./#/');await $(p,'start-request').click();await expect($(p,'step-1')).toBeVisible();await shell(p);break;
    case 'R02': await start(p);await $(p,'btn-next').click();await $(p,'f-facilityId').selectOption('library');await $(p,'btn-next').click();await $(p,'svc-calonly').check();await $(p,'btn-next').click();await expect($(p,'step-4')).toContainText('Library');break;
    case 'R03': await start(p);await $(p,'f-name').fill('Avery Sample');await $(p,'f-email').fill('avery@example.com');await $(p,'btn-next').click();await $(p,'btn-back').click();await expect($(p,'f-name')).toHaveValue('Avery Sample');await expect($(p,'f-email')).toHaveValue('avery@example.com');await expect($(p,'f-phone')).toHaveValue('');break;
    case 'R04': {await start(p);await $(p,'f-cc').fill('invalid');await $(p,'btn-next').click();await expect($(p,'f-cc-err')).toBeVisible();await $(p,'f-cc').fill('a@example.com,b@example.com,c@example.com,d@example.com,e@example.com,f@example.com');await $(p,'btn-next').click();await expect($(p,'f-cc-err')).toContainText('at most 5');await $(p,'f-cc').fill('follower@example.com');await $(p,'btn-next').click();await $(p,'btn-next').click();await $(p,'svc-flash').check();await $(p,'btn-next').click();await $(p,'btn-send').click();const n=await $(p,'confirmation-number').textContent();await expect($(p,'email-preview')).toContainText('follower@example.com');await status(p,n);await expect($(p,'app')).toContainText('follower@example.com');await staff(p,n);await expect($(p,'facts')).toContainText('follower@example.com');await p.goto('./#/status');await $(p,'status-number').fill(n);await $(p,'status-email').fill('FOLLOWER@EXAMPLE.COM');await $(p,'status-go').click();await expect($(p,'status-id')).toHaveText(n);break;}
    case 'R05':await start(p);await $(p,'f-email').fill('sample@exmaple.com');await expect($(p,'email-suggest')).toHaveText('Did you mean sample@example.com?');await $(p,'email-suggest').click();await expect($(p,'f-email')).toHaveValue('sample@example.com');await $(p,'f-email').fill('sample@gmial.com');await $(p,'btn-next').click();await expect($(p,'step-2')).toBeVisible();break;
    case 'R06':await start(p);await $(p,'btn-next').click();await $(p,'f-title').fill('Sample new title');await $(p,'f-description').fill('<b>Plain sample description</b>');await $(p,'btn-next').click();await $(p,'svc-calonly').check();await $(p,'btn-next').click();await expect($(p,'step-4')).toContainText('<b>Plain sample description</b>');await expect(p.locator('#step-4 b')).toHaveCount(0);break;
    case 'R07':await start(p);await $(p,'btn-next').click();await $(p,'f-date').fill(dateIn(80));await $(p,'f-multi').check();await $(p,'f-endDate').fill(dateIn(82));await $(p,'f-allDay').check();await $(p,'f-where').fill('Sample hall');await $(p,'f-cost').fill('Free sample');await $(p,'btn-next').click();await $(p,'svc-calonly').check();await $(p,'btn-next').click();await expect($(p,'step-4')).toContainText('Sample hall');await expect($(p,'step-4')).toContainText('All day');await expect($(p,'step-4')).toContainText('Free sample');break;
    case 'R08':await step3(p);await $(p,'svc-print').check();await $(p,'f-inHand').fill(dateIn(30));await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-staff').click();await expect(p.locator('[data-test="lane"][data-service="print"]')).toContainText('Needed in hand');await expect(p.locator('[data-test="lane-due"]')).toHaveValue(dateIn(30));break;
    case 'R09':await step3(p);await $(p,'svc-print').check();for(const [s,n]of [['A4','50'],['A3','20']]){await $(p,'f-sizes-'+s).check();await $(p,'f-qty-'+s.toLowerCase()).fill(n);}await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-staff').click();await expect($(p,'lanes')).toContainText('A4: 50, A3: 20');break;
    case 'R10':await step3(p);await $(p,'svc-sponsorship').check();await $(p,'f-breakEven').fill('100');await $(p,'f-cash').fill('500');await $(p,'f-items').fill('Sample prizes');await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-staff').click();for(const t of ['100','500','Sample prizes','250'])await expect($(p,'lanes')).toContainText(t);break;
    case 'R11':{const n=await send(p,['flash']);await $(p,'sent-staff').click();await expect(p.locator('[data-test="lane"][data-service="flash"]')).toBeVisible();await status(p,n);await expect(p.locator('[data-test="team-line"]')).toContainText('Flash');break;}
    case 'R12':await staff(p);await expect(p.locator('[data-test="lane-flashsection"]')).toHaveValue('Fitness');await p.locator('[data-test="lane-flashsection"]').selectOption('Library');await $(p,'history').click();await expect($(p,'history')).toContainText('Flash section changed to Library');break;
    case 'R13':case 'R14':{await p.goto('./#/');await $(p,'start-other').click();await other(p,id==='R13'?'flash':'web');await $(p,'o-send').click();const n=await $(p,'confirmation-number').textContent();await expect($(p,'sent-calendar')).toHaveCount(0);await $(p,'sent-staff').click();await expect(p.locator('[data-test="lane"]')).toHaveCount(1);await expect($(p,'lanes')).toContainText(id==='R13'?'Flash':'Old sample text');await status(p,n);await expect($(p,'status-details')).toContainText('Sample notice wording');await p.goto('./#/calendar?view=list');await expect(p.locator(`[data-test="cal-event"][data-request="${n}"]`)).toHaveCount(0);break;}
    case 'R15':await step3(p);await $(p,'svc-print').check();await pick(p,'f-files');await p.locator('[data-test="file-item"] button').click();await expect(p.locator('[data-test="file-item"]')).toHaveCount(0);await pick(p,'f-files');await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-status').click();await expect(p.locator('[data-test="attachment"]')).toContainText('sample.txt');await p.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('Storage denied');}});});await p.goto('./#/request');await p.reload();await $(p,'fill-sample').click();await $(p,'btn-next').click();await $(p,'btn-next').click();await pick(p,'f-files');await expect($(p,'app')).toContainText('bytes stay in memory for this page view only');break;
    case 'R16':await step3(p);await expect($(p,'file-limits')).toContainText('25 files, 15 MB');await $(p,'f-files').setInputFiles({name:'blocked.exe',mimeType:'application/octet-stream',buffer:Buffer.from('no')});await expect($(p,'f-files-err')).toContainText('file type not allowed');await $(p,'f-files').setInputFiles({name:'large.txt',mimeType:'text/plain',buffer:Buffer.alloc(15*1024*1024+1)});await expect($(p,'f-files-err')).toContainText('exceeds 15 MB');await $(p,'f-files').setInputFiles(Array.from({length:26},(_,i)=>({...file,name:`sample-${i}.txt` })));await expect(p.locator('[data-test="file-item"]')).toHaveCount(25);await expect($(p,'f-files-err')).toContainText('max 25');break;
    case 'R17':{await step3(p);await $(p,'svc-print').check();await pick(p,'f-files');await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-status').click();await p.reload();const d=await download(p,()=>p.locator('[data-test="attachment-download"]').click());expect(d.name).toBe(file.name);expect(d.bytes.equals(file.buffer)).toBe(true);await p.goto('./#/staff/'+seed(142));const staffFile=await download(p,()=>p.locator('[data-test="attachment-download"]').click());expect(staffFile.bytes.equals(file.buffer)).toBe(true);break;}
    case 'R20':await step3(p);await $(p,'svc-flash').check();await $(p,'btn-next').click();await $(p,'f-website').fill('bot',{force:true});await $(p,'btn-send').click();await expect($(p,'send-refused')).toHaveText('Something went wrong. Please try again.');await expect($(p,'confirmation-number')).toHaveCount(0);await other(p);await $(p,'f-website').fill('bot',{force:true});await $(p,'o-send').click();await expect($(p,'send-refused')).toBeVisible();break;
    case 'R22':await start(p);await $(p,'btn-next').click();await $(p,'f-date').fill(dateIn(20));await expect(p.locator('[data-test="lead-note"]')).toHaveAttribute('data-late','1');await $(p,'btn-next').click();await $(p,'svc-flash').check();await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-staff').click();await expect($(p,'app')).toContainText('Late request');break;
    case 'R23':await p.goto('./#/request');await $(p,'f-name').fill('Kept Sample');await $(p,'btn-next').click();await expect($(p,'f-email-err')).toBeVisible();await expect($(p,'f-name')).toHaveValue('Kept Sample');await p.reload();await expect($(p,'f-name')).toHaveValue('Kept Sample');await $(p,'f-email').fill('kept@example.com');await $(p,'btn-next').click();await $(p,'btn-back').click();await expect($(p,'f-name')).toHaveValue('Kept Sample');break;
    case 'R24':await step3(p);await $(p,'svc-print').check();await $(p,'btn-next').click();await $(p,'btn-send').dblclick({noWaitAfter:true}).catch(()=>{});await expect($(p,'confirmation-number')).toHaveText(seed(142));await p.reload();await expect($(p,'confirmation-number')).toHaveText(seed(142));await other(p);await $(p,'o-send').dblclick({noWaitAfter:true}).catch(()=>{});await expect($(p,'confirmation-number')).toHaveText(seed(143));break;
    case 'R25':await send(p,['print','flash','sponsorship']);await expect($(p,'confirmation-number')).toHaveText(seed(142));await expect(p.locator('[data-test="sent-team"]')).toHaveCount(3);await $(p,'copy-number').click();await expect($(p,'toast')).toBeVisible();break;
    case 'R26':{const n=await send(p);await expect($(p,'email-preview')).toContainText('Demo: nothing is sent');await expect($(p,'email-preview')).toContainText('jordan.hale@example.com');await staff(p,n);await emailEntry(p,'received');break;}
    case 'R27':await p.goto('./#/status');await $(p,'status-number').fill(sample);await $(p,'status-email').fill('wrong@example.com');await $(p,'status-go').click();await expect($(p,'not-found')).toBeVisible();await $(p,'status-email').fill('JORDAN.HALE@EXAMPLE.COM');await $(p,'status-go').click();await expect($(p,'status-id')).toHaveText(sample);break;
    case 'R29':case 'R30':await p.goto('./#/status');await $(p,'forgot-email').fill('jordan.hale@example.com');await $(p,'forgot-go').click();await expect(p.locator('[data-test="my-request"]').first()).toContainText(sample);await expect($(p,'app')).toContainText('In the real system we would email you this list.');await p.locator('[data-test="my-request"]').first().click();await expect($(p,'status-id')).toHaveText(sample);break;
    case 'R31':await status(p);await expect(p.locator('[data-test="team-line"]')).toHaveCount(3);await expect($(p,'needs-you')).toBeVisible();break;
    case 'R32':await status(p);await expect($(p,'status-details')).toContainText('sample community 5K');await expect(p.locator('[data-test="part-answers"]').first()).toContainText('A4: 50');await expect($(p,'status-dates')).toContainText('Sent:');await expect($(p,'status-dates')).toContainText('Last updated:');break;
    case 'R33':await staff(p);await reply(p,'Visible sample answer');await reply(p,'Hidden sample note',true);await status(p);await expect($(p,'app')).toContainText('Visible sample answer');await expect($(p,'app')).not.toContainText('Hidden sample note');break;
    case 'R34':case 'S17':await requesterReply(p);await expect($(p,'needs-you')).toHaveCount(0);await queue(p);await expect(p.locator(`[data-request="${sample}"] [data-test="new-reply"]`)).toHaveText('New reply');await staff(p);await expect(p.locator('[data-test="lane-status"][data-service="flash"]')).toHaveValue('inprogress');await emailEntry(p,'requester-replied');await queue(p);await expect(p.locator(`[data-request="${sample}"] [data-test="new-reply"]`)).toHaveCount(0);break;
    case 'R35':await status(p);await pick(p,'status-files');await $(p,'status-message').fill('Sample file for you');await $(p,'status-send').click();await expect(p.locator('[data-test="attachment"]')).toContainText('sample.txt');await staff(p);await expect(p.locator('[data-test="thread-reply"]').last()).toContainText('sample.txt');break;
    case 'R36':await withdraw(p);await staff(p);await expect($(p,'overall-status')).toContainText('Closed by requester');await expect($(p,'cal-status')).toHaveValue('cancelled');await emailEntry(p,'withdrawn');break;
    case 'R37':await withdraw(p);await $(p,'reopen').click();await expect($(p,'needs-you')).toBeVisible();await staff(p);await expect(p.locator('[data-test="lane-status"][data-service="flash"]')).toHaveValue('waiting');await expect($(p,'cal-status')).toHaveValue('good');break;
    case 'R38':await print(p,'status/'+sample);break;
    case 'R39':await staff(p);await $(p,'copy-requester-link').click();{const link=await $(p,'requester-link').inputValue();expect(link).toContain('#/status/'+sample);await p.goto('./#/status/'+sample);await expect($(p,'status-id')).toHaveText(sample);}break;
    case 'R40':await mergeRequests(p);await p.goto('./#/status/'+sample);await expect($(p,'status-id')).toHaveText(second);await expect($(p,'merged-note')).toHaveText(`Request ${sample} was merged into ${second}`);break;
    case 'R41':await staff(p);await reply(p);await emailEntry(p,'staff-reply');break;
    case 'R42':await staff(p,seed(121));await p.locator('[data-test="lane-status"]').selectOption('done');await emailEntry(p,'complete');break;
    case 'R45':await start(p);await $(p,'f-remember').check();await $(p,'f-cc').fill('remember@example.com');await $(p,'btn-next').click();await $(p,'btn-next').click();await $(p,'svc-flash').check();await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-another').click();await expect($(p,'f-email')).toHaveValue('jordan.hale@example.com');await expect($(p,'f-cc')).toHaveValue('remember@example.com');await $(p,'f-remember').uncheck();await $(p,'btn-next').click();await $(p,'f-facilityId').selectOption('library');await $(p,'f-title').fill('Second sample');await $(p,'f-description').fill('Sample.');await $(p,'f-date').fill(dateIn(90));await $(p,'f-start').fill('10:00');await $(p,'f-where').fill('Sample room');await $(p,'f-cost').fill('Free');for(const k of ['f-joint-no','f-signup-no','f-afConnect-no'])await p.locator('#'+k).check();await $(p,'btn-next').click();await $(p,'svc-flash').check();await $(p,'btn-next').click();await $(p,'btn-send').click();await $(p,'sent-another').click();await expect($(p,'f-email')).toHaveValue('');break;
    case 'R49':await p.goto('./#/');await expect($(p,'before-you-send')).toContainText('Sample wording');await expect($(p,'before-you-send')).toContainText('60 days');await expect($(p,'before-you-send')).toContainText('One round');await expect($(p,'before-you-send')).toContainText('final design');break;
    case 'S01':await p.goto('./#/');await $(p,'staff-toggle').click();await expect($(p,'acting-as')).toBeVisible();await $(p,'acting-as').selectOption('priya');await expect($(p,'acting-as')).toHaveValue('priya');await shell(p);break;
    case 'S03':await queue(p);await expect(p.locator('[data-test="queue-card"]')).toHaveCount(36);await p.locator(`[data-request="${sample}"]`).click();await expect($(p,'staff-request-id')).toHaveText(sample);break;
    case 'S04':await queue(p);await $(p,'team-flash').click();await expect(p.locator('[data-test="queue-card"]').first()).toContainText('Flash:');await expect(p.locator(`[data-request="${seed(121)}"]`)).toHaveCount(0);break;
    case 'S05':await queue(p);await $(p,'acting-as').selectOption('priya');await $(p,'show-mine').click();await expect(p.locator(`[data-request="${sample}"]`)).toBeVisible();await $(p,'show-unassigned').click();await expect(p.locator(`[data-request="${sample}"]`)).toBeVisible();await $(p,'show-open').click();await expect(p.locator(`[data-request="${seed(108)}"]`)).toHaveCount(0);await $(p,'show-all').click();await expect(p.locator(`[data-request="${seed(108)}"]`)).toBeVisible();break;
    case 'S06':await queue(p);await $(p,'team-flash').click();await $(p,'queue-status').selectOption('waiting');await expect(p.locator(`[data-request="${sample}"]`)).toBeVisible();await expect(p.locator(`[data-request="${second}"]`)).toHaveCount(0);break;
    case 'S07':await queue(p);await $(p,'queue-priority').selectOption('critical');await expect(p.locator('[data-test="queue-card"]')).toHaveCount(1);await expect(p.locator('[data-test="queue-card"]')).toContainText(sample);break;
    case 'S08':case 'S44':await queue(p);await $(p,'show-overdue').click();await expect(p.locator('[data-test="overdue"]').first()).toBeVisible();await expect(p.locator(`[data-request="${sample}"]`)).toBeVisible();await $(p,'show-duesoon').click();await expect(p.locator(`[data-request="${second}"]`)).toBeVisible();await staff(p);await expect(p.locator('#lanes [data-test="overdue"]')).toHaveCount(2);break;
    case 'S09':await staff(p);await reply(p,'Unique private search phrase',true);await queue(p);for(const term of ['Unique private search phrase','jordan.hale@example.com','Fitness Center','sample community 5K','Door prizes']){await $(p,'queue-search').fill(term);await expect(p.locator(`[data-request="${sample}"]`)).toBeVisible();}await $(p,'queue-search').fill('no-sample-match-xyz');await expect(p.locator('[data-test="queue-card"]')).toHaveCount(0);break;
    case 'S12':await staff(p,second);await p.locator('[data-test="lane-autoassign"]').click();await expect(p.locator('[data-test="lane-owner"][data-service="print"]')).not.toHaveValue('');await emailEntry(p,'assigned');await $(p,'history').click();await expect($(p,'history')).toContainText('auto-assigned');break;
    case 'S13':await staff(p);for(const owner of ['taylor','maya','']){await p.locator('[data-test="lane-owner"][data-service="print"]').selectOption(owner);await expect(p.locator('[data-test="lane-owner"][data-service="print"]')).toHaveValue(owner);}await $(p,'history').click();await expect($(p,'history')).toContainText('owner changed');break;
    case 'S14':{const n=await send(p,['print','flash','sponsorship']);await staff(p,n);await expect(p.locator('[data-test="lane"]')).toHaveCount(3);await p.locator('[data-test="lane-status"][data-service="print"]').selectOption('inprogress');await expect(p.locator('[data-test="lane-status"][data-service="flash"]')).toHaveValue('new');break;}
    case 'S16':await staff(p,seed(121));await p.locator('[data-test="lane-status"]').selectOption('onhold');await expect($(p,'overall-status')).toContainText('On hold');await status(p,seed(121));await expect($(p,'app')).toContainText('On hold');break;
    case 'S18':await staff(p,sample);await $(p,'req-priority').selectOption('low');await staff(p,second);await $(p,'req-priority').selectOption('critical');await $(p,'history').click();await expect($(p,'history')).toContainText('Priority changed to Critical');await queue(p);await expect(p.locator(`[data-request="${second}"]`)).toContainText('Critical');await expect(p.locator('[data-test="queue-card"]').first()).toHaveAttribute('data-request',second);break;
    case 'S20':await staff(p);await $(p,'thread-about').selectOption('j4');await reply(p,'Sample reply about Flash');await status(p);await expect($(p,'app')).toContainText('Sample reply about Flash');break;
    case 'S21':await staff(p);await $(p,'reply-noemail').check();await reply(p,'Quiet sample reply');await expect(p.locator('[data-trigger="staff-reply"]')).toHaveCount(0);await status(p);await expect($(p,'app')).toContainText('Quiet sample reply');break;
    case 'S22':await staff(p);await pick(p,'thread-files');await reply(p,'Sample reply file');await pick(p,'thread-files');await reply(p,'Sample note file',true);await expect(p.locator('[data-test="attachment"]')).toHaveCount(2);await status(p);await expect(p.locator('[data-test="attachment"]')).toHaveCount(1);break;
    case 'S23':await staff(p);await reply(p,'Private sample instructions',true);await status(p);await expect($(p,'app')).not.toContainText('Private sample instructions');break;
    case 'S25':await staff(p);await $(p,'thread-text').fill('Sample prefix');await $(p,'canned').selectOption('Proof attached');await expect($(p,'thread-text')).toHaveValue('Sample prefix\nProof attached');await expect($(p,'canned')).toHaveValue('');await $(p,'btn-reply').click();await expect(p.locator('[data-test="thread-reply"]').last()).toContainText('Proof attached');break;
    case 'S28':await queue(p);await p.goto('./#/request');await $(p,'fill-sample').click();await $(p,'f-bystaff').check();await $(p,'btn-next').click();await $(p,'btn-next').click();await $(p,'svc-print').check();await $(p,'btn-next').click();await $(p,'btn-send').click();await expect($(p,'email-preview')).toContainText('Staff opened this request for you');await $(p,'sent-staff').click();await expect($(p,'facts')).toContainText('Sent in by staff');await $(p,'history').click();await expect($(p,'history')).toContainText('Sent in by staff (Maya Chen)');break;
    case 'S29':await staff(p);await $(p,'facts-edit').click();await $(p,'f-title').fill('Revised sample event');await $(p,'f-date').fill(dateIn(95));await $(p,'facts-save').click();await expect($(p,'app').locator('h1')).toHaveText('Revised sample event');await $(p,'history').click();await expect($(p,'history')).toContainText('Title changed');await p.goto('./#/calendar?view=list');await expect(p.locator(`[data-test="cal-event"][data-request="${sample}"]`).first()).toContainText('Revised sample event');break;
    case 'S30':await staff(p);await $(p,'facts-edit').click();await $(p,'f-req-name').fill('Revised Sample');await $(p,'f-req-email').fill('revised@example.com');await $(p,'f-req-cc').fill('follower@example.com');await $(p,'facts-save').click();await expect($(p,'facts')).toContainText('Revised Sample');await $(p,'history').click();await expect($(p,'history')).toContainText('Requester email changed');await expect($(p,'history')).toContainText('Requester Cc changed');break;
    case 'S31':await staff(p);await p.locator('[data-test="lane-due"]').first().fill(dateIn(10));await p.locator('[data-test="lane-due"]').first().blur();await p.reload();await expect(p.locator('[data-test="lane-due"]').first()).toHaveValue(dateIn(10));break;
    case 'S32':await staff(p);await p.locator('[data-test="lane-move"]').first().selectOption('web');await p.locator('[data-test="lane-move-go"]').first().click();await expect(p.locator('[data-test="lane"][data-service="print"]')).toHaveCount(0);await expect(p.locator('[data-test="lane-owner"][data-service="web"]')).toHaveValue('');await emailEntry(p,'new-work');await $(p,'history').click();await expect($(p,'history')).toContainText('Moved from Flyers or posters to Website listing');break;
    case 'S33':await staff(p);await $(p,'add-part').selectOption('web');await $(p,'btn-add-part').click();await expect(p.locator('[data-test="lane"][data-service="web"]')).toBeVisible();await p.locator('[data-test="lane-status"][data-service="web"]').selectOption('declined');await p.locator('[data-test="lane-reason"]').fill('Duplicate sample work');await p.locator('[data-test="lane-reason"]').blur();await status(p);await expect($(p,'app')).toContainText('Duplicate sample work');break;
    case 'S34':await staff(p);await $(p,'related-input').fill(second);await $(p,'related-add').click();await expect(p.locator('[data-test="related-link"]')).toHaveText(second);await p.locator('[data-test="related-link"]').click();await expect(p.locator('[data-test="related-link"]')).toHaveText(sample);await p.locator('[data-test="related-link"]').locator('..').getByRole('button',{name:'Remove'}).click();await expect(p.locator('[data-test="related-link"]')).toHaveCount(0);await staff(p);await expect(p.locator('[data-test="related-link"]')).toHaveCount(0);break;
    case 'S35':await staff(p);await $(p,'merge-into').fill(sample);await $(p,'merge-go').click();await expect($(p,'merge-error')).toContainText('another existing');await mergeRequests(p);await queue(p);await expect(p.locator(`[data-request="${sample}"]`)).toHaveCount(0);await staff(p,second);await expect($(p,'lanes')).toContainText('Flash magazine');await expect($(p,'thread')).toContainText('Can you send two sentences');break;
    case 'S36':await staff(p);await $(p,'req-priority').selectOption('high');await $(p,'history').click();await expect($(p,'history')).toContainText('Priority changed to High');await expect($(p,'history')).toContainText('Maya Chen');break;
    case 'S37':await print(p,'staff/'+sample);break;
    case 'S38':await p.goto('./#/calendar');await $(p,'download-toggle').click();for(const [id,ext,needle]of [['export-csv','.csv','DAY '],['export-xls','.xls','<table'],['export-ics','.ics','BEGIN:VCALENDAR']]){const d=await download(p,()=>$(p,id).click());expect(d.name.endsWith(ext)).toBe(true);expect(d.bytes.toString()).toContain(needle);if(!(await $(p,id).isVisible()))await $(p,'download-toggle').click();}break;
    case 'S39':await queue(p);await $(p,'queue-priority').selectOption('critical');{const d=await download(p,()=>$(p,'export-requests').click());expect(d.name).toBe('requests-demo.csv');expect(d.bytes.toString()).toContain('Request #');expect(d.bytes.toString()).toContain(sample);expect(d.bytes.toString()).not.toContain(second);}break;
    case 'S41':await queue(p);await $(p,'go-reports').click();for(const id of ['report-month','report-team','report-staff','report-facility'])await expect($(p,id)).toBeVisible();await expect(p.locator('#report-month tbody tr')).toHaveCount(12);await expect($(p,'report-staff')).toContainText('Maya Chen');break;
    case 'S42':{const n=await send(p,['print']);await staff(p,n);await emailEntry(p,'new-work');await p.locator('[data-test="lane-owner"]').selectOption('maya');await emailEntry(p,'assigned');await status(p,n);await $(p,'status-message').fill('Sample owner message');await $(p,'status-send').click();await staff(p,n);await emailEntry(p,'requester-replied');break;}
    case 'S45':await staff(p);await p.locator('[data-test="lane-remind"]').first().click();await emailEntry(p,'reminder');await expect(p.locator('[data-trigger="reminder"]')).toContainText('maya@example.com');break;
    case 'S46':await staff(p);await $(p,'resend-receipt').click();await emailEntry(p,'resend');await expect(p.locator('[data-trigger="resend"]')).toContainText('jordan.hale@example.com');break;
    case 'S47':await staff(p,seed(107));await expect(p.locator('[data-test="other-request"]').first()).toBeVisible();await expect($(p,'other-requests')).not.toContainText(second);await p.locator('[data-test="other-request"]').first().click();await expect($(p,'staff-request-id')).not.toHaveText(second);break;
    case 'S60':await staff(p);await $(p,'cal-type').selectOption('Wing');await $(p,'cal-section').fill('DEMO');await $(p,'cal-section').blur();await p.reload();await expect($(p,'cal-section')).toHaveValue('DEMO');await expect($(p,'cal-type')).toHaveValue('Wing');await status(p);await expect($(p,'cal-type')).toHaveCount(0);await expect($(p,'cal-actual')).toHaveCount(0);break;
    default:throw new Error('Missing scenario '+id);
  }
}

test('R01 Open a request from a public web form, no account needed', async ({page}) => { await scenario('R01', page); });

test('R02 Choose the facility', async ({page}) => { await scenario('R02', page); });

test('R03 Give name, email and phone', async ({page}) => { await scenario('R03', page); });

test('R04 Add followers (Cc) who get copies', async ({page}) => { await scenario('R04', page); });

test('R05 Did you mean …? email typo check', async ({page}) => { await scenario('R05', page); });

test('R06 Title and description', async ({page}) => { await scenario('R06', page); });

test('R07 Event date, time, location, cost', async ({page}) => { await scenario('R07', page); });

test('R08 Date Required (when the product is needed)', async ({page}) => { await scenario('R08', page); });

test('R09 Printing options with quantities', async ({page}) => { await scenario('R09', page); });

test('R10 Commercial sponsorship: attendance, break-even, cash, items', async ({page}) => { await scenario('R10', page); });

test('R11 Ask for a Flash magazine listing', async ({page}) => { await scenario('R11', page); });

test('R12 Flash section (13 choices)', async ({page}) => { await scenario('R12', page); });

test('R13 Flash notice with no event date or place', async ({page}) => { await scenario('R13', page); });

test('R14 Webmaster request: page address, old text, new text', async ({page}) => { await scenario('R14', page); });

test('R15 Attach files (25 files, 15 MB each, set file types)', async ({page}) => { await scenario('R15', page); });

test('R16 See which file types and sizes are allowed', async ({page}) => { await scenario('R16', page); });

test('R17 Download attachments from the request', async ({page}) => { await scenario('R17', page); });

test('R20 Hidden bot-trap fields', async ({page}) => { await scenario('R20', page); });

test('R22 Lead-time rule', async ({page}) => { await scenario('R22', page); });

test('R23 Errors shown with typing kept', async ({page}) => { await scenario('R23', page); });

test('R24 Reload or double-click does not send twice', async ({page}) => { await scenario('R24', page); });

test('R25 Confirmation page with tracking number', async ({page}) => { await scenario('R25', page); });

test('R26 Confirmation email to requester and Cc', async ({page}) => { await scenario('R26', page); });

test('R27 Check a request with tracking number + email', async ({page}) => { await scenario('R27', page); });

test('R29 Forgot the number → list of my requests by email', async ({page}) => { await scenario('R29', page); });

test('R30 My tickets list for a signed-in requester', async ({page}) => { await scenario('R30', page); });

test('R31 See status', async ({page}) => { await scenario('R31', page); });

test('R32 See what was sent: details, answers, files, dates', async ({page}) => { await scenario('R32', page); });

test('R33 See replies', async ({page}) => { await scenario('R33', page); });

test('R34 Reply to staff', async ({page}) => { await scenario('R34', page); });

test('R35 Attach files to a reply', async ({page}) => { await scenario('R35', page); });

test('R36 Close my own request', async ({page}) => { await scenario('R36', page); });

test('R37 Reopen my own request', async ({page}) => { await scenario('R37', page); });

test('R38 Print the request', async ({page}) => { await scenario('R38', page); });

test('R39 Link in the email opens the request', async ({page}) => { await scenario('R39', page); });

test('R40 Old number of a merged request forwards', async ({page}) => { await scenario('R40', page); });

test('R41 Email when staff reply', async ({page}) => { await scenario('R41', page); });

test('R42 Email when the request is finished', async ({page}) => { await scenario('R42', page); });

test("R45 Returning requester's details pre-filled", async ({page}) => { await scenario('R45', page); });

test('R49 Home-page rules (lead time, proof changes, POC approval)', async ({page}) => { await scenario('R49', page); });

test('S01 Staff sign-in', async ({page}) => { await scenario('S01', page); });

test('S03 Work queue list', async ({page}) => { await scenario('S03', page); });

test('S04 Filter by category/team', async ({page}) => { await scenario('S04', page); });

test('S05 Mine / Unassigned / Open / Everything', async ({page}) => { await scenario('S05', page); });

test('S06 Filter by status', async ({page}) => { await scenario('S06', page); });

test('S07 Filter by priority', async ({page}) => { await scenario('S07', page); });

test('S08 Overdue and due-soon views', async ({page}) => { await scenario('S08', page); });

test('S09 Search across number, name, email, text, notes', async ({page}) => { await scenario('S09', page); });

test('S12 Auto-assign to whoever has the fewest open', async ({page}) => { await scenario('S12', page); });

test('S13 Assign, reassign, unassign by hand', async ({page}) => { await scenario('S13', page); });

test('S14 Several teams share one request (collaborators)', async ({page}) => { await scenario('S14', page); });

test('S16 Statuses incl. In progress and On hold', async ({page}) => { await scenario('S16', page); });

test('S17 Automatic "customer replied" status', async ({page}) => { await scenario('S17', page); });

test('S18 Staff-set priority (Low to Critical)', async ({page}) => { await scenario('S18', page); });

test('S20 Reply to the requester', async ({page}) => { await scenario('S20', page); });

test('S21 Reply without emailing', async ({page}) => { await scenario('S21', page); });

test('S22 Attach files to a reply or note', async ({page}) => { await scenario('S22', page); });

test('S23 Private staff notes', async ({page}) => { await scenario('S23', page); });

test('S25 Saved (canned) replies', async ({page}) => { await scenario('S25', page); });

test('S28 File a request for a walk-in or phone caller', async ({page}) => { await scenario('S28', page); });

test("S29 Edit the request's details", async ({page}) => { await scenario('S29', page); });

test("S30 Edit the requester's contact details", async ({page}) => { await scenario('S30', page); });

test('S31 Due date', async ({page}) => { await scenario('S31', page); });

test('S32 Move work to another team', async ({page}) => { await scenario('S32', page); });

test('S33 Add or cancel a part later', async ({page}) => { await scenario('S33', page); });

test('S34 Link related requests', async ({page}) => { await scenario('S34', page); });

test('S35 Merge duplicates', async ({page}) => { await scenario('S35', page); });

test('S36 History / audit trail', async ({page}) => { await scenario('S36', page); });

test('S37 Print', async ({page}) => { await scenario('S37', page); });

test('S38 Export to a spreadsheet (calendar)', async ({page}) => { await scenario('S38', page); });

test('S39 Export the request list', async ({page}) => { await scenario('S39', page); });

test('S41 Reports: counts per month, team, staff, facility', async ({page}) => { await scenario('S41', page); });

test('S42 Staff emails: new work, assigned to me, requester replied', async ({page}) => { await scenario('S42', page); });

test('S44 Overdue reminders', async ({page}) => { await scenario('S44', page); });

test('S45 Remind the owner button', async ({page}) => { await scenario('S45', page); });

test('S46 Re-send a notification', async ({page}) => { await scenario('S46', page); });

test('S47 Other requests from the same person', async ({page}) => { await scenario('S47', page); });

test('S60 Staff-only fields', async ({page}) => { await scenario('S60', page); });
