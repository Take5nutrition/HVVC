(function () {
  'use strict'

  const API_URL = 'https://take5athletics.com/api/hvvc-chat'

  const SUGGESTED = [
    'What programs do you offer?',
    'When are tryouts?',
    'How much does it cost?',
    'What age groups do you have?',
  ]

  const CSS = `
    #hvvc-fab-wrap {
      position: fixed; bottom: 28px; right: 28px; z-index: 9000;
      opacity: 0; transform: scale(.7) translateY(16px);
      transition: opacity .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1);
      pointer-events: none;
    }
    #hvvc-fab-wrap.in { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
    #hvvc-fab {
      width: 56px; height: 56px; border-radius: 50%; border: none;
      background: linear-gradient(180deg, #1a6fc4 0%, #0d4a8a 100%);
      color: #fff; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(13,74,138,.45), 0 2px 8px rgba(0,0,0,.3);
      transition: transform .2s, box-shadow .2s;
    }
    #hvvc-fab:hover { transform: scale(1.07); box-shadow: 0 8px 36px rgba(13,74,138,.6), 0 4px 12px rgba(0,0,0,.35); }
    #hvvc-fab.open { background: #1a1a1a; }
    #hvvc-panel {
      position: fixed; bottom: 96px; right: 28px; z-index: 8999;
      width: 380px; max-width: calc(100vw - 40px); max-height: 600px;
      background: #0d0d0d; border: 1px solid rgba(255,255,255,.08); border-radius: 20px;
      display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,.6);
      overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(.97); pointer-events: none;
      transition: opacity .28s cubic-bezier(.16,1,.3,1), transform .28s cubic-bezier(.16,1,.3,1);
    }
    #hvvc-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    #hvvc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,.06);
      background: rgba(13,74,138,.12); flex-shrink: 0;
    }
    #hvvc-header-left { display: flex; align-items: center; gap: 12px; }
    #hvvc-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(180deg, #1a6fc4 0%, #0d4a8a 100%);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(13,74,138,.3);
    }
    #hvvc-header-info { display: flex; flex-direction: column; gap: 2px; }
    #hvvc-header-name {
      font-size: 13px; font-weight: 800; letter-spacing: .04em; color: #fff;
      font-family: 'Arial Black', Arial, sans-serif; text-transform: uppercase;
    }
    #hvvc-header-status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,.4); font-family: Arial, sans-serif; }
    #hvvc-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; box-shadow: 0 0 6px rgba(34,197,94,.6); }
    #hvvc-close {
      width: 32px; height: 32px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04);
      color: rgba(255,255,255,.4); display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: background .16s, color .16s;
    }
    #hvvc-close:hover { background: rgba(255,255,255,.09); color: #fff; }
    #hvvc-body {
      flex: 1; overflow-y: auto; padding: 20px 16px;
      display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth;
    }
    #hvvc-body::-webkit-scrollbar { width: 4px; }
    #hvvc-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
    #hvvc-welcome { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 12px 8px 4px; }
    #hvvc-welcome-icon {
      width: 52px; height: 52px; border-radius: 16px;
      background: rgba(13,74,138,.15); border: 1px solid rgba(13,74,138,.3);
      display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
    }
    #hvvc-welcome-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,.88); line-height: 1.4; margin: 0; font-family: Arial, sans-serif; }
    #hvvc-welcome-sub { font-size: 13px; color: rgba(255,255,255,.38); line-height: 1.55; margin: 0; font-family: Arial, sans-serif; }
    #hvvc-suggestions { display: flex; flex-direction: column; gap: 7px; width: 100%; margin-top: 6px; }
    .hvvc-suggestion {
      padding: 10px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.03);
      color: rgba(255,255,255,.6); font-size: 13px; text-align: left; cursor: pointer;
      font-family: Arial, sans-serif;
      transition: border-color .15s, background .15s, color .15s;
    }
    .hvvc-suggestion:hover { border-color: rgba(13,74,138,.4); background: rgba(13,74,138,.08); color: rgba(255,255,255,.88); }
    .hvvc-msg { display: flex; align-items: flex-end; gap: 8px; }
    .hvvc-msg.user { flex-direction: row-reverse; }
    .hvvc-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: linear-gradient(180deg, #1a6fc4 0%, #0d4a8a 100%);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .hvvc-bubble {
      max-width: 80%; padding: 11px 14px; border-radius: 16px;
      font-size: 14px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;
      font-family: Arial, sans-serif;
    }
    .hvvc-msg.assistant .hvvc-bubble {
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.07);
      color: rgba(255,255,255,.85); border-bottom-left-radius: 4px;
    }
    .hvvc-msg.user .hvvc-bubble {
      background: linear-gradient(180deg, #1a6fc4 0%, #0d4a8a 100%);
      color: #fff; border-bottom-right-radius: 4px;
    }
    .hvvc-typing { display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; }
    .hvvc-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.4);
      animation: hvvcBounce 1.2s ease-in-out infinite; display: inline-block;
    }
    .hvvc-typing span:nth-child(2) { animation-delay: .18s; }
    .hvvc-typing span:nth-child(3) { animation-delay: .36s; }
    @keyframes hvvcBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: .4; }
      40%           { transform: translateY(-5px); opacity: 1; }
    }
    #hvvc-footer {
      padding: 12px 16px 14px; border-top: 1px solid rgba(255,255,255,.06);
      background: rgba(0,0,0,.2); flex-shrink: 0;
    }
    #hvvc-input-wrap {
      display: flex; align-items: flex-end; gap: 10px;
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
      border-radius: 14px; padding: 10px 12px; transition: border-color .16s;
    }
    #hvvc-input-wrap:focus-within { border-color: rgba(13,74,138,.4); }
    #hvvc-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #fff; font-size: 14px; font-family: Arial, sans-serif; resize: none;
      max-height: 100px; line-height: 1.5;
    }
    #hvvc-input::placeholder { color: rgba(255,255,255,.22); }
    #hvvc-send {
      width: 32px; height: 32px; border-radius: 9px; border: none;
      background: rgba(255,255,255,.07); color: rgba(255,255,255,.25);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s, transform .15s;
    }
    #hvvc-send.active { background: linear-gradient(180deg, #1a6fc4 0%, #0d4a8a 100%); color: #fff; }
    #hvvc-send.active:hover { transform: scale(1.08); }
    #hvvc-footer-note { font-size: 10px; color: rgba(255,255,255,.2); text-align: center; margin: 9px 0 0; font-family: Arial, sans-serif; }
    #hvvc-footer-note a { color: rgba(13,74,138,.7); text-decoration: none; }
    #hvvc-footer-note a:hover { color: #1a6fc4; }
    @media (max-width: 480px) {
      #hvvc-panel { bottom: 0; right: 0; width: 100vw; max-width: 100vw; max-height: 90vh; border-radius: 20px 20px 0 0; }
      #hvvc-fab-wrap { bottom: 20px; right: 20px; }
    }
  `

  // ── inject styles ──
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  // ── build DOM ──
  const fabWrap = el('div', { id: 'hvvc-fab-wrap' })
  const fab = el('button', { id: 'hvvc-fab', 'aria-label': 'Open chat' })
  fab.innerHTML = iconChat()
  fabWrap.appendChild(fab)

  const panel = el('div', { id: 'hvvc-panel', role: 'dialog', 'aria-label': 'HVVC Receptionist' })
  panel.innerHTML = `
    <div id="hvvc-header">
      <div id="hvvc-header-left">
        <div id="hvvc-avatar">${iconVolley()}</div>
        <div id="hvvc-header-info">
          <span id="hvvc-header-name">HVVC Receptionist</span>
          <span id="hvvc-header-status"><span id="hvvc-dot"></span>Online now</span>
        </div>
      </div>
      <button id="hvvc-close" aria-label="Close">${iconX()}</button>
    </div>
    <div id="hvvc-body"></div>
    <div id="hvvc-footer">
      <div id="hvvc-input-wrap">
        <textarea id="hvvc-input" placeholder="Ask a question..." rows="1"></textarea>
        <button id="hvvc-send" aria-label="Send">${iconSend()}</button>
      </div>
      <p id="hvvc-footer-note">Questions? Email <a href="mailto:Hvvc@Hvvcvolleyballclub.com">Hvvc@Hvvcvolleyballclub.com</a></p>
    </div>
  `

  document.body.appendChild(fabWrap)
  document.body.appendChild(panel)

  // ── state ──
  let isOpen = false
  let streaming = false
  let messages = []

  const body = document.getElementById('hvvc-body')
  const input = document.getElementById('hvvc-input')
  const sendBtn = document.getElementById('hvvc-send')
  const closeBtn = document.getElementById('hvvc-close')

  // ── show widget after 3s ──
  setTimeout(() => fabWrap.classList.add('in'), 3000)

  // ── render welcome ──
  renderWelcome()

  // ── events ──
  fab.addEventListener('click', togglePanel)
  closeBtn.addEventListener('click', () => setOpen(false))
  sendBtn.addEventListener('click', () => send(input.value))
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value) }
  })
  input.addEventListener('input', updateSendBtn)

  function togglePanel() {
    setOpen(!isOpen)
  }

  function setOpen(val) {
    isOpen = val
    panel.classList.toggle('open', isOpen)
    fab.classList.toggle('open', isOpen)
    fab.innerHTML = isOpen ? iconX() : iconChat()
    if (isOpen) setTimeout(() => input.focus(), 150)
  }

  function updateSendBtn() {
    sendBtn.classList.toggle('active', input.value.trim().length > 0 && !streaming)
  }

  function renderWelcome() {
    body.innerHTML = `
      <div id="hvvc-welcome">
        <div id="hvvc-welcome-icon">${iconVolley()}</div>
        <p id="hvvc-welcome-title">Welcome to HVVC!</p>
        <p id="hvvc-welcome-sub">Drop your question into the chat and we'll do our best to answer it for you.</p>
        <div id="hvvc-suggestions">
          ${SUGGESTED.map(s => `<button class="hvvc-suggestion">${s}</button>`).join('')}
        </div>
      </div>
    `
    body.querySelectorAll('.hvvc-suggestion').forEach(btn => {
      btn.addEventListener('click', () => send(btn.textContent))
    })
  }

  async function send(text) {
    const trimmed = (text || '').trim()
    if (!trimmed || streaming) return

    // clear welcome on first message
    const welcome = document.getElementById('hvvc-welcome')
    if (welcome) welcome.remove()

    messages.push({ role: 'user', content: trimmed })
    input.value = ''
    updateSendBtn()
    streaming = true

    appendMsg('user', trimmed)
    const assistantEl = appendMsg('assistant', null) // typing indicator

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })

      if (!res.ok || !res.body) throw new Error('bad response')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = reader.read ? await reader.read() : { done: true }
        if (done) break
        full += dec.decode(value, { stream: true })
        setBubble(assistantEl, full)
      }

      if (full.trim() === '[ESCALATE]') {
        setBubble(assistantEl, "Great question! We don't have that info here, but reach out directly and we'll get you answered — email Hvvc@Hvvcvolleyballclub.com or call (503) 956-7494.")
        messages.push({ role: 'assistant', content: full })
      } else {
        messages.push({ role: 'assistant', content: full })
      }

    } catch (err) {
      setBubble(assistantEl, "Something went wrong. Please email Hvvc@Hvvcvolleyballclub.com or call (503) 956-7494.")
    }

    streaming = false
    updateSendBtn()
  }

  function appendMsg(role, text) {
    const wrap = document.createElement('div')
    wrap.className = `hvvc-msg ${role}`

    if (role === 'assistant') {
      const avatar = document.createElement('div')
      avatar.className = 'hvvc-msg-avatar'
      avatar.innerHTML = iconVolleySmall()
      wrap.appendChild(avatar)
    }

    const bubble = document.createElement('div')
    bubble.className = 'hvvc-bubble'

    if (text === null) {
      bubble.innerHTML = `<span class="hvvc-typing"><span></span><span></span><span></span></span>`
    } else {
      bubble.textContent = text
    }

    wrap.appendChild(bubble)
    body.appendChild(wrap)
    bubble.scrollIntoView({ behavior: 'smooth', block: 'end' })
    return wrap
  }

  function setBubble(wrap, text) {
    const bubble = wrap.querySelector('.hvvc-bubble')
    if (bubble) bubble.textContent = text
    bubble.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  // ── helpers ──
  function el(tag, attrs) {
    const e = document.createElement(tag)
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v))
    return e
  }

  function iconChat() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
  }
  function iconX() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  }
  function iconSend() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
  }
  function iconVolley() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/></svg>`
  }
  function iconVolleySmall() {
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/></svg>`
  }

})()
