import math
import numpy as np
import sympy as sp
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.config import settings

router = APIRouter()


# Helper functions for computation
def evaluate_expression(expr: str, variables: Dict[str, Any] = None, mode: str = "standard"):
    """Evaluate a mathematical expression in the specified mode."""
    if variables is None:
        variables = {}
    
    # Helper function to convert NumPy types to Python native types
    def convert_numpy_types(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, list):
            return [convert_numpy_types(item) for item in obj]
        elif isinstance(obj, dict):
            return {key: convert_numpy_types(value) for key, value in obj.items()}
        else:
            return obj
        
    try:
        if mode == "standard":
            # Use numpy for standard calculations
            # Replace common mathematical constants
            expr = expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e")
            
            # Create a safe namespace with only allowed functions and constants
            safe_dict = {
                "sin": np.sin,
                "cos": np.cos,
                "tan": np.tan,
                "asin": np.arcsin,
                "acos": np.arccos,
                "atan": np.arctan,
                "sinh": np.sinh,
                "cosh": np.cosh,
                "tanh": np.tanh,
                "asinh": np.arcsinh,
                "acosh": np.arccosh,
                "atanh": np.arctanh,
                "log": np.log10,
                "ln": np.log,
                "log2": np.log2,
                "exp": np.exp,
                "sqrt": np.sqrt,
                "abs": np.abs,
                "pi": np.pi,
                "e": np.e,
                "factorial": math.factorial,
                "degrees": np.degrees,
                "radians": np.radians,
                "floor": np.floor,
                "ceil": np.ceil,
                "round": np.round,
            }
            
            # Add user variables to the namespace
            safe_dict.update(variables)
            
            # Evaluate the expression
            result = eval(expr, {"__builtins__": {}}, safe_dict)
            
            # Convert to Python native types for JSON serialization
            if isinstance(result, np.ndarray):
                result = result.tolist()
            elif isinstance(result, np.number):
                result = result.item()
            
            # Generate LaTeX representation
            latex = sp.latex(sp.sympify(expr))
            
            return {
                "result": result,
                "latex": latex,
                "type": "number" if isinstance(result, (int, float)) else "array"
            }
            
        elif mode == "cas":
            # Use SymPy for symbolic computation
            # Convert string to SymPy expression
            sympy_expr = sp.sympify(expr)
            
            # Substitute variables if provided
            if variables:
                sympy_vars = {sp.Symbol(k): v for k, v in variables.items()}
                sympy_expr = sympy_expr.subs(sympy_vars)
            
            # Generate LaTeX representation
            latex = sp.latex(sympy_expr)
            
            # Try to evaluate to a numerical result if possible
            try:
                result = float(sympy_expr.evalf())
                result_type = "number"
            except:
                result = str(sympy_expr)
                result_type = "expression"
            
            return {
                "result": result,
                "latex": latex,
                "type": result_type
            }
            
        elif mode == "matrix":
            # Parse matrix expression
            # This is a simplified implementation
            # In a real application, you would need more robust parsing
            
            # For demonstration, we'll assume the input is a valid NumPy expression
            # Create a safe namespace with allowed NumPy functions
            safe_dict = {
                "np": np,
                "array": np.array,
                "matrix": np.matrix,
            }
            
            # Explicitly add numpy.linalg functions needed for matrix operations
            safe_dict["np"].linalg = np.linalg
            
            # Add user variables
            safe_dict.update(variables)
            
            # Evaluate the expression
            result = eval(expr, {"__builtins__": {}}, safe_dict)
            
            # Convert to list for JSON serialization
            if isinstance(result, np.ndarray):
                result_list = result.tolist()
            elif isinstance(result, (np.int32, np.int64, np.float32, np.float64)):
                # Handle NumPy scalar types
                result_list = float(result) if isinstance(result, (np.float32, np.float64)) else int(result)
            else:
                result_list = result
                
            # Generate LaTeX representation
            if isinstance(result, np.ndarray):
                latex = sp.latex(sp.Matrix(result_list))
            else:
                latex = str(result)
            
            return {
                "result": convert_numpy_types(result_list),
                "latex": latex,
                "type": "matrix"
            }
        
        else:
            raise ValueError(f"Unsupported computation mode: {mode}")
            
    except Exception as e:
        return {
            "result": str(e),
            "latex": f"\\text{{Error: {str(e)}}}",
            "type": "error"
        }


