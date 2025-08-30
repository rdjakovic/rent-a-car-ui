import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 500 });
    
    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 250ms (less than delay)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    // Value should still be the initial value
    expect(result.current).toBe('initial');

    // Fast-forward time by another 250ms (total 500ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    // Now the value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    // Change the value multiple times rapidly
    rerender({ value: 'change1', delay: 500 });
    
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    rerender({ value: 'change2', delay: 500 });
    
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    rerender({ value: 'final', delay: 500 });
    
    // Value should still be initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Fast-forward by full delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Should now have the final value
    expect(result.current).toBe('final');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    );

    rerender({ value: 'updated', delay: 100 });
    
    // Fast-forward by 100ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe('updated');
  });

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    rerender({ value: 'updated', delay: 0 });
    
    // With zero delay, should update immediately after next tick
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(result.current).toBe('updated');
  });

  it('should handle different data types', () => {
    // Test with numbers
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 1, delay: 100 } }
    );

    numberRerender({ value: 2, delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(numberResult.current).toBe(2);

    // Test with objects
    const initialObj = { id: 1, name: 'initial' };
    const updatedObj = { id: 2, name: 'updated' };
    
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObj, delay: 100 } }
    );

    objectRerender({ value: updatedObj, delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(objectResult.current).toBe(updatedObj);

    // Test with arrays
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];
    
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialArray, delay: 100 } }
    );

    arrayRerender({ value: updatedArray, delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(arrayResult.current).toBe(updatedArray);
  });

  it('should handle boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: false, delay: 100 } }
    );

    expect(result.current).toBe(false);

    rerender({ value: true, delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe(true);
  });

  it('should handle null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: null as string | null, delay: 100 } }
    );

    expect(result.current).toBe(null);

    rerender({ value: 'not null', delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe('not null');

    rerender({ value: undefined as string | undefined, delay: 100 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe(undefined);
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });
    
    // Unmount before timeout completes
    unmount();
    
    // clearTimeout should have been called
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('should handle delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Change value and delay
    rerender({ value: 'updated', delay: 100 });
    
    // Fast-forward by new delay (100ms)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe('updated');
  });

  it('should handle multiple rapid delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Change value and delay multiple times
    rerender({ value: 'change1', delay: 200 });
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    rerender({ value: 'change2', delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(150);
    });
    
    rerender({ value: 'final', delay: 100 });
    
    // Should still be initial value
    expect(result.current).toBe('initial');
    
    // Fast-forward by final delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    expect(result.current).toBe('final');
  });

  describe('edge cases', () => {
    it('should handle negative delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: -100 } }
      );

      rerender({ value: 'updated', delay: -100 });
      
      // Negative delay should behave like zero delay
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should handle very large delay values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 1000000 } }
      );

      rerender({ value: 'updated', delay: 1000000 });
      
      // Should not update even after a reasonable time
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(result.current).toBe('initial');
      
      // Should update after the full delay
      act(() => {
        vi.advanceTimersByTime(990000);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'same', delay: 100 } }
      );

      // Update with the same value
      rerender({ value: 'same', delay: 100 });
      
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      expect(result.current).toBe('same');
    });
  });
});