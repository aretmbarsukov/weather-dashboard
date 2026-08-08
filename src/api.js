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

export function ensureLocalApiKey(storageKey, value) {
  if (typeof window !== "undefined" && value?.trim()) {
    window.localStorage.setItem(storageKey, value.trim());
  }
}

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

// NEWS
export async function fetchNews({ q = "", page = 1, pageSize = 12, country = "es", language = "" } = {}) {
  const base = q ? "https://newsapi.org/v2/everything" : "https://newsapi.org/v2/top-headlines";

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (!q && country) params.append("country", country);
  if (language) params.append("language", language);
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));

  const url = `${base}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": getNewsApiKey()
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("NewsAPI error:", res.status, text);
    return { articles: [] }; // не ламаємо сайт
  }

  return await res.json();
}
