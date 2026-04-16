/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm, useFormField } from './useForm';

describe('useForm', () => {
  it('initializes with provided initial values', () => {
    const { result } = renderHook(() => useForm({ initialValues: { email: '', password: '' } }));
    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('marks form dirty when values change', () => {
    const { result } = renderHook(() => useForm({ initialValues: { email: '' } }));
    act(() => {
      result.current.setFieldValue('email', 'a@b.com');
    });
    expect(result.current.values.email).toBe('a@b.com');
    expect(result.current.isDirty).toBe(true);
  });

  it('runs validate and exposes errors on submit', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({
        initialValues: { email: '' },
        validate: (v) => (v.email ? {} : { email: 'required' }),
        onSubmit,
      }),
    );

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.errors).toEqual({ email: 'required' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when validation passes', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({
        initialValues: { name: 'leo' },
        validate: () => ({}),
        onSubmit,
      }),
    );

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'leo' });
  });

  it('reset restores initial values and clears errors/touched', () => {
    const { result } = renderHook(() => useForm({ initialValues: { email: '' } }));
    act(() => {
      result.current.setFieldValue('email', 'a@b.com');
      result.current.setFieldTouched('email', true);
      result.current.setFieldError('email', 'oops');
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({ email: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });

  it('setFieldError sets error for a specific field', () => {
    const { result } = renderHook(() => useForm({ initialValues: { name: '' } }));
    act(() => {
      result.current.setFieldError('name', 'bad');
    });
    expect(result.current.errors.name).toBe('bad');
  });
});

describe('useFormField', () => {
  it('initializes with provided value', () => {
    const { result } = renderHook(() => useFormField({ initialValue: 'x' }));
    expect(result.current.value).toBe('x');
    expect(result.current.error).toBeNull();
    expect(result.current.isTouched).toBe(false);
  });

  it('validates on blur', () => {
    const validate = (v: string) => (v.length < 3 ? 'short' : null);
    const { result } = renderHook(() => useFormField({ initialValue: 'ab', validate }));

    act(() => {
      result.current.handleBlur();
    });

    expect(result.current.isTouched).toBe(true);
    expect(result.current.error).toBe('short');
    expect(result.current.isValid).toBe(false);
  });
});
