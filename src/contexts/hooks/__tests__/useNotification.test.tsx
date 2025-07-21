import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { useNotification } from '../useNotification';
import { NotificationProvider } from '../../NotificationContext/NotificationProvider';

describe('useNotification', () => {
  describe('Hook behavior', () => {
    it('should return notification context methods when used within provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result } = renderHook(() => useNotification(), { wrapper });

      expect(result.current).toHaveProperty('showNotification');
      expect(result.current).toHaveProperty('showSuccess');
      expect(result.current).toHaveProperty('showError');
      expect(result.current).toHaveProperty('showWarning');
      expect(result.current).toHaveProperty('showInfo');

      expect(typeof result.current.showNotification).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');
    });

    it('should throw error when used outside of NotificationProvider', () => {
      expect(() => {
        renderHook(() => useNotification());
      }).toThrow('useNotification must be used within a NotificationProvider');
    });

    it('should provide function references that may change on re-render', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result, rerender } = renderHook(() => useNotification(), {
        wrapper,
      });

      rerender();

      // Functions maintain their type and behavior (they may be different instances)
      expect(typeof result.current.showNotification).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');

      // Functions should still work after re-render
      expect(() => result.current.showSuccess('test')).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should throw descriptive error message', () => {
      expect(() => {
        renderHook(() => useNotification());
      }).toThrow(/useNotification must be used within a NotificationProvider/);
    });

    it('should throw error with undefined context', () => {
      // This simulates when the context is undefined
      expect(() => {
        renderHook(() => useNotification());
      }).toThrow();
    });
  });

  describe('Provider integration', () => {
    it('should work with nested providers', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationProvider>
          <div>
            <NotificationProvider>{children}</NotificationProvider>
          </div>
        </NotificationProvider>
      );

      const { result } = renderHook(() => useNotification(), { wrapper });

      expect(result.current).toHaveProperty('showNotification');
      expect(typeof result.current.showNotification).toBe('function');
    });

    it('should maintain type safety', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result } = renderHook(() => useNotification(), { wrapper });

      // These should not throw TypeScript errors (tested at compile time)
      expect(() => result.current.showSuccess('test')).not.toThrow();
      expect(() => result.current.showError('test')).not.toThrow();
      expect(() => result.current.showWarning('test')).not.toThrow();
      expect(() => result.current.showInfo('test')).not.toThrow();
      expect(() => result.current.showNotification('test')).not.toThrow();
      expect(() =>
        result.current.showNotification('test', 'success')
      ).not.toThrow();
    });

    it('should handle multiple hook instances within same provider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result: result1 } = renderHook(() => useNotification(), {
        wrapper,
      });
      const { result: result2 } = renderHook(() => useNotification(), {
        wrapper,
      });

      // Both hooks should return functions of the correct type
      expect(typeof result1.current.showNotification).toBe('function');
      expect(typeof result2.current.showNotification).toBe('function');
      expect(typeof result1.current.showSuccess).toBe('function');
      expect(typeof result2.current.showSuccess).toBe('function');
      expect(typeof result1.current.showError).toBe('function');
      expect(typeof result2.current.showError).toBe('function');
      expect(typeof result1.current.showWarning).toBe('function');
      expect(typeof result2.current.showWarning).toBe('function');
      expect(typeof result1.current.showInfo).toBe('function');
      expect(typeof result2.current.showInfo).toBe('function');

      // Both should be able to call their functions without errors
      expect(() => result1.current.showSuccess('test1')).not.toThrow();
      expect(() => result2.current.showSuccess('test2')).not.toThrow();
    });
  });
});
