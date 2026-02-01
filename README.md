<div align="center">

# MAN - Moltie Agent Network

**AI-Powered Solana Memecoin Wallet Sleuth**

Paste a contract address. Watch AI agents collaborate in real-time to uncover insider wallets, trace money flows, and score copytrade candidates.

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?style=for-the-badge&logo=solana)](https://solana.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## Overview

Moltie Agent Network (MAN) is a web-based platform that leverages AI agents to perform deep on-chain analysis of Solana memecoins. Input any Solana contract address and watch a swarm of specialized agents spring into action:

- **Scout** fetches on-chain data via Helius API
- **Tracker** traces money flows and builds Sankey diagrams
- **Analyst** calculates PNL and scores wallets
- **Sleuth** discovers hidden wallet connections
- **Sentinel** assesses risk and generates AI insights

All analysis happens in real-time with live visualizations on an interactive agent network canvas.

## Features

- **AI Agent Swarm** -- 5 specialized agents orchestrated via LangGraph collaborate to analyze tokens in real-time
- **Interactive Flow Map** -- React Flow canvas showing agents as animated nodes with data flowing between them
- **Money Flow Tracing** -- D3.js Sankey diagrams reveal fund movement patterns
- **Wallet Scoring** -- Composite insider scores based on entry timing, PNL, hold duration, and behavioral patterns
- **Deep Dive Profiles** -- Click any wallet for full transaction history, connection graphs, and PNL charts
- **Historical Database** -- Every analysis is persisted and searchable
- **Real-Time Updates** -- WebSocket-powered live agent status, progress, and results streaming
- **Neon Cyberpunk UI** -- Custom CSS design system with glassmorphism, animated gradients, and neon glow effects

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                  │
│  React Flow Canvas │ D3 Sankey │ Zustand │ Socket.io     │
└──────────────┬──────────────────────┬───────────────────┘
               │ REST API             │ WebSocket
┌──────────────▼──────────────────────▼───────────────────┐
│                   Backend (FastAPI)                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              LangGraph Agent Pipeline              │   │
│  │                                                    │   │
│  │   [Scout] ──► [Tracker] ──┐                       │   │
│  │              [Analyst] ──►├──► [Sleuth] ──► [Sentinel]│
│  │                           │                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  python-socketio │ SQLAlchemy │ Helius SDK │ Redis       │
└──────┬──────────────────┬───────────────────┬───────────┘
       │                  │                   │
┌──────▼─────┐    ┌──────▼─────┐    ┌───────▼──────┐
│ PostgreSQL  │    │   Redis    │    │  Solana RPC  │
│   (Data)    │    │  (Cache)   │    │  (Helius)    │
└─────────────┘    └────────────┘    └──────────────┘
```

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Helius API key](https://helius.dev/) (for Solana data)
- [OpenAI API key](https://platform.openai.com/) (for AI insights)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/MAN.git
   cd MAN
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start all services**

   ```bash
   cd docker
   docker compose up
   ```

4. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Development (without Docker)

**Frontend:**

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # → http://localhost:8000
```

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 14 | App Router, SSR, file-based routing |
| TypeScript | Type safety |
| CSS Modules | Custom neon cyberpunk design system |
| React Flow | Interactive agent network visualization |
| D3.js | Sankey diagrams for money flows |
| Framer Motion | Animations and transitions |
| Zustand | Lightweight state management |
| Socket.io | Real-time WebSocket updates |
| TanStack Query | Server state and caching |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | Async REST API framework |
| LangGraph | Multi-agent workflow orchestration |
| python-socketio | WebSocket server |
| SQLAlchemy 2.0 | Async ORM with PostgreSQL |
| Alembic | Database migrations |
| Helius SDK | Solana blockchain data |
| Redis | Caching and rate limiting |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| PostgreSQL 16 | Primary data store |
| Redis 7 | Cache, rate limiting, session state |
| Docker Compose | Local development environment |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/analysis/start` | Start token analysis |
| `GET` | `/api/v1/analysis/{id}` | Get analysis results |
| `GET` | `/api/v1/analysis/{id}/status` | Check analysis status |
| `GET` | `/api/v1/wallets/{address}` | Wallet profile |
| `GET` | `/api/v1/wallets/{address}/transactions` | Transaction history |
| `GET` | `/api/v1/wallets/{address}/connections` | Connection graph |
| `GET` | `/api/v1/tokens/{ca}` | Token metadata |
| `GET` | `/api/v1/history` | Search past analyses |
| `GET` | `/api/v1/health` | Health check |

Full API documentation available at `/docs` when the backend is running.

## Project Structure

```
MAN/
├── frontend/          Next.js 14 app with custom CSS design system
│   └── src/
│       ├── app/       App Router pages and layouts
│       ├── components/ UI primitives + feature components
│       ├── hooks/     Custom React hooks
│       ├── stores/    Zustand state management
│       ├── styles/    CSS design tokens and animations
│       └── types/     TypeScript interfaces
├── backend/           FastAPI server
│   └── app/
│       ├── agents/    LangGraph agent definitions
│       ├── api/       REST + WebSocket endpoints
│       ├── models/    SQLAlchemy ORM models
│       ├── schemas/   Pydantic validation schemas
│       └── services/  Business logic and external APIs
├── docker/            Docker Compose configuration
├── shared/            Shared JSON schemas
└── buildplan.md       Original project specification
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

This tool analyzes publicly available blockchain data for educational and research purposes. It does not constitute financial advice. "Insider" detection is based on behavioral patterns in public data, not actual insider information. Always do your own research (DYOR).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
