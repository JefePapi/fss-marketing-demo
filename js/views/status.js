// Requester's view: look up a number, see each team's status, send a message.
import { h, page, field, input, textarea, pill, facts } from '../ui.js';
import { TEAMS, svc, JOB_STATUS_REQ, OVERALL_REQ, eventFacilityName, CAL_STATUS } from '../config.js';
import { overallStatus, teamsOf, dateText, timeText, fmtStamp } from '../model.js';
import * as store from '../store.js';
import { notFound } from './home.js';

import { attachments, filePicker, filesPending } from '../files.js';
import { matchesEmail, resolve, history, email, requesterEmail, openLane } from '../actions.js';
import { detailLines } from '../model.js';
let msg = '', files = [], withdrawing = false, activeId = '';

function lookup(ctx) {
  let v = '', em = '', forgot = '';
  const error=h('div'), results=h('div',{class:'stack'});
  const go=()=> { const r=store.find(v.trim().toUpperCase()); if(r && matchesEmail(r,em)) ctx.go('#/status/'+r.id); else error.replaceChildren(notFound('', '#/status/'+store.exampleId())); };
  return page(h('form',{class:'surface stack',onsubmit:e=>{e.preventDefault();go();}},
    h('h1',null,'Check on a request'),
    field('status-number','Your request number',input('status-number','text','',e=>{v=e.target.value;})),
    field('status-email','Your email',input('status-email','email','',e=>{em=e.target.value;})),
    h('button',{class:'btn primary',id:'status-go',type:'submit'},'Check status'),error,
    h('a',{id:'status-example',href:'#/status/'+store.exampleId()},'Try the sample request')),
    h('section',{class:'surface stack'},h('h2',null,'Forgot your number?'),
      field('forgot-email','Your email',input('forgot-email','email','',e=>{forgot=e.target.value;})),
      h('button',{id:'forgot-go',class:'btn',type:'button',onclick:()=>{
        results.replaceChildren(h('p',null,'In the real system we would email you this list.'),...store.requests().filter(r=>!r.mergedInto && matchesEmail(r,forgot)).map(r=>h('a',{'data-test':'my-request',href:'#/status/'+r.id},r.id+' — '+r.event.title+' — '+OVERALL_REQ[overallStatus(r)])));
      }},'Find my requests'),results));
}

