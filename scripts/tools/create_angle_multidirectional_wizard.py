import cv2
import base64

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Curseurs Multidirectionnels & Angles</title>
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
    .btn-straight {{ background: #0284c7; color: white; font-weight: 700; font-size: 0.9rem; padding: 10px; }}
    .btn-straight:hover {{ background: #0369a1; transform: translateY(-1px); }}
    .btn-curve {{ background: #db2777; color: white; font-weight: 700; font-size: 0.9rem; padding: 10px; }}
    .btn-curve:hover {{ background: #be185d; transform: translateY(-1px); }}
    .btn-active {{ background: #38bdf8; color: #0f1117; font-weight: 700; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 380px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 14px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }}
    
    .question-card {{ background: #0f1117; padding: 14px; border-radius: 10px; border: 2px solid #38bdf8; display: flex; flex-direction: column; gap: 10px; }}
    .question-header {{ display: flex; justify-content: space-between; font-weight: 700; color: #38bdf8; font-size: 0.95rem; }}
    .question-prompt {{ font-size: 0.82rem; color: #f8fafc; font-weight: 600; line-height: 1.3; background: #1e293b; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #38bdf8; }}

    .decision-buttons {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}

    .slider-box {{ background: #0c1829; border: 1px solid #38bdf8; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }}
    .preset-angles {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 4px; }}
    .preset-btn {{ background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 4px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 600; text-align: center; }}
    .preset-btn:hover {{ background: #38bdf8; color: #0f1117; }}

    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 100px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    /* SVG Styling */
    .anchor-node {{ fill: #334155; stroke: #94a3b8; stroke-width: 2px; r: 5; cursor: pointer; }}
    .anchor-node.active-a {{ fill: #38bdf8; stroke: #ffffff; stroke-width: 3px; r: 8; }}
    .anchor-node.active-b {{ fill: #f43f5e; stroke: #ffffff; stroke-width: 3px; r: 8; }}
    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 5; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1.5px; stroke-dasharray: 3 3; opacity: 0.8; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
    
    .active-segment-highlight {{ stroke: #38bdf8; stroke-width: 5px; stroke-dasharray: 6 3; animation: dash 1s linear infinite; }}
    @keyframes dash {{
      to {{ stroke-dashoffset: -18; }}
    }}
  </style>
</head>
<body>

  <header>
    <h1>🎛️ Éditeur Vectoriel - Curseurs Multidirectionnels & Angles Précis</h1>
    <div class="toolbar">
      <button class="btn btn-secondary" onclick="prevSegment()">⬅️ Segment Précédent</button>
      <button class="btn btn-secondary" onclick="nextSegment()">Segment Suivant ➡️</button>
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
      <div class="question-card">
        <div class="question-header">
          <span id="segment-step-title">Segment 1 / 18</span>
          <span id="segment-type-badge" style="color: #38bdf8; font-size: 0.8rem;">En cours...</span>
        </div>
        <div class="question-prompt" id="question-text">
          Ligne Droite ou Courbe ?
        </div>

        <div class="decision-buttons">
          <button class="btn btn-straight" onclick="chooseSegmentType('L')">📏 Ligne Droite<br><small>(Touche D ou 1)</small></button>
          <button class="btn btn-curve" onclick="chooseSegmentType('C')">〰️ Courbe Bézier<br><small>(Touche C ou 2)</small></button>
        </div>

        <!-- Straight Line Multidirectional Angle Slider Box -->
        <div id="straight-slider-box" class="slider-box" style="display: none;">
          <label style="color: #38bdf8; font-weight: 700;">📐 Curseur d'Angle : <span id="angle-val">90° (Droit)</span></label>
          <input type="range" id="angle-slider" min="0" max="360" value="90" step="1" oninput="adjustSegmentAngle(this.value)">
          
          <div class="preset-angles">
            <button class="preset-btn" onclick="setPresetAngle(90)">90° (Droit)</button>
            <button class="preset-btn" onclick="setPresetAngle(0)">0° (Horiz)</button>
            <button class="preset-btn" onclick="setPresetAngle(32)">32° (Biseau)</button>
            <button class="preset-btn" onclick="setPresetAngle(148)">148° (Diag)</button>
          </div>

          <label style="color: #cbd5e1; font-size: 0.75rem; margin-top: 4px;">↔️ Déplacement Multidirectionnel X : <span id="offset-x-val">0 px</span></label>
          <input type="range" id="offset-x-slider" min="-30" max="30" value="0" step="1" oninput="adjustSegmentOffsetX(this.value)">

          <label style="color: #cbd5e1; font-size: 0.75rem;">↕️ Déplacement Multidirectionnel Y : <span id="offset-y-val">0 px</span></label>
          <input type="range" id="offset-y-slider" min="-30" max="30" value="0" step="1" oninput="adjustSegmentOffsetY(this.value)">
        </div>

        <!-- Curvature Arch Slider Box -->
        <div id="arch-slider-box" class="slider-box" style="display: none; border-color: #ec4899;">
          <label style="color: #f472b6; font-weight: 700;">🎚️ Curseur d'Arrondi / Galbe : <span id="arch-val">0 px</span></label>
          <input type="range" id="arch-slider" min="-60" max="60" value="0" step="1" oninput="adjustSegmentArch(this.value)">
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
        <div class="section-title">Code SVG Mis à Jour</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    let currentSegmentIndex = 0;
    let isDragging = false;
    let dragTarget = null;

    let allSegments = [
      {{ pIdx: 0, nIdx: 1, label: "Biseau Supérieur Droit", desc: "Arête du haut du pilier droit" }},
      {{ pIdx: 0, nIdx: 2, label: "Bord Intérieur Pilier Droit", desc: "Bord vertical intérieur droit (90° Droit)" }},
      {{ pIdx: 0, nIdx: 3, label: "Entaille Supérieure Transversale", desc: "Jonction entre pilier droit et gauche" }},
      {{ pIdx: 0, nIdx: 4, label: "Bord Intérieur Pilier Gauche", desc: "Bord vertical intérieur gauche (90° Droit)" }},
      {{ pIdx: 0, nIdx: 5, label: "Biseau Supérieur Gauche", desc: "Arête du haut du pilier gauche (32° Biseau)" }},
      {{ pIdx: 0, nIdx: 6, label: "Bord Extérieur Pilier Gauche", desc: "Bord vertical extérieur gauche (90° Droit)" }},
      {{ pIdx: 0, nIdx: 7, label: "Tranchée Supérieure Diagonale", desc: "Tranchée diagonale du logo" }},
      {{ pIdx: 0, nIdx: 0, label: "Bord Extérieur Pilier Droit", desc: "Bord vertical extérieur droit (90° Droit)" }},

      {{ pIdx: 1, nIdx: 0, label: "Lame Principale (Pointe Droit à Gauche)", desc: "Grande arête de la blade" }},
      {{ pIdx: 1, nIdx: 1, label: "Pointe Extrême Gauche", desc: "Pointe acérée bas gauche" }},
      {{ pIdx: 1, nIdx: 2, label: "Bord Extérieur Pilier Bas Gauche", desc: "Bord vertical bas gauche (90° Droit)" }},
      {{ pIdx: 1, nIdx: 3, label: "Biseau Inférieur Gauche", desc: "Bas du pilier gauche (32° Biseau)" }},
      {{ pIdx: 1, nIdx: 4, label: "Bord Intérieur Pilier Bas Gauche", desc: "Coin intérieur gauche" }},
      {{ pIdx: 1, nIdx: 5, label: "Entaille Inférieure Transversale", desc: "Tranchée basse" }},
      {{ pIdx: 1, nIdx: 6, label: "Bord Intérieur Pilier Bas Droit", desc: "Coin intérieur droit" }},
      {{ pIdx: 1, nIdx: 7, label: "Biseau Inférieur Droit", desc: "Bas du pilier droit (32° Biseau)" }},
      {{ pIdx: 1, nIdx: 8, label: "Bord Extérieur Pilier Bas Droit", desc: "Bord vertical bas droit (90° Droit)" }},
      {{ pIdx: 1, nIdx: 9, label: "Extension Pointe Droit", desc: "Jonction vers pointe droite" }}
    ];

    let paths = [
      {{
        name: "Forme Supérieure",
        nodes: [
          {{ x: 449, y: 30, type: 'L', angle: 90 }},
          {{ x: 386, y: 70, type: 'L', angle: 32 }},
          {{ x: 385, y: 194, type: 'L', angle: 90 }},
          {{ x: 209, y: 243, type: 'L', angle: 148 }},
          {{ x: 209, y: 46, type: 'L', angle: 90 }},
          {{ x: 147, y: 86, type: 'L', angle: 32 }},
          {{ x: 146, y: 301, type: 'L', angle: 90 }},
          {{ x: 449, y: 205, type: 'L', angle: 148 }}
        ]
      }},
      {{
        name: "Forme Inférieure",
        nodes: [
          {{ x: 569, y: 201, type: 'C', arch: -28, c1x: 353, c1y: 227, c2x: 153, c2y: 307 }},
          {{ x: 24, y: 396, type: 'L', angle: 148 }},
          {{ x: 145, y: 353, type: 'L', angle: 90 }},
          {{ x: 147, y: 435, type: 'L', angle: 32 }},
          {{ x: 209, y: 397, type: 'L', angle: 90 }},
          {{ x: 210, y: 325, type: 'L', angle: 148 }},
          {{ x: 385, y: 254, type: 'L', angle: 90 }},
          {{ x: 385, y: 421, type: 'L', angle: 32 }},
          {{ x: 449, y: 382, type: 'L', angle: 90 }},
          {{ x: 449, y: 232, type: 'L', angle: 90 }}
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

    // Adjust Straight Line Angle & Direction
    function adjustSegmentAngle(angleDeg) {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];

      node.angle = parseInt(angleDeg);
      document.getElementById('angle-val').innerText = angleDeg + '°' + (angleDeg == 90 ? ' (Droit)' : (angleDeg == 0 ? ' (Horiz)' : ''));

      let len = Math.hypot(node.x - prev.x, node.y - prev.y);
      let rad = angleDeg * Math.PI / 180;

      // Rotate segment vector (prev -> node) precisely to specified angle!
      node.x = Math.round(prev.x + len * Math.cos(rad));
      node.y = Math.round(prev.y + len * Math.sin(rad));
      render();
    }}

    function setPresetAngle(deg) {{
      document.getElementById('angle-slider').value = deg;
      adjustSegmentAngle(deg);
    }}

    function adjustSegmentOffsetX(val) {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      document.getElementById('offset-x-val').innerText = val + ' px';
      node.x += parseInt(val);
      render();
    }}

    function adjustSegmentOffsetY(val) {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      document.getElementById('offset-y-val').innerText = val + ' px';
      node.y += parseInt(val);
      render();
    }}

    // Adjust Curve Arch
    function adjustSegmentArch(archValue) {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];

      node.arch = parseInt(archValue);
      document.getElementById('arch-val').innerText = archValue + ' px';

      let dx = node.x - prev.x;
      let dy = node.y - prev.y;
      let len = Math.hypot(dx, dy);

      if (len > 0) {{
        let nx = -dy / len;
        let ny = dx / len;

        node.c1x = Math.round(prev.x + dx * 0.33 + nx * node.arch);
        node.c1y = Math.round(prev.y + dy * 0.33 + ny * node.arch);
        node.c2x = Math.round(prev.x + dx * 0.66 + nx * node.arch);
        node.c2y = Math.round(prev.y + dy * 0.66 + ny * node.arch);
      }}
      render();
    }}

    function chooseSegmentType(type) {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];

      if (type === 'L') {{
        node.type = 'L';
      }} else if (type === 'C') {{
        node.type = 'C';
        if (!node.arch || node.arch === 0) node.arch = -15;
        adjustSegmentArch(node.arch);
      }}
      render();
    }}

    function updateUI() {{
      let seg = allSegments[currentSegmentIndex];
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];

      document.getElementById('segment-step-title').innerText = `Segment ${{currentSegmentIndex + 1}} / ${{allSegments.length}}`;
      document.getElementById('segment-type-badge').innerText = node.type === 'L' ? '📏 Ligne Droite' : '〰️ Courbe Bézier';
      document.getElementById('question-text').innerHTML = `<b>${{seg.label}}</b><br><small>${{seg.desc}}</small>`;

      let straightBox = document.getElementById('straight-slider-box');
      let archBox = document.getElementById('arch-slider-box');

      if (node.type === 'L') {{
        straightBox.style.display = 'flex';
        archBox.style.display = 'none';
        
        let dx = node.x - prev.x;
        let dy = node.y - prev.y;
        let currentDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        if (currentDeg < 0) currentDeg += 360;

        document.getElementById('angle-slider').value = currentDeg;
        document.getElementById('angle-val').innerText = currentDeg + '°' + (currentDeg == 90 ? ' (Droit)' : (currentDeg == 0 ? ' (Horiz)' : ''));
      }} else {{
        straightBox.style.display = 'none';
        archBox.style.display = 'flex';
        document.getElementById('arch-slider').value = node.arch || -15;
        document.getElementById('arch-val').innerText = (node.arch || -15) + ' px';
      }}
    }}

    function render() {{
      svgCanvas.innerHTML = '';
      let svgCodeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">\\n`;
      svgCodeStr += `  <rect width="581" height="481" fill="#000000"/>\\n  <g fill="#ffffff">\\n`;

      let activeSeg = allSegments[currentSegmentIndex];

      paths.forEach((p, pIdx) => {{
        if (p.nodes.length < 2) return;
        let d = buildDPath(p.nodes);
        svgCodeStr += `    <path d="${{d}}" />\\n`;

        let pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('class', 'draft-path');
        svgCanvas.appendChild(pathEl);

        // Render Nodes & Bezier Handles
        p.nodes.forEach((n, nIdx) => {{
          let isA = (activeSeg.pIdx === pIdx && ((nIdx - 1 + p.nodes.length) % p.nodes.length) === activeSeg.nIdx);
          let isB = (activeSeg.pIdx === pIdx && nIdx === activeSeg.nIdx);

          if (n.type === 'C') {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y, isA, isB);
        }});
      }});

      // Highlight active segment
      let activeP = paths[activeSeg.pIdx];
      let pB = activeP.nodes[activeSeg.nIdx];
      let pA = activeP.nodes[(activeSeg.nIdx - 1 + activeP.nodes.length) % activeP.nodes.length];

      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pA.x); line.setAttribute('y1', pA.y);
      line.setAttribute('x2', pB.x); line.setAttribute('y2', pB.y);
      line.setAttribute('class', 'active-segment-highlight');
      svgCanvas.appendChild(line);

      svgCodeStr += `  </g>\\n</svg>`;
      svgOutput.value = svgCodeStr;
      updateUI();
    }}

    function createHandleLine(x1, y1, x2, y2) {{
      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class', 'handle-line');
      svgCanvas.appendChild(line);
    }}

    function createAnchorNode(pIdx, nIdx, x, y, isA, isB) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      let cls = 'anchor-node';
      if (isA) cls += ' active-a';
      if (isB) cls += ' active-b';
      circle.setAttribute('class', cls);

      circle.onmousedown = (e) => {{
        e.stopPropagation();
        let foundIdx = allSegments.findIndex(s => s.pIdx === pIdx && s.nIdx === nIdx);
        if (foundIdx !== -1) currentSegmentIndex = foundIdx;
        isDragging = true;
        dragTarget = {{ pIdx, nIdx, targetType: 'anchor' }};
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

    window.onmousemove = (e) => {{
      if (isDragging && dragTarget) {{
        let pos = getMousePos(e);
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

    function prevSegment() {{
      if (currentSegmentIndex > 0) currentSegmentIndex--;
      render();
    }}

    function nextSegment() {{
      if (currentSegmentIndex < allSegments.length - 1) currentSegmentIndex++;
      render();
    }}

    window.onkeydown = (e) => {{
      if (e.key === 'd' || e.key === 'D' || e.key === '1') {{
        chooseSegmentType('L');
      }} else if (e.key === 'c' || e.key === 'C' || e.key === '2') {{
        chooseSegmentType('C');
      }} else if (e.key === 'ArrowRight') {{
        nextSegment();
      }} else if (e.key === 'ArrowLeft') {{
        prevSegment();
      }}
    }};

    function copySVGCode() {{
      navigator.clipboard.writeText(svgOutput.value);
      alert('Code SVG copié dans le presse-papier !');
    }}

    function downloadSVG() {{
      let blob = new Blob([svgOutput.value], {{ type: 'image/svg+xml' }});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logo_angles_multidirectionnel.svg';
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

print(f"Angle multidirectional vector editor saved to {output_path}")
