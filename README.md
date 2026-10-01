# 🧠 Ứng dụng Bài tập Tư duy Trực quan (Visual Reasoning App)

Ứng dụng rèn luyện tư duy không gian, khả năng quan sát và suy luận quy luật trực quan dành cho trẻ em từ 4–9 tuổi.

## 🌟 Tính năng chính

- **Bảo tồn 100% Ảnh gốc (Source of Truth):** Render trực tiếp hình ảnh gốc của đề bài bằng thẻ `<img>` pixel-perfect, không vẽ lại hay thay thế bằng vector/AI.
- **Hệ thống phân loại đa tầng (Taxonomy):**
  - 🧩 **Tư duy không gian:** Đối xứng trục đứng, Đối xứng trục chéo 45°
  - 🧱 **Ghép & Cấu tạo:** Tìm mảnh còn thiếu, Khối lập phương 3D
  - 🧠 **Quy luật & Mẫu:** Hoàn thành mẫu ma trận chấm tròn 2 màu
- **Tương tác trực quan mượt mà:**
  - Chạm chọn hoặc Kéo - Thả (Drag & Drop) trực tiếp từ khay đáp án hoặc từ hình đề bài.
  - Tự động căn chỉnh và hít dính chính xác (Snap & Match) vào vùng trống của hình mẫu.
  - Phản hồi âm thanh nhẹ nhàng và gợi ý động viên cho bé.
- **Bộ công cụ đa người dùng:**
  - 🌟 **Bé Học (Child Mode):** Giao diện thân thiện, trực quan, không áp lực điểm số.
  - ✏️ **Biên Tập & Duyệt (Editor Mode):** Chỉnh sửa bounding box, vùng thả (drop zone), xem trước overlay.
  - 📊 **Phụ Huynh / Thầy Cô (Parent Dashboard):** Theo dõi tiến độ và bản đồ phát triển kỹ năng tư duy.

## 🚀 Hướng dẫn chạy cục bộ

```bash
# Khởi động server nội bộ
python server.py 8080
```

Mở trình duyệt tại: `http://localhost:8080/`

## 🌐 Triển khai Vercel

Dự án được tối ưu hóa sẵn cho Vercel CDN với tệp cấu hình `vercel.json`.
