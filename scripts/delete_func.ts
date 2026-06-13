#!/usr/bin/env npx tsx
/**
 * delete_func.ts — AST 引用树分析 + 逐层删除 (纯 AST 位置，不用正则)
 * Usage: npx tsx scripts/delete_func.ts <函数名> [--delete]
 */

import * as ts from 'typescript'
import { readFileSync, writeFileSync } from 'fs'
import { readdirSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

// ─── 收集所有源文件 ──────────────────────────

function* walkDir(dir: string): Generator<string> {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (!ent.name.startsWith('.') && ent.name !== 'node_modules') {
        yield* walkDir(full)
      }
    } else if (extname(ent.name) === '.ts' || extname(ent.name) === '.tsx') {
      yield full
    }
  }
}

// ─── AST 解析 ────────────────────────────────

interface FoundSymbol {
  file: string
  line: number
  code: string
  kind: 'declaration' | 'reference' | 'import'
  span?: { start: number; end: number }
}

function parseSourceFiles(): {
  symbols: Map<string, FoundSymbol[]>
  references: Map<string, Set<string>>
} {
  const symbols = new Map<string, FoundSymbol[]>()
  const references = new Map<string, Set<string>>()

  // First pass: collect all exported declarations
  for (const file of walkDir(SRC)) {
    const text = readFileSync(file, 'utf-8')
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

    function firstPass(node: ts.Node) {
      // 只收集 EXPORTED 声明
      let name: string | undefined
      if (ts.isFunctionDeclaration(node) && node.name &&
          node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        name = node.name.text
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (node.parent && ts.isVariableDeclarationList(node.parent) &&
          node.parent.parent && ts.isVariableStatement(node.parent.parent)) {
          const stmt = node.parent.parent
          if (stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            name = node.name.text
          }
        }
      }
      if (name) {
        const pos = sf.getLineAndCharacterOfPosition(node.getStart())
        const syms = symbols.get(name) || []
        syms.push({
          file,
          line: pos.line + 1,
          code: text.split('\n')[pos.line]?.trim() || '',
          kind: 'declaration',
          span: { start: node.getStart(), end: node.getEnd() },
        })
        symbols.set(name, syms)
        // Collect function body dependencies
        if (ts.isFunctionDeclaration(node)) {
          const deps = new Set<string>()
          node.body?.forEachChild(function collect(n: ts.Node) {
            if (ts.isIdentifier(n) && !isBuiltin(n.text)) deps.add(n.text)
            n.forEachChild(collect)
          })
          references.set(name, deps)
        }
      }
      ts.forEachChild(node, firstPass)
    }
    firstPass(sf)
  }

  // Second pass: collect imports and calls to known symbols
  const declaredNames = new Set(symbols.keys())
  for (const file of walkDir(SRC)) {
    const text = readFileSync(file, 'utf-8')
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

    function secondPass(node: ts.Node) {
      if (ts.isIdentifier(node) && declaredNames.has(node.text)) {
        const parent = node.parent
        // Skip the declaration itself
        if ((ts.isFunctionDeclaration(parent) || ts.isVariableDeclaration(parent)) &&
            (parent as any).name === node) {
          // skip
        } else if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) {
          const syms = symbols.get(node.text) || []
          syms.push({
            file,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            code: `import { ${node.text} }`,
            kind: 'import',
            span: { start: node.getStart(), end: node.getEnd() },
          })
          symbols.set(node.text, syms)
        } else if (ts.isCallExpression(parent) && parent.expression === node) {
          const syms = symbols.get(node.text) || []
          syms.push({
            file,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            code: `${node.text}(...)`,
            kind: 'reference',
          })
          symbols.set(node.text, syms)
        } else if (!ts.isPropertyAccessExpression(parent)) {
          // General reference (not obj.prop)
          const syms = symbols.get(node.text) || []
          syms.push({
            file,
            line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            code: node.text,
            kind: 'reference',
          })
          symbols.set(node.text, syms)
        }
      }
      ts.forEachChild(node, secondPass)
    }
    secondPass(sf)
  }

  return { symbols, references }
}

function isBuiltin(name: string): boolean {
  const builtins = new Set([
    'undefined', 'null', 'true', 'false', 'console', 'process', 'this', 'arguments',
    'Error', 'Promise', 'Array', 'Object', 'Map', 'Set', 'Date', 'Number', 'String',
    'Boolean', 'RegExp', 'JSON', 'Math', 'parseInt', 'parseFloat',
    'require', 'module', 'exports', '__dirname', '__filename',
  ])
  return builtins.has(name) || name[0] === name[0].toUpperCase()
}

// ─── 构建引用树 ────────────────────────────

interface TreeNode {
  name: string
  symbols: FoundSymbol[]
  deps: Set<string>
  children: TreeNode[]
}

function buildTree(
  rootName: string,
  symbols: Map<string, FoundSymbol[]>,
  references: Map<string, Set<string>>,
): TreeNode | null {
  if (!symbols.has(rootName)) return null

  const seen = new Set<string>()

  function build(name: string): TreeNode | null {
    if (seen.has(name)) return null
    seen.add(name)

    const syms = symbols.get(name)
    if (!syms) return null

    const deps = references.get(name) || new Set()
    const children: TreeNode[] = []

    for (const dep of deps) {
      if (symbols.has(dep) && !seen.has(dep)) {
        const child = build(dep)
        if (child) children.push(child)
      }
    }

    return { name, symbols: syms, deps, children }
  }

  return build(rootName)
}

// ─── 叶子优先排序 ──────────────────────────

function getLeafOrder(node: TreeNode): string[] {
  const result: string[] = []
  for (const child of node.children) {
    result.push(...getLeafOrder(child))
  }
  result.push(node.name)
  return result
}

// ─── 展示 ──────────────────────────────────

function shortPath(p: string): string { return p.replace(ROOT + '/', '') }

function printTree(node: TreeNode, indent = 0) {
  const prefix = '  '.repeat(indent)
  const files = new Set(node.symbols.map(s => shortPath(s.file)))
  const declCount = node.symbols.filter(s => s.kind === 'declaration').length
  const refCount = node.symbols.filter(s => s.kind !== 'declaration' && s.kind !== 'reference').length
  const callCount = node.symbols.filter(s => s.kind === 'reference').length

  console.log(`${prefix}📁 ${node.name} (${declCount}定义, ${refCount}导入, ${callCount}调用, ${files.size}文件)`)
  for (const f of files) {
    console.log(`${prefix}  📄 ${f}`)
    for (const s of node.symbols.filter(s => shortPath(s.file) === f)) {
      const tag = s.kind === 'declaration' ? '[def]' : s.kind === 'import' ? '[import]' : '[call]'
      console.log(`${prefix}    L${s.line} ${tag} ${s.code.slice(0, 80)}`)
    }
  }
  if (node.deps.size > 0) {
    const depList = [...node.deps].filter(d => symbols.has(d)).join(', ')
    if (depList) console.log(`${prefix}  ↓ 依赖: ${depList}`)
  }
  for (const child of node.children) printTree(child, indent + 1)
}

function collectFiles(node: TreeNode): Set<string> {
  const files = new Set(node.symbols.map(s => s.file))
  for (const c of node.children) {
    for (const f of collectFiles(c)) files.add(f)
  }
  return files
}

// ─── 删除实现 (纯 AST 位置) ────────────────

function deleteSymbols(tree: TreeNode) {
  // 收集所有符号
  const allSymbols = new Map<string, FoundSymbol[]>()
  function collect(node: TreeNode) {
    allSymbols.set(node.name, node.symbols)
    for (const c of node.children) collect(c)
  }
  collect(tree)

  // 树定义文件 = 树中符号有 declaration 的文件
  const treeDefFiles = new Set<string>()
  for (const [, syms] of allSymbols) {
    for (const s of syms) {
      if (s.kind === 'declaration') treeDefFiles.add(s.file)
    }
  }

  // 叶子优先：检查每个依赖是否有外部消费者
  const order = getLeafOrder(tree)
  const toDelete = new Set<string>()
  for (const name of order) {
    const syms = allSymbols.get(name) || []
    const extImports = syms.filter(s => s.kind === 'import' && !treeDefFiles.has(s.file))
    const extCalls = syms.filter(s => s.kind === 'reference' && !treeDefFiles.has(s.file))
    if (extImports.length === 0 && extCalls.length === 0) {
      toDelete.add(name)
    } else if (name === tree.name) {
      toDelete.add(name) // 根节点强制删
      console.log(`  ⚠️  ${name}: ${extImports.length} 外部导入 + ${extCalls.length} 外部调用，强制删除`)
    } else {
      console.log(`  ⏭️  跳过 ${name}: ${extImports.length} 外部导入, ${extCalls.length} 外部调用`)
    }
  }

  // 按文件分组删除区间
  const fileSpans = new Map<string, { start: number; end: number }[]>()

  for (const name of order) {
    if (!toDelete.has(name)) continue
    const syms = allSymbols.get(name) || []
    for (const s of syms) {
      if (!s.span) continue
      const spans = fileSpans.get(s.file) || []

      if (s.kind === 'declaration') {
        // AST span 包含完整函数体。扩展包含前导换行和尾部换行
        const text = readFileSync(s.file, 'utf-8')
        let start = s.span.start
        let end = s.span.end
        // 去掉前面空格和换行
        while (start > 0 && text[start - 1] === ' ') start--
        if (start > 0 && text[start - 1] === '\n') start--
        // 去掉尾部换行
        if (end < text.length && text[end] === '\n') end++
        spans.push({ start, end })
      } else if (s.kind === 'import') {
        // Import specifier — 去掉名字及周围逗号/空格
        const text = readFileSync(s.file, 'utf-8')
        let start = s.span.start
        let end = s.span.end
        // 向后去掉逗号和空格
        while (end < text.length && (text[end] === ' ' || text[end] === ',')) end++
        // 向前去掉空格
        while (start > 0 && text[start - 1] === ' ') start--
        // 如果前面是逗号，也去掉
        if (start > 0 && text[start - 1] === ',') start--
        spans.push({ start, end })

        // 如果整行变成空 import，删整行
        const lineStart = text.lastIndexOf('\n', s.span.start) + 1
        const lineEnd = text.indexOf('\n', s.span.end)
        let line = text.slice(lineStart, lineEnd > 0 ? lineEnd : undefined)
        // 模拟删除后的行
        line = line.slice(0, start - lineStart) + line.slice(end - lineStart)
        if (line.trim().match(/^import\s*\{\s*\}\s*(from|$)/)) {
          // 替换为整行删除
          spans.pop()
          const fullEnd = lineEnd > 0 ? lineEnd + 1 : text.length
          spans.push({ start: lineStart, end: fullEnd })
        }
      }

      fileSpans.set(s.file, spans)
    }
  }

  // 逐文件应用：合并重叠区间，倒序删除
  for (const [file, spans] of fileSpans) {
    // 合并重叠/相邻区间
    spans.sort((a, b) => a.start - b.start)
    const merged: { start: number; end: number }[] = []
    for (const sp of spans) {
      const last = merged[merged.length - 1]
      if (last && sp.start <= last.end + 1) {
        last.end = Math.max(last.end, sp.end)
      } else {
        merged.push({ ...sp })
      }
    }

    // 倒序应用
    merged.sort((a, b) => b.start - a.start)
    let text = readFileSync(file, 'utf-8')
    for (const { start, end } of merged) {
      text = text.slice(0, start) + text.slice(end)
    }
    writeFileSync(file, text)
    console.log(`  ✅ ${shortPath(file)}: ${merged.length} span(s)`)
  }
}

