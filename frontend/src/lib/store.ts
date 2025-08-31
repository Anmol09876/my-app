import { create } from 'zustand';
import { formatNumber } from './utils';
import Decimal from 'decimal.js';

// Configure Decimal.js for high precision
Decimal.set({ precision: 64, rounding: 4 });

type CalculatorMode = 'DEG' | 'RAD' | 'GRAD';
type CalculatorMemory = { [key: string]: string };
type CalculationHistory = { input: string; result: string; latex?: string }[];

interface CalculatorState {
  display: string;
  input: string;
  result: string;
  latex: string;
  memory: CalculatorMemory;
  history: CalculationHistory;
  mode: CalculatorMode;
  isShiftActive: boolean;
  isInverseActive: boolean;
  isHyperbolicActive: boolean;
  precision: number;
  error: string | null;
  
  // Actions
  appendToInput: (value: string) => void;
  clearInput: () => void;
  clearAll: () => void;
  calculate: () => void;
  setMode: (mode: CalculatorMode) => void;
  toggleShift: () => void;
  toggleInverse: () => void;
  toggleHyperbolic: () => void;
  storeInMemory: (key: string, value?: string) => void;
  recallFromMemory: (key: string) => void;
  clearMemory: (key?: string) => void;
  clearHistory: () => void;
  setPrecision: (precision: number) => void;
  backspace: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  display: '0',
  input: '',
  result: '',
  latex: '',
  memory: {},
  history: [],
  mode: 'DEG',
  isShiftActive: false,
  isInverseActive: false,
  isHyperbolicActive: false,
  precision: 10,
  error: null,
  
  appendToInput: (value) => {
    set((state) => {
      // If there's a result and we're starting a new calculation
      if (state.result && !isNaN(Number(value)) && !isOperator(value)) {
        return { input: value, display: value, result: '' };
      }
      
      // If there's a result and we're continuing with an operation
      if (state.result && isOperator(value)) {
        return { 
          input: state.result + value, 
          display: state.result + value,
          result: '' 
        };
      }
      
      const newInput = state.input + value;
      return { input: newInput, display: newInput, error: null };
    });
  },
  
  clearInput: () => set({ input: '', display: '0', error: null }),
  
  clearAll: () => set({ 
    input: '', 
    display: '0', 
    result: '', 
    latex: '',
    error: null 
  }),
  
  calculate: () => {
    const { input, mode, precision } = get();
    
    if (!input) return;
    
    try {
      // This is a simplified calculation - in a real app, you'd use a proper
      // expression parser and evaluator like math.js or nerdamer
      const sanitizedInput = prepareInputForCalculation(input, mode);
      const result = new Decimal(eval(sanitizedInput)).toString();
      const formattedResult = formatNumber(result);
      
      set((state) => ({
        result: formattedResult,
        display: formattedResult,
        latex: generateLatex(input, formattedResult),
        history: [
          { input, result: formattedResult, latex: generateLatex(input, formattedResult) },
          ...state.history
        ].slice(0, 100), // Keep last 100 calculations
        error: null
      }));
    } catch (error) {
      set({ error: 'Error in calculation' });
    }
  },
  
  setMode: (mode) => set({ mode }),
  
  toggleShift: () => set((state) => ({ isShiftActive: !state.isShiftActive })),
  
  toggleInverse: () => set((state) => ({ isInverseActive: !state.isInverseActive })),
  
  toggleHyperbolic: () => set((state) => ({ isHyperbolicActive: !state.isHyperbolicActive })),
  
  storeInMemory: (key, value) => {
    const { result, input, display, memory } = get();
    const valueToStore = value || result || display || input;
    
    if (valueToStore) {
      // If adding to existing memory value
      if (!value && memory[key]) {
        const currentValue = parseFloat(memory[key]);
        const newValue = currentValue + parseFloat(valueToStore);
        set((state) => ({
          memory: { ...state.memory, [key]: newValue.toString() }
        }));
      } else {
        // Store new value
        set((state) => ({
          memory: { ...state.memory, [key]: valueToStore }
        }));
      }
    }
  },
  
  recallFromMemory: (key) => {
    const { memory } = get();
    const value = memory[key];
    
    if (value) {
      set((state) => {
        // If we're starting a new calculation
        if (state.result) {
          return {
            input: value,
            display: value,
            result: ''
          };
        }
        // Otherwise append to current input
        return {
          input: state.input + value,
          display: state.input + value
        };
      });
    }
  },
  
  clearMemory: (key) => {
    if (key) {
      set((state) => {
        const newMemory = { ...state.memory };
        delete newMemory[key];
        return { memory: newMemory };
      });
    } else {
      set({ memory: {} });
    }
  },
  
  clearHistory: () => set({ history: [] }),
  
  setPrecision: (precision) => set({ precision }),
  
  backspace: () => set((state) => {
    if (!state.input) return state;
    const newInput = state.input.slice(0, -1);
    return { 
      input: newInput, 
      display: newInput || '0',
      result: '',
      error: null
    };
  })
}));

// Helper functions
function isOperator(value: string): boolean {
  return ['+', '-', '*', '/', '^', '%'].includes(value);
}

function prepareInputForCalculation(input: string, mode: CalculatorMode): string {
  // Replace mathematical functions and constants with their JavaScript equivalents
  let prepared = input
    .replace(/\^/g, '**') // Exponentiation
    .replace(/π/g, 'Math.PI')
    .replace(/e/g, 'Math.E')
    .replace(/sin\(/g, `Math.sin(${mode === 'DEG' ? '* Math.PI / 180' : ''})`)
    .replace(/cos\(/g, `Math.cos(${mode === 'DEG' ? '* Math.PI / 180' : ''})`)
    .replace(/tan\(/g, `Math.tan(${mode === 'DEG' ? '* Math.PI / 180' : ''})`)
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(');
  
  return prepared;
}

function generateLatex(input: string, result: string): string {
  // This is a simplified version - a real implementation would use a proper
  // LaTeX generator or math expression parser
  return `${input} = ${result}`;
}