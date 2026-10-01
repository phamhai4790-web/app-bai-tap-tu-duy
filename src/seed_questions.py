"""
Seed questions generator with strict adherence to Question Schema.
Generates Question 01 from user's reference image and additional visual reasoning exercises.
"""

import json
from src.schema import (
    Question, CanvasConfig, GuideLine, TargetSpec,
    SnapZone, AnswerOption, VectorBlock, InteractionRules,
    FeedbackLevels, QuestionList
)

# Colors matching the original image
COLOR_RED = "#FF3333"      # Bright Red
COLOR_BLUE = "#0066FF"     # Vibrant Blue
COLOR_GREEN = "#22C55E"    # Vibrant Green
COLOR_PURPLE = "#7E22CE"   # Rich Purple
COLOR_ORANGE = "#F97316"   # Orange
COLOR_YELLOW = "#EAB308"   # Yellow
COLOR_CYAN = "#06B6D4"     # Cyan

def create_question_1() -> Question:
    """
    Question 01: DESAFIO NEUROTRAINER (Exact match to reference photo).
    Type: Spatial Matching
    4 spiral interlocking polyominoes: Red, Green, Blue, Purple.
    Left half is target, Right half is options A, B, C, D.
    Option C is the mathematically correct match.
    """
    # Canvas: 520 x 380, dashed line at x = 260
    # Left half: x from 36 to 260
    # Right half: x from 260 to 484 (offset = 260)
    
    # Target (Left Half):
    target_blocks = [
        # RED: horizontal top arm + left vertical hook
        VectorBlock(
            id="t_red_h",
            color=COLOR_RED,
            colorName="Đỏ",
            group="red_spiral",
            x=100, y=56, width=160, height=32
        ),
        VectorBlock(
            id="t_red_v",
            color=COLOR_RED,
            colorName="Đỏ",
            group="red_spiral",
            x=100, y=88, width=32, height=96
        ),
        
        # GREEN: left vertical arm + bottom horizontal arm
        VectorBlock(
            id="t_green_v",
            color=COLOR_GREEN,
            colorName="Xanh lá",
            group="green_spiral",
            x=36, y=144, width=32, height=128
        ),
        VectorBlock(
            id="t_green_h",
            color=COLOR_GREEN,
            colorName="Xanh lá",
            group="green_spiral",
            x=36, y=208, width=128, height=32
        ),
        
        # BLUE: vertical arm + top horizontal arm
        VectorBlock(
            id="t_blue_v",
            color=COLOR_BLUE,
            colorName="Xanh dương",
            group="blue_spiral",
            x=164, y=152, width=32, height=96
        ),
        VectorBlock(
            id="t_blue_h",
            color=COLOR_BLUE,
            colorName="Xanh dương",
            group="blue_spiral",
            x=164, y=120, width=96, height=32
        ),
        
        # PURPLE: right vertical arm (touches line) + bottom horizontal bar
        VectorBlock(
            id="t_purple_v",
            color=COLOR_PURPLE,
            colorName="Tím",
            group="purple_spiral",
            x=228, y=184, width=32, height=96
        ),
        VectorBlock(
            id="t_purple_h",
            color=COLOR_PURPLE,
            colorName="Tím",
            group="purple_spiral",
            x=76, y=280, width=184, height=32
        ),
    ]

    # Helper to create option objects (relative to local origin (0, 0))
    # Option width ~ 200, height ~ 260
    # Dashed line in option local coordinates is at x = 0!
    
    # OPTION A: Swapped purple and blue
    opt_a_blocks = [
        # Red: top horizontal + right vertical
        VectorBlock(id="oa_red_h", color=COLOR_RED, colorName="Đỏ", x=0, y=0, width=128, height=32),
        VectorBlock(id="oa_red_v", color=COLOR_RED, colorName="Đỏ", x=96, y=32, width=32, height=80),
        # PURPLE swapped to top (y=64 instead of Blue)
        VectorBlock(id="oa_pur_h", color=COLOR_PURPLE, colorName="Tím", x=0, y=64, width=96, height=32),
        VectorBlock(id="oa_pur_v", color=COLOR_PURPLE, colorName="Tím", x=0, y=96, width=32, height=48),
        # BLUE at bottom (y=160)
        VectorBlock(id="oa_blu_v", color=COLOR_BLUE, colorName="Xanh dương", x=32, y=128, width=32, height=64),
        VectorBlock(id="oa_blu_h", color=COLOR_BLUE, colorName="Xanh dương", x=0, y=192, width=64, height=32),
        # Green on right
        VectorBlock(id="oa_grn_h", color=COLOR_GREEN, colorName="Xanh lá", x=64, y=96, width=64, height=32),
        VectorBlock(id="oa_grn_v", color=COLOR_GREEN, colorName="Xanh lá", x=96, y=64, width=32, height=64),
    ]

    # OPTION B: Green at top right
    opt_b_blocks = [
        VectorBlock(id="ob_red_h", color=COLOR_RED, colorName="Đỏ", x=0, y=0, width=128, height=32),
        VectorBlock(id="ob_red_v", color=COLOR_RED, colorName="Đỏ", x=96, y=32, width=32, height=64),
        # Green misplaced at upper right
        VectorBlock(id="ob_grn_v", color=COLOR_GREEN, colorName="Xanh lá", x=128, y=0, width=32, height=96),
        VectorBlock(id="ob_grn_h", color=COLOR_GREEN, colorName="Xanh lá", x=64, y=64, width=64, height=32),
        # Blue in middle
        VectorBlock(id="ob_blu_h", color=COLOR_BLUE, colorName="Xanh dương", x=0, y=64, width=64, height=32),
        VectorBlock(id="ob_blu_v", color=COLOR_BLUE, colorName="Xanh dương", x=32, y=96, width=32, height=64),
        # Purple at bottom
        VectorBlock(id="ob_pur_v", color=COLOR_PURPLE, colorName="Tím", x=0, y=160, width=32, height=64),
        VectorBlock(id="ob_pur_h", color=COLOR_PURPLE, colorName="Tím", x=0, y=224, width=96, height=32),
    ]

    # OPTION C: EXACT PERFECT MATCH!
    # In target, top Red is at y=56. Local y=0 corresponds to y=56!
    # Red continues: x from 0 to 128, y=0 to 32. Then turns down at x=96..128, y=32..112.
    # Blue continues: at y=64 (corresponds to target y=120): x from 0 to 64, y=64 to 96. Then turns down at x=32..64, y=96..176.
    # Green enters at y=160 (corresponds to target y=216): x from 0 to 160, y=160 to 192. Then turns UP at x=128..160, y=96..160!
    # Purple continues at y=224 (corresponds to target y=280): x from 0 to 64, y=224 to 256. And vertical bar at x=0, y=128..224.
    opt_c_blocks = [
        # RED: completes top arm and right-down arm
        VectorBlock(id="oc_red_h", color=COLOR_RED, colorName="Đỏ", group="red_spiral", x=0, y=0, width=128, height=32),
        VectorBlock(id="oc_red_v", color=COLOR_RED, colorName="Đỏ", group="red_spiral", x=96, y=32, width=32, height=80),
        
        # BLUE: completes middle arm and turns down
        VectorBlock(id="oc_blue_h", color=COLOR_BLUE, colorName="Xanh dương", group="blue_spiral", x=0, y=64, width=64, height=32),
        VectorBlock(id="oc_blue_v", color=COLOR_BLUE, colorName="Xanh dương", group="blue_spiral", x=32, y=96, width=32, height=80),
        
        # GREEN: extends bottom-mid arm and turns UP on the right!
        VectorBlock(id="oc_green_h", color=COLOR_GREEN, colorName="Xanh lá", group="green_spiral", x=0, y=160, width=160, height=32),
        VectorBlock(id="oc_green_v", color=COLOR_GREEN, colorName="Xanh lá", group="green_spiral", x=128, y=80, width=32, height=80),
        
        # PURPLE: connects to bottom bar and vertical segment
        VectorBlock(id="oc_purple_h", color=COLOR_PURPLE, colorName="Tím", group="purple_spiral", x=0, y=224, width=64, height=32),
        VectorBlock(id="oc_purple_v", color=COLOR_PURPLE, colorName="Tím", group="purple_spiral", x=0, y=128, width=32, height=96),
    ]

    # OPTION D: Distorted / missing green bend
    opt_d_blocks = [
        VectorBlock(id="od_red_h", color=COLOR_RED, colorName="Đỏ", x=0, y=0, width=128, height=32),
        VectorBlock(id="od_red_v", color=COLOR_RED, colorName="Đỏ", x=96, y=32, width=32, height=80),
        VectorBlock(id="od_blue_h", color=COLOR_BLUE, colorName="Xanh dương", x=0, y=64, width=64, height=32),
        # Purple is deformed into a solid bar at y=160
        VectorBlock(id="od_pur_block", color=COLOR_PURPLE, colorName="Tím", x=0, y=144, width=110, height=32),
        VectorBlock(id="od_pur_v", color=COLOR_PURPLE, colorName="Tím", x=0, y=176, width=32, height=48),
        # Green is disconnected at far right
        VectorBlock(id="od_grn_v", color=COLOR_GREEN, colorName="Xanh lá", x=128, y=120, width=32, height=64),
    ]

    return Question(
        id="q_001",
        title="Câu 01: Thử thách Mê cung Màu sắc",
        type="spatial_matching",
        status="APPROVED",
        instruction="Quan sát nửa hình bên trái. Bé hãy kéo mảnh ghép thích hợp ở dưới lên để hoàn thành hình nhé!",
        reference_image="/assets/reference_q01.png",
        canvas=CanvasConfig(
            width=520,
            height=380,
            guide_line=GuideLine(
                x1=260, y1=30, x2=260, y2=350,
                stroke="#6B7280", strokeWidth=3, dashArray="6,6",
                label="Đường ranh giới ghép nối"
            )
        ),
        target=TargetSpec(
            description="Nửa bên trái của mê cung 4 màu xoắn ốc (Đỏ, Xanh lá, Xanh dương, Tím)",
            objects=target_blocks,
            slot={"x": 260, "y": 56, "width": 160, "height": 256}
        ),
        snap_zone=SnapZone(
            target_x=260,
            target_y=56,
            tolerance=36.0
        ),
        options=[
            AnswerOption(
                id="A", label="A", is_correct=False,
                mismatch_reason="Nhánh Tím và Xanh dương bị đổi chỗ, không khớp dải màu với nửa trái",
                objects=opt_a_blocks, base_width=160, base_height=256
            ),
            AnswerOption(
                id="B", label="B", is_correct=False,
                mismatch_reason="Nhánh Xanh lá bị đặt lệch lên góc trên bên phải, không nối với dải Xanh lá dưới",
                objects=opt_b_blocks, base_width=160, base_height=256
            ),
            AnswerOption(
                id="C", label="C", is_correct=True,
                mismatch_reason="",
                objects=opt_c_blocks, base_width=160, base_height=256
            ),
            AnswerOption(
                id="D", label="D", is_correct=False,
                mismatch_reason="Khối màu Tím bị bẹt ngang và thiếu nhánh Xanh lá hoàn chỉnh",
                objects=opt_d_blocks, base_width=160, base_height=256
            )
        ],
        interaction_rules=InteractionRules(
            drag_enabled=True,
            rotation_enabled=False,
            snap_distance=35.0,
            auto_scale_on_drag=1.0,
            visual_comparison_mode="ghost_overlay"
        ),
        feedback=FeedbackLevels(
            level1="Bé đang di chuyển hình để ướm thử...",
            level2="Thử nhìn các dải màu đối xứng qua vạch kẻ đứt xem đã nối liền chưa nhé!",
            level3="Khớp hoàn hảo rồi! Bé nhìn thấy các đường màu nối liền rất chuẩn! 🎉"
        ),
        cognitive_tags=["spatial_continuity", "color_alignment", "rotational_symmetry"]
    )

