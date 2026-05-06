/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { test, expect } from '@playwright/test';

test.describe('Module navigation (TanStack Router)', () => {
  test('index redirects to a module route', async ({ page }) => {
    await page.goto('/');
    // Index route should redirect to /$moduleId (overview or saved homepage)
    await expect(page).not.toHaveURL('/');
    expect(page.url()).toMatch(/\/[a-z-]+$/);
  });

  test('direct navigation to /overview renders Visão Geral', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('h2')).toContainText('Visão Geral');
  });

  test('direct navigation to /config renders Configurações', async ({ page }) => {
    await page.goto('/config');
    await expect(page.locator('h2')).toContainText('Configurações');
  });

  test('sidebar click navigates and updates URL', async ({ page }) => {
    await page.goto('/overview');
    await page.click('button[title="Telemetria"]');
    await expect(page).toHaveURL('/telemetria');
    await expect(page.locator('h2')).toContainText('Telemetria');
  });

  test('browser back/forward works', async ({ page }) => {
    await page.goto('/overview');
    await page.click('button[title="MainSite"]');
    await expect(page).toHaveURL('/mainsite');

    await page.goBack();
    await expect(page).toHaveURL('/overview');

    await page.goForward();
    await expect(page).toHaveURL('/mainsite');
  });

  test('sidebar highlights active module', async ({ page }) => {
    await page.goto('/mainsite');
    const activeButton = page.locator('button.nav-item-active');
    await expect(activeButton).toContainText('MainSite');
  });

  test('unknown module shows fallback', async ({ page }) => {
    await page.goto('/nonexistent-module');
    await expect(page.locator('main')).toContainText('não encontrado');
  });
});

test.describe('App shell', () => {
  test('version badge is visible', async ({ page }) => {
    await page.goto('/overview');
    await expect(page.locator('.status-pill')).toContainText('APP v');
  });

  test('sidebar pin toggle works', async ({ page }) => {
    await page.goto('/overview');
    const shell = page.locator('.app-shell');
    // Initially pinned (no sidebar-collapsed class)
    await expect(shell).not.toHaveClass(/sidebar-collapsed/);

    await page.click('button.pin-toggle');
    await expect(shell).toHaveClass(/sidebar-collapsed/);

    await page.click('button.pin-toggle');
    await expect(shell).not.toHaveClass(/sidebar-collapsed/);
  });

  test('skip link is present', async ({ page }) => {
    await page.goto('/overview');
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});