// ─── main ──────────────────────────────────

let symbols: Map<string, FoundSymbol[]>
let references: Map<string, Set<string>>

async function main() {
  // --list-dead: 列出所有0外部引用的函数
  if (process.argv.includes('--list-dead')) {
    console.log('解析源码 AST...')
    const result = parseSourceFiles()
    symbols = result.symbols
    references = result.references
    console.log(`共解析 ${symbols.size} 个声明符号\n`)

    const dead: { name: string; file: string; line: number }[] = []
    for (const [name, syms] of symbols) {
      const imports = syms.filter(s => s.kind === 'import')
      const calls = syms.filter(s => s.kind === 'reference')
      // Dead = 0 imports AND 0 external calls (calls outside definition file)
      const defFile = syms.find(s => s.kind === 'declaration')?.file
      const externalCalls = calls.filter(s => s.file !== defFile)
      if (imports.length === 0 && externalCalls.length === 0) {
        const def = syms.find(s => s.kind === 'declaration')
        if (def) dead.push({ name, file: def.file, line: def.line })
      }
    }
    console.log(`0外部引用的死函数: ${dead.length} 个\n`)
    dead.sort((a, b) => a.name.localeCompare(b.name))
    for (const d of dead) {
      console.log(`  ${d.name}  (${shortPath(d.file)}:${d.line})`)
    }
    return
  }

  const rootName = process.argv[2]
  if (!rootName) {
    console.log('Usage: npx tsx scripts/delete_func.ts <函数名> [--delete]')
    console.log('       npx tsx scripts/delete_func.ts --list-dead')
    process.exit(1)
  }

  console.log('解析源码 AST...')
  const result = parseSourceFiles()
  symbols = result.symbols
  references = result.references

  console.log(`共解析 ${symbols.size} 个符号\n`)

  const tree = buildTree(rootName, symbols, references)
  if (!tree) {
    console.log(`未找到符号: ${rootName}`)
    process.exit(1)
  }

  console.log(`=== 引用树: ${rootName} ===\n`)
  printTree(tree)

  const leafOrder = getLeafOrder(tree)
  const files = collectFiles(tree)

  console.log(`\n=== 涉及 ${files.size} 个文件 ===`)
  for (const f of files) console.log(`  ${shortPath(f)}`)

  console.log(`\n=== 删除顺序（叶子优先）===`)
  leafOrder.forEach((name, i) => console.log(`  ${i + 1}. ${name}`))

  if (process.argv.includes('--delete')) {
    console.log('\n开始删除...')
    deleteSymbols(tree)
    console.log('\n验证 build...')
    try {
      execSync('npx tsx scripts/build-node.ts', { cwd: ROOT, stdio: 'inherit', timeout: 120_000 })
      console.log('✅ Build 通过')
    } catch {
      console.log('❌ Build 失败! 请 git checkout 回滚')
      process.exit(1)
    }
  }
}

main().catch(console.error)
