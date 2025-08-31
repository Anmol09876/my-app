'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCalculatorStore } from '@/lib/store';

const Calculator = () => {
  const {
    display,
    input,
    result,
    mode,
    isShiftActive,
    isInverseActive,
    isHyperbolicActive,
    memory,
    history,
    appendToInput,
    clearInput,
    clearAll,
    calculate,
    setMode,
    toggleShift,
    toggleInverse,
    toggleHyperbolic,
    backspace,
    storeInMemory,
    recallFromMemory,
    clearMemory,
    clearHistory,
    error
  } = useCalculatorStore();

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.match(/[0-9.]/)) {
        appendToInput(e.key);
      } else if (e.key.match(/[+\-*/^%()]/)) {
        appendToInput(e.key);
      } else if (e.key === 'Enter') {
        calculate();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (e.key === 'Backspace') {
        backspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendToInput, calculate, clearAll, backspace]);

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 rounded-xl overflow-hidden shadow-lg">
      {/* Left: Keypad */}
      <div className="calculator-keypad order-2 lg:order-1">
        {/* Mode toggles */}
        <div className="col-span-4 grid grid-cols-3 gap-2 mb-2">
          <Button
            variant={mode === 'DEG' ? 'secondary' : 'outline'}
            onClick={() => setMode('DEG')}
            className="text-xs sm:text-sm"
          >
            DEG
          </Button>
          <Button
            variant={mode === 'RAD' ? 'secondary' : 'outline'}
            onClick={() => setMode('RAD')}
            className="text-xs sm:text-sm"
          >
            RAD
          </Button>
          <Button
            variant={mode === 'GRAD' ? 'secondary' : 'outline'}
            onClick={() => setMode('GRAD')}
            className="text-xs sm:text-sm"
          >
            GRAD
          </Button>
        </div>

        {/* Function toggles */}
        <div className="col-span-4 grid grid-cols-3 gap-2 mb-2">
          <Button
            variant={isShiftActive ? 'secondary' : 'outline'}
            onClick={toggleShift}
            className="text-xs sm:text-sm"
          >
            SHIFT
          </Button>
          <Button
            variant={isInverseActive ? 'secondary' : 'outline'}
            onClick={toggleInverse}
            className="text-xs sm:text-sm"
          >
            INV
          </Button>
          <Button
            variant={isHyperbolicActive ? 'secondary' : 'outline'}
            onClick={toggleHyperbolic}
            className="text-xs sm:text-sm"
          >
            HYP
          </Button>
        </div>

        {/* Scientific functions */}
        <Button variant="function" size="calc" onClick={() => appendToInput('sin(')} className="text-xs sm:text-sm">
          {isInverseActive ? (isHyperbolicActive ? 'sinh⁻¹' : 'sin⁻¹') : (isHyperbolicActive ? 'sinh' : 'sin')}
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('cos(')} className="text-xs sm:text-sm">
          {isInverseActive ? (isHyperbolicActive ? 'cosh⁻¹' : 'cos⁻¹') : (isHyperbolicActive ? 'cosh' : 'cos')}
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('tan(')} className="text-xs sm:text-sm">
          {isInverseActive ? (isHyperbolicActive ? 'tanh⁻¹' : 'tan⁻¹') : (isHyperbolicActive ? 'tanh' : 'tan')}
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('π')} className="text-xs sm:text-sm">
          π
        </Button>

        <Button variant="function" size="calc" onClick={() => appendToInput('log(')} className="text-xs sm:text-sm">
          {isInverseActive ? '10^' : 'log'}
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('ln(')} className="text-xs sm:text-sm">
          {isInverseActive ? 'e^' : 'ln'}
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('sqrt(')} className="text-xs sm:text-sm">
          √
        </Button>
        <Button variant="function" size="calc" onClick={() => appendToInput('e')} className="text-xs sm:text-sm">
          e
        </Button>

        {/* Memory functions */}
        <Button variant="memory" size="calc" onClick={() => storeInMemory('M')} className="text-xs sm:text-sm">M+</Button>
        <Button variant="memory" size="calc" onClick={() => {
          const currentValue = parseFloat(display);
          if (!isNaN(currentValue)) {
            const memoryValue = parseFloat(memory && memory['M'] ? memory['M'] : '0');
            storeInMemory('M', (memoryValue - currentValue).toString());
          }
        }} className="text-xs sm:text-sm">M-</Button>
        <Button variant="memory" size="calc" onClick={() => recallFromMemory('M')} className="text-xs sm:text-sm">MR</Button>
        <Button variant="memory" size="calc" onClick={() => clearMemory('M')} className="text-xs sm:text-sm">MC</Button>

        {/* Numbers and basic operations */}
        <Button variant="calculator" size="calc" onClick={() => appendToInput('7')} className="text-xs sm:text-sm">7</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('8')} className="text-xs sm:text-sm">8</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('9')} className="text-xs sm:text-sm">9</Button>
        <Button variant="operation" size="calc" onClick={() => appendToInput('/')} className="text-xs sm:text-sm">/</Button>

        <Button variant="calculator" size="calc" onClick={() => appendToInput('4')} className="text-xs sm:text-sm">4</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('5')} className="text-xs sm:text-sm">5</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('6')} className="text-xs sm:text-sm">6</Button>
        <Button variant="operation" size="calc" onClick={() => appendToInput('*')} className="text-xs sm:text-sm">×</Button>

        <Button variant="calculator" size="calc" onClick={() => appendToInput('1')} className="text-xs sm:text-sm">1</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('2')} className="text-xs sm:text-sm">2</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('3')} className="text-xs sm:text-sm">3</Button>
        <Button variant="operation" size="calc" onClick={() => appendToInput('-')} className="text-xs sm:text-sm">−</Button>

        <Button variant="calculator" size="calc" onClick={() => appendToInput('0')} className="text-xs sm:text-sm">0</Button>
        <Button variant="calculator" size="calc" onClick={() => appendToInput('.')} className="text-xs sm:text-sm">.</Button>
        <Button variant="special" size="calc" onClick={calculate} className="text-xs sm:text-sm">=</Button>
        <Button variant="operation" size="calc" onClick={() => appendToInput('+')} className="text-xs sm:text-sm">+</Button>

        {/* Additional operations */}
        <Button variant="operation" size="calc" onClick={() => appendToInput('^')} className="text-xs sm:text-sm">x^y</Button>
        <Button variant="operation" size="calc" onClick={() => appendToInput('%')} className="text-xs sm:text-sm">%</Button>
        <Button variant="special" size="calc" onClick={clearInput} className="text-xs sm:text-sm">C</Button>
        <Button variant="special" size="calc" onClick={clearAll} className="text-xs sm:text-sm">AC</Button>
      </div>

      {/* Center: Display and History */}
      <div className="calculator-display order-1 lg:order-2">
        <div className="flex-1 flex flex-col justify-end items-end">
          <div className="text-sm text-muted-foreground mb-2 w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
            {input}
          </div>
          <div className="text-2xl sm:text-4xl font-bold w-full overflow-x-auto text-right whitespace-nowrap scrollbar-hide">
            {error ? <span className="text-destructive">{error}</span> : display}
          </div>
          <div className="text-xs text-muted-foreground mt-2 w-full text-right">
            {mode} {isShiftActive && '| SHIFT'} {isInverseActive && '| INV'} {isHyperbolicActive && '| HYP'}
            {memory ? (Object.keys(memory).length > 0 ? ' | Memory: Active' : '') : ''}
          </div>
        </div>
      </div>

      {/* Right: Variables, Graphs, Programs */}
      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-lg font-medium mb-2">History</h3>
        <div className="flex-1 overflow-y-auto max-h-[300px] sm:max-h-[500px] scrollbar-thin">
          {history && history.length > 0 ? (
            <div className="space-y-2">
              {history.map((item, index) => (
                <div 
                  key={index} 
                  className="p-2 rounded border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => appendToInput(item.result)}
                >
                  <div className="text-sm">{item.input}</div>
                  <div className="text-base font-medium">{item.result}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No history yet. Perform calculations to see them here.
            </div>
          )}
        </div>
        {history && history.length > 0 && (
          <Button 
            variant="outline" 
            className="mt-2 w-full" 
            onClick={clearHistory}
          >
            Clear History
          </Button>
        )}
      </div>
    </div>
  );
};

export default Calculator;