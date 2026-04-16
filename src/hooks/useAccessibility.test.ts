/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccessibility, KeyboardPattern } from './useAccessibility';

describe('useAccessibility — keyboard navigation helpers', () => {
  it('getNextIndex wraps around with circular=true', () => {
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.getNextIndex(0, 3)).toBe(1);
    expect(result.current.getNextIndex(2, 3)).toBe(0); // wraps
  });

  it('getNextIndex clamps with circular=false', () => {
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.getNextIndex(2, 3, false)).toBe(2);
  });

  it('getPreviousIndex wraps around with circular=true', () => {
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.getPreviousIndex(0, 3)).toBe(2); // wraps
    expect(result.current.getPreviousIndex(2, 3)).toBe(1);
  });

  it('getPreviousIndex clamps with circular=false', () => {
    const { result } = renderHook(() => useAccessibility());
    expect(result.current.getPreviousIndex(0, 3, false)).toBe(0);
  });
});

describe('useAccessibility — focus management', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focusFirst focuses the first focusable element inside a container', () => {
    document.body.innerHTML = `
      <div id="box">
        <button id="b1">one</button>
        <button id="b2">two</button>
      </div>
    `;
    const { result } = renderHook(() => useAccessibility());
    act(() => {
      result.current.focusFirst('#box');
    });
    expect(document.activeElement?.id).toBe('b1');
  });

  it('focusLast focuses the last focusable element', () => {
    document.body.innerHTML = `
      <div id="box">
        <button id="b1">one</button>
        <button id="b2">two</button>
      </div>
    `;
    const { result } = renderHook(() => useAccessibility());
    act(() => {
      result.current.focusLast('#box');
    });
    expect(document.activeElement?.id).toBe('b2');
  });

  it('setFocusOnId focuses element by id', () => {
    const el = document.createElement('button');
    el.id = 'target';
    document.body.appendChild(el);
    const { result } = renderHook(() => useAccessibility());
    act(() => {
      result.current.setFocusOnId('target');
    });
    expect(document.activeElement).toBe(el);
  });
});

describe('useAccessibility — ARIA announcements + id generation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('announceToScreenReader creates live region and clears after 3s', () => {
    const { result } = renderHook(() => useAccessibility());
    act(() => {
      result.current.announceToScreenReader('hello', 'polite');
    });

    const region = document.getElementById('a11y-live-region');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toBe('hello');

    act(() => {
      vi.advanceTimersByTime(3001);
    });
    expect(region?.textContent).toBe('');
    vi.useRealTimers();
  });

  it('getId returns stable monotonic ids per prefix', () => {
    const { result } = renderHook(() => useAccessibility());
    const a = result.current.getId('field');
    const b = result.current.getId('field');
    const c = result.current.getId('other');
    expect(a).toBe('field-1');
    expect(b).toBe('field-2');
    expect(c).toBe('other-1');
  });
});

describe('KeyboardPattern', () => {
  const ke = (overrides: Partial<React.KeyboardEvent>): React.KeyboardEvent =>
    ({ key: '', ctrlKey: false, ...overrides }) as React.KeyboardEvent;

  it('detects Escape', () => {
    expect(KeyboardPattern.isEscape(ke({ key: 'Escape' }))).toBe(true);
    expect(KeyboardPattern.isEscape(ke({ key: 'Enter' }))).toBe(false);
  });

  it('detects Ctrl+C / Ctrl+V / Ctrl+A / Ctrl+X', () => {
    expect(KeyboardPattern.isCtrlC(ke({ key: 'c', ctrlKey: true }))).toBe(true);
    expect(KeyboardPattern.isCtrlV(ke({ key: 'v', ctrlKey: true }))).toBe(true);
    expect(KeyboardPattern.isCtrlA(ke({ key: 'a', ctrlKey: true }))).toBe(true);
    expect(KeyboardPattern.isCtrlX(ke({ key: 'x', ctrlKey: true }))).toBe(true);
    expect(KeyboardPattern.isCtrlC(ke({ key: 'c', ctrlKey: false }))).toBe(false);
  });

  it('detects arrow keys', () => {
    expect(KeyboardPattern.isArrowUp(ke({ key: 'ArrowUp' }))).toBe(true);
    expect(KeyboardPattern.isArrowDown(ke({ key: 'ArrowDown' }))).toBe(true);
    expect(KeyboardPattern.isArrowLeft(ke({ key: 'ArrowLeft' }))).toBe(true);
    expect(KeyboardPattern.isArrowRight(ke({ key: 'ArrowRight' }))).toBe(true);
  });
});
