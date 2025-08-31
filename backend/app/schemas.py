from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# Session schemas
class SessionBase(BaseModel):
    title: str = "Untitled Session"


class SessionCreate(SessionBase):
    pass


class SessionUpdate(SessionBase):
    pass


class Session(SessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Variable schemas
class VariableBase(BaseModel):
    name: str
    value_json: Dict[str, Any]


class VariableCreate(VariableBase):
    session_id: int


class VariableUpdate(VariableBase):
    pass


class Variable(VariableBase):
    id: int
    session_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Program schemas
class ProgramBase(BaseModel):
    name: str = "Untitled Program"
    language: str
    source: str


class ProgramCreate(ProgramBase):
    session_id: int


class ProgramUpdate(ProgramBase):
    pass


class Program(ProgramBase):
    id: int
    session_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Graph schemas
class GraphBase(BaseModel):
    name: str = "Untitled Graph"
    type: str
    expression: str
    parameters: Dict[str, Any]


class GraphCreate(GraphBase):
    session_id: int


class GraphUpdate(GraphBase):
    image_data: Optional[str] = None


class Graph(GraphBase):
    id: int
    session_id: int
    image_data: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# History schemas
class HistoryBase(BaseModel):
    input: str
    output_json: Dict[str, Any]


class HistoryCreate(HistoryBase):
    session_id: int


class History(HistoryBase):
    id: int
    session_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Compute schemas
class ComputeRequest(BaseModel):
    expr: str
    mode: str = "standard"  # standard, cas, matrix, etc.
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ComputeResponse(BaseModel):
    latex: str
    result: Any
    type: str  # number, matrix, expression, error, etc.


# Graph request schemas
class GraphRequest(BaseModel):
    expr: str
    domain: Dict[str, Any]
    type: str = "2d"  # 2d, parametric, polar, 3d
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


class GraphResponse(BaseModel):
    plot_data: Dict[str, Any]
    image: Optional[str] = None  # Base64 encoded PNG/SVG


# Export schemas
class ExportRequest(BaseModel):
    session_id: int
    format: str  # pdf, csv, json
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)


# Full session with relationships
class SessionFull(Session):
    variables: List[Variable] = []
    programs: List[Program] = []
    graphs: List[Graph] = []
    history_items: List[History] = []

    class Config:
        from_attributes = True