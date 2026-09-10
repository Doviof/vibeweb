import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  HashRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Expand,
  Grid2X2,
  List,
  Moon,
  Search,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "@fontsource/courier-prime/400.css";
import "@fontsource/courier-prime/700.css";
import { LocaleProvider, useLocale, type Entry } from "./i18n";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { useResponsiveCSSVars } from "./useResponsive";
import { transitionTheme } from "./themeTransition";
import "./styles.css";
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const number = (value: number) => String(value).padStart(2, "0");
const date = (value: string) => value.replaceAll("-", ".");
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function IconButton({
  label,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Photo({
  entry,
  priority = false,
  className = "",
  thumbnail = false,
}: {
  entry: Pick<Entry, "image" | "alt">;
  priority?: boolean;
  className?: string;
  thumbnail?: boolean;
}) {
  const { t } = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setLoaded(
      Boolean(imageRef.current?.complete && imageRef.current.naturalWidth),
    );
    setFailed(false);
  }, [entry.image]);
  const stem = entry.image.replace(/\.[^.]+$/, "");
  return failed ? (
    <div className="image-error" role="status">
      {t("imageError")}
    </div>
  ) : (
    <img
      className={`photo ${loaded ? "is-loaded" : ""} ${className}`}
      src={asset(entry.image)}
      srcSet={[480, 960, 1920]
        .map((width) => `${asset(`${stem}-${width}.webp`)} ${width}w`)
        .join(", ")}
      sizes={
        thumbnail
          ? "(max-width: 700px) 45vw, 360px"
          : "(max-width: 700px) 95vw, (max-width: 1500px) 80vw, 1200px"
      }
      alt={entry.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      ref={imageRef}
    />
  );
}

function Lightbox({ start, onClose }: { start: number; onClose: () => void }) {
  const { entries, t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState(false);
  const [copied, setCopied] = useState(false);
  const entry = entries[index];
  const move = (direction: number) => {
    setIndex((i) => (i + direction + entries.length) % entries.length);
    setZoom(false);
    setCopied(false);
  };
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.hash = `/entry/${entry.id}`;
      await navigator.clipboard.writeText(url.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <dialog
      className="lightbox"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
      aria-label={entry.title}
    >
      <div className="lightbox-top">
        <span className="mono">
          {number(index + 1)} / {number(entries.length)}
        </span>
        <div className="button-row">
          <IconButton
            label={copied ? t("copied") : t("copyLink")}
            onClick={copyLink}
          >
            {copied ? <Check /> : <Copy />}
          </IconButton>
          <IconButton
            label={zoom ? t("zoomOut") : t("zoomIn")}
            aria-pressed={zoom}
            onClick={() => setZoom(!zoom)}
          >
            {zoom ? <ZoomOut /> : <ZoomIn />}
          </IconButton>
          <IconButton label={t("closeViewer")} onClick={onClose}>
            <X />
          </IconButton>
        </div>
      </div>
      <div className={`lightbox-image ${zoom ? "zoomed" : ""}`}>
        <Photo key={entry.id} entry={entry} priority />
      </div>
      <div className="lightbox-bottom">
        <IconButton label={t("previousImage")} onClick={() => move(-1)}>
          <ChevronLeft />
        </IconButton>
        <div>
          <p>{entry.title}</p>
          <span className="mono muted">
            {date(entry.date)} · {entry.place}
          </span>
        </div>
        <IconButton label={t("nextImage")} onClick={() => move(1)}>
          <ChevronRight />
        </IconButton>
      </div>
    </dialog>
  );
}

function Header({ theme, toggleTheme }: {
  theme: string;
  toggleTheme: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const { site, t } = useLocale();
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label={t("home")}>
        <span>{site.name}</span>
      </Link>
      <nav aria-label={t("navigation")}>
        <NavLink end to="/">
          {t("journal")}
        </NavLink>
        <NavLink to="/archive">{t("archive")}</NavLink>
        <NavLink to="/notes">{t("notes")}</NavLink>
        <NavLink to="/about">{t("about")}</NavLink>
      </nav>
      <div className="header-tools">
        <span className="header-note mono">{t("personalJournal")}</span>
        <LanguageSwitcher />
        <IconButton
          label={theme === "dark" ? t("lightTheme") : t("darkTheme")}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </IconButton>
      </div>
    </header>
  );
}

function Journal({
  active,
  setActive,
  open,
}: {
  active: number;
  setActive: (index: number) => void;
  open: (entry: Entry) => void;
}) {
  const { entries, featured, categoryLabel, t } = useLocale();
  const scroller = useRef<HTMLDivElement>(null);
  const startIndex = useRef(active);
  const navigate = useNavigate();
  useLayoutEffect(() => {
    const node = scroller.current!;
    node.scrollTop = startIndex.current * node.clientHeight;
    const observer = new IntersectionObserver(
      (events) => {
        for (const event of events)
          if (event.isIntersecting && event.intersectionRatio >= 0.55)
            setActive(Number((event.target as HTMLElement).dataset.index));
      },
      { root: node, threshold: [0.55] },
    );
    node
      .querySelectorAll(".journal-slide")
      .forEach((slide) => observer.observe(slide));
    let height = node.clientHeight;
    const resize = new ResizeObserver(() => {
      if (Math.abs(height - node.clientHeight) > 2) {
        const index = Math.round(node.scrollTop / Math.max(height, 1));
        height = node.clientHeight;
        node.scrollTop = index * height;
      }
    });
    resize.observe(node);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [setActive]);
  const go = (index: number) => {
    const node = scroller.current;
    if (node)
      node.scrollTo({
        top:
          Math.max(0, Math.min(featured.length - 1, index)) * node.clientHeight,
        behavior: reducedMotion() ? "instant" : "smooth",
      });
  };
  return (
    <main id="main" className="journal-shell">
      <div
        className="journal-scroll"
        ref={scroller}
        tabIndex={0}
        aria-label={t("imageJournal")}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (
            [
              "ArrowDown",
              "PageDown",
              "ArrowUp",
              "PageUp",
              "Home",
              "End",
            ].includes(e.key)
          ) {
            e.preventDefault();
            go(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? featured.length - 1
                  : active +
                    (["ArrowDown", "PageDown"].includes(e.key) ? 1 : -1),
            );
          }
        }}
      >
        {featured.map((entry, i) => (
          <section
            key={entry.id}
            className={`journal-slide ${active === i ? "is-active" : ""}`}
            data-index={i}
            aria-label={`${i + 1}. ${entry.title}`}
          >
            <figure className="slide-figure">
              <button
                className="photo-button"
                onClick={() => open(entry)}
                aria-label={t("enlargeEntry", { title: entry.title })}
              >
                <Photo entry={entry} priority={i === 0} />
                <span className="expand-hint">
                  <Expand size={17} />
                </span>
              </button>
              <figcaption>
                <div>
                  <Link to={`/entry/${entry.id}`} className="entry-title">
                    {entry.title}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="caption-meta">
                  <span>
                    {categoryLabel(entry.category)} — {entry.place}
                  </span>
                  <time className="mono" dateTime={entry.date}>
                    {date(entry.date)}
                  </time>
                </div>
              </figcaption>
            </figure>
          </section>
        ))}
      </div>
      <div className="journal-bottom">
        <button
          className="text-command mono"
          onClick={() => navigate("/archive")}
        >
          <Grid2X2 size={13} />
          {t("index")} <span className="muted">({number(entries.length)})</span>
        </button>
        <div className="progress-track" aria-label={t("recordPosition")}>
          {featured.map((entry, i) => (
            <button
              key={entry.id}
              onClick={() => go(i)}
              className={i === active ? "active" : ""}
              aria-label={t("goToEntry", { title: entry.title })}
              aria-current={i === active ? "true" : undefined}
              title={entry.title}
            >
              <span />
            </button>
          ))}
        </div>
        <IconButton
          label={
            active === featured.length - 1 ? t("firstEntry") : t("nextEntry")
          }
          onClick={() => go(active === featured.length - 1 ? 0 : active + 1)}
        >
          <ArrowDown size={17} />
        </IconButton>
      </div>
    </main>
  );
}

function Archive() {
  const { entries, categoryLabel, t } = useLocale();
  const [category, setCategory] = useState("*");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const categories = ["*", ...new Set(entries.map((e) => e.category))];
  const filtered = entries.filter(
    (e) =>
      (category === "*" || e.category === category) &&
      `${e.title} ${e.place} ${e.date} ${e.body.join(" ")}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <main id="main" className="page archive-page">
      <PageHeading
        english={t("archiveEyebrow")}
        title={t("archiveTitle")}
        sub={t("archiveRange", {
          count: entries.length,
          year: entries.at(-1)?.date.slice(0, 4) ?? "",
        })}
      />
      <div className="archive-toolbar">
        <div className="filters" aria-label={t("categoryFilter")}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={category === c ? "active" : ""}
            >
              {c === "*" ? t("all") : categoryLabel(c)}
              <span className="mono">
                {number(
                  c === "*"
                    ? entries.length
                    : entries.filter((e) => e.category === c).length,
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="archive-actions">
          <label className="search">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
            />
            {search && (
              <IconButton
                label={t("clearSearch")}
                onClick={() => setSearch("")}
              >
                <X size={13} />
              </IconButton>
            )}
          </label>
          <div className="view-toggle">
            <IconButton
              label={t("gridView")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid2X2 size={16} />
            </IconButton>
            <IconButton
              label={t("listView")}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={17} />
            </IconButton>
          </div>
        </div>
      </div>
      <p className="results mono" aria-live="polite">
        {t(filtered.length === 1 ? "entryCountOne" : "entryCountMany", {
          count: number(filtered.length),
        })}
      </p>
      {filtered.length ? (
        <div className={`archive-entries ${view}`}>
          {filtered.map((entry, i) => (
            <Link
              to={`/entry/${entry.id}`}
              className="archive-entry"
              key={entry.id}
            >
              <div className="archive-image">
                <Photo entry={entry} priority={i < 3} thumbnail />
              </div>
              <div className="archive-caption">
                <time className="mono muted" dateTime={entry.date}>
                  {date(entry.date)}
                </time>
                <h2>{entry.title}</h2>
                <span className="archive-place">
                  {entry.place}{" "}
                  <span className="muted">
                    / {categoryLabel(entry.category)}
                  </span>
                </span>
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>{t("noResults")}</p>
          <button
            className="underlined"
            onClick={() => {
              setSearch("");
              setCategory("*");
            }}
          >
            {t("viewAll")}
          </button>
        </div>
      )}
      <div className="end-mark mono">
        {t("indexEnd")} <Asterisk size={16} />
      </div>
    </main>
  );
}

function PageHeading({
  english,
  title,
  sub,
}: {
  english: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow mono">{english}</span>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Detail({ open }: { open: (entry: Entry) => void }) {
  const { entries, site, categoryLabel, t } = useLocale();
  const { id } = useParams();
  const entry = entries.find((e) => e.id === id);
  const location = useLocation();
  const navigate = useNavigate();
  if (!entry) return <NotFound />;
  const index = entries.indexOf(entry);
  return (
    <main id="main" className="page detail-page">
      <div className="detail-top">
        <button
          className="text-command"
          onClick={() => {
            if (location.key !== "default") navigate(-1);
            else navigate("/");
          }}
        >
          <ArrowLeft size={15} />
          {t("back")}
        </button>
        <span className="mono muted">
          {t("record")} {number(index + 1)} / {number(entries.length)}
        </span>
      </div>
      <button
        className="detail-image photo-button"
        onClick={() => open(entry)}
        aria-label={t("enlargeEntry", { title: entry.title })}
      >
        <Photo entry={entry} priority />
        <span className="expand-hint">
          <Expand size={17} />
        </span>
      </button>
      <div className="detail-copy">
        <div className="detail-facts">
          <time className="mono">{date(entry.date)}</time>
          <span>
            {entry.place} / {categoryLabel(entry.category)}
          </span>
        </div>
        <article>
          <h1>{entry.title}</h1>
          {entry.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {site.demo && (
            <p className="demo-credit">
              {t("demoCreditBefore")}
              <a
                href={`${entry.sourceImage}?w=1920&q=85`}
                target="_blank"
                rel="noreferrer"
              >
                Unsplash <ArrowUpRight size={11} />
              </a>
              {t("demoCreditAfter")}
            </p>
          )}
        </article>
      </div>
      <div className="detail-pagination">
        {index > 0 ? (
          <Link to={`/entry/${entries[index - 1].id}`}>
            <ArrowLeft size={16} />
            <span>
              <small>{t("previousEntry")}</small>
              {entries[index - 1].title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {index < entries.length - 1 ? (
          <Link to={`/entry/${entries[index + 1].id}`}>
            <span>
              <small>{t("nextEntryShort")}</small>
              {entries[index + 1].title}
            </span>
            <ArrowRight size={16} />
          </Link>
        ) : (
          <Link to="/archive">
            {t("allEntries")} <Grid2X2 size={16} />
          </Link>
        )}
      </div>
    </main>
  );
}

function Notes() {
  const { notes, t } = useLocale();
  return (
    <main id="main" className="page notes-page">
      <PageHeading
        english={t("notesEyebrow")}
        title={t("notesTitle")}
        sub={t("notesSubtitle")}
      />
      <div className="notes-feed">
        {notes.map((note) => (
          <article className="note" id={note.id} key={note.id}>
            <time className="mono">{date(note.date)}</time>
            <div>
              <h2>{note.title}</h2>
              {note.image && (
                <div className="note-image">
                  <Photo
                    entry={{ image: note.image, alt: note.alt || note.title }}
                  />
                </div>
              )}
              {note.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <span className="note-end">—</span>
            </div>
          </article>
        ))}
      </div>
      <div className="end-mark mono">
        {t("toBeContinued")} <Asterisk size={16} />
      </div>
    </main>
  );
}

function About() {
  const { entries, site, t } = useLocale();
  return (
    <main id="main" className="page about-page">
      <PageHeading english={t("aboutEyebrow")} title={t("aboutTitle")} />
      <div className="about-layout">
        <div className="about-photo">
          <Photo entry={entries[3]} priority />
          <span className="mono">{t("wanderQuote")}</span>
        </div>
        <article className="about-copy">
          {site.about.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="about-links">
            <Link to="/">
              {t("browseJournal")} <ArrowUpRight size={15} />
            </Link>
            <Link to="/notes">
              {t("readNotes")} <ArrowUpRight size={15} />
            </Link>
            {site.email && (
              <a href={`mailto:${site.email}`}>
                {t("writeToMe")} <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          {site.demo && (
            <aside className="demo-note">
              <span className="mono">{t("demoJournal")}</span>
              <p>{t("demoNotice")}</p>
            </aside>
          )}
        </article>
      </div>
    </main>
  );
}

function NotFound() {
  const { t } = useLocale();
  return (
    <main id="main" className="page not-found">
      <span className="mono muted">{t("notFoundEyebrow")}</span>
      <h1>{t("notFoundTitle")}</h1>
      <Link className="underlined" to="/">
        {t("backHome")} <ArrowRight size={15} />
      </Link>
    </main>
  );
}

function App() {
  const { entries, site, language, t } = useLocale();
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "light",
  );
  const themeTransitionActive = useRef(false);
  const location = useLocation();

  // Apply responsive CSS variables that replace hardcoded --header/--footer
  useResponsiveCSSVars();
  useEffect(() => {
    const labels: Record<string, string> = {
      "/": t("journal"),
      "/archive": t("archive"),
      "/notes": t("notes"),
      "/about": t("about"),
    };
    const entry = entries.find((e) => location.pathname === `/entry/${e.id}`);
    const title = `${entry?.title || labels[location.pathname] || t("notFound")} · ${site.name}`;
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", entry?.body[0] || site.tagline);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", entry?.body[0] || site.tagline);
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute(
        "content",
        { zh: "zh_CN", en: "en_US", ja: "ja_JP" }[language],
      );
  }, [location.pathname, entries, site, language, t]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setLightbox(null);
  }, [location.pathname]);
  async function toggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    if (themeTransitionActive.current) return;
    themeTransitionActive.current = true;

    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;

    const applyTheme = () => {
      flushSync(() => setTheme(next));
      root.dataset.theme = next;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", next === "dark" ? "#0b0b0c" : "#f3f0e9");
      try {
        localStorage.setItem("en-route-theme", next);
      } catch {
        /* Storage is optional in private browsing. */
      }
    };

    try {
      await transitionTheme({
        applyTheme,
        originElement: event.currentTarget,
        reducedMotion: reducedMotion(),
      });
    } finally {
      themeTransitionActive.current = false;
    }
  }
  const open = (entry: Entry) =>
    setLightbox(entries.findIndex((item) => item.id === entry.id));
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const node = document.querySelector<HTMLElement>(
            ".journal-scroll, main",
          );
          if (node) {
            if (!node.hasAttribute("tabindex")) node.tabIndex = -1;
            node.focus();
          }
        }}
      >
        {t("skipContent")}
      </a>
      <Header theme={theme} toggleTheme={toggleTheme} />
      <Routes>
        <Route
          path="/"
          element={
            <Journal active={active} setActive={setActive} open={open} />
          }
        />
        <Route path="/archive" element={<Archive />} />
        <Route path="/entry/:id" element={<Detail open={open} />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer
        className={`site-footer ${location.pathname === "/" ? "home-footer" : ""}`}
      >
        <span className="footer-word">{t("footer")}</span>
        <div>
          <span className="mono">
            © {new Date().getFullYear()} {site.name}
          </span>
        </div>
      </footer>
      {lightbox !== null && (
        <Lightbox start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocaleProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </LocaleProvider>
  </React.StrictMode>,
);
