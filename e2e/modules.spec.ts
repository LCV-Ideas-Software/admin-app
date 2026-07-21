/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { test, expect } from '@playwright/test';

/**
 * Smoke tests for each module — verifies lazy loading works
 * and the module renders without crashing.
 */
const modules = [
  { id: 'overview', heading: 'Visão Geral' },
  { id: 'astrologo', heading: 'Astrólogo' },
  { id: 'cardhub', heading: 'Card Hub' },
  { id: 'cfdns', heading: 'CF DNS' },
  { id: 'cfpw', heading: 'CF P&W' },
  { id: 'config', heading: 'Configurações' },
  { id: 'calculadora', heading: 'Calculadora' },
  { id: 'mainsite', heading: 'MainSite' },
  { id: 'maestro-ai', heading: 'Maestro AI' },
  { id: 'mtasts', heading: 'MTA-STS' },
  { id: 'oraculo', heading: 'Oráculo' },
  { id: 'telemetria', heading: 'Telemetria' },
  { id: 'tlsrpt', heading: 'TLS-RPT' },
  { id: 'compliance', heading: 'Conformidade e Licenças' },
];

for (const { id, heading } of modules) {
  test(`module /${id} loads and renders heading`, async ({ page }) => {
    await page.goto(`/${id}`);

    // Header shows correct module name
    await expect(page.locator('.topbar h2')).toContainText(heading, {
      timeout: 10_000,
    });

    // Module content area should not show error boundary
    await expect(page.locator('.module-error-panel')).not.toBeVisible();
  });
}

test('module /cfdns renders the 4 tabs and switching does not crash', async ({ page }) => {
  await page.goto('/cfdns');
  await expect(page.locator('.topbar h2')).toContainText('CF DNS', { timeout: 10_000 });

  const tabNav = page.locator('.page-tab-nav');
  const tabNames = ['Registros', 'Análises', 'Zona & DNSSEC', 'Registrar'];
  for (const name of tabNames) {
    await expect(tabNav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  for (const name of tabNames) {
    await tabNav.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.module-error-panel')).not.toBeVisible();
  }
});

test('module /cfpw renders top tabs and storage sub-tabs without crashing', async ({ page }) => {
  await page.goto('/cfpw');
  await expect(page.locator('.topbar h2')).toContainText('CF P&W', { timeout: 10_000 });

  const topNav = page.locator('.cfpw-top-tab-nav');
  await expect(topNav.getByRole('button', { name: 'Recursos', exact: true })).toBeVisible();
  await expect(topNav.getByRole('button', { name: 'Armazenamento', exact: true })).toBeVisible();

  await topNav.getByRole('button', { name: 'Armazenamento', exact: true }).click();
  const subNav = page.locator('.storage-subtab-nav').first();
  for (const name of ['KV', 'D1', 'R2']) {
    await expect(subNav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.locator('.module-error-panel')).not.toBeVisible();
});
