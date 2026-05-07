import { useProjectStore, CLASSES } from '../stores/projectStore'

export default function StatsView() {
  const { images, getStats, projectName, setProjectName, exportDataset, isExporting } = useProjectStore()
  const stats = getStats()

  const progress = stats.total > 0 ? (stats.annotated / stats.total) * 100 : 0

  return (
    <div className="h-full overflow-y-auto" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">

        {/* Project name editor */}
        <div className="glass rounded-2xl p-5">
          <label className="block text-xs text-dark-500 font-mono uppercase tracking-wider mb-2">
            Project Name
          </label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-white font-display text-lg focus:outline-none focus:border-brand-500/50 transition-all"
            placeholder="Horse Annotation Project"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Images" value={stats.total} icon="🖼️" color="brand" />
          <StatCard label="Annotated" value={stats.annotated} icon="✅" color="green" />
          <StatCard label="Unannotated" value={stats.unannotated} icon="⏳" color="yellow" />
          <StatCard label="Total Boxes" value={stats.totalBoxes} icon="📦" color="blue" />
        </div>

        {/* Progress bar */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-white">Annotation Progress</p>
            <span className="font-mono text-sm text-brand-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-dark-500 text-xs mt-2 font-mono">
            {stats.annotated} of {stats.total} images annotated
          </p>
        </div>

        {/* Class breakdown */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white mb-4">Class Distribution</h3>
          <div className="space-y-3">
            {stats.byClass.map((cls) => {
              const pct = stats.totalBoxes > 0 ? (cls.count / stats.totalBoxes) * 100 : 0
              return (
                <div key={cls.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }} />
                      <span className="text-sm font-medium text-white">{cls.emoji} {cls.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-dark-400">{Math.round(pct)}%</span>
                      <span className="badge" style={{ backgroundColor: cls.color + '22', color: cls.color, borderColor: cls.color + '44', border: '1px solid' }}>
                        {cls.count}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: cls.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {stats.totalBoxes === 0 && (
            <p className="text-dark-500 text-sm text-center py-4">No annotations yet</p>
          )}
        </div>

        {/* Per-image breakdown */}
        {images.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-semibold text-white mb-4">Image Overview</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {images.map((img) => {
                const count = (img.annotations || []).length
                return (
                  <div key={img.id} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                    <img
                      src={img.url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-dark-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-mono text-xs">
                        {img.original_filename || img.filename}
                      </p>
                      <p className="text-xs text-dark-500">{img.width}×{img.height}px</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {count > 0 ? (
                        <>
                          <span className="badge-green">{count} boxes</span>
                          {/* Mini class dots */}
                          <div className="flex gap-0.5">
                            {(img.annotations || []).slice(0, 5).map((ann) => (
                              <span
                                key={ann.id}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: CLASSES[ann.class_id]?.color || '#888' }}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className="badge bg-dark-700 text-dark-500">Empty</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Export CTA */}
        {stats.annotated > 0 && (
          <div className="glass rounded-2xl p-5 border border-brand-500/20 glow-brand">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-lg">Ready to Export!</h3>
                <p className="text-dark-400 text-sm mt-1">
                  {stats.annotated} images with {stats.totalBoxes} annotations ready for YOLO training.
                </p>
              </div>
              <button
                onClick={exportDataset}
                disabled={isExporting}
                className="btn-primary flex items-center gap-2 shrink-0 glow-brand"
              >
                {isExporting ? 'Exporting…' : '⬇️ Export ZIP'}
              </button>
            </div>
          </div>
        )}

        {/* YAML preview */}
        {stats.annotated > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-semibold text-white mb-3">data.yaml Preview</h3>
            <pre className="text-xs font-mono text-dark-300 bg-dark-900 rounded-xl p-4 overflow-x-auto">
{`path: .
train: images/train
val: images/train

nc: 3
names:
  0: standing
  1: lying
  2: foaling`}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    brand: 'from-brand-500/20 to-brand-700/10 text-brand-400',
    green: 'from-emerald-500/20 to-emerald-700/10 text-emerald-400',
    yellow: 'from-yellow-500/20 to-yellow-700/10 text-yellow-400',
    blue: 'from-blue-500/20 to-blue-700/10 text-blue-400',
  }
  return (
    <div className={`glass rounded-2xl p-4 bg-gradient-to-br ${colorMap[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      <p className="text-xs text-dark-400 mt-0.5">{label}</p>
    </div>
  )
}
