import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchNewsUA } from "./api";

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "unknown";
  }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NewsUA() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const pageSize = 6;

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
            description: stripHtml(item.description || item.content || ""),
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedArticle) {
        setSelectedArticle(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedArticle]);

  const totalPages = Math.max(1, Math.ceil(articles.length / pageSize));
  const pagedArticles = useMemo(
    () => articles.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [articles, currentPage]
  );

  const openArticle = (article) => {
    setSelectedArticle(article);
  };

  const closeArticleModal = () => {
    setSelectedArticle(null);
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderExcerpt = (description) => {
    if (!description) return "Опис відсутній.";
    const maxLength = 140;
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength).trim()}...`;
  };

  return (
    <div className="container news-page">
      <header className="news-header">
        <h1>Українські новини</h1>
        <p className="news-intro">
          Актуальні статті з Pravda, BBC Україна та Espreso.
        </p>
      </header>

      {loading && <p>Завантаження новин…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && articles.length === 0 && (
        <p>Новин наразі немає. Спробуйте пізніше.</p>
      )}

      <section className="news-grid news-grid-ua">
        {pagedArticles.map((article, index) => (
          <article
            key={`${article.link}-${index}`}
            className="news-card news-card-clickable"
            onClick={() => openArticle(article)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") openArticle(article);
            }}
          >
            <div className="news-body news-body-noimg">
              <h3>{article.title}</h3>
              <p className="news-meta">
                {article.source || getHost(article.link)}
                {article.date ? ` • ${new Date(article.date).toLocaleString()}` : ""}
              </p>
              <p className="news-desc">{renderExcerpt(article.description)}</p>
            </div>
          </article>
        ))}
      </section>

      {totalPages > 1 && (
        <div className="news-pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={goToPreviousPage}
          >
            Попередня
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={goToNextPage}
          >
            Наступна
          </button>
        </div>
      )}

      {selectedArticle && (
        <>
          <div className="article-modal-overlay" onClick={closeArticleModal} />
          <div className="article-modal" role="dialog" aria-modal="true">
            <button
              className="article-modal-close"
              onClick={closeArticleModal}
              aria-label="Close article"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="article-modal-content">
              <h2>{selectedArticle.title}</h2>
              <p className="news-meta">
                {selectedArticle.source || getHost(selectedArticle.link)}
                {selectedArticle.date ? ` • ${new Date(selectedArticle.date).toLocaleString()}` : ""}
              </p>
              <p className="news-desc">{selectedArticle.description || "Опис відсутній."}</p>
              <a
                href={selectedArticle.link}
                target="_blank"
                rel="noreferrer"
                className="news-readmore"
              >
                Відкрити оригінал
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
