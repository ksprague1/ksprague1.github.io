(function () {
  const DECK_NAMES = {
    b_red: "Red Deck",
    b_blue: "Blue Deck",
    b_yellow: "Yellow Deck",
    b_green: "Green Deck",
    b_black: "Black Deck",
    b_magic: "Magic Deck",
    b_nebula: "Nebula Deck",
    b_ghost: "Ghost Deck",
    b_abandoned: "Abandoned Deck",
    b_checkered: "Checkered Deck",
    b_zodiac: "Zodiac Deck",
    b_painted: "Painted Deck",
    b_anaglyph: "Anaglyph Deck",
    b_plasma: "Plasma Deck",
    b_erratic: "Erratic Deck",
  };

  const STAKE_NAMES = {
    1: "White",
    2: "Red",
    3: "Green",
    4: "Black",
    5: "Blue",
    6: "Purple",
    7: "Orange",
    8: "Gold",
  };

  const JOKER_NAMES = {
    drivers_license: "Driver's License",
    steel_joker: "Steel Joker",
    mime: "Mime",
    mr_bones: "Mr. Bones",
    cavendish: "Cavendish",
    vampire: "Vampire",
    constellation: "Constellation",
    baseball: "Baseball Card",
    hologram: "Hologram",
    blueprint: "Blueprint",
    supernova: "Supernova",
    abstract: "Abstract Joker",
    blue_joker: "Blue Joker",
    hanging_chad: "Hanging Chad",
    chaos: "Chaos the Clown",
    fortune_teller: "Fortune Teller",
    ice_cream: "Ice Cream",
    popcorn: "Popcorn",
    gros_michel: "Gros Michel",
    green_joker: "Green Joker",
  };

  function formatChips(num) {
    if (!num) return "—";
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return String(num);
  }

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }
  function updateThemeLabel() {
    if (!themeBtn) return;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    themeBtn.textContent = isLight ? "Dark mode" : "Light mode";
  }
  updateThemeLabel();
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
      updateThemeLabel();
    });
  }

  const data = window.BALATRO_DATA;
  if (!data) return;

  // Index eval results by deck -> stake
  const byDeck = {};
  data.evalResults.forEach((row) => {
    if (!byDeck[row.deck]) byDeck[row.deck] = {};
    byDeck[row.deck][row.stake] = row;
  });

  const deckOrder = Object.keys(DECK_NAMES);

  function cellColor(winPct) {
    // Smooth perceptual ramp: crimson/amber -> emerald/cyan
    const t = Math.max(0, Math.min(1, winPct / 100));
    let r, g, b;
    if (t < 0.35) {
      const u = t / 0.35;
      r = Math.round(185 + u * 45);
      g = Math.round(45 + u * 95);
      b = Math.round(55 - u * 20);
    } else if (t < 0.7) {
      const u = (t - 0.35) / 0.35;
      r = Math.round(230 - u * 190);
      g = Math.round(140 + u * 45);
      b = Math.round(35 + u * 85);
    } else {
      const u = (t - 0.7) / 0.3;
      r = Math.round(40 - u * 24);
      g = Math.round(185 + u * 15);
      b = Math.round(120 + u * 40);
    }
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }

  const tbody = document.getElementById("heatmap-body");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorMetrics = document.getElementById("inspector-metrics");

  function setInspector(deck, stake) {
    const cell = byDeck[deck] && byDeck[deck][stake];
    if (!cell || !inspectorTitle || !inspectorMetrics) return;
    const peak = data.bestScores[deck];
    inspectorTitle.innerHTML = `<strong>${DECK_NAMES[deck]}</strong> &middot; ${STAKE_NAMES[stake]} Stake (Stake ${stake})`;
    inspectorMetrics.innerHTML = `
      <span>Win Rate: <strong>${cell.win.toFixed(1)}%</strong></span>
      <span>Mean Ante: <strong>${cell.ante.toFixed(2)}</strong></span>
      <span>Mean Blinds: <strong>${cell.blinds.toFixed(1)}</strong></span>
      <span>Gold Peak: <strong>${formatChips(peak)}</strong></span>
    `;
  }

  const timeline = data.timeline || [];
  const orders = data.orders || {};
  let currentIdx = Math.max(0, timeline.length - 1);
  let currentSortMode = "default";
  let leftMode = "hands";
  let jokerMode = "winrate";

  function goldWinFor(deck) {
    const snap = timeline[currentIdx];
    const isFinal = currentIdx === timeline.length - 1;
    if (isFinal || !snap || !snap.gd) {
      return byDeck[deck][8]?.win || 0;
    }
    const idx = (data.deckOrder || deckOrder).indexOf(deck);
    return idx >= 0 ? snap.gd[idx] : byDeck[deck][8]?.win || 0;
  }

  let hmCellRefs = [];

  function updateHeatmapValues() {
    if (!hmCellRefs.length) return;
    const isFinal = currentIdx === timeline.length - 1;
    const snap = timeline[currentIdx];
    const alpha = isFinal ? 1 : (snap ? snap.u / 50000 : 1);
    const whiteKpiCard = document.querySelector(".kpi-grid .kpi-card");
    if (whiteKpiCard) {
      whiteKpiCard.style.opacity = isFinal ? "1" : "0.45";
      whiteKpiCard.style.transition = "opacity 0.15s ease";
    }

    hmCellRefs.forEach(({ deck, cells, bestTd }) => {
      for (let s = 1; s <= 8; s++) {
        const cell = byDeck[deck][s];
        const winVal = s === 8 ? goldWinFor(deck) : cell.win * alpha;
        const td = cells[s - 1];
        td.style.background = cellColor(winVal);
        td.style.opacity = !isFinal && s < 8 ? "0.4" : "1";
        td.textContent = winVal.toFixed(0) + "%";
      }
      bestTd.style.opacity = isFinal ? "1" : "0.4";
    });
  }

  function renderHeatmap(sortMode) {
    if (!tbody) return;
    currentSortMode = sortMode || currentSortMode;
    const decks = [...deckOrder];
    if (currentSortMode === "gold") {
      decks.sort((a, b) => (byDeck[b][8]?.win || 0) - (byDeck[a][8]?.win || 0));
    } else if (currentSortMode === "white") {
      decks.sort((a, b) => (byDeck[b][1]?.win || 0) - (byDeck[a][1]?.win || 0));
    }

    tbody.innerHTML = "";
    hmCellRefs = [];
    decks.forEach((deck) => {
      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.className = "deck-name";
      nameTd.textContent = DECK_NAMES[deck];
      tr.appendChild(nameTd);

      const cells = [];
      for (let s = 1; s <= 8; s++) {
        const td = document.createElement("td");
        td.className = "hm-cell";
        td.style.color = "#ffffff";
        td.setAttribute("tabindex", "0");
        td.title = `Click to view ${DECK_NAMES[deck]} ${STAKE_NAMES[s]} Stake replays`;
        td.addEventListener("mouseenter", () => setInspector(deck, s));
        td.addEventListener("focus", () => setInspector(deck, s));
        td.addEventListener("click", () => {
          window.location.href = `replays/?deck=${encodeURIComponent(deck)}&stake=${s}`;
        });
        tr.appendChild(td);
        cells.push(td);
      }

      const bestTd = document.createElement("td");
      bestTd.className = "best-col";
      bestTd.textContent = formatChips(data.bestScores[deck]);
      tr.appendChild(bestTd);

      tbody.appendChild(tr);
      hmCellRefs.push({ deck, cells, bestTd });
    });
    updateHeatmapValues();
  }

  renderHeatmap("default");
  setInspector("b_yellow", 8);

  document.querySelectorAll("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-sort]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderHeatmap(btn.getAttribute("data-sort"));
    });
  });

  function prettyName(key) {
    if (data && data.names && data.names[key]) return data.names[key];
    if (JOKER_NAMES[key]) return JOKER_NAMES[key];
    return key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function formatSteps(s) {
    if (s >= 1e9) return (s / 1e9).toFixed(2) + "B steps";
    return (s / 1e6).toFixed(1) + "M steps";
  }

  const stepSlider = document.getElementById("step-slider");
  const stepLabel = document.getElementById("step-label");
  const updateLabel = document.getElementById("update-label");
  const handsEl = document.getElementById("hands-bars");
  const jokersEl = document.getElementById("jokers-bars");
  const leftTitle = document.getElementById("left-card-title");
  const leftSub = document.getElementById("left-card-sub");

  function renderLeftCard() {
    if (!handsEl || !timeline[currentIdx]) return;
    const snap = timeline[currentIdx];
    handsEl.innerHTML = "";

    if (leftMode === "hands") {
      if (leftTitle) leftTitle.textContent = "Hands Played";
      if (leftSub) leftSub.textContent = "1,000-update rolling average, ordered by final step.";
      (orders.hands || []).forEach((h, idx) => {
        const [share, winRate] = snap.h[idx] || [0, 0];
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `
          <div class="bar-meta">
            <span class="bar-name">${h}</span>
            <span class="bar-stats">${share.toFixed(1)}% of plays &middot; ${winRate.toFixed(1)}% round win</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${Math.max(2, share)}%"></div>
          </div>
        `;
        handsEl.appendChild(row);
      });
    } else {
      const keys = leftMode === "tarots" ? orders.tarots || [] : orders.spectrals || [];
      const arr = leftMode === "tarots" ? snap.t : snap.sp;
      if (leftTitle) leftTitle.textContent = leftMode === "tarots" ? "Tarot Cards Used" : "Spectral Cards Used";
      if (leftSub) leftSub.textContent = "Avg per game (1,000-update window), ordered by final step.";
      const maxUsed = Math.max(0.001, ...arr.map((x) => x[0]));
      const fmtRate = (v) => (v >= 0.1 ? v.toFixed(2) : v.toFixed(3));
      keys.forEach((k, idx) => {
        const [used, pack, sold] = arr[idx] || [0, 0, 0];
        const pct = (100 * used) / maxUsed;
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `
          <div class="bar-meta">
            <span class="bar-name">${prettyName(k)}</span>
            <span class="bar-stats">${fmtRate(used)}/game &middot; ${fmtRate(pack)} pack &middot; ${fmtRate(sold)} sold</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${Math.max(2, pct)}%"></div>
          </div>
        `;
        handsEl.appendChild(row);
      });
    }
  }

  function renderJokers() {
    if (!jokersEl || !timeline[currentIdx]) return;
    const snap = timeline[currentIdx];
    jokersEl.innerHTML = "";
    const jNames = orders.jokers || [];
    const indices =
      jokerMode === "blinds"
        ? jNames.map((_, i) => i)
        : orders.jokerWinIdx || [];
    const maxBlinds = Math.max(1, ...indices.map((i) => (snap.j[i] ? snap.j[i][2] : 0)));
    indices.forEach((i) => {
      const [runs, winRate, blinds] = snap.j[i] || [0, 0, 0];
      const name = prettyName(jNames[i]);
      const pctWidth = jokerMode === "blinds" ? (100 * blinds) / maxBlinds : winRate;
      const fillClass = jokerMode === "blinds" ? "bar-fill gold" : "bar-fill emerald";
      const statsText =
        jokerMode === "blinds"
          ? `${blinds.toLocaleString()} blinds &middot; ${winRate.toFixed(1)}% win`
          : `${winRate.toFixed(1)}% win &middot; ${blinds.toLocaleString()} blinds`;
      const row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML = `
        <div class="bar-meta">
          <span class="bar-name">${name}</span>
          <span class="bar-stats">${statsText}</span>
        </div>
        <div class="bar-track">
          <div class="${fillClass}" style="width: ${Math.max(2, pctWidth)}%"></div>
        </div>
      `;
      jokersEl.appendChild(row);
    });
  }

  function formatCount(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function renderKpis(snap) {
    const isFinal = currentIdx === timeline.length - 1;
    const kpiGold = document.getElementById("kpi-gold");
    const kpiGoldSub = document.getElementById("kpi-gold-sub");
    const kpiBest = document.getElementById("kpi-best");
    const kpiBestSub = document.getElementById("kpi-best-sub");
    const kpiSteps = document.getElementById("kpi-steps");
    const kpiStepsSub = document.getElementById("kpi-steps-sub");

    if (kpiGold && kpiGoldSub) {
      if (isFinal) {
        kpiGold.textContent = "26.2% / 43.8%";
        kpiGoldSub.textContent = "43.8% Yellow · 42.6% Blue · 35.2% Ghost (u50000 eval)";
      } else if (snap.gd && snap.gd.length) {
        const dOrder = data.deckOrder || deckOrder;
        const pairs = dOrder.map((d, i) => [d, snap.gd[i]]).sort((a, b) => b[1] - a[1]);
        const mean = pairs.reduce((acc, x) => acc + x[1], 0) / pairs.length;
        kpiGold.textContent = `${mean.toFixed(1)}% / ${pairs[0][1].toFixed(1)}%`;
        kpiGoldSub.textContent = pairs
          .slice(0, 3)
          .map(([d, w]) => `${w.toFixed(1)}% ${DECK_NAMES[d].replace(" Deck", "")}`)
          .join(" · ");
      }
    }

    if (kpiBest && kpiBestSub && snap.bs !== undefined) {
      kpiBest.textContent = formatChips(snap.bs);
      kpiBestSub.textContent = isFinal
        ? "11,377,637,957 chips on Plasma Deck Gold Stake"
        : `Peak single-run score reached by u${snap.u}`;
    }

    if (kpiSteps && kpiStepsSub) {
      kpiSteps.textContent = formatSteps(snap.s);
      if (snap.g !== undefined && snap.ba !== undefined) {
        kpiStepsSub.textContent = `${formatCount(snap.g)} games · ${formatCount(snap.ba)} blinds attempted`;
      }
    }
  }

  function renderTimeline() {
    if (!timeline[currentIdx]) return;
    const snap = timeline[currentIdx];
    if (stepLabel) stepLabel.textContent = formatSteps(snap.s);
    if (updateLabel) updateLabel.textContent = "u" + snap.u;
    renderKpis(snap);
    updateHeatmapValues();
    renderLeftCard();
    renderJokers();
  }

  if (stepSlider && timeline.length > 0) {
    stepSlider.max = String(timeline.length - 1);
    stepSlider.value = String(currentIdx);
    let rafPending = false;
    stepSlider.addEventListener("input", () => {
      currentIdx = Number(stepSlider.value);
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          renderTimeline();
        });
      }
    });
  }

  renderTimeline();

  document.querySelectorAll("[data-left-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-left-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      leftMode = btn.getAttribute("data-left-mode");
      renderLeftCard();
    });
  });

  document.querySelectorAll("[data-joker-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-joker-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      jokerMode = btn.getAttribute("data-joker-mode");
      renderJokers();
    });
  });
})();