@router.post("/evaluate", response_model=schemas.ComputeResponse)
def evaluate(
    compute_request: schemas.ComputeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Evaluate a mathematical expression."""
    # Get variables from settings
    variables = compute_request.settings.get("variables", {})
    
    # Evaluate the expression
    result = evaluate_expression(
        expr=compute_request.expr,
        variables=variables,
        mode=compute_request.mode
    )
    
    # If session_id is provided in settings, save to history
    session_id = compute_request.settings.get("session_id")
    if session_id:
        # Get current user from the request if available
        current_user = None
        try:
            current_user = get_current_active_user()
        except:
            pass
            
        # If user is authenticated, verify session belongs to user
        if current_user:
            db_session = (
                db.query(models.Session)
                .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
                .first()
            )
            if db_session:
                # Add to history in background
                background_tasks.add_task(
                    save_to_history,
                    db=db,
                    session_id=session_id,
                    input_expr=compute_request.expr,
                    output=result
                )
    
    return result


def save_to_history(db: Session, session_id: int, input_expr: str, output: Dict[str, Any]):
    """Save computation to history."""
    history_item = models.History(
        session_id=session_id,
        input=input_expr,
        output_json=output
    )
    db.add(history_item)
    db.commit()


@router.post("/cas/simplify", response_model=None)
def cas_simplify(
    compute_request: schemas.ComputeRequest,
):
    """Simplify an expression using CAS."""
    try:
        expr = sp.sympify(compute_request.expr)
        simplified = sp.simplify(expr)
        
        return {
            "result": str(simplified),
            "latex": sp.latex(simplified),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/factor", response_model=None)
def cas_factor(
    compute_request: schemas.ComputeRequest,
):
    """Factor an expression using CAS."""
    try:
        expr = sp.sympify(compute_request.expr)
        factored = sp.factor(expr)
        
        return {
            "result": str(factored),
            "latex": sp.latex(factored),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/expand", response_model=None)
def cas_expand(
    compute_request: schemas.ComputeRequest,
):
    """Expand an expression using CAS."""
    try:
        expr = sp.sympify(compute_request.expr)
        expanded = sp.expand(expr)
        
        return {
            "result": str(expanded),
            "latex": sp.latex(expanded),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/solve", response_model=None)
def cas_solve(
    compute_request: schemas.ComputeRequest,
):
    """Solve an equation using CAS."""
    try:
        # Parse the equation and variable
        settings = compute_request.settings or {}
        variable = settings.get("variable", "x")
        
        # Check if the expression contains an equals sign
        if "=" in compute_request.expr:
            left, right = compute_request.expr.split("=", 1)
            expr = sp.sympify(left) - sp.sympify(right)
        else:
            expr = sp.sympify(compute_request.expr)
        
        # Solve the equation
        solutions = sp.solve(expr, sp.Symbol(variable))
        
        # Format the solutions
        if isinstance(solutions, list):
            result = [str(sol) for sol in solutions]
            latex_sols = [sp.latex(sol) for sol in solutions]
            latex = ", ".join([f"{variable} = {sol}" for sol in latex_sols])
        else:
            result = str(solutions)
            latex = f"{variable} = {sp.latex(solutions)}"
        
        return {
            "result": result,
            "latex": latex,
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/integrate", response_model=None)
def cas_integrate(
    compute_request: schemas.ComputeRequest,
):
    """Integrate an expression using CAS."""
    try:
        # Parse the expression and variable
        settings = compute_request.settings or {}
        variable = settings.get("variable", "x")
        limits = settings.get("limits", None)
        
        expr = sp.sympify(compute_request.expr)
        var = sp.Symbol(variable)
        
        # Perform integration
        if limits:
            lower, upper = limits
            result = sp.integrate(expr, (var, lower, upper))
        else:
            result = sp.integrate(expr, var)
        
        return {
            "result": str(result),
            "latex": sp.latex(result),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/differentiate", response_model=None)
def cas_differentiate(
    compute_request: schemas.ComputeRequest,
):
    """Differentiate an expression using CAS."""
    try:
        # Parse the expression and variable
        settings = compute_request.settings or {}
        variable = settings.get("variable", "x")
        order = settings.get("order", 1)
        
        expr = sp.sympify(compute_request.expr)
        var = sp.Symbol(variable)
        
        # Perform differentiation
        result = sp.diff(expr, var, order)
        
        return {
            "result": str(result),
            "latex": sp.latex(result),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cas/limit", response_model=None)
def cas_limit(
    compute_request: schemas.ComputeRequest,
):
    """Calculate the limit of an expression using CAS."""
    try:
        # Parse the expression and variable
        settings = compute_request.settings or {}
        variable = settings.get("variable", "x")
        approach = settings.get("approach", 0)
        direction = settings.get("direction", "+")
        
        expr = sp.sympify(compute_request.expr)
        var = sp.Symbol(variable)
        
        # Calculate the limit
        result = sp.limit(expr, var, approach, direction)
        
        return {
            "result": str(result),
            "latex": sp.latex(result),
            "type": "expression"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))