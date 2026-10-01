/**
 * Interaction Engine: Drag & Drop, Touch Pointer Events, Snap Logic, Visual Comparison
 */
class InteractionEngine {
  constructor(arenaElement, optionsContainer, feedbackElement, a11yControls) {
    this.arena = arenaElement;
    this.optionsContainer = optionsContainer;
    this.feedback = feedbackElement;
    this.a11yControls = a11yControls;

    this.currentQuestion = null;
    this.activeOption = null;
    this.pieceState = {
      x: 0,
      y: 0,
      rotation: 0,
      isDragging: false,
      isSnapping: false,
      isMatched: false
    };

    this.dragStartOffset = { x: 0, y: 0 };
    this.telemetry = {
      attempts: 0,
      triedOptions: [],
      startTime: Date.now(),
      positionsHistory: []
    };

    this.onMatchSuccessCallback = null;
    this.onResetCallback = null;
    this.initGlobalListeners();
  }

  setQuestion(question, onMatchSuccess, onReset) {
    this.currentQuestion = question;
    this.onMatchSuccessCallback = onMatchSuccess;
    this.onResetCallback = onReset;
    this.activeOption = null;
    this.pieceState = {
      x: 0,
      y: 0,
      rotation: 0,
      isDragging: false,
      isSnapping: false,
      isMatched: false
    };

    this.telemetry = {
      questionId: question.id,
      attempts: 0,
      triedOptions: [],
      startTime: Date.now(),
      positionsHistory: [],
      success: false,
      durationSeconds: 0
    };

    this.renderArena();
    this.renderOptionsShelf();
    this.setFeedbackLevel(1, "Hãy quan sát hình mẫu và kéo một đáp án ở dưới lên để thử nhé!");
  }

  renderArena() {
    this.arena.innerHTML = VectorRenderer.renderTargetCanvas(
      this.currentQuestion,
      this.activeOption,
      this.pieceState
    );
    this.attachArenaListeners();
  }

