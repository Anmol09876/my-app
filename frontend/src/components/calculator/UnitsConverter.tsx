'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const UnitsConverter = () => {
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [fromUnit, setFromUnit] = useState('meter');
  const [toUnit, setToUnit] = useState('foot');
  const [category, setCategory] = useState('length');
  const [formula, setFormula] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { id: 'length', name: 'Length' },
    { id: 'mass', name: 'Mass' },
    { id: 'temperature', name: 'Temperature' },
    { id: 'time', name: 'Time' },
    { id: 'area', name: 'Area' },
    { id: 'volume', name: 'Volume' },
    { id: 'speed', name: 'Speed' },
    { id: 'pressure', name: 'Pressure' },
    { id: 'energy', name: 'Energy' },
    { id: 'power', name: 'Power' },
    { id: 'data', name: 'Data' },
    { id: 'angle', name: 'Angle' },
  ];

  const unitsByCategory: Record<string, { id: string, name: string }[]> = {
    length: [
      { id: 'meter', name: 'Meter (m)' },
      { id: 'kilometer', name: 'Kilometer (km)' },
      { id: 'centimeter', name: 'Centimeter (cm)' },
      { id: 'millimeter', name: 'Millimeter (mm)' },
      { id: 'foot', name: 'Foot (ft)' },
      { id: 'inch', name: 'Inch (in)' },
      { id: 'yard', name: 'Yard (yd)' },
      { id: 'mile', name: 'Mile (mi)' },
    ],
    mass: [
      { id: 'kilogram', name: 'Kilogram (kg)' },
      { id: 'gram', name: 'Gram (g)' },
      { id: 'milligram', name: 'Milligram (mg)' },
      { id: 'pound', name: 'Pound (lb)' },
      { id: 'ounce', name: 'Ounce (oz)' },
      { id: 'ton', name: 'Metric Ton (t)' },
    ],
    temperature: [
      { id: 'celsius', name: 'Celsius (°C)' },
      { id: 'fahrenheit', name: 'Fahrenheit (°F)' },
      { id: 'kelvin', name: 'Kelvin (K)' },
    ],
    time: [
      { id: 'second', name: 'Second (s)' },
      { id: 'minute', name: 'Minute (min)' },
      { id: 'hour', name: 'Hour (h)' },
      { id: 'day', name: 'Day (d)' },
      { id: 'week', name: 'Week (wk)' },
      { id: 'month', name: 'Month (mo)' },
      { id: 'year', name: 'Year (yr)' },
    ],
    area: [
      { id: 'square_meter', name: 'Square Meter (m²)' },
      { id: 'square_kilometer', name: 'Square Kilometer (km²)' },
      { id: 'square_centimeter', name: 'Square Centimeter (cm²)' },
      { id: 'square_millimeter', name: 'Square Millimeter (mm²)' },
      { id: 'square_foot', name: 'Square Foot (ft²)' },
      { id: 'square_inch', name: 'Square Inch (in²)' },
      { id: 'square_yard', name: 'Square Yard (yd²)' },
      { id: 'acre', name: 'Acre (ac)' },
      { id: 'hectare', name: 'Hectare (ha)' },
    ],
    volume: [
      { id: 'cubic_meter', name: 'Cubic Meter (m³)' },
      { id: 'liter', name: 'Liter (L)' },
      { id: 'milliliter', name: 'Milliliter (mL)' },
      { id: 'cubic_foot', name: 'Cubic Foot (ft³)' },
      { id: 'cubic_inch', name: 'Cubic Inch (in³)' },
      { id: 'gallon', name: 'Gallon (gal)' },
      { id: 'quart', name: 'Quart (qt)' },
      { id: 'pint', name: 'Pint (pt)' },
      { id: 'cup', name: 'Cup (c)' },
    ],
    speed: [
      { id: 'meter_per_second', name: 'Meter per Second (m/s)' },
      { id: 'kilometer_per_hour', name: 'Kilometer per Hour (km/h)' },
      { id: 'mile_per_hour', name: 'Mile per Hour (mph)' },
      { id: 'foot_per_second', name: 'Foot per Second (ft/s)' },
      { id: 'knot', name: 'Knot (kn)' },
    ],
    pressure: [
      { id: 'pascal', name: 'Pascal (Pa)' },
      { id: 'kilopascal', name: 'Kilopascal (kPa)' },
      { id: 'bar', name: 'Bar (bar)' },
      { id: 'psi', name: 'Pound per Square Inch (psi)' },
      { id: 'atmosphere', name: 'Atmosphere (atm)' },
      { id: 'mmHg', name: 'Millimeter of Mercury (mmHg)' },
    ],
    energy: [
      { id: 'joule', name: 'Joule (J)' },
      { id: 'kilojoule', name: 'Kilojoule (kJ)' },
      { id: 'calorie', name: 'Calorie (cal)' },
      { id: 'kilocalorie', name: 'Kilocalorie (kcal)' },
      { id: 'watt_hour', name: 'Watt Hour (Wh)' },
      { id: 'kilowatt_hour', name: 'Kilowatt Hour (kWh)' },
      { id: 'electron_volt', name: 'Electron Volt (eV)' },
      { id: 'british_thermal_unit', name: 'British Thermal Unit (BTU)' },
    ],
    power: [
      { id: 'watt', name: 'Watt (W)' },
      { id: 'kilowatt', name: 'Kilowatt (kW)' },
      { id: 'horsepower', name: 'Horsepower (hp)' },
      { id: 'foot_pound_per_second', name: 'Foot-Pound per Second (ft·lb/s)' },
      { id: 'btu_per_hour', name: 'BTU per Hour (BTU/h)' },
    ],
    data: [
      { id: 'bit', name: 'Bit (b)' },
      { id: 'byte', name: 'Byte (B)' },
      { id: 'kilobit', name: 'Kilobit (kb)' },
      { id: 'kilobyte', name: 'Kilobyte (KB)' },
      { id: 'megabit', name: 'Megabit (Mb)' },
      { id: 'megabyte', name: 'Megabyte (MB)' },
      { id: 'gigabit', name: 'Gigabit (Gb)' },
      { id: 'gigabyte', name: 'Gigabyte (GB)' },
      { id: 'terabit', name: 'Terabit (Tb)' },
      { id: 'terabyte', name: 'Terabyte (TB)' },
    ],
    angle: [
      { id: 'degree', name: 'Degree (°)' },
      { id: 'radian', name: 'Radian (rad)' },
      { id: 'gradian', name: 'Gradian (grad)' },
      { id: 'arcminute', name: 'Arcminute (′)' },
      { id: 'arcsecond', name: 'Arcsecond (″)' },
    ],
  };

  // Initialize missing categories with length units as placeholders
  categories.forEach(cat => {
    if (!unitsByCategory[cat.id]) {
      unitsByCategory[cat.id] = unitsByCategory.length;
    }
  });
  
  const handleConvert = async () => {
    if (!fromValue || isNaN(parseFloat(fromValue))) {
      setError('Please enter a valid number');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/units/convert', {
        value: parseFloat(fromValue),
        from_unit: fromUnit,
        to_unit: toUnit,
        category: category
      });
      
      setToValue(response.data.result.toFixed(6));
      setFormula(response.data.formula);
    } catch (err) {
      console.error('Conversion error:', err);
      setError('Error during conversion. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue);
    setToValue('');
  };
  
  const handleClear = () => {
    setFromValue('');
    setToValue('');
    setFormula('');
    setError('');
  };

  return (
    <div className="calculator-container flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-4 rounded-xl overflow-hidden shadow-lg">
      {/* Left sidebar - Category and inputs */}
      <div className="calculator-sidebar order-1 lg:order-1">
        <div className="w-full h-full flex flex-col p-4">
          <h3 className="text-lg font-medium mb-2">Category</h3>
          <div className="mb-4">
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                // Reset units when category changes
                if (unitsByCategory[e.target.value]) {
                  setFromUnit(unitsByCategory[e.target.value][0].id);
                  setToUnit(unitsByCategory[e.target.value][1] ? unitsByCategory[e.target.value][1].id : unitsByCategory[e.target.value][0].id);
                }
                setFromValue('');
                setToValue('');
                setFormula('');
                setError('');
              }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-2"
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
              >
                {unitsByCategory[category]?.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
                placeholder="Enter value"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <select 
                className="w-full p-2 border rounded-md bg-background mb-2"
                value={toUnit}
                onChange={(e) => setToUnit(e.target.value)}
              >
                {unitsByCategory[category]?.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={toValue}
                readOnly
                className="w-full p-2 border rounded-md bg-background"
                placeholder="Result"
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Button 
              variant="default" 
              onClick={handleConvert}
              disabled={loading}
              className="flex-1 min-w-[80px]"
            >
              {loading ? 'Converting...' : 'Convert'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSwap}
              disabled={loading}
              className="flex-1 min-w-[80px]"
            >
              Swap
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={loading}
              className="flex-1 min-w-[80px]"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Middle section - Conversion details */}
      <div className="calculator-display bg-card order-2 lg:order-2">
        <div className="w-full h-full flex flex-col p-4">
          <h3 className="text-lg font-medium mb-2">Conversion Details</h3>
          <div className="flex-1 p-4 border rounded-md bg-background">
            <p className="text-center">
              {fromValue || '1'} {unitsByCategory[category]?.find(u => u.id === fromUnit)?.name || fromUnit} =
            </p>
            <p className="text-center text-xl sm:text-2xl font-bold my-4">
              {toValue || '?'} {unitsByCategory[category]?.find(u => u.id === toUnit)?.name || toUnit}
            </p>
            <div className="text-sm text-muted-foreground mt-4">
              <p>Formula: {formula || '[Convert to see formula]'}</p>
              <p className="mt-2">Example: 1 meter = 3.28084 feet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar - Common conversions */}
      <div className="calculator-sidebar order-3 lg:order-3">
        <h3 className="text-lg font-medium mb-2">Common Conversions</h3>
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] lg:max-h-none">
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            1 meter = 3.28084 feet
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            1 kilogram = 2.20462 pounds
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            1 liter = 0.264172 gallons
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            0°C = 32°F
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            1 hour = 3600 seconds
          </Button>
          
          <div className="pt-4">
            <h4 className="text-md font-medium mb-2">Recent Conversions</h4>
            <p className="text-sm text-muted-foreground">
              No recent conversions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitsConverter;