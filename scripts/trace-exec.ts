#!/usr/bin/env npx tsx
/**
 * 动态执行追踪：在 dist/cli.mjs 中注入日志，追踪关键函数调用
 */
import { readFileSync, writeFileSync } from 'fs';

const DIST = '/data/data/com.termux/files/home/cocode/dist/cli.mjs';
let content = readFileSync(DIST, 'utf-8');

// 在关键函数前注入 console.error 日志
const TRACE_POINTS = [
  'function main(',
  'async function run(',
  'function eagerLoadSettings(',
  'async function showSetupScreens(',
  'async function launchRepl(',
  'function init(',
  'function PromptInput',
];

for (const needle of TRACE_POINTS) {
  const idx = content.indexOf(needle);
  if (idx > 0) {
    const fnName = needle.replace(/^(async )?function /, '').replace(/\(.*/, '').trim();
    const inject = `{console.error('[TRACE] ${fnName} called at ' + new Date().toISOString())};`;
    // Find the first { after the function signature and inject after it
    let braceIdx = content.indexOf('{', idx);
    if (braceIdx > 0) {
      content = content.slice(0, braceIdx + 1) + inject + content.slice(braceIdx + 1);
      console.log(`  ✅ Injected trace into: ${fnName}`);
    }
  }
}

writeFileSync(DIST, content);
console.log('Done! Run: cocode');
