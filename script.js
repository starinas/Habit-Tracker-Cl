/* ============================================================
   Environmental Habit Tracker — app logic
   Storage shape (localStorage key "eco-tracker-data"):
   {
     habits: ["Recycled", "Biked or walked", ...],
     log: { "2026-08-10": ["Recycled", "Biked or walked"], ... }
   }
   ============================================================ */

const STORAGE_KEY = "eco-tracker-data";

const DEFAULT_HABITS = [
  "Recycled or composted",
  "Used a reusable bottle or bag",
  "Walked, biked, or took transit",
  "Ate a plant-based meal",
  "Turned off unused lights/electronics",
  "Reduced water use"
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no data yet");
    const parsed = JSON.parse(raw);
    if (!parsed.habits || !parsed.log) throw new Error("malformed");
    return parsed;
  } catch (e) {
    const fresh = { habits: [...DEFAULT_HABITS], log: {} };
    saveData(fresh);
    return fresh;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- Streak calculation ---------- */
// A day "counts" if at least one habit was logged that day.
function computeStreaks(log) {
  const loggedDays = Object.keys(log).filter(k => log[k] && log[k].length > 0);
  const daySet = new Set(loggedDays);

  // current streak: walk backwards from today
  let current = 0;
  let cursor = new Date();
  while (daySet.has(toDateKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // longest streak: sort all logged days and find max consecutive run
  const sorted = loggedDays.slice().sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev) {
      const prevDate = new Date(prev + "T00:00:00");
      prevDate.setDate(prevDate.getDate() + 1);
      if (toDateKey(prevDate) === key) {
        run++;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }

  const totalLogged = loggedDays.reduce((sum, k) => sum + log[k].length, 0);

  return { current, longest, totalLogged, daysActive: loggedDays.length };
}

/* ---------- Sprout SVG (grows with current streak) ---------- */
function renderSprout(container, streak) {
  if (!container) return;

  // Growth stages by streak length
  let stage = "seed";
  if (streak >= 21) stage = "tree";
  else if (streak >= 10) stage = "sapling";
  else if (streak >= 3) stage = "sprout";
  else if (streak >= 1) stage = "seedling";

  const svgByStage = {
    seed: `
      <ellipse cx="70" cy="140" rx="34" ry="8" fill="#22301D" opacity="0.08"/>
      <path d="M70 130 q-8 -14 0 -20 q8 6 0 20z" fill="#6B5843"/>
    `,
    seedling: `
      <ellipse cx="70" cy="140" rx="34" ry="8" fill="#22301D" opacity="0.08"/>
      <line x1="70" y1="140" x2="70" y2="118" stroke="#4C7A3C" stroke-width="3" stroke-linecap="round"/>
      <path d="M70 122 q-14 -6 -18 4 q10 6 18 -4z" fill="#4C7A3C"/>
      <path d="M70 126 q14 -4 18 6 q-10 4 -18 -6z" fill="#4C7A3C"/>
    `,
    sprout: `
      <ellipse cx="70" cy="140" rx="34" ry="8" fill="#22301D" opacity="0.08"/>
      <line x1="70" y1="140" x2="70" y2="96" stroke="#4C7A3C" stroke-width="4" stroke-linecap="round"/>
      <path d="M70 108 q-20 -8 -26 6 q14 8 26 -6z" fill="#4C7A3C"/>
      <path d="M70 114 q20 -6 26 8 q-14 6 -26 -8z" fill="#4C7A3C"/>
      <path d="M70 96 q-14 -10 -20 2 q10 8 20 -2z" fill="#5C8F49"/>
    `,
    sapling: `
      <ellipse cx="70" cy="140" rx="38" ry="9" fill="#22301D" opacity="0.09"/>
      <line x1="70" y1="140" x2="70" y2="70" stroke="#6B5843" stroke-width="5" stroke-linecap="round"/>
      <path d="M70 96 q-26 -10 -32 8 q16 10 32 -8z" fill="#4C7A3C"/>
      <path d="M70 104 q26 -8 32 10 q-16 8 -32 -10z" fill="#5C8F49"/>
      <path d="M70 78 q-20 -12 -26 2 q12 10 26 -2z" fill="#4C7A3C"/>
      <path d="M70 84 q20 -10 26 4 q-12 8 -26 -4z" fill="#5C8F49"/>
      <circle cx="70" cy="70" r="7" fill="#5C8F49"/>
    `,
    tree: `
      <ellipse cx="70" cy="140" rx="44" ry="10" fill="#22301D" opacity="0.1"/>
      <line x1="70" y1="140" x2="70" y2="60" stroke="#6B5843" stroke-width="7" stroke-linecap="round"/>
      <circle cx="70" cy="55" r="34" fill="#4C7A3C"/>
      <circle cx="46" cy="72" r="22" fill="#5C8F49"/>
      <circle cx="94" cy="72" r="22" fill="#5C8F49"/>
      <circle cx="70" cy="88" r="20" fill="#3F6532"/>
      <circle cx="82" cy="40" r="4" fill="#C98A2C"/>
      <circle cx="55" cy="60" r="4" fill="#C98A2C"/>
    `
  };

  container.innerHTML = `
    <svg class="sprout-svg" viewBox="0 0 140 160" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="Growth illustration, stage: ${stage}">
      ${svgByStage[stage]}
    </svg>`;
}

/* ---------- Calendar ---------- */
function initCalendar(root) {
  const monthLabel = root.querySelector("[data-month-label]");
  const grid = root.querySelector("[data-cal-grid]");
  const prevBtn = root.querySelector("[data-cal-prev]");
  const nextBtn = root.querySelector("[data-cal-next]");

  let viewDate = new Date();
  viewDate.setDate(1);
  let selectedKey = toDateKey(new Date());

  const monthNames = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];

  function render() {
    const data = loadData();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayKey = toDateKey(new Date());

    grid.innerHTML = "";

    // leading faded days
    for (let i = firstWeekday; i > 0; i--) {
      const cell = document.createElement("div");
      cell.className = "cal-day faded";
      cell.textContent = daysInPrevMonth - i + 1;
      grid.appendChild(cell);
    }

    // real days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = toDateKey(dateObj);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      if (key === todayKey) cell.classList.add("today");
      if (key === selectedKey) cell.classList.add("selected");

      const num = document.createElement("span");
      num.textContent = d;
      cell.appendChild(num);

      if (data.log[key] && data.log[key].length > 0) {
        const dot = document.createElement("span");
        dot.className = "dot";
        cell.appendChild(dot);
      }

      cell.addEventListener("click", () => {
        selectedKey = key;
        render();
        renderDayPanel(selectedKey);
      });

      grid.appendChild(cell);
    }

    // trailing faded days to complete the grid
    const totalCells = firstWeekday + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-day faded";
      cell.textContent = i;
      grid.appendChild(cell);
    }
  }

  prevBtn.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    render();
  });
  nextBtn.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    render();
  });

  render();
  renderDayPanel(selectedKey);

  return { refresh: render, getSelectedKey: () => selectedKey };
}

