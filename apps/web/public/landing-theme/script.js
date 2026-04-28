// ========== VISITORS COUNTER ==========
(function () {
  const KEY = 'mish_visitors';
  const SESSION_KEY = 'mish_session';

  let count = parseInt(localStorage.getItem(KEY) || '48231', 10);
  if (!sessionStorage.getItem(SESSION_KEY)) {
    count += 1;
    localStorage.setItem(KEY, count);
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function fmt(n) { return n.toLocaleString('en-IN'); }

  function animateVisitors(el, target) {
    const start = Math.max(target - 120, 0);
    let current = start;
    const step = Math.ceil((target - start) / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = fmt(current);
      if (current >= target) clearInterval(timer);
    }, 20);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('visitorsCount');
    if (el) animateVisitors(el, count);
  });
})();

// ========== LANGUAGES: English (international) | Hindi (national) | Geo regional (state / browser) ==========
const STORAGE_LANG_CHOICE = 'mish_lang_choice';
const STORAGE_GEO_META = 'mish_geo_meta';

let currentLangMode = 'en';
let mishLocalCode = 'en';
let regionalPacks = null;

function labelsForBcp47(code) {
  let labelNative = code;
  let labelEn = code;
  try {
    labelEn = new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
    labelNative = new Intl.DisplayNames([code], { type: 'language' }).of(code) || labelEn;
  } catch (_) { /* keep */ }
  return { code, labelNative, labelEn };
}

function inferLocalFromCountryRegion(country, regionCode) {
  const cc = (country || '').toUpperCase();
  const rc = (regionCode || '').toUpperCase();
  if (cc === 'IN') {
    const map = {
      AP: 'te', TG: 'te', TS: 'te', TN: 'ta', KA: 'kn', MH: 'mr', WB: 'bn', GJ: 'gu', KL: 'ml',
      PY: 'ta', GA: 'mr', RJ: 'hi', UP: 'hi', MP: 'hi', DL: 'hi', HR: 'hi', PB: 'pa', JK: 'ur',
    };
    let code = map[rc] || 'te';
    if (code === 'hi') code = 'te';
    return { ...labelsForBcp47(code), country: cc, region: rc };
  }
  if (cc === 'BD') return { ...labelsForBcp47('bn'), country: cc, region: rc };
  if (cc === 'LK') return { ...labelsForBcp47('ta'), country: cc, region: rc };
  if (cc === 'NP') return { ...labelsForBcp47('ne'), country: cc, region: rc };
  if (cc === 'PK') return { ...labelsForBcp47('ur'), country: cc, region: rc };
  return { ...labelsForBcp47('en'), country: cc || '', region: rc };
}

function inferLocalFromNavigator() {
  const primary = (navigator.language || 'en').toLowerCase();
  const lang = primary.split('-')[0];
  const supported = { te: 'te', ta: 'ta', kn: 'kn', mr: 'mr', bn: 'bn', gu: 'gu', ml: 'ml', ur: 'ur', pa: 'pa', hi: 'te' };
  const code = supported[lang] || 'en';
  return { ...labelsForBcp47(code), country: '', region: '' };
}

async function detectGeoLanguageMeta() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6500);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('geo');
    const j = await res.json();
    return inferLocalFromCountryRegion(j.country_code, j.region_code);
  } catch (_) {
    return inferLocalFromNavigator();
  }
}

async function loadRegionalPacks() {
  if (regionalPacks) return regionalPacks;
  try {
    const url = new URL('locales/regional.json', window.location.href);
    url.searchParams.set('v', '4');
    const r = await fetch(url.toString(), { cache: 'no-cache' });
    regionalPacks = r.ok ? await r.json() : {};
  } catch (_) {
    regionalPacks = {};
  }
  if (!regionalPacks.te) regionalPacks.te = {};
  return regionalPacks;
}

function normalizeI18nKey(s) {
  if (!s) return s;
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014\u2012\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'");
}

