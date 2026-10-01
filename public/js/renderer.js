/**
 * High-Fidelity Renderer - Original Image as Source of Truth
 * Never redraws visual content. Renders original image background with interactive overlays.
 */
class VectorRenderer {
  /**
   * Render Interactive Arena in Child Mode
   */
  static renderTargetCanvas(question, activeOption = null, pieceState = null) {
    const origW = question.original_width || 715;
    const origH = question.original_height || 713;
    const imgUrl = question.image_url || question.reference_image;

    // Active piece overlay
    let activePieceSvg = "";
    let ghostDropZoneSvg = "";

    if (question.drop_zone) {
      const dz = question.drop_zone;
      let isNear = false;

      if (activeOption && pieceState) {
        const dx = Math.abs(pieceState.x - dz.x);
        const dy = Math.abs(pieceState.y - dz.y);
        const dist = Math.hypot(dx, dy);
        isNear = dist < (dz.tolerance * 2.5);

        // Calculate opacity and transform
        const opacity = pieceState.isMatched ? 1.0 : (isNear ? 0.92 : 0.86);
        const pieceSrc = activeOption.piece_image || (activeOption.objects && activeOption.objects[0]?.src);

        // Piece dimensions match drop zone when dragged
        const pw = dz.width;
        const ph = dz.height;

        activePieceSvg = `
          <g id="canvas-dragged-group"
             transform="translate(${pieceState.x}, ${pieceState.y})"
             style="pointer-events: ${pieceState.isMatched ? 'none' : 'auto'}; cursor: ${pieceState.isMatched ? 'default' : 'grab'}; transition: ${pieceState.isSnapping ? 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'};">
            <!-- Semi-transparent overlay of the exact original cropped piece -->
            <image href="${pieceSrc}" x="0" y="0" width="${pw}" height="${ph}"
                   opacity="${opacity}" preserveAspectRatio="none"
                   style="filter: drop-shadow(0 6px 16px rgba(0,0,0,0.25));" />
          </g>
        `;
      }

      // Ghost drop zone outline
      if (activeOption && !pieceState.isMatched) {
        const strokeCol = isNear ? "#3B82F6" : "rgba(100, 116, 139, 0.4)";
        const fillCol = isNear ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.05)";
        ghostDropZoneSvg = `
          <g class="ghost-drop-zone">
            <rect x="${dz.x}" y="${dz.y}" width="${dz.width}" height="${dz.height}"
                  fill="${fillCol}" stroke="${strokeCol}" stroke-width="${isNear ? 3.5 : 2}"
                  stroke-dasharray="6,6" rx="8" />
            <text x="${dz.x + dz.width / 2}" y="${dz.y + dz.height / 2}" font-size="20" fill="#2563EB" font-weight="700" text-anchor="middle" dominant-baseline="middle" style="display: ${isNear ? 'block' : 'none'};">Vùng ghép</text>
          </g>
        `;
      }
    }

    // Direct hotspots on worksheet image cards
    let imageHotspotsSvg = "";
    if (question.options) {
      imageHotspotsSvg = `
        <g class="image-opt-hotspots">
          ${question.options.map(opt => {
            const cb = opt.card_bbox || { x: 0, y: 0, width: 0, height: 0 };
            return `
              <rect class="worksheet-opt-hotspot" data-opt-id="${opt.id}"
                    x="${cb.x}" y="${cb.y}" width="${cb.width}" height="${cb.height}"
                    fill="transparent" rx="10"
                    style="pointer-events: auto; cursor: grab;" />
            `;
          }).join('')}
        </g>
      `;
    }

