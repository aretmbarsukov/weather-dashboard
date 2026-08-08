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
// NEWS — Ukrainian feeds via Jina Reader
// ===============================
export async function fetchNewsUA() {
  const feeds = [
    "https://r.jina.ai/https://www.pravda.com.ua/rss/",
    "https://r.jina.ai/https://www.unian.ua/rss/publications",
    "https://r.jina.ai/https://www.ukrinform.ua/rss",
  ];

  const all = [];

  for (const url of feeds) {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("fetchNewsUA feed failed:", url, res.status);
      continue;
    }

    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "application/xml");
    const items = [...xml.querySelectorAll("item")].map((item) => ({
      title: item.querySelector("title")?.textContent || "",
      description: item.querySelector("description")?.textContent || "",
      link: item.querySelector("link")?.textContent || "",
      date: item.querySelector("pubDate")?.textContent || "",
    }));

    all.push(...items);
  }

  return all;
}
