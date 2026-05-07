import { useEffect } from 'react'
import { useProjectStore } from './stores/projectStore'
import Header from './components/Header'
import Gallery from './components/Gallery'
import Editor from './components/Editor'
import StatsView from './components/StatsView'
import Notification from './components/Notification'
import PWAInstallBanner from './components/PWAInstallBanner'

export default function App() {
  const { activeView, loadProject } = useProjectStore()

  useEffect(() => {
    loadProject()
  }, [])

  return (
    <div className="min-h-dvh bg-dark-950 flex flex-col overflow-hidden">
      {/* Background ambiance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-brand-500/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-brand-700/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 overflow-hidden">
        {activeView === 'gallery' && <Gallery />}
        {activeView === 'editor' && <Editor />}
        {activeView === 'stats' && <StatsView />}
      </main>

      <Notification />
      <PWAInstallBanner />
    </div>
  )
}
