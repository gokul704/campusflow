"use client";

import {
  type ComponentType,
  type CSSProperties,
  type FormEvent,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { getEventSpotlightSlides, getLandingCopy, type LandingLocale } from "./landing-i18n";
import type { NewsItem } from "./landing-types";
import { CORE_FACULTY } from "./faculty-data";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react";

/** All MISH photos shipped in `public/mish/` (22 images). */
const GALLERY = Array.from({ length: 22 }, (_, i) => `/mish/mish-${String(i + 1).padStart(2, "0")}.png`) as readonly string[];

/** `mish-21` — institute building (sorted copy order). */
const BUILDING = GALLERY[20];

/** Principal portrait (public/mish). */
const PRINCIPAL_PHOTO = "/mish/principal-dr-aparna-ravichandran.png";

const PROGRAM_PHOTOS = [GALLERY[10], GALLERY[11], GALLERY[16]] as const;
const VISION_PHOTOS = [GALLERY[2], GALLERY[8]] as const;
const DEPT_PHOTOS = [GALLERY[6], GALLERY[12], GALLERY[15], GALLERY[18]] as const;
const FACILITY_PHOTOS = [GALLERY[4], GALLERY[5], GALLERY[7], GALLERY[9]] as const;
const EVENT_SPOTLIGHT_INDICES = [13, 14, 19] as const;

/** Same visual height for campus highlights + latest news cards (shorter on small phones) */
const EVENT_CARD_HEIGHT =
  "h-[21rem] min-h-[21rem] sm:h-[26rem] sm:min-h-[26rem] lg:h-[28rem] lg:min-h-[28rem] xl:h-[30rem] xl:min-h-[30rem]";

function facultyInitials(fullName: string): string {
  const stripped = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, "").trim();
  const parts = stripped.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Faculty carousel: always three members per slide (partial on last slide). */
const FACULTY_CARDS_PER_SLIDE = 3;

function chunkFacultyPages<T>(items: readonly T[], perPage: number): T[][] {
  const n = Math.max(1, perPage);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += n) {
    pages.push(items.slice(i, i + n));
  }
  return pages;
}

