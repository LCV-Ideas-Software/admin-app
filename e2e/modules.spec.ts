/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { test, expect } from '@playwright/test';

/**
 * Smoke tests for each module — verifies lazy loading works
 * and the module renders without crashing.
 */
const modules = [
  { id: 'overview', heading: 'Visão Geral' },
  { id: 'ai-status', heading: 'AI Status' },
  { id: 'astrologo', heading: 'Astrólogo' },
  { id: 'cardhub', heading: 'Card Hub' },
  { id: 'cfdns', heading: 'CF DNS' },
  { id: 'cfpw', heading: 'CF P&W' },
  { id: 'config', heading: 'Configurações' },
  { id: 'calculadora', heading: 'Calculadora' },
  { id: 'mainsite', heading: 'MainSite' },
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
    await expect(page.locator('.topbar h2')).toContainText(heading, { timeout: 10_000 });

    // Module content area should not show error boundary
    await expect(page.locator('.module-error-panel')).not.toBeVisible();
  });
}
