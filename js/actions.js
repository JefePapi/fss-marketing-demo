import { STAFF } from './config.js';
export const openLane = j => !['done','declined'].includes(j.status);
export const ccList = text => text.split(',').map(x => x.trim()).filter(Boolean);
export const emailOK = text => /^\S+@\S+\.\S+$/.test(text);
export const ccError = text => { const a = ccList(text); return a.length > 5 ? 'Use at most 5 email addresses.' : a.some(x => !emailOK(x)) ? 'Use emails like name@example.com, separated by commas.' : ''; };
export const matchesEmail = (r,email) => [r.requester.email,...r.cc || []].some(x => x.toLowerCase() === email.trim().toLowerCase());
export const history = (r,text,who='System') => r.log.push({at:new Date().toISOString(),who,text});
const subjects = { received:'We received your request', 'opened-for-you':'Staff opened this request for you', 'staff-reply':'Marketing replied to your request', complete:'Your request is finished', 'new-work':'New work for your team', assigned:'Work assigned to you', 'requester-replied':'The requester replied', reminder:'Reminder about your work', resend:'Copy of your request receipt', withdrawn:'You closed this request' };
export function email(r,trigger,to,cc=[]) {
  (r.outbox ||= []).push({at:new Date().toISOString(),to:Array.isArray(to)?to:[to],cc,subject:`${r.id}: ${r.event.title} — ${subjects[trigger] || trigger}`,trigger});
}
export const requesterEmail = (r,trigger) => email(r,trigger,r.requester.email,r.cc || []);
export const teamEmail = (r,j) => email(r,'new-work',STAFF.filter(p => p.team === j.team).map(p => p.id+'@example.com'));
export const ownerEmail = (r,j,trigger='assigned') => { if(j.owner) email(r,trigger,j.owner+'@example.com'); };
export function received(r) {
  requesterEmail(r,r.openedBy ? 'opened-for-you' : 'received');
  r.jobs.forEach(j => teamEmail(r,j));
}
export function autoOwner(requests,job) {
  return STAFF.filter(p => p.team === job.team).map(p => ({id:p.id,count:requests.flatMap(r => r.mergedInto ? [] : r.jobs).filter(j => openLane(j) && j.owner === p.id).length})).sort((a,b) => a.count-b.count)[0]?.id || null;
}
export function resolve(requests,id) {
  let r = requests.find(r => r.id === id); const seen = new Set();
  while(r?.mergedInto && !seen.has(r.id)) { seen.add(r.id); r = requests.find(x => x.id === r.mergedInto); }
  return r;
}
export function merge(source,target,requests) {
  const jobIds = new Map();
  for(const j of source.jobs) {
    let destination=target.jobs.find(x=>x.service===j.service);
    if(!destination) { destination={...j,id:'j'+(Math.max(0,...target.jobs.map(x=>+x.id.slice(1)))+1)};target.jobs.push(destination); }
    jobIds.set(j.id,destination.id);
  }
  target.thread.push(...source.thread.map(t=>({...t,...(t.jobId ? {jobId:jobIds.get(t.jobId)} : {})})));
  target.newReply=!!(target.newReply || source.newReply);
  (target.files ||= []).push(...source.files || []); (target.outbox ||= []).push(...source.outbox || []);
  const links = new Set([...(target.related || []),...(source.related || [])]); links.delete(source.id); links.delete(target.id); target.related = [...links];
  for(const r of requests) if(r.related?.includes(source.id)) r.related = [...new Set(r.related.map(id => id === source.id ? target.id : id))].filter(id => id !== r.id);
  target.log.push(...source.log); history(target,'Merged from '+source.id); history(source,'Merged into '+target.id); source.mergedInto = target.id;
}
export const flashSections = ['Fitness','Community','Arts','Library','Outdoor','Youth','Travel','Around the base'];
export const defaultFlash = id => ({fitness:'Fitness',library:'Library',arts:'Arts',outdoor:'Outdoor',youth:'Youth',itt:'Travel'}[id] || 'Community');
