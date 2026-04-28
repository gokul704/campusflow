// ========== VISITORS COUNTER ==========
(function () {
  const KEY = 'nits_visitors';
  const SESSION_KEY = 'nits_session';

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

// ========== LANGUAGE TOGGLE ==========
let currentLang = 'en';

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  document.getElementById('langLabel').textContent = currentLang === 'en' ? 'हिंदी' : 'English';
  applyLanguage();
}

function applyLanguage() {
  document.querySelectorAll('[data-en][data-hi]').forEach(el => {
    const val = el.getAttribute('data-' + currentLang);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-en-placeholder]').forEach(el => {
    el.placeholder = currentLang === 'en'
      ? el.getAttribute('data-en-placeholder')
      : el.getAttribute('data-hi-placeholder');
  });
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
