const fs = require('fs');
const path = require('path');

const chatComponentPath = path.resolve(__dirname, 'src/app/components/chat/chat.component.ts');

let content = fs.readFileSync(chatComponentPath, 'utf8');

// Fix unrenamed `messages`
content = content.replace(/\.\.\.messages/g, '...uiEvents');
content = content.replace(/messages\.slice/g, 'uiEvents.slice');
content = content.replace(/ \= \[\.\.\.messages\];/g, ' = [...uiEvents];');
content = content.replace(/messages\.findIndex/g, 'uiEvents.findIndex');
content = content.replace(/uiEvents\.forEach\(msg \=\>/g, 'this.uiEvents().forEach(msg =>');
// Let's verify if there are any standalone `messages`
content = content.replace(/const existingIndex \= messages\.findIndex/g, 'const existingIndex = uiEvents.findIndex');

fs.writeFileSync(chatComponentPath, content);
console.log('Fixed chat.component.ts');
