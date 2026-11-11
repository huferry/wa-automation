# WA Automation

WhatsApp Web clone built with Node.js and React.

## Prerequisites

- Node.js 18+
- A WhatsApp account

## Setup

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

> **Note:** The first `npm install` in `backend/` downloads Chromium (~170 MB) for whatsapp-web.js.

## Running

Start both the backend and frontend in separate terminals:

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. A QR code appears on screen
2. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
3. Scan the QR code
4. Your chats load automatically
5. Click a chat to read messages, type a reply and press Enter to send

The session is saved locally — you won't need to scan again on restart unless you log out from your phone.

## Tech Stack

- **Backend:** Express, Socket.io, whatsapp-web.js
- **Frontend:** React, Vite, Socket.io client

## Project Structure

```
wa-automation/
├── backend/
│   └── src/
│       ├── index.js           # Server entry point
│       ├── whatsapp.js        # WhatsApp client singleton
│       ├── routes/api.js      # REST API
│       └── socket/handlers.js # WebSocket handlers
└── frontend/
    └── src/
        ├── App.jsx            # Root component
        └── components/
            ├── QRLogin.jsx    # QR code screen
            ├── ChatList.jsx   # Chat sidebar
            ├── ChatWindow.jsx # Message view
            └── MessageInput.jsx
```

## Limitations (Phase 1)

- Text messages only (media shows as placeholders)
- No new chat creation or contact search
- No media sending
- No message status indicators (read receipts)

## Release Notes

### v1.0.0 — 2026-11-11

- WhatsApp Web clone with chat reading and replying (Phase 1)
- Direct/Group chat toggle with filtered views (Phase 2)
- Send API popup with POST endpoint for external messaging (Phase 3)
- Automation system with thumbs-up reactions (Phase 4)
- Purple border on automated chat avatars, sorted to top (Phase 4)
- Auto-response automation powered by Claude AI with web search (Phase 5)
- Docker support with multi-stage build for production deployment
- Docker Compose configuration
