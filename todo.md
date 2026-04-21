# Meta Campaign Intake Tool - TODO

## Database & Schema
- [x] Create campaigns table in drizzle schema
- [x] Create adSets table in drizzle schema
- [x] Generate and apply database migration

## Backend API
- [x] Create campaign CRUD procedures (create, read, update, delete)
- [x] Create ad set CRUD procedures (create, read, update, delete)
- [x] Implement Excel generation procedure
- [x] Add validation helpers for budget logic and conditional fields
- [x] Create Excel download endpoint

## Frontend Form
- [x] Build campaign form section with all required fields
- [x] Build ad set repeatable section with add/remove controls
- [x] Implement conditional field visibility (e.g., Minimum ROAS)
- [x] Add form state management for multi-section form

## Validation & Error Prevention
- [x] Implement client-side validation for required fields
- [x] Add budget logic validation (CBO vs Ad Set level)
- [x] Add conditional field validation (time pairs, ROAS requirements)
- [x] Add character limit validation
- [x] Add URL validation for Link field
- [x] Display validation errors in UI

## Excel Generation
- [x] Load template file on server
- [x] Implement field mapping logic (form → Excel columns)
- [x] Generate Excel file with preserved template structure
- [ ] Format dates as MM/DD/YY HH:MM
- [x] Ensure numeric currency values
- [ ] Test Excel output for Meta import compatibility

## UI & UX
- [x] Create professional operations tool layout
- [x] Add clear section grouping (Campaign → Ad Sets)
- [x] Implement download button for generated Excel
- [x] Add loading states during Excel generation
- [x] Add success/error notifications
- [x] Add field documentation/tooltips

## Testing
- [x] Write vitest tests for validation logic
- [x] Write vitest tests for Excel generation
- [x] Test form submission and data flow

## Documentation
- [x] Add inline comments for field mapping
- [x] Create user guide for form usage
- [x] Document Excel column mapping in code

## Bug Fixes & Refinements
- [x] Filter Campaign Objective dropdown to only show "OUTCOME_*" values
- [x] Remove "OUTCOME_*" values from Optimization Goal dropdown
- [x] Convert Special Ad Categories to dropdown with specific options
- [x] Change Campaign Status default to "PAUSED"
- [x] Add budget level selector (campaign vs ad set) with conditional field visibility
- [x] Hide Campaign Bid Strategy when budget level is "Ad Set Level"
- [x] Remove "(Optional)" text from Campaign Bid Strategy label
- [x] Hide Ad Set budget fields when budget level is "Campaign Level (CBO)"
- [x] Hide Ad Set bid strategy when budget level is "Campaign Level (CBO)"
- [x] Add geo/targeting section to Ad Set form
- [x] Update Location field with geo type dropdown and formatting guidelines

## Recent Changes
- [x] Remove Interests/Behaviors field from Ad Set form
- [x] Replace ONSITE_CONVERSIONS with OFFSITE_CONVERSIONS in optimization goals
- [x] Update geo formatting guidelines with exact specifications
- [x] Add Country field to Ad Set form (default: United States)
- [x] Update Excel generator to automatically format geo with country prefix

## Deployment
- [ ] Create checkpoint before publishing
- [ ] Test on staging environment
- [ ] Prepare for production deployment


## Draft Save/Resume & Duplication Features
- [x] Add draft status and timestamps to campaigns table schema
- [x] Create database migration for draft campaign fields
- [x] Add "Save as Draft" button to the form
- [x] Implement draft save tRPC procedure
- [x] Add "Duplicate Ad Set" button to each ad set
- [x] Implement ad set duplication logic
- [x] Create draft list page to view and manage saved campaigns
- [x] Add load draft functionality to restore saved campaigns
- [x] Add delete draft functionality
- [ ] Test draft save/resume end-to-end
- [ ] Test ad set duplication with various field combinations

- [x] Update Optimization Goal dropdown to only include: IMPRESSIONS, REACH, LINK_CLICKS, LANDING_PAGE_VIEWS, THRUPLAY, LEAD_GENERATION, OFFSITE_CONVERSIONS

## Testing & Validation
- [ ] Test Excel export with all seven optimization goals
- [ ] Verify Excel files match Meta template structure
- [ ] Validate column mappings for each optimization goal
- [ ] Test with various geo types (ZIP, city, region, county, address)
- [ ] Test with CBO and ad set level budgets

## Bug Fixes
- [x] Fix draft loading - Load button doesn't populate form with draft data
- [ ] Fix Excel template path - Template file not found on server
- [ ] Fix Excel download - generateExcel returns buffer but no download route
- [ ] Fix draft saving - Required fields validation preventing draft save
- [ ] Fix drafts list - Saved drafts not appearing in drafts page

## Meta Marketing API Integration
- [x] Validate Meta API credentials (access token + app ID)
- [x] Build server-side Meta API client for campaign creation
- [x] Build server-side Meta API client for ad set creation
- [x] Add Ad Account ID field to campaign form
- [x] Add "Push to Ads Manager" button alongside "Generate Excel" button
- [x] Keep Excel download as fallback option
- [x] Write tests for Meta API integration

## Ad Account ID Real-Time Validation
- [x] Add server-side tRPC endpoint to validate ad account ID via Meta API
- [x] Add client-side format validation (act_ prefix, numeric ID)
- [x] Add debounced real-time validation on the Ad Account ID field
- [x] Show validation status (loading, valid, invalid) with visual feedback
- [x] Display account name on successful validation
- [x] Write tests for the validation endpoint

## Push Button Gating
- [x] Disable "Push to Ads Manager" button until Ad Account ID is validated

## Push Status Override
- [x] Always push campaigns to Ads Manager as PAUSED regardless of form status
- [x] Remove Campaign Status dropdown from the form
