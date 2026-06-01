import re, os

base = '/data/data/com.termux/files/home/cocode'

gates = [
    ('src/setup.ts', 269, 'initSessionMemory'),
    ('src/setup.ts', 288, 'skipPluginPrefetch'),
    ('src/setup.ts', 299, 'attributionHooks'),
    ('src/setup.ts', 319, 'releaseNotes'),
    ('src/skills/loadSkillsDir.ts', 743, 'skillDirWalk'),
    ('src/main.tsx', 1106, 'fetchMcpConfigs'),
    ('src/main.tsx', 1505, 'startupPrefetches'),
    ('src/main.tsx', 1713, 'pluginSync'),
    ('src/main.tsx', 1971, 'deferredPrefetches'),
]

for file_path, line_num, label in gates:
    full = os.path.join(base, file_path)
    with open(full) as f:
        lines = f.readlines()
    line = lines[line_num-1]
    indent = re.match(r'^(\s*)', line).group(1)
    timing_line = f'{indent}console.error("[BENCH:{label}]", performance.now?.() ?? Date.now());\n'
    lines.insert(line_num-1, timing_line)
    with open(full, 'w') as f:
        f.writelines(lines)
    print(f"  + {file_path}:{line_num} [{label}]")

print("All instrumented")
