# TODO

## 已完成
- [x] spinner 扫光动画 + 随机动词列表 (删 260 行)
- [x] 死依赖清理 (@orama/orama, @orama/plugin-data-persistence)
- [x] 死 feature flags (EXPERIMENTAL_SKILL_SEARCH, TREE_SITTER_BASH)
- [x] claude.ai / Subscriber 残余引用 (确认无死代码)

---

## UI 框架精简 — 从状态层入手

当前 UI = **AppState (50 字段)** → **React 组件 (255 文件 / 46k 行)** → **Ink 渲染器**

精简思路：从上游往下游清理。先砍死状态字段 → 砍掉不再渲染的组件 → 砍掉不再调用的 hook → 最后拆大文件。

---

### 第一阶段：砍死状态字段

以下 AppState 字段满足 kairosEnabled 同类模式——永远为 false/null/空，从未被真正翻活：

#### 1) 零组件读取（类型里定义了，默认值赋了，但没有任何 useAppState 读它）

| 字段 | 默认值 | 说明 |
|---|---|---|
| `thinkingBudgetTokens` | (无默认值) | 只有类型定义，零读取零写入 |
| `selectedIPAgentIndex` | -1 | main.tsx 初始化 + store 默认值，零组件读取 |
| `inbox` | `{ messages: [] }` | main.tsx 初始化，零 useAppState 读取 |
| `showTeammateMessagePreview` | false/undefined | main.tsx + store 初始化，零组件读取 |

#### 2) 永远 false，依赖的 KAIROS 已死

| 字段 | 默认值 | 说明 |
|---|---|---|
| `isBriefOnly` | false | KAIROS brief 模式标志，`Spinner.tsx:60` 有 `void isBriefOnly`（故意的死代码标记） |

#### 3) 整树枯死的 KAIROS 系统

`kairosEnabled` 写死 false，导致下游全部无效：

| 字段/模块 | 说明 |
|---|---|
| `kairosEnabled` (AppState) | 永远 false |
| `kairosActive` (bootstrap/state.ts) | `getKairosActive()` / `setKairosActive()` 永远返回 false |
| `utils/cronScheduler.ts` | 全文件 kairos 专用 |
| `utils/cronJitterConfig.ts` | 全文件 kairos 专用 |
| `utils/cronTasks.ts` | 全文件 kairos 专用 |
| `tools/ScheduleCronTool/` | 定时任务工具目录 |
| `hooks/useScheduledTasks.ts` | kairos 专用 hook |
| `skills/bundled/loop.ts` | `isKairosCronEnabled` 引用 |
| 20+ 处注释 | "KAIROS/KAIROS_BRIEF are false in external builds" |

- [ ] 删除 AppState 死字段: `thinkingBudgetTokens`, `selectedIPAgentIndex`, `inbox`, `showTeammateMessagePreview`, `isBriefOnly`
- [ ] 删除 KAIROS 整树: `kairosEnabled` + `kairosActive` + cronScheduler/cronJitter/cronTasks + ScheduleCronTool + useScheduledTasks
- [ ] 清理 20+ 处 KAIROS 注释和死分支 (compact.ts, conversationRecovery.ts, attachments.ts, memdir.ts 等)

---

### 第二阶段：审计 React 组件

255 个组件 / 46k 行，按职责分：

| 类别 | 文件数 | 行数 | 说明 |
|---|---|---|---|
| `permissions/` | 37 | 8,602 | 14 种权限弹窗，每种内容不同 |
| `messages/` | 34 | 4,673 | 34 种消息渲染器，每种逻辑不同 |
| `PromptInput/` | 18 | 3,890 | 输入框 + 自动补全 + 历史 + 底部状态 |
| `mcp/` | 14 | 3,681 | MCP 配置/连接/授权 |
| `CustomSelect/` | 10 | 3,048 | 自定义下拉选择 |
| `Spinner/` | 9 | 928 | 加载动画 |
| `settings/` | 5 | 2,135 | 设置页 |

巨型单体文件（>1000 行）：
- `PromptInput.tsx` (1,942)
- `LogSelector.tsx` (1,543)
- `Config.tsx` (1,349)
- `ElicitationDialog.tsx` (1,168)
- `VirtualMessageList.tsx` (1,081)
- `ScrollKeybindingHandler.tsx` (1,011)

待查项：
- [ ] 有哪些组件从未被 import？（需逐个检查）
- [ ] KAIROS 删完后，哪些组件的相关分支可以删？
- [ ] `Spinner/` 下 GlimmerMessage / FlashingChar / useShimmerAnimation 是否可进一步删

---

### 第三阶段：精简 hooks

60 个 hook / 9k 行。待查：
- [ ] KAIROS 相关 hook 删除后还剩哪些
- [ ] 哪些 hook 无调用者
- [ ] 巨型 hook 拆分：`useTypeahead.tsx` (1,330)、`useVirtualScroll.ts` (721)、`useTextInput.ts` (608)

---

### 第四阶段：状态类型进一步瘦身

- [ ] `denialTracking` — 只在 permissions.ts 内部使用，是否可下沉？
- [ ] `companionReaction` — 只有 REPL.tsx 用，是否可本地化？
- [ ] `speculation` — 只有 PromptInput 读一个字段，是否可内聚？

---

## 大型文件拆分（后续）

- [ ] `utils/messages.ts` (5,296)
- [ ] `utils/sessionStorage.ts` (5,058)
- [ ] `utils/hooks.ts` (4,695)
- [ ] `screens/REPL.tsx` (4,151)
- [ ] `utils/attachments.ts` (3,387)
