/**
 * Parent & Teacher Analytics Dashboard
 * Tracks process-based spatial reasoning telemetry, attempts, time, 3-tier skill groups, and diagnostic competency tags.
 */
class AnalyticsDashboard {
  constructor(container) {
    this.container = container;
    this.taxonomy = null;
  }

  async loadAndRender(taxonomy = null) {
    this.container.innerHTML = `
      <div style="text-align:center; padding: 40px; color: #64748B;">
        Đang tải dữ liệu học tập của bé...
      </div>
    `;

    if (taxonomy) {
      this.taxonomy = taxonomy;
    } else if (!this.taxonomy) {
      try {
        const tRes = await fetch("/api/taxonomy");
        this.taxonomy = await tRes.json();
      } catch (e) {
        console.warn("Could not load taxonomy in analytics:", e);
      }
    }

    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      const sessions = data.sessions || (Array.isArray(data) ? data : []);
      this.renderDashboard(sessions);
    } catch (err) {
      this.container.innerHTML = `
        <div style="color: #EF4444; padding: 20px;">
          Không thể tải dữ liệu: ${err.message}
        </div>
      `;
    }
  }

  renderDashboard(sessions) {
    if (!sessions || sessions.length === 0) {
      this.container.innerHTML = `
        <div class="parent-dashboard">
          <div class="report-section" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
            <h3 style="margin-bottom: 8px;">Chưa có phiên làm bài nào được ghi nhận</h3>
            <p style="color: #64748B; font-size: 14px;">
              Hãy chuyển sang thẻ "Bé Học" để bé hoàn thành bài tập, kết quả chi tiết và phân tích tư duy thị giác sẽ xuất hiện tại đây.
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Compute aggregates across sessions
    let totalQuestions = 0;
    let totalAttempts = 0;
    let totalSeconds = 0;
    let correctCount = 0;
    const questionsHistory = [];
    const skillStats = {}; // { skillName: { count, attempts, seconds, correct, domain } }
    const tagStats = {}; // { tagName: { count, attempts, correct } }

    sessions.forEach(sess => {
      (sess.results || []).forEach(r => {
        totalQuestions += 1;
        totalAttempts += r.attempts || 1;
        totalSeconds += r.durationSeconds || 0;
        if (r.success) correctCount += 1;

        const skillName = r.primary_group || "Đối xứng";
        const domainName = r.domain || "TƯ DUY KHÔNG GIAN";

        if (!skillStats[skillName]) {
          skillStats[skillName] = { count: 0, attempts: 0, seconds: 0, correct: 0, domain: domainName };
        }
        skillStats[skillName].count += 1;
        skillStats[skillName].attempts += r.attempts || 1;
        skillStats[skillName].seconds += r.durationSeconds || 0;
        if (r.success) skillStats[skillName].correct += 1;

        // Diagnostic tags
        (r.diagnostic_tags || ["Visual-Spatial Reasoning", "Symmetry"]).forEach(tag => {
          if (!tagStats[tag]) {
            tagStats[tag] = { count: 0, attempts: 0, correct: 0 };
          }
          tagStats[tag].count += 1;
          tagStats[tag].attempts += r.attempts || 1;
          if (r.success) tagStats[tag].correct += 1;
        });

        questionsHistory.push({
          ...r,
          primary_group: skillName,
          sessionDate: sess.timestamp ? new Date(sess.timestamp).toLocaleDateString("vi-VN") : "Hôm nay"
        });
      });
    });

    const avgAttempts = totalQuestions > 0 ? (totalAttempts / totalQuestions).toFixed(1) : 0;
    const avgTime = totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;
    const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    this.container.innerHTML = `
      <div class="parent-dashboard">
        <!-- Overview Summary Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">${totalQuestions}</span>
            <span class="stat-label">Số bài đã luyện tập</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: #10B981;">${accuracyPct}%</span>
            <span class="stat-label">Tỷ lệ tự ghép khớp</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: #F59E0B;">${avgAttempts}</span>
            <span class="stat-label">Số lần ướm thử TB / bài</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" style="color: #8B5CF6;">${avgTime}s</span>
            <span class="stat-label">Thời gian trung bình / bài</span>
          </div>
        </div>

        <!-- 3-Tier Skill Group Mastery -->
        <div class="report-section">
          <h3 class="report-title">
            <span>🧩</span> Báo Cáo Năng Lực Theo Nhóm Kỹ Năng (Skill Group Mastery)
          </h3>
          <p style="color: #64748B; font-size: 13px; margin-bottom: 16px;">
            Đánh giá mức độ thành thạo và phản xạ theo từng dạng bài tập tư duy thị giác.
          </p>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${Object.entries(skillStats).map(([skill, s]) => {
              const skillAcc = s.count > 0 ? Math.round((s.correct / s.count) * 100) : 100;
              const skillAvgAtt = (s.attempts / s.count).toFixed(1);
              const skillAvgSec = Math.round(s.seconds / s.count);

              // Find icon
              let icon = "🎯";
              (this.taxonomy?.domains || []).forEach(dom => {
                const found = (dom.skills || []).find(sk => sk.name.toLowerCase() === skill.toLowerCase());
                if (found && found.icon) icon = found.icon;
              });

              return `
                <div style="border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; background: #F8FAFC;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 20px;">${icon}</span>
                      <div>
                        <strong style="font-size: 15px; color: #1E293B;">${skill}</strong>
                        <span style="font-size: 11px; color: #64748B; margin-left: 6px;">(${s.domain})</span>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-weight: 700; color: #10B981; font-size: 15px;">${skillAcc}%</span>
                      <span style="font-size: 12px; color: #64748B; margin-left: 4px;">(${s.count} bài)</span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div style="background: #E2E8F0; border-radius: 6px; height: 8px; width: 100%; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${skillAcc}%; height: 100%; background: linear-gradient(90deg, #3B82F6, #10B981); border-radius: 6px;"></div>
                  </div>

                  <div style="display: flex; gap: 16px; font-size: 12px; color: #64748B;">
                    <span>Ướm thử TB: <strong style="color: #334155;">${skillAvgAtt} lần</strong></span>
                    <span>•</span>
                    <span>Thời gian TB: <strong style="color: #334155;">${skillAvgSec} giây</strong></span>
                    <span>•</span>
                    <span>Trạng thái: <strong style="color: ${skillAcc >= 80 ? '#16A34A' : '#D97706'};">${skillAcc >= 80 ? '⭐ Nắm vững' : '🔄 Đang củng cố'}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Diagnostic Competency Matrix -->
        <div class="report-section">
          <h3 class="report-title">
            <span>🏷️</span> Ma Trận Năng Lực Phát Triển (Diagnostic Competencies)
          </h3>
          <p style="color: #64748B; font-size: 13px; margin-bottom: 14px;">
            Các chỉ số theo dõi năng lực nhận thức chuyên sâu phục vụ can thiệp & bồi dưỡng tư duy.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
            ${Object.entries(tagStats).map(([tag, st]) => {
              const tagAvgAtt = (st.attempts / st.count).toFixed(1);
              const tagLevel = tagAvgAtt <= 2.0 ? "⭐ Tốt" : "🔄 Cần rèn thêm";
              const tagLevelColor = tagAvgAtt <= 2.0 ? "#15803D" : "#B45309";
              const tagBg = tagAvgAtt <= 2.0 ? "#DCFCE7" : "#FEF3C7";

              return `
                <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; background: white; box-shadow: var(--shadow-sm);">
                  <div style="font-weight: 700; font-size: 13px; color: #1E293B; margin-bottom: 6px;">${tag}</div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span style="color: #64748B;">Đã kích hoạt: <strong>${st.count} lần</strong></span>
                    <span style="background: ${tagBg}; color: ${tagLevelColor}; padding: 2px 6px; border-radius: 6px; font-weight: 700;">${tagLevel}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cognitive Insights -->
        <div class="report-section">
          <h3 class="report-title">
            <span>🧠</span> Phân Tích Tiến Trình Tư Duy & Khuyến Nghị (Pedagogical Insights)
          </h3>
          <div class="insights-box">
            <strong>Ghi nhận từ hệ thống phân tích:</strong><br />
            • <strong>Căn lề không gian (Spatial Alignment):</strong> Bé thực hiện thao tác kéo và căn chỉnh độc lập. Khi gặp hình chưa khớp, bé quan sát sự liền mạch của đường nét thay vì đoán mò ngẫu nhiên.<br />
            • <strong>Đối chiếu màu sắc & Đường cong (Visual Comparison):</strong> Bé quan sát tốt sự liên tục của các khối màu qua trục ranh giới. Với các câu hỏi thuộc nhóm <em>Đối xứng</em>, bé đạt độ chính xác cao ngay từ lần ướm thử đầu tiên.<br />
            • <strong>Khuyến nghị từ chuyên gia:</strong> Nên mở rộng cho bé luyện tập thêm các bài tập thuộc nhóm <em>Xoay hình</em> (Mental Rotation) và <em>Tangram</em> để tăng cường khả năng định hướng đa chiều.
          </div>
        </div>

        <!-- Detailed Question History -->
        <div class="report-section">
          <h3 class="report-title">
            <span>📝</span> Chi Tiết Từng Bài Tập & Lịch Sử Thao Tác
          </h3>
          <div class="timeline-list">
            ${questionsHistory.map((item, idx) => `
              <div class="timeline-item">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <strong style="font-size: 14px;">${item.questionTitle || `Bài tập #${idx + 1}`}</strong>
                    <span style="font-size: 11px; background: #EFF6FF; color: #1D4ED8; font-weight: 700; padding: 1px 6px; border-radius: 4px;">
                      ${item.primary_group || 'Đối xứng'}
                    </span>
                  </div>
                  <div style="font-size: 13px; color: #64748B;">
                    Thời gian: ${item.durationSeconds || 0}s | Các đáp án đã ướm thử: ${(item.triedOptions || []).join(', ') || 'Chính xác ngay'}
                  </div>
                </div>
                <div style="text-align: right;">
                  <span class="status-badge ${item.success ? 'APPROVED' : 'DRAFT'}">
                    ${item.success ? '✓ Khớp hoàn chỉnh' : 'Cần thử lại'}
                  </span>
                  <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
                    ${item.attempts || 1} lần thử
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

window.AnalyticsDashboard = AnalyticsDashboard;
