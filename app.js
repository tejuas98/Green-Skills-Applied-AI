// Task lists per week
const WEEKLY_TASKS = {
  1: [
    "Complete Onboarding Orientation & checklist",
    "Read and review the Onboarding Offer Letter & Terms",
    "Join the official WhatsApp Community Group",
    "Attend Jun 03 Session: Sustainability basics, ESG, SDGs",
    "Attend Jun 06 Session: UN Sustainable Development Goals",
    "Complete first Guided Learning module (IBM SkillsBuild)"
  ],
  2: [
    "Attend Jun 10 Session: Systems thinking, circular economy",
    "Attend Jun 11 Session: Climate Data & NumPy / Pandas",
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
    "Attend Jun 24 Session: Water systems & Biodiversity",
    "Attend Jun 25 Session: Energy systems, Solar, EVs",
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

// State
let currentTab = "overview";
let activePhase = 1;
let activeJournalWeek = 1;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTimeline();
  initFAQ();
  initJournal();
});

// 1. Tab Navigation Routing
function initTabs() {
  const navLinks = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".tab-panel");

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute("data-tab");
      
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      panels.forEach(p => {
        p.classList.remove("active");
        if (p.id === `tab-${targetTab}`) {
          p.classList.add("active");
        }
      });

      currentTab = targetTab;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// 2. Interactive Schedule Timeline
function initTimeline() {
  const phaseBtns = document.querySelectorAll(".timeline-tab-btn");
  const contents = document.querySelectorAll(".timeline-phase-details");

  phaseBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPhase = btn.getAttribute("data-phase");
      
      phaseBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      contents.forEach(content => {
        content.style.display = "none";
        if (content.id === `phase-content-${targetPhase}`) {
          content.style.display = "block";
        }
      });

      activePhase = targetPhase;
    });
  });
}

// 3. Searchable FAQ List
function initFAQ() {
  const searchInput = document.getElementById("faq-search");
  const faqItems = document.querySelectorAll(".faq-item-details");

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();

    faqItems.forEach(item => {
      const summaryText = item.querySelector("summary").textContent.toLowerCase();
      const contentText = item.querySelector(".details-content").textContent.toLowerCase();

      if (summaryText.includes(query) || contentText.includes(query)) {
        item.style.display = "block";
        // Auto open item if searching is active to improve accessibility
        if (query.length > 2) {
          item.setAttribute("open", "");
        } else {
          item.removeAttribute("open");
        }
      } else {
        item.style.display = "none";
        item.removeAttribute("open");
      }
    });
  });
}

