import { useState } from 'react';

export default function SendApiPopup({ chatId, chatName, onClose }) {
  const [copied, setCopied] = useState(false);

  const url = `${window.location.origin}/api/chats/${encodeURIComponent(chatId)}/messages`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <h3>Send API — {chatName}</h3>

        <div className="popup-url-row">
          <code className="popup-url">{url}</code>
          <button className="popup-copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="popup-usage">
          <p>Send a message to this chat via POST request:</p>
          <pre>{`curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`}</pre>
        </div>

        <button className="popup-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
