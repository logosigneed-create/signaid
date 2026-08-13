import cv2
import base64

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Insertion entre 2 Points & Automatisation IA</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Inter, sans-serif; }}
    body {{ background-color: #0f1117; color: #e2e8f0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }}
    
    header {{ background: #1e293b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }}
    header h1 {{ font-size: 1.1rem; font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 8px; }}
    
    .toolbar {{ display: flex; gap: 8px; align-items: center; }}
    .btn {{ background: #2563eb; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; transition: all 0.2s; }}
    .btn:hover {{ background: #1d4ed8; transform: translateY(-1px); }}
    .btn-secondary {{ background: #334155; }}
    .btn-secondary:hover {{ background: #475569; }}
    .btn-auto {{ background: linear-gradient(135deg, #10b981, #3b82f6); color: white; font-weight: 700; }}
    .btn-auto:hover {{ filter: brightness(1.1); transform: translateY(-1px); }}
    .btn-danger {{ background: #dc2626; }}
    .btn-active {{ background: #38bdf8; color: #0f1117; font-weight: 700; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 370px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 14px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }}
    
    .tool-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}

    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 130px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    .auto-badge {{ background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; line-height: 1.4; }}

    /* SVG Styling */
    .anchor-node {{ fill: #38bdf8; stroke: #ffffff; stroke-width: 2px; r: 5; cursor: pointer; }}
    .anchor-node:hover {{ fill: #f43f5e; r: 7; }}
    .anchor-node.selected {{ fill: #f43f5e; stroke: #fbbf24; stroke-width: 3px; r: 8; }}
    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1px; stroke-dasharray: 3 3; opacity: 0.7; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
    .hover-segment {{ stroke: #f43f5e; stroke-width: 4px; opacity: 0.8; stroke-dasharray: 4 2; pointer-events: none; }}
  </style>
</head>
<body>

  <header>
    <h1>⚡ Éditeur Vectoriel - Insertion Subdivisée entre 2 Points & Automatisation</h1>
    <div class="toolbar">
      <button class="btn btn-auto" onclick="autoOptimizePaths()">⚡ Automatiser & Aligner les Formes</button>
      <button class="btn btn-secondary" onclick="resetPaths()">🔄 Réinitialiser</button>
      <button class="btn" onclick="copySVGCode()">📋 Copier SVG</button>
      <button class="btn btn-active" onclick="downloadSVG()">💾 Télécharger SVG</button>
    </div>
  </header>

  <div class="main">
    <div class="canvas-container">
      <img id="bg-img" src="data:image/jpeg;base64,{img_b64}" alt="Template draft">
      <svg id="svg-canvas" viewBox="0 0 581 481"></svg>
    </div>

    <div class="sidebar">
      <div class="auto-badge">
        ✨ <b>Insertion entre 2 points</b> : Cliquez directement sur n'importe quel segment entre deux points existants pour insérer un nouveau point intermédiaire !
      </div>

      <div>
        <div class="section-title">Mode d'Action</div>
        <div class="tool-grid">
          <button id="btn-mode-addbetween" class="btn btn-active" onclick="setMode('addbetween')">➕ Insérer Entre 2 Points</button>
          <button id="btn-mode-select" class="btn btn-secondary" onclick="setMode('select')">🖐️ Déplacer / Sélectionner</button>
        </div>
      </div>

      <div>
        <div class="section-title">Action sur le Point Sélectionné</div>
        <div class="tool-grid">
          <button class="btn btn-secondary" onclick="convertSelectedSegment('L')">📏 Ligne Droite (L)</button>
          <button class="btn btn-secondary" onclick="convertSelectedSegment('C')">〰️ Courbe Bézier (C)</button>
          <button class="btn btn-danger" style="grid-column: span 2;" onclick="deleteSelectedNode()">🗑️ Supprimer ce Point (Suppr)</button>
        </div>
      </div>

      <div>
        <div class="section-title">Modèle de Fond (Brouillon)</div>
        <div class="control-group">
          <label>Opacité du modèle: <span id="opacity-val">50%</span></label>
          <input type="range" min="0" max="100" value="50" oninput="updateOpacity(this.value)">
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column;">
        <div class="section-title">Code SVG Mis à Jour en Temps Réel</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    let mode = 'addbetween'; // 'addbetween' | 'select'
    let selectedNodeRef = {{ pIdx: 0, nIdx: 0 }};
    let isDragging = false;
    let dragTarget = null;
    let hoverSegment = null; // {{ pIdx, segIdx, splitX, splitY }}

    let paths = [
      {{
        name: "Forme Supérieure",
        nodes: [
          {{ x: 449, y: 30, type: 'L' }},
          {{ x: 386, y: 70, type: 'L' }},
          {{ x: 385, y: 194, type: 'L' }},
          {{ x: 209, y: 243, type: 'L' }},
          {{ x: 209, y: 46, type: 'L' }},
          {{ x: 147, y: 86, type: 'L' }},
          {{ x: 146, y: 301, type: 'L' }},
          {{ x: 449, y: 205, type: 'L' }}
        ]
      }},
      {{
        name: "Forme Inférieure",
        nodes: [
          {{ x: 569, y: 201, type: 'C', c1x: 353, c1y: 227, c2x: 153, c2y: 307 }},
          {{ x: 24, y: 396, type: 'L' }},
          {{ x: 145, y: 353, type: 'L' }},
          {{ x: 147, y: 435, type: 'L' }},
          {{ x: 209, y: 397, type: 'L' }},
          {{ x: 210, y: 325, type: 'L' }},
          {{ x: 385, y: 254, type: 'L' }},
          {{ x: 385, y: 421, type: 'L' }},
          {{ x: 449, y: 382, type: 'L' }},
          {{ x: 449, y: 232, type: 'L' }}
        ]
      }}
    ];

    const svgCanvas = document.getElementById('svg-canvas');
    const svgOutput = document.getElementById('svg-output');
    const bgImg = document.getElementById('bg-img');

    function setMode(m) {{
      mode = m;
      document.getElementById('btn-mode-addbetween').className = m === 'addbetween' ? 'btn btn-active' : 'btn btn-secondary';
      document.getElementById('btn-mode-select').className = m === 'select' ? 'btn btn-active' : 'btn btn-secondary';
    }}

    function updateOpacity(val) {{
      bgImg.style.opacity = val / 100;
      document.getElementById('opacity-val').innerText = val + '%';
    }}

    function buildDPath(nodes) {{
      if (!nodes || nodes.length === 0) return '';
      let d = `M ${{nodes[0].x}},${{nodes[0].y}}`;
      for (let i = 1; i < nodes.length; i++) {{
        let curr = nodes[i];
        if (curr.type === 'C') {{
          d += ` C ${{curr.c1x}},${{curr.c1y}} ${{curr.c2x}},${{curr.c2y}} ${{curr.x}},${{curr.y}}`;
        }} else {{
          d += ` L ${{curr.x}},${{curr.y}}`;
        }}
      }}
      d += ' Z';
      return d;
    }}

    // Find nearest segment between 2 adjacent points for insertion
    function findNearestSegment(pos) {{
      let best = null;
      let minDist = 25; // 25px threshold

      paths.forEach((p, pIdx) => {{
        for (let i = 0; i < p.nodes.length; i++) {{
          let p1 = p.nodes[i];
          let p2 = p.nodes[(i + 1) % p.nodes.length];
          let dist = perpendicularDistance(pos, p1, p2);
          if (dist < minDist) {{
            minDist = dist;
            let proj = getProjectionPoint(pos, p1, p2);
            best = {{ pIdx, segIdx: i, splitX: proj.x, splitY: proj.y }};
          }}
        }}
      }});
      return best;
    }}

    function perpendicularDistance(pt, lineStart, lineEnd) {{
      let dx = lineEnd.x - lineStart.x;
      let dy = lineEnd.y - lineStart.y;
      let mag = Math.hypot(dx, dy);
      if (mag === 0) return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
      let u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
      u = Math.max(0, Math.min(1, u));
      let ix = lineStart.x + u * dx;
      let iy = lineStart.y + u * dy;
      return Math.hypot(pt.x - ix, pt.y - iy);
    }}

    function getProjectionPoint(pt, lineStart, lineEnd) {{
      let dx = lineEnd.x - lineStart.x;
      let dy = lineEnd.y - lineStart.y;
      let mag = Math.hypot(dx, dy);
      if (mag === 0) return {{ x: lineStart.x, y: lineStart.y }};
      let u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
      u = Math.max(0, Math.min(1, u));
      return {{
        x: Math.round(lineStart.x + u * dx),
        y: Math.round(lineStart.y + u * dy)
      }};
    }}

    function convertSelectedSegment(t) {{
      if (!selectedNodeRef) return;
      let {{ pIdx, nIdx }} = selectedNodeRef;
      let node = paths[pIdx].nodes[nIdx];
      node.type = t;
      if (t === 'C' && (!node.c1x || !node.c2x)) {{
        let prev = paths[pIdx].nodes[(nIdx - 1 + paths[pIdx].nodes.length) % paths[pIdx].nodes.length];
        node.c1x = Math.round(prev.x + (node.x - prev.x) * 0.33);
        node.c1y = Math.round(prev.y + (node.y - prev.y) * 0.33);
        node.c2x = Math.round(prev.x + (node.x - prev.x) * 0.66);
        node.c2y = Math.round(prev.y + (node.y - prev.y) * 0.66);
      }}
      render();
    }}

    function deleteSelectedNode() {{
      if (!selectedNodeRef) return;
      let {{ pIdx, nIdx }} = selectedNodeRef;
      paths[pIdx].nodes.splice(nIdx, 1);
      if (paths[pIdx].nodes.length === 0) {{
        paths.splice(pIdx, 1);
      }}
      selectedNodeRef = null;
      render();
    }}

    // Auto-Optimize & Align Paths Feature
    function autoOptimizePaths() {{
      paths.forEach(p => {{
        // Snap near-vertical and near-horizontal lines
        for (let i = 0; i < p.nodes.length; i++) {{
          let next = p.nodes[(i + 1) % p.nodes.length];
          // Snap vertical (dx < 4px)
          if (Math.abs(p.nodes[i].x - next.x) < 4) {{
            next.x = p.nodes[i].x;
          }}
          // Snap horizontal (dy < 4px)
          if (Math.abs(p.nodes[i].y - next.y) < 4) {{
            next.y = p.nodes[i].y;
          }}
        }}
      }});
      render();
      alert('⚡ Formes ré-alignées et optimisées automatiquement !');
    }}

    function render() {{
      svgCanvas.innerHTML = '';
      let svgCodeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">\\n`;
      svgCodeStr += `  <rect width="581" height="481" fill="#000000"/>\\n  <g fill="#ffffff">\\n`;

      paths.forEach((p, pIdx) => {{
        if (p.nodes.length < 2) return;
        let d = buildDPath(p.nodes);
        svgCodeStr += `    <path d="${{d}}" />\\n`;

        let pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('class', 'draft-path');
        svgCanvas.appendChild(pathEl);

        // Render Handles & Anchor Nodes
        p.nodes.forEach((n, nIdx) => {{
          let isSel = selectedNodeRef && selectedNodeRef.pIdx === pIdx && selectedNodeRef.nIdx === nIdx;

          if (n.type === 'C') {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y, isSel);
        }});
      }});

      // Render Hover Segment Highlight if inserting between 2 points
      if (hoverSegment && mode === 'addbetween') {{
        let p1 = paths[hoverSegment.pIdx].nodes[hoverSegment.segIdx];
        let p2 = paths[hoverSegment.pIdx].nodes[(hoverSegment.segIdx + 1) % paths[hoverSegment.pIdx].nodes.length];
        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
        line.setAttribute('class', 'hover-segment');
        svgCanvas.appendChild(line);

        // Preview split point
        let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', hoverSegment.splitX);
        circle.setAttribute('cy', hoverSegment.splitY);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#f43f5e');
        svgCanvas.appendChild(circle);
      }}

      svgCodeStr += `  </g>\\n</svg>`;
      svgOutput.value = svgCodeStr;
    }}

    function createHandleLine(x1, y1, x2, y2) {{
      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class', 'handle-line');
      svgCanvas.appendChild(line);
    }}

    function createAnchorNode(pIdx, nIdx, x, y, isSel) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      circle.setAttribute('class', isSel ? 'anchor-node selected' : 'anchor-node');

      circle.onmousedown = (e) => {{
        e.stopPropagation();
        selectedNodeRef = {{ pIdx, nIdx }};
        if (mode === 'select' || mode === 'addbetween') {{
          isDragging = true;
          dragTarget = {{ pIdx, nIdx, targetType: 'anchor' }};
        }}
        render();
      }};
      svgCanvas.appendChild(circle);
    }}

    function createHandleNode(pIdx, nIdx, handleType, x, y) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      circle.setAttribute('class', 'handle-node');
      circle.onmousedown = (e) => {{
        e.stopPropagation();
        isDragging = true;
        dragTarget = {{ pIdx, nIdx, targetType: handleType }};
      }};
      svgCanvas.appendChild(circle);
    }}

    function getMousePos(e) {{
      let rect = svgCanvas.getBoundingClientRect();
      let scaleX = 581 / rect.width;
      let scaleY = 481 / rect.height;
      return {{
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY)
      }};
    }}

    svgCanvas.onclick = (e) => {{
      let pos = getMousePos(e);
      if (mode === 'addbetween') {{
        let seg = findNearestSegment(pos);
        if (seg) {{
          // Insert new node EXACTLY between segIdx and segIdx+1 !
          paths[seg.pIdx].nodes.splice(seg.segIdx + 1, 0, {{ x: seg.splitX, y: seg.splitY, type: 'L' }});
          selectedNodeRef = {{ pIdx: seg.pIdx, nIdx: seg.segIdx + 1 }};
          render();
        }}
      }}
    }};

    window.onmousemove = (e) => {{
      let pos = getMousePos(e);

      if (mode === 'addbetween' && !isDragging) {{
        hoverSegment = findNearestSegment(pos);
        render();
        return;
      }}

      if (isDragging && dragTarget) {{
        let node = paths[dragTarget.pIdx].nodes[dragTarget.nIdx];
        if (dragTarget.targetType === 'anchor') {{
          let dx = pos.x - node.x;
          let dy = pos.y - node.y;
          node.x = pos.x; node.y = pos.y;
          if (node.type === 'C') {{
            node.c2x += dx; node.c2y += dy;
          }}
        }} else if (dragTarget.targetType === 'c1') {{
          node.c1x = pos.x; node.c1y = pos.y;
        }} else if (dragTarget.targetType === 'c2') {{
          node.c2x = pos.x; node.c2y = pos.y;
        }}
        render();
      }}
    }};

    window.onmouseup = () => {{
      isDragging = false;
      dragTarget = null;
    }};

    window.onkeydown = (e) => {{
      if (e.key === 'Delete' || e.key === 'Backspace') {{
        deleteSelectedNode();
      }} else if (e.key === 'd' || e.key === 'D') {{
        convertSelectedSegment('L');
      }} else if (e.key === 'c' || e.key === 'C') {{
        convertSelectedSegment('C');
      }}
    }};

    function resetPaths() {{
      location.reload();
    }}

    function copySVGCode() {{
      navigator.clipboard.writeText(svgOutput.value);
      alert('Code SVG copié dans le presse-papier !');
    }}

    function downloadSVG() {{
      let blob = new Blob([svgOutput.value], {{ type: 'image/svg+xml' }});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logo_subdivided.svg';
      a.click();
    }}

    render();
  </script>
</body>
</html>
'''

output_path = r'c:\Partage\Projet\Signaid V24\vector_editor.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Automated segment-splitting editor saved to {output_path}")
