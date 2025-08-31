import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string): string {
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle special cases
  if (!isFinite(value)) {
    return value === Infinity ? '∞' : value === -Infinity ? '-∞' : 'Error';
  }
  
  // Convert to string with appropriate precision
  const str = value.toString();
  
  // If it's an integer or has few decimal places, return as is
  if (Number.isInteger(value) || str.length < 15) {
    return str;
  }
  
  // For very large or small numbers, use scientific notation
  if (Math.abs(value) > 1e10 || (Math.abs(value) < 1e-7 && value !== 0)) {
    return value.toExponential(10);
  }
  
  // Otherwise limit decimal places
  return value.toPrecision(10).replace(/\.?0+$/, '');
}

export function isOperator(char: string): boolean {
  return ['+', '-', '*', '/', '^', '%'].includes(char);
}

export function getPrecedence(operator: string): number {
  switch (operator) {
    case '+': 
    case '-': 
      return 1;
    case '*': 
    case '/': 
    case '%': 
      return 2;
    case '^': 
      return 3;
    default: 
      return 0;
  }
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}