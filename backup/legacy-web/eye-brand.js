/**
 * Logo Eyedrive animado: pupila sigue al cursor y se cierra al escribir contraseña.
 */
(function () {
  const MAX_OFFSET = 3.4;
  const LERP = 0.14;

  function svgMarkup() {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="icon-svg icon-svg--lg eye-brand-svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<g class="eye-brand-inner">' +
      '<path class="eye-brand-outline" d="M1 12s4-6.5 11-6.5 10 6.5 10 6.5-4 6.5-10 6.5S1 12 1 12Z"/>' +
      '<g class="eye-brand-pupil"><circle cx="12" cy="12" r="2.75" fill="currentColor" stroke="none"/></g>' +
      "</g></svg>"
    );
  }

  function bindPasswordClose(container) {
    const update = () => {
      const focused = document.querySelector("input[type='password']:focus");
      container.classList.toggle("eye-brand--closed", !!focused);
    };
    document.querySelectorAll("input[type='password']").forEach((input) => {
      input.addEventListener("focus", update);
      input.addEventListener("blur", update);
    });
  }

  function mount(container, options) {
    if (!container || container.dataset.eyeBrandMounted) return null;
    options = options || {};

    container.dataset.eyeBrandMounted = "1";
    container.classList.add("eye-brand");
    container.innerHTML = svgMarkup();

    const svg = container.querySelector(".eye-brand-svg");
    const pupil = container.querySelector(".eye-brand-pupil");
    if (!svg || !pupil) return null;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = 0;
    let blinkTimer = 0;

    const onMove = (e) => {
      if (container.classList.contains("eye-brand--closed")) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const scale = Math.min(dist * 0.07, MAX_OFFSET);
      const angle = Math.atan2(dy, dx);
      targetX = Math.cos(angle) * scale;
      targetY = Math.sin(angle) * scale;
    };

    const tick = () => {
      curX += (targetX - curX) * LERP;
      curY += (targetY - curY) * LERP;
      pupil.setAttribute("transform", "translate(" + curX.toFixed(2) + ", " + curY.toFixed(2) + ")");
      rafId = requestAnimationFrame(tick);
    };

    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (!container.classList.contains("eye-brand--closed")) {
          container.classList.add("eye-brand--blink");
          window.setTimeout(() => container.classList.remove("eye-brand--blink"), 160);
        }
        scheduleBlink();
      }, 3200 + Math.random() * 4500);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    scheduleBlink();

    const closeOnPassword = options.closeOnPassword !== false;
    if (closeOnPassword) bindPasswordClose(container);

    return {
      destroy() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("touchmove", onMove);
        cancelAnimationFrame(rafId);
        clearTimeout(blinkTimer);
        delete container.dataset.eyeBrandMounted;
        container.classList.remove("eye-brand", "eye-brand--closed", "eye-brand--blink");
      },
    };
  }

  function mountAll() {
    document.querySelectorAll("#brandIcon, [data-eye-brand]").forEach((el) => mount(el));
  }

  window.EyeBrand = { mount, mountAll, bindPasswordClose };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();
