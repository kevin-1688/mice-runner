import { createRoot } from 'react-dom/client'
import './game.css'
import App from './App.jsx'

// StrictMode disabled: game.js uses imperative DOM manipulation that
// is incompatible with StrictMode's double-invoke behaviour in dev.
createRoot(document.getElementById('root')).render(<App />)
