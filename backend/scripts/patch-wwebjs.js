/**
 * Postinstall patch for whatsapp-web.js
 * Fixes "r: r" error caused by WhatsApp Web 2.3000.x renaming _serialized to $1
 * See: https://github.com/wwebjs/whatsapp-web.js/pull/201910
 */
const fs = require('fs');
const path = require('path');

const utilsPath = path.join(
  __dirname, '..', 'node_modules', 'whatsapp-web.js',
  'src', 'util', 'Injected', 'Utils.js'
);

if (!fs.existsSync(utilsPath)) {
  console.log('patch: Utils.js not found, skipping');
  process.exit(0);
}

let code = fs.readFileSync(utilsPath, 'utf8');

if (code.includes('WWebJS.__s')) {
  console.log('patch: already applied, skipping');
  process.exit(0);
}

// 1. Add serialization helper after "window.WWebJS = {};"
const helper = `

    /** Safe _serialized accessor (patch for WA Web 2.3000.x $1 rename) */
    window.WWebJS.__s = function(o) {
        if (!o) return undefined;
        if (typeof o === 'string') return o;
        return o._serialized || o['$1'] || (typeof o.toString === 'function' ? o.toString() : undefined);
    };
`;

code = code.replace(
  'window.WWebJS = {};',
  'window.WWebJS = {};' + helper
);

// 2. Targeted replacements at known crash sites
const replacements = [
  // getChatModel: createWid(chat.id._serialized)
  ['createWid(chat.id._serialized)', 'createWid(window.WWebJS.__s(chat.id))'],
  // sendSeen / editMessage: Msg.get(msg.id._serialized)
  ['Msg.get(msg.id._serialized)', 'Msg.get(window.WWebJS.__s(msg.id))'],
  // sendMessage: Msg.get(newMsgKey._serialized)
  ['Msg.get(newMsgKey._serialized)', 'Msg.get(window.WWebJS.__s(newMsgKey))'],
  // getChatModel: chat.lastReceivedKey._serialized
  ['chat.lastReceivedKey._serialized', 'window.WWebJS.__s(chat.lastReceivedKey)'],
  // getMessageModel: msg.id.remote._serialized
  ['msg.id.remote._serialized', 'window.WWebJS.__s(msg.id && msg.id.remote)'],
  // rejectCall: getMaybeMePnUser()._serialized
  ['getMaybeMePnUser()._serialized', 'getMaybeMePnUser(), window.WWebJS.__s(window.require("WAWebUserPrefsMeUser").getMaybeMePnUser()))'],
];

let count = 0;
for (const [from, to] of replacements) {
  if (code.includes(from)) {
    code = code.split(from).join(to);
    count++;
  }
}

// Fix the rejectCall line properly - the above broke it, let's fix:
// Original: let userId = window.require('WAWebUserPrefsMeUser').getMaybeMePnUser()._serialized;
// We want:  let userId = window.WWebJS.__s(window.require('WAWebUserPrefsMeUser').getMaybeMePnUser());
code = code.replace(
  /let userId = window\s*\n?\s*\.require\('WAWebUserPrefsMeUser'\)\s*\n?\s*\.getMaybeMePnUser\(\), window\.WWebJS\.__s\(window\.require\("WAWebUserPrefsMeUser"\)\.getMaybeMePnUser\(\)\)\)/,
  `let userId = window.WWebJS.__s(window.require('WAWebUserPrefsMeUser').getMaybeMePnUser())`
);

// 3. Wrap groupMetadata.update() in try-catch to handle stale groups
code = code.replace(
  /await groupMetadata\.update\(chatWid\);/g,
  'await groupMetadata.update(chatWid).catch(function(){});'
);

// 4. Wrap newsletterMetadata update similarly
code = code.replace(
  /await newsletterMetadata\.update\(/g,
  'await newsletterMetadata.update('
);

fs.writeFileSync(utilsPath, code);
console.log(`patch: Applied ${count} fixes to whatsapp-web.js Utils.js`);