export function statusView(ctx) {
  const id = ctx.parts[1];
  if (!id) return lookup(ctx);
  const req = resolve(store.requests(),id);
  if (!req) return notFound(id, '#/status/' + store.exampleId());
  if(activeId !== req.id) { activeId=req.id; msg='';files=[];withdrawing=false; }
  const e = req.event, overall = overallStatus(req);
  const replies = req.thread.filter(t => t.kind === 'reply'); // private notes never appear here
  const lastStaff = jobId => [...replies].reverse().find(t => t.role === 'staff' && (!jobId || t.jobId === jobId));
  const waiting = req.jobs.filter(j => j.status === 'waiting');

  return page(
    id !== req.id && h('p',{class:'surface',id:'merged-note'},`Request ${id} was merged into ${req.id}`),
    h('div', { class: 'surface' },
      h('p', { class: 'eyebrow' }, 'Request ', h('span', { id: 'status-id' }, req.id)),
      h('h1', { tabindex: '-1' }, e.title),
      h('p', null, pill(overall, OVERALL_REQ[overall]), req.calendar.status === 'cancelled' && pill('cancelled', 'Event cancelled'))),
    waiting.length > 0 && h('div', { class: 'surface callout stack', id: 'needs-you', 'data-test': 'needs-you' },
      h('h2', null, 'We need something from you'),
      waiting.map(j => {
        const q = lastStaff(j.id);
        return h('p', null, h('strong', null, svc(j.service).short + ': '), q ? q.text : 'The team will tell you what they need.', q && h('span', { class: 'sub' }, ` — ${q.author}`));
      }),
      h('p', { class: 'sub' }, 'Answer in the message box below.')),
    h('div', { class: 'surface' }, facts([
      ['Day', req.kind === 'other' ? 'No event' : dateText(e)], ['Time', req.kind === 'other' ? '' : timeText(e)], ['Where', e.where], ['Facility', req.kind === 'other' ? '' : eventFacilityName(e)], ['Cost', e.cost],
      ['Contact', `${req.requester.name} — ${req.requester.email}`], ['Calendar', req.kind === 'other' ? '' : CAL_STATUS[req.calendar.status]], ['Cc',(req.cc || []).join(', ')],
    ])),
    h('section',{class:'surface',id:'status-details'},h('h2',null,'What you sent'),h('p',null,e.description),attachments(req.files)),
    h('p',{class:'surface',id:'status-dates'},'Sent: '+fmtStamp(req.submittedAt)+' · Last updated: '+fmtStamp([req.submittedAt,...req.thread.map(t=>t.at),...req.log.map(l=>l.at)].sort().at(-1))),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Teams handling this request'),
      req.jobs.length ? h('div', { class: 'lanes' }, teamsOf(req).map(t => h('div', { class: 'card stack', 'data-test': 'team-line', 'data-team': t },
        h('h3', null, TEAMS[t]),
        req.jobs.filter(j => j.team === t).map(j => {
          const r = lastStaff(j.id);
          return h('div', { class: 'laneline' },
            h('p', null, svc(j.service).short, ' ', pill(j.status, JOB_STATUS_REQ[j.status])),
            h('div',{'data-test':'part-answers'},facts(detailLines(j,req))),
            j.status === 'declined' && j.declineReason && h('p', { class: 'sub' }, 'Reason: ' + j.declineReason),
            r && h('p', { class: 'sub' }, `Latest from ${r.author}: `, r.text));
        }))))
        : h('p', null, 'No team work was asked for. It is on the calendar.')),
    h('div', { class: 'surface stack' },
      h('h2', null, 'Messages'),
      replies.length ? h('ul', { class: 'thread' }, replies.map(t => h('li', { class: t.role === 'staff' ? 'from-staff' : 'from-you' },
        h('p', { class: 'sub' }, `${t.role === 'staff' ? t.author + ' (Marketing)' : t.author} · ${fmtStamp(t.at)}`), h('p', null, t.text),attachments(t.files))))
        : h('p', { class: 'sub' }, 'No messages yet.'),
      field('status-message', 'Send a message', textarea('status-message', msg, ev => { msg = ev.target.value; }, { maxlength: 1000, rows: 3 })),
      filePicker('status-files',files),
      h('button', {
        class: 'btn primary', type: 'button', id: 'status-send', onclick: () => {
          if(filesPending()) return;
          if (!msg.trim() && !files.length) return;
          req.thread.push({ at: new Date().toISOString(), author: req.requester.name, role: 'requester', kind: 'reply', text: msg.trim(), files:[...files] });
          for(const j of req.jobs) if(j.status === 'waiting') j.status='inprogress';
          history(req,'Requester replied'); req.newReply=true;
          email(req,'requester-replied',[...new Set(req.jobs.filter(j=>j.owner).map(j=>j.owner+'@example.com'))]); files=[];
          msg = ''; store.save(); ctx.refresh();
        },
      }, 'Send message')),
    h('section',{class:'surface stack'},
      h('button',{id:'print-request',class:'btn',type:'button',onclick:()=>window.print()},'Print request'),
      req.withdrawn ? h('button',{id:'reopen',class:'btn',type:'button',onclick:()=>{const s=req.withdrawn.snapshot;for(const j of req.jobs){const old=s.jobs.find(x=>x.id===j.id);if(old) Object.assign(j,old);}Object.assign(req.calendar,s.calendar);delete req.withdrawn;history(req,'Reopened by requester');store.save();ctx.refresh();}},'Reopen request')
      : h('button',{id:'withdraw-open',class:'btn',type:'button',onclick:()=>{withdrawing=true;ctx.refresh();}},'I no longer need this'),
      !req.withdrawn && withdrawing && h('div',{class:'stack'},field('withdraw-reason','Reason (optional)',textarea('withdraw-reason','',null)),h('button',{id:'withdraw-confirm',class:'btn',type:'button',onclick:()=>{
        const reason=document.getElementById('withdraw-reason').value.trim(); req.withdrawn={at:new Date().toISOString(),reason,snapshot:{jobs:req.jobs.map(j=>({id:j.id,status:j.status,declineReason:j.declineReason || ''})),calendar:{status:req.calendar.status,cancelReason:req.calendar.cancelReason || ''}}};
        req.jobs.filter(openLane).forEach(j=>{j.status='declined';j.declineReason='Withdrawn by requester';}); req.calendar.status='cancelled';req.calendar.cancelReason=reason || 'Withdrawn by requester';history(req,'Withdrawn by requester: '+reason);requesterEmail(req,'withdrawn');withdrawing=false;store.save();ctx.refresh();
      }},'Close this request'))),
    h('p', { class: 'note onglass' }, 'Receipt does not promise funding or a magazine slot.'));
}
