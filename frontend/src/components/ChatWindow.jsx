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

export default function ChatWindow({ messages, chatName, isGroup, loading }) {
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
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
