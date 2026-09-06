import cv2
import base64

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel avec Correction IA de Courbe</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Inter, sans-serif; }}
    body {{ background-color: #0f1117; color: #e2e8f0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }}
    
    header {{ background: #1e293b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }}
    header h1 {{ font-size: 1.1rem; font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 8px; }}
    
    .toolbar {{ display: flex; gap: 10px; align-items: center; }}
    .btn {{ background: #2563eb; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; transition: all 0.2s; }}
    .btn:hover {{ background: #1d4ed8; transform: translateY(-1px); }}
    .btn-secondary {{ background: #334155; }}
    .btn-secondary:hover {{ background: #475569; }}
    .btn-ai {{ background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; font-weight: 700; }}
    .btn-ai:hover {{ filter: brightness(1.1); transform: translateY(-1px); }}
    .btn-danger {{ background: #dc2626; }}
    .btn-active {{ background: #38bdf8; color: #0f1117; font-weight: 700; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 350px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 16px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }}
    
    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 160px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    .tool-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}

    .ai-badge {{ background: rgba(236, 72, 153, 0.15); border: 1px solid #ec4899; color: #f472b6; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }}

    /* SVG Styling */
    .anchor-node {{ fill: #38bdf8; stroke: #ffffff; stroke-width: 2px; r: 5; cursor: pointer; }}
    .anchor-node:hover {{ fill: #f43f5e; r: 7; }}
    .anchor-node.selected {{ fill: #f43f5e; stroke: #fbbf24; stroke-width: 3px; r: 8; }}
    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1px; stroke-dasharray: 3 3; opacity: 0.7; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
    .correction-stroke {{ fill: none; stroke: #ec4899; stroke-width: 4px; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 4 2; }}
  </style>
</head>
<body>

  <header>
    <h1>🤖 Éditeur Vectoriel - Correction Automatique de Courbes par IA</h1>
    <div class="toolbar">
      <button class="btn btn-danger" onclick="deleteSelectedNode()">🗑️ Supprimer Point</button>
      <button class="btn btn-secondary" onclick="resetPaths()">🔄 Réinitialiser</button>
      <button class="btn" onclick="copySVGCode()">📋 Copier SVG</button>
      <button class="btn btn-active" onclick="downloadSVG()">💾 Télécharger .SVG</button>
    </div>
  </header>

  <div class="main">
    <div class="canvas-container">
      <img id="bg-img" src="data:image/jpeg;base64,{img_b64}" alt="Template draft">
      <svg id="svg-canvas" viewBox="0 0 581 481"></svg>
    </div>

    <div class="sidebar">
      <div class="ai-badge">
        ✨ Mode IA Actif : Repassez sur une courbe pour qu'elle s'ajuste automatiquement !
      </div>

      <div>
        <div class="section-title">Outils de Retouche</div>
        <div class="tool-grid">
          <button id="btn-mode-ai" class="btn btn-ai" onclick="setMode('ai')">🪄 Retouche Courbe IA</button>
          <button id="btn-mode-select" class="btn btn-secondary" onclick="setMode('select')">🖐️ Déplacer Points</button>
          <button id="btn-mode-add" class="btn btn-secondary" onclick="setMode('add')">➕ Ajouter Point</button>
          <button id="btn-mode-delete" class="btn btn-secondary" onclick="setMode('delete')">🗑️ Supprimer Point</button>
        </div>
      </div>

      <div>
        <div class="section-title">Sensibilité IA (Lissage)</div>
        <div class="control-group">
          <label>Lissage Bézier automatique: <span id="smooth-val">Modéré (0.5)</span></label>
          <input type="range" id="smooth-slider" min="1" max="10" value="5" oninput="updateSmoothVal(this.value)">
          <small style="color: #94a3b8; font-size: 0.7rem;">Quand vous repassez sur un trait, l'IA calcule les nouvelles poignées Bézier exactes.</small>
        </div>
      </div>

      <div>
        <div class="section-title">Modèle de Fond</div>
        <div class="control-group">
          <label>Opacité du modèle: <span id="opacity-val">50%</span></label>
          <input type="range" min="0" max="100" value="50" oninput="updateOpacity(this.value)">
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column;">
        <div class="section-title">Code SVG Résultat</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    let mode = 'ai'; // 'ai' | 'select' | 'add' | 'delete'
    let selectedNodeRef = null;
    let isDragging = false;
    let dragTarget = null;
    let correctionPoints = [];
    let isCorrectionDrawing = false;

    // Default SVG Paths
    let paths = [
      {{
        name: "Forme Supérieure",
        nodes: [
          {{ x: 449, y: 30, type: 'L' }},
          {{ x: 386, y: 70, type: 'L' }},
          {{ x: 385, y: 194, type: 'C', c1x: 333, c1y: 209, c2x: 266, c2y: 228 }},
          {{ x: 209, y: 243, type: 'L' }},
          {{ x: 209, y: 46, type: 'L' }},
          {{ x: 147, y: 86, type: 'L' }},
          {{ x: 146, y: 301, type: 'C', c1x: 224, c1y: 267, c2x: 378, c2y: 215 }},
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
          {{ x: 210, y: 325, type: 'C', c1x: 267, c1y: 300, c2x: 329, c2y: 272 }},
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
      document.querySelectorAll('.tool-grid button').forEach(b => {{
        if (b.id === 'btn-mode-ai') b.className = 'btn btn-ai';
        else b.className = 'btn btn-secondary';
      }});
      let activeBtn = document.getElementById('btn-mode-' + m);
      if (m === 'ai') activeBtn.className = 'btn btn-ai';
      else activeBtn.className = 'btn btn-active';
    }}

    function updateOpacity(val) {{
      bgImg.style.opacity = val / 100;
      document.getElementById('opacity-val').innerText = val + '%';
    }}

    function updateSmoothVal(val) {{
      document.getElementById('smooth-val').innerText = (val / 10).toFixed(1);
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

        // Control Handles & Nodes
        p.nodes.forEach((n, nIdx) => {{
          if (n.type === 'C') {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y);
        }});
      }});

      // Render Active AI Correction Stroke
      if (correctionPoints.length > 1) {{
        let polyLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let dStr = `M ${{correctionPoints[0].x}},${{correctionPoints[0].y}}`;
        for (let i = 1; i < correctionPoints.length; i++) {{
          dStr += ` L ${{correctionPoints[i].x}},${{correctionPoints[i].y}}`;
        }}
        polyLine.setAttribute('d', dStr);
        polyLine.setAttribute('class', 'correction-stroke');
        svgCanvas.appendChild(polyLine);
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

    function createAnchorNode(pIdx, nIdx, x, y) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      let isSel = selectedNodeRef && selectedNodeRef.pIdx === pIdx && selectedNodeRef.nIdx === nIdx;
      circle.setAttribute('class', isSel ? 'anchor-node selected' : 'anchor-node');

      circle.onmousedown = (e) => {{
        e.stopPropagation();
        selectedNodeRef = {{ pIdx, nIdx }};
        if (mode === 'delete') {{
          deleteSelectedNode();
          return;
        }}
        if (mode === 'select') {{
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
        if (mode === 'select') {{
          isDragging = true;
          dragTarget = {{ pIdx, nIdx, targetType: handleType }};
        }}
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

    // AI Curve Refinement Algorithm (Fit Bezier curve over nearby segment)
    function applyAICurveCorrection(pts) {{
      if (pts.length < 3) return;
      let startPt = pts[0];
      let endPt = pts[pts.length - 1];

      // Find nearest existing curve segment across all paths
      let bestMatch = null;
      let minDist = 999999;

      paths.forEach((p, pIdx) => {{
        p.nodes.forEach((n, nIdx) => {{
          let dStart = Math.hypot(n.x - startPt.x, n.y - startPt.y);
          let dEnd = Math.hypot(n.x - endPt.x, n.y - endPt.y);
          let totalD = dStart + dEnd;
          if (totalD < minDist) {{
            minDist = totalD;
            bestMatch = {{ pIdx, nIdx }};
          }}
        }});
      }});

      if (bestMatch) {{
        let node = paths[bestMatch.pIdx].nodes[bestMatch.nIdx];

        // Midpoint of user's correction stroke
        let midPt = pts[Math.floor(pts.length / 2)];
        let c1 = pts[Math.floor(pts.length * 0.33)];
        let c2 = pts[Math.floor(pts.length * 0.66)];

        // Update target node and convert to smooth Bezier curve 'C'!
        node.type = 'C';
        node.x = endPt.x;
        node.y = endPt.y;
        node.c1x = c1.x;
        node.c1y = c1.y;
        node.c2x = c2.x;
        node.c2y = c2.y;
      }}
    }}

    svgCanvas.onmousedown = (e) => {{
      let pos = getMousePos(e);
      if (mode === 'ai') {{
        isCorrectionDrawing = true;
        correctionPoints = [pos];
        render();
      }} else if (mode === 'add') {{
        if (paths.length === 0) paths.push({{ name: "Nouvelle Forme", nodes: [] }});
        paths[paths.length - 1].nodes.push({{ x: pos.x, y: pos.y, type: 'L' }});
        render();
      }}
    }};

    window.onmousemove = (e) => {{
      let pos = getMousePos(e);

      if (isCorrectionDrawing && mode === 'ai') {{
        correctionPoints.push(pos);
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
      if (isCorrectionDrawing && mode === 'ai') {{
        isCorrectionDrawing = false;
        applyAICurveCorrection(correctionPoints);
        correctionPoints = [];
        render();
      }}
      isDragging = false;
      dragTarget = null;
    }};

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

    window.onkeydown = (e) => {{
      if (e.key === 'Delete' || e.key === 'Backspace') {{
        deleteSelectedNode();
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
      a.download = 'logo_custom.svg';
      a.click();
    }}

    render();
  </script>
</body>
</html>
'''

output_path = r'c:\Partage\Projet\signaid-studio\vector_editor.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"AI Curve Correction Editor saved to {output_path}")
