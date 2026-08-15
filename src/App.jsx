import { useState, useEffect, useRef } from "react";
import "./App.css";
import NewsUA from "./NewsUA";

import {
  geoSearch,
  getWeather,
  getForecast,
  getCityPhoto,
  fetchNewsUA,
  getFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
  demoAuth
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

// Простий транслітер для українських запитів → латиниця
function transliterateUAToEN(text) {
    if (!text) return text;
    const map = {
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu', 'Я': 'Ya',
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia'
    };

    return text.split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('').replace(/\s+/g, ' ').trim();
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
    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem("weatherTheme") === "dark";
        } catch {
            return false;
        }
    });
    const [favorites, setFavorites] = useState([]);
    const [user, setUser] = useState(null);
    const citiesCacheRef = useRef({});


    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [authInput, setAuthInput] = useState({
        name: "",
        email: "",
        password: ""
    });
    const [authError, setAuthError] = useState("");
    const [authSuccess, setAuthSuccess] = useState("");
    const [profileInput, setProfileInput] = useState({
        name: "",
        email: "",
        avatar: "",
        password: ""
    });
    const [profileMessage, setProfileMessage] = useState("");
    const [profileError, setProfileError] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("weatherUser");

        if (!storedUser) return;

        try {
            const parsed = JSON.parse(storedUser);

            if (parsed && parsed.name && parsed.email) {
                setUser(parsed);
            }
        } catch (err) {
            console.warn("Failed to parse stored user", err);
            localStorage.removeItem("weatherUser");
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(
                "weatherTheme",
                darkMode ? "dark" : "light"
            );
        } catch {
            // ignore localStorage errors
        }
    }, [darkMode]);

    /* DEFAULT CITIES */

    const [citiesData, setCitiesData] = useState([]);

    /* MODAL */

    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState("");

    const [modalCity, setModalCity] = useState(null);
    const [modalWeather, setModalWeather] = useState(null);
    const [modalForecast, setModalForecast] = useState(null);
    const [modalPhoto, setModalPhoto] = useState(null);

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
    useEffect(() => {
  (async () => {
    try {
      const data = await getFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load favorites", err);
    }
  })();
}, []);


    /* NAVIGATION */

    function navigateTo(target) {
        setPage(target);
        setMenuOpen(false);
    }

    function saveUser(userData) {
        const safeUser = {
            name: userData.name,
            email: userData.email,
            avatar:
                userData.avatar ||
                `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(
                    userData.name
                )}`,
            password: userData.password
        };

        localStorage.setItem(
            "weatherUser",
            JSON.stringify(safeUser)
        );

        setUser({
            name: safeUser.name,
            email: safeUser.email,
            avatar: safeUser.avatar
        });
    }

    function openAuthModal() {
        setAuthModalOpen(true);
        setAuthError("");
        setAuthSuccess("");
        setShowPassword(false);
        setAuthInput({ name: "", email: "", password: "" });
    }

    useEffect(() => {
        try {
            localStorage.setItem(
                "weatherTheme",
                darkMode ? "dark" : "light"
            );
        } catch {
            // ignore write errors
        }
    }, [darkMode]);

    function closeAuthModal() {
        setAuthModalOpen(false);
        setAuthError("");
        setAuthSuccess("");
        setShowPassword(false);
        setAuthInput({ name: "", email: "", password: "" });
    }

    function openProfileModal() {
        if (!user) return;

        setProfileInput({
            name: user.name,
            email: user.email,
            avatar: user.avatar || "",
            password: ""
        });
        setProfileMessage("");
        setProfileError("");
        setShowPassword(false);
        setAvatarPickerOpen(false);
        setProfileModalOpen(true);
    }

    function closeProfileModal() {
        setProfileModalOpen(false);
        setProfileMessage("");
        setProfileError("");
        setShowPassword(false);
        setProfileInput((prev) => ({ ...prev, password: "" }));
    }

    function handleRegister() {
        setAuthError("");
        setAuthSuccess("");

        const name = authInput.name.trim();
        const email = authInput.email.trim();
        const password = authInput.password;

        if (!name || !email || !password) {
            setAuthError("Всі поля обов'язкові.");
            return;
        }

        if (password.length < 6) {
            setAuthError(
                "Пароль має містити щонайменше 6 символів."
            );
            return;
        }

        saveUser({ name, email, password });
        setAuthSuccess(
            "Реєстрація успішна. Ви тепер увійшли."
        );
        setAuthModalOpen(false);
    }

    function handleLogout() {
        localStorage.removeItem("weatherUser");
        setUser(null);
        setAuthError("");
        setAuthSuccess("");
        setAuthModalOpen(false);
        setProfileModalOpen(false);
        setPage("home");
    }

    const avatarOptions = [
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-01",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-02",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-03",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-04",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-05",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-06",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-07",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-08",
        "https://api.dicebear.com/6.x/identicon/svg?seed=avatar-09"
    ];

    function handleAuthChange(field, value) {
        setAuthInput((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    function handleProfileChange(field, value) {
        setProfileInput((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    function handleAvatarFileChange(e) {
        setProfileError("");
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setProfileError("Оберіть файл зображення.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                setProfileInput((prev) => ({
                    ...prev,
                    avatar: result
                }));
            }
        };
        reader.onerror = () => {
            setProfileError("Не вдалося завантажити фото.");
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    function handleSaveProfile() {
        setProfileError("");
        setProfileMessage("");

        const name = profileInput.name.trim();
        const email = profileInput.email.trim();
        const avatar = profileInput.avatar.trim();
        const newPassword = profileInput.password;

        if (!name || !email) {
            setProfileError("Ім'я та пошта не можуть бути порожніми.");
            return;
        }

        const storedUser = localStorage.getItem("weatherUser");
        if (!storedUser) {
            setProfileError("Користувача не знайдено.");
            return;
        }

        let parsedUser;

        try {
            parsedUser = JSON.parse(storedUser);
        } catch (err) {
            console.warn("Stored user parse failed", err);
            setProfileError("Помилка збережених даних.");
            return;
        }

        if (newPassword && newPassword.length < 6) {
            setProfileError(
                "Новий пароль має бути щонайменше 6 символів."
            );
            return;
        }

        const updated = {
            ...parsedUser,
            name,
            email,
            avatar:
                avatar ||
                parsedUser.avatar ||
                `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(
                    name
                )}`,
            password:
                newPassword && newPassword.length >= 6
                    ? newPassword
                    : parsedUser.password
        };

        localStorage.setItem(
            "weatherUser",
            JSON.stringify(updated)
        );
        setUser({
            name: updated.name,
            email: updated.email,
            avatar: updated.avatar
        });
        setProfileMessage("Профіль оновлено.");
        setProfileInput((prev) => ({
            ...prev,
            password: ""
        }));
        closeProfileModal();
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

            /* 3. UKRAINIAN TRANSLITERATION */

            if (!location) {
                const translit = transliterateUAToEN(q);

                if (translit && translit !== q) {
                    try {
                        location = await geoSearch(translit);
                    } catch (e) {
                        console.warn("Transliteration search failed");
                    }
                }
            }

            /* 4. COUNTRY FALLBACK */

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
                    } catch (e) { }
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


    /* RENDER */

    return (
        <div className={darkMode ? "app dark-theme" : "app"}>

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

                <div className="navbar-right">
                    <div className="theme-toggle">
                        <label className="theme-switch">
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={() => setDarkMode((prev) => !prev)}
                                aria-label="Toggle dark mode"
                            />
                            <span className="slider" />
                        </label>
                        <span className="theme-label">
                            {darkMode ? "Dark" : "Light"}
                        </span>
                    </div>

                    <div className="user-actions">
                        {user ? (
                            <button
                                type="button"
                                className="profile-btn"
                                onClick={openProfileModal}
                            >
                            <img
                                src={
                                    user.avatar ||
                                    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
                                }
                                alt={user.name}
                                className="user-avatar"
                            />
                            <span>{user.name}</span>
                        </button>
                    ) : (
                        <button
                            className="auth-btn"
                            onClick={openAuthModal}
                        >
                            Register
                        </button>
                    )}
                </div>
            </div>

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

            {page === "news" && <NewsUA />}

            {authModalOpen && (
                <>
                    <div
                        className="modal-overlay"
                        onClick={closeAuthModal}
                    />
                    <div className="auth-modal" role="dialog" aria-modal="true">
                        <button
                            className="modal-close"
                            onClick={closeAuthModal}
                            aria-label="Close auth modal"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M6 6l12 12M18 6L6 18"
                                    stroke="#000"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>

                        <div className="auth-card">
                            <h1>Register your account</h1>

                            {authError && (
                                <p className="error auth-error">
                                    {authError}
                                </p>
                            )}

                            {authSuccess && (
                                <p className="success auth-success">
                                    {authSuccess}
                                </p>
                            )}

                            <form
                                className="auth-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleRegister();
                                }}
                            >
                                <label>
                                    Name
                                    <input
                                        type="text"
                                        value={authInput.name}
                                        onChange={(e) =>
                                            handleAuthChange(
                                                "name",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Your name"
                                    />
                                </label>

                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={authInput.email}
                                        onChange={(e) =>
                                            handleAuthChange(
                                                "email",
                                                e.target.value
                                            )
                                        }
                                        placeholder="you@example.com"
                                    />
                                </label>

                                <label className="password-field">
                                    Password
                                    <div className="password-input-wrap">
                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={authInput.password}
                                            onChange={(e) =>
                                                handleAuthChange(
                                                    "password",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Minimum 6 characters"
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() =>
                                                setShowPassword(
                                                    (prev) => !prev
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? "🙈" : "👁️"}
                                        </button>
                                    </div>
                                </label>

                                <div className="auth-actions">
                                    <button type="submit" className="primary-btn">
                                        Register
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {profileModalOpen && (
                <>
                    <div
                        className="modal-overlay"
                        onClick={closeProfileModal}
                    />
                    <div className="auth-modal" role="dialog" aria-modal="true">
                        <button
                            className="modal-close"
                            onClick={closeProfileModal}
                            aria-label="Close profile modal"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M6 6l12 12M18 6L6 18"
                                    stroke="#000"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>

                        <div className="auth-card">
                            <h1>Profile</h1>

                            {profileError && (
                                <p className="error auth-error">
                                    {profileError}
                                </p>
                            )}

                            {profileMessage && (
                                <p className="success auth-success">
                                    {profileMessage}
                                </p>
                            )}

                            <div className="profile-avatar-preview">
                                <img
                                    src={
                                        profileInput.avatar ||
                                        "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
                                    }
                                    alt="Profile avatar"
                                />
                            </div>

                            <form
                                className="auth-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSaveProfile();
                                }}
                            >
                                <label>
                                    Name
                                    <input
                                        type="text"
                                        value={profileInput.name}
                                        onChange={(e) =>
                                            handleProfileChange(
                                                "name",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={profileInput.email}
                                        onChange={(e) =>
                                            handleProfileChange(
                                                "email",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>

                                <div className="avatar-row">
                                    <span>Avatar</span>
                                    <button
                                        type="button"
                                        className="avatar-change-btn"
                                        onClick={() =>
                                            setAvatarPickerOpen(
                                                (prev) => !prev
                                            )
                                        }
                                    >
                                        {avatarPickerOpen
                                            ? "Сховати" 
                                            : "Змінити аватарку"}
                                    </button>
                                </div>

                                {avatarPickerOpen && (
                                    <div className="avatar-picker-section">
                                        <div className="avatar-picker-header">
                                            <span>Виберіть одну із 9 аватарок або завантажте свою</span>
                                            <button
                                                type="button"
                                                className="text-btn"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                            >
                                                Завантажити своє фото
                                            </button>
                                        </div>

                                        <div className="avatar-grid">
                                            {avatarOptions.map((src, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className={
                                                        profileInput.avatar === src
                                                            ? "avatar-option active"
                                                            : "avatar-option"
                                                    }
                                                    onClick={() =>
                                                        handleProfileChange(
                                                            "avatar",
                                                            src
                                                        )
                                                    }
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`Avatar ${idx + 1}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden-file-input"
                                            onChange={handleAvatarFileChange}
                                        />
                                    </div>
                                )}

                                <label className="password-field">
                                    New password
                                    <div className="password-input-wrap">
                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={profileInput.password}
                                            onChange={(e) =>
                                                handleProfileChange(
                                                    "password",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Leave blank to keep current"
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() =>
                                                setShowPassword(
                                                    (prev) => !prev
                                                )
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                        >
                                            {showPassword ? "🙈" : "👁️"}
                                        </button>
                                    </div>
                                </label>

                                <div className="profile-actions">
                                    <button type="submit" className="primary-btn">
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        className="danger-btn"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={closeProfileModal}
                                    >
                                        Close
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
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
                                    className="search-input"
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
                            aria-label="Close weather modal"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
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
                                        src={modalPhoto || DEFAULT_IMAGE}
                                        alt={modalCity || "City photo"}
                                        onError={handleImageError}
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