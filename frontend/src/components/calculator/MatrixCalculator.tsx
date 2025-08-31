'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

// Define types for matrix operations
type MatrixElement = string;
type Matrix = MatrixElement[][];
type MatrixResult = number | number[] | number[][];

interface CalculationResult {
  result: MatrixResult;
  error?: string;
}

const MatrixCalculator = () => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [matrixA, setMatrixA] = useState<Matrix>(Array(3).fill(0).map(() => Array(3).fill('0')));
  const [matrixB, setMatrixB] = useState<Matrix>(Array(3).fill(0).map(() => Array(3).fill('0')));
  const [operation, setOperation] = useState('add');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Update matrices when rows or columns change
  useEffect(() => {
    setMatrixA(Array(rows).fill(0).map(() => Array(cols).fill('0')));
    setMatrixB(Array(rows).fill(0).map(() => Array(cols).fill('0')));
  }, [rows, cols]);
  
  // Handle matrix input change
  const handleMatrixChange = (matrix: string, rowIndex: number, colIndex: number, value: string) => {
    if (matrix === 'A') {
      const newMatrix = [...matrixA];
      newMatrix[rowIndex] = [...newMatrix[rowIndex]];
      newMatrix[rowIndex][colIndex] = value;
      setMatrixA(newMatrix);
    } else {
      const newMatrix = [...matrixB];
      newMatrix[rowIndex] = [...newMatrix[rowIndex]];
      newMatrix[rowIndex][colIndex] = value;
      setMatrixB(newMatrix);
    }
  };
  
  // Handle calculation
  const handleCalculate = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);
    
    try {
      // Convert matrix strings to numbers
      const numericMatrixA = matrixA.map(row => row.map(val => parseFloat(val) || 0));
      const numericMatrixB = matrixB.map(row => row.map(val => parseFloat(val) || 0));
      
      // Prepare payload based on operation
      let expr = '';
      let mode = 'matrix';
      
      switch(operation) {
        case 'add':
          expr = `np.add(${JSON.stringify(numericMatrixA)}, ${JSON.stringify(numericMatrixB)})`;
          break;
        case 'subtract':
          expr = `np.subtract(${JSON.stringify(numericMatrixA)}, ${JSON.stringify(numericMatrixB)})`;
          break;
        case 'multiply':
          expr = `np.matmul(${JSON.stringify(numericMatrixA)}, ${JSON.stringify(numericMatrixB)})`;
          break;
        case 'determinant':
          expr = `np.linalg.det(${JSON.stringify(numericMatrixA)})`;
          break;
        case 'inverse':
          expr = `np.linalg.inv(${JSON.stringify(numericMatrixA)})`;
          break;
        case 'transpose':
          expr = `np.transpose(${JSON.stringify(numericMatrixA)})`;
          break;
        case 'eigenvalues':
          expr = `np.linalg.eig(${JSON.stringify(numericMatrixA)})[0]`;
          break;
        case 'rank':
          expr = `np.linalg.matrix_rank(${JSON.stringify(numericMatrixA)})`;
          break;
        default:
          throw new Error('Unsupported operation');
      }
      
      // Make API call
      const response = await axios.post('http://localhost:8000/api/compute/evaluate', {
        expr,
        mode,
        variables: {}
      });
      
      setResult(response.data);
    } catch (err: any) {
      console.error('Error calculating matrix operation:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to calculate');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clear
  const handleClear = () => {
    setMatrixA(Array(rows).fill(0).map(() => Array(cols).fill('0')));
    setMatrixB(Array(rows).fill(0).map(() => Array(cols).fill('0')));
    setResult(null);
    setError('');
  };

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 rounded-xl overflow-hidden shadow-lg">
      <div className="calculator-keypad order-2 lg:order-1">
        <div className="col-span-4 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="10"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Columns</label>
              <input
                type="number"
                min="1"
                max="10"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Operation</label>
            <select 
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              <option value="add">Addition (A + B)</option>
              <option value="subtract">Subtraction (A - B)</option>
              <option value="multiply">Multiplication (A × B)</option>
              <option value="determinant">Determinant (|A|)</option>
              <option value="inverse">Inverse (A⁻¹)</option>
              <option value="transpose">Transpose (Aᵀ)</option>
              <option value="eigenvalues">Eigenvalues</option>
              <option value="rank">Rank</option>
            </select>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="default" 
              onClick={handleCalculate} 
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              className="text-xs sm:text-sm"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="calculator-display bg-card order-1 lg:order-2">
        <div className="w-full h-full flex flex-col p-4">
          <h3 className="text-base sm:text-lg font-medium mb-2">Matrix A</h3>
          <div className="mb-4 p-2 border rounded-md bg-background overflow-x-auto">
            <table className="min-w-full">
              <tbody>
                {matrixA.map((row, rowIndex) => (
                  <tr key={`row-a-${rowIndex}`}>
                    {row.map((cell, colIndex) => (
                      <td key={`cell-a-${rowIndex}-${colIndex}`} className="border p-1">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleMatrixChange('A', rowIndex, colIndex, e.target.value)}
                          className="w-full h-full text-center focus:outline-none text-xs sm:text-sm"
                          style={{ width: '30px', minWidth: '30px' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(operation === 'add' || operation === 'subtract' || operation === 'multiply') && (
            <>
              <h3 className="text-base sm:text-lg font-medium mb-2">Matrix B</h3>
              <div className="mb-4 p-2 border rounded-md bg-background overflow-x-auto">
                <table className="min-w-full">
                  <tbody>
                    {matrixB.map((row, rowIndex) => (
                      <tr key={`row-b-${rowIndex}`}>
                        {row.map((cell, colIndex) => (
                          <td key={`cell-b-${rowIndex}-${colIndex}`} className="border p-1">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleMatrixChange('B', rowIndex, colIndex, e.target.value)}
                              className="w-full h-full text-center focus:outline-none text-xs sm:text-sm"
                              style={{ width: '30px', minWidth: '30px' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          <h3 className="text-base sm:text-lg font-medium mb-2">Result</h3>
          <div className="flex-1 p-2 border rounded-md bg-background">
            {isLoading && <p className="text-center text-xs sm:text-sm">Calculating...</p>}
            {error && <p className="text-center text-red-500 text-xs sm:text-sm">{error}</p>}
            {result && !isLoading && !error && (
              <div className="overflow-x-auto">
                {typeof result.result === 'number' ? (
                  <p className="text-center font-medium text-xs sm:text-sm">{result.result}</p>
                ) : Array.isArray(result.result) ? (
                  <table className="min-w-full border">
                    <tbody>
                      {Array.isArray(result.result[0]) ? (
                        // 2D array (matrix)
                        (result.result as number[][]).map((row, rowIndex) => (
                          <tr key={`result-row-${rowIndex}`}>
                            {row.map((cell, colIndex) => (
                              <td key={`result-cell-${rowIndex}-${colIndex}`} className="border p-1 sm:p-2 text-center text-xs sm:text-sm">
                                {typeof cell === 'number' ? cell.toFixed(4) : cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        // 1D array (vector)
                        <tr>
                          {(result.result as number[]).map((cell, index) => (
                            <td key={`result-cell-${index}`} className="border p-1 sm:p-2 text-center text-xs sm:text-sm">
                              {typeof cell === 'number' ? cell.toFixed(4) : cell}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs sm:text-sm">{JSON.stringify(result.result, null, 2)}</pre>
                )}
              </div>
            )}
            {!result && !isLoading && !error && (
              <p className="text-center text-muted-foreground text-xs sm:text-sm">
                Matrix calculation result will be displayed here
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-base sm:text-lg font-medium mb-2">Matrix Operations</h3>
        <div className="space-y-2 max-h-[300px] sm:max-h-[500px] overflow-y-auto scrollbar-thin">
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('add')}>
            Addition (A + B)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('subtract')}>
            Subtraction (A - B)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('multiply')}>
            Multiplication (A × B)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('determinant')}>
            Determinant (|A|)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('inverse')}>
            Inverse (A⁻¹)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('transpose')}>
            Transpose (Aᵀ)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('eigenvalues')}>
            Eigenvalues
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" onClick={() => setOperation('rank')}>
            Rank
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatrixCalculator;