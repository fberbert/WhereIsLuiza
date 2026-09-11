import { useEffect, useState } from 'react'
import { AccessibilityInfo, AppState } from 'react-native'

export function useGameEnvironment() {
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' && AppState.currentState !== 'inactive',
  )
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    let mounted = true
    let motionChanged = false
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'))
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      motionChanged = true
      setReducedMotion(value)
    })
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted && !motionChanged) setReducedMotion(value)
      })
      .catch(() => {})
    return () => {
      mounted = false
      app.remove()
      motion.remove()
    }
  }, [])
  return { foreground, reducedMotion }
}