/** Social brand icons (top-level components avoid webpack/HMR issues from nested fns in `as const` arrays). */
function SocialIconFacebook(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function SocialIconInstagram(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100-2.881 1.44 1.44 0 000 2.881z" />
    </svg>
  );
}
function SocialIconLinkedin(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function SocialIconYoutube(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type SocialLinkItem = { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> };

/** Replace with your institute’s official social URLs when available. */
const SOCIAL_LINKS: SocialLinkItem[] = [
  { href: "https://www.facebook.com/", label: "Facebook", Icon: SocialIconFacebook },
  { href: "https://www.instagram.com/", label: "Instagram", Icon: SocialIconInstagram },
  { href: "https://www.linkedin.com/", label: "LinkedIn", Icon: SocialIconLinkedin },
  { href: "https://www.youtube.com/", label: "YouTube", Icon: SocialIconYoutube },
];

export default function HomePage() {
  const [locale, setLocale] = useState<LandingLocale>(() => {
    if (typeof window === "undefined") return "en";
    return window.localStorage.getItem("mish-locale") === "hi" ? "hi" : "en";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [heroImgIndex, setHeroImgIndex] = useState(20);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", message: "" });
  const [contactNotice, setContactNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [highlightsSlide, setHighlightsSlide] = useState(0);
  const [newsModal, setNewsModal] = useState<NewsItem | null>(null);
  const [gallerySlide, setGallerySlide] = useState(0);
  const [facultyPage, setFacultyPage] = useState(0);
  const [visitorCountDisplay, setVisitorCountDisplay] = useState<"loading" | "unavailable" | number>("loading");

  const copy = useMemo(() => getLandingCopy(locale), [locale]);
  const eventSlides = useMemo(
    () => getEventSpotlightSlides(locale, GALLERY, EVENT_SPOTLIGHT_INDICES),
    [locale]
  );
  const latestNews = copy.latestNews;
  const highlightCount = eventSlides.length;

  const facultyPages = useMemo(
    () => chunkFacultyPages(CORE_FACULTY, FACULTY_CARDS_PER_SLIDE),
    []
  );
  const facultyPageCount = facultyPages.length;

  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
    try {
      window.localStorage.setItem("mish-locale", locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  // POST increments server count by 1 and returns the new total. Runs once per mount (in dev, Strict Mode may mount twice).
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/public/visitor-count", { method: "POST" })
      .then((res) => res.json() as Promise<{ count: number | null }>)
      .then((data) => {
        if (typeof data.count === "number" && Number.isFinite(data.count) && data.count >= 0) {
          setVisitorCountDisplay(data.count);
        } else {
          setVisitorCountDisplay("unavailable");
        }
      })
      .catch(() => {
        setVisitorCountDisplay("unavailable");
      });
  }, []);

  useEffect(() => {
    setQuoteIndex(0);
    setNewsModal(null);
  }, [locale]);

  function handleContactSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactNotice(null);
    const name = contact.name.trim();
    const email = contact.email.trim();
    const phone = contact.phone.trim();
    const message = contact.message.trim();
    if (!name || !email || !message) {
      setContactNotice({ kind: "error", text: copy.contactErr });
      return;
    }
    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\n\nMessage:\n${message}`);
    window.location.href = `mailto:admin@mish.com?subject=${subject}&body=${body}`;
    setContactNotice({ kind: "success", text: copy.contactOk });
    setContact({ name: "", email: "", phone: "", message: "" });
  }

  useEffect(() => {
    const len = copy.heroQuotes.length;
    const t = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % len);
      setHeroImgIndex((i) => (i + 1) % GALLERY.length);
    }, 4500);
    return () => clearInterval(t);
  }, [copy.heroQuotes.length]);

  useEffect(() => {
    const locked = lightbox !== null || newsModal !== null;
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (newsModal) setNewsModal(null);
        else setLightbox(null);
        return;
      }
      if (lightbox === null) return;
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + GALLERY.length) % GALLERY.length));
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % GALLERY.length));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, newsModal]);

  useEffect(() => {
    if (lightbox !== null || newsModal !== null) return;
    const id = setInterval(() => {
      setHighlightsSlide((i) => (i + 1) % highlightCount);
    }, 6500);
    return () => clearInterval(id);
  }, [lightbox, newsModal, highlightCount]);

  useEffect(() => {
    if (lightbox !== null || newsModal !== null) return;
    const id = setInterval(() => {
      setGallerySlide((i) => (i + 1) % GALLERY.length);
    }, 5500);
    return () => clearInterval(id);
  }, [lightbox, newsModal]);

  useEffect(() => {
    if (lightbox !== null || newsModal !== null || facultyPageCount <= 1) return;
    const id = setInterval(() => {
      setFacultyPage((p) => (p + 1) % facultyPageCount);
    }, 7500);
    return () => clearInterval(id);
  }, [lightbox, newsModal, facultyPageCount]);

  return (
    <div className="min-h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-[#f5f2f0] text-slate-900 antialiased">
      {/* Top bar */}
      <div className="mish-bg-top border-b border-[#5c2226] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 text-xs sm:px-6 sm:text-sm lg:px-8">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
            <a
              href="tel:+919100072758"
              className="flex min-w-0 max-w-full items-center gap-1.5 hover:text-[#f0e0a0] sm:shrink-0"
            >
              <Phone className="h-4 w-4 shrink-0" />
              <span className="truncate sm:whitespace-normal">+91 9100-072-758</span>
            </a>
            <a
              href="mailto:admin@mish.com"
              className="flex min-w-0 max-w-full items-center gap-1.5 hover:text-[#f0e0a0] sm:shrink-0"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate sm:whitespace-normal">admin@mish.com</span>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4">
            <span className="hidden text-white/80 sm:inline">{copy.topAdmissions}</span>
            <div
              className="flex items-center rounded-md border border-white/35 bg-black/15 p-0.5"
              role="group"
              aria-label={copy.langSwitcherAria}
            >
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
                  locale === "en" ? "bg-white/25 text-[#f5e6a8] shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {copy.langEnglish}
              </button>
              <button
                type="button"
                onClick={() => setLocale("hi")}
                aria-pressed={locale === "hi"}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
                  locale === "hi" ? "bg-white/25 text-[#f5e6a8] shadow-sm" : "text-white/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                {copy.langHindi}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <header className="sticky top-0 z-50 border-b-2 border-[#7c2d32]/20 bg-white shadow-sm">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:min-h-0 sm:px-6 sm:py-0 lg:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7c2d32] sm:h-10 sm:w-10">
              <GraduationCap className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
            <span className="truncate text-base font-bold text-[#5c2226] sm:text-lg md:text-xl">MISH</span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            <div className="group relative">
              <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
                {copy.navAbout} <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute left-0 top-full hidden min-w-[180px] rounded-md border border-slate-200 bg-white py-1 shadow-lg group-hover:block">
                <a
                  href="#about"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                >
                  {copy.navAboutSub}
                </a>
                <a
                  href="#principal"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                >
                  {copy.navPrincipal}
                </a>
                <a
                  href="#vision"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                >
                  {copy.navVision}
                </a>
              </div>
            </div>
            <div className="group relative">
              <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
                {copy.navAcademics} <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute left-0 top-full hidden min-w-[220px] rounded-md border border-slate-200 bg-white py-1 shadow-lg group-hover:block">
                <a
                  href="#programs"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                >
                  {copy.navCourses}
                </a>
                <a
                  href="#programs"
                  className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                >
                  {copy.navAdmissions}
                </a>
              </div>
            </div>
            <a href="#departments" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navDepartments}
            </a>
            <a href="#faculty" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navFaculty}
            </a>
            <a href="#campus" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navFacilities}
            </a>
            <a href="#events" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navEvents}
            </a>
            <a href="#gallery" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navGallery}
            </a>
            <a href="#contact" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#7c2d32]">
              {copy.navContact}
            </a>
            <Link
              href="/login"
              className="ml-2 inline-flex items-center rounded-lg bg-[#7c2d32] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5c2226]"
            >
              {copy.navPortalLogin}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg border-2 border-[#7c2d32] bg-white px-3 py-1.5 text-sm font-semibold text-[#7c2d32] transition hover:bg-[#fdf8f0] sm:inline-flex lg:hidden"
            >
              {copy.navPortalLogin}
            </Link>
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={copy.toggleMenu}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="max-h-[min(75vh,32rem)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4 lg:hidden">
            <div className="flex flex-col gap-0.5">
              <a
                href="#about"
                className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {copy.navAboutSub}
              </a>
              <a href="#principal" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navPrincipal}
              </a>
              <a href="#programs" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navAcademics}
              </a>
              <a href="#departments" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navDepartments}
              </a>
              <a href="#faculty" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navFaculty}
              </a>
              <a href="#campus" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navFacilities}
              </a>
              <a href="#events" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navEvents}
              </a>
              <a href="#gallery" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navGallery}
              </a>
              <a href="#contact" className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {copy.navContact}
              </a>
              <Link
                href="/login"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-[#7c2d32] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#5c2226]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {copy.navPortalLogin}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden border-b-2 border-[#7c2d32]/30 bg-gradient-to-b from-[#fdf8f0] to-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%237c2d32%27 fill-opacity=%270.05%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="relative mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center">
            <div className="min-w-0">
              <div className="mb-5 flex flex-col gap-2 text-[#7c2d32] sm:mb-6 sm:flex-row sm:items-center sm:gap-3">
                <Quote className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
                <p className="landing-serif min-w-0 text-lg font-semibold leading-snug text-[#5c2226] sm:text-xl md:text-2xl">
                  {copy.heroQuotes[quoteIndex].text}
                </p>
              </div>
              <h1 className="landing-serif text-2xl font-bold tracking-tight text-[#5c2226] sm:text-4xl lg:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:mt-4 sm:text-lg">
                {copy.heroLead}
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:flex-wrap">
                <a
                  href="#programs"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#7c2d32] px-5 py-2.5 font-semibold text-white shadow hover:bg-[#5c2226] sm:w-auto"
                >
                  {copy.heroExplore} <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-[#7c2d32] bg-white px-5 py-2.5 font-semibold text-[#7c2d32] hover:bg-[#fdf8f0] sm:w-auto"
                >
                  {copy.heroContact}
                </a>
              </div>
            </div>
            <div className="relative mt-4 min-w-0 sm:mt-6 lg:mt-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-xl ring-1 ring-slate-200/50 sm:rounded-xl">
                <Image
                  src={GALLERY[heroImgIndex] ?? BUILDING}
                  alt={copy.heroCampusAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {GALLERY.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setHeroImgIndex(idx)}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                      idx === heroImgIndex ? "ring-[#7c2d32]" : "ring-transparent hover:ring-slate-300"
                    }`}
                    aria-label={`${copy.showPhoto} ${idx + 1}`}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-3 sm:gap-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div>
            <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
              {copy.aboutHeading}
            </h2>
            <p className="mt-6 text-slate-600 leading-relaxed">
              {copy.aboutP1}
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              {copy.aboutP2}
            </p>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-200/50">
              <Image
                src={BUILDING}
                alt={copy.buildingAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Principal — brief profile */}
      <section id="principal" className="border-b border-slate-200/60 bg-[#fdf8f0] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start lg:gap-10 lg:p-10">
              <div className="flex justify-center lg:justify-start">
                <div className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-md ring-4 ring-[#fdf8f0] sm:w-40 lg:w-44">
                  <Image
                    src={PRINCIPAL_PHOTO}
                    alt={copy.principalPhotoAlt}
                    fill
                    className="object-cover object-[center_15%]"
                    sizes="(max-width: 640px) 144px, (max-width: 1024px) 160px, 176px"
                    priority
                  />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7c2d32]">{copy.principalLead}</p>
                <h2 className="landing-serif mt-1 text-2xl font-bold text-[#5c2226] sm:text-3xl">{copy.principalHeading}</h2>
                <p className="mt-3 text-lg font-semibold text-slate-900">{copy.principalName}</p>
                <p className="text-sm font-medium text-[#7c2d32]">{copy.principalRole}</p>
                <div className="mt-6 max-h-[min(70vh,42rem)] space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  {copy.principalProfileParagraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section id="vision" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
              <div className="relative h-40 w-full sm:h-52">
                <Image
                  src={VISION_PHOTOS[0]}
                  alt="Students in a lecture at MISH"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="p-5 sm:p-7">
                <h3 className="landing-serif text-xl font-bold text-[#5c2226] sm:text-2xl">{copy.visionTitle}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  {copy.visionBody}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
              <div className="relative h-40 w-full sm:h-52">
                <Image
                  src={VISION_PHOTOS[1]}
                  alt="Students attending a seminar at MISH"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="p-5 sm:p-7">
                <h3 className="landing-serif text-xl font-bold text-[#5c2226] sm:text-2xl">{copy.missionTitle}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  {copy.missionBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20" aria-labelledby="programs-heading">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div>
            <h2 id="programs-heading" className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
              {copy.programsHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              {copy.programsLead}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {[
              {
                title: "BASLP",
                subtitle: copy.progBaslpSub,
                icon: GraduationCap,
                photo: PROGRAM_PHOTOS[0],
              },
              {
                title: "PGDEI",
                subtitle: copy.progPgdeiSub,
                icon: BookOpen,
                photo: PROGRAM_PHOTOS[1],
              },
              {
                title: "M.Sc. Audiology",
                subtitle: copy.progMscSub,
                icon: Building2,
                photo: PROGRAM_PHOTOS[2],
              },
            ].map((p) => (
              <div key={p.title} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <button
                  type="button"
                  onClick={() => setLightbox(GALLERY.indexOf(p.photo))}
                  className="relative block h-40 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c2d32] focus-visible:ring-offset-2"
                  aria-label={`Open photo for ${p.title}`}
                >
                  <Image
                    src={p.photo}
                    alt=""
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <span className="sr-only">{copy.openGallery}</span>
                </button>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf8f0] text-[#7c2d32] ring-1 ring-[#7c2d32]/20">
                      <p.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[#5c2226]">{p.title}</div>
                      <div className="text-sm text-slate-500">{p.subtitle}</div>
                    </div>
                  </div>
                  <a
                    href="#contact"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#7c2d32] hover:text-[#5c2226]"
                  >
                    {copy.applyEnquire} <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="border-b border-slate-200/60 bg-[#fdf8f0] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
            {copy.deptHeading}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">{copy.deptLead}</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[copy.dept1, copy.dept2, copy.dept3, copy.dept4].map((name, i) => (
              <div key={name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setLightbox(GALLERY.indexOf(DEPT_PHOTOS[i]!))}
                  className="relative block h-36 w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c2d32] focus-visible:ring-offset-2"
                  aria-label={`Open photo for ${name}`}
                >
                  <Image
                    src={DEPT_PHOTOS[i]!}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </button>
                <div className="p-5">
                  <div className="text-base font-semibold text-[#5c2226]">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core faculty */}
      <section id="faculty" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
            {copy.facultyHeading}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{copy.facultyLead}</p>

          <div
            className="relative mt-8 w-full min-w-0"
            role="region"
            aria-roledescription="carousel"
            aria-label={copy.facultyCarouselAria}
          >
            <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100/90 px-1 py-6 shadow-inner sm:px-3 sm:py-8">
              <div
                className="flex w-full min-w-0 transition-transform duration-500 ease-out will-change-transform"
                style={{ transform: `translateX(-${facultyPage * 100}%)` }}
              >
                {facultyPages.map((page, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="w-full shrink-0 basis-full px-1 sm:px-2"
                    aria-hidden={pageIndex !== facultyPage}
                    role="group"
                    aria-label={`${copy.facultyPageOf} ${pageIndex + 1} / ${facultyPageCount}`}
                  >
                    <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-stretch gap-3 sm:grid-cols-3 sm:gap-2 md:gap-3 lg:gap-4">
                      {page.map((member) => {
                        const dash = copy.facultyEmpty;
                        const show = (v: string) => (v.trim() ? v : dash);
                        return (
                          <article
                            key={member.name}
                            className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.06)]"
                          >
                            <div className="flex gap-2.5 border-b border-slate-100 bg-slate-50/80 p-2.5 sm:gap-3 sm:p-3">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#8a343c] to-[#5c2226] text-xs font-bold text-white shadow-sm sm:h-12 sm:w-12 sm:text-sm"
                                aria-hidden
                              >
                                <span className="select-none">{facultyInitials(member.name)}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="landing-serif text-sm font-bold leading-snug text-slate-900">{member.name}</h3>
                                <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#7c2d32] sm:text-xs">
                                  {member.designation}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                                  <span className="font-semibold text-slate-500">{copy.facultyLabelDepartment}:</span>{" "}
                                  {member.department}
                                </p>
                              </div>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5 text-[11px] leading-snug text-slate-700 sm:gap-2 sm:p-3 sm:text-xs">
                              <div>
                                <div className="font-semibold text-slate-600">{copy.facultyLabelAcademic}</div>
                                <p className="mt-0.5 line-clamp-3 text-slate-700">{show(member.academicQualification)}</p>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-600">{copy.facultyLabelRehab}</div>
                                <p className="mt-0.5 line-clamp-2 text-slate-700">{show(member.rehabilitationQualification)}</p>
                              </div>
                              <dl className="mt-auto grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-100 pt-2">
                                <div>
                                  <dt className="font-semibold text-slate-500">{copy.facultyLabelExperience}</dt>
                                  <dd className="tabular-nums text-slate-800">{show(member.experience)}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-slate-500">{copy.facultyLabelRci}</dt>
                                  <dd className="tabular-nums text-slate-800">{show(member.rciRegNo)}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-slate-500">{copy.facultyLabelValid}</dt>
                                  <dd className="tabular-nums text-slate-800">{show(member.validTill)}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-slate-500">{copy.facultyLabelJoined}</dt>
                                  <dd className="tabular-nums text-slate-800">{show(member.dateOfJoining)}</dd>
                                </div>
                              </dl>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {facultyPageCount > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => setFacultyPage((p) => (p - 1 + facultyPageCount) % facultyPageCount)}
                  className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:left-2 sm:p-2.5"
                  aria-label={copy.facultyPrev}
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setFacultyPage((p) => (p + 1) % facultyPageCount)}
                  className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:right-2 sm:p-2.5"
                  aria-label={copy.facultyNext}
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label={copy.facultyDotsAria}>
                  {facultyPages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === facultyPage}
                      aria-label={`${copy.facultyPageOf} ${i + 1} / ${facultyPageCount}`}
                      onClick={() => setFacultyPage(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === facultyPage ? "w-8 bg-[#7c2d32]" : "w-2 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-sm text-slate-500 tabular-nums" aria-live="polite">
                  {facultyPage + 1} / {facultyPageCount}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section id="campus" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="min-w-0">
              <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
                {copy.facilitiesHeading}
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                {copy.facilitiesLead}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[copy.facAuditorium, copy.facCafeteria, copy.facSports, copy.facLibrary].map((f) => (
                  <div key={f} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="font-semibold text-[#5c2226]">{f}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4">
              {FACILITY_PHOTOS.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightbox(GALLERY.indexOf(src))}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-md ring-1 ring-slate-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c2d32] focus-visible:ring-offset-2 sm:rounded-xl"
                  aria-label={`${copy.openFacilitiesPhoto} ${idx + 1}`}
                >
                  <Image
                    src={src}
                    alt={copy.facilitiesImgAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Campus highlights + Latest news: title row, then equal-height cards */}
      <section id="events" className="border-b border-slate-200/60 bg-[#fdf8f0] py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <header className="min-w-0 lg:max-w-[58%] lg:flex-1">
              <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
                {copy.eventsHeading}
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{copy.eventsLead}</p>
            </header>
            <header className="min-w-0 border-t border-slate-200/80 pt-5 sm:pt-6 lg:w-[38%] lg:max-w-md lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <h3 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
                {copy.latestNewsHeading}
              </h3>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">{copy.latestNewsHint}</p>
            </header>
          </div>

          <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-stretch lg:gap-6">
            <div
              className="flex min-h-0 w-full min-w-0 flex-col"
              role="region"
              aria-roledescription="carousel"
              aria-label={copy.highlightsRegionAria}
            >
              <div
                className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${EVENT_CARD_HEIGHT}`}
              >
                <div className="relative min-h-0 w-full flex-1 overflow-hidden">
                  <div
                    className="flex h-full w-full transition-transform duration-500 ease-out will-change-transform"
                    style={{ transform: `translateX(-${highlightsSlide * 100}%)` }}
                  >
                    {eventSlides.map((item) => (
                      <div key={item.title} className="h-full min-w-full w-full shrink-0">
                        <button
                          type="button"
                          onClick={() => setLightbox(GALLERY.indexOf(item.src))}
                          className="group flex h-full w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7c2d32]"
                        >
                          <div className="relative h-[min(13rem,42%)] min-h-[11rem] w-full shrink-0 sm:h-[min(14rem,44%)] sm:min-h-[12rem]">
                            <Image
                              src={item.src}
                              alt=""
                              fill
                              className="object-cover transition duration-300 group-hover:scale-[1.02]"
                              sizes="(max-width: 1024px) 100vw, 60vw"
                            />
                            <div className="absolute left-3 top-3 rounded-full bg-[#7c2d32]/90 px-3 py-1 text-xs font-semibold text-white">
                              {copy.campusPill}
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-3 sm:px-5 sm:py-4">
                            <div className="text-base font-semibold text-[#5c2226] sm:text-lg">{item.title}</div>
                            <div className="mt-1.5 line-clamp-3 text-sm text-slate-600">{item.caption}</div>
                            <div className="mt-2 text-xs font-semibold text-[#7c2d32]">{copy.tapEnlarge}</div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-[min(13rem,42%)] min-h-[11rem] sm:h-[min(14rem,44%)] sm:min-h-[12rem]">
                    <button
                      type="button"
                      onClick={() =>
                        setHighlightsSlide((i) => (i - 1 + highlightCount) % highlightCount)
                      }
                      className="pointer-events-auto absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2.5 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:left-3"
                      aria-label={copy.prevHighlight}
                    >
                      <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHighlightsSlide((i) => (i + 1) % highlightCount)}
                      className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2.5 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:right-3"
                      aria-label={copy.nextHighlight}
                    >
                      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                  </div>
                </div>
                <div
                  className="flex shrink-0 flex-wrap justify-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5"
                  role="tablist"
                  aria-label={copy.highlightDotsAria}
                >
                  {eventSlides.map((item, i) => (
                    <button
                      key={item.title}
                      type="button"
                      role="tab"
                      aria-selected={i === highlightsSlide}
                      aria-label={`${copy.highlightOf} ${i + 1} / ${highlightCount}`}
                      onClick={() => setHighlightsSlide(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === highlightsSlide ? "w-8 bg-[#7c2d32]" : "w-2 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside
              className="flex min-h-0 w-full min-w-0 flex-col"
              aria-label={copy.latestNewsAsideAria}
            >
              <div
                className={`relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm ${EVENT_CARD_HEIGHT}`}
              >
                <div
                  className="mish-news-ticker relative min-h-0 flex-1 overflow-hidden"
                  style={
                    {
                      "--mish-ticker-duration": `${Math.max(24, latestNews.length * 9)}s`,
                    } as CSSProperties
                  }
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-white to-transparent"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-white to-transparent"
                    aria-hidden
                  />
                  <div className="mish-news-ticker-track">
                    {[...latestNews, ...latestNews].map((n, i) => (
                      <button
                        key={`${n.title}-${i}`}
                        type="button"
                        onClick={() => setNewsModal(n)}
                        className="block w-full border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-[#fdf8f0] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7c2d32]"
                      >
                        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{n.date}</span>
                        <span className="mt-1 block text-sm font-semibold leading-snug text-[#5c2226]">{n.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Full gallery — every provided photo */}
      <section id="gallery" className="border-b border-slate-200/60 bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
            {copy.galleryHeading}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            {copy.galleryLead}
          </p>
          <div
            className="relative mx-auto mt-10 max-w-5xl"
            role="region"
            aria-roledescription="carousel"
            aria-label={copy.galleryCarouselAria}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-md ring-1 ring-slate-200/60">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${gallerySlide * 100}%)` }}
              >
                {GALLERY.map((src, idx) => (
                  <div key={src} className="min-w-full shrink-0">
                    <button
                      type="button"
                      onClick={() => setLightbox(idx)}
                      className="relative block aspect-[16/10] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7c2d32] sm:aspect-[21/9]"
                      aria-label={`${copy.openCampusPhoto} ${idx + 1} / ${GALLERY.length}`}
                    >
                      <Image
                        src={src}
                        alt={`${copy.mishCampusPhotoN} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 896px"
                        priority={idx === 0}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGallerySlide((i) => (i - 1 + GALLERY.length) % GALLERY.length)}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2.5 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:left-4 sm:p-3"
              aria-label={copy.prevPhoto}
            >
              <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
            <button
              type="button"
              onClick={() => setGallerySlide((i) => (i + 1) % GALLERY.length)}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2.5 text-[#5c2226] shadow-md ring-1 ring-slate-200/80 hover:bg-white sm:right-4 sm:p-3"
              aria-label={copy.nextPhoto}
            >
              <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <p className="text-sm font-medium text-slate-600" aria-live="polite">
                {gallerySlide + 1} / {GALLERY.length}
              </p>
              <div className="flex max-w-full gap-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {GALLERY.map((src, idx) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setGallerySlide(idx)}
                    aria-label={`${copy.goToPhoto} ${idx + 1}`}
                    aria-current={idx === gallerySlide}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition sm:h-14 sm:w-20 ${
                      idx === gallerySlide ? "ring-[#7c2d32]" : "ring-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-[#fdf8f0] p-4 shadow-sm sm:rounded-3xl sm:p-8">
            <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
              <div className="min-w-0">
                <h2 className="landing-serif mish-heading-underline text-2xl font-bold text-[#5c2226] sm:text-4xl">
                  {copy.contactHeading}
                </h2>
                <p className="mt-3 text-slate-600">
                  {copy.contactLead}
                </p>
                <div className="mt-5 space-y-3">
                  <a href="tel:+919100072758" className="flex items-center gap-3 text-slate-700 hover:text-[#7c2d32]">
                    <Phone className="h-5 w-5 text-[#7c2d32]" />
                    +91 9100-072-758
                  </a>
                  <a href="mailto:admin@mish.com" className="flex items-center gap-3 text-slate-700 hover:text-[#7c2d32]">
                    <Mail className="h-5 w-5 text-[#7c2d32]" />
                    admin@mish.com
                  </a>
                </div>
                <div className="mt-8">
                  <p className="text-sm font-semibold text-[#5c2226]">{copy.contactFollowUs}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#5c2226] shadow-sm transition hover:border-[#7c2d32]/40 hover:bg-[#fdf8f0] hover:text-[#7c2d32]"
                        aria-label={label}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0 max-w-md rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:p-5 lg:justify-self-end">
                <h3 className="text-base font-bold text-[#5c2226]">{copy.sendMessageHeading}</h3>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                  {copy.sendMessageLead}
                </p>
                <form className="mt-4 space-y-3" onSubmit={handleContactSubmit} noValidate>
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-slate-700 sm:text-sm">
                      {copy.labelName} <span className="text-[#7c2d32]">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={contact.name}
                      onChange={(ev) => setContact((c) => ({ ...c, name: ev.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#7c2d32] transition focus:border-[#7c2d32] focus:ring-2"
                      placeholder={copy.phName}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-slate-700 sm:text-sm">
                      {copy.labelEmail} <span className="text-[#7c2d32]">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={contact.email}
                      onChange={(ev) => setContact((c) => ({ ...c, email: ev.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#7c2d32] transition focus:border-[#7c2d32] focus:ring-2"
                      placeholder={copy.phEmail}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-medium text-slate-700 sm:text-sm">
                      {copy.labelPhone} <span className="text-slate-400">{copy.optional}</span>
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={contact.phone}
                      onChange={(ev) => setContact((c) => ({ ...c, phone: ev.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#7c2d32] transition focus:border-[#7c2d32] focus:ring-2"
                      placeholder={copy.phPhone}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-medium text-slate-700 sm:text-sm">
                      {copy.labelMessage} <span className="text-[#7c2d32]">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={3}
                      value={contact.message}
                      onChange={(ev) => setContact((c) => ({ ...c, message: ev.target.value }))}
                      className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none ring-[#7c2d32] transition focus:border-[#7c2d32] focus:ring-2"
                      placeholder={copy.phMessage}
                    />
                  </div>
                  {contactNotice && (
                    <p
                      className={`text-xs sm:text-sm ${contactNotice.kind === "error" ? "text-amber-800" : "text-emerald-800"}`}
                      role="status"
                    >
                      {contactNotice.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c2d32] px-3 py-2 text-sm font-semibold text-white shadow hover:bg-[#5c2226] sm:w-auto"
                  >
                    {copy.btnSend} <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
                <p className="min-w-0 flex-1 leading-relaxed">
                  <span className="font-semibold text-[#5c2226]">{copy.footerAboutLabel}</span>{" "}
                  {copy.footerAboutBody}
                </p>
                <p className="shrink-0 tabular-nums text-slate-600" aria-live="polite">
                  <span className="font-semibold text-[#5c2226]">{copy.footerVisitors}</span>
                  {": "}
                  {visitorCountDisplay === "loading" ? (
                    <span className="text-slate-400">{copy.footerVisitorsLoading}</span>
                  ) : visitorCountDisplay === "unavailable" ? (
                    <span className="text-slate-400">{copy.footerVisitorsUnavailable}</span>
                  ) : (
                    <span className="text-slate-800">
                      {visitorCountDisplay.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN")}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={copy.photoPreview}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[102] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-3 sm:top-3"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label={copy.closePreview}
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="absolute left-1 top-1/2 z-[102] inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:left-3"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? i : (i - 1 + GALLERY.length) % GALLERY.length));
            }}
            aria-label={copy.prevPhoto}
          >
            <ChevronLeft className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 z-[102] inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-2 text-white hover:bg-white/25 sm:right-3"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((i) => (i === null ? i : (i + 1) % GALLERY.length));
            }}
            aria-label={copy.nextPhoto}
          >
            <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" />
          </button>
          <div
            className="relative h-[min(72vh,560px)] w-full max-w-5xl sm:h-[min(85vh,920px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={GALLERY[lightbox]!}
              alt={`${copy.mishCampusPhotoN} ${lightbox + 1} / ${GALLERY.length}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}

      {newsModal !== null && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="news-modal-title"
          onClick={() => setNewsModal(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
              onClick={() => setNewsModal(null)}
              aria-label={copy.closeDialog}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative aspect-[16/10] w-full shrink-0 border-b border-slate-100">
              <Image
                src={GALLERY[newsModal.imageIndex]!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 512px) 100vw, 512px"
                priority
              />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm text-slate-500">{newsModal.date}</p>
              <h3 id="news-modal-title" className="landing-serif mt-1 text-xl font-bold text-[#5c2226]">
                {newsModal.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{newsModal.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
