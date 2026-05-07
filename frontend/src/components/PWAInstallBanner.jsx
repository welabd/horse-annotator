import { useState, useEffect } from 'react'

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
    if (isStandalone) return

    // Check if dismissed
    if (localStorage.getItem('pwa-banner-dismissed')) return

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Android/Chrome prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    })

    // Show iOS instructions after 5 seconds
    if (ios) {
      setTimeout(() => setShow(true), 5000)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setShow(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom animate-slide-up">
      <div className="glass border-t border-white/[0.08] p-4 mx-3 mb-3 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xl shrink-0">
            🐴
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-white text-sm">
              Install Horse Annotator
            </p>
            {isIOS ? (
              <p className="text-dark-400 text-xs mt-0.5">
                Tap <span className="text-brand-400">Share</span> then{' '}
                <span className="text-brand-400">Add to Home Screen</span> for the best experience
              </p>
            ) : (
              <p className="text-dark-400 text-xs mt-0.5">
                Install as an app for offline access and better performance
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isIOS && (
              <button onClick={handleInstall} className="btn-primary text-xs px-3 py-1.5">
                Install
              </button>
            )}
            <button onClick={handleDismiss} className="text-dark-500 hover:text-white transition-colors p-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