function regionalLookup(enText) {
  if (!enText || currentLangMode !== 'local') return null;
  const code = (mishLocalCode || 'en').toLowerCase().replace(/[^a-z]/g, '') || 'en';
  const pack = regionalPacks && regionalPacks[code];
  if (!pack) return null;
  const keysToTry = [];
  const raw = enText.trim();
  keysToTry.push(raw, normalizeI18nKey(raw));
  if (raw.includes('&')) keysToTry.push(raw.replace(/&/g, '&amp;'));
  const seen = new Set();
  for (const k of keysToTry) {
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const hit = pack[k];
    if (hit != null && hit !== '') return hit;
  }
  const norm = normalizeI18nKey(raw);
  for (const pk of Object.keys(pack)) {
    if (normalizeI18nKey(pk) === norm) {
      const hit = pack[pk];
      if (hit != null && hit !== '') return hit;
    }
  }
  return null;
}

function textForElement(el) {
  const en = el.getAttribute('data-en');
  if (currentLangMode === 'en') return en;
  if (currentLangMode === 'hi') return el.getAttribute('data-hi') || en;
  const code = (mishLocalCode || 'en').toLowerCase().replace(/[^a-z]/g, '');
  if (!code || code === 'en') return regionalLookup(en) || en;
  const fromAttr = el.getAttribute('data-' + code);
  return fromAttr || regionalLookup(en) || en;
}

function applyLanguage() {
  document.querySelectorAll('[data-en]:not([data-skip-lang-apply])').forEach((el) => {
    const val = textForElement(el);
    if (val == null || val === '') return;
    const tag = el.tagName;
    if (tag === 'OPTION' || tag === 'TITLE' || tag === 'STYLE' || tag === 'SCRIPT') {
      el.textContent = val;
      return;
    }
    if (tag === 'IMG') {
      el.alt = val;
      return;
    }
    const chevron = tag === 'A' && el.querySelector('i.fa-chevron-down');
    if (chevron) {
      el.replaceChildren(document.createTextNode(val + ' '), chevron);
      return;
    }
    el.textContent = val;
  });
  document.querySelectorAll('[data-en-placeholder]:not([data-skip-lang-apply])').forEach((el) => {
    let ph;
    if (currentLangMode === 'en') ph = el.getAttribute('data-en-placeholder');
    else if (currentLangMode === 'hi') ph = el.getAttribute('data-hi-placeholder') || el.getAttribute('data-en-placeholder');
    else {
      const code = (mishLocalCode || 'en').toLowerCase().replace(/[^a-z]/g, '');
      ph = (code && el.getAttribute('data-' + code + '-placeholder'))
        || el.getAttribute('data-en-placeholder');
    }
    if (ph != null) el.placeholder = ph;
  });
  const code = currentLangMode === 'local' ? mishLocalCode : currentLangMode === 'hi' ? 'hi' : 'en';
  document.documentElement.lang = code === 'en' ? 'en' : code;

  const hint = document.getElementById('langPickerHint');
  if (hint) {
    const enH = hint.getAttribute('data-en') || '';
    const hiH = hint.getAttribute('data-hi') || enH;
    if (currentLangMode === 'en') {
      hint.textContent = enH;
    } else if (currentLangMode === 'hi') {
      hint.textContent = hiH;
    } else {
      const geo = typeof window !== 'undefined' ? window.__mishGeoMeta : null;
      const nat = geo && geo.labelNative ? geo.labelNative : String(mishLocalCode || 'en').toUpperCase();
      const eng = geo && geo.labelEn ? geo.labelEn : String(mishLocalCode || '');
      hint.textContent =
        'Regional: ' +
        nat +
        (eng && eng !== nat ? ' (' + eng + ')' : '') +
        ' — page text uses local language where translations exist; switch above for full English or Hindi.';
    }
  }
}

function readStoredGeoMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_GEO_META);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.code) return o;
  } catch (_) { /* ignore */ }
  return null;
}

