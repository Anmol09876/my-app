'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const StatsCalculator = () => {
  const [dataInput, setDataInput] = useState('');
  const [statType, setStatType] = useState('descriptive');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] = useState<string | null>(null);
  
  // Additional state for specific calculation types
  const [regressionType, setRegressionType] = useState('linear');
  const [distributionType, setDistributionType] = useState('normal');
  const [distributionParams, setDistributionParams] = useState<any>({
    mean: 0,
    std_dev: 1,
    n: 10,
    p: 0.5,
    lambda: 1,
    df: 10,
    dfn: 5,
    dfd: 30,
    x: 0
  });
  const [hypothesisType, setHypothesisType] = useState('t_test');
  const [hypothesisSubtype, setHypothesisSubtype] = useState('one_sample');
  const [secondDataInput, setSecondDataInput] = useState('');

  // Function to parse data input string into array of numbers
  const parseDataInput = (input: string): number[] => {
    if (!input.trim()) return [];
    
    // Split by commas, spaces, tabs, or newlines
    return input.split(/[,\s\t\n]+/)
      .map(val => val.trim())
      .filter(val => val !== '')
      .map(val => parseFloat(val))
      .filter(val => !isNaN(val));
  };

  // Function to parse regression data (x,y pairs)
  const parseRegressionData = (input: string): {x: number[], y: number[]} => {
    if (!input.trim()) return {x: [], y: []};
    
    const pairs = input.split(';').map(pair => pair.trim()).filter(pair => pair !== '');
    const x: number[] = [];
    const y: number[] = [];
    
    pairs.forEach(pair => {
      const values = pair.split(',').map(val => parseFloat(val.trim()));
      if (values.length === 2 && !isNaN(values[0]) && !isNaN(values[1])) {
        x.push(values[0]);
        y.push(values[1]);
      }
    });
    
    return {x, y};
  };

  // Function to handle calculation
  const handleCalculate = async () => {
    setLoading(true);
    setError('');
    setVisualizationImage(null);
    setVisualizationType(null);
    
    try {
      let endpoint = '';
      let payload: any = {};
      
      // Prepare endpoint and payload based on statType
      switch (statType) {
        case 'descriptive':
          endpoint = '/api/stats/descriptive';
          payload = {
            data: dataInput
          };
          break;
          
        case 'regression':
          endpoint = '/api/stats/regression';
          const {x, y} = parseRegressionData(dataInput);
          payload = {
            data: dataInput,
            type: regressionType
          };
          break;
          
        case 'distribution':
          endpoint = '/api/stats/distribution';
          payload = {
            type: distributionType,
            ...distributionParams
          };
          break;
          
        case 'hypothesis':
          endpoint = '/api/stats/hypothesis';
          payload = {
            type: hypothesisType,
            subtype: hypothesisSubtype,
            sample: parseDataInput(dataInput)
          };
          
          // Add second sample data if needed
          if (hypothesisSubtype === 'two_sample' || hypothesisSubtype === 'paired') {
            payload.sample2 = parseDataInput(secondDataInput);
          }
          break;
      }
      
      // Validate data
      if (statType === 'descriptive' && (!payload.data || payload.data.trim() === '')) {
        throw new Error('Please enter valid data points');
      }
      
      if (statType === 'hypothesis' && (!payload.sample || payload.sample.trim() === '')) {
        throw new Error('Please enter valid data points');
      }
      
      if (statType === 'regression') {
        if (!payload.data || payload.data.trim() === '') {
          throw new Error('Please enter valid x,y data pairs');
        }
      }
      
      if (statType === 'hypothesis' && 
          (hypothesisSubtype === 'two_sample' || hypothesisSubtype === 'paired') && 
          (!payload.sample2 || payload.sample2.trim() === '')) {
        throw new Error('Please enter valid data for the second sample');
      }
      
      // Make API call
      const response = await axios.post(endpoint, payload);
      setResults(response.data);
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during calculation');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle visualization
  const handleVisualization = async (type: string) => {
    setLoading(true);
    setError('');
    setResults(null);
    setVisualizationImage(null);
    setVisualizationType(type);
    
    try {
      let endpoint = '';
      let payload: any = {};
      
      // Prepare endpoint and payload based on visualization type
      switch (type) {
        case 'histogram':
          endpoint = '/api/stats/visualization/histogram';
          // For histogram, we need to send an array of numbers
          payload = {
            data: parseDataInput(dataInput),
            title: 'Histogram of Data',
            xlabel: 'Value',
            ylabel: 'Frequency'
          };
          break;
          
        case 'boxplot':
          endpoint = '/api/stats/visualization/boxplot';
          // For boxplot, we need to send an array of numbers
          payload = {
            data: parseDataInput(dataInput),
            title: 'Box Plot of Data',
            ylabel: 'Value'
          };
          break;
          
        case 'scatterplot':
          endpoint = '/api/stats/visualization/scatterplot';
          // For scatterplot, we need to send x and y arrays
          const {x, y} = parseRegressionData(dataInput);
          payload = {
            x: x,
            y: y,
            title: 'Scatter Plot',
            xlabel: 'X',
            ylabel: 'Y',
            show_regression: true
          };
          break;
      }
      
      // Validate data
      if (!dataInput.trim()) {
        throw new Error('Please enter data points');
      }
      
      // For scatter plot, validate that we have enough data points
      if (type === 'scatterplot') {
        const {x, y} = parseRegressionData(dataInput);
        if (x.length < 2 || y.length < 2) {
          throw new Error('At least two x,y pairs are required for a scatter plot');
        }
        if (x.length !== y.length) {
          throw new Error('Number of x values must match number of y values');
        }
      }
      
      // Make API call
      const response = await axios.post(endpoint, payload);
      if (response.data && response.data.image) {
        setVisualizationImage(response.data.image);
      } else {
        throw new Error('No visualization data returned');
      }
    } catch (err: any) {
      console.error('Visualization error:', err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during visualization');
      setVisualizationImage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 h-full">
      <div className="calculator-keypad order-2 lg:order-1">
        <div className="col-span-4 p-4 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Data Input</label>
            <textarea
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="w-full p-2 border rounded-md bg-background h-32"
              placeholder="Enter data points separated by commas or spaces"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Statistics Type</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={statType}
              onChange={(e) => setStatType(e.target.value)}
            >
              <option value="descriptive">Descriptive Statistics</option>
              <option value="regression">Regression Analysis</option>
              <option value="distribution">Probability Distributions</option>
              <option value="hypothesis">Hypothesis Testing</option>
            </select>
          </div>
          
          {statType === 'regression' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Regression Type</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-4"
                value={regressionType}
                onChange={(e) => setRegressionType(e.target.value)}
              >
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="exponential">Exponential</option>
                <option value="logarithmic">Logarithmic</option>
              </select>
              <p className="text-xs mb-2">Format: x1,y1;x2,y2;x3,y3...</p>
            </div>
          )}
          
          {statType === 'distribution' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Distribution Type</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-4"
                value={distributionType}
                onChange={(e) => setDistributionType(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="binomial">Binomial</option>
                <option value="poisson">Poisson</option>
                <option value="t">t-Distribution</option>
                <option value="chi2">Chi-Square</option>
                <option value="f">F-Distribution</option>
              </select>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {distributionType === 'normal' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">Mean</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        value={distributionParams.mean}
                        onChange={(e) => setDistributionParams({...distributionParams, mean: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Std Dev</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        value={distributionParams.std_dev}
                        onChange={(e) => setDistributionParams({...distributionParams, std_dev: parseFloat(e.target.value)})}
                      />
                    </div>
                  </>
                )}
                
                {distributionType === 'binomial' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">n (trials)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        value={distributionParams.n}
                        onChange={(e) => setDistributionParams({...distributionParams, n: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">p (probability)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        min="0"
                        max="1"
                        step="0.01"
                        value={distributionParams.p}
                        onChange={(e) => setDistributionParams({...distributionParams, p: parseFloat(e.target.value)})}
                      />
                    </div>
                  </>
                )}
                
                {distributionType === 'poisson' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Lambda</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-md bg-background"
                      min="0"
                      step="0.1"
                      value={distributionParams.lambda}
                      onChange={(e) => setDistributionParams({...distributionParams, lambda: parseFloat(e.target.value)})}
                    />
                  </div>
                )}
                
                {(distributionType === 't' || distributionType === 'chi2') && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Degrees of Freedom</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border rounded-md bg-background"
                      min="1"
                      value={distributionParams.df}
                      onChange={(e) => setDistributionParams({...distributionParams, df: parseFloat(e.target.value)})}
                    />
                  </div>
                )}
                
                {distributionType === 'f' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">Numerator df</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        min="1"
                        value={distributionParams.dfn}
                        onChange={(e) => setDistributionParams({...distributionParams, dfn: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Denominator df</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded-md bg-background"
                        min="1"
                        value={distributionParams.dfd}
                        onChange={(e) => setDistributionParams({...distributionParams, dfd: parseFloat(e.target.value)})}
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-xs font-medium mb-1">x value</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded-md bg-background"
                    value={distributionParams.x}
                    onChange={(e) => setDistributionParams({...distributionParams, x: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          )}
          
          {statType === 'hypothesis' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Test Type</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-4"
                value={hypothesisType}
                onChange={(e) => setHypothesisType(e.target.value)}
              >
                <option value="t_test">t-Test</option>
                <option value="z_test">z-Test</option>
                <option value="chi2_test">Chi-Square Test</option>
                <option value="anova">ANOVA</option>
              </select>
              
              {(hypothesisType === 't_test') && (
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium mb-1">Subtype</label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background"
                    value={hypothesisSubtype}
                    onChange={(e) => setHypothesisSubtype(e.target.value)}
                  >
                    <option value="one_sample">One Sample</option>
                    <option value="two_sample">Two Sample</option>
                    <option value="paired">Paired</option>
                  </select>
                </div>
              )}
              
              {(hypothesisSubtype === 'two_sample' || hypothesisSubtype === 'paired') && (
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium mb-1">Second Sample</label>
                  <textarea
                    value={secondDataInput}
                    onChange={(e) => setSecondDataInput(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background h-20"
                    placeholder="Enter second sample data points"
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setDataInput('');
                setSecondDataInput('');
                setResults(null);
                setError('');
              }}
            >
              Clear
            </Button>
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-800 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="calculator-display bg-card order-1 lg:order-2">
        <div className="w-full h-full flex flex-col p-4">
          <h3 className="text-base sm:text-lg font-medium mb-2">Results</h3>
          <div className="flex-1 p-4 border rounded-md bg-background overflow-y-auto">
            {!results && (
              <>
                {statType === 'descriptive' && (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p>Enter data and click Calculate to see:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Mean</li>
                      <li>Median</li>
                      <li>Mode</li>
                      <li>Standard Deviation</li>
                      <li>Variance</li>
                      <li>Range</li>
                      <li>Quartiles</li>
                      <li>Interquartile Range</li>
                    </ul>
                  </div>
                )}
                
                {statType === 'regression' && (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p>Enter x,y data pairs and click Calculate to see:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Linear Regression (y = mx + b)</li>
                      <li>Quadratic Regression</li>
                      <li>Exponential Regression</li>
                      <li>Logarithmic Regression</li>
                      <li>Correlation Coefficient</li>
                      <li>Coefficient of Determination (R²)</li>
                    </ul>
                  </div>
                )}
                
                {statType === 'distribution' && (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p>Select distribution type and parameters to calculate:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Binomial Distribution</li>
                      <li>Poisson Distribution</li>
                      <li>Normal Distribution</li>
                      <li>t-Distribution</li>
                      <li>Chi-Square Distribution</li>
                      <li>F-Distribution</li>
                    </ul>
                  </div>
                )}
                
                {statType === 'hypothesis' && (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p>Enter data for hypothesis testing:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>t-Test</li>
                      <li>z-Test</li>
                      <li>Chi-Square Test</li>
                      <li>ANOVA</li>
                      <li>p-value calculation</li>
                    </ul>
                  </div>
                )}
              </>
            )}
            
            {visualizationImage && visualizationType && (
              <div className="space-y-3">
                <h4 className="font-medium">{visualizationType.charAt(0).toUpperCase() + visualizationType.slice(1)} Visualization:</h4>
                <div className="border rounded-md p-2 bg-card">
                  <img 
                    src={`data:image/png;base64,${visualizationImage}`} 
                    alt={`${visualizationType} visualization`} 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            {results && !visualizationImage && (
              <div className="space-y-3">
                <h4 className="font-medium">Results:</h4>
                
                {statType === 'descriptive' && (
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="font-medium">Count:</div>
                    <div>{results.count}</div>
                    
                    <div className="font-medium">Mean:</div>
                    <div>{results.mean?.toFixed(4)}</div>
                    
                    <div className="font-medium">Median:</div>
                    <div>{results.median?.toFixed(4)}</div>
                    
                    <div className="font-medium">Mode:</div>
                    <div>{results.mode?.toFixed(4)}</div>
                    
                    <div className="font-medium">Standard Deviation:</div>
                    <div>{results.std_dev?.toFixed(4)}</div>
                    
                    <div className="font-medium">Variance:</div>
                    <div>{results.variance?.toFixed(4)}</div>
                    
                    <div className="font-medium">Min:</div>
                    <div>{results.min?.toFixed(4)}</div>
                    
                    <div className="font-medium">Max:</div>
                    <div>{results.max?.toFixed(4)}</div>
                    
                    <div className="font-medium">Range:</div>
                    <div>{results.range?.toFixed(4)}</div>
                    
                    {results.q1 !== undefined && (
                      <>
                        <div className="font-medium">Q1 (25%):</div>
                        <div>{results.q1?.toFixed(4)}</div>
                        
                        <div className="font-medium">Q3 (75%):</div>
                        <div>{results.q3?.toFixed(4)}</div>
                        
                        <div className="font-medium">IQR:</div>
                        <div>{results.iqr?.toFixed(4)}</div>
                      </>
                    )}
                    
                    {results.skewness !== undefined && (
                      <>
                        <div className="font-medium">Skewness:</div>
                        <div>{results.skewness?.toFixed(4)}</div>
                        
                        <div className="font-medium">Kurtosis:</div>
                        <div>{results.kurtosis?.toFixed(4)}</div>
                      </>
                    )}
                  </div>
                )}
                
                {statType === 'regression' && (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="font-medium">Regression Type: {results.type}</div>
                    <div className="font-medium">Equation: {results.equation}</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-medium">Sample Size:</div>
                      <div>{results.n}</div>
                      
                      <div className="font-medium">Correlation:</div>
                      <div>{results.correlation?.toFixed(4)}</div>
                      
                      {results.r_squared !== undefined && (
                        <>
                          <div className="font-medium">R-squared:</div>
                          <div>{results.r_squared?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.standard_error_estimate !== undefined && (
                        <>
                          <div className="font-medium">Std Error of Estimate:</div>
                          <div>{results.standard_error_estimate?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.slope !== undefined && (
                        <>
                          <div className="font-medium">Slope (m):</div>
                          <div>{results.slope?.toFixed(6)}</div>
                          
                          <div className="font-medium">Intercept (b):</div>
                          <div>{results.intercept?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.a !== undefined && results.b !== undefined && results.c === undefined && (
                        <>
                          <div className="font-medium">a:</div>
                          <div>{results.a?.toFixed(6)}</div>
                          
                          <div className="font-medium">b:</div>
                          <div>{results.b?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.a !== undefined && results.b !== undefined && results.c !== undefined && (
                        <>
                          <div className="font-medium">a:</div>
                          <div>{results.a?.toFixed(6)}</div>
                          
                          <div className="font-medium">b:</div>
                          <div>{results.b?.toFixed(6)}</div>
                          
                          <div className="font-medium">c:</div>
                          <div>{results.c?.toFixed(6)}</div>
                        </>
                      )}
                    </div>
                    
                    {results.warning && (
                      <div className="p-2 bg-yellow-100 text-yellow-800 rounded-md">
                        Warning: {results.warning}
                      </div>
                    )}
                  </div>
                )}
                
                {statType === 'distribution' && (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="font-medium">Distribution Type: {results.type}</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Parameters */}
                      {results.mean !== undefined && (
                        <>
                          <div className="font-medium">Mean:</div>
                          <div>{results.mean?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.std_dev !== undefined && (
                        <>
                          <div className="font-medium">Standard Deviation:</div>
                          <div>{results.std_dev?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.variance !== undefined && (
                        <>
                          <div className="font-medium">Variance:</div>
                          <div>{results.variance?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.n !== undefined && (
                        <>
                          <div className="font-medium">n (trials):</div>
                          <div>{results.n}</div>
                        </>
                      )}
                      
                      {results.p !== undefined && (
                        <>
                          <div className="font-medium">p (probability):</div>
                          <div>{results.p?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.lambda !== undefined && (
                        <>
                          <div className="font-medium">Lambda:</div>
                          <div>{results.lambda?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.df !== undefined && (
                        <>
                          <div className="font-medium">Degrees of Freedom:</div>
                          <div>{results.df}</div>
                        </>
                      )}
                      
                      {results.dfn !== undefined && (
                        <>
                          <div className="font-medium">Numerator df:</div>
                          <div>{results.dfn}</div>
                        </>
                      )}
                      
                      {results.dfd !== undefined && (
                        <>
                          <div className="font-medium">Denominator df:</div>
                          <div>{results.dfd}</div>
                        </>
                      )}
                      
                      {/* Probability values */}
                      {results.pdf !== undefined && (
                        <>
                          <div className="font-medium">PDF at x={distributionParams.x}:</div>
                          <div>{results.pdf?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.pmf !== undefined && (
                        <>
                          <div className="font-medium">PMF at k={distributionParams.x}:</div>
                          <div>{results.pmf?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.cdf !== undefined && (
                        <>
                          <div className="font-medium">CDF at x={distributionParams.x}:</div>
                          <div>{results.cdf?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.interval_probability !== undefined && (
                        <>
                          <div className="font-medium">Interval Probability:</div>
                          <div>{results.interval_probability?.toFixed(6)}</div>
                        </>
                      )}
                      
                      {results.percentile !== undefined && (
                        <>
                          <div className="font-medium">Percentile:</div>
                          <div>{results.percentile?.toFixed(6)}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {statType === 'hypothesis' && (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="font-medium">Test Type: {results.type}</div>
                    {results.subtype && (
                      <div className="font-medium">Subtype: {results.subtype}</div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Test statistics */}
                      {results.t_statistic !== undefined && (
                        <>
                          <div className="font-medium">t-statistic:</div>
                          <div>{results.t_statistic?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.z_statistic !== undefined && (
                        <>
                          <div className="font-medium">z-statistic:</div>
                          <div>{results.z_statistic?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.chi2_statistic !== undefined && (
                        <>
                          <div className="font-medium">Chi-square statistic:</div>
                          <div>{results.chi2_statistic?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.f_statistic !== undefined && (
                        <>
                          <div className="font-medium">F-statistic:</div>
                          <div>{results.f_statistic?.toFixed(4)}</div>
                        </>
                      )}
                      
                      <div className="font-medium">p-value:</div>
                      <div>{results.p_value?.toFixed(6)}</div>
                      
                      <div className="font-medium">Alpha:</div>
                      <div>{results.alpha}</div>
                      
                      <div className="font-medium">Reject Null Hypothesis:</div>
                      <div>{results.reject_null ? 'Yes' : 'No'}</div>
                      
                      {results.degrees_freedom !== undefined && (
                        <>
                          <div className="font-medium">Degrees of Freedom:</div>
                          <div>{typeof results.degrees_freedom === 'number' ? results.degrees_freedom.toFixed(2) : results.degrees_freedom}</div>
                        </>
                      )}
                      
                      {results.confidence_interval !== undefined && (
                        <>
                          <div className="font-medium">Confidence Interval ({(results.confidence_level * 100).toFixed(0)}%):</div>
                          <div>[{results.confidence_interval[0]?.toFixed(4)}, {results.confidence_interval[1]?.toFixed(4)}]</div>
                        </>
                      )}
                      
                      {/* Sample statistics */}
                      {results.sample_mean !== undefined && (
                        <>
                          <div className="font-medium">Sample Mean:</div>
                          <div>{results.sample_mean?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.sample1_mean !== undefined && (
                        <>
                          <div className="font-medium">Sample 1 Mean:</div>
                          <div>{results.sample1_mean?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.sample2_mean !== undefined && (
                        <>
                          <div className="font-medium">Sample 2 Mean:</div>
                          <div>{results.sample2_mean?.toFixed(4)}</div>
                        </>
                      )}
                      
                      {results.mean_difference !== undefined && (
                        <>
                          <div className="font-medium">Mean Difference:</div>
                          <div>{results.mean_difference?.toFixed(4)}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-base sm:text-lg font-medium mb-2">Statistics Tools</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => setStatType('descriptive')}>
            Descriptive Statistics
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => setStatType('regression')}>
            Regression Analysis
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => setStatType('distribution')}>
            Probability Distributions
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={() => setStatType('hypothesis')}>
            Hypothesis Testing
          </Button>
          
          <div className="pt-4">
            <h4 className="text-sm sm:text-md font-medium mb-2">Data Visualization</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleVisualization('histogram')}
                disabled={!dataInput.trim()}
              >
                Histogram
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleVisualization('boxplot')}
                disabled={!dataInput.trim()}
              >
                Box Plot
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => handleVisualization('scatterplot')}
                disabled={!dataInput.trim()}
              >
                Scatter Plot
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCalculator;