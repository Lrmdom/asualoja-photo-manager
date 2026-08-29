# Specification: Implement Integration Services, Dashboard, and Real-time UI

## Overview
This track implements the core business logic and frontend for the E-commerce Photo Management Application, including integrations with Sanity and Cloudinary, and a real-time monitoring dashboard using React Router and SSE.

## Functional Requirements
- **Integration Services:** Create `sanity.server.ts` and `cloudinary.server.ts` for secure API interactions.
- **Dashboard UI:** Implement React Router loader/actions for product listing, session management, and studio settings.
- **Real-time Logs:** Create SSE endpoint (`app/routes/api.logs.ts`) to stream SQLite logs to the UI.
- **UI Components:** Build Tailwind CSS dashboard with session controls and log viewer.

## Acceptance Criteria
- Dashboard displays products from Sanity.
- Session start/pause/end triggers database updates.
- Real-time logs appear in the dashboard via SSE.
- Worker-detected files are successfully uploaded and synced.

## Out of Scope
- Production deployment or secure credential storage (these are handled in a separate chore track).
