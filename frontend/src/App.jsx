import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import QRLogin from './components/QRLogin';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SendApiPopup from './components/SendApiPopup';
import AutomationPopup from './components/AutomationPopup';

const socket = io();

export default function App() {
  const [status, setStatus] = useState('loading');
  const [qrCode, setQrCode] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showApiPopup, setShowApiPopup] = useState(false);
  const [showAutomationPopup, setShowAutomationPopup] = useState(false);
  const [meId, setMeId] = useState(null);
  const [automationChatIds, setAutomationChatIds] = useState([]);
  const selectedChatIdRef = useRef(selectedChatId);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const fetchAutomationChatIds = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/chats');
      const data = await res.json();
      setAutomationChatIds(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    }
    fetchAutomationChatIds();
  }, [fetchAutomationChatIds]);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.meId) setMeId(data.meId);
        if (data.ready) {
          setStatus('ready');
          fetchChats();
        } else if (data.qr) {
          setQrCode(data.qr);
          setStatus('qr');
        }
      })
      .catch(() => setStatus('loading'));

    socket.on('qr', (qr) => {
      setQrCode(qr);
      setStatus('qr');
    });

    socket.on('wa-ready', () => {
      setStatus('ready');
      fetchChats();
    });

    socket.on('wa-disconnected', () => {
      setStatus('loading');
      setChats([]);
      setMessages([]);
      setSelectedChatId(null);
    });

    socket.on('message-reaction', (data) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.msgId) return m;
          const reactions = [...(m.reactions || [])];
          // Remove previous reaction from same sender
          const existingIdx = reactions.findIndex((r) => r.senderId === data.senderId);
          if (existingIdx !== -1) reactions.splice(existingIdx, 1);
          // Add new reaction (empty string means removed)
          if (data.reaction) {
            reactions.push({ reaction: data.reaction, senderId: data.senderId, timestamp: data.timestamp });
          }
          return { ...m, reactions };
        })
      );
    });

    socket.on('new-message', (msg) => {
      const currentChatId = selectedChatIdRef.current;
      if (msg.chatId === currentChatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // Replace optimistic message if this is our own message
          if (msg.fromMe) {
            const tempIdx = prev.findIndex((m) => m.id?.startsWith('temp-') && m.body === msg.body);
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = msg;
              return updated;
            }
          }
          return [...prev, msg];
        });
      }

      setChats((prev) => {
        const updated = prev.map((chat) => {
          if (chat.id === msg.chatId) {
            return {
              ...chat,
              lastMessage: {
                body: msg.body,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                type: msg.type,
              },
              timestamp: msg.timestamp,
              unreadCount: chat.id === currentChatId ? 0 : chat.unreadCount + 1,
            };
          }
          return chat;
        });
        return updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
    });

    return () => {
      socket.off('qr');
      socket.off('wa-ready');
      socket.off('wa-disconnected');
      socket.off('new-message');
      socket.off('message-reaction');
    };
  }, [fetchChats]);

  const handleSelectChat = async (chatId) => {
    setSelectedChatId(chatId);
    setLoadingMessages(true);
    setMessages([]);

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );

    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (text) => {
    if (!selectedChatId || !text.trim()) return;

    const tempId = 'temp-' + Date.now();
    const optimistic = {
      id: tempId,
      body: text,
      fromMe: true,
      timestamp: Math.floor(Date.now() / 1000),
      type: 'chat',
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(selectedChatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const sent = await res.json();
      if (sent.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: sent.id } : m)));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Connecting to WhatsApp...</p>
      </div>
    );
  }

  if (status === 'qr') {
    return <QRLogin qr={qrCode} />;
  }

  return (
    <div className="app">
      <ChatList
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        automationChatIds={automationChatIds}
      />
      <div className="main">
        <ChatWindow
          messages={messages}
          chatName={selectedChat?.name}
          isGroup={selectedChat?.isGroup}
          loading={loadingMessages}
          meId={meId}
          onShowApi={() => setShowApiPopup(true)}
          onShowAutomation={() => setShowAutomationPopup(true)}
        />
        <MessageInput onSend={handleSend} disabled={!selectedChatId} />
      </div>
      {showApiPopup && selectedChatId && (
        <SendApiPopup
          chatId={selectedChatId}
          chatName={selectedChat?.name}
          onClose={() => setShowApiPopup(false)}
        />
      )}
      {showAutomationPopup && selectedChatId && (
        <AutomationPopup
          chatId={selectedChatId}
          chatName={selectedChat?.name}
          isGroup={selectedChat?.isGroup}
          onClose={() => { setShowAutomationPopup(false); fetchAutomationChatIds(); }}
        />
      )}
    </div>
  );
}
