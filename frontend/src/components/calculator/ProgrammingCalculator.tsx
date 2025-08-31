'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

const ProgrammingCalculator = () => {
  const [code, setCode] = useState('// Enter your calculation script here\n// Example: x = 10; y = 20; result = x + y;');
  const [output, setOutput] = useState('');
  const [variables, setVariables] = useState<{name: string, value: string}[]>([]);
  const [mode, setMode] = useState('javascript');

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 rounded-xl overflow-hidden shadow-lg">
      <div className="calculator-keypad order-2 lg:order-1">
        <div className="col-span-4 p-4 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Programming Language</label>
            <select 
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="default" className="text-xs sm:text-sm">Run</Button>
            <Button variant="outline" className="text-xs sm:text-sm">Clear</Button>
            <Button variant="outline" className="text-xs sm:text-sm">Save</Button>
            <Button variant="outline" className="text-xs sm:text-sm">Load</Button>
          </div>
        </div>
      </div>

      <div className="calculator-display bg-card order-1 lg:order-2">
        <div className="w-full h-full flex flex-col p-4">
          <h3 className="text-base sm:text-lg font-medium mb-2">Code Editor</h3>
          <div className="flex-1 border rounded-md bg-background overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-2 sm:p-4 font-mono text-xs sm:text-sm bg-background resize-none focus:outline-none"
            />
          </div>
          
          <h3 className="text-base sm:text-lg font-medium mt-4 mb-2">Output</h3>
          <div className="h-24 sm:h-32 border rounded-md bg-background p-2 sm:p-4 font-mono text-xs sm:text-sm overflow-y-auto">
            {output || 'Output will appear here after running your code.'}
          </div>
        </div>
      </div>

      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-base sm:text-lg font-medium mb-2">Variables</h3>
        <div className="border rounded-md bg-background p-2 mb-4 max-h-32 sm:max-h-40 overflow-y-auto scrollbar-thin">
          {variables.length > 0 ? (
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {variables.map((v, i) => (
                  <tr key={i}>
                    <td>{v.name}</td>
                    <td>{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-2">
              No variables defined yet.
            </p>
          )}
        </div>
        
        <h3 className="text-base sm:text-lg font-medium mb-2">Saved Programs</h3>
        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            No saved programs yet.
          </p>
        </div>
        
        <h3 className="text-base sm:text-lg font-medium mt-4 mb-2">Examples</h3>
        <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto scrollbar-thin">
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            Basic Calculation
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            Quadratic Equation Solver
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            Fibonacci Sequence
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            Prime Number Checker
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProgrammingCalculator;