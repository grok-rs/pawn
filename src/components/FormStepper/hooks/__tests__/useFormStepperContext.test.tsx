import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useFormStepperContext } from '../useFormStepperContext';
import FormStepperContext from '../../FormStepperContext/FormStepperContext';
import { FormStepperContextType } from '../../types';

describe('useFormStepperContext', () => {
  test('returns context value when used within provider', () => {
    const mockContextValue: FormStepperContextType<any> = {
      activeStep: 1,
      steps: [],
      isSubmitting: false,
      isSubmitButtonDisabled: false,
      onLastStep: vi.fn(),
      isLastStep: false,
      isFirstStep: false,
      onSubmit: vi.fn(),
      handleDisableSubmitButton: vi.fn(),
      onCancel: vi.fn(),
      onStepBack: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormStepperContext.Provider value={mockContextValue}>
        {children}
      </FormStepperContext.Provider>
    );

    const { result } = renderHook(() => useFormStepperContext(), { wrapper });

    expect(result.current).toEqual(mockContextValue);
  });

  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => renderHook(() => useFormStepperContext())).toThrow(
      'No form stepper context found!'
    );

    console.error = originalError;
  });

  test('returns typed context value with generics', () => {
    interface TestFormData {
      field1: string;
      field2: number;
    }

    const mockContextValue: FormStepperContextType<TestFormData> = {
      activeStep: 0,
      steps: [],
      isSubmitting: false,
      isSubmitButtonDisabled: false,
      onLastStep: vi.fn(),
      isLastStep: true,
      isFirstStep: true,
      onSubmit: vi.fn(),
      handleDisableSubmitButton: vi.fn(),
      onCancel: vi.fn(),
      onStepBack: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormStepperContext.Provider value={mockContextValue}>
        {children}
      </FormStepperContext.Provider>
    );

    const { result } = renderHook(() => useFormStepperContext<TestFormData>(), {
      wrapper,
    });

    expect(result.current).toEqual(mockContextValue);
    expect(typeof result.current.onSubmit).toBe('function');
    expect(typeof result.current.handleDisableSubmitButton).toBe('function');
  });

  test('works with default context value structure', () => {
    const mockMinimalContext: FormStepperContextType<any> = {
      activeStep: 0,
      steps: [],
      onSubmit: vi.fn(),
      handleDisableSubmitButton: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FormStepperContext.Provider value={mockMinimalContext}>
        {children}
      </FormStepperContext.Provider>
    );

    const { result } = renderHook(() => useFormStepperContext(), { wrapper });

    expect(result.current.activeStep).toBe(0);
    expect(result.current.steps).toEqual([]);
    expect(result.current.onSubmit).toBeDefined();
    expect(result.current.handleDisableSubmitButton).toBeDefined();
  });
});
