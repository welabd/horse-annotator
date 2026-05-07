# 🐴 Horse Annotator — AI Dataset Annotation Tool

A professional, mobile-first web application for creating YOLO-format horse datasets. Auto-detects horses using YOLOv8, supports manual annotation editing, and exports training-ready ZIP archives.

---

## ✨ Features

- **Auto-detection** — YOLOv8 pretrained model detects horses automatically
- **Manual annotation** — Draw, move, resize, delete bounding boxes
- **3 horse classes** — standing, lying, foaling
- **Touch-optimized** — Full iPhone/iPad support with touch gestures
- **PWA** — Installable on iPhone via Safari "Add to Home Screen"
- **YOLO export** — Download ZIP with images/, labels/, data.yaml
- **Auto-save** — Annotations saved automatically
- **Dark glassmorphism UI** — Professional AI tool aesthetic

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API starts at `http://localhost:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure

```
horse-annotator/
├── frontend/                    # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── App.jsx             # Root component
│   │   ├── main.jsx            # React entry
│   │   ├── index.css           # Global styles
│   │   ├── stores/
│   │   │   └── projectStore.js # Zustand state management
│   │   ├── components/
│   │   │   ├── Header.jsx      # Top navigation
│   │   │   ├── Gallery.jsx     # Image grid + upload
│   │   │   ├── Editor.jsx      # Annotation canvas editor
│   │   │   ├── StatsView.jsx   # Dataset statistics
│   │   │   ├── Notification.jsx # Toast notifications
│   │   │   └── PWAInstallBanner.jsx
│   │   └── hooks/
│   │       └── useAnnotationCanvas.js  # Canvas drawing logic
│   ├── public/                 # Static assets + PWA icons
│   ├── vite.config.js          # Vite + PWA config
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                    # FastAPI Python server
│   ├── main.py                 # FastAPI app entry
│   ├── requirements.txt
│   ├── routers/
│   │   ├── images.py           # Upload/delete endpoints
│   │   ├── detection.py        # YOLO inference endpoint
│   │   ├── export.py           # ZIP export endpoint
│   │   └── project.py          # Project persistence
│   └── services/
│       ├── yolo_service.py     # YOLOv8 horse detection
│       ├── export_service.py   # YOLO dataset ZIP generator
│       └── project_service.py  # JSON project storage
│
├── uploads/                    # Uploaded images + project.json
├── exports/                    # Generated ZIP files
└── models/                     # Custom YOLO weights (optional)
```

---

## 🔧 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/images/upload` | Upload images |
| DELETE | `/api/images/{id}` | Delete image |
| POST | `/api/detect/` | Run YOLO detection |
| GET | `/api/detect/model-info` | Model status |
| POST | `/api/export/` | Export YOLO ZIP |
| GET | `/api/project/` | Get project |
| POST | `/api/project/save` | Save project |
| POST | `/api/project/annotations` | Update annotations |
| GET | `/api/project/stats` | Get statistics |

---

## 📦 YOLO Export Format

```
horse_dataset_YYYYMMDD_HHMMSS.zip
├── images/train/       ← Training images
├── labels/train/       ← YOLO .txt files
├── data.yaml           ← Dataset config
├── stats.json          ← Export statistics
└── README.md
```

**Label format:** `class_id cx cy w h` (all normalized 0-1)

```
# Classes:
# 0 = standing
# 1 = lying
# 2 = foaling
```

---

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` or `Esc` | Select tool |
| `D` | Draw tool |
| `Delete` | Delete selected box |
| `1` | Class: standing |
| `2` | Class: lying |
| `3` | Class: foaling |

---

## 📱 iPhone Installation (PWA)

1. Open `http://your-server-ip:5173` in Safari
2. Tap the **Share** button (square with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add** — app installs like a native app!

---

## 🏋️ Train Your Model

After exporting, train with:

```bash
pip install ultralytics
yolo train model=yolov8n.pt data=horse_dataset/data.yaml epochs=100 imgsz=640
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
PORT=8000
YOLO_MODEL_PATH=yolov8n.pt
```

---

## 🔌 Using a Custom YOLO Model

1. Place your `.pt` file in the `models/` directory
2. Set `YOLO_MODEL_PATH=models/your_model.pt` in `.env`
3. Restart the backend

---

## 📋 Requirements

- **Python 3.9+**
- **Node.js 18+**
- ~500MB disk for YOLOv8 model download (auto on first run)

---

## 🐛 Troubleshooting

**YOLO model download fails:**
```bash
# Manual download
pip install ultralytics
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

**HEIC images not converting:**
```bash
pip install pillow-heif
```

**Port conflict:**
```bash
# Change backend port
PORT=8001 python main.py
```