function writeStoredGeoMeta(meta) {
  try {
    localStorage.setItem(STORAGE_GEO_META, JSON.stringify(meta));
  } catch (_) { /* ignore */ }
}

function updateLocalLanguageOption(meta) {
  const opt = document.getElementById('langSelectLocalOpt');
  if (!opt) return;
  const code = (meta.code || 'en').toLowerCase();
  if (code === 'en') {
    opt.textContent = 'Regional — English (your area)';
    return;
  }
  const native = meta.labelNative || meta.code;
  const en = meta.labelEn || meta.code;
  opt.textContent = native + ' (' + en + ') — regional / local';
}

async function initMishLanguages() {
  const sel = document.getElementById('langSelect');
  if (!sel) return;

  await loadRegionalPacks();

  let meta = readStoredGeoMeta();
  if (!meta) {
    meta = await detectGeoLanguageMeta();
    writeStoredGeoMeta(meta);
  }
  window.__mishGeoMeta = meta;
  mishLocalCode = meta.code || 'en';
  if (regionalPacks && mishLocalCode !== 'en' && !Object.prototype.hasOwnProperty.call(regionalPacks, mishLocalCode)) {
    mishLocalCode = 'te';
    meta = { ...meta, ...labelsForBcp47('te'), country: meta.country, region: meta.region };
    window.__mishGeoMeta = meta;
  }

  updateLocalLanguageOption(meta);

  try {
    const saved = localStorage.getItem(STORAGE_LANG_CHOICE);
    if (saved === 'en' || saved === 'hi' || saved === 'local') {
      currentLangMode = saved;
      sel.value = saved;
    } else {
      currentLangMode = 'en';
      sel.value = 'en';
    }
  } catch (_) {
    currentLangMode = 'en';
    sel.value = 'en';
  }

  sel.addEventListener('change', () => {
    currentLangMode = sel.value;
    try {
      localStorage.setItem(STORAGE_LANG_CHOICE, currentLangMode);
    } catch (_) { /* ignore */ }
    applyLanguage();
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('open');
  });

  applyLanguage();
}

// ========== ZOOM ==========
let zoomLevel = 16;
function zoomIn()    { if (zoomLevel < 22) { zoomLevel++; document.documentElement.style.fontSize = zoomLevel + 'px'; } }
function zoomOut()   { if (zoomLevel > 12) { zoomLevel--; document.documentElement.style.fontSize = zoomLevel + 'px'; } }
function resetZoom() { zoomLevel = 16; document.documentElement.style.fontSize = '16px'; }

// ========== POPUP ==========
document.head.insertAdjacentHTML('beforeend', '<style>@keyframes fadeOut{to{opacity:0;pointer-events:none}}</style>');

function closePopup() {
  const popup = document.getElementById('placementPopup');
  popup.style.animation = 'fadeOut 0.3s ease forwards';
  setTimeout(() => { popup.style.display = 'none'; }, 300);
}
setTimeout(closePopup, 12000);

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('placementPopup').addEventListener('click', function (e) {
    if (e.target === this) closePopup();
  });
});

// ========== HERO SLIDER ==========
let currentSlide = 0;
const slides = document.querySelectorAll('.hero-slide');
const dots   = document.querySelectorAll('.dot');
let slideInterval = setInterval(() => showSlide(currentSlide + 1), 5000);

function showSlide(index) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}
function nextSlide() { showSlide(currentSlide + 1); resetSlideInterval(); }
function prevSlide() { showSlide(currentSlide - 1); resetSlideInterval(); }
function goToSlide(i){ showSlide(i); resetSlideInterval(); }
function resetSlideInterval() { clearInterval(slideInterval); slideInterval = setInterval(() => showSlide(currentSlide + 1), 5000); }

// ========== NEWS TABS ==========
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

