# Meta Campaign Intake Tool - Documentation

## Overview

The Meta Campaign Intake Tool is an internal operations application designed for media buyers and campaign managers to create Meta Ads Manager bulk upload files through a simple, professional web form. Instead of manually editing Excel spreadsheets, users fill out a structured form that automatically generates a properly formatted .xlsx file compatible with Meta's bulk import system.

## Key Features

**Professional Operations Interface**: Clean, organized form with clear section grouping for campaign and ad set configuration.

**Campaign-Level Configuration**: Set up core campaign parameters including name, status, objective, buying type, and optional budget settings.

**Repeatable Ad Sets**: Add multiple ad sets per campaign with individual targeting, budget, and optimization settings. The form supports adding and removing ad sets dynamically.

**Comprehensive Validation**: Real-time validation prevents incomplete or invalid submissions with clear error messages for required fields, budget logic, time pairs, and URL formats.

**Conditional Field Logic**: Fields automatically appear or become required based on selections (e.g., Minimum ROAS only appears for ROAS-based bid strategies).

**Excel Generation**: Automatically generates a .xlsx file that preserves the original Meta template structure, including header rows and validation sheets, with your campaign data correctly mapped to the exact columns Meta expects.

**Accurate Field Mapping**: Every form field maps precisely to the corresponding Excel column in the Meta Bulk Upload Template, ensuring compatibility with Meta Ads Manager's import process.

## Form Structure

### Campaign Section

The campaign section captures high-level campaign settings that apply to all ad sets within the campaign.

**Campaign Name** (Required): The name of your campaign. Limited to 255 characters. This appears in Meta Ads Manager and should be descriptive for easy identification.

**Campaign Status** (Required): The initial status of the campaign. Options are ACTIVE, PAUSED, ARCHIVED, or DELETED. Most campaigns start as PAUSED to allow review before activation.

**Campaign Objective** (Required): The primary goal of your campaign. Choose from options like "Outcome Sales", "Lead Generation", "Traffic", "Brand Awareness", etc. This determines which optimization goals are available for ad sets.

**Buying Type** (Required): Either AUCTION (competitive bidding) or FIXED (fixed-price deals). AUCTION is the standard option for most campaigns.

**Special Ad Categories** (Optional): If your campaign promotes regulated products (alcohol, politics, etc.), select the appropriate category. Leave blank for standard campaigns.

**Special Ad Category Country** (Conditional): If a special ad category is selected, specify the country code (e.g., US, GB) where the restriction applies.

**Campaign Budget** (Optional): Set campaign-level budget constraints. You can specify a Spend Limit (total budget cap), Daily Budget, or Lifetime Budget. If campaign budgets are set, ad set budgets will be managed within these constraints.

**Campaign Bid Strategy** (Optional): Set a bid strategy at the campaign level if needed. This applies to all ad sets unless overridden at the ad set level.

### Ad Sets Section

Ad sets contain targeting, optimization, and budget settings for specific audience segments. You can add multiple ad sets per campaign to target different audiences or test different creative approaches.

**Ad Set Name** (Required): A descriptive name for this ad set (e.g., "Desktop - US - 18-35" or "Mobile - Retargeting"). Limited to 255 characters.

**Ad Set Status** (Required): The initial status of the ad set. Options are ACTIVE, PAUSED, ARCHIVED, or DELETED.

**Start Time & Stop Time** (Optional, Paired): If you want the ad set to run only during specific dates/times, set both the start and stop times. Both must be provided together or both must be empty. Format is MM/DD/YY HH:MM.

**Daily Budget** (Conditional): The daily spending limit for this ad set. Either Daily Budget or Lifetime Budget must be set.

**Lifetime Budget** (Conditional): The total spending limit for the entire ad set duration. Either Daily Budget or Lifetime Budget must be set.

**Ad Set Bid Strategy** (Required): How Meta should optimize your spending. Options include "Lowest Cost", "Target Cost", "Highest Value With Min ROAS", etc. This determines whether Minimum ROAS is required.

**Minimum ROAS** (Conditional): Only appears and is required if you select a ROAS-based bid strategy. Specify the minimum return on ad spend you're willing to accept.

**Link** (Optional): The destination URL users will be directed to when they click your ad. Must be a valid URL if provided.

**Optimization Goal** (Required): What Meta should optimize for. Examples: "ONSITE_CONVERSIONS", "Clicks to Website", "Lead Generation", etc. Should align with your campaign objective.

**Billing Event** (Required): When you're charged. Options are IMPRESSIONS (per 1000 views), CLICKS (per click), or ACTIONS (per conversion).

## Validation Rules

The form enforces several validation rules to ensure data quality and Meta compatibility:

**Required Fields**: Campaign Name, Campaign Objective, Buying Type, Ad Set Name, Ad Set Status, Ad Set Bid Strategy, Optimization Goal, and Billing Event must all be filled in.

**Character Limits**: Campaign Name and Ad Set Name are limited to 255 characters each.

**Budget Logic**: Each ad set must have either a Daily Budget or Lifetime Budget (or both). Campaign budgets are optional but if set, they establish an upper limit for all ad sets.

**Time Field Pairing**: If you set an Ad Set Start Time, you must also set a Stop Time, and vice versa. Both must be provided together or both must be empty.

