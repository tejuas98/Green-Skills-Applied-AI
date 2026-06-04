// ============================================================
//  Firebase + Internship Journal — app.js (ES Module)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDkGtTtnjs3K2ma3BJkjb4W6IEZzCyyUUA",
  authDomain: "zersap.firebaseapp.com",
  projectId: "zersap",
  storageBucket: "zersap.firebasestorage.app",
  messagingSenderId: "602431770708",
  appId: "1:602431770708:web:ba0e91aa677722bb7b9dc1",
  measurementId: "G-VCKY5SLMHN"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Firestore document path — isolated from any other Zersap project
const JOURNAL_DOC = doc(db, "internship-journal", "1m1b-green-skills");

// ── Weekly Task Definitions ──────────────────────────────────
const WEEKLY_TASKS = {
  1: [
    "Complete Onboarding Orientation & checklist",
    "Read and review the Onboarding Offer Letter & Terms",
    "Join the official WhatsApp Community Group",
    "Attend Jun 03 (Wed) Session: Sustainability basics, ESG, SDGs",
    "Attend Jun 05 (Fri) Session: UN Sustainable Development Goals",
    "Complete first Guided Learning module (IBM SkillsBuild)"
  ],
  2: [
    "Attend Jun 10 (Wed) Session: Systems thinking, circular economy",
    "Attend Jun 12 (Fri) Session: Climate Data & NumPy / Pandas",
    "Write Python scripts to parse environmental datasets",
    "Submit weekly assessment quiz 1"
  ],
  3: [
    "Attend Jun 17 Session: Data Visualization & RAG Basics",
    "Attend Jun 19 Session: Power BI Dashboarding",
    "Connect sample climate metrics data to PowerBI and build charts",
    "Submit weekly assessment quiz 2"
  ],
  4: [
    "Attend Jun 24 (Wed) Session: Water systems & Biodiversity",
    "Attend Jun 26 (Fri) Session: Energy systems, Solar, EVs",
    "Draft initial proposal for Campus Green Audit",
    "Submit weekly assessment quiz 3"
  ],
  5: [
    "Attend Jul 01 Session: ESG & Reporting",
    "Attend Jul 03 Session: Careers, Pathways, and Project Prep",
    "Validate AI model calculations and review bias checks",
    "Review final impact project outline with assigned mentor"
  ],
  6: [
    "Assemble and polish final AI Climate dashboard",
    "Complete and compile sustainability impact project report",
    "Attend Jul 08 Session: Demo Day presentations",
    "Complete final program feedback survey"
  ]
};

const WEEK_DATES = {
  1: "June 3 – June 9",
  2: "June 10 – June 16",
  3: "June 17 – June 23",
  4: "June 24 – June 30",
  5: "July 1 – July 7",
  6: "July 8 – July 14"
};

// ── App State ────────────────────────────────────────────────
let currentTab       = "overview";
let activeJournalWeek = 1;
let completedTasks   = {};   // { "week-1-task-0": true, … }
let journalNotes     = {};   // { 1: "my notes…", … }
let saveDebounce     = null;
let isViewingAllNotes = false;

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTimeline();
  initFAQ();
  initJournal();
});

// ── 1. Tab Navigation ────────────────────────────────────────
function initTabs() {
  const navLinks = document.querySelectorAll(".nav-link");
  const panels   = document.querySelectorAll(".tab-panel");

  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const target = link.getAttribute("data-tab");

      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      panels.forEach(p => {
        p.classList.remove("active");
        if (p.id === `tab-${target}`) p.classList.add("active");
      });

      currentTab = target;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ── 2. Schedule Timeline ─────────────────────────────────────
function initTimeline() {
  const phaseBtns = document.querySelectorAll(".timeline-tab-btn");
  const contents  = document.querySelectorAll(".timeline-phase-details");

  phaseBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const phase = btn.getAttribute("data-phase");

      phaseBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      contents.forEach(c => {
        c.style.display = "none";
        if (c.id === `phase-content-${phase}`) c.style.display = "block";
      });
    });
  });
}

// ── 3. FAQ Search ────────────────────────────────────────────
function initFAQ() {
  const searchInput = document.getElementById("faq-search");
  if (!searchInput) return;

  const faqItems = document.querySelectorAll(".faq-item-details");

  searchInput.addEventListener("input", e => {
    const query = e.target.value.toLowerCase().trim();

    faqItems.forEach(item => {
      const summaryText = item.querySelector("summary").textContent.toLowerCase();
      const bodyText    = item.querySelector(".details-content").textContent.toLowerCase();

      if (summaryText.includes(query) || bodyText.includes(query)) {
        item.style.display = "block";
        if (query.length > 2) item.setAttribute("open", "");
        else item.removeAttribute("open");
      } else {
        item.style.display = "none";
        item.removeAttribute("open");
      }
    });
  });
}

