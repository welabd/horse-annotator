import { useProjectStore } from '../stores/projectStore'
import clsx from 'clsx'

const TYPE_STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error:   'border-red-500/30 bg-red-500/10 text-red-300',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  info:    'border-brand-500/30 bg-brand-500/10 text-brand-300',
}

export default function Notification() {
  const { notification } = useProjectStore()

  if (!notification) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up safe-bottom">
      <div className={clsx(
        'glass rounded-2xl px-5 py-3 border text-sm font-medium shadow-2xl backdrop-blur-xl max-w-sm text-center',
        TYPE_STYLES[notification.type] || TYPE_STYLES.info
      )}>
        {notification.message}
      </div>
    </div>
  )
}
