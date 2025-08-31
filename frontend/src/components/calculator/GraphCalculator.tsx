'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const GraphCalculator = () => {
  const [expression, setExpression] = useState('x^2');
  const [xMin, setXMin] = useState('-10');
  const [xMax, setXMax] = useState('10');
  const [yMin, setYMin] = useState('-10');
  const [yMax, setYMax] = useState('10');
  const [graphType, setGraphType] = useState('2d');
  const [graphStyle, setGraphStyle] = useState('Line');
  const [graphColor, setGraphColor] = useState('Blue');
  const [plotImage, setPlotImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Function to handle plotting the graph
  const handlePlot = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Validate inputs
      const xMinVal = parseFloat(xMin);
      const xMaxVal = parseFloat(xMax);
      const yMinVal = parseFloat(yMin);
      const yMaxVal = parseFloat(yMax);
      
      if (isNaN(xMinVal) || isNaN(xMaxVal) || isNaN(yMinVal) || isNaN(yMaxVal)) {
        throw new Error('Range values must be valid numbers');
      }
      
      if (xMinVal >= xMaxVal) {
        throw new Error('X Min must be less than X Max');
      }
      
      if (yMinVal >= yMaxVal) {
        throw new Error('Y Min must be less than Y Max');
      }
      
      // Prepare the request payload
      const payload = {
        expr: expression,
        domain: {
          x_min: xMinVal,
          x_max: xMaxVal,
          num_points: 1000
        },
        type: graphType,
        settings: {
          y_min: yMinVal,
          y_max: yMaxVal,
          style: graphStyle,
          color: graphColor
        }
      };
      
      // Make the API call
      const response = await axios.post('http://localhost:8000/api/graph/plot', payload);
      
      // Update the state with the plot image
      setPlotImage(response.data.image);
    } catch (err: any) {
      console.error('Error plotting graph:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to plot graph');
      setPlotImage('');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clear the graph
  const handleClear = () => {
    setPlotImage('');
    setError('');
  };

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 rounded-xl overflow-hidden shadow-lg">
      <div className="calculator-keypad order-2 lg:order-1">
        <div className="col-span-4 p-4 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Expression</label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              placeholder="Enter expression (e.g., x^2)"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">X Min</label>
              <input
                type="text"
                value={xMin}
                onChange={(e) => setXMin(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">X Max</label>
              <input
                type="text"
                value={xMax}
                onChange={(e) => setXMax(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Y Min</label>
              <input
                type="text"
                value={yMin}
                onChange={(e) => setYMin(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Y Max</label>
              <input
                type="text"
                value={yMax}
                onChange={(e) => setYMax(e.target.value)}
                className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="default" 
              onClick={handlePlot}
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? 'Plotting...' : 'Plot'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              className="text-xs sm:text-sm"
            >
              Clear
            </Button>
            <Button 
              variant="outline" 
              className="text-xs sm:text-sm"
              onClick={() => {
                if (plotImage) {
                  // Create a temporary link element
                  const link = document.createElement('a');
                  link.href = plotImage;
                  link.download = `graph_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              disabled={!plotImage}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="calculator-display bg-card order-1 lg:order-2">
        <div className="w-full h-full flex items-center justify-center">
          {error ? (
            <div className="text-center text-destructive">
              <p className="text-base sm:text-lg">Error</p>
              <p className="text-xs sm:text-sm mt-2">{error}</p>
            </div>
          ) : plotImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <img 
                src={plotImage} 
                alt={`Plot of ${expression}`} 
                className="max-w-full max-h-full object-contain"
              />
              <p className="text-xs sm:text-sm mt-2 text-center">
                Expression: {expression} | X: [{xMin}, {xMax}] | Y: [{yMin}, {yMax}]
              </p>
            </div>
          ) : (
            <div className="text-center p-2">
              <p className="text-base sm:text-lg">Graph Placeholder</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Click the Plot button to display the graph of the expression.
              </p>
              <p className="text-xs sm:text-sm mt-4">
                Current expression: {expression}<br />
                X range: [{xMin}, {xMax}]<br />
                Y range: [{yMin}, {yMax}]
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-base sm:text-lg font-medium mb-2">Graph Options</h3>
        <div className="space-y-4 max-h-[300px] sm:max-h-[500px] overflow-y-auto scrollbar-thin">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Graph Type</label>
            <select 
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              value={graphType}
              onChange={(e) => setGraphType(e.target.value)}
            >
              <option value="2d">Cartesian (y=f(x))</option>
              <option value="parametric">Parametric</option>
              <option value="polar">Polar</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Style</label>
            <select 
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              value={graphStyle}
              onChange={(e) => setGraphStyle(e.target.value)}
            >
              <option value="Line">Line</option>
              <option value="Points">Points</option>
              <option value="Line + Points">Line + Points</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Color</label>
            <select 
              className="w-full p-2 border rounded-md bg-background text-xs sm:text-sm"
              value={graphColor}
              onChange={(e) => setGraphColor(e.target.value)}
            >
              <option value="Blue">Blue</option>
              <option value="Red">Red</option>
              <option value="Green">Green</option>
              <option value="Purple">Purple</option>
              <option value="Orange">Orange</option>
            </select>
          </div>
          
          <div className="pt-4">
            <h4 className="text-sm sm:text-md font-medium mb-2">Saved Graphs</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No saved graphs yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



export default GraphCalculator;