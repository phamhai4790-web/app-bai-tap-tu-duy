/**
 * Antigravity Visual Reasoning App - Main Application Controller
 */
class AppController {
  constructor() {
    this.currentView = "child"; // "child", "editor", "parent"
    this.allQuestions = [];
    this.questions = [];
    this.taxonomy = null;
    this.currentQuestionIndex = 0;
    this.sessionResults = [];
    this.sessionStartTime = Date.now();
    this.activeDomain = null;
    this.activeSkill = null;
    this.libFilter = "all"; // "all", "unsolved", "solved"

    // Load solved questions from localStorage
    try {
      const savedSolved = JSON.parse(localStorage.getItem("agy_solved_questions") || "[]");
      this.solvedQuestionIds = new Set(savedSolved);
    } catch (e) {
      this.solvedQuestionIds = new Set();
    }

    // DOM Elements
    this.arena = document.getElementById("arena-box");
    this.optionsContainer = document.getElementById("options-shelf");
    this.feedbackBanner = document.getElementById("feedback-banner");
    this.nextActionArea = document.getElementById("next-action-area");
    this.btnNext = document.getElementById("btn-next");
    this.progressText = document.getElementById("progress-text");
    this.dotsContainer = document.getElementById("dots-container");
    this.instructionText = document.getElementById("instruction-text");
    this.muteBtn = document.getElementById("btn-toggle-sound");

    // Breadcrumb & Library Elements
    this.bcDomain = document.getElementById("bc-domain");
    this.bcSkill = document.getElementById("bc-skill");
    this.bcType = document.getElementById("bc-type");
    this.bcDifficulty = document.getElementById("bc-difficulty");
    this.bcTags = document.getElementById("bc-tags");
    this.libraryModal = document.getElementById("library-modal");
    this.btnOpenLibrary = document.getElementById("btn-open-library");
    this.btnCloseLibrary = document.getElementById("btn-close-library");
    this.libraryDomainsContainer = document.getElementById("library-domains-container");

    // Navigation Buttons (Next / Prev)
    this.btnNextBar = document.getElementById("btn-next-question-bar");
    this.btnNextTop = document.getElementById("btn-top-next");
    this.btnPrevTop = document.getElementById("btn-top-prev");
    this.btnNextBarText = document.getElementById("btn-next-bar-text");

    // Sub-modules
    this.engine = new InteractionEngine(
      this.arena,
      this.optionsContainer,
      this.feedbackBanner,
      document.getElementById("accessibility-pad")
    );

    this.editor = new QuestionEditor(
      document.getElementById("editor-view"),
      (updatedQ) => this.handleQuestionUpdated(updatedQ),
      (testQ) => this.playSingleQuestion(testQ)
    );

    this.analytics = new AnalyticsDashboard(
      document.getElementById("parent-view")
    );

    this.bindNavigation();
    this.bindLibraryEvents();
    this.bindA11yControls();
    this.initApp();
  }

  async initApp() {
    await this.loadTaxonomy();
    await this.loadQuestions();
  }