// 4. Progress Journal with LocalStorage & journal_data.json database
function initJournal() {
  const weekBtns = document.querySelectorAll(".journal-week-btn");
  const saveBtn = document.getElementById("save-notes-btn");
  const notesArea = document.getElementById("journal-notes");
  const exportBtn = document.getElementById("export-json-btn");

  // Load completed tasks status from LocalStorage (local draft)
  let completedTasks = JSON.parse(localStorage.getItem("1m1b-journal-tasks")) || {};
  let journalNotes = JSON.parse(localStorage.getItem("1m1b-journal-notes")) || {};

  // Render initial browser draft state on startup
  renderJournalWeek(activeJournalWeek, completedTasks, journalNotes);
  calculateProgress(completedTasks);

  // Fetch baseline data from GitHub (try Live API first if token exists, fallback to static)
  const token = localStorage.getItem("1m1b-github-token");
  let fetchPromise;

  if (token) {
    const apiUrl = "https://api.github.com/repos/tejuas98/Green-Skills-Applied-AI/contents/journal_data.json";
    fetchPromise = fetch(apiUrl, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('API fetch failed');
      return response.json();
    })
    .then(meta => {
      const decoded = decodeURIComponent(escape(atob(meta.content.replace(/\s/g, ""))));
      return JSON.parse(decoded);
    });
  } else {
    fetchPromise = fetch('journal_data.json').then(response => {
      if (!response.ok) throw new Error('No static json');
      return response.json();
    });
  }

  fetchPromise
    .then(data => {
      let changed = false;
      // Merge tasks
      if (data.tasks) {
        Object.keys(data.tasks).forEach(key => {
          if (completedTasks[key] === undefined) {
            completedTasks[key] = data.tasks[key];
            changed = true;
          }
        });
      }
      // Merge notes
      if (data.notes) {
        Object.keys(data.notes).forEach(key => {
          if (!journalNotes[key]) {
            journalNotes[key] = data.notes[key];
            changed = true;
          }
        });
      }

      if (changed) {
        localStorage.setItem("1m1b-journal-tasks", JSON.stringify(completedTasks));
        localStorage.setItem("1m1b-journal-notes", JSON.stringify(journalNotes));
        renderJournalWeek(activeJournalWeek, completedTasks, journalNotes);
        calculateProgress(completedTasks);
      }
    })
    .catch(err => {
      console.log("Using local browser storage or failed to retrieve live data from GitHub.", err);
    });

  // Week selection
  weekBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      activeJournalWeek = parseInt(btn.getAttribute("data-week"));
      
      weekBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      renderJournalWeek(activeJournalWeek, completedTasks, journalNotes);
    });
  });

  // Save notes
  saveBtn.addEventListener("click", () => {
    const text = notesArea.value;
    journalNotes[activeJournalWeek] = text;
    localStorage.setItem("1m1b-journal-notes", JSON.stringify(journalNotes));

    // Show temporary feedback state
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saved ✓";
    saveBtn.style.backgroundColor = "var(--accent-sage)";
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.backgroundColor = "var(--accent-forest)";
    }, 1500);
  });

  // Handle auto-save on blur
  notesArea.addEventListener("blur", () => {
    journalNotes[activeJournalWeek] = notesArea.value;
    localStorage.setItem("1m1b-journal-notes", JSON.stringify(journalNotes));
  });

  // Automated GitHub Sync logic
  const tokenInput = document.getElementById("github-token");
  const saveTokenBtn = document.getElementById("save-token-btn");
  const syncGithubBtn = document.getElementById("sync-github-btn");
  const syncStatusMsg = document.getElementById("sync-status-msg");
  const settingsDetails = document.getElementById("github-settings-details");

  if (tokenInput) {
    tokenInput.value = localStorage.getItem("1m1b-github-token") || "";
    if (tokenInput.value) {
      if (syncStatusMsg) syncStatusMsg.textContent = "Connected. Click Sync to update GitHub.";
    }
  }

  if (saveTokenBtn) {
    saveTokenBtn.addEventListener("click", () => {
      const tokenVal = tokenInput.value.trim();
      localStorage.setItem("1m1b-github-token", tokenVal);
      
      const originalText = saveTokenBtn.textContent;
      saveTokenBtn.textContent = "Saved!";
      saveTokenBtn.style.backgroundColor = "var(--accent-sage)";
      setTimeout(() => {
        saveTokenBtn.textContent = originalText;
        saveTokenBtn.style.backgroundColor = "var(--accent-forest)";
        if (settingsDetails) settingsDetails.removeAttribute("open");
      }, 1000);

      if (tokenVal) {
        syncStatusMsg.textContent = "Token saved! Click Sync to update GitHub.";
        syncStatusMsg.style.color = "var(--text-secondary)";
      } else {
        syncStatusMsg.textContent = "Saved locally. Add token above to enable auto-sync to GitHub.";
        syncStatusMsg.style.color = "var(--text-secondary)";
      }
    });
  }

  if (syncGithubBtn) {
    syncGithubBtn.addEventListener("click", () => {
      const token = localStorage.getItem("1m1b-github-token");
      if (!token) {
        if (settingsDetails) settingsDetails.setAttribute("open", "");
        if (tokenInput) tokenInput.focus();
        syncStatusMsg.textContent = "⚠️ Please paste and save a GitHub token first!";
        syncStatusMsg.style.color = "#c1121f";
        return;
      }

      syncStatusMsg.style.color = "var(--text-secondary)";
      syncStatusMsg.textContent = "Contacting GitHub metadata...";
      syncGithubBtn.textContent = "🔄 Syncing...";
      syncGithubBtn.disabled = true;

      const url = "https://api.github.com/repos/tejuas98/Green-Skills-Applied-AI/contents/journal_data.json";

      // Step 1: Get current file SHA
      fetch(url, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json"
        }
      })
      .then(res => {
        if (res.status === 404) {
          // File doesn't exist yet, we can create it without SHA
          return { sha: null };
        }
        if (!res.ok) {
          throw new Error("Invalid token or repo permissions. Re-check token scopes.");
        }
        return res.json();
      })
      .then(meta => {
        const sha = meta.sha;
        const exportData = {
          tasks: JSON.parse(localStorage.getItem("1m1b-journal-tasks")) || {},
          notes: JSON.parse(localStorage.getItem("1m1b-journal-notes")) || {}
        };
        const jsonString = JSON.stringify(exportData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        const bodyPayload = {
          message: "Update journal database from Web UI",
          content: base64Content
        };
        if (sha) {
          bodyPayload.sha = sha;
        }

        syncStatusMsg.textContent = "Uploading commit to GitHub repository...";

        // Step 2: Push updated file
        return fetch(url, {
          method: "PUT",
          headers: {
            "Authorization": `token ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json"
          },
          body: JSON.stringify(bodyPayload)
        });
      })
      .then(res => {
        if (!res.ok) throw new Error("GitHub push commit rejected. Verify write rights.");
        return res.json();
      })
      .then(() => {
        syncGithubBtn.textContent = "✓ Synced successfully!";
        syncGithubBtn.style.backgroundColor = "var(--accent-sage)";
        syncStatusMsg.textContent = "Committed successfully! Live site updates in 1-2 minutes.";
        syncStatusMsg.style.color = "var(--accent-green-text)";
      })
      .catch(err => {
        console.error(err);
        syncGithubBtn.textContent = "❌ Sync Failed";
        syncGithubBtn.style.backgroundColor = "#c1121f";
        syncStatusMsg.textContent = err.message || "Failed to push updates. Please verify token settings.";
        syncStatusMsg.style.color = "#c1121f";
      })
      .finally(() => {
        syncGithubBtn.disabled = false;
        setTimeout(() => {
          syncGithubBtn.textContent = "🔄 Sync to GitHub";
          syncGithubBtn.style.backgroundColor = "var(--accent-forest)";
        }, 3500);
      });
    });
  }
}

function renderJournalWeek(weekNum, completedTasks, journalNotes) {
  const title = document.getElementById("journal-title");
  const dates = document.getElementById("journal-dates");
  const tasksContainer = document.getElementById("journal-tasks");
  const notesArea = document.getElementById("journal-notes");

  title.textContent = `Week ${weekNum}: ${getWeekTitle(weekNum)}`;
  dates.textContent = WEEK_DATES[weekNum];
  notesArea.value = journalNotes[weekNum] || "";

  tasksContainer.innerHTML = "";
  const tasks = WEEKLY_TASKS[weekNum] || [];

  tasks.forEach((taskText, index) => {
    const taskId = `week-${weekNum}-task-${index}`;
    const isChecked = !!completedTasks[taskId];

    const item = document.createElement("div");
    item.className = `task-item ${isChecked ? 'checked' : ''}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = isChecked;

    const label = document.createElement("span");
    label.className = "task-label";
    label.textContent = taskText;

    item.appendChild(checkbox);
    item.appendChild(label);

    // Click event to toggle checkbox
    item.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }
      
      const checked = checkbox.checked;
      if (checked) {
        item.classList.add("checked");
        completedTasks[taskId] = true;
      } else {
        item.classList.remove("checked");
        delete completedTasks[taskId];
      }

      localStorage.setItem("1m1b-journal-tasks", JSON.stringify(completedTasks));
      calculateProgress(completedTasks);
      updateWeekButtonsState(completedTasks);
    });

    tasksContainer.appendChild(item);
  });
}

function getWeekTitle(weekNum) {
  switch (weekNum) {
    case 1: return "Foundations";
    case 2: return "Data Handling";
    case 3: return "PowerBI & AI";
    case 4: return "Energy Systems";
    case 5: return "ESG & Validation";
    case 6: return "Project Showcase";
    default: return "";
  }
}

function calculateProgress(completedTasks) {
  let totalTasks = 0;
  Object.keys(WEEKLY_TASKS).forEach(w => {
    totalTasks += WEEKLY_TASKS[w].length;
  });

  const checkedCount = Object.keys(completedTasks).length;
  const percentage = totalTasks > 0 ? Math.round((checkedCount / totalTasks) * 100) : 0;

  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");

  bar.style.width = `${percentage}%`;
  text.textContent = `${percentage}% Completed (${checkedCount}/${totalTasks} Milestones)`;
  
  updateWeekButtonsState(completedTasks);
}

function updateWeekButtonsState(completedTasks) {
  const weekBtns = document.querySelectorAll(".journal-week-btn");

  weekBtns.forEach(btn => {
    const weekNum = parseInt(btn.getAttribute("data-week"));
    const tasks = WEEKLY_TASKS[weekNum] || [];
    
    let allCompleted = true;
    tasks.forEach((_, index) => {
      const taskId = `week-${weekNum}-task-${index}`;
      if (!completedTasks[taskId]) {
        allCompleted = false;
      }
    });

    if (allCompleted && tasks.length > 0) {
      btn.classList.add("completed");
    } else {
      btn.classList.remove("completed");
    }
  });
}

