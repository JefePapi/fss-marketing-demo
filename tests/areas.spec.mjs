import { test, expect } from '@playwright/test';
import { addDays, DAYS, parseYmd, ymd } from '../js/model.js';
import { closureText, hoursOn, rangesText } from '../js/hours.js';
import { buildActivities } from '../js/seed.js';

const bowling='./#/activities/bowling';
const area=(p,id)=>p.locator(`[data-test="area"][data-area="${id}"]`);

test('Visitors can read area schedules on the list and detail pages',async({page:p},testInfo)=>{
  const now=new Date(), today=ymd(now);
  const seed=buildActivities(now).find(a=>a.id==='bowling');
  const tacoSeed=seed.areas.find(a=>a.id==='taco-bell');
  const todayText=info=>{
    const on=hoursOn(info,today);
    return on.closed?'Closed today':'Open today '+rangesText(on.ranges);
  };
  const checkWidth=async()=>{
    if(testInfo.project.name==='phone-390')
      expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  };
  await p.clock.setFixedTime(now);
  await p.goto('./#/activities');
  const card=p.locator('[data-test="activity-card"][data-activity="bowling"]');
  await expect(card.locator('strong')).toHaveText('Bowling Center · 5 areas');
  await expect(card.locator('[data-test="list-area"]')).toHaveCount(5);
  for(const id of ['taco-bell','papa-joe-s']){
    const {name,info}=seed.areas.find(a=>a.id===id);
    const row=card.locator(`[data-test="list-area"][data-area="${id}"]`);
    await expect(row).toBeVisible();
    await expect(row).toHaveText(`${name} — ${todayText(info)}`);
  }
  const soon=tacoSeed.info.closures.find(c=>c.date>=today && c.date<=addDays(today,14));
  if(soon){
    const line=card.locator('[data-area="taco-bell"] + [data-test="list-area-closure"]');
    await expect(line).toBeVisible();
    await expect(line).toContainText(closureText(soon));
  }
  await checkWidth();

  await p.goto(bowling);
  const taco=area(p,'taco-bell');
  const badge=taco.locator('[data-test="area-today"]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(todayText(tacoSeed.info));
  await expect(badge).toHaveAttribute('data-open',hoursOn(tacoSeed.info,today).closed?'0':'1');
  const days=taco.locator('.area-hours > div');
  await expect(days).toHaveCount(7);
  for(let i=0;i<DAYS.length;i++){
    await expect(days.nth(i)).toBeVisible();
    await expect(days.nth(i).locator('dt')).toHaveText(DAYS[i]);
    await expect(days.nth(i).locator('dd')).toHaveText(rangesText(tacoSeed.info.week[i]));
  }
  for(const closure of tacoSeed.info.closures.filter(c=>c.date<=addDays(today,60) && (c.to || c.date)>=today)){
    await expect(taco.locator('[data-test="area-closure"]').filter({hasText:closureText(closure)})).toBeVisible();
  }
  await expect(p.locator('#area-add, [data-test="area-edit"], [data-test="area-remove"]')).toHaveCount(0);
  await checkWidth();
});

test('Marketing can add, rename and confirm removal of an area',async({page:p})=>{
  await p.goto('./#/staff');
  await p.goto(bowling);
  await p.locator('#area-add').click();
  await expect(p.locator('#h-sat-c1')).toHaveValue('20:00');
  await p.locator('#area-name').fill('Demo Arcade');
  await p.locator('#area-save').click();
  const row=area(p,'demo-arcade');
  await expect(row).toContainText('Demo Arcade');
  await row.locator('[data-test="area-edit"]').click();
  await p.locator('#area-name').fill('Sample Arcade');
  await p.locator('#area-save').click();
  await expect(row).toContainText('Sample Arcade');
  await row.locator('[data-test="area-remove"]').click();
  await expect(p.locator('#sheet-title')).toHaveText('Remove Sample Arcade?');
  await p.locator('#sheet-close').click();
  await expect(row).toBeVisible();
  await row.locator('[data-test="area-remove"]').click();
  await p.locator('#confirm-yes').click();
  await expect(row).toHaveCount(0);
  await expect(p.locator('#notice-count')).toHaveText('1');
});

test('Manager A edits area hours and Marketing sees the notice',async({page:p})=>{
  await p.goto('./#/staff');
  await expect(p.locator('#notice-count')).toHaveText('1');
  await p.locator('#demo-role').selectOption('mgrA');
  await p.locator('#my-activities [data-activity="bowling"]').click();
  await area(p,'taco-bell').locator('[data-test="area-edit"]').click();
  await p.locator('#h-sat-c1').fill('18:00');
  await p.locator('#area-save').click();
  await expect(p.locator('#activity-name')).toHaveText('Bowling Center');
  await p.locator('#demo-role').selectOption('marketing');
  await expect(p.locator('#notice-count')).toHaveText('2');
  await p.locator('#nav-notices').click();
  await expect(p.locator('[data-test="notice"]').first()).toContainText('Taco Bell · Sat: 10:30–20:00 → 10:30–18:00');
});

test('Manager B cannot edit Bowling Center areas',async({page:p})=>{
  await p.goto('./#/staff');
  await p.locator('#demo-role').selectOption('mgrB');
  await p.goto(bowling);
  await expect(area(p,'taco-bell')).toBeVisible();
  await expect(p.locator('#area-add, [data-test="area-edit"], [data-test="area-remove"]')).toHaveCount(0);
  await p.goto(bowling+'/areas/taco-bell/edit');
  await expect(p.locator('#edit-blocked')).toBeVisible();
});

test('A closed area warns but the request still reaches staff',async({page:p})=>{
  let sunday=ymd(new Date());
  while(parseYmd(sunday).getDay()!==0)sunday=addDays(sunday,1);
  await p.goto('./#/request');
  await p.locator('#fill-sample').click();
  await p.locator('#btn-next').click();
  await p.locator('#f-facilityId').selectOption('bowling');
  const picker=p.locator('#f-areaId');
  await expect(picker.locator('option').first()).toHaveText('Whole activity');
  await picker.selectOption('taco-bell');
  await p.locator('#f-facilityId').selectOption('fitness');
  await p.locator('#f-facilityId').selectOption('bowling');
  await expect(picker).toHaveValue('');
  await picker.selectOption('taco-bell');
  await p.locator('#f-date').fill(sunday);
  const warning=p.locator('[data-test="hours-warning"][data-level="closed"]');
  await expect(warning).toContainText('Taco Bell');
  await p.locator('#btn-next').click();
  await p.locator('#svc-calonly').check();
  await p.locator('#btn-next').click();
  await expect(warning).toContainText('Taco Bell');
  await p.locator('#btn-send').click();
  await p.locator('#sent-staff').click();
  await expect(p.locator('#facts')).toContainText('Bowling Center — Taco Bell');
});
