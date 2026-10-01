/**
 * Question Editor & Human-in-the-Loop Review Dashboard
 * Requirement 9: Review, Edit, Approve questions before they enter Child Mode.
 */
class QuestionEditor {
  constructor(container, onQuestionUpdated, onTestPlay) {
    this.container = container;
    this.onQuestionUpdated = onQuestionUpdated;
    this.onTestPlay = onTestPlay;
    this.questions = [];
    this.currentQ = null;
    this.debugToggles = { target: true, drop: true, answers: true, coords: true };
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="editor-layout">
        <!-- Sidebar: List of questions -->
        <div class="editor-sidebar">
          <div class="editor-list-header">
            <span>Danh sách bài tập</span>
            <button class="action-btn primary" id="btn-open-upload">➕ Tải file lên</button>
          </div>
          <div class="question-list-items" id="editor-q-list">
            <!-- Rendered by JS -->
          </div>
        </div>

        <!-- Main Editor Area -->
        <div class="editor-main" id="editor-details">
          <div style="text-align:center; padding: 40px; color: #94A3B8;">
            Chọn một câu hỏi từ danh sách bên trái hoặc tải file mới lên để biên tập.
          </div>
        </div>
      </div>

      <!-- Upload Modal -->
      <div class="modal-overlay" id="upload-modal">
        <div class="modal-box">
          <h3 style="margin-bottom: 8px;">Tải lên hoặc Dán Hình Bài tập</h3>
          <p style="color: #64748B; font-size: 14px; margin-bottom: 16px;">
            Hỗ trợ kéo thả file, chụp ảnh màn hình rồi <strong>nhấn Ctrl + V để dán</strong>, hoặc chọn file từ máy tính.
          </p>
          <div class="dropzone" id="file-dropzone" tabindex="0">
            <input type="file" id="file-input" accept="image/*,application/pdf" style="display:none;" />
            <div style="font-size: 38px; margin-bottom: 8px;">📂 📋</div>
            <div style="font-weight: 700; font-size: 15px; color: #1E293B;">
              Kéo thả file vào đây, hoặc nhấn <kbd style="background:#E2E8F0; padding:2px 8px; border-radius:4px; font-family:inherit; border:1px solid #CBD5E1;">Ctrl + V</kbd> để dán ảnh
            </div>
            <div style="font-size: 12px; color: #64748B; margin-top: 6px;">
              Hỗ trợ ảnh chụp màn hình (Screenshot), PNG, JPG, PDF (tối đa 25MB)
            </div>
            <div style="margin-top: 14px;">
              <button type="button" class="action-btn" id="btn-paste-clipboard" style="margin: 0 auto; display: inline-flex; font-size: 13px; font-weight: 600;">
                📋 Dán ảnh từ Clipboard
              </button>
            </div>
          </div>
          <div id="upload-status" style="font-size: 13px; color: #2563EB; font-weight: 600; margin-bottom: 12px; display: none;"></div>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="action-btn" id="btn-close-upload">Đóng</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const uploadModal = document.getElementById("upload-modal");
    const openBtn = document.getElementById("btn-open-upload");
    const closeBtn = document.getElementById("btn-close-upload");
    const dropzone = document.getElementById("file-dropzone");
    const fileInput = document.getElementById("file-input");
    const pasteBtn = document.getElementById("btn-paste-clipboard");

    openBtn.addEventListener("click", () => {
      uploadModal.classList.add("active");
    });

    closeBtn.addEventListener("click", () => {
      uploadModal.classList.remove("active");
    });

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.background = "#DBEAFE";
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.style.background = "#EFF6FF";
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.background = "#EFF6FF";
      if (e.dataTransfer.files.length > 0) {
        this.uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        this.uploadFile(fileInput.files[0]);
      }
    });

    // 📋 Clipboard Paste via "Dán ảnh từ Clipboard" Button
    pasteBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        if (navigator.clipboard && navigator.clipboard.read) {
          const items = await navigator.clipboard.read();
          let foundImage = false;
          for (const item of items) {
            const imageType = item.types.find(t => t.startsWith("image/"));
            if (imageType) {
              const blob = await item.getType(imageType);
              const file = new File([blob], `screenshot_${Date.now()}.png`, { type: imageType });
              this.uploadFile(file);
              foundImage = true;
              break;
            }
          }
          if (!foundImage) {
            alert("Chưa tìm thấy ảnh trong Clipboard! Bé/Thầy cô hãy chụp ảnh màn hình (phím Windows + Shift + S) rồi bấm lại nhé.");
          }
        } else {
          alert("Trình duyệt khuyến nghị nhấn trực tiếp tổ hợp phím Ctrl + V để dán ảnh.");
        }
      } catch (err) {
        console.warn("Clipboard read error:", err);
        alert("Để bảo mật, trình duyệt yêu cầu bạn nhấn trực tiếp phím Ctrl + V trên bàn phím để dán ảnh.");
      }
    });

    // 📋 Global Paste Handler (Ctrl + V)
    window.addEventListener("paste", (e) => {
      // Don't intercept if user is typing text into an input or textarea (unless there's an image in clipboard)
      const targetTag = e.target.tagName?.toLowerCase();
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      let imageFile = null;
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf("image") !== -1) {
          imageFile = clipboardItems[i].getAsFile();
          break;
        }
      }

      if (imageFile) {
        // If image found, always process upload
        e.preventDefault();
        uploadModal.classList.add("active");
        this.uploadFile(imageFile);
      }
    });
  }

  async loadQuestions(questions, taxonomy = null) {
    this.questions = questions;
    if (taxonomy) {
      this.taxonomy = taxonomy;
    } else if (!this.taxonomy) {
      try {
        const res = await fetch("/api/taxonomy");
        this.taxonomy = await res.json();
      } catch (e) {
        console.warn("Failed to load taxonomy in editor:", e);
      }
    }
    this.renderQuestionList();
    if (this.questions.length > 0 && !this.currentQ) {
      this.selectQuestion(this.questions[0]);
    }
  }

  renderQuestionList() {
    const listEl = document.getElementById("editor-q-list");
    listEl.innerHTML = "";

    this.questions.forEach(q => {
      const item = document.createElement("div");
      item.className = `q-list-item ${this.currentQ?.id === q.id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="q-list-title">${q.title}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px; margin-top: 4px;">
          <span style="font-size: 11px; background: #EFF6FF; color: #1D4ED8; font-weight: 700; padding: 1px 6px; border-radius: 4px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${q.primary_group || 'Chưa nhóm'}
          </span>
          <span class="status-badge ${q.status}">${q.status === 'APPROVED' ? 'Đã duyệt' : (q.status === 'NEEDS_REVIEW' ? 'Cần duyệt' : 'Bản nháp')}</span>
        </div>
      `;
      item.addEventListener("click", () => this.selectQuestion(q));
      listEl.appendChild(item);
    });
  }

  selectQuestion(q) {
    this.currentQ = JSON.parse(JSON.stringify(q)); // clone
    this.renderQuestionList();
    this.renderEditorForm();
  }

  renderEditorForm() {
    const details = document.getElementById("editor-details");
    const q = this.currentQ;
    if (!q) return;

    const domains = this.taxonomy?.domains || [];
    const currentDomain = q.domain || (domains[0] ? domains[0].name : "TƯ DUY KHÔNG GIAN");
    const domainObj = domains.find(d => d.name.toLowerCase() === currentDomain.toLowerCase()) || domains[0];
    const skills = domainObj?.skills || [];
    const currentSkill = q.primary_group || (skills[0] ? skills[0].name : "Đối xứng");
    const skillObj = skills.find(s => s.name.toLowerCase() === currentSkill.toLowerCase()) || skills[0];
    const skillTypes = skillObj?.types || ["Hoàn thiện hình đối xứng", "Chọn hình đối xứng"];

    const allDiagTags = this.taxonomy?.diagnostic_tags || [
      { id: "visual_spatial_reasoning", name: "Visual-Spatial Reasoning" },
      { id: "symmetry", name: "Symmetry" },
      { id: "visual_comparison", name: "Visual Comparison" },
      { id: "working_memory", name: "Working Memory" },
      { id: "pattern_recognition", name: "Pattern Recognition" },
      { id: "mental_rotation", name: "Mental Rotation" },
      { id: "fine_motor_precision", name: "Fine Motor / Precision" }
    ];

    const allSecSkills = this.taxonomy?.secondary_skills || [
      "Tư duy không gian", "Quan sát & So sánh", "Nhận diện chi tiết", "Tư duy đối xứng",
      "Nhận diện màu sắc", "Nhận diện đường cong", "Phối hợp tay - mắt", "Khả năng tập trung"
    ];

    const difficultyList = this.taxonomy?.difficulty_levels || ["Level 1 (Dễ)", "Level 2 (Trung bình)", "Level 3 (Thử thách)"];
    const ageRangeList = this.taxonomy?.age_ranges || ["4–5 tuổi", "5–6 tuổi", "5–7 tuổi", "6–7 tuổi", "7–9 tuổi"];
    const interactionList = this.taxonomy?.interaction_types || [
      "Drag & Drop (Kéo - Thả)", "Tap & Snap (Chạm & Hút)", "Rotate & Match (Xoay & Ghép)", "Multiple Choice (Bấm chọn)"
    ];

    const currentTags = new Set(q.diagnostic_tags || []);
    const currentSec = new Set(q.secondary_skills || []);

    details.innerHTML = `
      <div class="editor-toolbar">
        <div>
          <h2 style="font-size: 20px; font-weight: 700;">${q.title}</h2>
          <span class="status-badge ${q.status}" id="editor-status-badge">Trạng thái: ${q.status}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="action-btn success" id="btn-approve">✓ Phê duyệt (APPROVE)</button>
          <button class="action-btn primary" id="btn-save-draft">💾 Lưu bài tập</button>
          <button class="action-btn" id="btn-test-play">🎮 Thử chơi ngay</button>
        </div>
      </div>

      <div class="editor-split-view">
        <!-- Visual Previews (100% Original Image as Source of Truth) -->
        <div class="editor-canvas-box">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
            <h4 style="font-size: 15px; font-weight: 700; color: #1E293B;">Original Question Preview (Ảnh gốc & Bounding Box)</h4>
            <span style="font-size: 11px; background: #DCFCE7; color: #15803D; font-weight: 700; padding: 2px 8px; border-radius: 12px;">100% Ảnh Gốc</span>
          </div>

          <!-- Interactive Debug Layer Checkboxes (Requirement 9) -->
          <div style="display: flex; flex-wrap: wrap; gap: 12px; background: #F1F5F9; padding: 8px 12px; border-radius: 6px; width: 100%; margin-bottom: 12px; font-size: 12px; font-weight: 600;">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #1D4ED8;">
              <input type="checkbox" id="chk-debug-target" ${this.debugToggles.target ? 'checked' : ''} />
              <span>Target Region</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #047857;">
              <input type="checkbox" id="chk-debug-drop" ${this.debugToggles.drop ? 'checked' : ''} />
              <span>Drop Zone (Slot)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #7E22CE;">
              <input type="checkbox" id="chk-debug-answers" ${this.debugToggles.answers ? 'checked' : ''} />
              <span>Answer Regions</span>
            </label>
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #475569;">
              <input type="checkbox" id="chk-debug-coords" ${this.debugToggles.coords ? 'checked' : ''} />
              <span>Tọa độ Bounding Box</span>
            </label>
          </div>

          <!-- 100% ORIGINAL UPLOADED IMAGE WITH IMMUTABLE FIDELITY -->
          <div id="editor-stage-wrapper" style="width: 100%; max-width: 480px; border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
            ${VectorRenderer.renderEditorPreview(q, this.debugToggles)}
          </div>
        </div>

        <!-- Meta Editor Controls & 3-Tier Classification -->
        <div>
          <div class="editor-form-group">
            <label>Tiêu đề bài tập</label>
            <input type="text" class="editor-input" id="inp-title" value="${q.title}" />
          </div>

          <div class="editor-form-group">
            <label>Lời hướng dẫn cho trẻ</label>
            <textarea class="editor-textarea" rows="2" id="inp-instruction">${q.instruction}</textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="editor-form-group">
              <label>Đáp án đúng</label>
              <select class="editor-select" id="inp-correct-opt">
                ${q.options.map(o => `<option value="${o.id}" ${o.is_correct ? 'selected' : ''}>Đáp án ${o.label}</option>`).join('')}
              </select>
            </div>
            <div class="editor-form-group">
              <label>Bán kính Snap (Tolerance px)</label>
              <input type="number" class="editor-input" id="inp-tolerance" value="${(q.drop_zone && q.drop_zone.tolerance) || (q.snap_zone && q.snap_zone.tolerance) || 35}" />
            </div>
          </div>

          <!-- Bounding Boxes Fine-tuning -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-top: 10px;">
            <h5 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #334155;">📐 Tinh chỉnh Bounding Boxes (Tọa độ ảnh gốc)</h5>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #1D4ED8;">Target Box [x, y, w, h]</label>
                <div style="display: flex; gap: 4px; margin-top: 2px;">
                  <input type="number" class="editor-input bbox-inp" id="inp-tb-x" value="${q.target_bbox?.x || 70}" title="X" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-tb-y" value="${q.target_bbox?.y || 120}" title="Y" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-tb-w" value="${q.target_bbox?.width || 300}" title="Width" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-tb-h" value="${q.target_bbox?.height || 350}" title="Height" style="padding: 4px;" />
                </div>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 600; color: #047857;">Drop Zone [x, y, w, h]</label>
                <div style="display: flex; gap: 4px; margin-top: 2px;">
                  <input type="number" class="editor-input bbox-inp" id="inp-dz-x" value="${q.drop_zone?.x || 370}" title="X" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-dz-y" value="${q.drop_zone?.y || 120}" title="Y" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-dz-w" value="${q.drop_zone?.width || 290}" title="Width" style="padding: 4px;" />
                  <input type="number" class="editor-input bbox-inp" id="inp-dz-h" value="${q.drop_zone?.height || 350}" title="Height" style="padding: 4px;" />
                </div>
              </div>
            </div>
          </div>

          <!-- 3-TIER SKILL TAXONOMY & METADATA CARD -->
          <div class="metadata-3tier-box">
            <div class="metadata-section-heading">
              <span>🏷️</span> Phân Loại 3 Cấp & Nhãn Năng Lực (Taxonomy)
            </div>

            <!-- Tier 1 & Tier 2 Dropdowns -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="editor-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label>Lĩnh vực (Domain - Tier 1)</label>
                  <button type="button" class="action-btn" id="btn-add-domain" style="padding: 1px 6px; font-size: 11px; font-weight: 700;">+ Thêm</button>
                </div>
                <select class="editor-select" id="inp-domain">
                  ${domains.map(d => `<option value="${d.name}" ${d.name.toLowerCase() === currentDomain.toLowerCase() ? 'selected' : ''}>${d.icon || '📁'} ${d.name}</option>`).join('')}
                </select>
              </div>

              <div class="editor-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label>Nhóm Kỹ năng (Skill - Tier 2)</label>
                  <button type="button" class="action-btn" id="btn-add-skill" style="padding: 1px 6px; font-size: 11px; font-weight: 700;">+ Thêm</button>
                </div>
                <select class="editor-select" id="inp-primary-group">
                  ${skills.map(s => `<option value="${s.name}" ${s.name.toLowerCase() === currentSkill.toLowerCase() ? 'selected' : ''}>${s.icon || '🎯'} ${s.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Tier 3: Question Type (Dạng bài tập) -->
            <div class="editor-form-group">
              <label>Dạng bài tập cụ thể (Question Type - Tier 3)</label>
              <input type="text" class="editor-input" id="inp-question-type" list="dl-question-types" value="${q.question_type || ''}" placeholder="VD: Hoàn thiện hình đối xứng, Xoay 90°..." />
              <datalist id="dl-question-types">
                ${skillTypes.map(t => `<option value="${t}">`).join('')}
              </datalist>
            </div>

            <!-- Diagnostic Tags -->
            <div class="editor-form-group" style="margin-top: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <label>Nhãn Năng Lực Đánh Giá (Diagnostic Tags):</label>
                <button type="button" class="action-btn" id="btn-add-diag-tag" style="padding: 1px 6px; font-size: 11px; font-weight: 700;">+ Thêm Tag</button>
              </div>
              <div class="chips-cloud" id="diag-tags-container">
                ${allDiagTags.map(tag => `
                  <label class="tag-checkbox-item">
                    <input type="checkbox" class="diag-tag-input" value="${tag.name}" ${currentTags.has(tag.name) ? 'checked' : ''} />
                    <span>${tag.name}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Secondary Skills -->
            <div class="editor-form-group" style="margin-top: 6px;">
              <label>Kỹ năng bổ trợ (Secondary Skills):</label>
              <div class="chips-cloud" id="sec-skills-container">
                ${allSecSkills.map(sk => `
                  <div class="chip-toggle ${currentSec.has(sk) ? 'selected' : ''}" data-val="${sk}">${sk}</div>
                `).join('')}
              </div>
            </div>

            <!-- Difficulty, Age, Interaction Type -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 6px;">
              <div class="editor-form-group">
                <label>Độ khó</label>
                <select class="editor-select" id="inp-difficulty">
                  ${difficultyList.map(dif => `<option value="${dif}" ${q.difficulty === dif ? 'selected' : ''}>${dif}</option>`).join('')}
                </select>
              </div>
              <div class="editor-form-group">
                <label>Độ tuổi</label>
                <select class="editor-select" id="inp-age-range">
                  ${ageRangeList.map(a => `<option value="${a}" ${q.age_range === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
              <div class="editor-form-group">
                <label>Kiểu tương tác</label>
                <select class="editor-select" id="inp-interaction-type">
                  ${interactionList.map(it => `<option value="${it}" ${q.interaction_type === it ? 'selected' : ''}>${it}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Source metadata -->
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-top: 6px;">
              <div class="editor-form-group">
                <label>File nguồn</label>
                <input type="text" class="editor-input" id="inp-source-file" value="${q.source_file || ''}" placeholder="DESAFIO_01.png" />
              </div>
              <div class="editor-form-group">
                <label>Trang</label>
                <input type="number" class="editor-input" id="inp-source-page" value="${q.page || 1}" />
              </div>
              <div class="editor-form-group">
                <label>Câu số</label>
                <input type="number" class="editor-input" id="inp-q-number" value="${q.question_number || 1}" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Options Breakdown -->
      <h3 style="font-size: 16px; font-weight: 700; margin-top: 14px;">Các đáp án lựa chọn từ ảnh gốc (A, B, C, D)</h3>
      <div class="editor-options-grid">
        ${q.options.map((opt, i) => `
          <div class="editor-opt-card" data-idx="${i}">
            <div class="editor-opt-header">
              <strong>Đáp án ${opt.label} ${opt.is_correct ? '⭐ (Đúng)' : ''}</strong>
              <span style="font-size: 11px; color: ${opt.is_correct ? '#16A34A' : '#64748B'}; font-weight: 600;">
                Tọa độ: [${opt.card_bbox?.x || 0}, ${opt.card_bbox?.y || 0}]
              </span>
            </div>
            <div style="width: 100%; height: 95px; background: white; border: 1px solid #E2E8F0; border-radius: 6px; display: flex; justify-content: center; align-items: center; margin-bottom: 8px; overflow: hidden;">
              ${VectorRenderer.renderOptionThumbnail(opt)}
            </div>
            <div class="editor-form-group">
              <label style="font-size: 11px;">Lý do không khớp (gợi ý nhận thức cho trẻ):</label>
              <input type="text" class="editor-input opt-reason" data-idx="${i}" value="${opt.mismatch_reason || ''}" placeholder="Nhập lý do chưa khớp..." />
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.bindEditorActions();
  }

  bindEditorActions() {
    const q = this.currentQ;
    if (!q) return;

    // Debug Checkbox Toggles
    const updatePreview = () => {
      this.debugToggles.target = document.getElementById("chk-debug-target")?.checked || false;
      this.debugToggles.drop = document.getElementById("chk-debug-drop")?.checked || false;
      this.debugToggles.answers = document.getElementById("chk-debug-answers")?.checked || false;
      this.debugToggles.coords = document.getElementById("chk-debug-coords")?.checked || false;

      // Update BBox from inputs
      if (document.getElementById("inp-tb-x")) {
        q.target_bbox = {
          x: parseFloat(document.getElementById("inp-tb-x").value) || 70,
          y: parseFloat(document.getElementById("inp-tb-y").value) || 120,
          width: parseFloat(document.getElementById("inp-tb-w").value) || 300,
          height: parseFloat(document.getElementById("inp-tb-h").value) || 350
        };
      }
      if (document.getElementById("inp-dz-x")) {
        q.drop_zone = {
          x: parseFloat(document.getElementById("inp-dz-x").value) || 370,
          y: parseFloat(document.getElementById("inp-dz-y").value) || 120,
          width: parseFloat(document.getElementById("inp-dz-w").value) || 290,
          height: parseFloat(document.getElementById("inp-dz-h").value) || 350,
          tolerance: parseFloat(document.getElementById("inp-tolerance")?.value) || 35.0
        };
      }

      const wrapper = document.getElementById("editor-stage-wrapper");
      if (wrapper) {
        wrapper.innerHTML = VectorRenderer.renderEditorPreview(q, this.debugToggles);
      }
    };

    ["chk-debug-target", "chk-debug-drop", "chk-debug-answers", "chk-debug-coords"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", updatePreview);
    });

    document.querySelectorAll(".bbox-inp").forEach(input => {
      input.addEventListener("input", updatePreview);
    });

    // Domain change -> update Skill dropdown & datalist
    const domainSelect = document.getElementById("inp-domain");
    const skillSelect = document.getElementById("inp-primary-group");
    const typesDatalist = document.getElementById("dl-question-types");

    domainSelect?.addEventListener("change", () => {
      const selectedDomainName = domainSelect.value;
      const domains = this.taxonomy?.domains || [];
      const domObj = domains.find(d => d.name.toLowerCase() === selectedDomainName.toLowerCase());
      const skills = domObj?.skills || [];

      skillSelect.innerHTML = skills.map(s => `<option value="${s.name}">${s.icon || '🎯'} ${s.name}</option>`).join('');
      if (skills[0]) {
        typesDatalist.innerHTML = (skills[0].types || []).map(t => `<option value="${t}">`).join('');
        const typeInput = document.getElementById("inp-question-type");
        if (typeInput && skills[0].types && skills[0].types[0]) {
          typeInput.value = skills[0].types[0];
        }
      }
    });

    // Skill change -> update datalist
    skillSelect?.addEventListener("change", () => {
      const selectedDomainName = domainSelect.value;
      const selectedSkillName = skillSelect.value;
      const domains = this.taxonomy?.domains || [];
      const domObj = domains.find(d => d.name.toLowerCase() === selectedDomainName.toLowerCase());
      const skillObj = (domObj?.skills || []).find(s => s.name.toLowerCase() === selectedSkillName.toLowerCase());
      
      if (skillObj && typesDatalist) {
        typesDatalist.innerHTML = (skillObj.types || []).map(t => `<option value="${t}">`).join('');
        const typeInput = document.getElementById("inp-question-type");
        if (typeInput && skillObj.types && skillObj.types[0]) {
          typeInput.value = skillObj.types[0];
        }
      }
    });

    // Secondary Skill Chip toggles
    document.querySelectorAll(".chip-toggle").forEach(chip => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
      });
    });

    // Add Domain Button
    document.getElementById("btn-add-domain")?.addEventListener("click", async () => {
      const name = prompt("Nhập tên Lĩnh vực nhận thức mới (Domain):");
      if (name && name.trim()) {
        try {
          const res = await fetch("/api/taxonomy/domain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim().toUpperCase() })
          });
          const data = await res.json();
          if (data.status === "success") {
            this.taxonomy = data.taxonomy;
            this.currentQ.domain = name.trim().toUpperCase();
            this.renderEditorForm();
          }
        } catch (e) {
          alert("Lỗi khi thêm lĩnh vực: " + e.message);
        }
      }
    });

    // Add Skill Button
    document.getElementById("btn-add-skill")?.addEventListener("click", async () => {
      const domainName = document.getElementById("inp-domain")?.value || "TƯ DUY KHÔNG GIAN";
      const name = prompt(`Nhập tên Nhóm Kỹ năng mới cho "${domainName}":`);
      if (name && name.trim()) {
        try {
          const res = await fetch("/api/taxonomy/skill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: domainName, name: name.trim() })
          });
          const data = await res.json();
          if (data.status === "success") {
            this.taxonomy = data.taxonomy;
            this.currentQ.primary_group = name.trim();
            this.renderEditorForm();
          }
        } catch (e) {
          alert("Lỗi khi thêm kỹ năng: " + e.message);
        }
      }
    });

    // Add Diagnostic Tag Button
    document.getElementById("btn-add-diag-tag")?.addEventListener("click", async () => {
      const name = prompt("Nhập tên Nhãn năng lực đánh giá mới (Diagnostic Tag):");
      if (name && name.trim()) {
        try {
          const res = await fetch("/api/taxonomy/tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() })
          });
          const data = await res.json();
          if (data.status === "success") {
            this.taxonomy = data.taxonomy;
            if (!this.currentQ.diagnostic_tags) this.currentQ.diagnostic_tags = [];
            this.currentQ.diagnostic_tags.push(name.trim());
            this.renderEditorForm();
          }
        } catch (e) {
          alert("Lỗi khi thêm nhãn năng lực: " + e.message);
        }
      }
    });

    // Approve Button
    document.getElementById("btn-approve")?.addEventListener("click", () => {
      q.status = "APPROVED";
      this.collectFormData();
      this.saveCurrentQuestion();
    });

    // Save Draft Button
    document.getElementById("btn-save-draft")?.addEventListener("click", () => {
      this.collectFormData();
      this.saveCurrentQuestion();
    });

    // Test Play Button
    document.getElementById("btn-test-play")?.addEventListener("click", () => {
      this.collectFormData();
      if (this.onTestPlay) this.onTestPlay(q);
    });
  }

  collectFormData() {
    const q = this.currentQ;
    q.title = document.getElementById("inp-title").value;
    q.instruction = document.getElementById("inp-instruction").value;

    const tol = parseFloat(document.getElementById("inp-tolerance").value) || 35.0;
    if (q.drop_zone) q.drop_zone.tolerance = tol;
    if (q.snap_zone) q.snap_zone.tolerance = tol;

    const correctId = document.getElementById("inp-correct-opt").value;
    q.options.forEach(opt => {
      opt.is_correct = (opt.id === correctId);
    });

    if (document.getElementById("inp-tb-x")) {
      q.target_bbox = {
        x: parseFloat(document.getElementById("inp-tb-x").value) || 70,
        y: parseFloat(document.getElementById("inp-tb-y").value) || 120,
        width: parseFloat(document.getElementById("inp-tb-w").value) || 300,
        height: parseFloat(document.getElementById("inp-tb-h").value) || 350
      };
    }

    if (document.getElementById("inp-dz-x")) {
      q.drop_zone = {
        x: parseFloat(document.getElementById("inp-dz-x").value) || 370,
        y: parseFloat(document.getElementById("inp-dz-y").value) || 120,
        width: parseFloat(document.getElementById("inp-dz-w").value) || 290,
        height: parseFloat(document.getElementById("inp-dz-h").value) || 350,
        tolerance: tol
      };
    }

    // 3-Tier Classification & Metadata Collection
    if (document.getElementById("inp-domain")) {
      q.domain = document.getElementById("inp-domain").value;
    }
    if (document.getElementById("inp-primary-group")) {
      q.primary_group = document.getElementById("inp-primary-group").value;
    }
    if (document.getElementById("inp-question-type")) {
      q.question_type = document.getElementById("inp-question-type").value;
    }
    if (document.getElementById("inp-difficulty")) {
      q.difficulty = document.getElementById("inp-difficulty").value;
    }
    if (document.getElementById("inp-age-range")) {
      q.age_range = document.getElementById("inp-age-range").value;
    }
    if (document.getElementById("inp-interaction-type")) {
      q.interaction_type = document.getElementById("inp-interaction-type").value;
    }
    if (document.getElementById("inp-source-file")) {
      q.source_file = document.getElementById("inp-source-file").value;
    }
    if (document.getElementById("inp-source-page")) {
      q.page = parseInt(document.getElementById("inp-source-page").value) || 1;
    }
    if (document.getElementById("inp-q-number")) {
      q.question_number = parseInt(document.getElementById("inp-q-number").value) || 1;
    }

    // Collect checked diagnostic tags
    const checkedTags = [];
    document.querySelectorAll(".diag-tag-input:checked").forEach(cb => {
      checkedTags.push(cb.value);
    });
    q.diagnostic_tags = checkedTags;

    // Collect selected secondary skills
    const selectedSec = [];
    document.querySelectorAll(".chip-toggle.selected").forEach(ch => {
      selectedSec.push(ch.dataset.val);
    });
    q.secondary_skills = selectedSec;

    document.querySelectorAll(".opt-reason").forEach(input => {
      const idx = parseInt(input.dataset.idx);
      if (q.options[idx]) {
        q.options[idx].mismatch_reason = input.value;
      }
    });
  }

  async saveCurrentQuestion() {
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.currentQ)
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`Đã lưu bài tập thành công! Trạng thái: ${this.currentQ.status}`);
        if (this.onQuestionUpdated) this.onQuestionUpdated(this.currentQ);
      }
    } catch (err) {
      alert("Lỗi khi lưu bài tập: " + err.message);
    }
  }

  async uploadFile(file) {
    const statusEl = document.getElementById("upload-status");
    statusEl.style.display = "block";
    const fileName = file.name || `screenshot_${Date.now()}.png`;
    statusEl.textContent = `Đang tải và AI đang phân tích hình ảnh "${fileName}"...`;

    // Use FileReader for 100% reliable base64 upload
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileName,
            image_base64: reader.result
          })
        });
        const data = await res.json();
        if (data.status === "success" && data.question) {
          statusEl.textContent = "Trích xuất thành công!";
          setTimeout(() => {
            document.getElementById("upload-modal").classList.remove("active");
          }, 400);
          this.questions.push(data.question);
          this.selectQuestion(data.question);
          if (this.onQuestionUpdated) this.onQuestionUpdated(data.question);
        } else {
          statusEl.textContent = "Lỗi: " + (data.message || "Không thể phân tích file");
        }
      } catch (err) {
        statusEl.textContent = "Lỗi tải lên: " + err.message;
      }
    };
    reader.onerror = () => {
      statusEl.textContent = "Lỗi đọc tệp từ thiết bị.";
    };
    reader.readAsDataURL(file);
  }
}

window.QuestionEditor = QuestionEditor;
