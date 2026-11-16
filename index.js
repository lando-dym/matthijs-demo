(() => {
  "use strict";

  const WEBSITES = [
    {
      name: "Atlas Studio",
      category: "projects",
      categoryLabel: "Projects",
      url: "https://example.com/atlas-studio",
      domain: "example.com",
      description: "Identity, web, and art direction for small brands with big ideas.",
      pinned: true
    },
    {
      name: "Field Notes",
      category: "writing",
      categoryLabel: "Writing",
      url: "https://example.com/field-notes",
      domain: "example.com",
      description: "Essays on design, attention, and making things at a human pace.",
      pinned: true
    },
    {
      name: "Low Tide",
      category: "experiments",
      categoryLabel: "Experiments",
      url: "https://example.com/low-tide",
      domain: "example.com",
      description: "Small browser toys, visual studies, and things built for the joy of it."
    },
    {
      name: "The Archive",
      category: "projects",
      categoryLabel: "Projects",
      url: "https://example.com/archive",
      domain: "example.com",
      description: "A growing collection of selected work from the past few years."
    },
    {
      name: "Sundial",
      category: "experiments",
      categoryLabel: "Experiments",
      url: "https://example.com/sundial",
      domain: "example.com",
      description: "An interactive study of light, time, and quiet movement on screen."
    },
    {
      name: "Letters",
      category: "writing",
      categoryLabel: "Writing",
      url: "https://example.com/letters",
      domain: "example.com",
      description: "Occasional notes delivered slowly, whenever there is something worth sharing."
    },
    {
      name: "Elsewhere",
      category: "social",
      categoryLabel: "Social",
      url: "https://example.com/elsewhere",
      domain: "example.com",
      description: "The places I actually post, gathered into one small and tidy list."
    },
    {
      name: "Press Kit",
      category: "projects",
      categoryLabel: "Projects",
      url: "https://example.com/press-kit",
      domain: "example.com",
      description: "Bios, photographs, and logos for editors, collaborators, and curious people."
    }
  ];

  const THEMES = ["dark", "bright", "system"];
  const THEME_LABELS = {
    dark: "Dark",
    bright: "Bright",
    system: "System"
  };
  const FONTS = ["instrument", "manrope", "space", "outfit", "plex"];
  const ACCENTS = ["coral", "lagoon", "sand", "lilac"];
  const FILTERS = ["all", "projects", "writing", "experiments", "social"];
  const VIEW_META = {
    home: { title: "Matthijs — Websites & Projects" },
    websites: { title: "Websites — Matthijs" },
    about: { title: "About — Matthijs" },
    settings: { title: "Settings — Matthijs" }
  };

  const ZOOM_MIN = 75;
  const ZOOM_MAX = 125;
  const ZOOM_STEP = 5;
  const STORAGE_KEY = "matthijs.settings.v1";
  const REPORTS_KEY = "matthijs.reports.v1";

  const DEFAULT_SETTINGS = Object.freeze({
    theme: "dark",
    font: "instrument",
    zoom: 100,
    accent: "coral",
    blur: 22,
    glow: 72,
    grain: true,
    reduceMotion: false,
    newTab: true
  });

  const ARROW_SVG = '<svg class="arrow-icon" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8"/></svg>';

  const root = document.documentElement;
  const body = document.body;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

  const els = {};

  let settings = { ...DEFAULT_SETTINGS };
  let currentView = null;
  let activeFilter = "all";
  let activeOverlay = null;
  let lastFocusedElement = null;
  let resolvedTheme = "dark";
  let toastTimer = null;
  let toastCleanupTimer = null;
  let saveTimer = null;
  let storageWarningShown = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeZoom(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_SETTINGS.zoom;
    }
    return clamp(Math.round(numeric / ZOOM_STEP) * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return entities[character];
    });
  }

  function loadSettings() {
    const next = { ...DEFAULT_SETTINGS };
    let stored = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      stored = null;
    }
    if (!stored || typeof stored !== "object") {
      return next;
    }
    if (THEMES.includes(stored.theme)) {
      next.theme = stored.theme;
    }
    if (FONTS.includes(stored.font)) {
      next.font = stored.font;
    }
    if (ACCENTS.includes(stored.accent)) {
      next.accent = stored.accent;
    }
    if (typeof stored.zoom === "number" && Number.isFinite(stored.zoom)) {
      next.zoom = normalizeZoom(stored.zoom);
    }
    if (typeof stored.blur === "number" && Number.isFinite(stored.blur)) {
      next.blur = clamp(Math.round(stored.blur), 0, 30);
    }
    if (typeof stored.glow === "number" && Number.isFinite(stored.glow)) {
      next.glow = clamp(Math.round(stored.glow), 0, 100);
    }
    if (typeof stored.grain === "boolean") {
      next.grain = stored.grain;
    }
    if (typeof stored.reduceMotion === "boolean") {
      next.reduceMotion = stored.reduceMotion;
    }
    if (typeof stored.newTab === "boolean") {
      next.newTab = stored.newTab;
    }
    return next;
  }

  function persistSettings() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("This browser blocked local settings.");
      }
    }
  }

  function cacheElements() {
    els.site = document.getElementById("site");
    els.header = document.getElementById("header");
    els.main = document.getElementById("main");
    els.themeToggle = document.getElementById("themeToggle");
    els.menuButton = document.getElementById("menuButton");
    els.themeMeta = document.getElementById("themeColorMeta");
    els.year = document.getElementById("year");
    els.views = Array.from(document.querySelectorAll(".view[data-view]"));
    els.navLinks = Array.from(document.querySelectorAll("[data-nav]"));
    els.menuLinks = Array.from(document.querySelectorAll("[data-menu-route]"));
    els.pinnedList = document.getElementById("pinnedList");
    els.pinnedCount = document.getElementById("pinnedCount");
    els.linkGrid = document.getElementById("linkGrid");
    els.directoryCount = document.getElementById("directoryCount");
    els.emptyState = document.getElementById("emptyState");
    els.filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
    els.themeButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
    els.fontButtons = Array.from(document.querySelectorAll("[data-font-option]"));
    els.accentButtons = Array.from(document.querySelectorAll("[data-accent-option]"));
    els.zoomRange = document.getElementById("zoomRange");
    els.zoomValue = document.getElementById("zoomValue");
    els.zoomStepButtons = Array.from(document.querySelectorAll("[data-zoom-step]"));
    els.zoomReset = document.getElementById("zoomReset");
    els.blurRange = document.getElementById("blurRange");
    els.blurValue = document.getElementById("blurValue");
    els.glowRange = document.getElementById("glowRange");
    els.glowValue = document.getElementById("glowValue");
    els.grainToggle = document.getElementById("grainToggle");
    els.motionToggle = document.getElementById("motionToggle");
    els.newTabToggle = document.getElementById("newTabToggle");
    els.restoreDefaults = document.getElementById("restoreDefaults");
    els.saveState = document.getElementById("saveState");
    els.saveStateText = document.getElementById("saveStateText");
    els.menuOverlay = document.getElementById("menuOverlay");
    els.menuPanel = document.getElementById("menuPanel");
    els.menuClose = document.getElementById("menuClose");
    els.menuThemeToggle = document.getElementById("menuThemeToggle");
    els.menuThemeValue = document.getElementById("menuThemeValue");
    els.reportOverlay = document.getElementById("reportOverlay");
    els.reportPanel = document.getElementById("reportPanel");
    els.reportClose = document.getElementById("reportClose");
    els.reportCancel = document.getElementById("reportCancel");
    els.reportDone = document.getElementById("reportDone");
    els.reportForm = document.getElementById("reportForm");
    els.reportSuccess = document.getElementById("reportSuccess");
    els.reportCategory = document.getElementById("reportCategory");
    els.reportMessage = document.getElementById("reportMessage");
    els.reportError = document.getElementById("reportError");
    els.reportCount = document.getElementById("reportCount");
    els.reportSubmit = document.getElementById("reportSubmit");
    els.reportOpeners = Array.from(document.querySelectorAll("[data-open-report]"));
    els.toast = document.getElementById("toast");
    els.toastText = document.getElementById("toastText");
  }

  function applySettings() {
    root.style.fontSize = `${settings.zoom}%`;
    root.style.setProperty("--glass-blur", `${settings.blur}px`);
    root.style.setProperty("--glow-strength", (settings.glow / 100).toFixed(2));
    root.dataset.font = settings.font;
    root.dataset.accent = settings.accent;
    root.dataset.grain = settings.grain ? "on" : "off";
    root.dataset.motion = settings.reduceMotion ? "off" : "on";
    applyTheme();
    syncControls();
  }

  function applyTheme() {
    resolvedTheme = settings.theme === "system"
      ? (systemTheme.matches ? "dark" : "bright")
      : settings.theme;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = settings.theme;
    if (els.themeMeta) {
      els.themeMeta.setAttribute("content", resolvedTheme === "dark" ? "#08121f" : "#e9e2d7");
    }
    if (els.themeToggle) {
      const label = resolvedTheme === "dark" ? "Switch to bright theme" : "Switch to dark theme";
      els.themeToggle.setAttribute("aria-label", label);
      els.themeToggle.setAttribute("title", label);
    }
    if (els.menuThemeValue) {
      els.menuThemeValue.textContent = THEME_LABELS[settings.theme] || "Dark";
    }
    syncThemeButtons();
  }

  function syncThemeButtons() {
    setPressed(els.themeButtons, (button) => button.dataset.themeOption === settings.theme);
  }

  function setPressed(buttons, predicate) {
    buttons.forEach((button) => {
      const active = Boolean(predicate(button));
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updateRangeProgress(input) {
    if (!input) return;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value) || 0;
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", `${clamp(progress, 0, 100)}%`);
  }

  function syncControls() {
    syncThemeButtons();
    setPressed(els.fontButtons, (button) => button.dataset.fontOption === settings.font);
    setPressed(els.accentButtons, (button) => button.dataset.accentOption === settings.accent);
    if (els.zoomRange) {
      els.zoomRange.value = String(settings.zoom);
      els.zoomRange.setAttribute("aria-valuetext", `${settings.zoom} percent`);
      updateRangeProgress(els.zoomRange);
    }
    if (els.zoomValue) {
      els.zoomValue.textContent = `${settings.zoom}%`;
    }
    els.zoomStepButtons.forEach((button) => {
      const delta = Number(button.dataset.zoomStep);
      if (!Number.isFinite(delta)) return;
      button.disabled = delta < 0 ? settings.zoom <= ZOOM_MIN : settings.zoom >= ZOOM_MAX;
    });
    if (els.blurRange) {
      els.blurRange.value = String(settings.blur);
      els.blurRange.setAttribute("aria-valuetext", `${settings.blur} pixels`);
      updateRangeProgress(els.blurRange);
    }
    if (els.blurValue) {
      els.blurValue.textContent = `${settings.blur} px`;
    }
    if (els.glowRange) {
      els.glowRange.value = String(settings.glow);
      els.glowRange.setAttribute("aria-valuetext", `${settings.glow} percent`);
      updateRangeProgress(els.glowRange);
    }
    if (els.glowValue) {
      els.glowValue.textContent = `${settings.glow}%`;
    }
    if (els.grainToggle) {
      els.grainToggle.checked = settings.grain;
    }
    if (els.motionToggle) {
      els.motionToggle.checked = settings.reduceMotion;
    }
    if (els.newTabToggle) {
      els.newTabToggle.checked = settings.newTab;
    }
    if (els.menuThemeValue) {
      els.menuThemeValue.textContent = THEME_LABELS[settings.theme] || "Dark";
    }
    if (els.menuThemeToggle) {
      els.menuThemeToggle.setAttribute(
        "aria-label",
        `Appearance: ${THEME_LABELS[settings.theme] || "Dark"}. Change theme.`
      );
    }
  }

  function updateSettings(patch, options = {}) {
    settings = { ...settings, ...patch };
    applySettings();
    persistSettings();
    flashSaved();
    if (options.rerender) {
      renderLinks();
    }
    if (options.message) {
      showToast(options.message);
    }
  }

  function flashSaved() {
    if (!els.saveState) return;
    els.saveState.classList.add("is-saved");
    if (els.saveStateText) {
      els.saveStateText.textContent = "Saved just now";
    }
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      if (els.saveState) {
        els.saveState.classList.remove("is-saved");
      }
      if (els.saveStateText) {
        els.saveStateText.textContent = "Saved locally";
      }
    }, 1800);
  }

  function showToast(message) {
    if (!els.toast || !els.toastText) return;
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastCleanupTimer);
    els.toastText.textContent = message;
    els.toast.hidden = false;
    window.requestAnimationFrame(() => {
      if (els.toast) {
        els.toast.classList.add("is-visible");
      }
    });
    toastTimer = window.setTimeout(() => {
      if (els.toast) {
        els.toast.classList.remove("is-visible");
      }
      toastCleanupTimer = window.setTimeout(() => {
        if (els.toast && !els.toast.classList.contains("is-visible")) {
          els.toast.hidden = true;
        }
      }, 280);
    }, 2800);
  }

  function toggleTheme() {
    const next = resolvedTheme === "dark" ? "bright" : "dark";
    updateSettings({ theme: next });
  }

  function bindSystemTheme() {
    const handleChange = () => {
      if (settings.theme === "system") {
        applyTheme();
      }
    };
    if (typeof systemTheme.addEventListener === "function") {
      systemTheme.addEventListener("change", handleChange);
    } else if (typeof systemTheme.addListener === "function") {
      systemTheme.addListener(handleChange);
    }
  }

  function makeWebsiteLink(site, className) {
    const link = document.createElement("a");
    const note = settings.newTab ? ", opens in a new tab" : "";
    link.className = className;
    link.href = site.url;
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${site.name}, ${site.categoryLabel} website${note}`);
    if (settings.newTab) {
      link.target = "_blank";
    }
    return link;
  }

  function renderPinned() {
    if (!els.pinnedList) return;
    const pinned = WEBSITES.filter((site) => site.pinned).slice(0, 2);
    const fragment = document.createDocumentFragment();
    pinned.forEach((site, index) => {
      const link = makeWebsiteLink(site, "pinned__item");
      link.innerHTML = `
        <div class="pinned__top">
          <div class="pinned__identity">
            <span class="pinned__category">${escapeHtml(site.categoryLabel)}</span>
            <h3 class="pinned__name">${escapeHtml(site.name)}</h3>
          </div>
          <span class="pinned__index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        </div>
        <div class="pinned__bottom">
          <span class="pinned__domain">${escapeHtml(site.domain)}</span>
          <span class="pinned__visit">Visit ${ARROW_SVG}</span>
        </div>
      `;
      fragment.append(link);
    });
    els.pinnedList.replaceChildren(fragment);
    if (els.pinnedCount) {
      els.pinnedCount.textContent = `${String(pinned.length).padStart(2, "0")} featured`;
    }
  }

  function renderDirectory() {
    if (!els.linkGrid) return;
    const filtered = activeFilter === "all"
      ? WEBSITES
      : WEBSITES.filter((site) => site.category === activeFilter);
    const fragment = document.createDocumentFragment();
    filtered.forEach((site) => {
      const index = WEBSITES.indexOf(site) + 1;
      const link = makeWebsiteLink(site, "site-card glass-card");
      link.dataset.category = site.category;
      link.innerHTML = `
        <div class="site-card__top">
          <span class="site-card__index">${String(index).padStart(2, "0")}</span>
          <span class="site-card__arrow" aria-hidden="true">${ARROW_SVG}</span>
        </div>
        <div class="site-card__body">
          <span class="site-card__category">${escapeHtml(site.categoryLabel)}</span>
          <h2>${escapeHtml(site.name)}</h2>
          <p>${escapeHtml(site.description)}</p>
        </div>
        <div class="site-card__foot">
          <span>${escapeHtml(site.domain)}</span>
          <span>Visit site</span>
        </div>
      `;
      fragment.append(link);
    });
    els.linkGrid.replaceChildren(fragment);
    if (els.directoryCount) {
      els.directoryCount.textContent = `${filtered.length} ${filtered.length === 1 ? "website" : "websites"}`;
    }
    if (els.emptyState) {
      els.emptyState.hidden = filtered.length !== 0;
    }
  }

  function renderLinks() {
    renderPinned();
    renderDirectory();
  }

  function updateFilterButtons() {
    setPressed(els.filterButtons, (button) => button.dataset.filter === activeFilter);
  }

  function setActiveFilter(filter) {
    const next = FILTERS.includes(filter) ? filter : "all";
    if (next === activeFilter) return;
    activeFilter = next;
    updateFilterButtons();
    renderDirectory();
  }

  function routeFromHash() {
    const candidate = window.location.hash.replace(/^#\/?/, "").toLowerCase();
    return Object.prototype.hasOwnProperty.call(VIEW_META, candidate) ? candidate : "home";
  }

  function syncNav(route) {
    els.navLinks.forEach((link) => {
      const active = link.dataset.nav === route;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    els.menuLinks.forEach((link) => {
      const active = link.dataset.menuRoute === route;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function syncRoute(isInitial = false) {
    const route = routeFromHash();
    const changed = currentView !== null && currentView !== route;
    currentView = route;
    els.views.forEach((view) => {
      const active = view.dataset.view === route;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    body.dataset.view = route;
    document.title = VIEW_META[route] ? VIEW_META[route].title : VIEW_META.home.title;
    syncNav(route);
    if (changed && !isInitial) {
      if (activeOverlay) {
        closeOverlay(activeOverlay, false);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const activeView = els.views.find((view) => view.dataset.view === route);
      window.requestAnimationFrame(() => {
        if (activeView) {
          activeView.focus({ preventScroll: true });
        }
      });
    }
  }

  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0);
  }

  function openOverlay(type) {
    if (activeOverlay === type) return;
    if (activeOverlay) {
      hideOverlay(activeOverlay);
    } else if (document.activeElement instanceof HTMLElement) {
      lastFocusedElement = document.activeElement;
    }
    const overlay = type === "menu" ? els.menuOverlay : els.reportOverlay;
    const panel = type === "menu" ? els.menuPanel : els.reportPanel;
    if (!overlay || !panel) return;
    if (type === "report") {
      resetReportForm();
    }
    activeOverlay = type;
    overlay.hidden = false;
    document.body.classList.add("is-locked");
    if (els.site) {
      els.site.inert = true;
    }
    if (type === "menu" && els.menuButton) {
      els.menuButton.setAttribute("aria-expanded", "true");
    }
    const focusTarget = type === "menu"
      ? (els.menuClose || getFocusable(panel)[0])
      : (els.reportCategory || getFocusable(panel)[0]);
    window.requestAnimationFrame(() => {
      if (focusTarget) {
        focusTarget.focus({ preventScroll: true });
      }
    });
  }

  function hideOverlay(type) {
    const overlay = type === "menu" ? els.menuOverlay : els.reportOverlay;
    if (overlay) {
      overlay.hidden = true;
    }
    if (type === "menu" && els.menuButton) {
      els.menuButton.setAttribute("aria-expanded", "false");
    }
    if (activeOverlay === type) {
      activeOverlay = null;
    }
    if (!activeOverlay) {
      document.body.classList.remove("is-locked");
      if (els.site) {
        els.site.inert = false;
      }
    }
  }

  function closeOverlay(type = activeOverlay, restoreFocus = true) {
    if (!type) return;
    const focusReturn = lastFocusedElement;
    hideOverlay(type);
    lastFocusedElement = null;
    if (restoreFocus && focusReturn && document.contains(focusReturn)) {
      window.requestAnimationFrame(() => {
        focusReturn.focus({ preventScroll: true });
      });
    }
  }

  function trapFocus(event) {
    const panel = activeOverlay === "menu" ? els.menuPanel : els.reportPanel;
    const focusable = getFocusable(panel);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey) {
      if (current === first || !panel.contains(current)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (current === last || !panel.contains(current)) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleKeydown(event) {
    if (!activeOverlay) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay(activeOverlay);
      return;
    }
    if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function resetReportForm() {
    if (els.reportForm) {
      els.reportForm.reset();
      els.reportForm.hidden = false;
    }
    if (els.reportSuccess) {
      els.reportSuccess.hidden = true;
    }
    if (els.reportError) {
      els.reportError.hidden = true;
    }
    if (els.reportMessage) {
      els.reportMessage.removeAttribute("aria-invalid");
    }
    if (els.reportCount) {
      els.reportCount.textContent = "0";
    }
  }

  function openReport() {
    openOverlay("report");
  }

  function handleReportSubmit(event) {
    event.preventDefault();
    if (!els.reportMessage) return;
    const message = els.reportMessage.value.trim();
    if (message.length < 10) {
      if (els.reportError) {
        els.reportError.hidden = false;
      }
      els.reportMessage.setAttribute("aria-invalid", "true");
      els.reportMessage.focus();
      return;
    }
    const report = {
      category: els.reportCategory ? els.reportCategory.value : "other",
      message,
      createdAt: new Date().toISOString()
    };
    let saved = true;
    try {
      let reports = [];
      const raw = window.localStorage.getItem(REPORTS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) reports = parsed;
        } catch {
          reports = [];
        }
      }
      reports.push(report);
      window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(-25)));
    } catch {
      saved = false;
    }
    if (!saved) {
      showToast("Your report could not be saved in this browser.");
      return;
    }
    if (els.reportForm) els.reportForm.hidden = true;
    if (els.reportSuccess) els.reportSuccess.hidden = false;
    window.requestAnimationFrame(() => {
      if (els.reportDone) els.reportDone.focus();
    });
  }

  function handleReportInput() {
    if (!els.reportMessage) return;
    const length = els.reportMessage.value.length;
    if (els.reportCount) {
      els.reportCount.textContent = String(length);
    }
    if (els.reportError && els.reportMessage.value.trim().length >= 10) {
      els.reportError.hidden = true;
      els.reportMessage.removeAttribute("aria-invalid");
    }
  }

  function handleScroll() {
    if (els.header) {
      els.header.classList.toggle("is-scrolled", window.scrollY > 4);
    }
  }

  function updateYear() {
    if (els.year) {
      els.year.textContent = String(new Date().getFullYear());
    }
  }

  function bindEvents() {
    if (els.themeToggle) els.themeToggle.addEventListener("click", toggleTheme);
    if (els.menuButton) els.menuButton.addEventListener("click", () => openOverlay("menu"));
    if (els.menuClose) els.menuClose.addEventListener("click", () => closeOverlay("menu"));
    if (els.menuThemeToggle) {
      els.menuThemeToggle.addEventListener("click", () => {
        toggleTheme();
        showToast(`${THEME_LABELS[settings.theme]} appearance applied.`);
      });
    }
    els.menuLinks.forEach((link) => {
      link.addEventListener("click", () => closeOverlay("menu", false));
    });
    if (els.menuOverlay) {
      els.menuOverlay.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("[data-close-menu]")) {
          closeOverlay("menu");
        }
      });
    }
    els.reportOpeners.forEach((button) => {
      button.addEventListener("click", openReport);
    });
    if (els.reportClose) els.reportClose.addEventListener("click", () => closeOverlay("report"));
    if (els.reportCancel) els.reportCancel.addEventListener("click", () => closeOverlay("report"));
    if (els.reportDone) els.reportDone.addEventListener("click", () => closeOverlay("report"));
    if (els.reportOverlay) {
      els.reportOverlay.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("[data-close-report]")) {
          closeOverlay("report");
        }
      });
    }
    if (els.reportForm) els.reportForm.addEventListener("submit", handleReportSubmit);
    if (els.reportMessage) els.reportMessage.addEventListener("input", handleReportInput);
    els.filterButtons.forEach((button) => {
      button.addEventListener("click", () => setActiveFilter(button.dataset.filter));
    });
    els.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updateSettings({ theme: button.dataset.themeOption });
      });
    });
    els.fontButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updateSettings({ font: button.dataset.fontOption });
      });
    });
    els.accentButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updateSettings({ accent: button.dataset.accentOption });
      });
    });
    els.zoomStepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const delta = Number(button.dataset.zoomStep);
        updateSettings({ zoom: normalizeZoom(settings.zoom + delta) });
      });
    });
    if (els.zoomReset) {
      els.zoomReset.addEventListener("click", () => {
        updateSettings({ zoom: DEFAULT_SETTINGS.zoom });
      });
    }
    if (els.zoomRange) {
      els.zoomRange.addEventListener("input", (event) => {
        updateSettings({ zoom: normalizeZoom(Number(event.target.value)) });
      });
    }
    if (els.blurRange) {
      els.blurRange.addEventListener("input", (event) => {
        updateSettings({ blur: clamp(Number(event.target.value), 0, 30) });
      });
    }
    if (els.glowRange) {
      els.glowRange.addEventListener("input", (event) => {
        updateSettings({ glow: clamp(Number(event.target.value), 0, 100) });
      });
    }
    if (els.grainToggle) {
      els.grainToggle.addEventListener("change", () => {
        updateSettings({ grain: els.grainToggle.checked });
      });
    }
    if (els.motionToggle) {
      els.motionToggle.addEventListener("change", () => {
        updateSettings({ reduceMotion: els.motionToggle.checked });
      });
    }
    if (els.newTabToggle) {
      els.newTabToggle.addEventListener("change", () => {
        updateSettings(
          { newTab: els.newTabToggle.checked },
          {
            rerender: true,
            message: els.newTabToggle.checked
              ? "Links will open in a new tab."
              : "Links will open in this tab."
          }
        );
      });
    }
    if (els.restoreDefaults) {
      els.restoreDefaults.addEventListener("click", () => {
        activeFilter = "all";
        updateFilterButtons();
        updateSettings(
          { ...DEFAULT_SETTINGS },
          { rerender: true, message: "Default settings restored." }
        );
        renderDirectory();
      });
    }
    window.addEventListener("hashchange", () => syncRoute());
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("keydown", handleKeydown);
  }

  function init() {
    cacheElements();
    settings = loadSettings();
    bindSystemTheme();
    applySettings();
    renderLinks();
    updateFilterButtons();
    bindEvents();
    syncRoute(true);
    updateYear();
    handleScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
