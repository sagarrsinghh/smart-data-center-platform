# 🖥️ Smart Data Center Platform

A full-stack web application for **infrastructure workbook management, capacity analytics, and reporting** in enterprise data centers. The platform ingests monthly Excel snapshots of server/VM infrastructure, stores them in a structured database, and exposes rich dashboards, metrics, and automated PDF/PPTX reports.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Database Schema](#database-schema)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Smart Data Center Platform replaces manual Excel-based capacity tracking with an automated, auditable system. Operations teams can:

1. **Upload** monthly infra workbook snapshots (`.xlsx`) via a web dashboard.
2. **Browse** project-wise and location-wise server/VM inventory with live aggregations.
3. **Analyze** CPU, RAM, and VM utilization trends across months.
4. **Generate** on-demand PDF and PowerPoint executive reports.
5. **Manage** import history with full audit trails and cascade-delete support.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts |
| **Backend** | NestJS 11, TypeScript, TypeORM |
| **Database** | MySQL 8+ |
| **Auth** | JWT (Passport.js) |
| **File Parsing** | ExcelJS, officeparser |
| **Reports** | PDFKit, PptxGenJS |
| **File Uploads** | Multer |

---

## Project Structure

```
smart-data-center-platform/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── common/             # Guards, decorators, interceptors
│   │   ├── config/             # App & DB configuration
│   │   ├── database/           # TypeORM datasource setup
│   │   ├── entities/           # TypeORM entity definitions
│   │   └── modules/
│   │       ├── auth/           # JWT authentication
│   │       ├── users/          # User management
│   │       ├── infra/          # Workbook import, parsing, inventory
│   │       ├── reports/        # PDF & PPTX report generation
│   │       └── audit-log/      # Import batch audit trail
│   ├── uploads/                # Uploaded workbook files (gitignored)
│   ├── .env.example            # Environment variable template
│   └── package.json
│
├── smart-dc-frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── api/                # Axios API client modules
│   │   ├── components/         # Shared UI components
│   │   ├── context/            # React context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Page layout wrappers
│   │   ├── pages/              # Route-level page components
│   │   │   ├── auth/           # Login / Register
│   │   │   ├── dashboard/      # Main KPI dashboard
│   │   │   ├── upload/         # Workbook upload & import history
│   │   │   ├── servers/        # Server inventory table
│   │   │   ├── metrics/        # CPU / RAM / VM utilization charts
│   │   │   ├── analytics/      # Trend & comparison analytics
│   │   │   ├── reports/        # Report generation
│   │   │   ├── alerts/         # Threshold alerts
│   │   │   ├── prediction/     # Capacity prediction
│   │   │   ├── users/          # User management (admin)
│   │   │   └── profile/        # User profile
│   │   ├── routes/             # React Router v7 route definitions
│   │   ├── types/              # Shared TypeScript types
│   │   └── utils/              # Helper utilities
│   └── package.json
│
└── package.json                # Root workspace package
```

---

## Features

### 📤 Workbook Import
- Upload monthly infrastructure Excel files (`.xlsx`) via drag-and-drop or file picker.
- Automatic parsing of multi-sheet workbooks: project metadata, VM list, CPU/RAM allocations.
- Batch tracking with timestamp, uploader identity, and row counts.
- Cascade-delete import batches to cleanly remove historical data snapshots.

### 📊 Dashboard & Metrics
- Live KPI cards: total servers, VMs, CPU cores, and RAM (GB).
- Month-on-month trends with interactive Recharts line/bar/area charts.
- Project-wise and location-wise drill-down tables with proper rowspan aggregation.

### 📈 Analytics
- Cross-month capacity comparison views.
- Top-N projects by resource consumption.
- Utilization heat maps.

### 📑 Reports
- One-click PDF and PowerPoint report generation covering the selected month's data.
- Reports are streamed directly to the browser for download.

### 🔐 Authentication & Authorization
- JWT-based login/register flow.
- Role-based access (admin vs. viewer).
- Audit log capturing every significant user action.

---

## Prerequisites

Ensure the following are installed on your machine:

| Tool | Minimum Version |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| MySQL Server | 8.0+ |
| Git | 2.x |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/smart-data-center-platform.git
cd smart-data-center-platform
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# ⚠️  Edit .env with your MySQL credentials and JWT secret (see below)

# Start the development server (hot-reload)
npm run start:dev
```

The API will be available at **http://localhost:3000**.

> **Database**: TypeORM is configured with `synchronize: true` in development, so tables are created automatically on first run. For production, switch to migrations.

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd smart-dc-frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
# ── Database ──────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password_here
DB_NAME=smart_data_center

# ── App ───────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── JWT ───────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key-here   # use a long random string in production
JWT_EXPIRES_IN=7d

# ── File Uploads ──────────────────────────────
UPLOAD_DIR=./uploads
```

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## API Overview

All routes are prefixed with `/api`. Authentication is required (Bearer JWT) unless noted.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/infra/snapshots` | List all import batches |
| `POST` | `/api/infra/upload` | Upload a workbook file |
| `DELETE` | `/api/infra/snapshots/:id` | Delete an import batch (cascade) |
| `GET` | `/api/infra/inventory` | Get aggregated server inventory |
| `GET` | `/api/infra/metrics` | Get CPU/RAM/VM metrics by month |
| `GET` | `/api/reports/pdf` | Generate & download PDF report |
| `GET` | `/api/reports/pptx` | Generate & download PPTX report |
| `GET` | `/api/users` | List users (admin only) |
| `GET` | `/api/audit-log` | View audit trail |

---

## Database Schema

Core entities managed by TypeORM:

| Entity | Description |
|---|---|
| `User` | Platform users with roles |
| `InfraSnapshot` | Import batch metadata (month, uploader, timestamp) |
| `ServerRecord` | Individual server rows from each snapshot |
| `VmRecord` | VM rows linked to server records |
| `ProjectDeployment` | Project-level aggregated deployment metadata |
| `AuditLog` | Immutable log of user actions |

---

## Scripts Reference

### Backend (`/backend`)

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run start:dev` | Hot-reload NestJS server |
| Production | `npm run start:prod` | Run compiled JS from `dist/` |
| Build | `npm run build` | Compile TypeScript |
| Tests | `npm run test` | Run Jest unit tests |
| Coverage | `npm run test:cov` | Test with coverage report |
| Lint | `npm run lint` | ESLint with auto-fix |
| Format | `npm run format` | Prettier format |

### Frontend (`/smart-dc-frontend`)

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Vite HMR dev server |
| Production build | `npm run build` | TypeScript check + Vite bundle |
| Preview | `npm run preview` | Serve production build locally |
| Lint | `npm run lint` | ESLint check |

---

## Contributing

1. **Fork** the repository.
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, etc.
4. Push and open a **Pull Request** against `main`.
5. Ensure all lint checks pass before requesting review.

### Code Style

- **Backend**: NestJS conventions, Prettier + ESLint enforced.
- **Frontend**: React functional components, TypeScript strict mode, Tailwind CSS utilities.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ for smarter infrastructure operations.</p>