  attachArenaListeners() {
    // 1. Direct drag on placed piece inside arena
    const draggedGroup = this.arena.querySelector("#canvas-dragged-group");
    if (draggedGroup) {
      draggedGroup.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.pieceState.isMatched) return;
        this.startDrag(e, false);
      });
    }

    // 2. Direct tap/drag on option cards printed inside the worksheet image
    const hotspots = this.arena.querySelectorAll(".worksheet-opt-hotspot");
    hotspots.forEach(hs => {
      hs.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.pieceState.isMatched) return;
        const optId = hs.dataset.optId;
        const opt = this.currentQuestion.options.find(o => o.id === optId);
        if (opt) {
          this.handleOptionPointerDown(e, opt, true);
        }
      });
    });
  }

  renderOptionsShelf() {
    this.optionsContainer.innerHTML = "";
    this.currentQuestion.options.forEach(opt => {
      const card = document.createElement("div");
      card.className = `option-card ${this.activeOption?.id === opt.id ? 'selected' : ''}`;
      card.dataset.optionId = opt.id;

      card.innerHTML = `
        <div class="option-thumbnail">
          ${VectorRenderer.renderOptionThumbnail(opt)}
        </div>
      `;

      // Touch & Mouse Pointer listeners
      card.addEventListener("pointerdown", (e) => this.handleOptionPointerDown(e, opt, false));
      this.optionsContainer.appendChild(card);
    });
  }

  selectOption(opt, initialX = null, initialY = null) {
    if (this.pieceState.isMatched) return;

    this.activeOption = opt;
    if (!this.telemetry.triedOptions.includes(opt.id)) {
      this.telemetry.triedOptions.push(opt.id);
    }

    // Default placement on canvas if none provided
    const dropZone = this.currentQuestion.drop_zone || this.currentQuestion.snap_zone;
    const targetX = dropZone.x ?? dropZone.target_x ?? 370;
    const targetY = dropZone.y ?? dropZone.target_y ?? 120;

    this.pieceState.x = initialX !== null ? initialX : (targetX + 35);
    this.pieceState.y = initialY !== null ? initialY : (targetY + 45);
    this.pieceState.rotation = opt.initial_rotation || 0;
    this.pieceState.isMatched = false;
    this.pieceState.isSnapping = false;

    // Update shelf selection styling
    const cards = this.optionsContainer.querySelectorAll(".option-card");
    cards.forEach(c => {
      c.classList.toggle("selected", c.dataset.optionId === opt.id);
    });

    window.soundFx.playPop();
    this.renderArena();
  }

  handleOptionPointerDown(e, opt, fromHotspot = false) {
    e.preventDefault();
    if (this.pieceState.isMatched) return;

    this.selectOption(opt);

    if (fromHotspot) {
      this.startDrag(e, false);
    } else {
      this.pendingShelfDrag = {
        opt: opt,
        startX: e.clientX,
        startY: e.clientY
      };
    }
  }

  startDrag(e, fromCenter = false) {
    this.pieceState.isDragging = true;
    const stage = this.arena.querySelector(".worksheet-stage") || this.arena;
    const stageRect = stage.getBoundingClientRect();
    const origW = this.currentQuestion.original_width || 715;
    const origH = this.currentQuestion.original_height || 713;

    // Scale ratio between screen pixels and original image coordinates
    const scaleX = origW / (stageRect.width || 1);
    const scaleY = origH / (stageRect.height || 1);

    const pointerCanvasX = (e.clientX - stageRect.left) * scaleX;
    const pointerCanvasY = (e.clientY - stageRect.top) * scaleY;

    const dz = this.currentQuestion.drop_zone;
    const pw = dz ? dz.width : 290;
    const ph = dz ? dz.height : 356;

    if (fromCenter) {
      this.pieceState.x = pointerCanvasX - pw / 2;
      this.pieceState.y = pointerCanvasY - ph / 2;
      this.dragStartOffset = { x: pw / 2, y: ph / 2 };
    } else {
      this.dragStartOffset = {
        x: pointerCanvasX - this.pieceState.x,
        y: pointerCanvasY - this.pieceState.y
      };
    }

    this.setFeedbackLevel(1, this.currentQuestion.feedback.level1 || "Bé đang di chuyển hình để ướm thử...");
    this.updateDraggedPosition();
  }

  updateDraggedPosition() {
    const group = this.arena.querySelector("#canvas-dragged-group");
    if (group) {
      group.setAttribute("transform", `translate(${this.pieceState.x}, ${this.pieceState.y})`);
    }

    // Dynamic ghost drop zone highlight
    const ghost = this.arena.querySelector(".ghost-drop-zone rect");
    const ghostText = this.arena.querySelector(".ghost-drop-zone text");
    const dz = this.currentQuestion.drop_zone;
    if (ghost && dz) {
      const dx = Math.abs(this.pieceState.x - dz.x);
      const dy = Math.abs(this.pieceState.y - dz.y);
      const isNear = Math.hypot(dx, dy) < (dz.tolerance * 2.5);
      ghost.setAttribute("stroke", isNear ? "#3B82F6" : "rgba(100, 116, 139, 0.4)");
      ghost.setAttribute("fill", isNear ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.05)");
      ghost.setAttribute("stroke-width", isNear ? "3.5" : "2");
      if (ghostText) ghostText.style.display = isNear ? "block" : "none";
    }
  }

  initGlobalListeners() {
    // Pointer move across document
    window.addEventListener("pointermove", (e) => {
      if (this.pendingShelfDrag) {
        const moved = Math.hypot(e.clientX - this.pendingShelfDrag.startX, e.clientY - this.pendingShelfDrag.startY);
        if (moved > 6) {
          this.pendingShelfDrag = null;
          this.startDrag(e, true);
        }
      }

      if (!this.pieceState.isDragging || !this.activeOption || this.pieceState.isMatched) return;
      e.preventDefault();

      const stage = this.arena.querySelector(".worksheet-stage") || this.arena;
      const stageRect = stage.getBoundingClientRect();
      const origW = this.currentQuestion.original_width || 715;
      const origH = this.currentQuestion.original_height || 713;

      const scaleX = origW / (stageRect.width || 1);
      const scaleY = origH / (stageRect.height || 1);

      const currentCanvasX = (e.clientX - stageRect.left) * scaleX;
      const currentCanvasY = (e.clientY - stageRect.top) * scaleY;

      // Update position with boundary bounds
      const nextX = currentCanvasX - this.dragStartOffset.x;
      const nextY = currentCanvasY - this.dragStartOffset.y;

      // Constrain inside original canvas
      this.pieceState.x = Math.max(-50, Math.min(origW - 40, nextX));
      this.pieceState.y = Math.max(-50, Math.min(origH - 40, nextY));

      this.updateDraggedPosition();
    });

    // Pointer up / drop
    window.addEventListener("pointerup", (e) => {
      this.pendingShelfDrag = null;
      if (!this.pieceState.isDragging) return;
      this.pieceState.isDragging = false;
      this.evaluateAlignment();
    });

    // Keyboard Accessibility Alternative
    window.addEventListener("keydown", (e) => {
      if (!this.activeOption || this.pieceState.isMatched) return;
      const step = e.shiftKey ? 15 : 4;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.nudge(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.nudge(step, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.nudge(0, -step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.nudge(0, step);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        this.rotatePiece(90);
      }
    });
  }

  nudge(dx, dy) {
    if (this.pieceState.isMatched || !this.activeOption) return;
    this.pieceState.x += dx;
    this.pieceState.y += dy;
    window.soundFx.playNudge();
    this.renderArena();
    this.evaluateAlignment(false); // test without counting full attempt unless close
  }

  rotatePiece(deg) {
    if (this.pieceState.isMatched || !this.activeOption) return;
    this.pieceState.rotation = (this.pieceState.rotation + deg) % 360;
    window.soundFx.playPop();
    this.renderArena();
    this.evaluateAlignment();
  }

  evaluateAlignment(recordAttempt = true) {
    if (!this.activeOption || this.pieceState.isMatched) return;

    if (recordAttempt) {
      this.telemetry.attempts += 1;
      this.telemetry.positionsHistory.push({
        option: this.activeOption.id,
        x: Math.round(this.pieceState.x),
        y: Math.round(this.pieceState.y),
        rotation: this.pieceState.rotation,
        timestamp: Date.now()
      });
    }

    const dropZone = this.currentQuestion.drop_zone || this.currentQuestion.snap_zone;
    const targetX = dropZone.x ?? dropZone.target_x ?? 370;
    const targetY = dropZone.y ?? dropZone.target_y ?? 120;
    const tolerance = this.currentQuestion.interaction_rules?.snap_distance || dropZone.tolerance || 35.0;

    const dx = Math.abs(this.pieceState.x - targetX);
    const dy = Math.abs(this.pieceState.y - targetY);
    const dist = Math.hypot(dx, dy);

    // Rotation check (if applicable)
    const rotDiff = Math.abs(this.pieceState.rotation - (dropZone.target_rotation || 0)) % 360;
    const rotMatched = !this.currentQuestion.interaction_rules?.rotation_enabled || rotDiff < (dropZone.rotation_tolerance || 15.0);

    // Check if within snap distance
    if (dist <= tolerance && rotMatched) {
      if (this.activeOption.is_correct) {
        // MATCHED LEVEL 3!
        this.triggerMatchSuccess();
      } else {
        // Close but wrong option! Child sees the visual clash!
        window.soundFx.playSoftHint();
        const reason = this.activeOption.mismatch_reason || "Đường nối và màu sắc chưa trùng khớp với hình mẫu.";
        this.setFeedbackLevel(2, `Gần khít rồi, nhưng hãy quan sát: ${reason}`);
        this.renderArena();
      }
    } else {
      // Level 2: Released but not near slot
      if (dist < tolerance * 2.5) {
        this.setFeedbackLevel(2, "Bé hãy di chuyển vào sát trục ranh giới thêm một chút nữa nhé!");
      } else {
        this.setFeedbackLevel(2, this.currentQuestion.feedback.level2 || "Thử quan sát kỹ đường nối và màu sắc xem đã khớp chưa nhé!");
      }
      this.renderArena();
    }
  }

  triggerMatchSuccess() {
    this.pieceState.isSnapping = true;
    this.pieceState.isMatched = true;

    // Smooth magnetic snap to exact coordinate
    const dropZone = this.currentQuestion.drop_zone || this.currentQuestion.snap_zone;
    this.pieceState.x = dropZone.x ?? dropZone.target_x ?? 370;
    this.pieceState.y = dropZone.y ?? dropZone.target_y ?? 120;
    this.pieceState.rotation = dropZone.target_rotation || 0;

    this.telemetry.success = true;
    this.telemetry.durationSeconds = Math.round((Date.now() - this.telemetry.startTime) / 1000);

    window.soundFx.playSnapSuccess();
    this.setFeedbackLevel(3, this.currentQuestion.feedback.level3 || "Khớp rồi! Bé làm rất giỏi! ✨");

    // Lock option card
    const card = this.optionsContainer.querySelector(`[data-option-id="${this.activeOption.id}"]`);
    if (card) card.classList.add("matched");

    this.renderArena();

    if (this.onMatchSuccessCallback) {
      this.onMatchSuccessCallback(this.telemetry);
    }
  }

  setFeedbackLevel(level, text) {
    this.feedback.className = `feedback-banner level-${level}`;
    let icon = "👀";
    if (level === 2) icon = "💡";
    if (level === 3) icon = "🎉";
    this.feedback.innerHTML = `<span>${icon} ${text}</span>`;
  }

  resetToStart() {
    this.activeOption = null;
    this.pieceState = {
      x: 0,
      y: 0,
      rotation: 0,
      isDragging: false,
      isSnapping: false,
      isMatched: false
    };

    // Remove selection & matched classes from all option cards
    const cards = this.optionsContainer.querySelectorAll(".option-card");
    cards.forEach(c => {
      c.classList.remove("selected", "matched");
    });

    // Reset feedback banner to initial prompt
    this.setFeedbackLevel(1, "Bé hãy chọn và kéo một đáp án ở dưới lên để ướm thử nhé!");

    // Play soft pop sound
    window.soundFx.playPop();

    // Re-render empty arena (no piece selected)
    this.renderArena();

    // Trigger external reset callback if registered
    if (this.onResetCallback) {
      this.onResetCallback();
    }
  }

  // Alias for backward compatibility
  resetCurrentPiece() {
    this.resetToStart();
  }
}

window.InteractionEngine = InteractionEngine;
