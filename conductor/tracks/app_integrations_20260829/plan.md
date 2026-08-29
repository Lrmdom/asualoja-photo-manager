# Implementation Plan: Implement Integration Services, Dashboard, and Real-time UI

## Phase 1: Infrastructure & Integrations
- [x] Task: Setup Sanity and Cloudinary services
    - [x] Task: Implement `sanity.server.ts`
    - [x] Task: Implement `cloudinary.server.ts`
    - [x] Task: Conductor - User Manual Verification 'Integrations' (Protocol in workflow.md)

## Phase 2: Frontend Dashboard
- [x] Task: Implement Dashboard UI
    - [x] Task: Create product listing with React Router loaders
    - [x] Task: Implement session controls (start/pause/stop) with actions
    - [x] Task: Conductor - User Manual Verification 'Dashboard UI' (Protocol in workflow.md)

## Phase 3: Real-time Features & Worker Integration
- [x] Task: Implement SSE Log Endpoint
    - [x] Task: Create `app/routes/api.logs.ts` to stream `system_logs`
- [x] Task: Integrate Worker with Integrations
    - [x] Task: Update worker to use `sanity.server.ts` and `cloudinary.server.ts`
    - [x] Task: Conductor - User Manual Verification 'Real-time & Integration' (Protocol in workflow.md)
