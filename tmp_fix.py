
# -*- coding: utf-8 -*-
import sys

filepath = r'c:\Partage\Projet\Signaid V24\src\restoration\CustomizerView.Restored.tsx'

with open(filepath, 'rb') as f:
    byte_content = f.read()

# Replace action buttons container
byte_content = byte_content.replace(b'flex gap-3 mt-4 mb-32 px-4 z-40', b'flex flex-row gap-3 mt-6 mb-24 px-4 z-40')
# Replace flex-[2] with flex-1 for the second button
byte_content = byte_content.replace(b'flex-[2] py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95', b'flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95')

lines = byte_content.splitlines()
new_lines = []
skip_mode = False
for line in lines:
    if skip_mode:
        if b')}' in line: 
            skip_mode = False
            continue
        continue
    if b'{activePricing.services > 0 && (' in line:
        skip_mode = True
        continue
    new_lines.append(line)

with open(filepath, 'wb') as f:
    f.write(b'\n'.join(new_lines))