// ── 4. Journal (Firebase-backed) ─────────────────────────────
function initJournal() {
  setFirebaseStatus("connecting");

  // ── Set up Firestore real-time listener ──────────────────
  onSnapshot(JOURNAL_DOC, snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      completedTasks = data.tasks || {};
      journalNotes   = data.notes || {};
    } else {
      completedTasks = {};
      journalNotes   = {};
    }

    setFirebaseStatus("connected");

    // Refresh current view
    if (isViewingAllNotes) {
      renderAllNotes();
    } else {
      renderJournalWeek(activeJournalWeek);
    }
    calculateProgress();
    updateWeekButtonsState();
  }, err => {
    console.error("Firestore error:", err);
    setFirebaseStatus("error");
  });

  // ── Week selector buttons ────────────────────────────────
  const weekBtns = document.querySelectorAll(".journal-week-btn:not(#all-notes-btn)");
  weekBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      activeJournalWeek = parseInt(btn.getAttribute("data-week"));
      isViewingAllNotes = false;

      weekBtns.forEach(b => b.classList.remove("active"));
      document.getElementById("all-notes-btn").classList.remove("active");
      btn.classList.add("active");

      showWeeklyView();
      renderJournalWeek(activeJournalWeek);
    });
  });

  // ── "All Notes" button ───────────────────────────────────
  const allNotesBtn = document.getElementById("all-notes-btn");
  if (allNotesBtn) {
    allNotesBtn.addEventListener("click", () => {
      isViewingAllNotes = true;

      weekBtns.forEach(b => b.classList.remove("active"));
      allNotesBtn.classList.add("active");

      showAllNotesView();
      renderAllNotes();
    });
  }

  // ── Save Notes button ────────────────────────────────────
  const saveBtn   = document.getElementById("save-notes-btn");
  const notesArea = document.getElementById("journal-notes");

  if (saveBtn && notesArea) {
    saveBtn.addEventListener("click", () => {
      saveNotes(notesArea.value);
      flashSaveButton(saveBtn);
    });

    // Auto-save on typing (debounced 1.5 s)
    notesArea.addEventListener("input", () => {
      setAutosaveIndicator("Unsaved changes…");
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => {
        saveNotes(notesArea.value);
      }, 1500);
    });
  }
}

// ── Render a weekly view ──────────────────────────────────────
function renderJournalWeek(weekNum) {
  const title       = document.getElementById("journal-title");
  const dates       = document.getElementById("journal-dates");
  const container   = document.getElementById("journal-tasks");
  const notesArea   = document.getElementById("journal-notes");

  if (!title || !container || !notesArea) return;

  title.textContent     = `Week ${weekNum}: ${getWeekTitle(weekNum)}`;
  dates.textContent     = WEEK_DATES[weekNum];
  notesArea.value       = journalNotes[weekNum] || "";

  container.innerHTML = "";
  const tasks = WEEKLY_TASKS[weekNum] || [];

  tasks.forEach((taskText, index) => {
    const taskId   = `week-${weekNum}-task-${index}`;
    const isChecked = !!completedTasks[taskId];

    const item     = document.createElement("div");
    item.className = `task-item ${isChecked ? "checked" : ""}`;

    const checkbox       = document.createElement("input");
    checkbox.type        = "checkbox";
    checkbox.className   = "task-checkbox";
    checkbox.checked     = isChecked;

    const label       = document.createElement("span");
    label.className   = "task-label";
    label.textContent = taskText;

    item.appendChild(checkbox);
    item.appendChild(label);

    item.addEventListener("click", e => {
      if (e.target !== checkbox) checkbox.checked = !checkbox.checked;

      if (checkbox.checked) {
        item.classList.add("checked");
        completedTasks[taskId] = true;
      } else {
        item.classList.remove("checked");
        delete completedTasks[taskId];
      }

      calculateProgress();
      updateWeekButtonsState();
      persistToFirebase();
    });

    container.appendChild(item);
  });
}

