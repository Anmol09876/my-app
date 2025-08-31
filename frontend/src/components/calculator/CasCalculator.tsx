'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const CasCalculator = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [latex, setLatex] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [variable, setVariable] = useState('x');
  const [operation, setOperation] = useState('simplify');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVariable(e.target.value);
  };

  const handleOperation = async (op: string) => {
    setOperation(op);
    if (!input) {
      setError('Please enter an expression');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:8000/api/compute/cas/${op}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expr: input,
          mode: 'cas',
          settings: {
            variable: variable,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data.result);
      setLatex(data.latex);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResult('');
      setLatex('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-6 p-6 h-full">
        {/* Left panel - Input and Operations */}
        <div className="bg-card rounded-lg border shadow-sm order-2 lg:order-1 p-4">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <input 
              value={input} 
              onChange={handleInputChange} 
              placeholder="Enter expression (e.g., x^2 + 2*x + 1)" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input 
              value={variable} 
              onChange={handleVariableChange} 
              placeholder="Variable" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-3">Basic Operations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button 
                onClick={() => handleOperation('simplify')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Simplify
              </Button>
              <Button 
                onClick={() => handleOperation('factor')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Factor
              </Button>
              <Button 
                onClick={() => handleOperation('expand')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Expand
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Advanced Operations</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleOperation('solve')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Solve
              </Button>
              <Button 
                onClick={() => handleOperation('differentiate')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Diff
              </Button>
              <Button 
                onClick={() => handleOperation('integrate')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Integrate
              </Button>
              <Button 
                onClick={() => handleOperation('limit')} 
                variant="outline" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-14 text-sm font-medium"
                disabled={loading || !input}
              >
                Limit
              </Button>
            </div>
          </div>
        </div>

        {/* Middle panel - Display */}
        <div className="order-1 lg:order-2">
          <div className="bg-card rounded-lg border shadow-sm p-6 h-full w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-500 p-4 text-sm sm:text-base">{error}</div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="mb-6 p-4 border-b">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {input || 'Enter an expression'}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-right">
                    {result || 'Result will appear here'}
                  </div>
                </div>
                {latex && (
                  <div className="mt-4 p-4 bg-muted rounded-md border">
                    <p className="text-xs sm:text-sm font-mono">LaTeX: {latex}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Help */}
        <div className="order-3 lg:order-3">
          <div className="bg-card rounded-lg border shadow-sm p-4 h-full">
            <h3 className="text-lg font-medium mb-4">CAS Operations</h3>
            <div className="overflow-y-auto max-h-[300px] sm:max-h-[500px] scrollbar-thin">
              <Tabs defaultValue="help" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="help" className="text-xs sm:text-sm">Help</TabsTrigger>
                  <TabsTrigger value="examples" className="text-xs sm:text-sm">Examples</TabsTrigger>
                </TabsList>
                <TabsContent value="help" className="p-4 bg-background rounded-md">
                  <ul className="space-y-4 text-xs sm:text-sm">
                    <li><strong>Simplify:</strong> Simplifies algebraic expressions</li>
                    <li><strong>Factor:</strong> Factors polynomials</li>
                    <li><strong>Expand:</strong> Expands expressions</li>
                    <li><strong>Solve:</strong> Solves equations for the variable</li>
                    <li><strong>Diff:</strong> Differentiates expressions</li>
                    <li><strong>Integrate:</strong> Integrates expressions</li>
                    <li><strong>Limit:</strong> Calculates limits</li>
                  </ul>
                </TabsContent>
                <TabsContent value="examples" className="p-4 bg-background rounded-md">
                  <ul className="space-y-4 text-xs sm:text-sm">
                    <li><strong>Simplify:</strong> (x^2 + 2*x + 1)/(x+1)</li>
                    <li><strong>Factor:</strong> x^2 + 2*x + 1</li>
                    <li><strong>Expand:</strong> (x+1)^2</li>
                    <li><strong>Solve:</strong> x^2 - 4 = 0</li>
                    <li><strong>Diff:</strong> x^3 + 3*x^2 + 3*x + 1</li>
                    <li><strong>Integrate:</strong> x^2 + 2*x</li>
                    <li><strong>Limit:</strong> (sin(x))/x</li>
                  </ul>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasCalculator;