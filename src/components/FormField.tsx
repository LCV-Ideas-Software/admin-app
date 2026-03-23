/**
 * Unified Form Field Component
 * 
 * Modernized form field with:
 * - Correct autocomplete attributes for 1Password, Proton Pass, browsers
 * - Full accessibility (ARIA labels, semantic HTML)
 * - Inline validation visual feedback
 * - Consistent styling with design system
 * - Support for email, text, password, number, date, tel, url, search
 */

import { type ReactNode, useState, useId } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export type FormFieldType = 'email' | 'text' | 'password' | 'number' | 'date' | 'tel' | 'url' | 'search' | 'textarea'

export type FormFieldAutocomplete = 
  | 'off'
  | 'on'
  | 'email'
  | 'tel'
  | 'name'
  | 'given-name'
  | 'family-name'
  | 'username'
  | 'new-password'
  | 'current-password'
  | 'country'
  | 'country-name'
  | 'postal-code'
  | 'cc-number'
  | 'cc-exp'
  | 'cc-csc'
  | 'organization'
  | 'organization-title'
  | 'street-address'
  | 'address-level1'
  | 'address-level2'
  | 'bday'
  | 'url'
  | 'sex'
  | 'language'
  | 'photo'

export interface FormFieldProps {
  /** Unique field identifier (required for label association) */
  id: string
  
  /** Field name for form submission (required for autocomplete) */
  name: string
  
  /** Label text displayed above field */
  label: string
  
  /** Field type */
  type?: FormFieldType
  
  /** Input value */
  value: string
  
  /** Change handler */
  onChange: (value: string) => void
  
  /** Optional blur handler for validation trigger */
  onBlur?: () => void
  
  /** Placeholder text */
  placeholder?: string
  
  /** HTML5 autocomplete hint for password managers */
  autoComplete?: FormFieldAutocomplete
  
  /** Validation state: 'valid' | 'invalid' | undefined (default) */
  state?: 'valid' | 'invalid'
  
  /** Error message to display below field */
  error?: string
  
  /** Success message to display below field */
  success?: string
  
  /** Help text displayed below field */
  hint?: string
  
  /** Field is required */
  required?: boolean
  
  /** Field is disabled */
  disabled?: boolean
  
  /** Field is in loading state */
  isLoading?: boolean
  
  /** Minimum length */
  minLength?: number
  
  /** Maximum length */
  maxLength?: number
  
  /** Pattern for validation (e.g., regex) */
  pattern?: string
  
  /** HTML5 input mode */
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  
  /** Additional className for custom styling */
  className?: string
  
  /** Rows for textarea */
  rows?: number
  
  /** Custom validation function */
  validate?: (value: string) => boolean
  
  /** Aria-describedby for accessibility */
  ariaDescribedBy?: string
}

/**
 * FormField Component - Unified field with full accessibility and modern features
 * 
 * Usage:
 * ```tsx
 * <FormField
 *   id="email-login"
 *   name="email"
 *   label="Email"
 *   type="email"
 *   autoComplete="email"
 *   value={email}
 *   onChange={setEmail}
 *   onBlur={() => validateEmail(email)}
 *   error={emailError}
 *   required
 * />
 * ```
 */
export function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  state,
  error,
  success,
  hint,
  required = false,
  disabled = false,
  isLoading = false,
  minLength,
  maxLength,
  pattern,
  inputMode,
  className = '',
  rows = 3,
  validate,
  ariaDescribedBy,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hintId = useId()
  const errorId = useId()
  const successId = useId()

  // Build aria-describedby dynamically
  const describedBy: string[] = []
  if (hint) describedBy.push(hintId)
  if (error) describedBy.push(errorId)
  if (success) describedBy.push(successId)
  if (ariaDescribedBy) describedBy.push(ariaDescribedBy)
  const ariaDescription = describedBy.length > 0 ? describedBy.join(' ') : undefined

  const handleChange = (newValue: string) => {
    onChange(newValue)
    // Auto-validate on change if validator provided
    if (validate && state === 'invalid') {
      validate(newValue)
      // Parent will handle state update via onChange
    }
  }

  const fieldClassName = `
    form-field__input
    ${type === 'textarea' ? 'form-field__textarea' : ''}
    ${state === 'valid' ? 'form-field__input--valid' : ''}
    ${state === 'invalid' ? 'form-field__input--invalid' : ''}
    ${disabled ? 'form-field__input--disabled' : ''}
    ${isLoading ? 'form-field__input--loading' : ''}
    ${isFocused ? 'form-field__input--focused' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  // Determine autocomplete based on field type if not provided
  let finalAutoComplete = autoComplete
  if (!finalAutoComplete) {
    switch (type) {
      case 'email':
        finalAutoComplete = 'email'
        break
      case 'password':
        finalAutoComplete = 'current-password'
        break
      case 'tel':
        finalAutoComplete = 'tel'
        break
      case 'url':
        finalAutoComplete = 'url'
        break
      default:
        finalAutoComplete = 'off'
    }
  }

  const commonProps = {
    id,
    name,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onBlur: () => {
      setIsFocused(false)
      onBlur?.()
    },
    onFocus: () => setIsFocused(true),
    disabled: disabled || isLoading,
    required,
    minLength,
    maxLength,
    placeholder,
    autoComplete: finalAutoComplete,
    'aria-describedby': ariaDescription,
    'aria-invalid': state === 'invalid',
    'aria-label': label,
    className: fieldClassName,
  }

  return (
    <div className="form-field">
      {/* Label */}
      <label htmlFor={id} className="form-field__label">
        {label}
        {required && <span className="form-field__required" title="Campo obrigatório">*</span>}
      </label>

      {/* Input Container for visual feedback */}
      <div className="form-field__wrapper">
        {/* Input or Textarea */}
        {type === 'textarea' ? (
          <textarea
            {...(commonProps as any)}
            rows={rows}
          />
        ) : (
          <input
            {...(commonProps as any)}
            type={type}
            inputMode={inputMode}
            pattern={type === 'email' || type === 'url' || type === 'tel' ? pattern : undefined}
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="form-field__loader" aria-hidden="true">
            <div className="form-field__spinner" />
          </div>
        )}

        {/* State indicator icons */}
        {state === 'valid' && !isLoading && (
          <div className="form-field__icon form-field__icon--valid" aria-hidden="true">
            <CheckCircle2 size={18} />
          </div>
        )}
        {state === 'invalid' && !isLoading && (
          <div className="form-field__icon form-field__icon--invalid" aria-hidden="true">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

      {/* Support text below field */}
      <div className="form-field__support">
        {error && (
          <div id={errorId} className="form-field__error" role="alert">
            {error}
          </div>
        )}
        {success && !error && (
          <div id={successId} className="form-field__success">
            {success}
          </div>
        )}
        {hint && !error && (
          <div id={hintId} className="form-field__hint">
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * FormFieldGroup Component - Multiple fields in a grid
 * Useful for organizing multiple fields in forms
 */
export interface FormFieldGroupProps {
  children: ReactNode
  /** Number of columns (1-2) */
  cols?: 1 | 2
  className?: string
}

export function FormFieldGroup({
  children,
  cols = 2,
  className = '',
}: FormFieldGroupProps) {
  return (
    <div className={`form-field-group form-field-group--cols-${cols} ${className}`.trim()}>
      {children}
    </div>
  )
}
