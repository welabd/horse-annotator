import { useProjectStore } from '../stores/projectStore'
import clsx from 'clsx'

const NAV = [
  { id: 'gallery', label: 'Gallery', icon: '⬛' },
  { id: 'editor',  label: 'Annotate', icon: '✏️' },
  { id: 'stats',   label: 'Stats', icon: '📊' },
]

export default function Header() {
  const { activeView, setActiveView, images, isExporting, exportDataset, getStats } = useProjectStore()
  const stats = getStats()

  return (
    <header className="relative z-20 safe-top">
      <div className="glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-base shadow-lg glow-brand">
                🐴
              </div>
              <div className="hidden sm:block">
                <div className="font-display font-bold text-white text-sm leading-none">
                  Horse<span className="gradient-text">AI</span>
                </div>
                <div className="text-dark-400 text-xs mt-0.5 font-mono">
                  {stats.total} images · {stats.totalBoxes} boxes
                </div>
              </div>
            </div>

            {/* Nav tabs */}
            <nav className="flex items-center gap-1 glass rounded-xl p-1">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-display font-medium transition-all duration-200',
                    activeView === item.id
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'text-dark-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="sm:hidden">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Export button */}
            <button
              onClick={exportDataset}
              disabled={isExporting || stats.annotated === 0}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-display font-semibold transition-all duration-200',
                stats.annotated > 0 && !isExporting
                  ? 'bg-brand-500 hover:bg-brand-400 text-white glow-brand active:scale-95'
                  : 'glass text-dark-500 cursor-not-allowed'
              )}
            >
              {isExporting ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <span className="hidden sm:inline">Exporting…</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  <span className="hidden sm:inline">Export ZIP</span>
                  {stats.annotated > 0 && (
                    <span className="hidden sm:inline badge bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {stats.annotated}
                    </span>
                  )}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
