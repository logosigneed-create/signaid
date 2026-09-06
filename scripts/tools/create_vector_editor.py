import cv2
import base64
import os

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Traçage Interactif du Logo</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Inter, sans-serif; }}
    body {{ background-color: #0f1117; color: #e2e8f0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }}
    
    header {{ background: #1e293b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }}
    header h1 {{ font-size: 1.1rem; font-weight: 600; color: #38bdf8; display: flex; align-items: center; gap: 8px; }}
    
    .toolbar {{ display: flex; gap: 12px; align-items: center; }}
    .btn {{ background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.85rem; transition: all 0.2s; }}
    .btn:hover {{ background: #1d4ed8; transform: translateY(-1px); }}
    .btn-secondary {{ background: #334155; }}
    .btn-secondary:hover {{ background: #475569; }}
    .btn-danger {{ background: #dc2626; }}
    .btn-danger:hover {{ background: #b91c1c; }}
    .btn-active {{ background: #38bdf8; color: #0f1117; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; cursor: crosshair; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; }}

    .sidebar {{ width: 340px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 16px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }}
    
    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 180px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    .mode-selector {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}
    
    /* SVG Styling */
    .anchor-node {{ fill: #38bdf8; stroke: #ffffff; stroke-width: 2px; r: 5; cursor: move; }}
    .anchor-node.selected {{ fill: #f43f5e; r: 7; }}
    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1px; stroke-dasharray: 3 3; opacity: 0.7; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
  </style>
</head>
<body>

  <header>
    <h1>✏️ Éditeur & Traçeur Vectoriel Interactif</h1>
    <div class="toolbar">
      <button class="btn btn-secondary" onclick="resetPaths()">🔄 Réinitialiser</button>
      <button class="btn" onclick="copySVGCode()">📋 Copier le Code SVG</button>
      <button class="btn btn-active" onclick="downloadSVG()">💾 Télécharger .SVG</button>
    </div>
  </header>

  <div class="main">
    <div class="canvas-container" id="canvas-container">
      <img id="bg-img" src="data:image/jpeg;base64,{img_b64}" alt="Template draft">
      <svg id="svg-canvas" viewBox="0 0 581 481">
        <!-- Dynamic paths and handles will be rendered here -->
      </svg>
    </div>

    <div class="sidebar">
      <div>
        <div class="section-title">Outils de Dessin</div>
        <div class="mode-selector">
          <button id="btn-mode-select" class="btn btn-active" onclick="setMode('select')">🖐️ Déplacer Points</button>
          <button id="btn-mode-add" class="btn btn-secondary" onclick="setMode('add')">✏️ Ajouter Points</button>
        </div>
      </div>

      <div>
        <div class="section-title">Calque de Fond (Modèle)</div>
        <div class="control-group">
          <label>Opacité du modèle: <span id="opacity-val">50%</span></label>
          <input type="range" min="0" max="100" value="50" oninput="updateOpacity(this.value)">
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column;">
        <div class="section-title">Code SVG Généré en Temps Réel</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    // Geometry Data Model (Paths & Nodes)
    let mode = 'select'; // 'select' | 'add'
    let currentPathIndex = 0;
    let selectedNode = null;
    let isDragging = false;

    // Default 2 Paths with Bezier Control Handles
    let paths = [
      {{
        name: "Forme Supérieure",
        fill: "#ffffff",
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
        name: "Forme Inférieure + Lame",
        fill: "#ffffff",
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

    function updateOpacity(val) {{
      bgImg.style.opacity = val / 100;
      document.getElementById('opacity-val').innerText = val + '%';
    }}

    function setMode(m) {{
      mode = m;
      document.getElementById('btn-mode-select').className = m === 'select' ? 'btn btn-active' : 'btn btn-secondary';
      document.getElementById('btn-mode-add').className = m === 'add' ? 'btn btn-active' : 'btn btn-secondary';
    }}

    function buildDPath(nodes) {{
      if (nodes.length === 0) return '';
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
        let d = buildDPath(p.nodes);
        svgCodeStr += `    <path d="${{d}}" />\\n`;

        // Draw Path on Canvas
        let pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('class', 'draft-path');
        svgCanvas.appendChild(pathEl);

        // Draw Control Handles & Anchor Nodes
        p.nodes.forEach((n, nIdx) => {{
          if (n.type === 'C') {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            // Handle lines
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            // Handle dots
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y);
        }});
      }});

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
      circle.setAttribute('class', 'anchor-node');
      circle.onmousedown = (e) => startDrag(e, pIdx, nIdx, 'anchor');
      svgCanvas.appendChild(circle);
    }}

    function createHandleNode(pIdx, nIdx, handleType, x, y) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      circle.setAttribute('class', 'handle-node');
      circle.onmousedown = (e) => startDrag(e, pIdx, nIdx, handleType);
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

    function startDrag(e, pIdx, nIdx, targetType) {{
      e.stopPropagation();
      if (mode !== 'select') return;
      isDragging = true;
      selectedNode = {{ pIdx, nIdx, targetType }};
    }}

    window.onmousemove = (e) => {{
      if (!isDragging || !selectedNode) return;
      let pos = getMousePos(e);
      let node = paths[selectedNode.pIdx].nodes[selectedNode.nIdx];
      
      if (selectedNode.targetType === 'anchor') {{
        let dx = pos.x - node.x;
        let dy = pos.y - node.y;
        node.x = pos.x; node.y = pos.y;
        if (node.type === 'C') {{
          node.c2x += dx; node.c2y += dy;
        }}
      }} else if (selectedNode.targetType === 'c1') {{
        node.c1x = pos.x; node.c1y = pos.y;
      }} else if (selectedNode.targetType === 'c2') {{
        node.c2x = pos.x; node.c2y = pos.y;
      }}
      render();
    }};

    window.onmouseup = () => {{ isDragging = false; selectedNode = null; }};

    svgCanvas.onclick = (e) => {{
      if (mode === 'add') {{
        let pos = getMousePos(e);
        paths[currentPathIndex].nodes.push({{ x: pos.x, y: pos.y, type: 'L' }});
        render();
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

print(f"Interactive Vector Editor created at {output_path}")
