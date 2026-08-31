# Plan: Mobile Camera Capture Integration

## Objective
Enable mobile users to capture and upload images directly to the active session using their device's camera.

## Architectural Decision
To maintain the integrity of the existing data flow (Worker monitors local folder -> uploads to Cloudinary -> updates Sanity), the mobile upload will be saved directly into the monitored directory, allowing the existing worker pipeline to handle processing, logging, and state management.

## Scope & Impact
- **Impact:** Low risk; creates a new ingestion endpoint.
- **Scope:** 
  - UI: Add `input type="file" capture="environment"` button to the active session card.
  - API: New route `app/routes/api.upload-photo.ts` to handle multipart uploads.
  - Integration: Saving files to the worker-monitored directory.

## Implementation Steps

### 1. UI Implementation
- Update `app/routes/home.tsx`:
  - Add file input hidden behind a camera icon button in the Active Session component.
  - Implement `onChange` handler to submit the file to `/api/upload-photo`.

### 2. API Implementation
- Create `app/routes/api.upload-photo.ts`:
  - Handle `POST` request with multipart/form-data.
  - Save the received file into the directory monitored by the worker.
  - Ensure unique filenames using SKU + timestamp to prevent collisions.

### 3. Worker Compatibility
- Verify the worker's `chokidar` config handles these files correctly.

## Verification
- Capture image using mobile browser.
- Verify file appears in monitored folder.
- Verify worker picks up file, processes it, and updates Sanity/Cloudinary.
- Verify session logs update in UI.
