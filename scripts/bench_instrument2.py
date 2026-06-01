import re, os

base = '/data/data/com.termux/files/home/cocode'

# Instrument to capture START and END around each gate body
# For !isBareMode() blocks: wrap the body with timing
# For isBareMode() blocks: wrap with timing (but these are skips)
gates = [
    # (file, line, label, type)
    # setup.ts gates
    ('src/setup.ts', 269, 'initSessionMemory', '!bare'),
    ('src/setup.ts', 299, 'attributionHooks', '!bare'),
    ('src/setup.ts', 319, 'releaseNotes', '!bare'),
    # skills loading
    ('src/skills/loadSkillsDir.ts', 743, 'skillDirWalk', 'bare'),
    # main.tsx critical path
    ('src/main.tsx', 1106, 'fetchMcpConfigs', '!bare'),
    ('src/main.tsx', 1127, 'mcpConfigAutoDiscover', 'bare'),
]

for file_path, line_num, label, gtype in gates:
    full = os.path.join(base, file_path)
    with open(full) as f:
        lines = f.readlines()

    line = lines[line_num-1]
    indent = re.match(r'^(\s*)', line).group(1)

    # Find the block that follows this gate
    # For now, just add start/end markers
    start_tag = f'{indent}const __t0 = performance.now();\n'
    end_tag = f'{indent}console.error("[BENCH:{label}]", performance.now() - __t0, "ms");\n'

    # Insert start before the gate line
    lines.insert(line_num-1, start_tag)
    # Insert end after... we need to find the block end.
    # Simplest: insert a direct measurement of the condition evaluation
    # We'll use a different approach: measure the function call duration

    with open(full, 'w') as f:
        f.writelines(lines)

print("Timing approach: need more context. Let me manually instrument key points.")
