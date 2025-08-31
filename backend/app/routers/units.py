import math
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.config import settings

router = APIRouter()

# Unit conversion factors
conversion_factors = {
    # Length
    "length": {
        "meter": 1.0,
        "kilometer": 0.001,
        "centimeter": 100.0,
        "millimeter": 1000.0,
        "foot": 3.28084,
        "inch": 39.3701,
        "yard": 1.09361,
        "mile": 0.000621371,
    },
    # Mass
    "mass": {
        "kilogram": 1.0,
        "gram": 1000.0,
        "milligram": 1000000.0,
        "pound": 2.20462,
        "ounce": 35.274,
        "ton": 0.001,
    },
    # Temperature (special case, handled separately)
    "temperature": {
        "celsius": "celsius",
        "fahrenheit": "fahrenheit",
        "kelvin": "kelvin",
    },
    # Time
    "time": {
        "second": 1.0,
        "minute": 1/60.0,
        "hour": 1/3600.0,
        "day": 1/86400.0,
        "week": 1/604800.0,
        "month": 1/2592000.0,  # Approximation: 30 days
        "year": 1/31536000.0,  # Approximation: 365 days
    },
    # Area
    "area": {
        "square_meter": 1.0,
        "square_kilometer": 0.000001,
        "square_centimeter": 10000.0,
        "square_millimeter": 1000000.0,
        "square_foot": 10.7639,
        "square_inch": 1550.0,
        "square_yard": 1.19599,
        "acre": 0.000247105,
        "hectare": 0.0001,
    },
    # Volume
    "volume": {
        "cubic_meter": 1.0,
        "liter": 1000.0,
        "milliliter": 1000000.0,
        "cubic_foot": 35.3147,
        "cubic_inch": 61023.7,
        "gallon": 264.172,
        "quart": 1056.69,
        "pint": 2113.38,
        "cup": 4226.75,
    },
    # Speed
    "speed": {
        "meter_per_second": 1.0,
        "kilometer_per_hour": 3.6,
        "mile_per_hour": 2.23694,
        "foot_per_second": 3.28084,
        "knot": 1.94384,
    },
    # Pressure
    "pressure": {
        "pascal": 1.0,
        "kilopascal": 0.001,
        "bar": 0.00001,
        "psi": 0.000145038,
        "atmosphere": 0.00000986923,
        "mmHg": 0.00750062,
    },
    # Energy
    "energy": {
        "joule": 1.0,
        "kilojoule": 0.001,
        "calorie": 0.239006,
        "kilocalorie": 0.000239006,
        "watt_hour": 0.000277778,
        "kilowatt_hour": 0.000000277778,
        "electron_volt": 6.242e+18,
        "british_thermal_unit": 0.000947817,
    },
    # Power
    "power": {
        "watt": 1.0,
        "kilowatt": 0.001,
        "horsepower": 0.00134102,
        "foot_pound_per_second": 0.737562,
        "btu_per_hour": 3.41214,
    },
    # Data
    "data": {
        "bit": 1.0,
        "byte": 0.125,
        "kilobit": 0.001,
        "kilobyte": 0.000125,
        "megabit": 0.000001,
        "megabyte": 0.000000125,
        "gigabit": 0.000000001,
        "gigabyte": 0.000000000125,
        "terabit": 0.000000000001,
        "terabyte": 0.000000000000125,
    },
    # Angle
    "angle": {
        "degree": 1.0,
        "radian": 0.0174533,
        "gradian": 1.11111,
        "arcminute": 60.0,
        "arcsecond": 3600.0,
    },
}


def convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    """Special case for temperature conversion."""
    # Convert to Celsius first
    if from_unit == "fahrenheit":
        celsius = (value - 32) * 5/9
    elif from_unit == "kelvin":
        celsius = value - 273.15
    else:  # celsius
        celsius = value
    
    # Convert from Celsius to target unit
    if to_unit == "fahrenheit":
        return celsius * 9/5 + 32
    elif to_unit == "kelvin":
        return celsius + 273.15
    else:  # celsius
        return celsius


def convert_units(value: float, from_unit: str, to_unit: str, category: str) -> Dict[str, Any]:
    """Convert a value from one unit to another."""
    try:
        # Handle temperature conversion separately
        if category == "temperature":
            result = convert_temperature(value, from_unit, to_unit)
            formula = "Special formula for temperature conversion"
            if from_unit == "celsius" and to_unit == "fahrenheit":
                formula = "°F = °C × 9/5 + 32"
            elif from_unit == "fahrenheit" and to_unit == "celsius":
                formula = "°C = (°F - 32) × 5/9"
            elif from_unit == "celsius" and to_unit == "kelvin":
                formula = "K = °C + 273.15"
            elif from_unit == "kelvin" and to_unit == "celsius":
                formula = "°C = K - 273.15"
            elif from_unit == "fahrenheit" and to_unit == "kelvin":
                formula = "K = (°F - 32) × 5/9 + 273.15"
            elif from_unit == "kelvin" and to_unit == "fahrenheit":
                formula = "°F = (K - 273.15) × 9/5 + 32"
        else:
            # For other categories, use conversion factors
            if category not in conversion_factors:
                raise ValueError(f"Unknown category: {category}")
                
            category_factors = conversion_factors[category]
            if from_unit not in category_factors or to_unit not in category_factors:
                raise ValueError(f"Unknown unit in category {category}: {from_unit} or {to_unit}")
            
            # Convert to base unit first, then to target unit
            base_value = value / category_factors[from_unit]
            result = base_value * category_factors[to_unit]
            
            # Generate formula
            from_unit_name = from_unit.replace('_', ' ')
            to_unit_name = to_unit.replace('_', ' ')
            formula = f"1 {from_unit_name} = {category_factors[to_unit]/category_factors[from_unit]} {to_unit_name}"
        
        return {
            "result": result,
            "formula": formula,
            "from_unit": from_unit,
            "to_unit": to_unit,
            "value": value,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/convert", response_model=Dict[str, Any])
async def convert(
    data: Dict[str, Any],
):
    """Convert a value from one unit to another."""
    try:
        value = float(data.get("value", 0))
        from_unit = data.get("from_unit", "")
        to_unit = data.get("to_unit", "")
        category = data.get("category", "")
        
        if not from_unit or not to_unit or not category:
            raise HTTPException(status_code=400, detail="Missing required fields: from_unit, to_unit, category")
        
        result = convert_units(value, from_unit, to_unit, category)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during conversion: {str(e)}")