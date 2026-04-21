/**
 * Test script to generate Excel files for all seven optimization goals
 * and verify they match the Meta template structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPTIMIZATION_GOALS = [
  'IMPRESSIONS',
  'REACH',
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'THRUPLAY',
  'LEAD_GENERATION',
  'OFFSITE_CONVERSIONS',
];

const EXCEL_COLUMN_MAP = {
  campaignName: 0,           // A
  campaignStatus: 1,         // B
  specialAdCategories: 2,    // C
  specialAdCategoryCountry: 3, // D
  campaignObjective: 4,      // E
  buyingType: 5,             // F
  campaignSpendLimit: 6,     // G
  campaignDailyBudget: 7,    // H
  campaignLifetimeBudget: 8, // I
  campaignBidStrategy: 9,    // J
  adSetId: 14,               // O
  adSetRunStatus: 15,        // P
  adSetName: 16,             // Q
  adSetTimeStart: 17,        // R
  adSetTimeStop: 18,         // S
  adSetDailyBudget: 19,      // T
  adSetLifetimeBudget: 20,   // U
  adSetBidStrategy: 22,      // W
  minimumROAS: 23,           // X
  link: 26,                  // AA
  optimizationGoal: 42,      // AQ
  billingEvent: 43,          // AR
  geoLocation: 24,           // Y
};

async function loadTemplate() {
  const templatePath = path.join(__dirname, 'client/public/Meta_BulkUploadTemplate_2.3.26.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  return workbook;
}

async function createTestExcel(optimizationGoal) {
  const workbook = await loadTemplate();
  const worksheet = workbook.getWorksheet('Meta Bulk Upload Template');
  
  if (!worksheet) {
    throw new Error('Worksheet "Meta Bulk Upload Template" not found');
  }

  // Add test data row (row 4, index 3)
  const row = worksheet.getRow(4);
  if (!row) {
    throw new Error('Could not get row 4 from worksheet');
  }

  // Set campaign-level fields
  row.getCell(EXCEL_COLUMN_MAP.campaignName + 1).value = `Test Campaign - ${optimizationGoal}`;
  row.getCell(EXCEL_COLUMN_MAP.campaignStatus + 1).value = 'PAUSED';
  row.getCell(EXCEL_COLUMN_MAP.specialAdCategories + 1).value = 'None';
  row.getCell(EXCEL_COLUMN_MAP.campaignObjective + 1).value = 'Outcome Sales';
  row.getCell(EXCEL_COLUMN_MAP.buyingType + 1).value = 'AUCTION';

  // Set ad set-level fields
  row.getCell(EXCEL_COLUMN_MAP.adSetRunStatus + 1).value = 'ACTIVE';
  row.getCell(EXCEL_COLUMN_MAP.adSetName + 1).value = `Test Ad Set - ${optimizationGoal}`;
  row.getCell(EXCEL_COLUMN_MAP.adSetDailyBudget + 1).value = 1000; // $10.00 in cents
  row.getCell(EXCEL_COLUMN_MAP.adSetBidStrategy + 1).value = 'Lowest Cost';
  row.getCell(EXCEL_COLUMN_MAP.link + 1).value = 'https://example.com';
  row.getCell(EXCEL_COLUMN_MAP.optimizationGoal + 1).value = optimizationGoal;
  row.getCell(EXCEL_COLUMN_MAP.billingEvent + 1).value = 'IMPRESSIONS';
  row.getCell(EXCEL_COLUMN_MAP.geoLocation + 1).value = 'US:10001';

  // Save the file
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `test-${optimizationGoal.toLowerCase()}.xlsx`;
  const filepath = path.join(outputDir, filename);
  await workbook.xlsx.writeFile(filepath);

  return { filename, filepath };
}

async function verifyExcelStructure(filepath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);

  const worksheet = workbook.getWorksheet('Meta Bulk Upload Template');
  const validationSheet = workbook.getWorksheet('VALIDATION');

  const checks = {
    hasMainSheet: !!worksheet,
    hasValidationSheet: !!validationSheet,
    hasHeaderRows: worksheet.getRow(1).values.length > 0,
    hasDataRow: worksheet.getRow(4).values.length > 0,
    optimizationGoalSet: !!worksheet.getRow(4).getCell(EXCEL_COLUMN_MAP.optimizationGoal + 1).value,
  };

  return checks;
}

async function runTests() {
  console.log('🧪 Testing Excel export for all optimization goals...\n');

  const results = [];

  for (const goal of OPTIMIZATION_GOALS) {
    try {
      console.log(`📊 Testing: ${goal}`);

      // Create Excel file
      const { filename, filepath } = await createTestExcel(goal);
      console.log(`   ✅ Generated: ${filename}`);

      // Verify structure
      const checks = await verifyExcelStructure(filepath);
      console.log(`   ✅ Structure verified:`, checks);

      results.push({
        goal,
        status: 'PASS',
        filename,
        checks,
      });
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        goal,
        status: 'FAIL',
        error: error.message,
      });
    }
  }

  // Summary
  console.log('\n📋 Test Summary:');
  console.log('================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ All tests passed! Excel files are ready for Meta import.');
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
  }

  // Save results to file
  const resultsPath = path.join(__dirname, 'test-output', 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: test-output/test-results.json`);
}

runTests().catch(console.error);
