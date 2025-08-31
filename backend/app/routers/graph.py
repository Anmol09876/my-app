import io
import base64
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.config import settings

router = APIRouter()


def generate_plot(expr: str, domain: Dict[str, Any], plot_type: str = "2d", settings: Dict[str, Any] = None):
    """Generate a plot based on the expression and domain."""
    if settings is None:
        settings = {}
    
    try:
        # Create a new figure
        plt.figure(figsize=(10, 6))
        
        if plot_type == "2d":
            # Extract domain information
            x_min = domain.get("x_min", -10)
            x_max = domain.get("x_max", 10)
            num_points = domain.get("num_points", 1000)
            
            # Generate x values
            x = np.linspace(x_min, x_max, num_points)
            
            # Create a safe namespace for evaluation
            safe_dict = {
                "x": x,
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
                "bitwise_xor": np.bitwise_xor,
                "^" : np.power,
                "**" : np.power,
                "pow": np.power,
            }
            
            # Evaluate the expression
            expr = expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e").replace("^", "**")
            y = eval(expr, {"__builtins__": {}}, safe_dict)
            
            # Plot the function
            plt.plot(x, y, label=expr)
            
            # Add grid and labels
            plt.grid(True, alpha=0.3)
            plt.axhline(y=0, color='k', linestyle='-', alpha=0.3)
            plt.axvline(x=0, color='k', linestyle='-', alpha=0.3)
            plt.xlabel('x')
            plt.ylabel('y')
            plt.title(f'Plot of {expr}')
            plt.legend()
            
            # Apply plot settings
            if settings.get("y_min") is not None and settings.get("y_max") is not None:
                plt.ylim(settings.get("y_min"), settings.get("y_max"))
            
        elif plot_type == "parametric":
            # Extract domain information
            t_min = domain.get("t_min", 0)
            t_max = domain.get("t_max", 2 * np.pi)
            num_points = domain.get("num_points", 1000)
            
            # Generate parameter values
            t = np.linspace(t_min, t_max, num_points)
            
            # Parse x and y expressions
            x_expr = expr.split(",")[0].strip()
            y_expr = expr.split(",")[1].strip()
            
            # Create a safe namespace for evaluation
            safe_dict = {
                "t": t,
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
                "bitwise_xor": np.bitwise_xor,
                "^" : np.power,
                "**" : np.power,
                "pow": np.power,
            }
            
            # Evaluate the expressions
            x_expr = x_expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e").replace("^", "**")
            y_expr = y_expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e").replace("^", "**")
            x = eval(x_expr, {"__builtins__": {}}, safe_dict)
            y = eval(y_expr, {"__builtins__": {}}, safe_dict)
            
            # Plot the parametric curve
            plt.plot(x, y)
            
            # Add grid and labels
            plt.grid(True, alpha=0.3)
            plt.axhline(y=0, color='k', linestyle='-', alpha=0.3)
            plt.axvline(x=0, color='k', linestyle='-', alpha=0.3)
            plt.xlabel('x')
            plt.ylabel('y')
            plt.title(f'Parametric Plot: x={x_expr}, y={y_expr}')
            
            # Apply plot settings
            if settings.get("x_min") is not None and settings.get("x_max") is not None:
                plt.xlim(settings.get("x_min"), settings.get("x_max"))
            if settings.get("y_min") is not None and settings.get("y_max") is not None:
                plt.ylim(settings.get("y_min"), settings.get("y_max"))
            
        elif plot_type == "polar":
            # Extract domain information
            theta_min = domain.get("theta_min", 0)
            theta_max = domain.get("theta_max", 2 * np.pi)
            num_points = domain.get("num_points", 1000)
            
            # Generate theta values
            theta = np.linspace(theta_min, theta_max, num_points)
            
            # Create a safe namespace for evaluation
            safe_dict = {
                "theta": theta,
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
                "bitwise_xor": np.bitwise_xor,
                "^" : np.power,
                "**" : np.power,
                "pow": np.power,
            }
            
            # Evaluate the expression
            r_expr = r_expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e").replace("^", "**")
            r = eval(r_expr, {"__builtins__": {}}, safe_dict)
            
            # Create polar plot
            ax = plt.subplot(111, projection='polar')
            ax.plot(theta, r)
            ax.set_title(f'Polar Plot: r={r_expr}')
            ax.grid(True)
            
        elif plot_type == "3d":
            # Extract domain information
            x_min = domain.get("x_min", -5)
            x_max = domain.get("x_max", 5)
            y_min = domain.get("y_min", -5)
            y_max = domain.get("y_max", 5)
            num_points = domain.get("num_points", 100)
            
            # Generate x and y values
            x = np.linspace(x_min, x_max, num_points)
            y = np.linspace(y_min, y_max, num_points)
            X, Y = np.meshgrid(x, y)
            
            # Create a safe namespace for evaluation
            safe_dict = {
                "x": X,
                "y": Y,
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
                "bitwise_xor": np.bitwise_xor,
                "^" : np.power,
                "**" : np.power,
                "pow": np.power,
            }
            
            # Evaluate the expression
            expr = expr.replace("π", "pi").replace("τ", "2*pi").replace("e", "e").replace("^", "**")
            Z = eval(expr, {"__builtins__": {}}, safe_dict)
            
            # Create 3D plot
            ax = plt.subplot(111, projection='3d')
            surf = ax.plot_surface(X, Y, Z, cmap='viridis', alpha=0.8)
            
            # Add labels and title
            ax.set_xlabel('X')
            ax.set_ylabel('Y')
            ax.set_zlabel('Z')
            ax.set_title(f'3D Plot: z={expr}')
            plt.colorbar(surf)
            
        else:
            raise ValueError(f"Unsupported plot type: {plot_type}")
        
        # Save the plot to a BytesIO object
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        buf.seek(0)
        
        # Convert to base64 for embedding in HTML/JSON
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        
        # Close the plot to free memory
        plt.close()
        
        # Return plot data and image
        return {
            "plot_data": {
                "type": plot_type,
                "expr": expr,
                "domain": domain,
                "settings": settings
            },
            "image": f"data:image/png;base64,{img_str}"
        }
        
    except Exception as e:
        # Close any open plots on error
        plt.close()
        raise ValueError(f"Error generating plot: {str(e)}")