    return `
      <div class="worksheet-stage" style="position: relative; width: 100%; max-width: 580px; aspect-ratio: ${origW} / ${origH}; margin: 0 auto; user-select: none;">
        <!-- LAYER 1: Untouched Original Image -->
        <img src="${imgUrl}" class="immutable-original-img"
             alt="Original Worksheet"
             style="width: 100%; height: 100%; object-fit: contain; display: block; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"
             draggable="false" />

        <!-- LAYER 2 & 3: Interactive Overlay Layer -->
        <svg class="arena-overlay-svg" viewBox="0 0 ${origW} ${origH}"
             style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;">
          ${imageHotspotsSvg}
          ${ghostDropZoneSvg}
          ${activePieceSvg}
        </svg>
      </div>
    `;
  }

  /**
   * Render Option Thumbnail in Shelf
   */
  static renderOptionThumbnail(option) {
    const imgSrc = option.crop_image || option.piece_image;
    return `
      <img src="${imgSrc}"
           alt="Option ${option.label}"
           style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px;"
           draggable="false" />
    `;
  }

  /**
   * Render Question Preview with Interactive Debug Overlay in Question Editor
   */
  static renderEditorPreview(question, debugToggles = { target: true, drop: true, answers: true, coords: true }) {
    const origW = question.original_width || 715;
    const origH = question.original_height || 713;
    const imgUrl = question.image_url || question.reference_image;

    const tb = question.target_bbox || { x: 70, y: 120, width: 300, height: 350 };
    const dz = question.drop_zone || { x: 370, y: 120, width: 290, height: 350 };

    let targetSvg = "";
    if (debugToggles.target) {
      targetSvg = `
        <rect x="${tb.x}" y="${tb.y}" width="${tb.width}" height="${tb.height}"
              fill="rgba(59, 130, 246, 0.12)" stroke="#2563EB" stroke-width="3" stroke-dasharray="5,5" rx="6" />
        <rect x="${tb.x + 4}" y="${tb.y + 4}" width="140" height="26" fill="#2563EB" rx="4" />
        <text x="${tb.x + 12}" y="${tb.y + 22}" fill="white" font-size="13" font-weight="700">TARGET REGION</text>
        ${debugToggles.coords ? `<text x="${tb.x + 12}" y="${tb.y + tb.height - 10}" fill="#2563EB" font-size="11" font-weight="600">[${tb.x}, ${tb.y}, ${tb.width}x${tb.height}]</text>` : ''}
      `;
    }

    let dropSvg = "";
    if (debugToggles.drop) {
      dropSvg = `
        <rect x="${dz.x}" y="${dz.y}" width="${dz.width}" height="${dz.height}"
              fill="rgba(16, 185, 129, 0.12)" stroke="#059669" stroke-width="3" stroke-dasharray="5,5" rx="6" />
        <rect x="${dz.x + 4}" y="${dz.y + 4}" width="160" height="26" fill="#059669" rx="4" />
        <text x="${dz.x + 12}" y="${dz.y + 22}" fill="white" font-size="13" font-weight="700">DROP ZONE (SLOT)</text>
        ${debugToggles.coords ? `<text x="${dz.x + 12}" y="${dz.y + dz.height - 10}" fill="#059669" font-size="11" font-weight="600">[${dz.x}, ${dz.y}, ${dz.width}x${dz.height}]</text>` : ''}
      `;
    }

    let guideSvg = "";
    if (question.guide_line) {
      const gl = question.guide_line;
      if (gl.type === "diagonal") {
        guideSvg = `<line x1="${gl.x1}" y1="${gl.y1}" x2="${gl.x2}" y2="${gl.y2}" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="6,4" />`;
      } else {
        guideSvg = `<line x1="${gl.x}" y1="${gl.y1}" x2="${gl.x}" y2="${gl.y2}" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="6,4" />`;
      }
    }

    let answersSvg = "";
    if (debugToggles.answers && question.options) {
      answersSvg = question.options.map(opt => {
        const cb = opt.card_bbox || { x: 50, y: 520, width: 140, height: 140 };
        const isCorr = opt.is_correct;
        const color = isCorr ? "#10B981" : "#8B5CF6";
        return `
          <g class="opt-debug-box">
            <rect x="${cb.x}" y="${cb.y}" width="${cb.width}" height="${cb.height}"
                  fill="${isCorr ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.12)'}"
                  stroke="${color}" stroke-width="${isCorr ? 3.5 : 2.5}" rx="8" />
            <rect x="${cb.x + 4}" y="${cb.y + 4}" width="90" height="22" fill="${color}" rx="4" />
            <text x="${cb.x + 10}" y="${cb.y + 19}" fill="white" font-size="12" font-weight="700">
              ĐÁP ÁN ${opt.label} ${isCorr ? '★' : ''}
            </text>
            ${debugToggles.coords ? `<text x="${cb.x + 8}" y="${cb.y + cb.height - 8}" fill="${color}" font-size="10" font-weight="600">${cb.x},${cb.y}</text>` : ''}
          </g>
        `;
      }).join("\n");
    }

    return `
      <div class="editor-stage" style="position: relative; width: 100%; max-width: 480px; margin: 0 auto; user-select: none;">
        <!-- 100% UNTOUCHED ORIGINAL UPLOADED IMAGE -->
        <img src="${imgUrl}" class="editor-orig-img"
             alt="Original Worksheet"
             style="width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid #CBD5E1;"
             draggable="false" />

        <!-- DEBUG OVERLAY LAYER -->
        <svg viewBox="0 0 ${origW} ${origH}"
             style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;">
          ${targetSvg}
          ${dropSvg}
          ${guideSvg}
          ${answersSvg}
        </svg>
      </div>
    `;
  }
}

window.VectorRenderer = VectorRenderer;
