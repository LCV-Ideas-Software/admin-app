/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * useForm Hook - Form state management with validation
 * 
 * Handles:
 * - Field values and state management
 * - Real-time validation
 * - Error tracking per field
 * - Submit state and loading
 * - Reset functionality
 * 
 * Usage:
 * ```tsx
 * const form = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: (values) => {
 *     const errors: Record<string, string> = {}
 *     const emailVal = validateEmail(values.email)
 *     if (!emailVal.valid) errors.email = emailVal.error
 *     return errors
 *   },
 *   onSubmit: async (values) => {
 *     await api.login(values)
 *   }
 * })
 * ```
 */

import { useState, useCallback, useRef } from 'react'

export interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => Record<string, string>
  onSubmit?: (values: T) => void | Promise<void>
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export interface UseFormReturn<T> {
  values: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
  isLoading: boolean
  setLoading: (loading: boolean) => void

  // Handlers
  setFieldValue: (field: keyof T, value: unknown) => void
  setFieldError: (field: keyof T, error: string) => void
  setFieldTouched: (field: keyof T, touched: boolean) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  reset: () => void
}

/**
 * useForm Hook - Unified form state + validation management
 */
export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const initialValuesRef = useRef(initialValues)

  // Check if form is dirty (values changed from initial)
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current)

  // Validate all fields
  const validateForm = useCallback(
    (formValues: T): Record<string, string> => {
      if (!validate) return {}
      return validate(formValues)
    },
    [validate],
  )

  // Check if form is valid
  const newErrors = validateForm(values)
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const isValid = Object.keys(newErrors as any).length === 0

  // Set field value and optionally validate
  const setFieldValue = useCallback(
    (field: keyof T, value: unknown) => {
      const newValues = { ...values, [field]: value }
      setValues(newValues)

      if (validateOnChange && touched[String(field)]) {
        const fieldErrors = validateForm(newValues)
        setErrors(fieldErrors)
      }
    },
    [values, touched, validateOnChange, validateForm],
  )

  // Set field error manually
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [String(field)]: error,
    }))
  }, [])

  // Mark field as touched
  const setFieldTouched = useCallback((field: keyof T, isTouched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [String(field)]: isTouched,
    }))
  }, [])

  // Handle input change events
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target as HTMLInputElement

      // Convert checkbox/radio to boolean if needed
      const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

      setFieldValue(name as keyof T, finalValue)
    },
    [setFieldValue],
  )

  // Handle input blur events
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name } = e.target
      setFieldTouched(name as keyof T, true)

      if (validateOnBlur) {
        const fieldErrors = validateForm(values)
        setErrors(fieldErrors)
      }
    },
    [values, validateOnBlur, validateForm, setFieldTouched],
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      // Validate all fields
      const formErrors = validateForm(values)
      setErrors(formErrors)

      // Mark all as touched
      const allTouched = Object.keys(initialValuesRef.current).reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {} as Record<string, boolean>,
      )
      setTouched(allTouched)

      // Don't submit if validation failed
      if (Object.keys(formErrors).length > 0) {
        return
      }

      // Submit
      if (onSubmit) {
        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [values, validateForm, onSubmit],
  )

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValuesRef.current)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    isValid: !isSubmitting && isValid,
    isLoading,
    setLoading,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  }
}

/**
 * useFormField Hook - Single field state management
 * Useful for decoupled field components
 */
export interface UseFormFieldOptions {
  initialValue?: string
  validate?: (value: string) => string | null
  onValidate?: (error: string | null) => void
}

export interface UseFormFieldReturn {
  value: string
  setValue: (value: string) => void
  error: string | null
  setError: (error: string | null) => void
  isTouched: boolean
  setTouched: (touched: boolean) => void
  isValid: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleBlur: () => void
}

export function useFormField({
  initialValue = '',
  validate,
  onValidate,
}: UseFormFieldOptions): UseFormFieldReturn {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [isTouched, setTouched] = useState(false)

  const isValid = !error

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      if (isTouched && validate) {
        const validationError = validate(newValue)
        setError(validationError)
        onValidate?.(validationError)
      }
    },
    [isTouched, validate, onValidate],
  )

  const handleBlur = useCallback(() => {
    setTouched(true)

    if (validate) {
      const validationError = validate(value)
      setError(validationError)
      onValidate?.(validationError)
    }
  }, [value, validate, onValidate])

  return {
    value,
    setValue,
    error,
    setError,
    isTouched,
    setTouched,
    isValid,
    handleChange,
    handleBlur,
  }
}
