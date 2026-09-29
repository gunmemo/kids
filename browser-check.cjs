// Tablet layout and interaction regression checks. Requires Playwright + Edge.
const {execFileSync}=require('node:child_process');
for(const file of ['tablet-check.cjs','effects-check.cjs','drawing-tools-check.cjs','brush-audio-check.cjs','ui-layout-check.cjs','neon-check.cjs','neon-render-check.cjs','gallery-check.cjs','reset-choice-check.cjs','header-check.cjs','toolbar-check.cjs','celebration-check.cjs'])
 execFileSync(process.execPath,[file],{stdio:'inherit',env:{...process.env,APP_URL:process.env.APP_URL||'http://127.0.0.1:5180'}});
