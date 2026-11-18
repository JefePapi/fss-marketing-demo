import { test, expect } from '@playwright/test';
import { addDays, parseYmd, ymd } from '../js/model.js';

const bowling='./#/activities/bowling';
const area=(p,id)=>p.locator(`[data-test="area"][data-area="${id}"]`);

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
