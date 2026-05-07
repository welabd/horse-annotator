#!/bin/bash
# start.sh — Start both backend and frontend

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🐴 Horse Annotator — Starting..."

# Copy .env if not exists
if [ ! -f "$SCRIPT_DIR/backend/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/backend/.env"
  echo "✅ Created backend/.env from .env.example"
fi

# Start backend
echo "🐍 Starting FastAPI backend on :8000..."
cd "$SCRIPT_DIR/backend"
if command -v uvicorn &>/dev/null; then
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
else
  python main.py &
fi
BACKEND_PID=$!

# Start frontend
echo "⚡ Starting Vite frontend on :5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Horse Annotator is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit" INT TERM
wait
