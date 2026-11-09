import { useState } from 'react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function messagePreview(lastMessage) {
  if (!lastMessage) return '';
  if (lastMessage.type !== 'chat') {
    const typeLabels = {
      image: 'Photo',
      video: 'Video',
      audio: 'Audio',
      ptt: 'Voice message',
      document: 'Document',
      sticker: 'Sticker',
      location: 'Location',
      vcard: 'Contact',
      call_log: 'Call',
      e2e_notification: 'Encrypted notification',
      gp2: 'Group update',
      notification_template: 'Notification',
      interactive: 'Interactive message',
      rich_response: 'Rich response',
      message_history_notice: 'History notice',
    };
    return typeLabels[lastMessage.type] || lastMessage.type;
  }
  return lastMessage.body || '';
}

function lastMessageText(chat) {
  const prefix = chat.lastMessage?.fromMe ? 'You: ' : '';
  return prefix + messagePreview(chat.lastMessage);
}

export default function ChatList({ chats, selectedChatId, onSelectChat, automationChatIds }) {
  const [filter, setFilter] = useState('direct');

  const filtered = chats
    .filter((chat) => (filter === 'group' ? chat.isGroup : !chat.isGroup))
    .sort((a, b) => {
      const aAuto = automationChatIds?.includes(a.id) ? 1 : 0;
      const bAuto = automationChatIds?.includes(b.id) ? 1 : 0;
      return bAuto - aAuto;
    });

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <div className="chat-filter-toggle">
          <button
            className={`toggle-btn ${filter === 'direct' ? 'active' : ''}`}
            onClick={() => setFilter('direct')}
          >
            Direct
          </button>
          <button
            className={`toggle-btn ${filter === 'group' ? 'active' : ''}`}
            onClick={() => setFilter('group')}
          >
            Group
          </button>
        </div>
      </div>
      <div className="chat-list-items">
        {filtered.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === selectedChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {chat.profilePicUrl ? (
              <img className={`chat-avatar-img${automationChatIds?.includes(chat.id) ? ' avatar-automated' : ''}`} src={chat.profilePicUrl} alt="" />
            ) : (
              <div className={`chat-avatar${automationChatIds?.includes(chat.id) ? ' avatar-automated' : ''}`}>
                {chat.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="chat-info">
              <div className="chat-info-top">
                <span className="chat-name">{chat.name}</span>
                <span className="chat-time">{formatTime(chat.timestamp)}</span>
              </div>
              <div className="chat-info-bottom">
                <span className="chat-preview">
                  {lastMessageText(chat)}
                </span>
                {chat.unreadCount > 0 && (
                  <span className="chat-unread">{chat.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
