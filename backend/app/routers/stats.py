import numpy as np
import pandas as pd
import scipy.stats as stats
import matplotlib.pyplot as plt
import io
import base64
from typing import Dict, Any, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.config import settings

router = APIRouter()


# Helper functions for statistics calculations
def parse_data(data_str: str) -> np.ndarray:
    """
    Parse string data into numpy array
    Accepts comma, space, tab, or newline separated values
    """
    try:
        # Replace multiple delimiters with a single comma
        for delimiter in [' ', '\t', '\n']:
            data_str = data_str.replace(delimiter, ',')
        
        # Split by comma and filter out empty strings
        data_list = [float(x.strip()) for x in data_str.split(',') if x.strip()]
        
        return np.array(data_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")


def parse_xy_data(data_str: str) -> tuple:
    """
    Parse string data into x and y numpy arrays for regression analysis
    Expected format: x1,y1;x2,y2;x3,y3...
    """
    try:
        pairs = data_str.strip().split(';')
        x_values = []
        y_values = []
        
        for pair in pairs:
            if not pair.strip():
                continue
                
            values = pair.split(',')
            if len(values) != 2:
                raise ValueError(f"Each pair must have exactly 2 values: {pair}")
                
            x_values.append(float(values[0].strip()))
            y_values.append(float(values[1].strip()))
            
        return np.array(x_values), np.array(y_values)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format for x,y pairs: {str(e)}")


@router.post("/descriptive", response_model=Dict[str, Any])
async def calculate_descriptive_statistics(data: Dict[str, str]):
    """
    Calculate descriptive statistics for a dataset
    """
    try:
        # Parse the input data
        data_array = parse_data(data.get("data", ""))
        
        if len(data_array) < 1:
            raise HTTPException(status_code=400, detail="At least one data point is required")
        
        # Calculate statistics
        result = {
            "count": len(data_array),
            "mean": float(np.mean(data_array)),
            "median": float(np.median(data_array)),
            "mode": float(stats.mode(data_array, keepdims=False)[0]) if len(data_array) > 0 else None,
            "std_dev": float(np.std(data_array, ddof=1)) if len(data_array) > 1 else None,
            "variance": float(np.var(data_array, ddof=1)) if len(data_array) > 1 else None,
            "min": float(np.min(data_array)),
            "max": float(np.max(data_array)),
            "range": float(np.max(data_array) - np.min(data_array)),
            "sum": float(np.sum(data_array)),
        }
        
        # Calculate quartiles and IQR
        if len(data_array) >= 4:  # Need at least 4 points for meaningful quartiles
            q1 = float(np.percentile(data_array, 25))
            q3 = float(np.percentile(data_array, 75))
            result.update({
                "q1": q1,
                "q3": q3,
                "iqr": float(q3 - q1)
            })
        
        # Calculate skewness and kurtosis for larger datasets
        if len(data_array) >= 8:  # Need more points for meaningful skewness/kurtosis
            result.update({
                "skewness": float(stats.skew(data_array)),
                "kurtosis": float(stats.kurtosis(data_array))
            })
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating descriptive statistics: {str(e)}")


@router.post("/regression", response_model=Dict[str, Any])
async def calculate_regression(data: Dict[str, str]):
    """
    Perform regression analysis on x,y data pairs
    Supports linear, quadratic, exponential, and logarithmic regression
    """
    try:
        # Get regression type
        regression_type = data.get("type", "linear").lower()
        if regression_type not in ["linear", "quadratic", "exponential", "logarithmic"]:
            raise HTTPException(status_code=400, detail=f"Unsupported regression type: {regression_type}")
        
        # Parse the input data
        x_data, y_data = parse_xy_data(data.get("data", ""))
        
        if len(x_data) < 2 or len(y_data) < 2:
            raise HTTPException(status_code=400, detail="At least two data pairs are required")
        
        result = {
            "type": regression_type,
            "n": len(x_data),
        }
        
        # Calculate correlation coefficient
        result["correlation"] = float(np.corrcoef(x_data, y_data)[0, 1])
        
        # Perform regression based on type
        if regression_type == "linear":
            # y = mx + b
            slope, intercept, r_value, p_value, std_err = stats.linregress(x_data, y_data)
            result.update({
                "equation": f"y = {slope:.6f}x + {intercept:.6f}",
                "slope": float(slope),
                "intercept": float(intercept),
                "r_squared": float(r_value ** 2),
                "p_value": float(p_value),
                "std_error": float(std_err)
            })
            
            # Calculate predicted values
            y_pred = slope * x_data + intercept
            
        elif regression_type == "quadratic":
            # y = ax^2 + bx + c
            coeffs = np.polyfit(x_data, y_data, 2)
            a, b, c = coeffs
            result.update({
                "equation": f"y = {a:.6f}x² + {b:.6f}x + {c:.6f}",
                "a": float(a),
                "b": float(b),
                "c": float(c)
            })
            
            # Calculate predicted values and R-squared
            y_pred = np.polyval(coeffs, x_data)
            
        elif regression_type == "exponential":
            # y = a * e^(bx) -> ln(y) = ln(a) + bx
            # Filter out non-positive y values
            valid_indices = y_data > 0
            if not np.all(valid_indices):
                result["warning"] = "Some y values were <= 0 and were excluded from exponential regression"
                
            x_valid = x_data[valid_indices]
            y_valid = y_data[valid_indices]
            
            if len(x_valid) < 2:
                raise HTTPException(status_code=400, detail="Not enough positive y values for exponential regression")
                
            # Linear regression on ln(y)
            ln_y = np.log(y_valid)
            slope, intercept, r_value, p_value, std_err = stats.linregress(x_valid, ln_y)
            
            # Convert back to exponential form
            a = np.exp(intercept)
            b = slope
            
            result.update({
                "equation": f"y = {a:.6f} * e^({b:.6f}x)",
                "a": float(a),
                "b": float(b),
                "r_squared": float(r_value ** 2)
            })
            
            # Calculate predicted values for all x
            y_pred = np.zeros_like(y_data)
            y_pred[valid_indices] = a * np.exp(b * x_valid)
            
        elif regression_type == "logarithmic":
            # y = a + b*ln(x)
            # Filter out non-positive x values
            valid_indices = x_data > 0
            if not np.all(valid_indices):
                result["warning"] = "Some x values were <= 0 and were excluded from logarithmic regression"
                
            x_valid = x_data[valid_indices]
            y_valid = y_data[valid_indices]
            
            if len(x_valid) < 2:
                raise HTTPException(status_code=400, detail="Not enough positive x values for logarithmic regression")
                
            # Linear regression on ln(x)
            ln_x = np.log(x_valid)
            slope, intercept, r_value, p_value, std_err = stats.linregress(ln_x, y_valid)
            
            result.update({
                "equation": f"y = {intercept:.6f} + {slope:.6f}ln(x)",
                "a": float(intercept),
                "b": float(slope),
                "r_squared": float(r_value ** 2)
            })
            
            # Calculate predicted values for all x
            y_pred = np.zeros_like(y_data)
            y_pred[valid_indices] = intercept + slope * np.log(x_valid)
        
        # Calculate residuals and standard error of estimate
        residuals = y_data - y_pred
        sse = np.sum(residuals ** 2)
        if len(x_data) > 2:  # Need at least 3 points for meaningful SEE
            see = np.sqrt(sse / (len(x_data) - 2))
            result["standard_error_estimate"] = float(see)
        
        result["sum_squared_error"] = float(sse)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating regression: {str(e)}")


@router.post("/distribution", response_model=Dict[str, Any])
async def calculate_distribution(data: Dict[str, Any]):
    """
    Calculate probability distribution values
    Supports normal, binomial, poisson, t, chi-squared, and F distributions
    """
    try:
        dist_type = data.get("type", "").lower()
        if not dist_type:
            raise HTTPException(status_code=400, detail="Distribution type is required")
            
        result = {"type": dist_type}
        
        if dist_type == "normal":
            # Parameters
            mean = float(data.get("mean", 0))
            std_dev = float(data.get("std_dev", 1))
            if std_dev <= 0:
                raise HTTPException(status_code=400, detail="Standard deviation must be positive")
                
            # Create distribution
            dist = stats.norm(loc=mean, scale=std_dev)
            
            # Calculate PDF/CDF if x is provided
            if "x" in data:
                x = float(data["x"])
                result.update({
                    "pdf": float(dist.pdf(x)),
                    "cdf": float(dist.cdf(x))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = float(data["lower"])
                upper = float(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower))
                
            # Calculate percentile if p is provided
            if "p" in data:
                p = float(data["p"])
                if not 0 <= p <= 1:
                    raise HTTPException(status_code=400, detail="Percentile p must be between 0 and 1")
                result["percentile"] = float(dist.ppf(p))
                
            # Add distribution parameters
            result.update({
                "mean": mean,
                "std_dev": std_dev,
                "variance": std_dev ** 2
            })
                
        elif dist_type == "binomial":
            # Parameters
            n = int(data.get("n", 10))
            p = float(data.get("p", 0.5))
            
            if n <= 0:
                raise HTTPException(status_code=400, detail="Number of trials must be positive")
            if not 0 <= p <= 1:
                raise HTTPException(status_code=400, detail="Probability p must be between 0 and 1")
                
            # Create distribution
            dist = stats.binom(n=n, p=p)
            
            # Calculate PMF/CDF if k is provided
            if "k" in data:
                k = int(data["k"])
                if not 0 <= k <= n:
                    raise HTTPException(status_code=400, detail=f"k must be between 0 and {n}")
                    
                result.update({
                    "pmf": float(dist.pmf(k)),
                    "cdf": float(dist.cdf(k))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = int(data["lower"])
                upper = int(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                if not 0 <= lower <= n or not 0 <= upper <= n:
                    raise HTTPException(status_code=400, detail=f"Interval must be between 0 and {n}")
                    
                # For discrete distributions, we include both endpoints
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower - 1) if lower > 0 else dist.cdf(upper))
                
            # Add distribution parameters
            result.update({
                "n": n,
                "p": p,
                "mean": float(dist.mean()),
                "variance": float(dist.var())
            })
                
        elif dist_type == "poisson":
            # Parameters
            lambda_param = float(data.get("lambda", 1))
            
            if lambda_param <= 0:
                raise HTTPException(status_code=400, detail="Lambda must be positive")
                
            # Create distribution
            dist = stats.poisson(mu=lambda_param)
            
            # Calculate PMF/CDF if k is provided
            if "k" in data:
                k = int(data["k"])
                if k < 0:
                    raise HTTPException(status_code=400, detail="k must be non-negative")
                    
                result.update({
                    "pmf": float(dist.pmf(k)),
                    "cdf": float(dist.cdf(k))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = int(data["lower"])
                upper = int(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                if lower < 0:
                    raise HTTPException(status_code=400, detail="Lower bound must be non-negative")
                    
                # For discrete distributions, we include both endpoints
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower - 1) if lower > 0 else dist.cdf(upper))
                
            # Add distribution parameters
            result.update({
                "lambda": lambda_param,
                "mean": float(dist.mean()),
                "variance": float(dist.var())
            })
                
        elif dist_type == "t":
            # Parameters
            df = float(data.get("df", 10))
            
            if df <= 0:
                raise HTTPException(status_code=400, detail="Degrees of freedom must be positive")
                
            # Create distribution
            dist = stats.t(df=df)
            
            # Calculate PDF/CDF if x is provided
            if "x" in data:
                x = float(data["x"])
                result.update({
                    "pdf": float(dist.pdf(x)),
                    "cdf": float(dist.cdf(x))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = float(data["lower"])
                upper = float(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower))
                
            # Calculate percentile if p is provided
            if "p" in data:
                p = float(data["p"])
                if not 0 <= p <= 1:
                    raise HTTPException(status_code=400, detail="Percentile p must be between 0 and 1")
                result["percentile"] = float(dist.ppf(p))
                
            # Add distribution parameters
            result.update({
                "df": df,
                "mean": float(dist.mean()) if df > 1 else None,
                "variance": float(dist.var()) if df > 2 else None
            })
                
        elif dist_type == "chi2":
            # Parameters
            df = float(data.get("df", 1))
            
            if df <= 0:
                raise HTTPException(status_code=400, detail="Degrees of freedom must be positive")
                
            # Create distribution
            dist = stats.chi2(df=df)
            
            # Calculate PDF/CDF if x is provided
            if "x" in data:
                x = float(data["x"])
                if x < 0:
                    raise HTTPException(status_code=400, detail="x must be non-negative for chi-squared distribution")
                    
                result.update({
                    "pdf": float(dist.pdf(x)),
                    "cdf": float(dist.cdf(x))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = float(data["lower"])
                upper = float(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                if lower < 0:
                    lower = 0  # Chi-squared is only defined for x >= 0
                    
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower))
                
            # Calculate percentile if p is provided
            if "p" in data:
                p = float(data["p"])
                if not 0 <= p <= 1:
                    raise HTTPException(status_code=400, detail="Percentile p must be between 0 and 1")
                result["percentile"] = float(dist.ppf(p))
                
            # Add distribution parameters
            result.update({
                "df": df,
                "mean": float(dist.mean()),
                "variance": float(dist.var())
            })
                
        elif dist_type == "f":
            # Parameters
            dfn = float(data.get("dfn", 1))  # Numerator degrees of freedom
            dfd = float(data.get("dfd", 10))  # Denominator degrees of freedom
            
            if dfn <= 0 or dfd <= 0:
                raise HTTPException(status_code=400, detail="Degrees of freedom must be positive")
                
            # Create distribution
            dist = stats.f(dfn=dfn, dfd=dfd)
            
            # Calculate PDF/CDF if x is provided
            if "x" in data:
                x = float(data["x"])
                if x < 0:
                    raise HTTPException(status_code=400, detail="x must be non-negative for F distribution")
                    
                result.update({
                    "pdf": float(dist.pdf(x)),
                    "cdf": float(dist.cdf(x))
                })
                
            # Calculate interval probability if interval is provided
            if "lower" in data and "upper" in data:
                lower = float(data["lower"])
                upper = float(data["upper"])
                if lower > upper:
                    lower, upper = upper, lower
                if lower < 0:
                    lower = 0  # F is only defined for x >= 0
                    
                result["interval_probability"] = float(dist.cdf(upper) - dist.cdf(lower))
                
            # Calculate percentile if p is provided
            if "p" in data:
                p = float(data["p"])
                if not 0 <= p <= 1:
                    raise HTTPException(status_code=400, detail="Percentile p must be between 0 and 1")
                result["percentile"] = float(dist.ppf(p))
                
            # Add distribution parameters
            result.update({
                "dfn": dfn,
                "dfd": dfd,
                "mean": float(dist.mean()) if dfd > 2 else None,
                "variance": float(dist.var()) if dfd > 4 else None
            })
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported distribution type: {dist_type}")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating distribution: {str(e)}")


@router.post("/visualization/histogram", response_model=None)
async def generate_histogram(data: Dict[str, Any]):
    """
    Generate a histogram visualization from data
    """
    try:
        # Get data array
        data_array = data.get("data", [])
        
        # If data is not an array, try to parse it from string
        if isinstance(data_array, str):
            data_array = parse_data(data_array)
        
        if len(data_array) < 1:
            raise HTTPException(status_code=400, detail="At least one data point is required")
        
        # Get optional parameters
        bins = data.get("bins", "auto")
        title = data.get("title", "Histogram")
        xlabel = data.get("xlabel", "Value")
        ylabel = data.get("ylabel", "Frequency")
        color = data.get("color", "blue")
        
        # Create figure
        plt.figure(figsize=(10, 6))
        plt.hist(data_array, bins=bins, color=color, alpha=0.7, edgecolor='black')
        
        # Add labels and title
        plt.title(title)
        plt.xlabel(xlabel)
        plt.ylabel(ylabel)
        plt.grid(True, alpha=0.3)
        
        # Add descriptive statistics as text
        stats_text = f"Mean: {np.mean(data_array):.2f}\nMedian: {np.median(data_array):.2f}"
        if len(data_array) > 1:
            stats_text += f"\nStd Dev: {np.std(data_array, ddof=1):.2f}"
        plt.annotate(stats_text, xy=(0.95, 0.95), xycoords='axes fraction', 
                     ha='right', va='top', bbox=dict(boxstyle='round', alpha=0.1))
        
        # Save plot to a bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode the image to base64 string
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        
        return {"image": img_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating histogram: {str(e)}")


@router.post("/visualization/boxplot", response_model=None)
async def generate_boxplot(data: Dict[str, Any]):
    """
    Generate a box plot visualization from data
    """
    try:
        # Get data array
        data_array = data.get("data", [])
        
        # If data is not an array, try to parse it from string
        if isinstance(data_array, str):
            data_array = parse_data(data_array)
        
        if len(data_array) < 4:  # Need at least 4 points for a meaningful box plot
            raise HTTPException(status_code=400, detail="At least four data points are required for a box plot")
        
        # Get optional parameters
        title = data.get("title", "Box Plot")
        xlabel = data.get("xlabel", "")
        ylabel = data.get("ylabel", "Value")
        color = data.get("color", "blue")
        
        # Create figure
        plt.figure(figsize=(10, 6))
        box = plt.boxplot([data_array], patch_artist=True, vert=True, labels=[xlabel])
        
        # Set colors
        for patch in box['boxes']:
            patch.set_facecolor(color)
            patch.set_alpha(0.7)
        
        # Add labels and title
        plt.title(title)
        plt.ylabel(ylabel)
        plt.grid(True, alpha=0.3)
        
        # Add descriptive statistics as text
        q1 = np.percentile(data_array, 25)
        q3 = np.percentile(data_array, 75)
        iqr = q3 - q1
        stats_text = f"Min: {np.min(data_array):.2f}\nQ1: {q1:.2f}\nMedian: {np.median(data_array):.2f}"
        stats_text += f"\nQ3: {q3:.2f}\nMax: {np.max(data_array):.2f}\nIQR: {iqr:.2f}"
        plt.annotate(stats_text, xy=(0.95, 0.95), xycoords='axes fraction', 
                     ha='right', va='top', bbox=dict(boxstyle='round', alpha=0.1))
        
        # Save plot to a bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode the image to base64 string
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        
        return {"image": img_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating box plot: {str(e)}")


@router.post("/visualization/scatterplot", response_model=None)
async def generate_scatterplot(data: Dict[str, Any]):
    """
    Generate a scatter plot visualization from x,y data pairs
    """
    try:
        # Get x and y data arrays
        x_data = data.get("x", [])
        y_data = data.get("y", [])
        
        # If x and y are not provided, try to parse from data string
        if not x_data or not y_data:
            data_str = data.get("data", "")
            if isinstance(data_str, str):
                x_data, y_data = parse_xy_data(data_str)
            elif isinstance(data_str, list):
                # Try to extract x,y pairs from a list of pairs
                try:
                    x_data = [pair[0] for pair in data_str]
                    y_data = [pair[1] for pair in data_str]
                except (IndexError, TypeError):
                    raise HTTPException(status_code=400, detail="Invalid data format for scatter plot. Expected x,y pairs.")
            else:
                raise HTTPException(status_code=400, detail="Invalid data format for scatter plot.")
        
        if len(x_data) < 2 or len(y_data) < 2:
            raise HTTPException(status_code=400, detail="At least two data pairs are required")
        
        # Get optional parameters
        title = data.get("title", "Scatter Plot")
        xlabel = data.get("xlabel", "X")
        ylabel = data.get("ylabel", "Y")
        color = data.get("color", "blue")
        show_regression = data.get("show_regression", True)
        regression_type = data.get("regression_type", "linear")
        
        # Create figure
        plt.figure(figsize=(10, 6))
        plt.scatter(x_data, y_data, color=color, alpha=0.7, edgecolor='black')
        
        # Add regression line if requested
        if show_regression:
            if regression_type == "linear":
                # Linear regression
                slope, intercept, r_value, p_value, std_err = stats.linregress(x_data, y_data)
                x_line = np.linspace(min(x_data), max(x_data), 100)
                y_line = slope * x_line + intercept
                plt.plot(x_line, y_line, 'r-', alpha=0.7)
                
                # Add regression equation and R² to plot
                eq_text = f"y = {slope:.4f}x + {intercept:.4f}\nR² = {r_value**2:.4f}"
                plt.annotate(eq_text, xy=(0.05, 0.95), xycoords='axes fraction', 
                             ha='left', va='top', bbox=dict(boxstyle='round', alpha=0.1))
            
            elif regression_type == "quadratic":
                # Quadratic regression
                coeffs = np.polyfit(x_data, y_data, 2)
                x_line = np.linspace(min(x_data), max(x_data), 100)
                y_line = coeffs[0] * x_line**2 + coeffs[1] * x_line + coeffs[2]
                plt.plot(x_line, y_line, 'r-', alpha=0.7)
                
                # Add regression equation to plot
                eq_text = f"y = {coeffs[0]:.4f}x² + {coeffs[1]:.4f}x + {coeffs[2]:.4f}"
                plt.annotate(eq_text, xy=(0.05, 0.95), xycoords='axes fraction', 
                             ha='left', va='top', bbox=dict(boxstyle='round', alpha=0.1))
        
        # Add labels and title
        plt.title(title)
        plt.xlabel(xlabel)
        plt.ylabel(ylabel)
        plt.grid(True, alpha=0.3)
        
        # Save plot to a bytes buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode the image to base64 string
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        
        return {"image": img_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating scatter plot: {str(e)}")


@router.post("/hypothesis", response_model=Dict[str, Any])
async def perform_hypothesis_test(data: Dict[str, Any]):
    """
    Perform hypothesis testing
    Supports z-test, t-test, chi-squared test, and ANOVA
    """
    try:
        test_type = data.get("type", "").lower()
        if not test_type:
            raise HTTPException(status_code=400, detail="Test type is required")
            
        result = {"type": test_type}
        
        if test_type == "z_test":
            # One-sample or two-sample z-test
            # Requires known population standard deviation
            
            # Parse sample data
            sample1 = parse_data(data.get("sample1", ""))
            if len(sample1) < 1:
                raise HTTPException(status_code=400, detail="Sample data is required")
                
            # Get parameters
            pop_mean = float(data.get("pop_mean", 0))  # Null hypothesis value
            pop_std = float(data.get("pop_std", 1))  # Known population std dev
            alpha = float(data.get("alpha", 0.05))  # Significance level
            alternative = data.get("alternative", "two-sided")  # Alternative hypothesis
            
            if pop_std <= 0:
                raise HTTPException(status_code=400, detail="Population standard deviation must be positive")
            if not 0 < alpha < 1:
                raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
            if alternative not in ["two-sided", "less", "greater"]:
                raise HTTPException(status_code=400, detail="Alternative must be 'two-sided', 'less', or 'greater'")
                
            # Calculate test statistic
            sample_mean = np.mean(sample1)
            sample_size = len(sample1)
            std_error = pop_std / np.sqrt(sample_size)
            z_stat = (sample_mean - pop_mean) / std_error
            
            # Calculate p-value based on alternative hypothesis
            if alternative == "two-sided":
                p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
            elif alternative == "less":
                p_value = stats.norm.cdf(z_stat)
            else:  # greater
                p_value = 1 - stats.norm.cdf(z_stat)
                
            # Determine if null hypothesis is rejected
            reject_null = p_value < alpha
            
            # Calculate confidence interval
            ci_level = 1 - alpha
            z_critical = stats.norm.ppf(1 - alpha/2)  # Two-sided by default
            margin_error = z_critical * std_error
            ci_lower = sample_mean - margin_error
            ci_upper = sample_mean + margin_error
            
            # Prepare result
            result.update({
                "sample_mean": float(sample_mean),
                "sample_size": sample_size,
                "pop_mean": pop_mean,
                "pop_std": pop_std,
                "std_error": float(std_error),
                "z_statistic": float(z_stat),
                "p_value": float(p_value),
                "alpha": alpha,
                "alternative": alternative,
                "reject_null": reject_null,
                "confidence_interval": [float(ci_lower), float(ci_upper)],
                "confidence_level": ci_level
            })
            
        elif test_type == "t_test":
            # One-sample, two-sample, or paired t-test
            
            # Get test subtype
            subtype = data.get("subtype", "one_sample").lower()
            if subtype not in ["one_sample", "two_sample", "paired"]:
                raise HTTPException(status_code=400, detail="Subtype must be 'one_sample', 'two_sample', or 'paired'")
                
            # Get parameters
            alpha = float(data.get("alpha", 0.05))  # Significance level
            alternative = data.get("alternative", "two-sided")  # Alternative hypothesis
            
            if not 0 < alpha < 1:
                raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
            if alternative not in ["two-sided", "less", "greater"]:
                raise HTTPException(status_code=400, detail="Alternative must be 'two-sided', 'less', or 'greater'")
                
            # Set up alternative for scipy
            if alternative == "two-sided":
                scipy_alternative = "two-sided"
            elif alternative == "less":
                scipy_alternative = "less"
            else:  # greater
                scipy_alternative = "greater"
                
            # Perform test based on subtype
            if subtype == "one_sample":
                # Parse sample data
                sample = parse_data(data.get("sample", ""))
                if len(sample) < 2:  # Need at least 2 points for t-test
                    raise HTTPException(status_code=400, detail="At least two data points are required")
                    
                # Get null hypothesis value
                pop_mean = float(data.get("pop_mean", 0))
                
                # Perform one-sample t-test
                t_stat, p_value = stats.ttest_1samp(sample, pop_mean, alternative=scipy_alternative)
                
                # Calculate confidence interval
                ci_level = 1 - alpha
                sample_mean = np.mean(sample)
                sample_std = np.std(sample, ddof=1)
                sample_size = len(sample)
                std_error = sample_std / np.sqrt(sample_size)
                t_critical = stats.t.ppf(1 - alpha/2, df=sample_size-1)  # Two-sided by default
                margin_error = t_critical * std_error
                ci_lower = sample_mean - margin_error
                ci_upper = sample_mean + margin_error
                
                # Determine if null hypothesis is rejected
                reject_null = p_value < alpha
                
                # Prepare result
                result.update({
                    "subtype": "one_sample",
                    "sample_mean": float(sample_mean),
                    "sample_std": float(sample_std),
                    "sample_size": sample_size,
                    "pop_mean": pop_mean,
                    "std_error": float(std_error),
                    "degrees_freedom": sample_size - 1,
                    "t_statistic": float(t_stat),
                    "p_value": float(p_value),
                    "alpha": alpha,
                    "alternative": alternative,
                    "reject_null": reject_null,
                    "confidence_interval": [float(ci_lower), float(ci_upper)],
                    "confidence_level": ci_level
                })
                
            elif subtype == "two_sample":
                # Parse sample data
                sample1 = parse_data(data.get("sample1", ""))
                sample2 = parse_data(data.get("sample2", ""))
                
                if len(sample1) < 2 or len(sample2) < 2:
                    raise HTTPException(status_code=400, detail="At least two data points are required for each sample")
                    
                # Get equal_var parameter
                equal_var = data.get("equal_var", True)
                
                # Perform two-sample t-test
                t_stat, p_value = stats.ttest_ind(sample1, sample2, equal_var=equal_var, alternative=scipy_alternative)
                
                # Calculate statistics for each sample
                mean1 = np.mean(sample1)
                mean2 = np.mean(sample2)
                std1 = np.std(sample1, ddof=1)
                std2 = np.std(sample2, ddof=1)
                n1 = len(sample1)
                n2 = len(sample2)
                
                # Calculate degrees of freedom
                if equal_var:
                    df = n1 + n2 - 2
                else:
                    # Welch-Satterthwaite equation for degrees of freedom
                    s1_squared = std1**2
                    s2_squared = std2**2
                    numerator = (s1_squared/n1 + s2_squared/n2)**2
                    denominator = (s1_squared/n1)**2/(n1-1) + (s2_squared/n2)**2/(n2-1)
                    df = numerator / denominator
                
                # Calculate confidence interval for difference in means
                ci_level = 1 - alpha
                mean_diff = mean1 - mean2
                
                if equal_var:
                    # Pooled standard deviation
                    pooled_std = np.sqrt(((n1-1)*std1**2 + (n2-1)*std2**2) / (n1+n2-2))
                    std_error = pooled_std * np.sqrt(1/n1 + 1/n2)
                else:
                    # Welch's t-test
                    std_error = np.sqrt(std1**2/n1 + std2**2/n2)
                
                t_critical = stats.t.ppf(1 - alpha/2, df=df)  # Two-sided by default
                margin_error = t_critical * std_error
                ci_lower = mean_diff - margin_error
                ci_upper = mean_diff + margin_error
                
                # Determine if null hypothesis is rejected
                reject_null = p_value < alpha
                
                # Prepare result
                result.update({
                    "subtype": "two_sample",
                    "sample1_mean": float(mean1),
                    "sample2_mean": float(mean2),
                    "sample1_std": float(std1),
                    "sample2_std": float(std2),
                    "sample1_size": n1,
                    "sample2_size": n2,
                    "mean_difference": float(mean_diff),
                    "std_error": float(std_error),
                    "degrees_freedom": float(df),
                    "equal_variances": equal_var,
                    "t_statistic": float(t_stat),
                    "p_value": float(p_value),
                    "alpha": alpha,
                    "alternative": alternative,
                    "reject_null": reject_null,
                    "confidence_interval": [float(ci_lower), float(ci_upper)],
                    "confidence_level": ci_level
                })
                
            elif subtype == "paired":
                # Parse sample data
                sample1 = parse_data(data.get("sample1", ""))
                sample2 = parse_data(data.get("sample2", ""))
                
                if len(sample1) != len(sample2):
                    raise HTTPException(status_code=400, detail="Paired samples must have the same length")
                if len(sample1) < 2:
                    raise HTTPException(status_code=400, detail="At least two pairs are required")
                    
                # Perform paired t-test
                t_stat, p_value = stats.ttest_rel(sample1, sample2, alternative=scipy_alternative)
                
                # Calculate statistics
                differences = sample1 - sample2
                mean_diff = np.mean(differences)
                std_diff = np.std(differences, ddof=1)
                n = len(differences)
                std_error = std_diff / np.sqrt(n)
                df = n - 1
                
                # Calculate confidence interval for mean difference
                ci_level = 1 - alpha
                t_critical = stats.t.ppf(1 - alpha/2, df=df)  # Two-sided by default
                margin_error = t_critical * std_error
                ci_lower = mean_diff - margin_error
                ci_upper = mean_diff + margin_error
                
                # Determine if null hypothesis is rejected
                reject_null = p_value < alpha
                
                # Prepare result
                result.update({
                    "subtype": "paired",
                    "sample1_mean": float(np.mean(sample1)),
                    "sample2_mean": float(np.mean(sample2)),
                    "mean_difference": float(mean_diff),
                    "std_difference": float(std_diff),
                    "sample_size": n,
                    "std_error": float(std_error),
                    "degrees_freedom": df,
                    "t_statistic": float(t_stat),
                    "p_value": float(p_value),
                    "alpha": alpha,
                    "alternative": alternative,
                    "reject_null": reject_null,
                    "confidence_interval": [float(ci_lower), float(ci_upper)],
                    "confidence_level": ci_level
                })
                
        elif test_type == "chi2_test":
            # Chi-squared test for independence or goodness of fit
            
            # Get test subtype
            subtype = data.get("subtype", "independence").lower()
            if subtype not in ["independence", "goodness_of_fit"]:
                raise HTTPException(status_code=400, detail="Subtype must be 'independence' or 'goodness_of_fit'")
                
            # Get parameters
            alpha = float(data.get("alpha", 0.05))  # Significance level
            
            if not 0 < alpha < 1:
                raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
                
            if subtype == "independence":
                # Parse contingency table
                # Format: [[a, b], [c, d]] for a 2x2 table
                contingency_table = data.get("contingency_table", [])
                if not contingency_table or not all(isinstance(row, list) for row in contingency_table):
                    raise HTTPException(status_code=400, detail="Valid contingency table is required")
                    
                # Convert to numpy array
                observed = np.array(contingency_table)
                
                # Perform chi-squared test of independence
                chi2_stat, p_value, dof, expected = stats.chi2_contingency(observed)
                
                # Determine if null hypothesis is rejected
                reject_null = p_value < alpha
                
                # Prepare result
                result.update({
                    "subtype": "independence",
                    "observed": observed.tolist(),
                    "expected": expected.tolist(),
                    "chi2_statistic": float(chi2_stat),
                    "p_value": float(p_value),
                    "degrees_freedom": int(dof),
                    "alpha": alpha,
                    "reject_null": reject_null
                })
                
            elif subtype == "goodness_of_fit":
                # Parse observed frequencies
                observed = parse_data(data.get("observed", ""))
                if len(observed) < 2:
                    raise HTTPException(status_code=400, detail="At least two categories are required")
                    
                # Get expected frequencies or proportions
                expected_input = data.get("expected", None)
                if expected_input:
                    expected = parse_data(expected_input)
                    if len(expected) != len(observed):
                        raise HTTPException(status_code=400, detail="Expected and observed must have the same length")
                else:
                    # If not provided, assume equal proportions
                    expected = np.ones_like(observed) * np.sum(observed) / len(observed)
                    
                # Perform chi-squared goodness of fit test
                chi2_stat, p_value = stats.chisquare(observed, expected)
                
                # Calculate degrees of freedom
                dof = len(observed) - 1
                
                # Determine if null hypothesis is rejected
                reject_null = p_value < alpha
                
                # Prepare result
                result.update({
                    "subtype": "goodness_of_fit",
                    "observed": observed.tolist(),
                    "expected": expected.tolist(),
                    "chi2_statistic": float(chi2_stat),
                    "p_value": float(p_value),
                    "degrees_freedom": int(dof),
                    "alpha": alpha,
                    "reject_null": reject_null
                })
                
        elif test_type == "anova":
            # One-way ANOVA
            
            # Parse groups data
            # Format: group1_data, group2_data, group3_data, ...
            groups_data = []
            for i in range(1, 10):  # Support up to 10 groups
                group_key = f"group{i}"
                if group_key in data:
                    group = parse_data(data[group_key])
                    if len(group) > 0:
                        groups_data.append(group)
                        
            if len(groups_data) < 2:
                raise HTTPException(status_code=400, detail="At least two groups are required")
                
            # Get parameters
            alpha = float(data.get("alpha", 0.05))  # Significance level
            
            if not 0 < alpha < 1:
                raise HTTPException(status_code=400, detail="Alpha must be between 0 and 1")
                
            # Perform one-way ANOVA
            f_stat, p_value = stats.f_oneway(*groups_data)
            
            # Calculate group statistics
            group_means = [float(np.mean(group)) for group in groups_data]
            group_stds = [float(np.std(group, ddof=1)) for group in groups_data]
            group_sizes = [len(group) for group in groups_data]
            
            # Calculate degrees of freedom
            df_between = len(groups_data) - 1
            df_within = sum(group_sizes) - len(groups_data)
            df_total = sum(group_sizes) - 1
            
            # Calculate sum of squares
            grand_mean = np.mean([np.mean(group) * len(group) for group in groups_data]) / sum(group_sizes)
            ss_between = sum([len(group) * (np.mean(group) - grand_mean)**2 for group in groups_data])
            ss_within = sum([sum((group - np.mean(group))**2) for group in groups_data])
            ss_total = ss_between + ss_within
            
            # Calculate mean squares
            ms_between = ss_between / df_between
            ms_within = ss_within / df_within
            
            # Calculate effect size (eta-squared)
            eta_squared = ss_between / ss_total
            
            # Determine if null hypothesis is rejected
            reject_null = p_value < alpha
            
            # Prepare result
            result.update({
                "group_means": group_means,
                "group_stds": group_stds,
                "group_sizes": group_sizes,
                "f_statistic": float(f_stat),
                "p_value": float(p_value),
                "df_between": int(df_between),
                "df_within": int(df_within),
                "df_total": int(df_total),
                "ss_between": float(ss_between),
                "ss_within": float(ss_within),
                "ss_total": float(ss_total),
                "ms_between": float(ms_between),
                "ms_within": float(ms_within),
                "eta_squared": float(eta_squared),
                "alpha": alpha,
                "reject_null": reject_null
            })
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported test type: {test_type}")
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing hypothesis test: {str(e)}")