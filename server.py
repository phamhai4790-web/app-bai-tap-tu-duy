"""
Interactive Visual Reasoning Web Server
Python 3.12 Standard Library + PIL
Serves API and SPA frontend for Child Mode, Question Editor, and Parent Dashboard.
"""

import os
import sys
import json
import uuid
import cgi
import shutil
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# Base directory
BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = BASE_DIR / "data"
QUESTIONS_FILE = DATA_DIR / "questions.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"
TAXONOMY_FILE = DATA_DIR / "taxonomy.json"
UPLOADS_DIR = DATA_DIR / "uploads"

# Ensure dirs exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
if not SESSIONS_FILE.exists():
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

# Import extractor
sys.path.insert(0, str(BASE_DIR))
from src.extractor import extract_from_image

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length)
        for enc in ["utf-8", "utf-8-sig", "latin1", "cp1252"]:
            try:
                return json.loads(raw.decode(enc))
            except Exception:
                continue
        return json.loads(raw.decode("utf-8", errors="replace"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # API: Get Taxonomy
        if path == "/api/taxonomy":
            if not TAXONOMY_FILE.exists():
                self.send_json({})
                return
            with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
                tax = json.load(f)
            self.send_json(tax)
            return

        # API: Get Questions
        if path == "/api/questions":
            if not QUESTIONS_FILE.exists():
                self.send_json({"questions": []})
                return
            with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            questions = data.get("questions", [])
            
            approved_only = query.get("approved_only", ["false"])[0].lower() == "true"
            if approved_only:
                questions = [q for q in questions if q.get("status") == "APPROVED"]

            domain_filter = query.get("domain", [None])[0]
            if domain_filter and domain_filter.lower() != "all":
                questions = [q for q in questions if q.get("domain", "").lower() == domain_filter.lower()]
                
            skill_filter = query.get("skill", [None])[0]
            if skill_filter and skill_filter.lower() != "all":
                questions = [q for q in questions if q.get("primary_group", "").lower() == skill_filter.lower()]

            self.send_json({"questions": questions})
            return

        # API: Get Sessions / Analytics
        if path == "/api/sessions":
            if not SESSIONS_FILE.exists():
                self.send_json({"sessions": []})
                return
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                sessions = json.load(f)
            self.send_json({"sessions": sessions})
            return

        # Serve Uploaded Assets (/uploads/filename)
        if path.startswith("/uploads/"):
            filename = os.path.basename(path)
            file_path = UPLOADS_DIR / filename
            if not file_path.exists():
                # Flexible alias fallbacks (q_001 <-> q01)
                for candidate in [
                    filename.replace("q_00", "q0").replace("q_0", "q0"),
                    filename.replace("q01", "q_001").replace("q03", "q_003"),
                    filename.replace("card_", "crop_"),
                    filename.replace("crop_", "card_")
                ]:
                    if (UPLOADS_DIR / candidate).exists():
                        file_path = UPLOADS_DIR / candidate
                        break

            if file_path.exists():
                self.send_response(200)
                if file_path.name.endswith(".png"):
                    self.send_header("Content-Type", "image/png")
                elif file_path.name.endswith(".jpg") or file_path.name.endswith(".jpeg"):
                    self.send_header("Content-Type", "image/jpeg")
                elif file_path.name.endswith(".svg"):
                    self.send_header("Content-Type", "image/svg+xml")
                else:
                    self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Length", str(file_path.stat().st_size))
                self.end_headers()
                with open(file_path, "rb") as f:
                    shutil.copyfileobj(f, self.wfile)
                return
            else:
                self.send_error(404, f"Upload file not found: {filename}")
                return

        # Otherwise serve SPA static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # API: Save/Update Question
        if path == "/api/questions":
            question_data = self.read_json()
            
            # Read existing
            with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
                db = json.load(f)
            questions = db.get("questions", [])
            
            # Update if exists, else append
            q_id = question_data.get("id")
            idx = next((i for i, q in enumerate(questions) if q.get("id") == q_id), -1)
            if idx >= 0:
                questions[idx] = question_data
            else:
                if not q_id:
                    question_data["id"] = f"q_{uuid.uuid4().hex[:6]}"
                questions.append(question_data)
                
            db["questions"] = questions
            with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(db, f, ensure_ascii=False, indent=2)
                
            self.send_json({"status": "success", "question": question_data})
            return

        # API: Create / Extend Domain
        if path == "/api/taxonomy/domain":
            post_data = self.read_json()
            domain_name = post_data.get("name", "").strip()
            if not domain_name:
                self.send_json({"status": "error", "message": "Tên lĩnh vực không được trống"}, 400)
                return
            with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
                tax = json.load(f)
            exists = any(d["name"].lower() == domain_name.lower() for d in tax.get("domains", []))
            if not exists:
                tax.setdefault("domains", []).append({
                    "id": f"domain_{uuid.uuid4().hex[:6]}",
                    "name": domain_name.upper(),
                    "icon": post_data.get("icon", "📁"),
                    "description": post_data.get("description", ""),
                    "skills": []
                })
                with open(TAXONOMY_FILE, "w", encoding="utf-8") as f:
                    json.dump(tax, f, ensure_ascii=False, indent=2)
            self.send_json({"status": "success", "taxonomy": tax})
            return

        # API: Create / Extend Skill Group
        if path == "/api/taxonomy/skill":
            post_data = self.read_json()
            domain_name = post_data.get("domain", "").strip()
            skill_name = post_data.get("name", "").strip()
            if not skill_name:
                self.send_json({"status": "error", "message": "Tên kỹ năng không được trống"}, 400)
                return
            with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
                tax = json.load(f)
            domain_obj = next((d for d in tax.get("domains", []) if d["name"].lower() == domain_name.lower()), None)
            if not domain_obj:
                domain_obj = {
                    "id": f"domain_{uuid.uuid4().hex[:6]}",
                    "name": domain_name.upper() if domain_name else "KHÁC",
                    "icon": "📁",
                    "skills": []
                }
                tax.setdefault("domains", []).append(domain_obj)
            
            exists = any(s["name"].lower() == skill_name.lower() for s in domain_obj.get("skills", []))
            if not exists:
                domain_obj.setdefault("skills", []).append({
                    "id": f"skill_{uuid.uuid4().hex[:6]}",
                    "name": skill_name,
                    "icon": post_data.get("icon", "🎯"),
                    "types": post_data.get("types", ["Dạng bài tập mới"])
                })
                with open(TAXONOMY_FILE, "w", encoding="utf-8") as f:
                    json.dump(tax, f, ensure_ascii=False, indent=2)
            self.send_json({"status": "success", "taxonomy": tax})
            return

        # API: Create / Extend Diagnostic Tag
        if path == "/api/taxonomy/tag":
            post_data = self.read_json()
            tag_name = post_data.get("name", "").strip()
            if not tag_name:
                self.send_json({"status": "error", "message": "Tên tag không được trống"}, 400)
                return
            with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
                tax = json.load(f)
            exists = any(t["name"].lower() == tag_name.lower() for t in tax.get("diagnostic_tags", []))
            if not exists:
                tax.setdefault("diagnostic_tags", []).append({
                    "id": f"tag_{uuid.uuid4().hex[:6]}",
                    "name": tag_name,
                    "vi": post_data.get("vi", tag_name)
                })
                with open(TAXONOMY_FILE, "w", encoding="utf-8") as f:
                    json.dump(tax, f, ensure_ascii=False, indent=2)
            self.send_json({"status": "success", "taxonomy": tax})
            return

        # API: Save Session Telemetry (Child finished a set of questions)
        if path == "/api/sessions":
            session_data = self.read_json()
            
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                sessions = json.load(f)
            sessions.append(session_data)
            with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(sessions, f, ensure_ascii=False, indent=2)
                
            self.send_json({"status": "success", "session_id": session_data.get("id")})
            return

        # API: Upload File and Run Extraction Pipeline
        if path == "/api/upload":
            try:
                ctype = self.headers.get("Content-Type", "")
                if not ctype.startswith("multipart/form-data"):
                    # Handle base64 / direct JSON upload if sent as json
                    payload = self.read_json()
                    import base64
                    img_data = payload.get("image_base64", "")
                    if "," in img_data:
                        img_data = img_data.split(",", 1)[1]
                    filename = payload.get("filename", f"upload_{uuid.uuid4().hex[:6]}.png")
                    file_path = UPLOADS_DIR / filename
                    with open(file_path, "wb") as f:
                        f.write(base64.b64decode(img_data))
                    # Extract
                    new_q = extract_from_image(str(file_path))
                    # Save to questions.json
                    with open(QUESTIONS_FILE, "r", encoding="utf-8") as qf:
                        db = json.load(qf)
                    db.setdefault("questions", []).append(new_q)
                    with open(QUESTIONS_FILE, "w", encoding="utf-8") as qf:
                        json.dump(db, qf, ensure_ascii=False, indent=2)
                    self.send_json({"status": "success", "question": new_q})
                    return

                # Multipart upload
                environ = {
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': ctype,
                    'CONTENT_LENGTH': self.headers.get('Content-Length')
                }
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=environ)
                file_item = form['file'] if 'file' in form else None
                
                if file_item is not None:
                    raw_filename = getattr(file_item, 'filename', None) or f"pasted_{uuid.uuid4().hex[:6]}.png"
                    safe_name = f"{uuid.uuid4().hex[:6]}_{os.path.basename(raw_filename)}"
                    save_path = UPLOADS_DIR / safe_name
                    with open(save_path, "wb") as out:
                        if hasattr(file_item, 'file') and file_item.file is not None:
                            shutil.copyfileobj(file_item.file, out)
                        elif hasattr(file_item, 'value') and file_item.value is not None:
                            val = file_item.value
                            out.write(val if isinstance(val, bytes) else val.encode('utf-8'))
                        
                    # Run extractor
                    extracted = extract_from_image(str(save_path))
                    # Save to db
                    with open(QUESTIONS_FILE, "r", encoding="utf-8") as qf:
                        db = json.load(qf)
                    db.setdefault("questions", []).append(extracted)
                    with open(QUESTIONS_FILE, "w", encoding="utf-8") as qf:
                        json.dump(db, qf, ensure_ascii=False, indent=2)
                    self.send_json({"status": "success", "question": extracted})
                    return
                else:
                    self.send_json({"status": "error", "message": "Không tìm thấy file tải lên"}, 400)
                    return
            except Exception as ex:
                import traceback
                traceback.print_exc()
                self.send_json({"status": "error", "message": f"Lỗi tải lên: {str(ex)}"}, 500)
                return

        self.send_error(404, "Endpoint not found")

def run(port=8080):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, AppHandler)
    print(f"🚀 Antigravity Visual Exercise Server running at http://localhost:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run(port)
