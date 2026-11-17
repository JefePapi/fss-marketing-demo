import { h,page,field,input,textarea } from '../ui.js';
import { botTrap } from './request.js';
import { filePicker, filesPending } from '../files.js';
import { emailOK, received, defaultFlash } from '../actions.js';
import { newJob } from '../model.js';
import * as store from '../store.js';
let d = null;
export function otherView(ctx) {
  if(!d) d={kind:'web',name:'',email:'',phone:'',title:'',text:'',url:'',old:'',new:'',website:'',files:[]};
  const errors=h('div',{class:'err',role:'status'}), extra=h('div',{class:'stack'});
  const control=(key,label,area=false) => field('o-'+key,label,(area?textarea:((id,v,cb)=>input(id,'text',v,cb)))('o-'+key,d[key],e=>{d[key]=e.target.value;}));
  const draw=()=> { extra.replaceChildren(...(d.kind==='web' ? [control('url','Page address'),control('old','Old text',true),control('new','New text',true)] : [])); }; draw();
  return page(h('form',{class:'surface stack',onsubmit:e=>e.preventDefault()},
    h('h1',null,"Something that isn't an event"),h('p',{class:'note'},'Demo: use made-up details. Nothing leaves this browser.'),
    ['web','flash'].map(k=>h('label',{class:'choice'},h('input',{type:'radio',name:'kind',id:'o-kind-'+k,checked:d.kind===k,onchange:()=>{d.kind=k;draw();}}),k==='web'?'A change to the website':'A notice for the Flash magazine')),
    control('name','Your name'),control('email','Your email'),control('phone','Your phone (optional; leave blank in the demo)'),control('title','Title'),control('text','What do you need?',true),extra,
    filePicker('o-files',d.files),botTrap(d.website,e=>{d.website=e.target.value;}),errors,
    h('button',{id:'o-send',type:'button',class:'btn primary',onclick:ev=>{
      if(filesPending()) return;
      if(d.website) { errors.replaceChildren(h('p',{id:'send-refused'},'Something went wrong. Please try again.'));return; }
      if(!d.name.trim() || !emailOK(d.email) || !d.title.trim() || !d.text.trim() || (d.kind==='web' && ['url','old','new'].some(k=>!d[k].trim()))) {errors.textContent='Complete every required field and use an email like name@example.com.';return;}
      ev.target.disabled=true;
      const at=new Date().toISOString();
      const req=store.add({kind:'other',submittedAt:at,requester:{name:d.name,email:d.email,phone:d.phone},cc:[],files:[...d.files],outbox:[],priority:'medium',
        event:{title:d.title,description:d.text,facilityId:'',section:'',date:'',where:'',cost:''},calendar:{status:'notconfirmed'},
        jobs:[newJob(d.kind,1,d.kind==='web'?{url:d.url,old:d.old,new:d.new}:{flashSection:defaultFlash('')})],thread:[],log:[{at,who:'System',text:'Request received'}]});
      received(req);store.save();d=null;ctx.go('#/sent/'+req.id);
    }},'Send request')));
}
