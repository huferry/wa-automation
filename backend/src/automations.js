const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'automations.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getAutomations(chatId) {
  const data = load();
  return data[chatId] || [];
}

function getAllAutomations() {
  return load();
}

function addAutomation(chatId, rule) {
  const data = load();
  if (!data[chatId]) data[chatId] = [];
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const entry = { id, ...rule };
  data[chatId].push(entry);
  save(data);
  return entry;
}

function updateAutomation(chatId, ruleId, updates) {
  const data = load();
  const rules = data[chatId] || [];
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...updates, id: ruleId };
  save(data);
  return rules[idx];
}

function deleteAutomation(chatId, ruleId) {
  const data = load();
  const rules = data[chatId] || [];
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx === -1) return false;
  rules.splice(idx, 1);
  if (rules.length === 0) delete data[chatId];
  else data[chatId] = rules;
  save(data);
  return true;
}

module.exports = { getAutomations, getAllAutomations, addAutomation, updateAutomation, deleteAutomation };