// ── Render "All Notes" overview ───────────────────────────────
function renderAllNotes() {
  const container = document.getElementById("all-notes-container");
  if (!container) return;

  container.innerHTML = "";

  let hasAnyNotes = false;

  for (let w = 1; w <= 6; w++) {
    const note = (journalNotes[w] || "").trim();

    const card = document.createElement("div");
    card.style.cssText = `
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      position: relative;
    `;

    // Completed tasks count
    const tasks = WEEKLY_TASKS[w] || [];
    const doneCount = tasks.filter((_, i) => completedTasks[`week-${w}-task-${i}`]).length;

    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;";

    const titleEl = document.createElement("div");
    titleEl.innerHTML = `
      <div style="font-family: var(--font-serif); font-size: 1.05rem; font-weight: 600; color: var(--text-primary);">
        Week ${w}: ${getWeekTitle(w)}
      </div>
      <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.1rem;">${WEEK_DATES[w]}</div>
    `;

    const badge = document.createElement("div");
    badge.style.cssText = `
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 99px;
      background: ${doneCount === tasks.length && tasks.length > 0 ? "var(--accent-forest)" : "var(--bg-tertiary)"};
      color: ${doneCount === tasks.length && tasks.length > 0 ? "white" : "var(--text-secondary)"};
    `;
    badge.textContent = `${doneCount}/${tasks.length} tasks`;

    header.appendChild(titleEl);
    header.appendChild(badge);

    const noteEl = document.createElement("div");
    if (note) {
      hasAnyNotes = true;
      noteEl.style.cssText = `
        font-size: 0.85rem;
        color: var(--text-secondary);
        line-height: 1.7;
        white-space: pre-wrap;
        border-left: 2px solid var(--accent-sage);
        padding-left: 0.9rem;
        margin-top: 0.5rem;
      `;
      noteEl.textContent = note;
    } else {
      noteEl.style.cssText = "font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-top: 0.5rem;";
      noteEl.textContent   = "No notes written yet for this week.";
    }

    // "Edit" jump link
    const editLink = document.createElement("button");
    editLink.textContent = "Edit this week →";
    editLink.style.cssText = `
      margin-top: 0.75rem;
      background: none;
      border: none;
      color: var(--accent-forest);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    `;
    editLink.addEventListener("click", () => {
      // Switch to weekly view for this week
      isViewingAllNotes = false;
      activeJournalWeek = w;

      document.querySelectorAll(".journal-week-btn:not(#all-notes-btn)").forEach(b => {
        b.classList.remove("active");
        if (parseInt(b.getAttribute("data-week")) === w) b.classList.add("active");
      });
      document.getElementById("all-notes-btn").classList.remove("active");

      showWeeklyView();
      renderJournalWeek(w);
    });

    card.appendChild(header);
    card.appendChild(noteEl);
    card.appendChild(editLink);

    container.appendChild(card);
  }

  if (!hasAnyNotes) {
    const emptyMsg = document.createElement("p");
    emptyMsg.style.cssText = "font-size: 0.85rem; color: var(--text-muted); font-style: italic;";
    emptyMsg.textContent   = "You haven't written any notes yet. Go to a week and start writing!";
    container.prepend(emptyMsg);
  }
}

// ── View switching helpers ─────────────────────────────────────
function showWeeklyView() {
  document.getElementById("journal-weekly-view").style.display  = "block";
  document.getElementById("journal-all-notes-view").style.display = "none";
}

function showAllNotesView() {
  document.getElementById("journal-weekly-view").style.display  = "none";
  document.getElementById("journal-all-notes-view").style.display = "block";
}

// ── Save note for current week to Firestore ───────────────────
function saveNotes(text) {
  journalNotes[activeJournalWeek] = text;
  persistToFirebase();
  setAutosaveIndicator("Saved to Firebase ✓");
  setTimeout(() => setAutosaveIndicator(""), 2500);
}

// ── Write entire journal state to Firestore ───────────────────
async function persistToFirebase() {
  try {
    await setDoc(JOURNAL_DOC, {
      tasks: completedTasks,
      notes: journalNotes,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to save to Firestore:", err);
    setFirebaseStatus("error");
  }
}

// ── Firebase status indicator ─────────────────────────────────
function setFirebaseStatus(state) {
  const dot  = document.getElementById("firebase-status-dot");
  const text = document.getElementById("firebase-status-text");
  if (!dot || !text) return;

  const states = {
    connecting: { color: "#f0ad4e", label: "Connecting to Firebase…" },
    connected:  { color: "#4caf50", label: "Firebase synced ✓"       },
    error:      { color: "#e53935", label: "Sync error — check console" }
  };

  const s = states[state] || states.connecting;
  dot.style.background = s.color;
  text.textContent     = s.label;
}

// ── Autosave indicator ────────────────────────────────────────
function setAutosaveIndicator(msg) {
  const el = document.getElementById("autosave-indicator");
  if (el) el.textContent = msg;
}

// ── Save button flash ─────────────────────────────────────────
function flashSaveButton(btn) {
  const orig = btn.textContent;
  btn.textContent              = "Saved ✓";
  btn.style.backgroundColor    = "var(--accent-sage)";
  setTimeout(() => {
    btn.textContent           = orig;
    btn.style.backgroundColor = "var(--accent-forest)";
  }, 1500);
}

// ── Progress bar ──────────────────────────────────────────────
function calculateProgress() {
  let total = 0;
  Object.values(WEEKLY_TASKS).forEach(arr => (total += arr.length));

  const done       = Object.keys(completedTasks).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const bar  = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");
  if (bar)  bar.style.width   = `${percentage}%`;
  if (text) text.textContent  = `${percentage}% Completed (${done}/${total} Milestones)`;
}

// ── Week button "all done" state ──────────────────────────────
function updateWeekButtonsState() {
  document.querySelectorAll(".journal-week-btn:not(#all-notes-btn)").forEach(btn => {
    const w     = parseInt(btn.getAttribute("data-week"));
    const tasks = WEEKLY_TASKS[w] || [];
    const all   = tasks.length > 0 && tasks.every((_, i) => completedTasks[`week-${w}-task-${i}`]);
    btn.classList.toggle("completed", all);
  });
}

// ── Week title helper ─────────────────────────────────────────
function getWeekTitle(w) {
  return ["", "Foundations", "Data Handling", "PowerBI & AI",
          "Energy Systems", "ESG & Validation", "Project Showcase"][w] || "";
}
