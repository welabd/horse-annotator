import { useRef, useEffect, useCallback, useState } from 'react'
import { useProjectStore, CLASSES } from '../stores/projectStore'
import { useAnnotationCanvas } from '../hooks/useAnnotationCanvas'
import clsx from 'clsx'

export default function Editor() {
  const {
    getSelectedImage, images, setSelectedImageId, setActiveView,
    selectedAnnotationId, setSelectedAnnotation,
    editorTool, setEditorTool,
    activeClassId, setActiveClass,
    detectHorses, isDetecting,
    deleteAnnotation, updateAnnotation, addAnnotation,
    zoom, setZoom, panX, panY, setPan,
    showConfidence, setShowConfidence,
    brightness, setBrightness,
  } = useProjectStore()

  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const selectedImage = getSelectedImage()

  const { draw, onPointerDown, onPointerMove, onPointerUp } = useAnnotationCanvas(canvasRef, imageRef)

  // ─── Navigate images ──────────────────────────────────────────────────
  const currentIdx = images.findIndex((i) => i.id === selectedImage?.id)
  const prevImage = () => {
    if (currentIdx > 0) setSelectedImageId(images[currentIdx - 1].id)
  }
  const nextImage = () => {
    if (currentIdx < images.length - 1) setSelectedImageId(images[currentIdx + 1].id)
  }

  // ─── Canvas resize observer ───────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Update canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !canvasSize.w) return
    canvas.width = canvasSize.w
    canvas.height = canvasSize.h
    draw()
  }, [canvasSize, draw])

  // Redraw on image load
  const onImageLoad = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const { width, height } = container.getBoundingClientRect()
    canvas.width = Math.round(width)
    canvas.height = Math.round(height)
    draw()
  }, [draw])

  if (!selectedImage) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">🐴</div>
          <p className="font-display text-xl font-semibold text-white mb-2">No image selected</p>
          <button onClick={() => setActiveView('gallery')} className="btn-primary mt-4">
            Go to Gallery
          </button>
        </div>
      </div>
    )
  }

  const annotations = selectedImage.annotations || []
  const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId)

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden sm:flex flex-col w-56 lg:w-64 border-r border-white/[0.06] glass overflow-y-auto shrink-0">
        <div className="p-3 space-y-4">

          {/* Image nav */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-dark-400 font-mono mb-2">
              Image {currentIdx + 1} / {images.length}
            </p>
            <div className="flex gap-2">
              <button onClick={prevImage} disabled={currentIdx === 0} className="btn-secondary text-xs flex-1 py-1.5">
                ← Prev
              </button>
              <button onClick={nextImage} disabled={currentIdx === images.length - 1} className="btn-secondary text-xs flex-1 py-1.5">
                Next →
              </button>
            </div>
          </div>

          {/* Tools */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-dark-500 font-mono mb-2 uppercase tracking-wider">Tools</p>
            <div className="grid grid-cols-2 gap-1.5">
              <ToolBtn
                active={editorTool === 'select'}
                onClick={() => setEditorTool('select')}
                icon="↖"
                label="Select (S)"
              />
              <ToolBtn
                active={editorTool === 'draw'}
                onClick={() => setEditorTool('draw')}
                icon="⬜"
                label="Draw (D)"
              />
            </div>
          </div>

          {/* Classes */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-dark-500 font-mono mb-2 uppercase tracking-wider">Classes</p>
            <div className="space-y-1">
              {CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setActiveClass(cls.id)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all',
                    activeClassId === cls.id
                      ? 'bg-white/10 text-white'
                      : 'text-dark-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="font-medium">{cls.emoji} {cls.label}</span>
                  <span className="ml-auto text-dark-500 text-xs font-mono">{cls.id + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto-detect */}
          <button
            onClick={() => detectHorses(selectedImage.id)}
            disabled={isDetecting}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2"
          >
            {isDetecting ? (
              <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Detecting…</>
            ) : (
              <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Auto-Detect</>
            )}
          </button>

          {/* Brightness */}
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-dark-500 font-mono uppercase tracking-wider">Brightness</p>
              <span className="text-xs text-dark-400 font-mono">{brightness}%</span>
            </div>
            <input
              type="range" min="50" max="200" value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Options */}
          <div className="glass rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={showConfidence}
                onChange={(e) => setShowConfidence(e.target.checked)}
                className="accent-brand-500"
              />
              <span className="text-sm text-dark-300">Show confidence</span>
            </label>
          </div>

          {/* Keyboard shortcuts */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-dark-500 font-mono mb-2 uppercase tracking-wider">Shortcuts</p>
            <div className="space-y-1 text-xs font-mono text-dark-400">
              {[
                ['S', 'Select tool'],
                ['D', 'Draw tool'],
                ['Del', 'Delete box'],
                ['1/2/3', 'Switch class'],
                ['Esc', 'Deselect'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between">
                  <kbd className="bg-dark-700 px-1.5 py-0.5 rounded text-dark-300">{key}</kbd>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main canvas area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Canvas toolbar (mobile-friendly) */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] shrink-0 overflow-x-auto">
          {/* Tool toggles */}
          <div className="flex items-center gap-1 glass rounded-lg p-1 shrink-0">
            <button
              onClick={() => setEditorTool('select')}
              className={clsx('px-2.5 py-1.5 rounded-md text-xs font-medium transition-all', editorTool === 'select' ? 'bg-brand-500 text-white' : 'text-dark-400 hover:text-white')}
            >↖ Select</button>
            <button
              onClick={() => setEditorTool('draw')}
              className={clsx('px-2.5 py-1.5 rounded-md text-xs font-medium transition-all', editorTool === 'draw' ? 'bg-brand-500 text-white' : 'text-dark-400 hover:text-white')}
            >⬜ Draw</button>
          </div>

          {/* Class quick-select */}
          <div className="flex items-center gap-1 shrink-0">
            {CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setActiveClass(cls.id)}
                className={clsx('px-2 py-1.5 rounded-lg text-xs font-medium transition-all border', activeClassId === cls.id ? 'text-white' : 'text-dark-400 hover:text-white border-transparent')}
                style={activeClassId === cls.id ? { backgroundColor: cls.color + '33', borderColor: cls.color + '66', color: cls.color } : {}}
              >
                {cls.emoji} <span className="hidden sm:inline">{cls.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Detect button (mobile) */}
          <button
            onClick={() => detectHorses(selectedImage.id)}
            disabled={isDetecting}
            className="sm:hidden btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
          >
            {isDetecting ? '…' : '🔍 Detect'}
          </button>

          {/* Image counter */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevImage} disabled={currentIdx === 0} className="w-7 h-7 glass rounded-lg flex items-center justify-center text-sm disabled:opacity-30">←</button>
            <span className="text-xs text-dark-400 font-mono px-1">{currentIdx + 1}/{images.length}</span>
            <button onClick={nextImage} disabled={currentIdx === images.length - 1} className="w-7 h-7 glass rounded-lg flex items-center justify-center text-sm disabled:opacity-30">→</button>
          </div>
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-dark-900"
          style={{ touchAction: 'none' }}
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={selectedImage.url}
            alt=""
            onLoad={onImageLoad}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ filter: `brightness(${brightness}%)` }}
            draggable={false}
          />

          {/* Canvas overlay */}
          <canvas
            ref={canvasRef}
            className={clsx(
              'absolute inset-0 w-full h-full',
              editorTool === 'draw' ? 'canvas-draw' : 'canvas-default'
            )}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          />

          {/* Empty state hint */}
          {annotations.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-xl px-4 py-2 pointer-events-none">
              <p className="text-sm text-dark-400">
                {editorTool === 'draw' ? '👆 Drag to draw a box' : '🔍 Click "Auto-Detect" or switch to Draw tool'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right sidebar: annotations list ──────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 border-l border-white/[0.06] glass overflow-hidden shrink-0">
        <div className="p-3 border-b border-white/[0.06]">
          <p className="text-xs text-dark-500 font-mono uppercase tracking-wider">
            Annotations ({annotations.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {annotations.length === 0 && (
            <p className="text-xs text-dark-500 text-center py-8">No annotations yet</p>
          )}
          {annotations.map((ann, idx) => {
            const cls = CLASSES[ann.class_id] || CLASSES[0]
            const isSelected = ann.id === selectedAnnotationId
            return (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnotation(isSelected ? null : ann.id)}
                className={clsx(
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm',
                  isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cls.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{cls.label}</p>
                  {ann.confidence && (
                    <p className="text-dark-500 text-xs font-mono">{Math.round(ann.confidence * 100)}%</p>
                  )}
                </div>

                {/* Class change */}
                <select
                  value={ann.class_id}
                  onChange={(e) => updateAnnotation(selectedImage.id, ann.id, { class_id: parseInt(e.target.value) })}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs bg-dark-700 border border-white/10 rounded px-1 py-0.5 text-dark-300 w-20"
                >
                  {CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAnnotation(selectedImage.id, ann.id) }}
                  className="w-6 h-6 rounded flex items-center justify-center text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Selected annotation editor */}
        {selectedAnn && (
          <div className="p-3 border-t border-white/[0.06] space-y-2">
            <p className="text-xs text-dark-500 font-mono uppercase tracking-wider">Edit Box</p>
            {[
              { label: 'Class', key: 'class_id', type: 'class' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                {type === 'class' && (
                  <select
                    value={selectedAnn.class_id}
                    onChange={(e) => updateAnnotation(selectedImage.id, selectedAnn.id, { class_id: parseInt(e.target.value) })}
                    className="w-full text-xs bg-dark-700 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                  >
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <button
              onClick={() => deleteAnnotation(selectedImage.id, selectedAnn.id)}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
            >
              🗑 Delete Box
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}

function ToolBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all w-full',
        active ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-dark-400 hover:text-white hover:bg-white/5'
      )}
    >
      <span className="text-base">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}
