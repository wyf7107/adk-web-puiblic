const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'src/app/components');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.html') || filePath.endsWith('.scss')) {
    if (filePath.includes('chat.component') || filePath.includes('chat-panel.component')) {
      let originalContent = fs.readFileSync(filePath, 'utf8');
      let newContent = originalContent
        .replace(/this\.messages/g, 'this.uiEvents')
        .replace(/\bmessages\(\)/g, 'uiEvents()')
        .replace(/messages = signal/g, 'uiEvents = signal')
        .replace(/messages\.update/g, 'uiEvents.update')
        .replace(/\(messages \=\> /g, '(uiEvents => ')
        .replace(/messages\.map/g, 'uiEvents.map')
        .replace(/messages\.filter/g, 'uiEvents.filter')
        .replace(/messages\.forEach/g, 'uiEvents.forEach')
        .replace(/messages\.length/g, 'uiEvents.length')
        .replace(/\[messages\]="messages\(\)"/g, '[uiEvents]="uiEvents()"')
        .replace(/messages\)/g, 'uiEvents)')
        .replace(/\[messages\]=/, '[uiEvents]=')
        .replace(/@Input\(\) messages\: /g, '@Input() uiEvents: ')
        .replace(/messages\[/g, 'uiEvents[')
        .replace(/let i = 0; i < messages\./g, 'let i = 0; i < uiEvents.')
        .replace(/changes\['messages'\]/g, "changes['uiEvents']")
        .replace(/for \(let message of messages/g, 'for (let uiEvent of uiEvents')
        .replace(/for \(const message of messages/g, 'for (const uiEvent of uiEvents')
        .replace(/for \(let message of this\.messages/g, 'for (let uiEvent of this.uiEvents')
        .replace(/\.messages\s{0,9}=\s{0,9}messages;/g, '.uiEvents = uiEvents;')
        .replace(/\bconst messages = component.messages\(\);/g, 'const uiEvents = component.uiEvents();')
        .replace(/expect\(messages/g, 'expect(uiEvents')
        .replace(/component\.messages\(\)/g, 'component.uiEvents()')
        .replace(/component\.messages\.set/g, 'component.uiEvents.set')
        .replace(/chatPanelComponent\.messages/g, 'chatPanelComponent.uiEvents');

      if (originalContent !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log('Updated', filePath);
      }
    }
  }
});
