import { useEffect, useRef } from 'react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function messageBody(msg) {
  if (msg.type !== 'chat') {
    const typeLabels = {
      image: '[Photo]',
      video: '[Video]',
      audio: '[Audio]',
      ptt: '[Voice message]',
      document: '[Document]',
      sticker: '[Sticker]',
      location: '[Location]',
      vcard: '[Contact]',
      call_log: '[Call]',
      e2e_notification: '[Encrypted notification]',
      gp2: '[Group update]',
      notification_template: '[Notification]',
      interactive: '[Interactive message]',
      rich_response: '[Rich response]',
      message_history_notice: '[History notice]',
    };
    return typeLabels[msg.type] || `[${msg.type}]`;
  }
  return msg.body;
}

export default function ChatWindow({ messages, chatName, isGroup, loading, meId, onShowApi, onShowAutomation }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chatName) {
    return (
      <div className="chat-window empty">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <h3>{chatName}</h3>
        <div className="header-icons">
          <button className="api-icon-btn" onClick={onShowApi} title="Send API">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <button className="api-icon-btn" onClick={onShowAutomation} title="Automations">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="chat-messages">
        {loading && <div className="spinner" />}
        {messages.filter((msg) => msg.type !== 'call_log').map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.fromMe ? 'sent' : 'received'}`}
          >
            {isGroup && !msg.fromMe && (
              <span className="message-author">
                {msg.authorName || msg.author?.split('@')[0] || 'Unknown'}
              </span>
            )}
            <span className="message-body">{messageBody(msg)}</span>
            <span className="message-time">{formatTime(msg.timestamp)}</span>
            {msg.reactions && msg.reactions.length > 0 && (
              <div className="message-reactions">
                {Object.entries(
                  msg.reactions.reduce((acc, r) => {
                    if (!acc[r.reaction]) acc[r.reaction] = { count: 0, fromMe: false };
                    acc[r.reaction].count++;
                    if (r.senderId === meId) acc[r.reaction].fromMe = true;
                    return acc;
                  }, {})
                ).map(([emoji, { count, fromMe }]) => (
                  <span key={emoji} className={`reaction-badge${fromMe ? ' reaction-auto' : ''}`}>
                    {emoji}{count > 1 && <span className="reaction-count">{count}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
