# PeopleCore HRMS

> **Master Project Documentation & Implementation Blueprint (v1.1)**
> Production-oriented Human Resource Management System built with the MERN stack (MongoDB Atlas + Mongoose, Express.js ES Modules, React + Vite, Node.js LTS).

---

## 🏛️ Architecture Overview

- **Runtime:** Node.js LTS (`>= 20.x`)
- **Backend:** Express.js ES Modules with layered architecture:
  - `routes` $\to$ `controllers` $\to$ `services` $\to$ `models`
  - Strict server-side RBAC & input validation via Zod
  - Structured error handling & RFC-compliant JSON responses
- **Database:** MongoDB Atlas via Mongoose with resilient connection pooling
- **Frontend:** React + Vite + Tailwind CSS + TanStack Query + React Router + Axios
- **Security:** Helmet, CORS with credential support, HttpOnly cookies, zero secret leakage

---

## 📁 Repository Structure

```text
Peoplecore-Hrms/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── features/            # Feature-oriented modules (auth, dashboard, employees, calendar, notices, etc.)
│   │   ├── lib/                 # Shared utilities & configured axios client
│   │   ├── App.jsx              # Main application shell
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Tailwind CSS styling
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                      # Express.js REST API
│   ├── src/
│   │   ├── config/              # Database connection, env parser
│   │   ├── middleware/          # Error handling, 404, auth guards
│   │   ├── modules/             # Domain modules (auth, users, employees, holidays, notices, etc.)
│   │   ├── app.js               # Express app configuration & middleware
│   │   └── server.js            # Server listener with graceful shutdown
│   ├── .env.example
│   ├── .env
│   └── package.json
├── docs/                        # Architecture & API documentation
├── package.json                 # Monorepo orchestration scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`
- MongoDB URI (Atlas or local instance)

### Installation

1. Install all dependencies across root, server, and client:
   ```bash
   npm run install:all
   ```

2. Configure environment variables in `server/.env`:
   ```bash
   cp server/.env.example server/.env
   ```

3. Start both Server (port 5000) and Client (port 5173) in development mode:
   ```bash
   npm run dev
   ```

4. Or start them individually:
   - Server: `npm run dev:server`
   - Client: `npm run dev:client`

---

## 📡 API Health Check

- `GET /api/v1/health` - System health, uptime, and database connection status.
- `GET /api/v1/ready` - Readiness check for reverse proxies / orchestration.

---

## 🗺️ Implementation Roadmap

- **Phase 0:** Repository setup, MERN infrastructure & MongoDB connection verification ✅
- **Phase 1:** Authentication, Account Recovery & RBAC (Forgot/Reset password per Section 7.1)
- **Phase 2:** Organization Master & Employee Lifecycle
- **Phase 3:** Document Management, Company Calendar (v1.1) & Notice Board (v1.1)
- **Phase 4:** Leave Management & Attendance Engine
- **Phase 5:** Payroll Engine & Statutory Compensation (Paise precision)
- **Phase 6:** Talent Acquisition & Offboarding
- **Phase 7:** Performance, Learning, Assets, Expenses & Helpdesk
- **Phase 8:** Reports, Audit Logs & Production Hardening
