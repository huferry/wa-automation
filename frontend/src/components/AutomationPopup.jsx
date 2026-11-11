import { useState, useEffect } from 'react';

export default function AutomationPopup({ chatId, chatName, isGroup, onClose }) {
  const [automations, setAutomations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // view | add | edit
  const [form, setForm] = useState({ name: '', member: 'all', automation: 'thumbs-up', birthdayWish: false, linkReaction: false });

  useEffect(() => {
    fetchAutomations();
    if (isGroup) fetchParticipants();
  }, [chatId]);

  async function fetchAutomations() {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/automations`);
      const data = await res.json();
      setAutomations(Array.isArray(data) ? data : []);
    } catch {}
  }

  async function fetchParticipants() {
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/participants`);
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch {}
  }

  function handleSelect(rule) {
    setSelectedId(rule.id);
    setMode('view');
  }

  function handleAdd() {
    setSelectedId(null);
    setForm({ name: '', member: 'all', automation: 'thumbs-up', birthdayWish: false, linkReaction: false });
    setMode('add');
  }

  function handleEdit() {
    const rule = automations.find((r) => r.id === selectedId);
    if (rule) {
      setForm({ name: rule.name, member: rule.member, automation: rule.automation, birthdayWish: rule.birthdayWish || false, linkReaction: rule.linkReaction || false });
      setMode('edit');
    }
  }

  async function handleDelete() {
    await fetch(
      `/api/chats/${encodeURIComponent(chatId)}/automations/${selectedId}`,
      { method: 'DELETE' }
    );
    setSelectedId(null);
    setMode('view');
    fetchAutomations();
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (mode === 'add') {
      await fetch(`/api/chats/${encodeURIComponent(chatId)}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else if (mode === 'edit') {
      await fetch(
        `/api/chats/${encodeURIComponent(chatId)}/automations/${selectedId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );
    }
    setMode('view');
    fetchAutomations();
  }

  function handleCancel() {
    setMode('view');
  }

  const selected = automations.find((r) => r.id === selectedId);
  const memberName = (id) => {
    if (id === 'all') return 'All';
    const p = participants.find((x) => x.id === id);
    return p ? p.name : id.split('@')[0];
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="automation-popup" onClick={(e) => e.stopPropagation()}>
        <h3>Automations — {chatName}</h3>
        <div className="automation-columns">
          <div className="automation-names">
            <div className="automation-names-header">
              <span>Name</span>
              <button className="automation-add-btn" onClick={handleAdd}>Add</button>
            </div>
            <div className="automation-names-list">
              {automations.map((rule) => (
                <div
                  key={rule.id}
                  className={`automation-name-item ${rule.id === selectedId ? 'active' : ''}`}
                  onClick={() => handleSelect(rule)}
                >
                  {rule.name}
                </div>
              ))}
              {automations.length === 0 && (
                <div className="automation-empty">No automations yet</div>
              )}
            </div>
          </div>

          <div className="automation-detail">
            <span>Detail</span>
            {mode === 'view' && selected && (
              <div className="automation-detail-view">
                <div className="automation-field">
                  <label>Name</label>
                  <span>{selected.name}</span>
                </div>
                {isGroup && (
                  <div className="automation-field">
                    <label>Member</label>
                    <span>{memberName(selected.member)}</span>
                  </div>
                )}
                <div className="automation-field">
                  <label>Automation</label>
                  <span>{
                    selected.automation === 'thumbs-up' ? 'Thumbs Up 👍' :
                    selected.automation === 'auto-response' ? 'Auto Response 💬' :
                    selected.automation
                  }</span>
                </div>
                {selected.automation === 'auto-response' && (
                  <div className="automation-field">
                    <label>Options</label>
                    <span>{selected.birthdayWish ? '✓' : '✗'} Birthday wishes</span>
                    <span>{selected.linkReaction ? '✓' : '✗'} Link reactions</span>
                  </div>
                )}
                <div className="automation-actions">
                  <button className="automation-edit-btn" onClick={handleEdit}>Edit</button>
                  <button className="automation-delete-btn" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            )}

            {mode === 'view' && !selected && (
              <div className="automation-empty">Select an automation or add a new one</div>
            )}

            {(mode === 'add' || mode === 'edit') && (
              <div className="automation-form">
                <div className="automation-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Automation name"
                  />
                </div>
                {isGroup && (
                  <div className="automation-field">
                    <label>Member</label>
                    <select
                      value={form.member}
                      onChange={(e) => setForm({ ...form, member: e.target.value })}
                    >
                      <option value="all">All</option>
                      {participants.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="automation-field">
                  <label>Automation</label>
                  <select
                    value={form.automation}
                    onChange={(e) => setForm({ ...form, automation: e.target.value })}
                  >
                    <option value="thumbs-up">Thumbs Up 👍</option>
                    <option value="auto-response">Auto Response 💬</option>
                  </select>
                </div>
                {form.automation === 'auto-response' && (
                  <div className="automation-field">
                    <label>Options</label>
                    <label className="automation-checkbox">
                      <input
                        type="checkbox"
                        checked={form.birthdayWish}
                        onChange={(e) => setForm({ ...form, birthdayWish: e.target.checked })}
                      />
                      Birthday wishes
                    </label>
                    <label className="automation-checkbox">
                      <input
                        type="checkbox"
                        checked={form.linkReaction}
                        onChange={(e) => setForm({ ...form, linkReaction: e.target.checked })}
                      />
                      Link reactions
                    </label>
                  </div>
                )}
                <div className="automation-actions">
                  <button className="automation-cancel-btn" onClick={handleCancel}>Cancel</button>
                  <button className="automation-save-btn" onClick={handleSave}>
                    {mode === 'add' ? 'Add' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="popup-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