// ========== FACULTY DEPARTMENT TABS ==========
function switchFacultyTab(id, btn) {
  document.querySelectorAll('.faculty-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.faculty-tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const panel = document.getElementById('faculty-tab-' + id);
  if (panel) {
    panel.classList.add('active');
    panel.querySelectorAll('.faculty-card').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
}

// ========== MOBILE MENU ==========
function toggleMobileMenu() { document.getElementById('mainNav').classList.toggle('open'); }

// ========== STAT COUNTER ==========
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
      entry.target.classList.add('animated');
      const target = parseInt(entry.target.getAttribute('data-target'));
      let current = 0;
      const step = target / (2000 / 16);
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          entry.target.textContent = target.toLocaleString() + '+';
          clearInterval(timer);
        } else {
          entry.target.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.count').forEach(c => counterObs.observe(c));

// ========== BACK TO TOP ==========
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 400);
  document.getElementById('mainHeader').style.boxShadow = window.scrollY > 10
    ? '0 4px 24px rgba(0,0,0,0.12)'
    : '0 2px 20px rgba(0,0,0,0.08)';
});
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ========== SCROLL REVEAL ==========
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.dept-card, .research-card, .contact-info-card, .campus-card, .topper-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  revealObs.observe(el);
});

// ========== SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('mainNav').classList.remove('open');
    }
  });
});

