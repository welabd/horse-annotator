import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useProjectStore, CLASSES } from '../stores/projectStore'
import clsx from 'clsx'

export default function Gallery() {
  const {
    images, isUploading, isDetecting,
    uploadImages, detectHorses, removeImage,
    setSelectedImageId, setActiveView,
  } = useProjectStore()

  const fileInputRef = useRef(null)

  const onDrop = useCallback(async (accepted) => {
    if (accepted.length === 0) return
    await uploadImages(accepted)
  }, [uploadImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] },
    multiple: true,
    noClick: true,
  })

  const openEditor = (imageId) => {
    setSelectedImageId(imageId)
    setActiveView('editor')
  }

  const handleDetect = async (e, imageId) => {
    e.stopPropagation()
    await detectHorses(imageId)
  }

  const handleRemove = (e, imageId) => {
    e.stopPropagation()
    if (confirm('Remove this image?')) removeImage(imageId)
  }

  return (
    <div
      {...getRootProps()}
      className="h-full overflow-y-auto"
      style={{ height: 'calc(100dvh - 56px)' }}
    >
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass rounded-3xl p-12 text-center border-2 border-dashed border-brand-500/60 glow-brand-strong animate-pulse-glow">
            <div className="text-6xl mb-4">📸</div>
            <p className="font-display text-xl text-white font-semibold">Drop images here</p>
            <p className="text-dark-400 mt-1">JPG, PNG, WebP, HEIC supported</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Upload zone (when empty) */}
        {images.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="glass rounded-3xl p-8 sm:p-12 text-center max-w-md w-full border border-dashed border-white/10 hover:border-brand-500/40 transition-all duration-300">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/10 flex items-center justify-center mx-auto mb-6 text-4xl">
                🐴
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                Start Annotating
              </h2>
              <p className="text-dark-400 mb-8 text-sm leading-relaxed">
                Upload horse images to auto-detect and annotate them with YOLO bounding boxes for AI training.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <label className="btn-primary cursor-pointer flex items-center gap-2 justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture={undefined}
                    onChange={(e) => uploadImages(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Upload Images
                </label>
                <label className="btn-secondary cursor-pointer flex items-center gap-2 justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadImages(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Camera
                </label>
              </div>
              <p className="text-dark-500 text-xs mt-6">
                Or drag & drop images anywhere on this screen
              </p>
            </div>
          </div>
        )}

        {/* Image grid */}
        {images.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="font-display text-lg font-bold text-white">
                  Dataset
                </h1>
                <span className="badge-orange">{images.length} images</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Upload button */}
                <label className="btn-primary text-sm cursor-pointer flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => uploadImages(Array.from(e.target.files))}
                    className="hidden"
                  />
                  {isUploading ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Uploading…</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Add Images</>
                  )}
                </label>
                {/* Camera */}
                <label className="btn-secondary text-sm cursor-pointer flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => e.target.files[0] && uploadImages([e.target.files[0]])}
                    className="hidden"
                  />
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span className="hidden sm:inline">Camera</span>
                </label>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {images.map((img, idx) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  idx={idx}
                  onOpen={openEditor}
                  onDetect={handleDetect}
                  onRemove={handleRemove}
                  isDetecting={isDetecting}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ImageCard({ image, idx, onOpen, onDetect, onRemove, isDetecting }) {
  const annCount = (image.annotations || []).length
  const hasAnnotations = annCount > 0

  return (
    <div
      className="group relative glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:glow-brand animate-fade-in"
      style={{ animationDelay: `${idx * 30}ms` }}
      onClick={() => onOpen(image.id)}
    >
      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-dark-800">
        <img
          src={image.url}
          alt={image.original_filename || image.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          style={{ filter: 'brightness(0.95)' }}
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          {hasAnnotations ? (
            <span className="badge bg-emerald-500/90 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              ✓ {annCount}
            </span>
          ) : (
            <span className="badge bg-dark-800/80 text-dark-400 text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              No boxes
            </span>
          )}
        </div>

        {/* Class colors strip */}
        {hasAnnotations && (
          <div className="absolute bottom-0 left-0 right-0 h-1 flex">
            {getClassStrip(image.annotations).map((seg, i) => (
              <div key={i} className="flex-1 h-full" style={{ backgroundColor: seg.color }} />
            ))}
          </div>
        )}

        {/* Actions on hover */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => onDetect(e, image.id)}
            disabled={isDetecting}
            className="w-9 h-9 rounded-xl bg-brand-500/90 hover:bg-brand-400 text-white flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            title="Auto-detect horses"
          >
            {isDetecting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
            )}
          </button>
          <button
            onClick={(e) => onRemove(e, image.id)}
            className="w-9 h-9 rounded-xl bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            title="Remove image"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2">
        <p className="text-xs text-dark-400 truncate font-mono">
          {image.original_filename || image.filename}
        </p>
      </div>
    </div>
  )
}

function getClassStrip(annotations) {
  if (!annotations?.length) return []
  const colors = ['#f97316', '#3b82f6', '#a855f7']
  return annotations.slice(0, 8).map((ann) => ({ color: colors[ann.class_id] || colors[0] }))
}
