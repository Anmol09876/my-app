import os
import json
import csv
import io
import base64
from typing import Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.auth import get_current_active_user
from app.config import settings

router = APIRouter()


@router.post("/session")
def export_session(
    export_request: schemas.ExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Export a session in the specified format."""
    # Verify session belongs to user
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == export_request.session_id, models.Session.user_id == current_user.id)
        .first()
    )
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get session data with relationships
    session_data = get_session_data(db, export_request.session_id)
    
    # Export in the requested format
    if export_request.format.lower() == "json":
        return export_json(session_data)
    elif export_request.format.lower() == "csv":
        return export_csv(session_data)
    elif export_request.format.lower() == "pdf":
        return export_pdf(session_data, background_tasks)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {export_request.format}")


def get_session_data(db: Session, session_id: int) -> Dict[str, Any]:
    """Get session data with relationships."""
    # Get session
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    
    # Get variables
    variables = db.query(models.Variable).filter(models.Variable.session_id == session_id).all()
    
    # Get history
    history = (
        db.query(models.History)
        .filter(models.History.session_id == session_id)
        .order_by(models.History.created_at)
        .all()
    )
    
    # Get graphs
    graphs = db.query(models.Graph).filter(models.Graph.session_id == session_id).all()
    
    # Get programs
    programs = db.query(models.Program).filter(models.Program.session_id == session_id).all()
    
    # Format data
    return {
        "session": {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        },
        "variables": [
            {
                "id": var.id,
                "name": var.name,
                "value": var.value_json,
                "created_at": var.created_at.isoformat(),
                "updated_at": var.updated_at.isoformat() if var.updated_at else None,
            }
            for var in variables
        ],
        "history": [
            {
                "id": item.id,
                "input": item.input,
                "output": item.output_json,
                "created_at": item.created_at.isoformat(),
            }
            for item in history
        ],
        "graphs": [
            {
                "id": graph.id,
                "name": graph.name,
                "type": graph.type,
                "expression": graph.expression,
                "parameters": graph.parameters,
                "created_at": graph.created_at.isoformat(),
                "updated_at": graph.updated_at.isoformat() if graph.updated_at else None,
            }
            for graph in graphs
        ],
        "programs": [
            {
                "id": program.id,
                "name": program.name,
                "language": program.language,
                "source": program.source,
                "created_at": program.created_at.isoformat(),
                "updated_at": program.updated_at.isoformat() if program.updated_at else None,
            }
            for program in programs
        ],
    }


def export_json(data: Dict[str, Any]) -> JSONResponse:
    """Export session data as JSON."""
    return JSONResponse(content=data)


def export_csv(data: Dict[str, Any]) -> FileResponse:
    """Export session data as CSV."""
    # Create a temporary file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"session_{data['session']['id']}_{timestamp}.csv"
    filepath = os.path.join(settings.EXPORT_DIR, filename)
    
    # Ensure export directory exists
    os.makedirs(settings.EXPORT_DIR, exist_ok=True)
    
    # Write data to CSV
    with open(filepath, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        
        # Write session info
        writer.writerow(["Session Info"])
        writer.writerow(["ID", "Title", "Created At", "Updated At"])
        writer.writerow([
            data["session"]["id"],
            data["session"]["title"],
            data["session"]["created_at"],
            data["session"]["updated_at"] or ""
        ])
        writer.writerow([])
        
        # Write variables
        writer.writerow(["Variables"])
        writer.writerow(["ID", "Name", "Value", "Created At", "Updated At"])
        for var in data["variables"]:
            writer.writerow([
                var["id"],
                var["name"],
                json.dumps(var["value"]),
                var["created_at"],
                var["updated_at"] or ""
            ])
        writer.writerow([])
        
        # Write history
        writer.writerow(["History"])
        writer.writerow(["ID", "Input", "Output", "Created At"])
        for item in data["history"]:
            writer.writerow([
                item["id"],
                item["input"],
                json.dumps(item["output"]),
                item["created_at"]
            ])
        writer.writerow([])
        
        # Write graphs
        writer.writerow(["Graphs"])
        writer.writerow(["ID", "Name", "Type", "Expression", "Created At", "Updated At"])
        for graph in data["graphs"]:
            writer.writerow([
                graph["id"],
                graph["name"],
                graph["type"],
                graph["expression"],
                graph["created_at"],
                graph["updated_at"] or ""
            ])
        writer.writerow([])
        
        # Write programs
        writer.writerow(["Programs"])
        writer.writerow(["ID", "Name", "Language", "Source", "Created At", "Updated At"])
        for program in data["programs"]:
            writer.writerow([
                program["id"],
                program["name"],
                program["language"],
                program["source"],
                program["created_at"],
                program["updated_at"] or ""
            ])
    
    # Return the file
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="text/csv"
    )


def export_pdf(data: Dict[str, Any], background_tasks: BackgroundTasks) -> JSONResponse:
    """Export session data as PDF."""
    # This is a placeholder for PDF generation
    # In a real implementation, you would use a library like ReportLab or WeasyPrint
    # to generate a PDF file
    
    # For now, we'll return a message that PDF generation is in progress
    return JSONResponse(content={
        "message": "PDF generation is not implemented in this version.",
        "data": data
    })


@router.post("/graph/{graph_id}")
def export_graph(
    graph_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Export a graph as an image."""
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
    
    # Check if graph has image data
    if not graph.image_data:
        raise HTTPException(status_code=400, detail="Graph has no image data")
    
    # Extract base64 data
    try:
        # Remove data URL prefix if present
        if graph.image_data.startswith("data:image/"):
            # Extract the base64 part after the comma
            base64_data = graph.image_data.split(",", 1)[1]
        else:
            base64_data = graph.image_data
        
        # Decode base64 data
        image_data = base64.b64decode(base64_data)
        
        # Create a temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"graph_{graph_id}_{timestamp}.png"
        filepath = os.path.join(settings.EXPORT_DIR, filename)
        
        # Ensure export directory exists
        os.makedirs(settings.EXPORT_DIR, exist_ok=True)
        
        # Write image data to file
        with open(filepath, "wb") as f:
            f.write(image_data)
        
        # Return the file
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type="image/png"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting graph: {str(e)}")