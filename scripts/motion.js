export const SCROLL_BLOCK_SELECTOR = [
  ".hero-banner", ".section-search > .container-grid",
  ".sctn-moves-abilities-home > .container-grid", ".sctn-destacados",
  ".page-intro", ".dex-heading", ".filters", ".search-container",
  ".sctn-pokemon-single .col-left", ".sctn-pokemon-single .col-right",
  ".sctn-prepare .pokemon-container", ".sctn-battle-game .row",
  ".container-grid-list", ".atlas-footer",
].join(", ");

const REVEAL_BLOCK_SELECTOR = [
  SCROLL_BLOCK_SELECTOR, ".wrapper-activity", ".gameboard", ".list-move-modal", ".hint-info",
  ".pokemon-cards-grid", ".list-pokemon", ".list-moves", ".list-abilities", ".pokedex-pagination",
].join(", ");

const pendingReveals = new WeakMap();

export function initializeMotion() {
  const style = document.documentElement ? getComputedStyle(document.documentElement) : null;
  const duration = parseFloat(style?.getPropertyValue("--enter-duration")) || 900;
  const normalize = (root) => {
    const elements = root.matches?.("[data-aos]") ? [root] : [];
    elements.push(...root.querySelectorAll("[data-aos]"));
    elements.forEach((element) => {
      if (element.matches(SCROLL_BLOCK_SELECTOR) || (element.matches("section") && !element.querySelector(SCROLL_BLOCK_SELECTOR))) return;
      element.removeAttribute("data-aos");
      element.removeAttribute("data-aos-duration");
      element.removeAttribute("data-aos-delay");
      element.classList.remove("aos-init", "aos-animate");
    });
    const blocks = root.matches?.(SCROLL_BLOCK_SELECTOR) ? [root] : [];
    blocks.push(...root.querySelectorAll(SCROLL_BLOCK_SELECTOR));
    const sections = root.matches?.("section") ? [root] : [];
    sections.push(...root.querySelectorAll("section"));
    sections.forEach(section => {
      if (!section.querySelector?.(SCROLL_BLOCK_SELECTOR)) blocks.push(section);
    });
    let added = false;
    blocks.forEach((element) => {
      if (element.parentElement?.closest(SCROLL_BLOCK_SELECTOR)) return;
      if (element.dataset.aos) return;
      element.dataset.aos = "fade-up";
      element.dataset.aosDuration = String(duration);
      element.dataset.aosDelay = "0";
      element.getBoundingClientRect?.();
      added = true;
    });
    return added;
  };
  normalize(document);
  new MutationObserver((records) => {
    let added = false;
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) added = normalize(node.closest?.("section") || node) || added;
    }));
    if (added) AOS.refreshHard?.();
  }).observe(document.body, { childList: true, subtree: true });
  AOS.init({
    duration,
    easing: "ease",
    once: true,
    mirror: false,
    offset: 24,
    disable: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

export function reveal(elements) {
  $(elements).stop(true, true).show().each(function () {
    this.style.opacity = "1";
    this.style.transform = "none";
    if (!this.matches?.(REVEAL_BLOCK_SELECTOR)) return;
    pendingReveals.get(this)?.disconnect();
    pendingReveals.delete(this);
    this.getAnimations?.().filter(animation => animation.id === "atlas-block-enter").forEach(animation => animation.cancel());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animateBlock = () => {
      const style = getComputedStyle(this);
      this.animate([
        { opacity: 0, transform: `translateY(${style.getPropertyValue("--enter-distance").trim() || "24px"})` },
        { opacity: "1", transform: "translateY(0)" },
      ], {
        id: "atlas-block-enter",
        duration: parseFloat(style.getPropertyValue("--enter-duration")) || 900,
        easing: style.getPropertyValue("--enter-easing").trim() || "cubic-bezier(0.25, 0.1, 0.25, 1)",
      });
    };
    const bounds = this.getBoundingClientRect?.();
    if (bounds && (bounds.top >= window.innerHeight || bounds.bottom <= 0) && typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        pendingReveals.delete(this);
        animateBlock();
      }, { threshold: 0 });
      pendingReveals.set(this, observer);
      observer.observe(this);
    } else {
      animateBlock();
    }
  });
}