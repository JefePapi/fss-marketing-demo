import { h,page } from '../ui.js';
import { reports } from '../model.js';
import * as store from '../store.js';
export function reportsView(ctx) {
  const r=reports(store.requests(),ctx.now);
  const table=(id,title,heads,rows)=>h('section',{class:'surface'},h('h2',null,title),h('div',{class:'table-scroll'},h('table',{id},h('thead',null,h('tr',null,heads.map(x=>h('th',null,x)))),h('tbody',null,rows.map(row=>h('tr',null,row.map(x=>h('td',null,x))))))));
  return page(h('h1',null,'Reports'),h('a',{href:'#/staff'},'Back to queue'),
    table('report-month','Requests sent per month',['Month','Requests'],r.month),
    table('report-team','Parts per team',['Team','New','In progress','Waiting','On hold','Done','Declined'],r.team),
    table('report-staff','Parts per person',['Person','Open','Done'],r.staff),
    table('report-facility','Requests per facility',['Facility','Requests'],r.facility));
}
