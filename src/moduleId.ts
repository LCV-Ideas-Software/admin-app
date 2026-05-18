/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Canonical ModuleId union — extracted from App.tsx for sharing with
 * navItems sort helper + future module-level utilities. Adding a new
 * module: append to this union AND to MODULE_LABELS + RAW_NAV_ITEMS in
 * App.tsx.
 */
export type ModuleId =
  | 'overview'
  | 'astrologo'
  | 'cardhub'
  | 'cfdns'
  | 'cfpw'
  | 'config'
  | 'oraculo'
  | 'calculadora'
  | 'maestro-ai'
  | 'mainsite'
  | 'mtasts'
  | 'telemetria'
  | 'tlsrpt'
  | 'compliance';
