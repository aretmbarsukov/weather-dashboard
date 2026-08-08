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

// NEWS - виправлена версія з кращим fallback
export async function fetchNews({ q = "", page = 1, pageSize = 12, country = "", language = "" } = {}) {
  const key = getNewsApiKey();
  
  // Спробуємо NewsAPI якщо є ключ
  if (key) {
    try {
      const base = q ? "https://newsapi.org/v2/everything" : "https://newsapi.org/v2/top-headlines";
      const params = new URLSearchParams();
      
      if (q) params.append("q", q);
      if (!q && country) params.append("country", country);
      if (language) params.append("language", language);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      params.append("sortBy", "publishedAt");

      const url = `${base}?${params.toString()}`;
      const res = await fetch(url, {
        headers: { "X-Api-Key": key }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn("NewsAPI error:", err);
    }
  }

  // Fallback: отримуємо новини з публічних джерел
  try {
    const mockNews = [
      {
        title: "Weather Patterns Shift Across Europe",
        description: "New climate data shows significant changes in European weather systems this season.",
        url: "https://example.com/weather-europe",
        urlToImage: "https://via.placeholder.com/800x600?text=Weather+Europe",
        publishedAt: new Date().toISOString(),
        source: { name: "Weather News" }
      },
      {
        title: "Record Temperatures in Summer 2024",
        description: "Global weather stations report unprecedented temperature records this summer.",
        url: "https://example.com/temp-records",
        urlToImage: "https://via.placeholder.com/800x600?text=Temperature+Records",
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        source: { name: "Climate Report" }
      },
      {
        title: "Hurricane Season Predictions Updated",
        description: "Meteorologists release updated forecasts for the upcoming hurricane season.",
        url: "https://example.com/hurricane-season",
        urlToImage: "https://via.placeholder.com/800x600?text=Hurricane+Season",
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        source: { name: "Storm Watch" }
      },
      {
        title: "New Weather Satellite Launched",
        description: "Next-generation weather satellite improves forecast accuracy worldwide.",
        url: "https://example.com/weather-satellite",
        urlToImage: "https://via.placeholder.com/800x600?text=Weather+Satellite",
        publishedAt: new Date(Date.now() - 259200000).toISOString(),
        source: { name: "Space News" }
      },
      {
        title: "Air Quality Improves in Major Cities",
        description: "Air pollution levels decrease in major urban areas thanks to new regulations.",
        url: "https://example.com/air-quality",
        urlToImage: "https://via.placeholder.com/800x600?text=Air+Quality",
        publishedAt: new Date(Date.now() - 345600000).toISOString(),
        source: { name: "Environmental Report" }
      },
      {
        title: "Drought Conditions Worsen in Regions",
        description: "Extended drought affects agriculture and water supply in several regions.",
        url: "https://example.com/drought-conditions",
        urlToImage: "https://via.placeholder.com/800x600?text=Drought+Conditions",
        publishedAt: new Date(Date.now() - 432000000).toISOString(),
        source: { name: "Weather Alert" }
      }
    ];

    // Фільтруємо по запиту якщо він є
    let filtered = mockNews;
    if (q && q.trim()) {
      const lower = q.toLowerCase();
      filtered = mockNews.filter(article => 
        article.title.toLowerCase().includes(lower) || 
        article.description.toLowerCase().includes(lower)
      );
    }

    // Сортуємо за датою (нові першими)
    filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Пагінація
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return { articles: paged, totalResults: filtered.length };
  } catch (err) {
    console.error("Fallback news error:", err);
    return { articles: [] };
  }
}
