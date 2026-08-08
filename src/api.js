// api.js — keys come from localStorage first, then fallback to build env
function getRuntimeApiKey(storageKey, envValue) {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(storageKey);
    if (stored?.trim()) return stored.trim();
  }
  return envValue || "";
}

export function getOpenWeatherKey() {
  return getRuntimeApiKey("VITE_OPENWEATHER_KEY", import.meta.env.VITE_OPENWEATHER_KEY);
}

export function getNewsApiKey() {
  return getRuntimeApiKey("VITE_NEWSAPI_KEY", import.meta.env.VITE_NEWSAPI_KEY);
}

// local sample news for reliable fallback
import sampleNews from "./data/news-sample.json";

// local fallback sample (imported dynamically when needed)
// GEO SEARCH
export async function geoSearch(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${getOpenWeatherKey()}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("geoSearch error:", res.status);
    throw new Error("Failed to load city");
  }

  const data = await res.json();
  if (!data.length) throw new Error("City not found");
  return data[0];
}

// WEATHER
export async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${getOpenWeatherKey()}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("getWeather error:", res.status);
    throw new Error("Failed to load weather");
  }

  return await res.json();
}

// FORECAST (єдина правильна версія)
export async function getForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${getOpenWeatherKey()}&units=metric`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Forecast error:", res.status);
    return { list: [] }; // не ламаємо UI
  }

  return await res.json();
}

// CITY PHOTO (use thematic LoremFlickr city images with landmark and skyline tags)
const CITY_IMAGE_TAGS = {
  kyiv: "kyiv,landmark,architecture,skyline",
  prague: "prague,landmark,architecture,castle",
  warsaw: "warsaw,landmark,architecture,skyline",
  berlin: "berlin,landmark,architecture,skyline",
  madrid: "madrid,landmark,architecture,skyline",
  vienna: "vienna,landmark,architecture,skyline",
};

export function getCityPhoto(city) {
  const cityName = String(city || "city").trim().toLowerCase();
  const normalized = cityName.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-");
  const tags = CITY_IMAGE_TAGS[normalized] || `${normalized || "city"},landmark,skyline,architecture`;
  const hash = tags.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100000, 1);
  const encodedTags = encodeURIComponent(tags);
  return `https://loremflickr.com/800/600/${encodedTags}?lock=${hash}`;
}

<<<<<<< HEAD
// NEWS - виправлена версія з кращим fallback
export async function fetchNews({ q = "", page = 1, pageSize = 12, country = "", language = "" } = {}) {
=======
// NEWS
function parseRssItem(item) {
  const title = item.querySelector("title")?.textContent || "No title";
  const link = item.querySelector("link")?.textContent || "#";
  const description = item.querySelector("description")?.textContent || "";
  const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
  const enclosure = item.querySelector("enclosure");
  const image = enclosure?.getAttribute("url") || null;
  const sourceName = item.ownerDocument?.querySelector("channel > title")?.textContent || "News";

  return {
    title,
    url: link,
    description,
    publishedAt: pubDate,
    urlToImage: image,
    source: { name: sourceName },
  };
}

async function fetchRssFeed(url) {
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://r.jina.ai/http://",
    "https://thingproxy.freeboard.io/fetch/",
  ];

  for (const p of proxies) {
    try {
      const proxyUrl = p + encodeURIComponent(url);
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        console.warn("proxy failed", p, res.status);
        continue;
      }

      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const items = Array.from(xml.querySelectorAll("item") || []).map(parseRssItem);
      if (items && items.length) return items;
    } catch (err) {
      console.warn("proxy error", p, err);
      continue;
    }
  }

  // If all proxies failed, throw so caller can fallback to local sample
  throw new Error("All RSS proxies failed");
}

export async function fetchNews({ q = "", page = 1, pageSize = 12, country = "es", language = "" } = {}) {
>>>>>>> 7091ee3 (fix(news): add RSS proxy fallback and local news sample)
  const key = getNewsApiKey();
  
  // NEWS: try NewsAPI with key, otherwise RSS feeds via proxies, otherwise local sample
  export async function fetchNews({ q = "", page = 1, pageSize = 12, country = "es", language = "" } = {}) {
    const key = getNewsApiKey();

    if (key) {
      try {
        const base = q ? "https://newsapi.org/v2/everything" : "https://newsapi.org/v2/top-headlines";
        const params = new URLSearchParams();
        if (q) params.append("q", q);
        if (!q && country) params.append("country", country);
        if (language) params.append("language", language);
        params.append("page", String(page));
        params.append("pageSize", String(pageSize));

        const url = `${base}?${params.toString()}`;
        const res = await fetch(url, { headers: { "X-Api-Key": key } });
        if (res.ok) {
          const data = await res.json();
          if (data?.articles) return data;
        }
      } catch (err) {
        console.warn("NewsAPI error:", err);
      }
    }

    // RSS fallback
    try {
      const feeds = [
        "https://rss.nytimes.com/services/xml/rss/nyt/Climate.xml",
        "https://feeds.reuters.com/reuters/environment",
        "https://www.theguardian.com/environment/rss",
      ];

      const feedItems = [];
      for (const feedUrl of feeds) {
        try {
          const items = await fetchRssFeed(feedUrl);
          feedItems.push(...items);
        } catch (err) {
          console.warn("RSS fallback feed failed:", feedUrl, err);
        }
      }

      if (!feedItems.length) return sampleNews;

      const filtered = feedItems.filter((item) => {
        if (!q) return true;
        const lower = q.toLowerCase();
        return [item.title, item.description, item.source?.name].some((value) =>
          String(value || "").toLowerCase().includes(lower)
        );
      });

      const unique = Array.from(new Map(filtered.map((item) => [item.url, item])).values());
      const sorted = unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      const start = (page - 1) * pageSize;
      const paged = sorted.slice(start, start + pageSize);

      return { articles: paged, totalResults: filtered.length };
    } catch (err) {
      console.error("News fallback error:", err);
      return sampleNews;
    }
  }
>>>>>>> 7091ee3 (fix(news): add RSS proxy fallback and local news sample)

    // Пагінація
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return { articles: paged, totalResults: filtered.length };
  } catch (err) {
<<<<<<< HEAD
    console.error("Fallback news error:", err);
    return { articles: [] };
=======
    console.error("News fallback error:", err);
    // final fallback: sample local news
    return sampleNews;
>>>>>>> 7091ee3 (fix(news): add RSS proxy fallback and local news sample)
  }
}