/* ---------- Day panel (habit checklist for the selected date) ---------- */
let calendarHandle = null;

function renderDayPanel(dateKey) {
  const listEl = document.getElementById("habit-list");
  const subEl = document.getElementById("day-sub");
  if (!listEl) return;

  const data = loadData();
  const dateObj = new Date(dateKey + "T00:00:00");
  subEl.textContent = dateObj.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

  const loggedForDay = data.log[dateKey] || [];

  listEl.innerHTML = "";
  data.habits.forEach(habit => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    label.className = "habit-check";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = loggedForDay.includes(habit);
    input.addEventListener("change", () => {
      const d = loadData();
      const current = new Set(d.log[dateKey] || []);
      if (input.checked) current.add(habit);
      else current.delete(habit);
      d.log[dateKey] = Array.from(current);
      if (d.log[dateKey].length === 0) delete d.log[dateKey];
      saveData(d);
      updateStreakUI();
      if (calendarHandle) calendarHandle.refresh();
    });

    const span = document.createElement("span");
    span.textContent = habit;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-habit";
    removeBtn.textContent = "Remove";
    removeBtn.title = `Remove "${habit}" from your habit list`;
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const d = loadData();
      d.habits = d.habits.filter(h => h !== habit);
      Object.keys(d.log).forEach(k => {
        d.log[k] = d.log[k].filter(h => h !== habit);
        if (d.log[k].length === 0) delete d.log[k];
      });
      saveData(d);
      renderDayPanel(dateKey);
      updateStreakUI();
      if (calendarHandle) calendarHandle.refresh();
      showToast(`Removed "${habit}"`);
    });

    label.appendChild(input);
    label.appendChild(span);
    label.appendChild(removeBtn);
    li.appendChild(label);
    listEl.appendChild(li);
  });
}

function initAddHabitForm() {
  const form = document.getElementById("add-habit-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("new-habit-input");
    const value = input.value.trim();
    if (!value) return;
    const d = loadData();
    if (d.habits.some(h => h.toLowerCase() === value.toLowerCase())) {
      showToast("That habit is already on your list");
      return;
    }
    d.habits.push(value);
    saveData(d);
    input.value = "";
    const key = calendarHandle ? calendarHandle.getSelectedKey() : toDateKey(new Date());
    renderDayPanel(key);
    showToast(`Added "${value}"`);
  });
}

/* ---------- Streak UI (used on tracker + home pages) ---------- */
function updateStreakUI() {
  const data = loadData();
  const stats = computeStreaks(data.log);

  const streakEl = document.querySelector("[data-streak-current]");
  const longestEl = document.querySelector("[data-streak-longest]");
  const totalEl = document.querySelector("[data-streak-total]");
  const sproutEl = document.querySelector("[data-sprout]");

  if (streakEl) streakEl.textContent = stats.current;
  if (longestEl) longestEl.textContent = stats.longest;
  if (totalEl) totalEl.textContent = stats.totalLogged;
  if (sproutEl) renderSprout(sproutEl, stats.current);
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  loadData(); // ensures defaults exist

  const calRoot = document.querySelector("[data-calendar]");
  if (calRoot) calendarHandle = initCalendar(calRoot);

  initAddHabitForm();
  updateStreakUI();
});