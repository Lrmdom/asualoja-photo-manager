# Specification: Build MVP Core: React App, SQLite Schema & Worker Monitoring

## Overview
This track establishes the foundational components of the E-commerce Photo Management Application. It includes setting up the React Router project, defining the SQLite schema for local persistence, and implementing the background worker for file monitoring.

## Functional Requirements
- **Project Scaffold:** Initialize React Router v8 (Framework Mode) with Vite and TypeScript.
- **SQLite Schema:** Create `better-sqlite3` schema for `sessions`, `upload_queue`, and `system_logs`.
- **Worker Daemon:** Implement Node.js script using `chokidar` to monitor a configured directory, validate new JPEGs, and populate `upload_queue`.

## Acceptance Criteria
- React application initializes and runs with expected structure.
- SQLite database is created with necessary tables.
- Worker correctly detects files in a test directory and logs entries to SQLite.

## Out of Scope
- Integration with Sanity/Cloudinary (this will be handled in a subsequent track).
- Production deployment or secure credential storage (these will be handled in a subsequent track).
