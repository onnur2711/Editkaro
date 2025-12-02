// script.js — defensive + debug version (replace your current script.js with this)
(function () {
  'use strict';

  const $ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const $one = (sel, ctx = document) => (ctx || document).querySelector(sel);

  function initPortfolio() {
    const chips = Array.from(document.querySelectorAll('.chip'));
    const cards = Array.from(document.querySelectorAll('.card'));
    const modal = document.getElementById('modal');
    const video = document.getElementById('videoPlayer');
    const closeBtn = document.getElementById('closeBtn');

    // If essential DOM missing, just exit silently (safety)
    if (!modal || !video) {
      console.warn('Portfolio init: modal or video missing', { modal, video });
      return;
    }

    // Filters (unchanged logic)
    if (chips.length && cards.length) {
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          chip.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });

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
    }

    // Modal & video behavior
    let lastFocusedEl = null;
    modal.setAttribute('tabindex', '-1');

    function openPlayer(e) {
      const btn = this || e.currentTarget;
      const src = btn.dataset?.video;
      if (!src) {
        console.warn('openPlayer: no data-video on clicked element', btn);
        return;
      }

      lastFocusedEl = btn;
      // Defensive reset
      try { video.pause(); } catch (e) { }
      try { video.src = ''; video.load(); } catch (e) { }

      video.src = src;
      video.currentTime = 0;

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // focus close button or modal for accessibility
      (closeBtn || modal).focus?.();

      video.play().catch(() => { /* autoplay blocked or other */ });
      console.info('openPlayer: opened modal for', src);
    }

    function closeModal() {
      if (!modal.classList.contains('open')) {
        console.info('closeModal: modal already closed');
        return;
      }
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');

      try { video.pause(); } catch (e) { }
      try { video.src = ''; video.load(); } catch (e) { }

      document.body.style.overflow = '';
      try { lastFocusedEl?.focus?.(); } catch (e) { }

      console.info('closeModal: modal closed and video reset');
    }

    // Attach to play overlays
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

    // Primary close button listeners (direct)
    if (closeBtn) {
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        console.info('closeBtn.click fired (direct listener)');
        closeModal();
      });
      // pointerdown to catch some touch devices earlier
      closeBtn.addEventListener('pointerdown', (ev) => {
        // don't prevent focus behavior — just log & prepare to close
        console.info('closeBtn.pointerdown fired');
      });
    } else {
      console.warn('initPortfolio: closeBtn not found (id="closeBtn")');
    }

    // Delegated fallback: any click anywhere that hits .close or [data-close] will close the modal
    document.addEventListener('click', function delegatedClose(e) {
      // If click is on backdrop (modal), close
      if (e.target === modal) {
        console.info('delegatedClose: clicked modal backdrop');
        closeModal();
        return;
      }
      // If click is inside something with .close or [data-close] attribute (covers inner SVG/text)
      const hit = e.target.closest && e.target.closest('.close, [data-close]');
      if (hit && modal.contains(hit)) {
        console.info('delegatedClose: clicked .close or [data-close] element', hit);
        closeModal();
      }
    });

    // Also listen for pointerdown on modal for robustness (some devices)
    modal.addEventListener('pointerdown', (e) => {
      // if clicked exactly backdrop area, close
      if (e.target === modal) {
        console.info('modal.pointerdown on backdrop');
        closeModal();
      }
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        console.info('keydown Escape -> closeModal');
        closeModal();
      }
    });

    // page cleanup
    window.addEventListener('pagehide', closeModal);
    window.addEventListener('beforeunload', closeModal);

    // Focus guard: keep keyboard inside modal while open (lightweight)
    document.addEventListener('focus', (e) => {
      if (!modal.classList.contains('open')) return;
      if (!modal.contains(e.target)) {
        (closeBtn || modal).focus?.();
      }
    }, true);

    // initial focus
    window.addEventListener('load', () => { document.querySelector('.chip.active')?.focus(); });
  }

  /* ABOUT + CONTACT (unchanged) */
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
      const startTime = performance.now();
      const original = el.textContent;

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const current = Math.round(target * progress);

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

  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const status = document.getElementById('contactStatus');
    const clearBtn = document.getElementById('contactClear');
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

  document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initAbout();
    initContactForm();
  });

})();