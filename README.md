# AI-Powered Developer Intelligence Platform

A full-stack engineering telemetry, repository health diagnostics, and AI code-auditing platform built with **React**, **Node.js/Express**, **persistent audit storage**, **server-side TTL caching**, and **GitHub REST API integration**.

## System Architecture

```
┌─────────────────────────┐       REST API (JSON)       ┌──────────────────────────────────┐
│   React + Vite Client   │ ──────────────────────────► │     Node.js + Express Server     │
│  (Telemetry Dashboard,  │ ◄────────────────────────── │  • In-Memory TTL Cache Engine    │
│   Diff/Compare, Auditor)│                             │  • Rate-Limit & Auth Middleware  │
└─────────────────────────┘                             └───────────┬────────────┬─────────┘
                                                                    │            │
                                                ┌───────────────────▼─┐      ┌───▼────────────────────┐
                                                │  Persistent Store   │      │    GitHub REST API     │
                                                │ (Audit History &    │      │  (Live Repo, Commits,  │
                                                │  Score Time-Series) │      │   PRs, Issues, Files)  │
                                                └─────────────────────┘      └────────────────────────┘
```

## Key Engineering Features
- **Full-Stack REST API (`server/`):** Express backend handling GitHub telemetry aggregation, server-side response caching (TTL), and persistent audit storage.
- **Persistent Audit Database:** Stores every repository scan with timestamps and multi-dimensional scores so teams can track engineering health over time.
- **Multi-Dimensional Health Scoring (0–100):** Weighted scoring across **DevOps & CI/CD**, **Delivery Velocity**, **Documentation Hygiene**, and **Community & Licensing**.
- **Security & Quality Code Auditor:** Static pattern security scanning (detecting XSS/eval risks, unhandled async calls, hardcoded secrets).
- **Head-to-Head Repository Benchmarking:** Side-by-side comparison of any two repositories across health metrics, stars, forks, and open issue ratios.
- **Production Containerization:** Includes `Dockerfile`s and `docker-compose.yml` for one-command deployment.

## Local Setup (Full-Stack)

### 1. Start the Backend API Server
```bash
cd server
npm install
npm run dev
```
*(Server runs on `http://localhost:5001`)*

### 2. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
*(Client runs on `http://localhost:5173`)*
