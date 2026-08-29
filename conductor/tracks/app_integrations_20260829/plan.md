# Implementation Plan: Implement Integration Services, Dashboard, and Real-time UI

## Phase 1: Infrastructure & Integrations
- [ ] Task: Setup Sanity and Cloudinary services
    - [ ] Task: Implement `sanity.server.ts`
    - [ ] Task: Implement `cloudinary.server.ts`
    - [ ] Task: Conductor - User Manual Verification 'Integrations' (Protocol in workflow.md)

## Phase 2: Frontend Dashboard
- [ ] Task: Implement Dashboard UI
    - [ ] Task: Create product listing with React Router loaders
    - [ ] Task: Implement session controls (start/pause/stop) with actions
    - [ ] Task: Conductor - User Manual Verification 'Dashboard UI' (Protocol in workflow.md)

## Phase 3: Real-time Features & Worker Integration
- [ ] Task: Implement SSE Log Endpoint
    - [ ] Task: Create `app/routes/api.logs.ts` to stream `system_logs`
- [ ] Task: Integrate Worker with Integrations
    - [ ] Task: Update worker to use `sanity.server.ts` and `cloudinary.server.ts`
    - [ ] Task: Conductor - User Manual Verification 'Real-time & Integration' (Protocol in workflow.md)
