import { useRef, useCallback, useEffect } from 'react'
import { useProjectStore, CLASSES } from '../stores/projectStore'

const MIN_BOX_SIZE = 0.01  // normalized minimum

export function useAnnotationCanvas(canvasRef, imageRef) {
  const {
    getSelectedImage, addAnnotation, updateAnnotation, deleteAnnotation,
    selectedAnnotationId, setSelectedAnnotation,
    editorTool, activeClassId, zoom, panX, panY, showConfidence,
  } = useProjectStore()

  const stateRef = useRef({
    isDragging: false,
    isResizing: false,
    isDrawing: false,
    dragStart: null,
    resizeHandle: null,
    dragOffset: null,
    lastPointer: null,
    isPanning: false,
    pinchDist: null,
  })

  // ─── Convert canvas coords → normalized image coords ──────────────────
  const canvasToNorm = useCallback((cx, cy) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return { nx: 0, ny: 0 }

    const rect = canvas.getBoundingClientRect()
    const iw = image.naturalWidth
    const ih = image.naturalHeight

    // Account for letterboxing
    const canvasAR = rect.width / rect.height
    const imgAR = iw / ih
    let imgDisplayW, imgDisplayH, imgOffX, imgOffY

    if (canvasAR > imgAR) {
      imgDisplayH = rect.height
      imgDisplayW = ih * imgAR * (rect.height / ih)
      imgOffX = (rect.width - imgDisplayW) / 2
      imgOffY = 0
    } else {
      imgDisplayW = rect.width
      imgDisplayH = rect.width / imgAR
      imgOffX = 0
      imgOffY = (rect.height - imgDisplayH) / 2
    }

    const nx = (cx - imgOffX) / imgDisplayW
    const ny = (cy - imgOffY) / imgDisplayH
    return { nx, ny }
  }, [canvasRef, imageRef])

  // ─── Get pointer position relative to canvas ──────────────────────────
  const getPointer = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    if (e.touches) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  // ─── Hit test: which annotation is under pointer ───────────────────────
  const hitTest = useCallback((nx, ny, annotations, imgW, imgH) => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const ann = annotations[i]
      const x1 = ann.cx - ann.bw / 2
      const y1 = ann.cy - ann.bh / 2
      const x2 = ann.cx + ann.bw / 2
      const y2 = ann.cy + ann.bh / 2
      if (nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2) {
        return ann
      }
    }
    return null
  }, [])

  // ─── Hit test for resize handles ──────────────────────────────────────
  const hitTestHandle = useCallback((nx, ny, ann, canvasEl, imageEl) => {
    if (!canvasEl || !imageEl) return null
    const HANDLE_NORM = 0.015 // normalized hit radius

    const corners = [
      { h: 'nw', cx: ann.cx - ann.bw / 2, cy: ann.cy - ann.bh / 2 },
      { h: 'ne', cx: ann.cx + ann.bw / 2, cy: ann.cy - ann.bh / 2 },
      { h: 'sw', cx: ann.cx - ann.bw / 2, cy: ann.cy + ann.bh / 2 },
      { h: 'se', cx: ann.cx + ann.bw / 2, cy: ann.cy + ann.bh / 2 },
      { h: 'n',  cx: ann.cx,               cy: ann.cy - ann.bh / 2 },
      { h: 's',  cx: ann.cx,               cy: ann.cy + ann.bh / 2 },
      { h: 'e',  cx: ann.cx + ann.bw / 2,  cy: ann.cy               },
      { h: 'w',  cx: ann.cx - ann.bw / 2,  cy: ann.cy               },
    ]

    for (const corner of corners) {
      const dx = Math.abs(nx - corner.cx)
      const dy = Math.abs(ny - corner.cy)
      if (dx < HANDLE_NORM && dy < HANDLE_NORM) return corner.h
    }
    return null
  }, [])

  // ─── Draw annotations on canvas overlay ───────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const selectedImage = getSelectedImage()
    const annotations = selectedImage?.annotations || []

    const iw = image.naturalWidth || image.width
    const ih = image.naturalHeight || image.height
    const canvasAR = W / H
    const imgAR = iw / ih
    let imgDisplayW, imgDisplayH, imgOffX, imgOffY

    if (canvasAR > imgAR) {
      imgDisplayH = H
      imgDisplayW = H * imgAR
      imgOffX = (W - imgDisplayW) / 2
      imgOffY = 0
    } else {
      imgDisplayW = W
      imgDisplayH = W / imgAR
      imgOffX = 0
      imgOffY = (H - imgDisplayH) / 2
    }

    annotations.forEach((ann) => {
      const cls = CLASSES[ann.class_id] || CLASSES[0]
      const color = cls.color
      const isSelected = ann.id === selectedAnnotationId

      const px = (ann.cx - ann.bw / 2) * imgDisplayW + imgOffX
      const py = (ann.cy - ann.bh / 2) * imgDisplayH + imgOffY
      const pw = ann.bw * imgDisplayW
      const ph = ann.bh * imgDisplayH

      // Box shadow for selected
      if (isSelected) {
        ctx.shadowColor = color
        ctx.shadowBlur = 12
      }

      // Border
      ctx.strokeStyle = color
      ctx.lineWidth = isSelected ? 2.5 : 1.5
      ctx.globalAlpha = isSelected ? 1 : 0.85
      ctx.strokeRect(px, py, pw, ph)

      // Fill
      ctx.fillStyle = color
      ctx.globalAlpha = isSelected ? 0.12 : 0.06
      ctx.fillRect(px, py, pw, ph)

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Label background
      const labelPad = 4
      const fontSize = Math.max(10, Math.min(13, pw * 0.12))
      ctx.font = `500 ${fontSize}px "DM Sans", system-ui`
      const confText = showConfidence && ann.confidence ? ` ${Math.round(ann.confidence * 100)}%` : ''
      const label = `${cls.label}${confText}`
      const textW = ctx.measureText(label).width
      const labelH = fontSize + labelPad * 2
      const labelY = py > labelH + 2 ? py - labelH - 2 : py + 2

      ctx.fillStyle = color
      ctx.globalAlpha = 0.92
      roundRect(ctx, px - 0.5, labelY, textW + labelPad * 2 + 2, labelH, 3)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.fillStyle = '#fff'
      ctx.fillText(label, px + labelPad, labelY + labelH - labelPad - 1)

      // Resize handles for selected
      if (isSelected) {
        const handles = [
          [px, py], [px + pw, py], [px, py + ph], [px + pw, py + ph],
          [px + pw / 2, py], [px + pw / 2, py + ph],
          [px, py + ph / 2], [px + pw, py + ph / 2],
        ]
        handles.forEach(([hx, hy]) => {
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(hx, hy, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        })
      }
    })

    // Drawing preview rectangle
    const s = stateRef.current
    if (s.isDrawing && s.drawStart && s.drawCurrent) {
      const cls = CLASSES[activeClassId] || CLASSES[0]
      const { nx: x1, ny: y1 } = s.drawStart
      const { nx: x2, ny: y2 } = s.drawCurrent

      const px1 = Math.min(x1, x2) * imgDisplayW + imgOffX
      const py1 = Math.min(y1, y2) * imgDisplayH + imgOffY
      const pw1 = Math.abs(x2 - x1) * imgDisplayW
      const ph1 = Math.abs(y2 - y1) * imgDisplayH

      ctx.strokeStyle = cls.color
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.strokeRect(px1, py1, pw1, ph1)
      ctx.setLineDash([])
      ctx.fillStyle = cls.color
      ctx.globalAlpha = 0.1
      ctx.fillRect(px1, py1, pw1, ph1)
      ctx.globalAlpha = 1
    }
  }, [canvasRef, imageRef, getSelectedImage, selectedAnnotationId, activeClassId, showConfidence])

  // ─── Pointer down ──────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()

    const ptr = getPointer(e, canvas)
    const { nx, ny } = canvasToNorm(ptr.x, ptr.y)
    const s = stateRef.current
    s.lastPointer = ptr

    const selectedImage = getSelectedImage()
    const annotations = selectedImage?.annotations || []

    if (editorTool === 'draw') {
      s.isDrawing = true
      s.drawStart = { nx, ny }
      s.drawCurrent = { nx, ny }
      return
    }

    // Select tool
    // Check resize handles first (only if something selected)
    if (selectedAnnotationId) {
      const selAnn = annotations.find((a) => a.id === selectedAnnotationId)
      if (selAnn) {
        const handle = hitTestHandle(nx, ny, selAnn, canvas, imageRef.current)
        if (handle) {
          s.isResizing = true
          s.resizeHandle = handle
          s.resizeStart = { nx, ny, ...selAnn }
          return
        }
      }
    }

    // Check box hit
    const hit = hitTest(nx, ny, annotations)
    if (hit) {
      setSelectedAnnotation(hit.id)
      s.isDragging = true
      s.dragOffset = { dx: nx - hit.cx, dy: ny - hit.cy }
      s.dragAnn = hit
    } else {
      setSelectedAnnotation(null)
    }
  }, [canvasRef, imageRef, getPointer, canvasToNorm, editorTool, hitTest, hitTestHandle, selectedAnnotationId, getSelectedImage, setSelectedAnnotation])

  // ─── Pointer move ──────────────────────────────────────────────────────
  const onPointerMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()

    const ptr = getPointer(e, canvas)
    const { nx, ny } = canvasToNorm(ptr.x, ptr.y)
    const s = stateRef.current
    const selectedImage = getSelectedImage()
    if (!selectedImage) return

    if (s.isDrawing) {
      s.drawCurrent = { nx, ny }
      draw()
      return
    }

    if (s.isDragging && s.dragAnn) {
      const newCx = Math.max(s.dragAnn.bw / 2, Math.min(1 - s.dragAnn.bw / 2, nx - s.dragOffset.dx))
      const newCy = Math.max(s.dragAnn.bh / 2, Math.min(1 - s.dragAnn.bh / 2, ny - s.dragOffset.dy))
      updateAnnotation(selectedImage.id, s.dragAnn.id, { cx: newCx, cy: newCy })
      s.dragAnn = { ...s.dragAnn, cx: newCx, cy: newCy }
      draw()
      return
    }

    if (s.isResizing && s.resizeStart) {
      const ann = selectedImage.annotations?.find((a) => a.id === selectedAnnotationId)
      if (!ann) return

      let { cx, cy, bw, bh } = s.resizeStart
      const h = s.resizeHandle
      let x1 = cx - bw / 2
      let y1 = cy - bh / 2
      let x2 = cx + bw / 2
      let y2 = cy + bh / 2

      if (h.includes('n')) y1 = Math.min(ny, y2 - MIN_BOX_SIZE)
      if (h.includes('s')) y2 = Math.max(ny, y1 + MIN_BOX_SIZE)
      if (h.includes('w')) x1 = Math.min(nx, x2 - MIN_BOX_SIZE)
      if (h.includes('e')) x2 = Math.max(nx, x1 + MIN_BOX_SIZE)

      updateAnnotation(selectedImage.id, selectedAnnotationId, {
        cx: (x1 + x2) / 2,
        cy: (y1 + y2) / 2,
        bw: x2 - x1,
        bh: y2 - y1,
      })
      draw()
      return
    }

    s.lastPointer = ptr
  }, [canvasRef, getPointer, canvasToNorm, getSelectedImage, updateAnnotation, selectedAnnotationId, draw])

  // ─── Pointer up ───────────────────────────────────────────────────────
  const onPointerUp = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ptr = getPointer(e, canvas)
    const { nx, ny } = canvasToNorm(ptr.x, ptr.y)
    const s = stateRef.current
    const selectedImage = getSelectedImage()

    if (s.isDrawing && selectedImage) {
      const { nx: sx, ny: sy } = s.drawStart || { nx: 0, ny: 0 }
      const bw = Math.abs(nx - sx)
      const bh = Math.abs(ny - sy)

      if (bw > MIN_BOX_SIZE && bh > MIN_BOX_SIZE) {
        addAnnotation(selectedImage.id, {
          cx: (sx + nx) / 2,
          cy: (sy + ny) / 2,
          bw: Math.min(bw, 1),
          bh: Math.min(bh, 1),
        })
      }
      s.isDrawing = false
      s.drawStart = null
      s.drawCurrent = null
    }

    s.isDragging = false
    s.isResizing = false
    s.dragAnn = null
    draw()
  }, [canvasRef, getPointer, canvasToNorm, getSelectedImage, addAnnotation, draw])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      const selectedImage = getSelectedImage()
      if (!selectedImage) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        if (document.activeElement?.tagName === 'INPUT') return
        deleteAnnotation(selectedImage.id, selectedAnnotationId)
      }
      if (e.key === 'd') useProjectStore.getState().setEditorTool('draw')
      if (e.key === 's' || e.key === 'Escape') useProjectStore.getState().setEditorTool('select')
      if (e.key === '1') useProjectStore.getState().setActiveClass(0)
      if (e.key === '2') useProjectStore.getState().setActiveClass(1)
      if (e.key === '3') useProjectStore.getState().setActiveClass(2)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedAnnotationId, getSelectedImage, deleteAnnotation])

  // Redraw when state changes
  useEffect(() => {
    draw()
  })

  return { draw, onPointerDown, onPointerMove, onPointerUp }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
