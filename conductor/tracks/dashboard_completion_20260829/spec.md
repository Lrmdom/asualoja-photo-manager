# Specification: Complete Dashboard UI & Session Management

## Overview
This track completes the implementation of the web dashboard UI, specifically addressing missing session lifecycle management, configuration settings, and system health status indicators.

## Functional Requirements
- **Session Lifecycle:** Implement actions (Start, Pause, Stop) for photographic sessions, persisting state in SQLite.
- **Studio Configuration UI:** Build a protected settings page to manage environment configurations (monitored paths, quarantine folders).
- **Health Checks:** Implement visual indicators in the UI to monitor the status of Sanity, Cloudinary, the background worker, and the monitored directory.

## Acceptance Criteria
- Dashboard allows starting, pausing, and stopping sessions.
- Configuration settings are editable and correctly saved on the server.
- Health status indicators accurately reflect the system state.

## Out of Scope
- Backend logic changes (this track is UI/interaction focused).