**URL Validation**: If a Link is provided, it must be a valid URL starting with http:// or https://.

**ROAS Requirements**: If you select a ROAS-based bid strategy (e.g., "Highest Value With Min ROAS"), the Minimum ROAS field becomes required and must be a positive number.

**Conditional Field Visibility**: The Minimum ROAS field only appears when a ROAS-based bid strategy is selected. The Special Ad Category Country field only appears when a Special Ad Category is selected.

## Excel Generation & Download

When you submit the form, the system performs the following steps:

1. **Validation**: All form data is validated according to the rules above. If validation fails, you'll see clear error messages indicating which fields need attention.

2. **Database Storage**: Your campaign and ad set data are saved to the database for future reference and editing.

3. **Excel Generation**: A new Excel file is generated based on the Meta Bulk Upload Template. The system:
   - Preserves the original template structure (header rows 1-3)
   - Preserves the VALIDATION sheet with all Meta's valid options
   - Maps your form data to the exact columns Meta expects
   - Converts currency values from dollars to the format Meta requires
   - Leaves all non-highlighted columns empty (as specified in the template)

4. **Automatic Download**: The generated .xlsx file is automatically downloaded to your computer with a filename like `Campaign_Name_1234567890.xlsx`.

5. **Form Reset**: After successful submission, the form resets to allow you to create another campaign.

## Field Mapping Reference

The form maps directly to the Meta Bulk Upload Template columns as follows:

| Form Field | Excel Column | Column Letter | Required |
|---|---|---|---|
| Campaign Name | 1 | A | Yes |
| Campaign Status | 2 | B | Yes |
| Special Ad Categories | 3 | C | No |
| Special Ad Category Country | 4 | D | No |
| Campaign Objective | 5 | E | Yes |
| Buying Type | 6 | F | Yes |
| Campaign Spend Limit | 7 | G | No |
| Campaign Daily Budget | 8 | H | No |
| Campaign Lifetime Budget | 9 | I | No |
| Campaign Bid Strategy | 10 | J | No |
| Ad Set ID | 15 | O | No (left blank) |
| Ad Set Run Status | 16 | P | Yes |
| Ad Set Name | 17 | Q | Yes |
| Ad Set Time Start | 18 | R | No |
| Ad Set Time Stop | 19 | S | No |
| Ad Set Daily Budget | 20 | T | No |
| Ad Set Lifetime Budget | 21 | U | No |
| Ad Set Bid Strategy | 23 | W | Yes |
| Minimum ROAS | 24 | X | Conditional |
| Link | 27 | AA | No |
| Optimization Goal | 43 | AQ | Yes |
| Billing Event | 44 | AR | Yes |

All other columns in the template are left empty as they are not highlighted in the original template.

## Budget Optimization Modes

**Campaign Budget Optimization (CBO)**: If you set a Campaign Spend Limit, Daily Budget, or Lifetime Budget, Meta will distribute the budget across all ad sets automatically. In this mode, ad set budgets are optional.

**Ad Set-Level Budgets**: If you don't set campaign budgets, each ad set must have its own Daily or Lifetime Budget. Meta will respect each ad set's individual budget.

## Best Practices

**Campaign Naming**: Use clear, descriptive names that include the date, product, or target audience. Example: "Q2 2026 Product Launch - US Desktop".

**Ad Set Organization**: Create separate ad sets for different audiences, placements, or creative variations. This allows you to analyze performance by segment.

**Budget Testing**: Start with conservative budgets to test performance, then scale up successful ad sets.

**Time Scheduling**: Use Start/Stop times for limited-time promotions or to test different time windows for your audience.

**Bid Strategy Selection**: Choose bid strategies that align with your campaign objective. For example, use "Lowest Cost" for awareness campaigns and "Highest Value With Min ROAS" for conversion-focused campaigns.

## Troubleshooting

**Validation Errors**: Read the error message carefully—it indicates which field needs attention. Ensure all required fields are filled and follow the specified formats (URLs, numbers, etc.).

**Excel File Won't Import**: Ensure all required fields are filled in the form. The generated file should be compatible with Meta Ads Manager. If you encounter import errors, check that the file wasn't corrupted during download.

**Missing Ad Sets**: You must add at least one ad set before submitting. Use the "+ Add Another Ad Set" button to add more.

**Budget Conflicts**: If you set campaign-level budgets, ensure ad set budgets don't exceed the campaign budget. The form validates this logic.

## Technical Details

**Technology Stack**: React 19 + Tailwind CSS 4 (frontend), Express.js + tRPC (backend), MySQL/TiDB (database), ExcelJS (Excel generation).

**Data Storage**: Campaign and ad set data are stored in the database for future reference. You can view your campaign history and regenerate Excel files as needed.

**Excel Template Preservation**: The original Meta Bulk Upload Template structure is preserved exactly, including all header rows and validation sheets. Only the data rows (starting from row 4) are populated with your campaign information.

**Currency Handling**: All budget values are stored internally in cents (as integers) but displayed and input as dollars. This ensures precision and prevents rounding errors.

## Support & Feedback

For issues, feature requests, or feedback, please contact your team's administrator or the tool's development team.
