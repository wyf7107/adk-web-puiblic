const fs = require('fs');
const path = require('path');

const chatComponentPath = path.resolve(__dirname, 'src/app/components/chat/chat.component.ts');
let content = fs.readFileSync(chatComponentPath, 'utf8');

// Fix unrenamed `messages`
content = content.replace(/\.\.\.messages/g, '...uiEvents');
content = content.replace(/ \= \[\.\.\.messages\];/g, ' = [...uiEvents];');
content = content.replace(/messages\.findIndex/g, 'uiEvents.findIndex');
content = content.replace(/uiEvents\.forEach\(msg \=\>/g, 'this.uiEvents().forEach(msg =>');
content = content.replace(/messages\.slice/g, 'uiEvents.slice');
fs.writeFileSync(chatComponentPath, content);
console.log('Fixed chat.component.ts');

const chatPanelHtmlPath = path.resolve(__dirname, 'src/app/components/chat-panel/chat-panel.component.html');
let htmlContent = fs.readFileSync(chatPanelHtmlPath, 'utf8');
htmlContent = htmlContent.replace(/\[allMessages\]\=\"messages\"/g, '[allMessages]="uiEvents"');
htmlContent = htmlContent.replace(/\[messages\]\=\"messages\"/g, '[messages]="uiEvents"');
htmlContent = htmlContent.replace(/messages\.length/g, 'uiEvents.length');
htmlContent = htmlContent.replace(/messages\.includes/g, 'uiEvents.includes');
fs.writeFileSync(chatPanelHtmlPath, htmlContent);
console.log('Fixed chat-panel.component.html');
