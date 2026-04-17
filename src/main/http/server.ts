import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import { WikiSearchAdapter } from "../../adapters/driven/wiki-search";
import { OpenAIAdapter } from "../../adapters/driven/openai";
import { analyzeTicket } from "../../application/use-cases/analyze-ticket";

const app = express();
const wikiSearchAdapter = new WikiSearchAdapter();
const aiAdapter = new OpenAIAdapter();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "mindx-ticket-ai" });
});

app.post("/ticket/analyze", async (req: Request, res: Response) => {
  const { title = "", description = "" } = req.body ?? {};
  if (!title && !description) {
    return res.status(400).json({ error: "title or description is required" });
  }

  const result = await analyzeTicket({ title, description }, wikiSearchAdapter, aiAdapter);
  return res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});