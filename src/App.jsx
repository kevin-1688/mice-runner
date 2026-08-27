import { useEffect, useRef } from 'react'
import GAME_HTML from './gameHtml.js'

export default function App() {
  const initialized = useRef(false)

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (initialized.current) return
    initialized.current = true

    // Telegram WebApp init
    try {
      const tg = window.Telegram?.WebApp
      if (tg) { tg.ready(); tg.expand() }
    } catch {}

    // Dynamically import game.js AFTER dangerouslySetInnerHTML has rendered the DOM
    import('./game.js').catch(err => console.error('game.js init error:', err))
  }, [])

  // gameHtml.js already contains ALL markup: main, drawer, overlays, modals
  return <div dangerouslySetInnerHTML={{ __html: GAME_HTML }} />
}