def create_question_2() -> Question:
    """
    Question 02: Spatial Matching with Geometrical Chevron / Wings (Type 01).
    Target on left has symmetric wing blocks in Orange, Cyan, Yellow.
    """
    target_blocks = [
        # Top Orange Wing
        VectorBlock(id="q2_t_org1", color=COLOR_ORANGE, colorName="Cam", shape="polygon",
                    points="260,60 140,90 170,120 260,100"),
        # Middle Cyan Diamond
        VectorBlock(id="q2_t_cyn1", color=COLOR_CYAN, colorName="Xanh lam", shape="polygon",
                    points="260,130 160,180 200,210 260,170"),
        # Bottom Yellow Wing
        VectorBlock(id="q2_t_yel1", color=COLOR_YELLOW, colorName="Vàng", shape="polygon",
                    points="260,200 130,250 160,280 260,240"),
    ]
    
    # Correct Right Wing (Option B)
    opt_b_blocks = [
        VectorBlock(id="q2_ob_org", color=COLOR_ORANGE, colorName="Cam", shape="polygon",
                    points="0,60 120,90 90,120 0,100"),
        VectorBlock(id="q2_ob_cyn", color=COLOR_CYAN, colorName="Xanh lam", shape="polygon",
                    points="0,130 100,180 60,210 0,170"),
        VectorBlock(id="q2_ob_yel", color=COLOR_YELLOW, colorName="Vàng", shape="polygon",
                    points="0,200 130,250 100,280 0,240"),
    ]
    
    # Inverted colors (Option A)
    opt_a_blocks = [
        VectorBlock(id="q2_oa_yel", color=COLOR_YELLOW, colorName="Vàng", shape="polygon",
                    points="0,60 120,90 90,120 0,100"),
        VectorBlock(id="q2_oa_cyn", color=COLOR_CYAN, colorName="Xanh lam", shape="polygon",
                    points="0,130 100,180 60,210 0,170"),
        VectorBlock(id="q2_oa_org", color=COLOR_ORANGE, colorName="Cam", shape="polygon",
                    points="0,200 130,250 100,280 0,240"),
    ]

    # Asymmetric shapes (Option C)
    opt_c_blocks = [
        VectorBlock(id="q2_oc_org", color=COLOR_ORANGE, colorName="Cam", shape="polygon",
                    points="0,60 90,110 60,130 0,100"),
        VectorBlock(id="q2_oc_cyn", color=COLOR_CYAN, colorName="Xanh lam", shape="polygon",
                    points="0,130 120,160 80,190 0,170"),
        VectorBlock(id="q2_oc_yel", color=COLOR_YELLOW, colorName="Vàng", shape="polygon",
                    points="0,200 100,270 70,290 0,240"),
    ]

    # Missing middle block (Option D)
    opt_d_blocks = [
        VectorBlock(id="q2_od_org", color=COLOR_ORANGE, colorName="Cam", shape="polygon",
                    points="0,60 120,90 90,120 0,100"),
        VectorBlock(id="q2_od_yel", color=COLOR_YELLOW, colorName="Vàng", shape="polygon",
                    points="0,200 130,250 100,280 0,240"),
    ]

    return Question(
        id="q_002",
        title="Câu 02: Cánh bướm Đối xứng Đa giác",
        type="spatial_matching",
        status="APPROVED",
        instruction="Bé hãy kéo nửa cánh bướm bên dưới vào trục đối xứng để tạo thành hình hoàn chỉnh nhé!",
        canvas=CanvasConfig(
            width=520,
            height=380,
            guide_line=GuideLine(
                x1=260, y1=30, x2=260, y2=350,
                stroke="#6B7280", strokeWidth=3, dashArray="6,6",
                label="Trục đối xứng"
            )
        ),
        target=TargetSpec(
            description="Nửa cánh bướm đa sắc bên trái",
            objects=target_blocks,
            slot={"x": 260, "y": 60, "width": 140, "height": 220}
        ),
        snap_zone=SnapZone(
            target_x=260,
            target_y=0,
            tolerance=35.0
        ),
        options=[
            AnswerOption(id="A", label="A", is_correct=False, mismatch_reason="Màu sắc bị lộn ngược: Cam và Vàng đổi chỗ", objects=opt_a_blocks, base_width=140, base_height=280),
            AnswerOption(id="B", label="B", is_correct=True, mismatch_reason="", objects=opt_b_blocks, base_width=140, base_height=280),
            AnswerOption(id="C", label="C", is_correct=False, mismatch_reason="Góc vát của cánh không cân xứng với nửa trái", objects=opt_c_blocks, base_width=140, base_height=280),
            AnswerOption(id="D", label="D", is_correct=False, mismatch_reason="Thiếu mất khối hình thoi màu xanh lam ở giữa", objects=opt_d_blocks, base_width=140, base_height=280)
        ],
        interaction_rules=InteractionRules(drag_enabled=True, snap_distance=35.0, auto_scale_on_drag=1.0),
        feedback=FeedbackLevels(
            level1="Đang căn chỉnh cánh bướm...",
            level2="Bé chú ý xem màu cánh trên và cánh dưới đã tương ứng với bên trái chưa nhé!",
            level3="Khớp hoàn hảo! Đôi cánh bướm đối xứng tuyệt đẹp! 🦋"
        ),
        cognitive_tags=["bilateral_symmetry", "polygon_matching"]
    )