@router.post("/plot", response_model=schemas.GraphResponse)
def create_plot(
    graph_request: schemas.GraphRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Generate a plot based on the expression and domain."""
    try:
        # Generate the plot
        result = generate_plot(
            expr=graph_request.expr,
            domain=graph_request.domain,
            plot_type=graph_request.type,
            settings=graph_request.settings
        )
        
        # If session_id is provided, try to save the graph
        session_id = graph_request.settings.get("session_id") if graph_request.settings else None
        if session_id:
            # Get current user from the request if available
            current_user = None
            try:
                current_user = get_current_active_user()
            except:
                pass
                
            # If user is authenticated, verify session belongs to user
            if current_user:
                # Verify session belongs to user
                db_session = (
                    db.query(models.Session)
                    .filter(models.Session.id == session_id, models.Session.user_id == current_user.id)
                    .first()
                )
                if db_session:
                    # Save graph in background
                    background_tasks.add_task(
                        save_graph,
                        db=db,
                        session_id=session_id,
                        name=graph_request.settings.get("name", "Untitled Graph"),
                        graph_type=graph_request.type,
                        expression=graph_request.expr,
                        parameters={
                            "domain": graph_request.domain,
                            "settings": graph_request.settings
                        },
                        image_data=result["image"]
                    )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plot: {str(e)}")


def save_graph(db: Session, session_id: int, name: str, graph_type: str, expression: str, parameters: Dict[str, Any], image_data: str):
    """Save graph to database."""
    graph = models.Graph(
        session_id=session_id,
        name=name,
        type=graph_type,
        expression=expression,
        parameters=parameters,
        image_data=image_data
    )
    db.add(graph)
    db.commit()


@router.get("/saved/{graph_id}", response_model=schemas.Graph)
def get_saved_graph(
    graph_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get a saved graph by ID."""
    # Get the graph
    graph = db.query(models.Graph).filter(models.Graph.id == graph_id).first()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == graph.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=403, detail="Not authorized to access this graph")
    
    return graph


@router.delete("/saved/{graph_id}", status_code=204)
def delete_saved_graph(
    graph_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Delete a saved graph."""
    # Get the graph
    graph = db.query(models.Graph).filter(models.Graph.id == graph_id).first()
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == graph.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=403, detail="Not authorized to access this graph")
    
    # Delete the graph
    db.delete(graph)
    db.commit()
    
    return None