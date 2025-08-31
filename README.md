# Scientific Calculator Web Application

A production-grade, fully responsive web application that works as an ultimate scientific calculator. It supports CAS (symbolic algebra), graphing, statistics, engineering tools, unit/base converters, and programmability.

## Features

### Core Math
- Arithmetic (+, −, ×, ÷, %, √)
- Fractions, factorials, nPr/nCr, |x|
- Exponents, roots, logs, ln, log base n
- Powers of 10/e, angle conversions (deg/rad/grad, DMS)

### Trigonometry
- sin, cos, tan, inverses, hyperbolic

### Advanced Math
- Complex numbers (rect/polar)
- Matrices (add, mul, det, inverse, transpose, eigenvalues)
- Vectors (dot, cross, angle)
- Polynomial & simultaneous eqn solvers
- Calculus: derivatives, integrals, limits, differential eqns (numeric), Taylor/Maclaurin
- Numeric methods: Newton–Raphson, interpolation, regression

### Statistics & Probability
- Descriptive stats (mean, σ, variance, quartiles)
- Regressions (linear, quadratic, exponential, logarithmic)
- Distributions: Binomial, Poisson, Normal, t, χ², F

### Graphing
- 2D plots, parametric, polar; optional 3D surfaces
- Multi‑graph, zoom, trace, intersections, extrema
- Sliders for parameters, animation
- Export graphs as PNG/SVG

### Engineering & Utilities
- Base‑n (bin/oct/dec/hex), bitwise ops
- Constants (c, h, G, etc.)
- Unit conversions (SI, derived, data)
- Engineering notation

### Memory & Programmability
- Store/recall memory, variables, functions
- Scripting (Python‑like/JS sandbox)
- Session save/restore; JSON import/export

### CAS
- Simplify, factor, expand
- Solve algebraic equations symbolically
- Symbolic diff/int with numeric fallback

### UX
- Textbook math display
- Keyboard shortcuts, command palette
- Dark/light themes, WCAG AA accessibility
- History with replay & annotations

### Connectivity
- Sign‑in (OAuth optional)
- Cloud sync of sessions/programs
- Export CSV/JSON/PDF

## Architecture

### Frontend
Next.js (React, TS), TailwindCSS, shadcn/ui, KaTeX/MathJax, Monaco editor, Plotly/uPlot for charts, PWA with workers.

### Math Engine
decimal.js, WASM BLAS/LAPACK, nerdamer/algebra.js or pyodide+SymPy.

### Backend
FastAPI (Python), PostgreSQL for data. Auth with JWT. WebSockets optional. Exports handled by background jobs.

### DevOps
Docker, GitHub Actions CI, deploy on Vercel/Fly.io/Render. Sentry for errors.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (for production)
- Docker and Docker Compose (optional, for containerized setup)

### Installation

#### Using Docker (Recommended)

1. Clone the repository
2. Start the application using Docker Compose:
   ```bash
   docker-compose up
   ```
3. Access the application at http://localhost:3000

#### Manual Setup

1. Clone the repository
2. Install frontend dependencies
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Install backend dependencies
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
4. Set up environment variables
5. Access the frontend at http://localhost:3000 and the backend API at http://localhost:8000

## Project Structure

```
├── frontend/                # Next.js frontend application
│   ├── public/             # Static files
│   ├── src/                # Source code
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities and state management
│   ├── next.config.js      # Next.js configuration
│   └── package.json        # Frontend dependencies
│
├── backend/                # FastAPI backend application
│   ├── app/                # Application package
│   │   ├── routers/        # API route handlers
│   │   ├── models.py       # Database models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # Database connection
│   │   └── config.py       # Configuration settings
│   ├── main.py             # Application entry point
│   └── requirements.txt    # Backend dependencies
│
├── docker-compose.yml      # Docker Compose configuration
└── README.md               # Project documentation
```

## API Documentation

Once the backend is running, you can access the API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT