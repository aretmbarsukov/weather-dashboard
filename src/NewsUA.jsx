import { useEffect, useState } from "react";
import "./App.css";
import { fetchNewsUA } from "./api";

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "unknown";
  }
}

export default function NewsUA() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const items = await fetchNewsUA();
        if (!mounted) return;

        const normalized = items
          .filter((item) => item.title && item.link)
          .map((item) => ({
            ...item,
            date: item.date || item.pubDate || "",
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setArticles(normalized);
      } catch (err) {
        console.error("NewsUA load failed:", err);
        setError("Failed to load Ukrainian news. Please try again later.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container news-page">
      <header className="news-header">
        <h1>Українські новини</h1>
        <p className="news-intro">
          Актуальні статті з Pravda, UNIAN, Ukrinform.
        </p>
      </header>

      {loading && <p>Завантаження новин…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && articles.length === 0 && (
        <p>Новин наразі немає. Спробуйте пізніше.</p>
      )}

      <section className="news-grid news-grid-ua">
        {articles.map((article, index) => (
          <article key={`${article.link}-${index}`} className="news-card">
            <a href={article.link} target="_blank" rel="noreferrer">
              <div className="news-thumb">
                <img
                  src={`https://source.unsplash.com/800x600/?news,ukraine,${encodeURIComponent(
                    article.title
                  )}`}
                  alt={article.title || "Новини України"}
                  onError={(e) => {
                    e.currentTarget.src = `https://source.unsplash.com/800x600/?ukraine,news`;
                  }}
                />
              </div>

              <div className="news-body">
                <h3>{article.title}</h3>
                <p className="news-meta">
                  {getHost(article.link)}
                  {article.date ? ` • ${new Date(article.date).toLocaleString()}` : ""}
                </p>
                <p className="news-desc">{article.description || "Опис відсутній."}</p>
              </div>
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
