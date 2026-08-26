import { useEffect, useRef } from 'react'
import GAME_HTML from './gameHtml.js'

const OVERLAYS_HTML = `
<div id="vignette"></div>

<div id="drawer">
  <div id="drawerSheet">
    <div class="drawer-handle"></div>
    <div class="drawer-header">
      <span class="drawer-title">📊 資產負債表</span>
      <button id="drawerClose" aria-label="關閉">✕</button>
    </div>
    <div class="drawer-tabs">
      <button class="drawer-tab active" data-tab="assets">資產清單</button>
      <button class="drawer-tab" data-tab="liabs">負債清單</button>
      <button class="drawer-tab" data-tab="shield">防護狀態</button>
    </div>
    <div id="drawerBody"></div>
  </div>
</div>

<button id="drawerToggle" aria-label="開啟資產負債表" style="position:relative">
  📊<span id="drawerBadge" style="position:absolute;top:-4px;right:-4px;background:var(--gold);color:#3a2c08;font-size:10px;font-weight:900;border-radius:10px;padding:1px 5px;min-width:16px;text-align:center;display:none">0</span>
</button>

<div id="floatBar">
  <button id="floatBarBtn" disabled>結算這個月 ▸ 抽下一張卡</button>
</div>

<div class="overlay" id="soulScreen" role="dialog" aria-modal="true" aria-labelledby="soulScreenTitle">
  <div class="modal" style="max-width:480px">
    <div class="badge" id="soulScreenTitle">財務現實檢查</div>
    <p class="soul-q">如果明天停止工作，<br>你現在的存款<br>能活幾天？</p>
    <div class="soul-counter" id="soulDays">—</div>
    <div class="soul-sub" id="soulSub">正在計算中…</div>
    <button id="soulCta" class="hide">我知道了，帶我跳出去 →</button>
  </div>
</div>

<div class="overlay hide" id="intro" role="dialog" aria-modal="true" aria-labelledby="introTitle">
  <div class="modal">
    <div class="badge">選擇職業</div>
    <h2 id="introTitle">你被困在老鼠賽跑裡</h2>
    <p>每月領薪、付帳單，途中出現<b>機會卡</b>與<b>誘惑卡</b>。目標：讓被動<b>現金流 ≥ 總支出</b>，跳出老鼠賽跑。</p>
    <div class="lesson">
      <b>配息型</b>資產給你每月現金流（推進自由）；<b>累計型</b>只增值、不配息（要止盈換成會生錢的資產）。小心偽裝成資產的負債：新車、自住房、升職加薪。
    </div>
    <div class="profgrid" id="profGrid"></div>
  </div>
</div>

<div class="overlay hide" id="endScreen" role="dialog" aria-modal="true" aria-labelledby="endTitle">
  <div class="modal" id="endModal">
    <div class="badge" id="endBadge"></div>
    <h2 id="endTitle"></h2>
    <div class="statgrid" id="statgrid"></div>
    <div class="recap" id="endRecap"></div>
    <div id="nearMissBlock" class="hide" style="margin:10px 0;padding:12px 16px;background:rgba(201,162,75,.1);border:1px solid rgba(201,162,75,.3);border-radius:10px;font-size:13px;line-height:1.6"></div>
    <img class="card-preview hide" id="cardPreview" src="" alt="成績卡">
    <div class="share-row">
      <button id="shareBtn" class="sh primary">分享成績</button>
      <button id="dlBtn" class="sh">下載圖片</button>
      <button id="thBtn" class="sh">發到 Threads</button>
    </div>
    <div class="share-note">手機按「分享成績」可直接把這張圖帶進 Threads／IG；電腦會下載圖片並開啟 Threads 發文，記得手動把圖片附上。</div>
    <button class="retry-glow hide" id="retryGlowBtn" aria-label="不服氣！換個策略再挑戰一次">不服氣！換個策略再挑戰一次 ➔</button>
    <button id="restartBtn">再玩一次</button>
  </div>
</div>
`

export default function App() {
  const gameInitialized = useRef(false)

  useEffect(() => {
    if (gameInitialized.current) return
    gameInitialized.current = true

    // Telegram WebApp init (SDK loaded via index.html script tag)
    try {
      const tg = window.Telegram?.WebApp
      if (tg) { tg.ready(); tg.expand() }
    } catch {}

    // Import and run game logic after DOM is fully rendered
    import('./game.js').catch(console.error)
  }, [])

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: GAME_HTML }} />
      <div dangerouslySetInnerHTML={{ __html: OVERLAYS_HTML }} />
    </>
  )
}
