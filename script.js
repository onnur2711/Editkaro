//script.js (merged: Portfolio + About + Contact page)
// Safe: each part runs only when its DOM elements exist.

(function () {
  'use strict';

  // --- helpers ---
  const $ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const $one = (sel, ctx = document) => (ctx || document).querySelector(sel);

  /* =====================================================
     PORTFOLIO: filter chips, card animations, video modal
     ===================================================== */
  function initPortfolio() {
    const chips = Array.from(document.querySelectorAll('.chip'));
    const cards = Array.from(document.querySelectorAll('.card'));
    const modal = document.getElementById('modal');
    const video = document.getElementById('videoPlayer');
    const closeBtn = document.getElementById('closeBtn');

    if (!chips.length || !cards.length || !modal || !video) return;

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        if (chip.scrollIntoView) {
          chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        const filter = chip.dataset.filter;
        cards.forEach(card => {
          const cat = (card.dataset.category || '').toLowerCase();
          const normalizedFilter = (filter || '').toLowerCase();

          if (normalizedFilter === 'all' || cat === normalizedFilter) {
            card.style.display = '';
            try {
              card.animate(
                [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
                { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }
              );
            } catch (e) { }
          } else {
            card.style.display = 'none';
          }
        });
      });

      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chip.click();
        }
      });
    });

    let lastFocusedEl = null;

    function openPlayer(e) {
      const btn = this || e.currentTarget;
      const src = btn.dataset.video;
      if (!src) return;

      lastFocusedEl = btn;
      video.src = src;
      video.currentTime = 0;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      (closeBtn || modal).focus?.();
      video.play().catch(() => { });
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      video.pause();
      video.removeAttribute('src');
      try { video.load(); } catch (e) { }
      document.body.style.overflow = '';
      lastFocusedEl?.focus?.();
    }

    document.querySelectorAll('.play-overlay').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');

      el.addEventListener('click', openPlayer);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlayer.call(el, e);
        }
      });
    });

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    window.addEventListener('load', () => { document.querySelector('.chip.active')?.focus(); });
  }

  /* =====================================================
     ABOUT PAGE FEATURES
     ===================================================== */
  function initAbout() {
    if (!document.querySelector('.about-hero') && !document.querySelector('.team')) return;

    function parseStatString(str) {
      if (!str) return 0;
      str = str.trim().replace('%', '');
      let multiplier = 1;
      if (/k/i.test(str)) {
        multiplier = 1000;
        str = str.replace(/k/i, '');
      }
      str = str.replace(/[^\d.]/g, '');
      return Math.round(parseFloat(str || '0') * multiplier);
    }

    function animateNumber(el, target, duration = 900) {
      if (!el) return;
      const start = 0;
      const startTime = performance.now();
      const original = el.textContent;

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const current = Math.round(start + (target - start) * progress);

        if (original.includes('%')) el.textContent = current + '%';
        else if (original.match(/k/i)) el.textContent = (Math.round(current / 100) / 10) + 'k';
        else el.textContent = current.toLocaleString();

        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function initStats() {
      const statEls = $('.stat-num');
      statEls.forEach(el => {
        const target = parseStatString(el.textContent);
        const io = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateNumber(el, target, 1000);
              obs.disconnect();
            }
          });
        }, { threshold: 0.5 });
        io.observe(el);
      });
    }

    function initReveal() {
      const targets = ['.about-hero', '.values', '.team', '.process'];
      const nodes = targets.flatMap(sel => $(sel));

      nodes.forEach(n => {
        n.style.opacity = 0;
        n.style.transform = 'translateY(12px)';
        n.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.9,.3,1)';
      });

      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.style.opacity = 1;
            en.target.style.transform = 'translateY(0)';
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.15 });

      nodes.forEach(n => io.observe(n));
    }

    initReveal();
    initStats();
  }

  /* =====================================================
     CONTACT FORM — Formspree Integration (FINAL)
     ===================================================== */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const status = document.getElementById('contactStatus');
    const clearBtn = document.getElementById('contactClear');

    // ✅ YOUR FORMSPREE ENDPOINT
    const endpoint = "https://formspree.io/f/mkgdnvlo";

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.style.display = 'none';

      const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim()
      };

      if (!data.name || !data.email || !data.message) {
        status.textContent = 'Please fill name, email and message.';
        status.style.color = 'crimson';
        status.style.display = '';
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        });

        if (res.ok) {
          status.textContent = "Message sent successfully! We'll reply soon.";
          status.style.color = 'green';
          status.style.display = '';
          form.reset();
        } else {
          throw new Error('Failed');
        }
      } catch (err) {
        status.textContent = "Submit failed. Try again later.";
        status.style.color = 'crimson';
        status.style.display = '';
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    });

    clearBtn?.addEventListener('click', () => {
      form.reset();
      status.style.display = 'none';
    });
  }

  /* =====================================================
     Boot
     ===================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initAbout();
    initContactForm();
  });
})();