import cv2
import base64

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Lignes Droites Parfaites</title>
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
    .btn-success {{ background: #10b981; color: white; font-weight: 700; }}
    .btn-success:hover {{ background: #059669; transform: translateY(-1px); }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #000; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; }}
    
    #bg-img {{ position: absolute; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; transition: opacity 0.1s; }}
    #svg-canvas {{ position: absolute; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 370px; background: #1e293b; border-left: 1px solid #334155; display: flex; flex-direction: column; padding: 16px; gap: 16px; }}
    .section-title {{ font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }}
    
    .step-card {{ background: #0f1117; padding: 16px; border-radius: 8px; border: 2px solid #38bdf8; display: flex; flex-direction: column; gap: 12px; }}
    .step-header {{ display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.95rem; color: #38bdf8; }}
    .step-desc {{ font-size: 0.8rem; color: #cbd5e1; line-height: 1.4; }}

    .type-switcher {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }}
    .type-btn {{ padding: 8px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #cbd5e1; cursor: pointer; font-size: 0.8rem; font-weight: 600; text-align: center; }}
    .type-btn.active {{ background: #38bdf8; color: #0f1117; border-color: #38bdf8; font-weight: 700; }}

    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #0f1117; padding: 12px; border-radius: 8px; border: 1px solid #334155; }}
    label {{ font-size: 0.8rem; color: #cbd5e1; display: flex; justify-content: space-between; }}

    textarea {{ width: 100%; height: 130px; background: #090d16; color: #38bdf8; border: 1px solid #334155; padding: 10px; font-family: monospace; font-size: 0.75rem; border-radius: 6px; resize: none; }}

    /* SVG Styling */
    .anchor-node {{ fill: #334155; stroke: #94a3b8; stroke-width: 2px; r: 5; cursor: pointer; }}
    .anchor-node.validated {{ fill: #10b981; stroke: #ffffff; stroke-width: 2px; r: 6; }}
    .anchor-node.current {{ fill: #f43f5e; stroke: #fbbf24; stroke-width: 3px; r: 9; animation: pulse 1.2s infinite alternate; }}
    
    @keyframes pulse {{
      from {{ r: 7; stroke-width: 2px; }}
      to {{ r: 10; stroke-width: 4px; filter: drop-shadow(0 0 6px #f43f5e); }}
    }}

    .handle-node {{ fill: #fbbf24; stroke: #ffffff; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-line {{ stroke: #fbbf24; stroke-width: 1px; stroke-dasharray: 3 3; opacity: 0.7; }}
    .draft-path {{ fill: rgba(255, 255, 255, 0.85); stroke: #38bdf8; stroke-width: 1.5px; }}
  </style>
</head>
<body>

  <header>
    <h1>📐 Assistant Vectoriel - 100% Lignes Droites Nettes</h1>
    <div class="toolbar">
      <button class="btn btn-secondary" onclick="prevStep()">⬅️ Précédent</button>
      <button class="btn btn-success" onclick="validateCurrentStep()">✅ Valider ce Point (Entrée)</button>
      <button class="btn btn-secondary" onclick="nextStep()">Suivant ➡️</button>
    </div>
  </header>

  <div class="main">
    <div class="canvas-container">
      <img id="bg-img" src="data:image/jpeg;base64,{img_b64}" alt="Template draft">
      <svg id="svg-canvas" viewBox="0 0 581 481"></svg>
    </div>

    <div class="sidebar">
      <div class="step-card">
        <div class="step-header">
          <span id="step-title">Étape 1 / 17</span>
          <span id="step-status" style="font-size: 0.75rem; color: #fbbf24;">En cours...</span>
        </div>
        <div class="step-desc" id="step-desc">
          Par défaut, tous les segments sont configurés en lignes droites nettes (L).
        </div>

        <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 700; margin-top: 4px;">TYPE DU SEGMENT ACTIF :</div>
        <div class="type-switcher">
          <button id="btn-type-L" class="type-btn active" onclick="setSegmentType('L')">📏 Ligne Droite (L)</button>
          <button id="btn-type-C" class="type-btn" onclick="setSegmentType('C')">〰️ Courbe Bézier (C)</button>
        </div>

        <button class="btn btn-success" style="margin-top: 8px;" onclick="validateCurrentStep()">✅ Valider ce Point & Passer au Suivant</button>
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

      <div style="display: flex; gap: 8px;">
        <button class="btn" style="flex: 1;" onclick="copySVGCode()">📋 Copier SVG</button>
        <button class="btn btn-active" style="flex: 1;" onclick="downloadSVG()">💾 Télécharger SVG</button>
      </div>
    </div>
  </div>

  <script>
    let currentStepIndex = 0;
    let isDragging = false;
    let dragTarget = null;

    let allSteps = [
      {{ pIdx: 0, nIdx: 0, label: "Point 1: Biseau Haut-Droit", desc: "Coin supérieur droit (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 1, label: "Point 2: Biseau Haut-Gauche", desc: "Coin supérieur gauche (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 2, label: "Point 3: Entaille Supérieure Gauche", desc: "Bord intérieur gauche (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 3, label: "Point 4: Entaille Supérieure Droite", desc: "Bord intérieur droit (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 4, label: "Point 5: Sommet Pilier Gauche", desc: "Coin haut droit du pilier gauche (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 5, label: "Point 6: Biseau Haut Gauche", desc: "Coin haut gauche du pilier gauche (Ligne droite L)" }},
      {{ pIdx: 0, nIdx: 7, label: "Point 7: Bord Transversal Supérieur", desc: "Limite transversale supérieure (Ligne droite L)" }},
      
      {{ pIdx: 1, nIdx: 0, label: "Point 8: Pointe Extrême Droite Lame", desc: "Pointe acérée de la blade à droite" }},
      {{ pIdx: 1, nIdx: 1, label: "Point 9: Lame Principale (Courbe)", desc: "Courbe élégante de la blade" }},
      {{ pIdx: 1, nIdx: 2, label: "Point 10: Pointe Extrême Gauche Lame", desc: "Pointe acérée de la blade à gauche" }},
      {{ pIdx: 1, nIdx: 3, label: "Point 11: Sommet Pilier Bas Gauche", desc: "Coin haut du pilier bas gauche (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 4, label: "Point 12: Bas Pilier Gauche", desc: "Biseau bas du pilier gauche (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 5, label: "Point 13: Intérieur Pilier Bas Gauche", desc: "Coin intérieur bas gauche (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 6, label: "Point 14: Entaille Inférieure", desc: "Bord transversal inférieur (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 7, label: "Point 15: Intérieur Pilier Bas Droit", desc: "Coin intérieur bas droit (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 8, label: "Point 16: Bas Pilier Droit", desc: "Biseau bas du pilier droit (Ligne droite L)" }},
      {{ pIdx: 1, nIdx: 9, label: "Point 17: Haut Pilier Bas Droit", desc: "Bord extérieur droit (Ligne droite L)" }}
    ];

    let validatedSteps = new Set();

    // All segments set to 'L' (Pure Straight Lines) by default, except 1 blade curve
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

    function setSegmentType(t) {{
      let step = allSteps[currentStepIndex];
      let node = paths[step.pIdx].nodes[step.nIdx];
      node.type = t;
      if (t === 'C' && (!node.c1x || !node.c2x)) {{
        let prev = paths[step.pIdx].nodes[(step.nIdx - 1 + paths[step.pIdx].nodes.length) % paths[step.pIdx].nodes.length];
        node.c1x = Math.round(prev.x + (node.x - prev.x) * 0.33);
        node.c1y = Math.round(prev.y + (node.y - prev.y) * 0.33);
        node.c2x = Math.round(prev.x + (node.x - prev.x) * 0.66);
        node.c2y = Math.round(prev.y + (node.y - prev.y) * 0.66);
      }}
      render();
    }}

    function updateStepUI() {{
      let step = allSteps[currentStepIndex];
      let node = paths[step.pIdx].nodes[step.nIdx];

      document.getElementById('step-title').innerText = `Étape ${{currentStepIndex + 1}} / ${{allSteps.length}}`;
      document.getElementById('step-desc').innerText = step.label + " — " + step.desc;
      
      let isVal = validatedSteps.has(currentStepIndex);
      document.getElementById('step-status').innerText = isVal ? "✅ Validé" : "⏳ En attente...";
      document.getElementById('step-status').style.color = isVal ? "#10b981" : "#fbbf24";

      document.getElementById('btn-type-L').className = node.type === 'L' ? 'type-btn active' : 'type-btn';
      document.getElementById('btn-type-C').className = node.type === 'C' ? 'type-btn active' : 'type-btn';
    }}

    function render() {{
      svgCanvas.innerHTML = '';
      let svgCodeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">\\n`;
      svgCodeStr += `  <rect width="581" height="481" fill="#000000"/>\\n  <g fill="#ffffff">\\n`;

      paths.forEach((p, pIdx) => {{
        let d = buildDPath(p.nodes);
        svgCodeStr += `    <path d="${{d}}" />\\n`;

        let pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('class', 'draft-path');
        svgCanvas.appendChild(pathEl);

        // Render nodes and handles ONLY if curve type 'C'
        p.nodes.forEach((n, nIdx) => {{
          let stepIdx = allSteps.findIndex(s => s.pIdx === pIdx && s.nIdx === nIdx);
          let isCurrent = (stepIdx === currentStepIndex);
          let isValidated = validatedSteps.has(stepIdx);

          if (n.type === 'C' && (isCurrent || isValidated)) {{
            let prev = p.nodes[(nIdx - 1 + p.nodes.length) % p.nodes.length];
            createHandleLine(prev.x, prev.y, n.c1x, n.c1y);
            createHandleLine(n.x, n.y, n.c2x, n.c2y);
            createHandleNode(pIdx, nIdx, 'c1', n.c1x, n.c1y);
            createHandleNode(pIdx, nIdx, 'c2', n.c2x, n.c2y);
          }}

          createAnchorNode(pIdx, nIdx, n.x, n.y, isCurrent, isValidated, stepIdx);
        }});
      }});

      svgCodeStr += `  </g>\\n</svg>`;
      svgOutput.value = svgCodeStr;
      updateStepUI();
    }}

    function createHandleLine(x1, y1, x2, y2) {{
      let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('class', 'handle-line');
      svgCanvas.appendChild(line);
    }}

    function createAnchorNode(pIdx, nIdx, x, y, isCurrent, isValidated, stepIdx) {{
      let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', y);

      let cls = 'anchor-node';
      if (isCurrent) cls += ' current';
      else if (isValidated) cls += ' validated';
      circle.setAttribute('class', cls);

      circle.onmousedown = (e) => {{
        e.stopPropagation();
        currentStepIndex = stepIdx;
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

    function validateCurrentStep() {{
      validatedSteps.add(currentStepIndex);
      if (currentStepIndex < allSteps.length - 1) {{
        currentStepIndex++;
      }} else {{
        alert("🎉 Bravo ! Tout le logo a été tracé avec des lignes droites nettes et des formes parfaites !");
      }}
      render();
    }}

    function prevStep() {{
      if (currentStepIndex > 0) currentStepIndex--;
      render();
    }}

    function nextStep() {{
      if (currentStepIndex < allSteps.length - 1) currentStepIndex++;
      render();
    }}

    window.onkeydown = (e) => {{
      if (e.key === 'Enter') {{
        validateCurrentStep();
      }} else if (e.key === 'd' || e.key === 'D') {{
        setSegmentType('L');
      }} else if (e.key === 'c' || e.key === 'C') {{
        setSegmentType('C');
      }} else if (e.key === 'ArrowRight') {{
        nextStep();
      }} else if (e.key === 'ArrowLeft') {{
        prevStep();
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
      a.download = 'logo_lignes_droites.svg';
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

print(f"Pure straight editor updated at {output_path}")
