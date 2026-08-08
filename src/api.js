// api.js
import { API_KEY, NEWS_API_KEY } from "./config";

// GEO SEARCH
export async function geoSearch(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.length) throw new Error("City not found");
  return data[0];
}

// WEATHER
export async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const res = await fetch(url);
  return await res.json();
}

// FORECAST
export async function getForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  const res = await fetch(url);
  return await res.json();
}

// WIKIPEDIA CITY PHOTO
export async function getCityPhoto(city) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.thumbnail?.source) return data.thumbnail.source;
  return "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";
}

/**
 * fetchNews
 * - If q provided -> uses everything endpoint
 * - If q empty -> uses top-headlines with country (default "es")
 */
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
      "X-Api-Key": NEWS_API_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`News API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}
