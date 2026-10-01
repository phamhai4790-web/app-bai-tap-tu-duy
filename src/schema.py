"""
Pydantic Schema for Interactive Visual Exercise App
Supports:
TYPE 01: Spatial Matching
TYPE 02: Shape Assembly
TYPE 03: Rotation
TYPE 04: Position Matching
TYPE 05: Pattern Completion
TYPE 06: Visual Transformation
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class VectorBlock(BaseModel):
    id: str
    shape: str = "rect"  # "rect", "polygon", "path", "circle"
    color: str           # hex color, e.g. "#FF3B30"
    colorName: str       # "Đỏ", "Xanh dương", "Xanh lá", "Tím", etc.
    group: Optional[str] = None
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0
    points: Optional[str] = None
    d: Optional[str] = None
    radius: Optional[float] = None
    rotation: float = 0.0
    zIndex: int = 1

class GuideLine(BaseModel):
    type: str = "vertical_dashed" # "vertical_dashed", "horizontal_dashed", "grid", "crosshair"
    x1: float
    y1: float
    x2: float
    y2: float
    stroke: str = "#8E8E93"
    strokeWidth: float = 2.5
    dashArray: str = "6,6"
    label: Optional[str] = None

class CanvasConfig(BaseModel):
    width: float = 520
    height: float = 380
    viewBox: str = "0 0 520 380"
    guide_line: Optional[GuideLine] = None
    background_color: str = "#F9FAFB"

class SnapZone(BaseModel):
    target_x: float
    target_y: float
    tolerance: float = 30.0  # px radius for snap
    rotation_tolerance: float = 15.0 # degrees
    target_rotation: float = 0.0

class AnswerOption(BaseModel):
    id: str                  # "A", "B", "C", "D"
    label: str               # "A", "B", "C", "D"
    is_correct: bool = False
    mismatch_reason: str = ""
    objects: List[VectorBlock]
    base_width: float = 200
    base_height: float = 200
    initial_rotation: float = 0.0

class TargetSpec(BaseModel):
    description: str
    objects: List[VectorBlock]
    slot: Optional[Dict[str, Any]] = None # Slot definition for ghost overlay

class InteractionRules(BaseModel):
    drag_enabled: bool = True
    rotation_enabled: bool = False
    snap_distance: float = 30.0
    auto_scale_on_drag: float = 1.0
    visual_comparison_mode: str = "ghost_overlay" # "ghost_overlay", "transparency", "outline"
    snap_allowed_for_all: bool = False # False means only correct answer can snap when near; or snap with alignment feedback

class FeedbackLevels(BaseModel):
    level1: str = "Đang quan sát và thử nghiệm..."
    level2: str = "Hãy quan sát kỹ đường nối và màu sắc xem đã khớp chưa nhé!"
    level3: str = "Khớp rồi! Bé làm rất giỏi! ✨"

class Question(BaseModel):
    id: str
    title: str
    type: str = "spatial_matching"
    status: str = "APPROVED" # "DRAFT", "NEEDS_REVIEW", "APPROVED"
    instruction: str = "Kéo đáp án lên hình mẫu để kiểm tra xem có khớp không nhé!"
    reference_image: Optional[str] = None
    canvas: CanvasConfig
    target: TargetSpec
    snap_zone: SnapZone
    options: List[AnswerOption]
    interaction_rules: InteractionRules = Field(default_factory=InteractionRules)
    feedback: FeedbackLevels = Field(default_factory=FeedbackLevels)
    cognitive_tags: List[str] = Field(default_factory=list)

class QuestionList(BaseModel):
    questions: List[Question]