// ========== IMAGE LIGHTBOX ==========
function getBackgroundImageUrl(el) {
  const bg = getComputedStyle(el).backgroundImage || "";
  const match = bg.match(/url\((['"]?)(.*?)\1\)/);
  return match ? match[2] : "";
}

function openImageLightbox(src) {
  const lightbox = document.getElementById("imageLightbox");
  const image = document.getElementById("lightboxImage");
  if (!lightbox || !image || !src) return;
  image.src = src;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeImageLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  const image = document.getElementById("lightboxImage");
  if (!lightbox || !image) return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  image.src = "";
  document.body.style.overflow = "";
}

function getFacultyDetail(card) {
  const avatarEl = card.querySelector(".faculty-avatar");
  const name = card.querySelector("h4")?.textContent?.trim() || "Faculty Member";
  const title = card.querySelector(".faculty-title")?.textContent?.trim() || "";
  const exp = card.querySelector(".faculty-exp")?.textContent?.trim() || "";
  const pub = card.querySelector(".faculty-pub")?.textContent?.trim() || "";
  const tags = Array.from(card.querySelectorAll(".faculty-tags span")).map((el) => el.textContent.trim());
  const dept = card.getAttribute("data-dept") || "—";
  const qualification = card.getAttribute("data-qualification") || "—";
  const rehabQualification = card.getAttribute("data-rehab") || "—";
  const rci = card.getAttribute("data-rci") || "—";
  const valid = card.getAttribute("data-valid") || "—";
  const joining = card.getAttribute("data-joining") || "—";
  const initials = name.split(" ").map((x) => x[0]).join("").slice(0, 2);
  const avatarText = avatarEl?.textContent?.trim() || initials;
  const avatarBg = avatarEl ? getComputedStyle(avatarEl).background : "linear-gradient(135deg,#667eea,#764ba2)";
  return { name, title, exp, pub, tags, avatarText, avatarBg, dept, qualification, rehabQualification, rci, valid, joining };
}

function openFacultyModal(detail) {
  const modal = document.getElementById("facultyModal");
  const modalName = document.getElementById("facultyModalName");
  const modalTitle = document.getElementById("facultyModalTitle");
  const modalExp = document.getElementById("facultyModalExp");
  const modalTags = document.getElementById("facultyModalTags");
  const modalPub = document.getElementById("facultyModalPub");
  const modalBio = document.getElementById("facultyModalBio");
  const modalAvatar = document.getElementById("facultyModalAvatar");
  if (!modal || !modalName || !modalTitle || !modalExp || !modalTags || !modalPub || !modalBio || !modalAvatar) return;

  modalName.textContent = detail.name;
  modalTitle.textContent = detail.title;
  modalExp.textContent = detail.exp;
  modalPub.textContent = detail.pub;
  modalAvatar.textContent = detail.avatarText;
  modalAvatar.style.background = detail.avatarBg;

  modalTags.replaceChildren();
  detail.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    modalTags.appendChild(chip);
  });

  modalBio.textContent = `Department: ${detail.dept}
Academic qualification: ${detail.qualification}
Rehabilitation qualification: ${detail.rehabQualification}
Experience: ${detail.exp}
RCI Reg. No.: ${detail.rci}
Valid till: ${detail.valid}
Date of joining: ${detail.joining}`;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeFacultyModal() {
  const modal = document.getElementById("facultyModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

const FACULTY_CAROUSEL_GAP = 20;

function initFacultyCarousel() {
  const root = document.getElementById("facultyCarousel");
  const viewport = root?.querySelector(".faculty-carousel-viewport");
  const track = document.getElementById("facultyCarouselTrack");
  const prev = document.getElementById("facultyCarouselPrev");
  const next = document.getElementById("facultyCarouselNext");
  const dotsEl = document.getElementById("facultyCarouselDots");
  if (!root || !viewport || !track || !prev || !next || !dotsEl) return;

  let index = 0;
  let resizeTimer = null;

  function getCards() {
    return Array.from(track.querySelectorAll(".faculty-card"));
  }

  function getPerSlide() {
    const w = window.innerWidth;
    if (w < 600) return 1;
    if (w < 1024) return 2;
    return 3;
  }

  function layout() {
    const perSlide = getPerSlide();
    const vs = viewport.clientWidth;
    if (vs <= 0) return;
    const cardW = (vs - (perSlide - 1) * FACULTY_CAROUSEL_GAP) / perSlide;
    getCards().forEach((c) => {
      c.style.flexShrink = "0";
      c.style.flexBasis = `${cardW}px`;
      c.style.width = `${cardW}px`;
      c.style.maxWidth = `${cardW}px`;
    });
    const count = getCards().length;
    const maxIndex = Math.max(0, count - perSlide);
    index = Math.min(index, maxIndex);
    const stepPx = cardW + FACULTY_CAROUSEL_GAP;
    track.style.transform = `translateX(${-index * stepPx}px)`;
    prev.disabled = index <= 0;
    next.disabled = index >= maxIndex;
    dotsEl.replaceChildren();
    for (let i = 0; i <= maxIndex; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "faculty-carousel-dot" + (i === index ? " active" : "");
      b.setAttribute("aria-label", `Faculty slide ${i + 1} of ${maxIndex + 1}`);
      b.addEventListener("click", () => {
        index = i;
        layout();
      });
      dotsEl.appendChild(b);
    }
  }

  prev.addEventListener("click", () => {
    index = Math.max(0, index - 1);
    layout();
  });
  next.addEventListener("click", () => {
    const perSlide = getPerSlide();
    const maxIndex = Math.max(0, getCards().length - perSlide);
    index = Math.min(maxIndex, index + 1);
    layout();
  });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layout);
  } else {
    requestAnimationFrame(layout);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await initMishLanguages();

  const lightbox = document.getElementById("imageLightbox");
  const closeBtn = document.getElementById("lightboxClose");
  const facultyModal = document.getElementById("facultyModal");
  const facultyModalClose = document.getElementById("facultyModalClose");

  document.querySelectorAll(".campus-card").forEach((card) => {
    card.addEventListener("click", () => {
      const src = getBackgroundImageUrl(card);
      openImageLightbox(src);
    });
  });

  document.querySelectorAll(".faculty-card").forEach((card) => {
    card.addEventListener("click", () => {
      openFacultyModal(getFacultyDetail(card));
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeImageLightbox);
  }

  if (facultyModalClose) {
    facultyModalClose.addEventListener("click", closeFacultyModal);
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeImageLightbox();
    });
  }

  if (facultyModal) {
    facultyModal.addEventListener("click", (e) => {
      if (e.target === facultyModal) closeFacultyModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeImageLightbox();
    closeFacultyModal();
  });

  initFacultyCarousel();
});
