import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import { createSchema, createYoga } from "graphql-yoga";
import cors from "cors";

import { AzureWikiAdapter } from "../../adapters/driven/azure-wiki";
import { OpenAIAdapter } from "../../adapters/driven/openai";
import { analyzeTicket } from "../../application/use-cases/analyze-ticket";

const app = express();
const azureWiki = new AzureWikiAdapter();
const aiAdapter = new OpenAIAdapter();

// 1. Định nghĩa SCHEMA
const schema = createSchema({
  typeDefs: `#graphql
    type WikiPage {
      id: String
      markdown: String
    }

    type AnalysisResult {
      category: String
      priority: String
      diagnosis: String
      response: String
      isSolutionFound: Boolean
    }

    type Query {
      getWiki(id: String!): WikiPage
      analyzeTicket(title: String!, description: String!): AnalysisResult
    }
  `,
  resolvers: {
    Query: {
      getWiki: async (_: any, { id }: { id: string }) => {
        console.log(`[WIKI] Truy xuất mục: ${id}`);
        const data = await azureWiki.getWikiPage(id);
        if (!data) return null;
        return { id, markdown: data.snippet };
      },
      analyzeTicket: async (_: any, { title, description }: { title: string, description: string }) => {
        return await analyzeTicket({ title, description }, azureWiki, aiAdapter);
      }
    }
  }
});

// 2. Khởi tạo Yoga engine
const yoga = createYoga({ 
  schema,
  graphqlEndpoint: "/graphql"
});

app.use(cors());
app.use(express.json());

// Gắn Yoga vào Express (Mọi yêu cầu đến /graphql sẽ do Yoga xử lý)
app.use(yoga.graphqlEndpoint, yoga);

// Đầu REST API cũ
app.post("/ticket/query", async (req: Request, res: Response) => {
  try {
    const result = await analyzeTicket(req.body, azureWiki, aiAdapter);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------------------------");
  console.log("MINDX HUB: GRAPHQL YOGA IS ONLINE");
  console.log(`URL: http://localhost:${PORT}/graphql`);
  console.log("--------------------------------------------------");
});
