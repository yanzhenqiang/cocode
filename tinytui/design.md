# TinyTUI Design

## 目标

用一个极简的、零依赖的终端 UI 替代 cocode 当前 440 文件 / 9.3 万行的 UI 层。

## 核心技术选择

- **Node.js 内置 `readline` + 原始 stdin data 解析**（不用 React / Ink / Yoga）
- **ANSI escape codes 直接渲染**（不用虚拟 DOM / 调和器）
- **自维护屏幕缓冲区 + 脏行 diff 输出**（最小化终端写入）

## 功能需求

### 1. 输入框
- [x] 实时回显（每敲一个字符立刻显示）
- [x] 光标移动（← → Home End Ctrl+A Ctrl+E）
- [x] 编辑操作（Backspace Delete Ctrl+U 清行 Ctrl+W 删词）
- [x] 多行输入支持
- [x] 自动折行（输入超出屏幕宽度时自动换行，最多 5 行）
- [x] Enter 提交
- [ ] Shift+Enter / Alt+Enter 手动换行（Alt+Enter 已实现，Shift+Enter 需 kitty 键盘协议）

### 2. 滚动显示区域
- [x] 对话内容渲染（用户消息 + 助手回复）
- [x] 鼠标滚轮滚动（xterm SGR mouse protocol）
- [x] 键盘滚动（↑ ↓ PgUp PgDn）
- [x] 超出屏幕时显示 "N lines above" 提示
- [x] 自动滚到底部（新消息来时）

### 3. 状态栏
- [x] 实时显示流式输出的字符数和 token 估算
- [x] 平时显示行数统计
- [x] 流式输出时显示 "Assistant is thinking..." + chars/tokens

### 4. 自动补全
- [x] `/` 触发命令补全
- [x] ↓ ↑ 浏览候选项
- [x] Tab 确认补全
- [x] Esc 取消

### 5. 流式输出
- [x] 模拟助手逐字回复（20-50ms 间隔，1-4 字符/次）
- [x] 实时更新对话区
- [x] 流式输出期间锁定输入框
- [x] 流式完成后自动解锁输入
- [x] 自动滚到底部

## 架构

```
┌─ parseStdin() ─────────────────────────────┐
│ 原始 stdin bytes → 结构化事件               │
│ {type: 'char', char} | {type: 'key', name} │
└──────────────────┬─────────────────────────┘
                   ↓
┌─ TinyTUI.handleEvent() ────────────────────┐
│ 事件分发：输入编辑 / 提交 / 滚动 / 补全     │
└──────────────────┬─────────────────────────┘
                   ↓
┌─ TinyTUI.render() ─────────────────────────┐
│ Screen buffer → ANSI escape 序列写入 stdout │
└─────────────────────────────────────────────┘
```

### 类结构

| 类 | 职责 | 行数 |
|---|---|---|
| `Screen` | 屏幕缓冲区，脏行追踪，diff 输出 | ~50 |
| `ContentArea` | 滚动内容区，环形缓冲区 | ~40 |
| `InputBuffer` | 多行输入缓冲区，逻辑行/视觉行映射 | ~120 |
| `AutoComplete` | / 命令补全匹配 | ~25 |
| `StreamSimulator` | 模拟流式回复 | ~30 |
| `TinyTUI` | 主控制器，布局/渲染/事件分发 | ~250 |

### 布局

```
┌──────────────────────────┐  row 0
│  Content Area            │
│  (conversation)          │
│                          │
│                          │  row contentHeight-1
├──────────────────────────┤  separatorRow
│  Status / "thinking..."  │
├──────────────────────────┤  inputStartRow
│  > input line 1          │
│    continuation          │  (最多 5 行)
│    ...                   │
├──────────────────────────┤  screen.rows - 1
```

## 关键实现细节

### stdin 解析

不使用 readline 的 keypress 事件（在某些终端不触发），直接解析 raw data：

- 单字节 ASCII (0x20-0x7E) → 可打印字符
- 控制字符 (0x01-0x1A) → Ctrl+key
- CSI 序列 `ESC [` → 方向键 / Home / End / PgUp / PgDn / Delete
- SGR mouse `ESC [ <` → 鼠标滚轮
- `ESC + CR` → Alt+Enter（多行输入换行）

### 屏幕渲染

1. 修改 Screen buffer 的行内容
2. 标记脏行
3. 对每个脏行：`CSI pos + 行内容`
4. 一次性写入 stdout（减少 write 系统调用）

### 多行输入

- `InputBuffer.lines[]` — 逻辑行（用户按 Enter/Alt+Enter 分割）
- `InputBuffer.visualLayout(width)` — 将逻辑行按宽度折行，返回视觉行数组 + 光标位置
- 视觉行数上限 `MAX_INPUT_ROWS = 5`
- 输入框高度动态变化（1-5 行），内容区相应缩小

## 与当前 cocode UI 的对比

| | 当前 cocode | TinyTUI |
|---|---|---|
| 文件数 | 440 | 1 |
| 行数 | ~93,000 | ~550 |
| 依赖 | React + Ink fork + Yoga 原生库 | Node.js 内置 |
| 渲染引擎 | React 虚拟 DOM → 调和器 → diff | ANSI + 脏行 diff |
| 构建 | 需要 TypeScript 编译 | 直接 `node tui.cjs` |
| 启动速度 | 数百 ms | <10ms |

## 待优化

- [ ] Shift+Enter 换行（需启用 kitty keyboard protocol `CSI > 1u`）
- [ ] 中文/emoji 宽度计算（需 east-asian-width 查表）
- [ ] ANSI escape code 与 visible text 分离存储（当前混在 screen buffer 中）
- [ ] 输入历史（↑ ↓ 回显历史消息）
- [ ] 真正的流式输出来源（替换模拟的 StreamSimulator）
