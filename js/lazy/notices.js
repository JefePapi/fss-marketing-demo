import { h, page } from '../ui.js';
import { ymd, fmtStamp } from '../model.js';
import * as store from '../store.js';
const lines = list => (list || []).map(s=>h('p',{'data-test':'change-line'},s));
export function noticesView(ctx) {
  const upcomingRequests = activityId => {
    const requests = store.requests().filter(r => !r.mergedInto && r.kind !== 'other'
      && r.event?.facilityId === activityId && (r.event.endDate || r.event.date) >= ymd(ctx.now));
    return requests.length > 0 && h('div', { class:'sub' }, 'Upcoming requests here:',
      h('ul', { class:'plain notice-requests' }, requests.map(r => h('li', null,
        h('a', { 'data-test':'notice-request', href:'#/staff/' + r.id }, `${r.event.title} (${r.id})`)))));
  };
  return page(h('h1',{tabindex:-1},'Notifications'),h('p',{class:'note'},'Demo: read state is shared by all marketing staff in this browser. Nothing is sent.'),
    h('div',{class:'row wrap'},h('button',{class:'btn',id:'notices-read-all',onclick:()=>{store.readNotice();ctx.refresh();}},'Mark all read'),h('a',{id:'go-emails',href:'#/staff/emails'},'Email log')),
    !store.notices().length && h('p',null,'No notifications yet.'),
    [...store.notices()].reverse().map(n=>h('section',{class:'card stack','data-test':'notice','data-read':n.read?'1':'0'},h('a',{href:'#/activities/'+n.activityId},n.activityName),h('p',null,`${n.by} · ${fmtStamp(n.at)}`),lines(n.changes),
      upcomingRequests(n.activityId),
      !n.read && h('div',null,h('button',{class:'btn','data-test':'notice-read',onclick:()=>{store.readNotice(n.id);ctx.refresh();}},'Mark read')))));
}
export function emailsView() {
  const entries=[...store.mail(),...store.requests().flatMap(r=>(r.outbox || []).map(m=>({...m,requestId:r.id})))].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100);
  return page(h('h1',{tabindex:-1},'Email log'),h('p',{id:'email-log-note',class:'note'},'Demo: nothing is sent'),!entries.length && h('p',null,'No emails logged yet.'),
    entries.map(m=>h('section',{class:'card stack','data-test':'email-entry','data-trigger':m.trigger},h('p',null,fmtStamp(m.at)),m.trigger==='activity-updated' && h('span',{class:'pill'},'Would email marketing'),h('p',null,'To: '+(m.to || []).join(', ')),h('strong',null,m.subject),lines(m.lines || (m.body?[m.body]:[])),m.requestId && h('a',{href:'#/staff/'+m.requestId},m.requestId))));
}
