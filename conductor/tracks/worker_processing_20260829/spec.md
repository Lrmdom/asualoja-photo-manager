# Specification: Implement Worker Processing & Integrations

## Overview
This track finalizes the background daemon by implementing the processing loop for the SQLite `upload_queue`. It includes the integration logic for Cloudinary (uploading images) and Sanity (updating product documents).

## Functional Requirements
- **Processing Loop:** Implement an async loop in the worker to consume `upload_queue` (pending status).
- **Cloudinary Integration:** Implement file upload logic using `cloudinary` SDK.
- **Sanity Integration:** Implement logic to patch product documents in Sanity (updating the `images` array).
- **Error Handling:** Implement retry logic with exponential backoff and quarantine moving for failed uploads.

## Acceptance Criteria
- Files added to `upload_queue` are successfully uploaded to Cloudinary.
- Corresponding products in Sanity are updated with new image data.
- Failed uploads are correctly retried or moved to a quarantine folder.

## Out of Scope
- UI for re-processing failed uploads (will be in a later track).
- Production deployment or secure credential storage (these are handled in a separate chore track).
