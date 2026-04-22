import ExcelJS from "exceljs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { EXCEL_COLUMN_MAP } from "../shared/meta-constants";
import type { Campaign, AdSet } from "../drizzle/schema";

// Get __dirname equivalent for ESM
const __filename_local = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const __dirname_local = path.dirname(__filename_local);

/**
 * Format a datetime-local string for Excel without a timezone offset.
 * Meta reads the value in the ad account's timezone (EST), so we pass it
 * through as-is rather than converting to UTC (which would shift the time).
 */
function formatDateTimeForExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const base = dateStr.slice(0, 16); // "YYYY-MM-DDTHH:MM"
  return base.length === 16 ? `${base}:00` : "";
}

/**
 * Format geo location with country prefix based on geo type
 */
function formatGeoWithCountry(geoType: string, geoLocation: string, country?: string | null): string {
  if (!geoLocation) return "";
  
  const countryCode = country ? country.substring(0, 2).toUpperCase() : "US";
  
  switch (geoType) {
    case "zip":
      // Format: US:10001, US:90210
      return geoLocation
        .split(",")
        .map((zip) => `${countryCode}:${zip.trim()}`)
        .join(", ");
    
    case "address":
      // Address format already includes coordinates, just add country at the end
      return `${geoLocation}, ${country || "United States"}`;
    
    case "city":
      // City format: Palo Alto, CA; New York, NY → add country
      return `${geoLocation}, ${country || "United States"}`;
    
    case "region":
      // Region format: California, Texas → add country
      return `${geoLocation}, ${country || "United States"}`;
    
    case "county":
      // County format: Warren County, Kentucky → add country
      return `${geoLocation}, ${country || "United States"}`;
    
    default:
      return geoLocation;
  }
}

/**
 * Generate an Excel file based on the Meta template
 * Preserves the template structure and adds campaign/ad set data
 */
export async function generateExcelFile(campaignData: Campaign & { adSets: AdSet[] }): Promise<Buffer> {
  // Load the template file - try multiple paths to handle different runtime environments
  const possiblePaths = [
    path.join(__dirname_local, "..", "client", "public", "Meta_BulkUploadTemplate_2.3.26.xlsx"),
    path.join(process.cwd(), "client", "public", "Meta_BulkUploadTemplate_2.3.26.xlsx"),
    path.join(process.cwd(), "public", "Meta_BulkUploadTemplate_2.3.26.xlsx"),
    "/home/ubuntu/meta-campaign-intake-tool/client/public/Meta_BulkUploadTemplate_2.3.26.xlsx",
  ];
  
  let finalPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      finalPath = p;
      break;
    }
  }
  
  if (!finalPath) {
    const errorMsg = `Template file not found. Tried paths: ${possiblePaths.join(", ")}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Create a new workbook from the template
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(finalPath);

  // Get the main sheet
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Template workbook has no sheets");
  }

  // Start adding data from row 4 (rows 1-3 are headers)
  let rowIndex = 4;

  // Add one row per ad set
  for (const adSet of campaignData.adSets) {
    const row = sheet.getRow(rowIndex);

    // Map campaign fields
    row.getCell(EXCEL_COLUMN_MAP.campaignName + 1).value = campaignData.campaignName;
    row.getCell(EXCEL_COLUMN_MAP.campaignStatus + 1).value = campaignData.campaignStatus;
    row.getCell(EXCEL_COLUMN_MAP.specialAdCategories + 1).value = campaignData.specialAdCategories || "";
    row.getCell(EXCEL_COLUMN_MAP.specialAdCategoryCountry + 1).value = campaignData.specialAdCategoryCountry || "";
    row.getCell(EXCEL_COLUMN_MAP.campaignObjective + 1).value = campaignData.campaignObjective;
    row.getCell(EXCEL_COLUMN_MAP.buyingType + 1).value = campaignData.buyingType;
    
    // Budget fields - convert from cents to dollars
    if (campaignData.campaignSpendLimit) {
      row.getCell(EXCEL_COLUMN_MAP.campaignSpendLimit + 1).value = campaignData.campaignSpendLimit / 100;
    }
    if (campaignData.campaignDailyBudget) {
      row.getCell(EXCEL_COLUMN_MAP.campaignDailyBudget + 1).value = campaignData.campaignDailyBudget / 100;
    }
    if (campaignData.campaignLifetimeBudget) {
      row.getCell(EXCEL_COLUMN_MAP.campaignLifetimeBudget + 1).value = campaignData.campaignLifetimeBudget / 100;
    }
    
    row.getCell(EXCEL_COLUMN_MAP.campaignBidStrategy + 1).value = campaignData.campaignBidStrategy || "";

    // Map ad set fields
    row.getCell(EXCEL_COLUMN_MAP.adSetId + 1).value = ""; // Leave blank for new ad sets
    row.getCell(EXCEL_COLUMN_MAP.adSetRunStatus + 1).value = adSet.adSetRunStatus;
    row.getCell(EXCEL_COLUMN_MAP.adSetName + 1).value = adSet.adSetName;
    row.getCell(EXCEL_COLUMN_MAP.adSetTimeStart + 1).value = formatDateTimeForExcel(adSet.adSetTimeStart);
    row.getCell(EXCEL_COLUMN_MAP.adSetTimeStop + 1).value = formatDateTimeForExcel(adSet.adSetTimeStop);
    
    if (adSet.adSetDailyBudget) {
      row.getCell(EXCEL_COLUMN_MAP.adSetDailyBudget + 1).value = adSet.adSetDailyBudget / 100;
    }
    if (adSet.adSetLifetimeBudget) {
      row.getCell(EXCEL_COLUMN_MAP.adSetLifetimeBudget + 1).value = adSet.adSetLifetimeBudget / 100;
    }
    
    row.getCell(EXCEL_COLUMN_MAP.adSetBidStrategy + 1).value = adSet.adSetBidStrategy;
    
    if (adSet.minimumROAS) {
      row.getCell(EXCEL_COLUMN_MAP.minimumROAS + 1).value = adSet.minimumROAS / 100;
    }
    
    row.getCell(EXCEL_COLUMN_MAP.link + 1).value = adSet.link || "";
    row.getCell(EXCEL_COLUMN_MAP.optimizationGoal + 1).value = adSet.optimizationGoal;
    row.getCell(EXCEL_COLUMN_MAP.billingEvent + 1).value = adSet.billingEvent;
    
    // Format geo location with country prefix
    if (adSet.geoLocation) {
      const formattedGeo = formatGeoWithCountry(adSet.geoType, adSet.geoLocation, adSet.country);
      row.getCell(EXCEL_COLUMN_MAP.geoLocation + 1).value = formattedGeo;
    }

    rowIndex++;
  }

  // Convert to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as unknown as ArrayLike<number>);
}
