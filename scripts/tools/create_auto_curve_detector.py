import cv2
import base64
import numpy as np

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Détection Automatique des Courbes (60 Points)</title>
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
    .btn-auto {{ background: linear-gradient(135deg, #10b981, #8b5cf6); color: white; font-weight: 700; }}
    .btn-auto:hover {{ filter: brightness(1.1); transform: translateY(-1px); }}
    .btn-active {{ background: #38bdf8; color: #0f1117; font-weight: 700; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 370px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 14px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }}
    
    .tool-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }}

    .slider-card {{ background: #0f1117; padding: 16px; border-radius: 8px; border: 2px solid #38bdf8; display: flex; flex-direction: column; gap: 10px; }}
    .slider-card-header {{ display: flex; justify-content: space-between; font-weight: 700; color: #38bdf8; font-size: 0.9rem; }}

    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 130px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    /* SVG Styling */
    .anchor-node {{ fill: #38bdf8; stroke: #ffffff; stroke-width: 2px; r: 5; cursor: pointer; }}
    .anchor-node.is-curve {{ fill: #ec4899; stroke: #ffffff; stroke-width: 2px; r: 6; }}
    .anchor-node:hover {{ fill: #f43f5e; r: 7; }}
    .anchor-node.selected {{ fill: #f43f5e; stroke: #fbbf24; stroke-width: 3px; r: 8; }}
    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1px; stroke-dasharray: 3 3; opacity: 0.7; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
  </style>
</head>
<body>

  <header>
    <h1>🎯 Éditeur Vectoriel - Détection Automatique des Courbes (60 Points)</h1>
    <div class="toolbar">
      <button class="btn btn-auto" onclick="detectCurvesAuto()">🔍 Détecter les Courbes Automatiquement</button>
      <button class="btn btn-secondary" onclick="setAllToStraight()">📏 Tout Mettre en Lignes Droites (L)</button>
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
      <!-- Point Count Slider Card -->
      <div class="slider-card">
        <div class="slider-card-header">
          <span>🎛️ Densité de Points</span>
          <span id="point-count-display">60 Points</span>
        </div>
        <input type="range" id="point-slider" min="10" max="80" value="60" step="1" oninput="adjustPointBudget(this.value)">
        <small style="color: #cbd5e1; font-size: 0.75rem; line-height: 1.3;">
          Par défaut : <b>100% Lignes Droites (L)</b>. Cliquez sur <i>🔍 Détecter les Courbes</i> pour transformer uniquement les arcs fluides en courbes Bézier (`C`) !
        </small>
      </div>

      <div>
        <div class="section-title">Actions Rapides</div>
        <div class="tool-grid">
          <button class="btn btn-auto" style="grid-column: span 2;" onclick="detectCurvesAuto()">🔍 Détecter les Courbes</button>
          <button class="btn btn-secondary" onclick="convertSelectedSegment('L')">📏 Convertir en Droite (L)</button>
          <button class="btn btn-secondary" onclick="convertSelectedSegment('C')">〰️ Convertir en Courbe (C)</button>
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
        <div class="section-title">Code SVG Mis à Jour</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    let selectedNodeRef = {{ pIdx: 0, nIdx: 0 }};
    let isDragging = false;
    let dragTarget = null;

    // High Density Master Contour Points
    const masterPathUp = [
      {{x:449,y:30}}, {{x:436,y:38}}, {{x:424,y:46}}, {{x:410,y:55}}, {{x:398,y:63}}, {{x:386,y:70}}, 
      {{x:385,y:100}}, {{x:385,y:130}}, {{x:385,y:160}}, {{x:385,y:194}}, {{x:360,y:200}}, {{x:333,y:209}}, 
      {{x:300,y:218}}, {{x:266,y:228}}, {{x:235,y:236}}, {{x:209,y:243}}, {{x:209,y:190}}, {{x:209,y:140}}, 
      {{x:209,y:90}}, {{x:209,y:46}}, {{x:190,y:57}}, {{x:180,y:63}}, {{x:165,y:73}}, {{x:147,y:86}}, 
      {{x:146,y:140}}, {{x:146,y:190}}, {{x:146,y:240}}, {{x:146,y:301}}, {{x:183,y:285}}, {{x:224,y:267}}, 
      {{x:260,y:255}}, {{x:301,y:242}}, {{x:340,y:230}}, {{x:378,y:215}}, {{x:415,y:211}}, {{x:449,y:205}}
    ];

    const masterPathDn = [
      {{x:569,y:201}}, {{x:531,y:204}}, {{x:498,y:209}}, {{x:460,y:217}}, {{x:424,y:225}}, {{x:388,y:234}}, 
      {{x:353,y:227}}, {{x:315,y:252}}, {{x:275,y:270}}, {{x:214,y:295}}, {{x:153,y:307}}, {{x:108,y:342}}, 
      {{x:63,y:368}}, {{x:24,y:396}}, {{x:80,y:373}}, {{x:145,y:353}}, {{x:145,y:390}}, {{x:145,y:430}}, 
      {{x:147,y:435}}, {{x:170,y:421}}, {{x:209,y:397}}, {{x:210,y:325}}, {{x:240,y:310}}, {{x:267,y:300}}, 
      {{x:300,y:285}}, {{x:329,y:272}}, {{x:355,y:262}}, {{x:385,y:254}}, {{x:385,y:340}}, {{x:385,y:421}}, 
      {{x:415,y:403}}, {{x:449,y:382}}, {{x:449,y:310}}, {{x:449,y:232}}
    ];

    let paths = [
      {{ name: "Forme Supérieure", nodes: [] }},
      {{ name: "Forme Inférieure", nodes: [] }}
    ];

    function resamplePoints(masterPts, targetCount) {{
      if (targetCount <= 3) return masterPts.slice(0, 3).map(p => ({{ x: p.x, y: p.y, type: 'L' }}));
      let step = (masterPts.length - 1) / (targetCount - 1);
      let res = [];
      for (let i = 0; i < targetCount; i++) {{
        let idx = Math.min(masterPts.length - 1, Math.round(i * step));
        res.push({{ x: masterPts[idx].x, y: masterPts[idx].y, type: 'L' }}); // DEFAULT TO ALL 'L' (Straight Lines)
      }}
      return res;
    }}

    function adjustPointBudget(totalBudget) {{
      document.getElementById('point-count-display').innerText = totalBudget + " Points";
      let countUp = Math.max(5, Math.floor(totalBudget * 0.45));
      let countDn = Math.max(5, totalBudget - countUp);

      paths[0].nodes = resamplePoints(masterPathUp, countUp);
      paths[1].nodes = resamplePoints(masterPathDn, countDn);

      render();
    }}

    function setAllToStraight() {{
      paths.forEach(p => p.nodes.forEach(n => n.type = 'L'));
      render();
    }}

    // Automatic Curve Detection Algorithm
    function detectCurvesAuto() {{
      paths.forEach(p => {{
        for (let i = 1; i < p.nodes.length - 1; i++) {{
          let prev = p.nodes[i - 1];
          let curr = p.nodes[i];
          let next = p.nodes[i + 1];

          // Compute angle deviation between (prev, curr) and (curr, next)
          let dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
          let dx2 = next.x - curr.x, dy2 = next.y - curr.y;

          let angle1 = Math.atan2(dy1, dx1);
          let angle2 = Math.atan2(dy2, dx2);
          let angleDiff = Math.abs(angle2 - angle1);

          // Curvature deviation from midpoint of (prev, next) to curr
          let midX = (prev.x + next.x) / 2;
          let midY = (prev.y + next.y) / 2;
          let deviation = Math.hypot(curr.x - midX, curr.y - midY);

          // If curvature is smooth and continuous (deviation between 1.5px and 12px) -> CONVERT TO 'C'
          if (deviation > 1.5 && deviation < 12.0 && angleDiff < 0.8) {{
            curr.type = 'C';
            curr.c1x = Math.round(prev.x + dx1 * 0.5);
            curr.c1y = Math.round(prev.y + dy1 * 0.5);
            curr.c2x = Math.round(curr.x - dx2 * 0.3);
            curr.c2y = Math.round(curr.y - dy2 * 0.3);
          }} else {{
            curr.type = 'L'; // KEEP STRAIGHT LINE FOR SHARP CORNERS & FLAT PILLARS
          }}
        }}
      }});
      render();
      alert('✨ Courbes détectées automatiquement ! Les piliers géométriques sont restés 100% en Lignes Droites (L), et la lame a été convertie en Courbes fluides (C).');
    }}

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

        // Nodes & Control Handles
        p.nodes.forEach((n, nIdx) => {{
          let isSel = selectedNodeRef && selectedNodeRef.pIdx === pIdx && selectedNodeRef.nIdx === nIdx;

          if (n.type === 'C') {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y, isSel, n.type === 'C');
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

    function createAnchorNode(pIdx, nIdx, x, y, isSel, isCurve) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);
      let cls = 'anchor-node';
      if (isCurve) cls += ' is-curve';
      if (isSel) cls += ' selected';
      circle.setAttribute('class', cls);

      circle.onmousedown = (e) => {{
        e.stopPropagation();
        selectedNodeRef = {{ pIdx, nIdx }};
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

    function copySVGCode() {{
      navigator.clipboard.writeText(svgOutput.value);
      alert('Code SVG copié dans le presse-papier !');
    }}

    function downloadSVG() {{
      let blob = new Blob([svgOutput.value], {{ type: 'image/svg+xml' }});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logo_60pts_detected.svg';
      a.click();
    }}

    // Default: Initialize at 60 points with 100% straight lines L, then auto-detect curves
    adjustPointBudget(60);
    detectCurvesAuto();
  </script>
</body>
</html>
'''

output_path = r'c:\Partage\Projet\signaid-studio\vector_editor.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Auto-curve detector editor saved to {output_path}")
