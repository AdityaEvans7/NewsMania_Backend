import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// --------------------
// Middlewares
// --------------------
app.use(cors());
app.use(express.json());

// Request logger (useful on Vercel logs)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const API_KEY = process.env.NEWS_API_KEY;

if (!API_KEY) {
  console.error("❌ NEWS_API_KEY is missing in environment variables");
}

// --------------------
// GET /news
// Supports:
// /news                     → trending
// /news?category=technology → category
// /news?query=bitcoin       → search
// /news?source=bbc-news     → source (optional)
// --------------------
app.get("/news", async (req, res) => {
  try {
    const { source, category, query } = req.query;
    let url;

    // 1️⃣ Source-based news
    if (source) {
      url = `https://newsapi.org/v2/top-headlines?sources=${encodeURIComponent(
        source
      )}&apiKey=${API_KEY}`;
    }

    // 2️⃣ Search by keyword
    else if (query) {
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&sortBy=publishedAt&pageSize=30&apiKey=${API_KEY}`;
    }

    // 3️⃣ Category-based news
    else if (category) {
      const allowedCategories = [
        "business",
        "entertainment",
        "general",
        "health",
        "science",
        "sports",
        "technology",
      ];

      const c = String(category).toLowerCase();

      if (allowedCategories.includes(c)) {
        url = `https://newsapi.org/v2/top-headlines?country=us&category=${encodeURIComponent(
          c
        )}&apiKey=${API_KEY}`;
      } else {
        // Fallback for unsupported categories
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          category
        )}&sortBy=publishedAt&pageSize=30&apiKey=${API_KEY}`;
      }
    }

    // 4️⃣ Default trending news
    else {
      url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${API_KEY}`;
    }

    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
      console.error("❌ NewsAPI Error:", response.status, text);
      return res.status(response.status).json({ error: text });
    }

    const data = JSON.parse(text);

    // Always return an array for frontend consistency
    res.json(data.articles || []);
  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// --------------------
// GET /news/:source
// Example: /news/fox-news
// --------------------
app.get("/news/:source", async (req, res) => {
  try {
    const { source } = req.params;

    const url = `https://newsapi.org/v2/top-headlines?sources=${encodeURIComponent(
      source
    )}&apiKey=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ NewsAPI Error:", text);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    res.json(data.articles || []);
  } catch (error) {
    console.error("❌ Source News Error:", error.message);
    res.status(500).json({ error: "Failed to fetch source news" });
  }
});

// --------------------
// Server Start
// --------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
