import { useState, useEffect, useRef } from "react";
import "./App.css";

import {
  geoSearch,
  getWeather,
  getForecast,
  getCityPhoto,
  fetchNews
} from "./api";

/* SVG ICONS */

const SunIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffcc00">
    <circle cx="12" cy="12" r="5" />
    <g stroke="#ffcc00" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="1" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="23" y2="12" />
      <line x1="4" y1="4" x2="7" y2="7" />
      <line x1="17" y1="17" x2="20" y2="20" />
      <line x1="4" y1="20" x2="7" y2="17" />
      <line x1="17" y1="7" x2="20" y2="4" />
    </g>
  </svg>
);

const TempIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff9800">
    <path d="M6 2v14a6 6 0 1012 0V2h-2v14a4 4 0 11-8 0V2H6z" />
  </svg>
);

const WindIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#4caf50">
    <path d="M4 12h13a3 3 0 100-6 3 3 0 00-3 3H4m0 6h9a3 3 0 110 6 3 3 0 01-3-3H4" />
  </svg>
);

const PressureIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#2196f3">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" fill="none" />
  </svg>
);

const HumidityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#00bcd4">
    <path d="M12 2s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z" />
  </svg>
);

/* HELPERS */

function sanitizeCityInput(raw) {
  if (!raw) return "";

  let s = raw.replace(/[\uFEFF\u200B\u00A0]/g, " ");

  s = s
    .replace(/[“”«»„”]/g, '"')
    .replace(/[‘’]/g, "'");

  s = s.replace(/[\x00-\x1F\x7F]/g, "");
  s = s.trim();
  s = s.normalize("NFC");

  return s;
}

const DEFAULT_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg";

function getWeatherIconUrl(icon) {
  return icon
    ? `https://openweathermap.org/img/wn/${icon}@2x.png`
    : DEFAULT_IMAGE;
}

function handleImageError(e) {
  e.currentTarget.src = DEFAULT_IMAGE;
}

/* APP */