def create_question_3() -> Question:
    """
    Question 03: Rotation / Orientation Puzzle (TYPE 03).
    A geometric key shape that must be rotated and placed into its cutout socket.
    """
    target_cutout = [
        # Grey outline / socket target
        VectorBlock(id="q3_socket", color="#E2E8F0", colorName="Khuôn lõm", shape="polygon",
                    points="200,100 320,100 320,160 260,160 260,260 200,260"),
    ]
    
    # The L-block in option A (already 0 deg), B (90 deg), C (180 deg), D (270 deg)
    def make_l_piece(rot=0.0):
        return [
            VectorBlock(id=f"q3_l_h_{rot}", color="#3B82F6", colorName="Xanh dương", shape="rect", x=0, y=0, width=120, height=60),
            VectorBlock(id=f"q3_l_v_{rot}", color="#3B82F6", colorName="Xanh dương", shape="rect", x=0, y=60, width=60, height=100),
        ]

    return Question(
        id="q_003",
        title="Câu 03: Xoay Khối Khớp Khuôn (Rotation)",
        type="rotation",
        status="APPROVED",
        instruction="Bé hãy chọn khối hình đúng hướng để đặt vừa khít vào chiếc khuôn màu xám nhé!",
        canvas=CanvasConfig(
            width=520,
            height=380,
            guide_line=None
        ),
        target=TargetSpec(
            description="Khuôn hình chữ T ngược lõm màu xám",
            objects=target_cutout,
            slot={"x": 200, "y": 100, "width": 120, "height": 160}
        ),
        snap_zone=SnapZone(
            target_x=200,
            target_y=100,
            tolerance=35.0
        ),
        options=[
            AnswerOption(id="A", label="A", is_correct=True, mismatch_reason="", objects=make_l_piece(0), base_width=120, base_height=160),
            AnswerOption(id="B", label="B", is_correct=False, mismatch_reason="Khối này đang bị quay ngang 90 độ, không lọt vào khuôn", objects=[
                VectorBlock(id="q3_ob_1", color="#3B82F6", colorName="Xanh dương", shape="rect", x=0, y=0, width=160, height=60),
                VectorBlock(id="q3_ob_2", color="#3B82F6", colorName="Xanh dương", shape="rect", x=100, y=60, width=60, height=60),
            ], base_width=160, base_height=120),
            AnswerOption(id="C", label="C", is_correct=False, mismatch_reason="Khối này bị úp ngược xuống dưới", objects=[
                VectorBlock(id="q3_oc_1", color="#3B82F6", colorName="Xanh dương", shape="rect", x=0, y=100, width=120, height=60),
                VectorBlock(id="q3_oc_2", color="#3B82F6", colorName="Xanh dương", shape="rect", x=60, y=0, width=60, height=100),
            ], base_width=120, base_height=160),
            AnswerOption(id="D", label="D", is_correct=False, mismatch_reason="Khối này bị soi gương lật mặt trái", objects=[
                VectorBlock(id="q3_od_1", color="#3B82F6", colorName="Xanh dương", shape="rect", x=0, y=0, width=120, height=60),
                VectorBlock(id="q3_od_2", color="#3B82F6", colorName="Xanh dương", shape="rect", x=60, y=60, width=60, height=100),
            ], base_width=120, base_height=160),
        ],
        interaction_rules=InteractionRules(
            drag_enabled=True,
            rotation_enabled=True,
            snap_distance=35.0,
            auto_scale_on_drag=1.0
        ),
        feedback=FeedbackLevels(
            level1="Đang đưa hình vào khuôn...",
            level2="Thử quan sát góc cạnh của khuôn xám xem khối hình có cùng chiều không nhé!",
            level3="Khớp khít hoàn toàn vào khuôn! Tuyệt vời! 🧩"
        ),
        cognitive_tags=["mental_rotation", "socket_matching"]
    )

def generate_all():
    q1 = create_question_1()
    q2 = create_question_2()
    q3 = create_question_3()
    q_list = QuestionList(questions=[q1, q2, q3])
    
    with open("data/questions.json", "w", encoding="utf-8") as f:
        json.dump(q_list.model_dump(), f, ensure_ascii=False, indent=2)
    print(f"Generated {len(q_list.questions)} questions into data/questions.json")

if __name__ == "__main__":
    generate_all()
