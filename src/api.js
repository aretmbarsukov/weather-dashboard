// ===============================
// API KEYS
// ===============================
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

// ===============================
// GEO SEARCH
// ===============================
export async function geoSearch(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${OPENWEATHER_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load city");

  const data = await res.json();
  if (!data.length) throw new Error("City not found");

  return data[0];
}

// ===============================
// CURRENT WEATHER
// ===============================
export async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load weather");

  return await res.json();
}

// ===============================
// FORECAST
// ===============================
export async function getForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) return { list: [] };

  return await res.json();
}

// ===============================
// CITY PHOTO (LoremFlickr)
// ===============================
export function getCityPhoto(city) {
  const normalized = String(city || "city")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-");

  const tags = `${normalized},landmark,skyline,architecture`;

  const hash = tags
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 100000, 1);

  return `https://loremflickr.com/800/600/${encodeURIComponent(tags)}?lock=${hash}`;
}

// ===============================
// NEWS — Ukrainian feeds via rss2json.com
// ===============================
const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json?rss_url=";
const NEWS_FEEDS = [
  "https://www.pravda.com.ua/rss/",
  "https://www.bbc.com/ukrainian/index.xml",
  "https://espreso.tv/rss",
];

function getSourceHost(feedUrl) {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export async function fetchNewsUA() {
  const all = [];

  for (const feedUrl of NEWS_FEEDS) {
    try {
      const res = await fetch(`${RSS2JSON_BASE}${encodeURIComponent(feedUrl)}`);
      if (!res.ok) {
        console.warn("fetchNewsUA feed failed:", feedUrl, res.status);
        continue;
      }

      const data = await res.json();
      if (data.status !== "ok" || !Array.isArray(data.items)) {
        console.warn("fetchNewsUA invalid response:", feedUrl, data);
        continue;
      }

      const items = data.items.map((item) => ({
        title: item.title || "",
        description: item.description || item.content || "",
        link: item.link || item.guid || "",
        date: item.pubDate || item.pubdate || "",
        source: getSourceHost(feedUrl),
        thumbnail: item.thumbnail || item.enclosure?.thumbnail || item.enclosure?.url || "",
      }));

      all.push(...items.filter((item) => item.title && item.link));
    } catch (err) {
      console.warn("fetchNewsUA feed error:", feedUrl, err);
    }
  }

  return all;
}
