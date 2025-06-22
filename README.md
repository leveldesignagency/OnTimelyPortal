# Timely - Event Management Software

A comprehensive event management platform for agencies to manage events, guests, logistics, and communications.

## Features
- Event Management
- Guest Management
- Logistics Management
- Inventory Management
- Real-time Communication

## Tech Stack
- Mobile: React Native
- Desktop: Electron + React
- Backend: NestJS (Node.js), PostgreSQL, Prisma
- Monorepo: TurboRepo

## Project Structure
```
timely/
├── apps/
│   ├── mobile/          # React Native mobile app
│   ├── desktop/         # Electron desktop app
│   └── api/            # Backend API
├── packages/
│   ├── shared/         # Shared code
│   └── database/       # Database models
├── .gitignore
├── package.json
├── turbo.json
└── README.md
``` 