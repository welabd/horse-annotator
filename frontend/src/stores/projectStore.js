import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

const API_BASE = import.meta.env.VITE_API_BASE
  ? `${import.meta.env.VITE_API_BASE}/api`
  : '/api'

export const CLASSES = [
  { id: 0, name: 'standing', color: '#f97316', label: 'Standing', emoji: '🐴' },
  { id: 1, name: 'lying',    color: '#3b82f6', label: 'Lying',    emoji: '😴' },
  { id: 2, name: 'foaling',  color: '#a855f7', label: 'Foaling',  emoji: '🐣' },
]

export const useProjectStore = create(
  persist(
    (set, get) => ({
      // Project meta
      projectName: 'Horse Annotation Project',
      images: [],          // { id, filename, url, width, height, annotations[], annotated, auto_detected }
      selectedImageId: null,
      activeView: 'gallery', // 'gallery' | 'editor' | 'stats'

      // UI state
      isUploading: false,
      isDetecting: false,
      isExporting: false,
      notification: null,

      // Editor state
      selectedAnnotationId: null,
      activeClassId: 0,
      editorTool: 'select', // 'select' | 'draw'
      zoom: 1,
      panX: 0,
      panY: 0,
      showConfidence: true,
      brightness: 100,

      // ── Setters ──────────────────────────────────────────────────────────
      setProjectName: (name) => set({ projectName: name }),
      setActiveView: (v) => set({ activeView: v, selectedAnnotationId: null }),
      setSelectedImageId: (id) => set({ selectedImageId: id, selectedAnnotationId: null }),
      setActiveClass: (id) => set({ activeClassId: id }),
      setEditorTool: (t) => set({ editorTool: t }),
      setZoom: (z) => set({ zoom: Math.max(0.2, Math.min(5, z)) }),
      setPan: (x, y) => set({ panX: x, panY: y }),
      setSelectedAnnotation: (id) => set({ selectedAnnotationId: id }),
      setShowConfidence: (v) => set({ showConfidence: v }),
      setBrightness: (v) => set({ brightness: v }),

      // ── Notifications ────────────────────────────────────────────────────
      notify: (message, type = 'info', duration = 3000) => {
        set({ notification: { message, type, id: Date.now() } })
        setTimeout(() => set({ notification: null }), duration)
      },

      // ── Image management ─────────────────────────────────────────────────
      addImages: (newImages) =>
        set((state) => ({
          images: [
            ...state.images,
            ...newImages.filter((img) => !state.images.find((i) => i.id === img.id)),
          ],
        })),

      removeImage: async (imageId) => {
        try {
          await fetch(`${API_BASE}/images/${imageId}`, { method: 'DELETE' })
        } catch (e) { /* ignore */ }
        set((state) => ({
          images: state.images.filter((i) => i.id !== imageId),
          selectedImageId: state.selectedImageId === imageId ? null : state.selectedImageId,
        }))
      },

      getSelectedImage: () => {
        const { images, selectedImageId } = get()
        return images.find((i) => i.id === selectedImageId) || null
      },

      // ── Auto-detect ───────────────────────────────────────────────────────
      detectHorses: async (imageId) => {
        const { images } = get()
        const image = images.find((i) => i.id === imageId)
        if (!image) return

        set({ isDetecting: true })
        try {
          const res = await fetch(`${API_BASE}/detect/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_id: imageId, filename: image.filename }),
          })
          const data = await res.json()

          const annotations = (data.detections || []).map((det) => ({
            id: uuidv4(),
            class_id: det.class_id,
            cx: det.cx,
            cy: det.cy,
            bw: det.bw,
            bh: det.bh,
            confidence: det.confidence,
            auto_detected: true,
          }))

          set((state) => ({
            images: state.images.map((img) =>
              img.id === imageId
                ? { ...img, annotations, annotated: annotations.length > 0, auto_detected: true }
                : img
            ),
          }))

          get().notify(
            annotations.length > 0
              ? `✅ Detected ${annotations.length} horse${annotations.length > 1 ? 's' : ''}`
              : '⚠️ No horses detected — add boxes manually',
            annotations.length > 0 ? 'success' : 'warning'
          )

          // Save to backend
          await get().saveAnnotations(imageId)
          return annotations
        } catch (err) {
          get().notify('❌ Detection failed: ' + err.message, 'error')
          return []
        } finally {
          set({ isDetecting: false })
        }
      },

      // ── Annotations ───────────────────────────────────────────────────────
      addAnnotation: (imageId, ann) => {
        const annotation = {
          id: uuidv4(),
          class_id: get().activeClassId,
          confidence: null,
          auto_detected: false,
          ...ann,
        }
        set((state) => ({
          images: state.images.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  annotations: [...(img.annotations || []), annotation],
                  annotated: true,
                }
              : img
          ),
          selectedAnnotationId: annotation.id,
        }))
        get().saveAnnotations(imageId)
        return annotation
      },

      updateAnnotation: (imageId, annId, updates) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  annotations: (img.annotations || []).map((a) =>
                    a.id === annId ? { ...a, ...updates } : a
                  ),
                }
              : img
          ),
        }))
        // Debounced save
        clearTimeout(window._saveTimeout)
        window._saveTimeout = setTimeout(() => get().saveAnnotations(imageId), 500)
      },

      deleteAnnotation: (imageId, annId) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  annotations: (img.annotations || []).filter((a) => a.id !== annId),
                  annotated: (img.annotations || []).filter((a) => a.id !== annId).length > 0,
                }
              : img
          ),
          selectedAnnotationId: state.selectedAnnotationId === annId ? null : state.selectedAnnotationId,
        }))
        get().saveAnnotations(imageId)
      },

      saveAnnotations: async (imageId) => {
        const { images } = get()
        const image = images.find((i) => i.id === imageId)
        if (!image) return
        try {
          await fetch(`${API_BASE}/project/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_id: imageId, annotations: image.annotations || [] }),
          })
        } catch (e) { /* silent */ }
      },

      // ── Upload ────────────────────────────────────────────────────────────
      uploadImages: async (files) => {
        set({ isUploading: true })
        const formData = new FormData()
        for (const file of files) formData.append('files', file)

        try {
          const res = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            body: formData,
          })
          const data = await res.json()

          if (data.uploaded?.length > 0) {
            const newImages = data.uploaded.map((img) => ({
              ...img,
              annotations: [],
              annotated: false,
            }))
            get().addImages(newImages)
            get().notify(`✅ Uploaded ${data.uploaded.length} image${data.uploaded.length > 1 ? 's' : ''}`, 'success')

            // Save to project on backend
            await get().syncProject()
          }

          if (data.errors?.length > 0) {
            get().notify(`⚠️ ${data.errors.length} files failed`, 'warning')
          }

          return data.uploaded || []
        } catch (err) {
          get().notify('❌ Upload failed: ' + err.message, 'error')
          return []
        } finally {
          set({ isUploading: false })
        }
      },

      // ── Sync / persist ─────────────────────────────────────────────────────
      syncProject: async () => {
        const { projectName, images } = get()
        try {
          await fetch(`${API_BASE}/project/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName, images }),
          })
        } catch (e) { /* silent */ }
      },

      loadProject: async () => {
        try {
          const res = await fetch(`${API_BASE}/project/`)
          if (!res.ok) return
          const data = await res.json()
          if (data.images?.length > 0) {
            set({
              projectName: data.name || 'Horse Annotation Project',
              images: data.images,
            })
          }
        } catch (e) { /* silent */ }
      },

      // ── Export ────────────────────────────────────────────────────────────
      exportDataset: async () => {
        const { images, projectName } = get()
        const annotated = images.filter((img) => (img.annotations || []).length > 0)

        if (annotated.length === 0) {
          get().notify('⚠️ No annotated images to export', 'warning')
          return
        }

        set({ isExporting: true })
        try {
          const res = await fetch(`${API_BASE}/export/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectName, images }),
          })

          if (!res.ok) throw new Error(await res.text())

          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `horse_dataset_${Date.now()}.zip`
          a.click()
          URL.revokeObjectURL(url)

          get().notify(`✅ Exported ${annotated.length} annotated images`, 'success')
        } catch (err) {
          get().notify('❌ Export failed: ' + err.message, 'error')
        } finally {
          set({ isExporting: false })
        }
      },

      // ── Computed ──────────────────────────────────────────────────────────
      getStats: () => {
        const { images } = get()
        const total = images.length
        const annotated = images.filter((i) => i.annotated).length
        const totalBoxes = images.reduce((sum, i) => sum + (i.annotations || []).length, 0)
        const byClass = CLASSES.map((cls) => ({
          ...cls,
          count: images.reduce(
            (sum, img) =>
              sum + (img.annotations || []).filter((a) => a.class_id === cls.id).length,
            0
          ),
        }))
        return { total, annotated, unannotated: total - annotated, totalBoxes, byClass }
      },
    }),
    {
      name: 'horse-annotator-project',
      partialize: (state) => ({
        projectName: state.projectName,
        images: state.images,
        activeClassId: state.activeClassId,
        showConfidence: state.showConfidence,
      }),
    }
  )
)