export default function App() {
  const [page, setPage] = useState("home");

  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  /* DEFAULT CITIES */

  const [citiesData, setCitiesData] = useState([]);
  const citiesCacheRef = useRef({});

  /* MODAL */

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [modalCity, setModalCity] = useState(null);
  const [modalWeather, setModalWeather] = useState(null);
  const [modalForecast, setModalForecast] = useState(null);
  const [modalPhoto, setModalPhoto] = useState(null);

  /* NEWS */

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");

  const [newsQuery, setNewsQuery] = useState("");
  const [newsPage, setNewsPage] = useState(1);

  const newsCacheRef = useRef({});

  const defaultCities = [
    "Kyiv",
    "Prague",
    "Warsaw",
    "Berlin",
    "Madrid",
    "Vienna"
  ];

  /* DATE */

  const today = new Date();

  const dateString = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });

  /* LOAD DEFAULT CITIES */

  useEffect(() => {
    let mounted = true;

    async function loadDefaultCities() {
      const placeholders = defaultCities.map((name) => ({
        name,
        lat: null,
        lon: null,
        temp: null,
        desc: "",
        photo: null,
        icon: null,
        loading: true,
        error: null
      }));

      if (!mounted) return;

      setCitiesData(placeholders);

      for (const name of defaultCities) {
        try {
          if (citiesCacheRef.current[name]) {
            const cached = citiesCacheRef.current[name];

            if (!mounted) return;

            setCitiesData((prev) =>
              prev.map((c) =>
                c.name === name ? cached : c
              )
            );

            continue;
          }

          const loc = await geoSearch(name);

          const w = await getWeather(
            loc.lat,
            loc.lon
          );

          const p = await getCityPhoto(
            loc.name || name
          );

          const item = {
            name: loc.name || name,
            lat: loc.lat,
            lon: loc.lon,

            temp:
              typeof w?.main?.temp === "number"
                ? Math.round(w.main.temp)
                : null,

            desc:
              w?.weather?.[0]?.description || "",

            icon:
              w?.weather?.[0]?.icon || null,

            photo: p,

            loading: false,
            error: null
          };

          citiesCacheRef.current[name] = item;

          if (!mounted) return;

          setCitiesData((prev) =>
            prev.map((c) =>
              c.name === name ? item : c
            )
          );
        } catch (err) {
          console.error(
            `Failed to load ${name}:`,
            err
          );

          const item = {
            name,
            lat: null,
            lon: null,
            temp: null,
            desc: "",
            photo: null,
            icon: null,
            loading: false,
            error: "Failed to load"
          };

          citiesCacheRef.current[name] = item;

          if (!mounted) return;

          setCitiesData((prev) =>
            prev.map((c) =>
              c.name === name ? item : c
            )
          );
        }
      }
    }

    loadDefaultCities();

    return () => {
      mounted = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* NAVIGATION */

  function navigateTo(target) {
    setPage(target);
    setMenuOpen(false);
  }

  function handleBackHome() {
    setWeather(null);
    setForecast(null);
    setPhoto(null);
    setCity("");
    setError("");
    setPage("home");
  }

  /* CITY SEARCH */

  async function handleSearch() {
    const raw = city;
    const q = sanitizeCityInput(raw);

    if (!q) {
      setError("Please enter a city name");
      return;
    }

    setError("");
    setWeather(null);
    setForecast(null);
    setPhoto(null);

    try {
      let location = null;

      /* 1. DIRECT SEARCH */

      try {
        location = await geoSearch(q);
      } catch (e) {
        console.warn("Direct search failed");
      }

      /* 2. ASCII FALLBACK */

      if (!location) {
        const ascii = q
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (ascii !== q) {
          try {
            location = await geoSearch(ascii);
          } catch (e) {
            console.warn("ASCII search failed");
          }
        }
      }

      /* 3. COUNTRY FALLBACK */

      if (!location) {
        const commonCountries = [
          "UA",
          "ES",
          "PL",
          "DE",
          "GB",
          "US"
        ];

        for (const country of commonCountries) {
          try {
            location = await geoSearch(
              `${q}, ${country}`
            );

            if (location) break;
          } catch (e) {}
        }
      }

      /* 4. NOMINATIM FALLBACK */

      if (!location) {
        try {
          const nomUrl =
            `https://nominatim.openstreetmap.org/search` +
            `?format=json` +
            `&q=${encodeURIComponent(q)}` +
            `&limit=1`;

          const response = await fetch(
            nomUrl,
            {
              headers: {
                "Accept-Language": "en"
              }
            }
          );

          const arr = await response.json();

          if (arr && arr.length) {
            location = {
              lat: arr[0].lat,
              lon: arr[0].lon,
              name: arr[0].display_name
            };
          }
        } catch (e) {
          console.warn("Nominatim search failed");
        }
      }

      if (!location) {
        setError(
          "City not found. Try a shorter name."
        );

        return;
      }

      const w = await getWeather(
        location.lat,
        location.lon
      );

      const f = await getForecast(
        location.lat,
        location.lon
      );

      const p = await getCityPhoto(
        location.name || q
      );

      setWeather(w);
      setForecast(f);
      setPhoto(p);

      setPage("home");
      setMenuOpen(false);
    } catch (err) {
      console.error(
        "handleSearch error:",
        err
      );

      setError(
        "Something went wrong while searching."
      );
    }
  }

  function onKeyDownSearch(e) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  /* CITY MODAL */

  async function openCityModal(cityName) {
    try {
      setModalError("");

      setModalCity(cityName);
      setModalWeather(null);
      setModalForecast(null);
      setModalPhoto(null);

      setModalOpen(true);
      setModalLoading(true);

      const location =
        await geoSearch(cityName);

      const [w, f, p] =
        await Promise.all([
          getWeather(
            location.lat,
            location.lon
          ),

          getForecast(
            location.lat,
            location.lon
          ),

          getCityPhoto(
            location.name || cityName
          )
        ]);

      if (!w || !w.weather) {
        throw new Error(
          "Weather data missing"
        );
      }

      setModalWeather(w);
      setModalForecast(f);
      setModalPhoto(p);
    } catch (err) {
      console.error(
        "openCityModal error:",
        err
      );

      setModalError(
        "Не вдалося завантажити дані. Спробуй ще раз."
      );
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);

    setModalCity(null);
    setModalWeather(null);
    setModalForecast(null);
    setModalPhoto(null);

    setModalError("");
    setModalLoading(false);
  }

  /* =========================
     NEWS
     ========================= */

  /*
    Load news when user opens News page.
  */

  useEffect(() => {
    if (page === "news") {
      setNewsPage(1);

      loadNews({
        q: "",
        page: 1
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /*
    Scroll to top when changing page.
  */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, [newsPage, page]);

  /*
    MAIN NEWS FUNCTION
  */

  async function loadNews({
    q = "",
    page = 1
  } = {}) {
    const cleanQuery = q.trim();

    const cacheKey =
      `${cleanQuery}|${page}`;

    /* CACHE */

    if (newsCacheRef.current[cacheKey]) {
      setNews(
        newsCacheRef.current[cacheKey]
      );

      setNewsError("");

      return;
    }

    try {
      setNewsLoading(true);
      setNewsError("");

      /*
        ONE API REQUEST.

        We intentionally use English here
        because NewsAPI's language parameter
        does not support "uk".
      */

      const data = await fetchNews({
        q: cleanQuery,
        page,
        pageSize: 12,
        country: "",
        language: "en"
      });

      const articles =
        Array.isArray(data?.articles)
          ? data.articles
          : [];

      /*
        Remove broken articles
      */

      const validArticles =
        articles.filter(
          (article) =>
            article &&
            article.url &&
            article.title
        );

      setNews(validArticles);

      newsCacheRef.current[
        cacheKey
      ] = validArticles;

      /*
        No results
      */

      if (validArticles.length === 0) {
        setNewsError(
          cleanQuery
            ? "No news found for this search."
            : "No news available right now."
        );
      }
    } catch (err) {
      console.error(
        "loadNews error:",
        err
      );

      setNews([]);
      setNewsError(
        err?.message ||
        "Failed to load news. Check your API key."
      );
    } finally {
      setNewsLoading(false);
    }
  }

  /*
    Search news
  */

  function searchNewsNow() {
    const query =
      newsQuery.trim();

    setNewsPage(1);

    loadNews({
      q: query,
      page: 1
    });
  }

  /*
    Previous news page
  */

  function goPrevNews() {
    if (newsPage <= 1) {
      return;
    }

    const nextPage =
      newsPage - 1;

    setNewsPage(nextPage);

    loadNews({
      q: newsQuery,
      page: nextPage
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /*
    Next news page
  */

  function goNextNews() {
    if (news.length === 0) {
      return;
    }

    const nextPage =
      newsPage + 1;

    setNewsPage(nextPage);

    loadNews({
      q: newsQuery,
      page: nextPage
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* RENDER */

  return (
    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">

        <div
          className="logo"
          onClick={handleBackHome}
        >
          Weather
        </div>

        <ul className="nav-links">

          <li
            onClick={() =>
              navigateTo("home")
            }
          >
            Home
          </li>

          <li
            onClick={() =>
              navigateTo("radar")
            }
          >
            Live radar
          </li>

          <li
            onClick={() =>
              navigateTo("news")
            }
          >
            News
          </li>

        </ul>

        <button className="login-btn">
          Login
        </button>

        <div
          className="burger"
          onClick={() =>
            setMenuOpen(true)
          }
        >
          ☰
        </div>

      </nav>

      {/* MOBILE MENU */}

      {menuOpen && (
        <>
          <div
            className="mobile-overlay"
            onClick={() =>
              setMenuOpen(false)
            }
          />

          <ul
            className="mobile-menu"
            role="menu"
          >
            <li
              onClick={() =>
                navigateTo("home")
              }
            >
              Home
            </li>

            <li
              onClick={() =>
                navigateTo("news")
              }
            >
              News
            </li>

            <li
              onClick={() =>
                navigateTo("radar")
              }
            >
              Live radar
            </li>

            <li
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Login
            </li>
          </ul>
        </>
      )}

      {/* RADAR */}

      {page === "radar" && (
        <div className="page-content container">

          <h1>Live Radar</h1>

          <p>
            Radar map will be added here.
          </p>

        </div>
      )}

      {/* =========================
          NEWS PAGE
          ========================= */}

      {page === "news" && (
        <div className="container news-page">

          <header className="news-header">

            <h1>
              Latest News
            </h1>

            <div className="news-controls">

              <input
                type="text"
                placeholder="Search news..."
                value={newsQuery}
                onChange={(e) =>
                  setNewsQuery(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter"
                  ) {
                    searchNewsNow();
                  }
                }}
                aria-label="Search news"
              />

              <button
                onClick={
                  searchNewsNow
                }
              >
                Search
              </button>

            </div>

          </header>

          {/* LOADING */}

          {newsLoading && (
            <p>
              Loading news…
            </p>
          )}

          {/* ERROR */}

          {newsError && (
            <p className="error">
              {newsError}
            </p>
          )}

          {/* NEWS GRID */}

          <section className="news-grid">

            {!newsLoading &&
              news.length === 0 &&
              !newsError && (
                <p>
                  No news found.
                </p>
              )}

            {news.map(
              (article, index) => (
                <article
                  key={
                    article.url ||
                    index
                  }
                  className="news-card"
                >

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                  >

                    <div className="news-thumb">

                      <img
                        src={
                          article.urlToImage ||
                          DEFAULT_IMAGE
                        }
                        alt={
                          article.title ||
                          "News"
                        }
                        onError={
                          handleImageError
                        }
                      />

                    </div>

                    <div className="news-body">

                      <h3>
                        {article.title}
                      </h3>

                      <p className="news-meta">

                        {article.source?.name ||
                          "Unknown source"}

                        {" • "}

                        {article.publishedAt
                          ? new Date(
                              article.publishedAt
                            ).toLocaleString()
                          : ""}

                      </p>

                      <p className="news-desc">

                        {article.description ||
                          "No description available."}

                      </p>

                    </div>

                  </a>

                </article>
              )
            )}

          </section>

          {/* PAGINATION */}

          <div className="news-pagination arrows">

            <button
              className="arrow-btn"
              onClick={
                goPrevNews
              }
              disabled={
                newsPage <= 1 ||
                newsLoading
              }
            >
              ←
            </button>

            <div className="page-indicator">
              Page {newsPage}
            </div>

            <button
              className="arrow-btn"
              onClick={
                goNextNews
              }
              disabled={
                news.length === 0 ||
                newsLoading
              }
            >
              →
            </button>

          </div>

        </div>
      )}

      {/* =========================
          HOME
          ========================= */}

      {page === "home" && (
        <>

          <header className="hero">

            <div className="container">

              <div className="top-row">

                {weather && (
                  <button
                    className="back-btn"
                    onClick={
                      handleBackHome
                    }
                  >
                    ← Back
                  </button>
                )}

              </div>

              <h1>
                Weather dashboard
              </h1>

              <p>
                Create your personal
                list of favorite cities
                and always be aware of
                the weather.
              </p>

              <p className="date">
                {dateString}
              </p>

              <div className="search-box">

                <input
                  type="text"
                  placeholder="Type a city name (e.g., Kyiv) and press Enter"
                  value={city}
                  onChange={(e) =>
                    setCity(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    onKeyDownSearch
                  }
                  aria-label="Search city"
                />

                <button
                  onClick={
                    handleSearch
                  }
                >
                  Search
                </button>

              </div>

              <div
                className="search-hint"
                role="status"
                aria-live="polite"
              >
                Tip: press Enter to search
                or click the Search button
              </div>

              {error && (
                <p className="error">
                  {error}
                </p>
              )}

            </div>

          </header>

          {/* DEFAULT CITIES */}

          {!weather && (
            <section className="weather-cards start-grid container">

              {citiesData.length === 0 &&
                defaultCities.map(
                  (c, i) => (
                    <div
                      key={i}
                      className="card"
                    >

                      <div className="photo-wrap">

                        <div
                          style={{
                            height: 220,
                            background:
                              "#eee",
                            borderRadius: 12
                          }}
                        />

                      </div>

                      <h3>
                        {c}
                      </h3>

                      <SunIcon />

                      <p className="desc">
                        Loading…
                      </p>

                      <span className="temp">
                        —
                      </span>

                    </div>
                  )
                )}

              {citiesData.map(
                (c, i) => (
                  <div
                    key={i}
                    className="card"
                  >

                    <div className="photo-wrap">

                      <img
                        src={
                          c.photo ||
                          DEFAULT_IMAGE
                        }
                        alt={c.name}
                        className="city-photo"
                        onError={
                          handleImageError
                        }
                      />

                    </div>

                    <h3>
                      {c.name}
                    </h3>

                    <SunIcon />

                    <p className="desc">
                      {c.loading
                        ? "Loading…"
                        : c.desc || "—"}
                    </p>

                    <span className="temp">

                      {c.loading
                        ? "—"
                        : c.temp !== null
                        ? `${c.temp}°C`
                        : "—"}

                    </span>

                    <div className="card-actions">

                      <button
                        className="see-more"
                        onClick={() =>
                          openCityModal(
                            c.name
                          )
                        }
                      >
                        See more
                      </button>

                    </div>

                  </div>
                )
              )}

            </section>
          )}

          {/* SINGLE CITY */}

          {weather && (
            <section className="weather-cards container single-view">

              <div className="card single-card">

                <div className="photo-wrap">

                  <img
                    src={
                      photo ||
                      DEFAULT_IMAGE
                    }
                    alt={weather.name}
                    className="city-photo"
                    onError={
                      handleImageError
                    }
                  />

                </div>

                <div className="city-header">

                  <h3>
                    {weather.name}
                  </h3>

                  {weather.weather?.[0]
                    ?.icon && (
                    <div className="weather-icon">

                      <img
                        src={getWeatherIconUrl(
                          weather.weather[0]
                            .icon
                        )}
                        alt={
                          weather.weather[0]
                            .description ||
                          "weather icon"
                        }
                        onError={
                          handleImageError
                        }
                      />

                    </div>
                  )}

                </div>

                <SunIcon />

                <p className="desc">
                  {
                    weather.weather[0]
                      .description
                  }
                </p>

                <span className="temp">
                  {Math.round(
                    weather.main.temp
                  )}
                  °C
                </span>

              </div>

            </section>
          )}

          {/* DETAILS */}

          {weather && (
            <section className="details container">

              <div className="detail-box">
                <TempIcon />
                Min:{" "}
                {Math.round(
                  weather.main.temp_min
                )}
                °C
              </div>

              <div className="detail-box">
                <TempIcon />
                Max:{" "}
                {Math.round(
                  weather.main.temp_max
                )}
                °C
              </div>

              <div className="detail-box">
                <HumidityIcon />
                Humidity:{" "}
                {weather.main.humidity}%
              </div>

              <div className="detail-box">
                <PressureIcon />
                Pressure:{" "}
                {weather.main.pressure} hPa
              </div>

              <div className="detail-box">
                <WindIcon />
                Wind:{" "}
                {weather.wind.speed} m/s
              </div>

            </section>
          )}

          {/* HOURLY FORECAST */}

          {forecast && (
            <section className="daily container">

              <h2>
                Next hours
              </h2>

              <div className="article-grid">

                {forecast.list
                  .slice(0, 6)
                  .map(
                    (item, i) => (
                      <div
                        key={i}
                        className="article"
                      >

                        <h4>
                          {item.dt_txt.slice(
                            11,
                            16
                          )}
                        </h4>

                        <SunIcon />

                        <p>
                          {Math.round(
                            item.main.temp
                          )}
                          °C
                        </p>

                      </div>
                    )
                  )}

              </div>

            </section>
          )}

        </>
      )}

      {/* =========================
          MODAL
          ========================= */}

      {modalOpen && (
        <>
          <div
            className="mobile-overlay"
            onClick={
              closeModal
            }
          />

          <div
            className="city-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${modalCity}`}
          >

            <button
              className="modal-close"
              onClick={
                closeModal
              }
            >
              ✕
            </button>

            <div className="modal-content">

              <div className="modal-photo-wrap">

                {modalLoading ? (
                  <div className="modal-loading">
                    Loading…
                  </div>
                ) : modalError ? (
                  <div className="modal-error">
                    {modalError}
                  </div>
                ) : (
                  <img
                    src={
                      modalPhoto ||
                      DEFAULT_IMAGE
                    }
                    alt={modalCity}
                    className="modal-photo"
                    onError={
                      handleImageError
                    }
                  />
                )}

              </div>

              <div className="modal-info">

                <h2>
                  {modalCity}
                </h2>

                {modalLoading && (
                  <p>
                    Loading data…
                  </p>
                )}

                {modalError && (
                  <p className="error">
                    {modalError}
                  </p>
                )}

                {modalWeather && (
                  <>

                    <p className="modal-desc">
                      {
                        modalWeather
                          .weather[0]
                          .description
                      }
                    </p>

                    <p className="modal-temp">
                      {Math.round(
                        modalWeather
                          .main.temp
                      )}
                      °C
                    </p>

                    <div className="modal-stats">

                      <div>
                        <TempIcon />
                        Min:{" "}
                        {Math.round(
                          modalWeather
                            .main.temp_min
                        )}
                        °C
                      </div>

                      <div>
                        <TempIcon />
                        Max:{" "}
                        {Math.round(
                          modalWeather
                            .main.temp_max
                        )}
                        °C
                      </div>

                      <div>
                        <HumidityIcon />
                        Humidity:{" "}
                        {
                          modalWeather
                            .main.humidity
                        }
                        %
                      </div>

                      <div>
                        <PressureIcon />
                        Pressure:{" "}
                        {
                          modalWeather
                            .main.pressure
                        }{" "}
                        hPa
                      </div>

                      <div>
                        <WindIcon />
                        Wind:{" "}
                        {
                          modalWeather
                            .wind.speed
                        }{" "}
                        m/s
                      </div>

                    </div>

                    {modalForecast && (
                      <>
                        <h4>
                          Next hours
                        </h4>

                        <div className="modal-forecast">

                          {modalForecast.list
                            .slice(0, 6)
                            .map(
                              (
                                item,
                                idx
                              ) => (
                                <div
                                  key={idx}
                                  className="modal-forecast-item"
                                >

                                  <div>
                                    {item.dt_txt.slice(
                                      11,
                                      16
                                    )}
                                  </div>

                                  <div>
                                    {Math.round(
                                      item.main
                                        .temp
                                    )}
                                    °C
                                  </div>

                                </div>
                              )
                            )}

                        </div>
                      </>
                    )}

                  </>
                )}

              </div>

            </div>

          </div>
        </>
      )}

      {/* FOOTER */}

      <footer>

        <div className="footer-links">

          <span>
            Privacy
          </span>

          <span>
            Terms
          </span>

          <span>
            Contact
          </span>

        </div>

        <p>
          © 2024 Weather Dashboard
        </p>

      </footer>

    </div>
  );
}