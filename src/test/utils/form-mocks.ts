import { vi } from 'vitest';
import type React from 'react';
import type {
  FieldValues,
  UseFormReturn,
  UseFormRegisterReturn,
  FormState,
  UseFormGetValues,
  UseFormSetValue,
  UseFormRegister,
  FieldError,
} from 'react-hook-form';

/**
 * Creates a mock FieldError object
 */
export const createMockFieldError = (message: string): FieldError => ({
  type: 'required',
  message,
});

/**
 * Creates a mock UseFormRegisterReturn object
 */
export const createMockRegisterReturn = (
  name: string
): UseFormRegisterReturn => ({
  name,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
});

/**
 * Creates a mock FormState object with proper defaults
 */
export const createMockFormState = <T extends FieldValues = FieldValues>(
  overrides: Partial<FormState<T>> = {}
): FormState<T> => ({
  errors: {},
  isDirty: false,
  isLoading: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  isSubmitting: false,
  isValidating: false,
  isValid: true,
  disabled: false,
  submitCount: 0,
  defaultValues: undefined,
  dirtyFields: {},
  touchedFields: {},
  validatingFields: {},
  ...overrides,
});

/**
 * Creates a mock Subjects object for react-hook-form
 */
const createMockSubjects = () => {
  const mockSubject = {
    observers: [],
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    next: vi.fn(),
  };

  return {
    state: mockSubject,
    values: mockSubject,
    array: mockSubject,
  };
};

/**
 * Creates a mock Control object with proper defaults
 */
export const createMockControl = <T extends FieldValues = FieldValues>() => {
  const mockSubjects = createMockSubjects();

  const mockControl = {
    register: vi.fn(),
    unregister: vi.fn(),
    getFieldState: vi.fn(() => ({
      invalid: false,
      isDirty: false,
      isTouched: false,
      isValidating: false,
      error: undefined,
    })),
    handleSubmit: vi.fn(onValid => (event?: React.BaseSyntheticEvent) => {
      event?.preventDefault?.();
      const emptyData: T = Object.create(null);
      return onValid(emptyData, event);
    }),
    setError: vi.fn(),
    _subjects: mockSubjects,
    _removeUnmounted: vi.fn(),
    _names: {
      mount: new Set<string>(),
      unMount: new Set<string>(),
      array: new Set<string>(),
      watch: new Set<string>(),
      disabled: new Set<string>(),
    },
    _state: { mount: false, action: false, watch: false },
    _defaultValues: {},
    _formValues: {},
    _stateFlags: { mount: false, action: false, watch: false },
    _updateValid: vi.fn(),
    _updateIsValidating: vi.fn(),
    _updateFieldArray: vi.fn(),
    _executeSchema: vi.fn(),
    _getWatch: vi.fn(),
    _getDirty: vi.fn(),
    _setErrors: vi.fn(),
    _updateFormState: vi.fn(),
    _getFieldArray: vi.fn(),
    _reset: vi.fn(),
    _resetDefaultValues: vi.fn(),
    _updateDisabledField: vi.fn(),
    _fields: {},
    _proxyFormState: {
      isDirty: false,
      isValidating: false,
      dirtyFields: false,
      touchedFields: false,
      validatingFields: false,
      errors: false,
      isValid: false,
    },
    _getDirtyFields: vi.fn(),
    _formState: createMockFormState(),
    _options: {
      mode: 'onSubmit' as const,
      reValidateMode: 'onChange' as const,
      shouldFocusError: true,
      shouldUnregister: false,
      shouldUseNativeValidation: false,
      criteriaMode: 'firstError' as const,
      delayError: undefined,
    },
    _formName: 'test-form',
    _resolver: undefined,
    _disableForm: vi.fn(),
  };

  // Return the mock control - TypeScript will infer the correct type
  return mockControl;
};

/**
 * Creates a complete mock UseFormReturn object with proper defaults
 */
export const createMockUseFormReturn = <T extends FieldValues = FieldValues>(
  overrides: Partial<UseFormReturn<T>> = {}
) => {
  // Create properly typed empty form data
  const emptyFormData: T = Object.create(null);

  const mockGetValues: UseFormGetValues<T> = vi
    .fn()
    .mockReturnValue(emptyFormData);
  const mockSetValue: UseFormSetValue<T> = vi.fn();

  const mockRegister: UseFormRegister<T> = vi
    .fn()
    .mockImplementation((name: string) => createMockRegisterReturn(name));

  const baseReturn = {
    register: mockRegister,
    control: createMockControl<T>(),
    formState: createMockFormState<T>(),
    watch: vi.fn(),
    getValues: mockGetValues,
    getFieldState: vi.fn(() => ({
      invalid: false,
      isDirty: false,
      isTouched: false,
      isValidating: false,
      error: undefined,
    })),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    setValue: mockSetValue,
    trigger: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
    resetField: vi.fn(),
    handleSubmit: vi.fn(onValid => (event?: React.BaseSyntheticEvent) => {
      event?.preventDefault?.();
      return onValid(emptyFormData, event);
    }),
    unregister: vi.fn(),
    setFocus: vi.fn(),
    ...overrides,
  };

  // Return the mock - TypeScript will infer the correct type
  return baseReturn;
};
