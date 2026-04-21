import { Router, Request, Response } from "express";
import * as db from "./db";
import { generateExcelFile } from "./excel-generator";

const router = Router();

/**
 * GET /api/campaigns/:campaignId/excel
 * Download the generated Excel file for a campaign
 */
router.get("/campaigns/:campaignId/excel", async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.campaignId);

    if (isNaN(campaignId)) {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }

    // Get campaign with ad sets
    const campaignData = await db.getCampaignWithAdSets(campaignId);
    if (!campaignData) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Generate Excel file
    const excelBuffer = await generateExcelFile(campaignData);

    // Set response headers
    const fileName = `${campaignData.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", excelBuffer.length);

    // Send the file
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).json({ error: "Failed to generate Excel file" });
  }
});

export default router;
