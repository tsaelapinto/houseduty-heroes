/**
 * Kid Selector — Household Isolation
 *
 * Tests that the kid selector screen ONLY shows kids belonging to the
 * authenticated household, not kids from other households.
 *
 * Runs against: PRODUCTION (https://app.harelitos.com)
 * Run via:      npm run test:prod -- --grep "kid-isolation"
 *
 * This test creates throwaway households on every run (unique timestamp emails).
 * The dedicated test-household approach: each run self-provisions, no prior
 * test data needed.
 */

import { test, expect } from '@playwright/test';

const API = 'https://api.harelitos.com/api';

test.describe('kid-isolation: Household data separation', () => {

  // ── Prerequisite: API enforces householdId ────────────────────────────────
  test('GET /api/kids without householdId returns 400', async ({ request }) => {
    const resp = await request.get(`${API}/kids`);
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toMatch(/householdId/i);
  });

  // ── Gate: no stored householdId → shows family code prompt ───────────────
  test('kid selector shows family-code gate when no household is stored', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('knownHouseholdId');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    });
    await page.goto('/kid-select');
    await expect(page.getByText(/enter family code/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/family code/i)).toBeVisible();
  });

  // ── Core isolation test ───────────────────────────────────────────────────
  test('kid selector only shows kids from the stored household', async ({ page, request }) => {
    const ts = Date.now();

    // ── 1. Provision Household A with 2 kids ─────────────────────────────
    const regAResp = await request.post(`${API}/auth/register`, {
      data: {
        name: 'Test Parent A',
        email: `iso-a-${ts}@test.com`,
        password: 'testpass1',
        householdName: `IsoFamilyA-${ts}`,
      },
    });
    expect(regAResp.ok(), `Register A failed: ${await regAResp.text()}`).toBeTruthy();
    const regA = await regAResp.json();
    const householdAId: string = regA.user.householdId;

    await request.post(`${API}/auth/add-kid`, {
      data: { name: `HeroA1-${ts}`, pin: '1111', householdId: householdAId },
    });
    await request.post(`${API}/auth/add-kid`, {
      data: { name: `HeroA2-${ts}`, pin: '2222', householdId: householdAId },
    });

    // ── 2. Provision Household B with 1 kid we must NOT see ──────────────
    const regBResp = await request.post(`${API}/auth/register`, {
      data: {
        name: 'Test Parent B',
        email: `iso-b-${ts}@test.com`,
        password: 'testpass1',
        householdName: `IsoFamilyB-${ts}`,
      },
    });
    expect(regBResp.ok(), `Register B failed: ${await regBResp.text()}`).toBeTruthy();
    const regB = await regBResp.json();
    const householdBId: string = regB.user.householdId;

    await request.post(`${API}/auth/add-kid`, {
      data: { name: `HeroB1-${ts}`, pin: '3333', householdId: householdBId },
    });

    // ── 3. Open kid selector with Household A's ID pre-loaded ────────────
    await page.addInitScript((hid) => {
      localStorage.setItem('knownHouseholdId', hid);
      localStorage.removeItem('user');  // simulate: parent is logged out
      localStorage.removeItem('token');
    }, householdAId);
    await page.goto('/kid-select');

    // ── 4. Household A kids must appear ──────────────────────────────────
    await expect(
      page.getByRole('button', { name: new RegExp(`HeroA1-${ts}`) }),
      'HeroA1 should be visible for Household A',
    ).toBeVisible({ timeout: 12_000 });

    await expect(
      page.getByRole('button', { name: new RegExp(`HeroA2-${ts}`) }),
      'HeroA2 should be visible for Household A',
    ).toBeVisible();

    // ── 5. Household B kid must NOT appear ───────────────────────────────
    await expect(
      page.getByRole('button', { name: new RegExp(`HeroB1-${ts}`) }),
      'HeroB1 from a different household must not be visible',
    ).not.toBeVisible();
  });

});
