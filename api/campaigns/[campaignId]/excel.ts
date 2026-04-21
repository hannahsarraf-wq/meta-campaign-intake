import "dotenv/config";
import express from "express";
import excelDownloadRouter from "../../../server/excel-download";

const app = express();
app.use("/api", excelDownloadRouter);

export default app;
