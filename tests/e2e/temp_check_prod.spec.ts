import { test, expect } from '@playwright/test';

test('check kid-select and householdId bypass', async ({ page }) => {
  await page.goto('https://app.harelitos.com/kid-select');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  
  const buttons = await page.getByRole('button').allInnerTexts();
  console.log('--- ALL BUTTONS ON SCREEN ---');
  for(const innerText of buttons) {
    console.log(innerText);
  }
  
  const bodyText = await page.innerText('body');
  console.log('--- BODY TEXT PREVIEW ---');
  console.log(bodyText.substring(0, 500));
});