  async loadTaxonomy() {
    try {
      const res = await fetch("/api/taxonomy");
      if (res.ok) {
        this.taxonomy = await res.json();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (window.INITIAL_TAXONOMY) {
        this.taxonomy = window.INITIAL_TAXONOMY;
      } else {
        console.warn("Failed to load taxonomy:", err);
      }
    }
  }

  bindNavigation() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    this.btnNext.addEventListener("click", () => {
      this.nextQuestion();
    });

    this.btnNextBar?.addEventListener("click", () => {
      this.nextQuestion();
    });

    this.btnNextTop?.addEventListener("click", () => {
      this.nextQuestion();
    });

    this.btnPrevTop?.addEventListener("click", () => {
      this.prevQuestion();
    });

    this.muteBtn.addEventListener("click", () => {
      const isMuted = window.soundFx.toggleMute();
      this.muteBtn.textContent = isMuted ? "🔇" : "🔊";
    });
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex -= 1;
      this.renderCurrentQuestion();
    }
  }

  bindLibraryEvents() {
    this.btnOpenLibrary?.addEventListener("click", () => this.openLibrary());
    this.btnCloseLibrary?.addEventListener("click", () => this.closeLibrary());

    // Filter tab clicks in Library
    document.querySelectorAll(".lib-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".lib-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.libFilter = btn.dataset.filter || "all";
        this.renderLibrary();
      });
    });
  }

  bindA11yControls() {
    // Accessibility buttons A, B, C, D
    document.querySelectorAll(".a11y-opt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const optId = btn.dataset.opt;
        const q = this.questions[this.currentQuestionIndex];
        const opt = q.options.find(o => o.id === optId);
        if (opt) this.engine.selectOption(opt);
      });
    });

    // Nudge buttons
    document.getElementById("btn-nudge-left")?.addEventListener("click", () => this.engine.nudge(-8, 0));
    document.getElementById("btn-nudge-right")?.addEventListener("click", () => this.engine.nudge(8, 0));
    document.getElementById("btn-nudge-up")?.addEventListener("click", () => this.engine.nudge(0, -8));
    document.getElementById("btn-nudge-down")?.addEventListener("click", () => this.engine.nudge(0, 8));
    document.getElementById("btn-rotate")?.addEventListener("click", () => this.engine.rotatePiece(90));
    const handleReset = () => {
      this.engine.resetToStart();
      this.nextActionArea.classList.remove("show");
    };

    document.getElementById("btn-reset-piece")?.addEventListener("click", handleReset);
    document.getElementById("btn-quick-reset")?.addEventListener("click", handleReset);
  }

  async loadQuestions() {
    try {
      let all = [];
      try {
        const res = await fetch("/api/questions?approved_only=false");
        if (res.ok) {
          const data = await res.json();
          all = data.questions || [];
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (fetchErr) {
        if (window.INITIAL_QUESTIONS && Array.isArray(window.INITIAL_QUESTIONS)) {
          all = window.INITIAL_QUESTIONS;
        } else {
          throw fetchErr;
        }
      }
      this.allQuestions = all;

      // Filter approved for child mode
      let childList = all.filter(q => q.status === "APPROVED");
      if (childList.length === 0) {
        childList = all; // fallback if none approved yet
      }

      // Filter by active skill or domain if chosen
      if (this.activeSkill) {
        const filtered = childList.filter(q => (q.primary_group || "").toLowerCase() === this.activeSkill.toLowerCase());
        this.questions = filtered.length > 0 ? filtered : childList;
      } else if (this.activeDomain) {
        const filtered = childList.filter(q => (q.domain || "").toLowerCase() === this.activeDomain.toLowerCase());
        this.questions = filtered.length > 0 ? filtered : childList;
      } else {
        this.questions = childList;
      }

      // Initialize editor with all questions & taxonomy
      this.editor.loadQuestions(all, this.taxonomy);

      // Start child mode on question 0
      this.currentQuestionIndex = 0;
      this.sessionResults = [];
      this.renderCurrentQuestion();
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".nav-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.view === viewName);
    });

    document.querySelectorAll(".view-panel").forEach(panel => {
      panel.classList.remove("active");
    });

    if (viewName === "child") {
      document.getElementById("child-view").classList.add("active");
    } else if (viewName === "editor") {
      document.getElementById("editor-view").classList.add("active");
    } else if (viewName === "parent") {
      document.getElementById("parent-view").classList.add("active");
      this.analytics.loadAndRender(this.taxonomy);
    }
  }

  renderCurrentQuestion() {
    if (this.questions.length === 0) {
      this.instructionText.textContent = "Không có câu hỏi nào trong nhóm này.";
      this.arena.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #64748B;">
          <div style="font-size: 48px; margin-bottom: 12px;">📂</div>
          <h3 style="margin-bottom: 8px;">Chưa có bài tập phù hợp</h3>
          <p style="font-size: 14px; margin-bottom: 16px;">Vui lòng chọn nhóm kỹ năng khác hoặc quay về xem toàn bộ bài tập.</p>
          <button class="action-btn primary" id="btn-reset-filter" style="margin: 0 auto; display: inline-flex;">
            Xem tất cả bài tập
          </button>
        </div>
      `;
      document.getElementById("btn-reset-filter")?.addEventListener("click", () => {
        this.activeDomain = null;
        this.activeSkill = null;
        this.loadQuestions();
      });
      return;
    }

    const q = this.questions[this.currentQuestionIndex];
    this.instructionText.textContent = q.instruction || "Quan sát hình mẫu và kéo đáp án ở dưới lên để ướm thử nhé!";
    
    const groupName = this.activeSkill ? ` [${this.activeSkill}]` : '';
    this.progressText.textContent = `Câu ${this.currentQuestionIndex + 1} / ${this.questions.length}${groupName}`;

    // Update navigation button states
    if (this.btnPrevTop) {
      const isFirst = this.currentQuestionIndex === 0;
      this.btnPrevTop.disabled = isFirst;
      this.btnPrevTop.style.opacity = isFirst ? "0.35" : "1";
      this.btnPrevTop.style.cursor = isFirst ? "not-allowed" : "pointer";
    }

    if (this.btnNextTop) {
      const isLast = this.currentQuestionIndex >= this.questions.length - 1;
      this.btnNextTop.disabled = isLast;
      this.btnNextTop.style.opacity = isLast ? "0.35" : "1";
      this.btnNextTop.style.cursor = isLast ? "not-allowed" : "pointer";
    }

    if (this.btnNextBarText) {
      const isLast = this.currentQuestionIndex >= this.questions.length - 1;
      this.btnNextBarText.textContent = isLast ? "Hoàn thành bài học" : "Câu tiếp theo";
    }

    // Update Breadcrumb & Diagnostic Tags
    this.updateBreadcrumbs(q);

    // Render clickable dots
    this.dotsContainer.innerHTML = "";
    this.questions.forEach((_, idx) => {
      const dot = document.createElement("div");
      dot.className = `dot ${idx < this.currentQuestionIndex ? 'done' : (idx === this.currentQuestionIndex ? 'current' : '')}`;
      dot.title = `Chuyển tới câu ${idx + 1}`;
      dot.addEventListener("click", () => {
        this.currentQuestionIndex = idx;
        this.renderCurrentQuestion();
      });
      this.dotsContainer.appendChild(dot);
    });

    this.nextActionArea.classList.remove("show");

    // Initialize Engine with question
    this.engine.setQuestion(
      q,
      (telemetry) => {
        this.handleQuestionSolved(telemetry);
      },
      () => {
        this.nextActionArea.classList.remove("show");
      }
    );
  }

  updateBreadcrumbs(q) {
    if (!this.bcDomain) return;

    let domainIcon = "🧩";
    let skillIcon = "🎯";
    if (this.taxonomy && this.taxonomy.domains) {
      const d = this.taxonomy.domains.find(dom => dom.name.toLowerCase() === (q.domain || "").toLowerCase());
      if (d) {
        domainIcon = d.icon || domainIcon;
        const s = (d.skills || []).find(sk => sk.name.toLowerCase() === (q.primary_group || "").toLowerCase());
        if (s) skillIcon = s.icon || skillIcon;
      }
    }

    this.bcDomain.textContent = `${domainIcon} ${q.domain || "TƯ DUY KHÔNG GIAN"}`;
    this.bcSkill.textContent = `${skillIcon} ${q.primary_group || "Đối xứng"}`;
    this.bcType.textContent = q.question_type || "Hoàn thiện hình đối xứng";

    // Difficulty pill
    if (this.bcDifficulty) {
      const diff = q.difficulty || "Level 2 (Trung bình)";
      this.bcDifficulty.textContent = diff.split(" ")[0] || "Level 2";
      this.bcDifficulty.className = "difficulty-pill";
      if (diff.includes("1") || diff.toLowerCase().includes("dễ")) {
        this.bcDifficulty.classList.add("level-1");
      } else if (diff.includes("3") || diff.toLowerCase().includes("thử thách")) {
        this.bcDifficulty.classList.add("level-3");
      } else {
        this.bcDifficulty.classList.add("level-2");
      }
    }

    // Diagnostic tag chips
    if (this.bcTags) {
      this.bcTags.innerHTML = "";
      const tags = q.diagnostic_tags || [];
      tags.slice(0, 3).forEach(tag => {
        const chip = document.createElement("span");
        chip.className = "diag-tag-chip";
        chip.textContent = tag;
        this.bcTags.appendChild(chip);
      });
    }
  }

  openLibrary() {
    this.renderLibrary();
    this.libraryModal?.classList.add("active");
  }

  closeLibrary() {
    this.libraryModal?.classList.remove("active");
  }

  renderLibrary() {
    if (!this.libraryDomainsContainer) return;
    this.libraryDomainsContainer.innerHTML = "";

    const approved = this.allQuestions.filter(q => q.status === "APPROVED");
    const baseQuestions = approved.length > 0 ? approved : this.allQuestions;

    // "Tất cả bài tập" master card
    const allCardWrapper = document.createElement("div");
    allCardWrapper.style.marginBottom = "14px";
    allCardWrapper.innerHTML = `
      <div class="skill-select-card ${!this.activeSkill && !this.activeDomain ? 'active' : ''} has-items" style="max-width: 240px; background: ${!this.activeSkill && !this.activeDomain ? '#DBEAFE' : '#FFFFFF'};">
        <span class="skill-card-name">🌟 Tất cả bài tập</span>
        <span class="skill-card-count">${baseQuestions.length} bài</span>
      </div>
    `;
    allCardWrapper.querySelector(".skill-select-card").addEventListener("click", () => {
      this.activeDomain = null;
      this.activeSkill = null;
      this.loadQuestions();
      this.closeLibrary();
    });
    this.libraryDomainsContainer.appendChild(allCardWrapper);

    const domains = this.taxonomy?.domains || [];
    domains.forEach(dom => {
      const domQuestions = baseQuestions.filter(q => (q.domain || "").toLowerCase() === dom.name.toLowerCase());
      
      const domSection = document.createElement("div");
      domSection.className = "library-domain-section";
      
      domSection.innerHTML = `
        <div class="domain-section-title">
          <span>${dom.icon || "📁"}</span>
          <span>${dom.name}</span>
          <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: none; margin-left: 6px;">(${domQuestions.length} bài)</span>
        </div>
        <div class="skills-grid" id="grid-${dom.id}"></div>
      `;

      const grid = domSection.querySelector(`#grid-${dom.id}`);

      (dom.skills || []).forEach(skill => {
        let skillQuestions = baseQuestions.filter(q => (q.primary_group || "").toLowerCase() === skill.name.toLowerCase());

        let displayCount = skillQuestions.length;
        if (this.libFilter === "unsolved") {
          displayCount = skillQuestions.filter(q => !this.solvedQuestionIds.has(q.id)).length;
        } else if (this.libFilter === "solved") {
          displayCount = skillQuestions.filter(q => this.solvedQuestionIds.has(q.id)).length;
        }

        const isCurrentActive = (this.activeSkill || "").toLowerCase() === skill.name.toLowerCase();

        const card = document.createElement("div");
        card.className = `skill-select-card ${isCurrentActive ? 'active' : ''} ${displayCount > 0 ? 'has-items' : ''}`;
        card.innerHTML = `
          <span class="skill-card-name">
            <span>${skill.icon || "🎯"}</span>
            <span>${skill.name}</span>
          </span>
          <span class="skill-card-count">${displayCount} bài</span>
        `;

        card.addEventListener("click", () => {
          this.activeDomain = dom.name;
          this.activeSkill = skill.name;
          this.loadQuestions();
          this.closeLibrary();
        });

        grid.appendChild(card);
      });

      this.libraryDomainsContainer.appendChild(domSection);
    });
  }

  handleQuestionSolved(telemetry) {
    const q = this.questions[this.currentQuestionIndex];
    if (q) {
      telemetry.questionTitle = q.title;
      telemetry.domain = q.domain;
      telemetry.primary_group = q.primary_group;
      telemetry.diagnostic_tags = q.diagnostic_tags;
      this.solvedQuestionIds.add(q.id);
      try {
        localStorage.setItem("agy_solved_questions", JSON.stringify(Array.from(this.solvedQuestionIds)));
      } catch (e) {}
    }
    this.sessionResults.push(telemetry);

    // Show Next button
    this.nextActionArea.classList.add("show");
  }

  nextQuestion() {
    this.currentQuestionIndex += 1;
    if (this.currentQuestionIndex < this.questions.length) {
      this.renderCurrentQuestion();
    } else {
      this.showSessionCompleted();
    }
  }

  async showSessionCompleted() {
    // Save session to backend
    const sessionData = {
      id: `sess_${Date.now()}`,
      timestamp: new Date().toISOString(),
      results: this.sessionResults,
      totalDurationSeconds: Math.round((Date.now() - this.sessionStartTime) / 1000)
    };

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData)
      });
    } catch (e) {
      console.warn("Failed to save session:", e);
    }

    // Render completion celebration in arena
    const activeGroupName = this.activeSkill ? ` [Kỹ năng: ${this.activeSkill}]` : '';
    this.arena.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 64px; margin-bottom: 16px;">🏆</div>
        <h2 style="font-size: 26px; color: #10B981; margin-bottom: 8px;">Tuyệt vời! Bé đã hoàn thành bài học${activeGroupName}!</h2>
        <p style="color: #64748B; font-size: 16px; margin-bottom: 24px;">
          Bé đã tự mình quan sát và ghép khớp chính xác ${this.questions.length} / ${this.questions.length} bài tập.
        </p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          <button class="btn-next-question" id="btn-restart" style="width: auto; padding: 12px 28px;">
            🔄 Luyện tập lại nhóm này
          </button>
          <button class="action-btn" id="btn-all-skills" style="padding: 12px 20px; font-size: 15px; font-weight: 700;">
            📚 Mở Thư viện Kỹ năng
          </button>
          <button class="action-btn" id="btn-view-stats" style="padding: 12px 20px; font-size: 15px;">
            📊 Xem phân tích (Phụ huynh)
          </button>
        </div>
      </div>
    `;

    document.getElementById("btn-restart")?.addEventListener("click", () => {
      this.currentQuestionIndex = 0;
      this.sessionResults = [];
      this.sessionStartTime = Date.now();
      this.renderCurrentQuestion();
    });

    document.getElementById("btn-all-skills")?.addEventListener("click", () => {
      this.openLibrary();
    });

    document.getElementById("btn-view-stats")?.addEventListener("click", () => {
      this.switchView("parent");
    });

    this.optionsContainer.innerHTML = "";
    this.feedbackBanner.className = "feedback-banner level-3";
    this.feedbackBanner.innerHTML = "<span>🎉 Hoàn thành xuất sắc tất cả bài tập!</span>";
    this.nextActionArea.classList.remove("show");
  }

  handleQuestionUpdated(updatedQ) {
    this.loadQuestions();
  }

  playSingleQuestion(q) {
    this.questions = [q];
    this.currentQuestionIndex = 0;
    this.switchView("child");
    this.renderCurrentQuestion();
  }
}

// Boot app on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new AppController();
});
