// Test types for Jest DOM matchers in Bun environment
import type { Matchers } from 'bun:test';

// Extend Performance interface to include memory (Chrome-specific)
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

declare module 'bun:test' {
  interface Matchers<T = unknown> {
    toBeInTheDocument(): T;
    toHaveClass(className: string): T;
    toHaveFocus(): T;
    toHaveAttribute(attribute: string, value?: string): T;
    toHaveValue(value: string | number): T;
    toBeChecked(): T;
    toBeDisabled(): T;
    toBeVisible(): T;
    toContainElement(element: HTMLElement | null): T;
    toHaveTextContent(text: string | RegExp): T;
  }
}

export {};