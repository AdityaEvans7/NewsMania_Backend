import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Simple request logger to help debug incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const API_KEY = process.env.NEWS_API_KEY;

// Get trending headlines
app.get("/news", async (req, res) => {
  try {
    const { source, category } = req.query;
    let url;

    // If source is specified, prefer fetching by source
    if (source) {
      url = `https://newsapi.org/v2/top-headlines?sources=${encodeURIComponent(
        source
      )}&apiKey=${API_KEY}`;
    } else if (category) {
      // NewsAPI supports specific categories for top-headlines
      const allowed = [
        "business",
        "entertainment",
        "general",
        "health",
        "science",
        "sports",
        "technology",
      ];
      const c = String(category).toLowerCase();
      if (allowed.includes(c)) {
        // Use top-headlines with category
        url = `https://newsapi.org/v2/top-headlines?country=us&category=${encodeURIComponent(
          c
        )}&apiKey=${API_KEY}`;
      } else {
        // Fallback: use everything endpoint to search for the category term
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          category
        )}&sortBy=publishedAt&pageSize=30&apiKey=${API_KEY}`;
      }
    } else {
      // Default: top headlines for US
      url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`;
    }

    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      console.error(
        "News API returned non-OK for /news:",
        response.status,
        text
      );
      try {
        const json = JSON.parse(text);
        return res.status(response.status).json(json);
      } catch (e) {
        return res.status(response.status).json({ error: text });
      }
    }

    const data = JSON.parse(text);
    // For consistent client handling, return an array of articles
    res.json(data.articles || []);
  } catch (error) {
    console.error("Error fetching top headlines:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Get news for a specific source, e.g., /news/fox-news
app.get("/news/:source", async (req, res) => {
  try {
    const { source } = req.params;
    // Use the NewsAPI top-headlines endpoint with the 'sources' query param
    const url = `https://newsapi.org/v2/top-headlines?sources=${encodeURIComponent(
      source
    )}&apiKey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`News API error: ${response.statusText}`);
    const data = await response.json();
    res.json(data.articles || []);
  } catch (error) {
    console.error("Error fetching source news:", error.message);
    res.status(500).json({ error: "Failed to fetch source news" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
