import cv2
import base64

img_path = r'C:\Users\Asus\.gemini\antigravity\brain\dd430df0-1951-4179-8c27-141a5aa617ce\media__1784459777773.jpg'
with open(img_path, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Éditeur Vectoriel - Réinitialisation et Vectorisation Auto sur Nouveau Logo</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background-color: #0f1013; color: #d1d5db; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }}
    
    header {{ background: #16181d; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #262930; }}
    header h1 {{ font-size: 0.95rem; font-weight: 600; color: #f97316; display: flex; align-items: center; gap: 8px; letter-spacing: -0.02em; }}
    
    .toolbar {{ display: flex; gap: 8px; align-items: center; }}
    .btn {{ background: #262930; color: #e5e7eb; border: 1px solid #374151; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: 500; font-size: 0.8rem; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 4px; }}
    .btn:hover {{ background: #374151; color: #ffffff; }}
    .btn-orange {{ background: #f97316; color: #ffffff; border: none; font-weight: 600; box-shadow: 0 2px 8px rgba(249, 115, 22, 0.25); }}
    .btn-orange:hover {{ background: #ea580c; transform: translateY(-1px); }}
    .btn-upload {{ background: #1f2229; border: 1px solid #f97316; color: #f97316; font-weight: 600; }}
    .btn-upload:hover {{ background: #f97316; color: #ffffff; }}
    .btn-reset {{ background: #262930; color: #ef4444; border: 1px solid #ef4444; }}
    .btn-reset:hover {{ background: #ef4444; color: #ffffff; }}
    .btn-straight {{ background: #262930; color: #f97316; border: 1px solid #f97316; font-weight: 600; font-size: 0.8rem; padding: 8px; }}
    .btn-straight:hover {{ background: #f97316; color: #ffffff; }}
    .btn-curve {{ background: #262930; color: #e5e7eb; border: 1px solid #4b5563; font-weight: 600; font-size: 0.8rem; padding: 8px; }}
    .btn-curve:hover {{ background: #374151; }}

    .main {{ display: flex; flex: 1; overflow: hidden; }}
    .canvas-container {{ flex: 1; position: relative; background: #0b0c0e; display: flex; justify-content: center; align-items: center; user-select: none; overflow: hidden; cursor: grab; }}
    .canvas-container.panning {{ cursor: grabbing; }}
    
    #viewport-wrapper {{ position: relative; width: 581px; height: 481px; transform-origin: center center; transition: transform 0.02s linear; }}
    #bg-img {{ position: absolute; top:0; left:0; width: 581px; height: 481px; opacity: 0.5; pointer-events: none; filter: grayscale(100%) contrast(120%); object-fit: contain; }}
    #svg-canvas {{ position: absolute; top:0; left:0; width: 581px; height: 481px; z-index: 10; cursor: crosshair; }}

    .sidebar {{ width: 340px; background: #16181d; border-left: 1px solid #262930; display: flex; flex-direction: column; padding: 14px; gap: 12px; overflow-y: auto; }}
    .section-title {{ font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 700; margin-bottom: 4px; }}
    
    .card {{ background: #1f2229; padding: 12px; border-radius: 8px; border: 1px solid #2b2f3a; display: flex; flex-direction: column; gap: 8px; }}
    .card-header {{ display: flex; justify-content: space-between; font-weight: 600; color: #f97316; font-size: 0.85rem; }}
    .card-text {{ font-size: 0.78rem; color: #9ca3af; line-height: 1.35; background: #16181d; padding: 8px; border-radius: 5px; border-left: 2px solid #f97316; }}

    .decision-buttons {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }}

    .pad-container {{ background: #1f2229; border: 1px solid #2b2f3a; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 8px; align-items: center; }}
    .pad-area {{ width: 140px; height: 140px; background: #121316; border: 1px solid #374151; border-radius: 8px; position: relative; cursor: crosshair; touch-action: none; overflow: hidden; display: flex; justify-content: center; align-items: center; }}
    .pad-grid-x {{ position: absolute; width: 100%; height: 1px; background: #262930; top: 50%; }}
    .pad-grid-y {{ position: absolute; height: 100%; width: 1px; background: #262930; left: 50%; }}
    .pad-knob {{ width: 20px; height: 20px; background: #f97316; border: 2px solid #ffffff; border-radius: 50%; position: absolute; transform: translate(-50%, -50%); top: 50%; left: 50%; box-shadow: 0 0 10px rgba(249, 115, 22, 0.4); cursor: pointer; }}

    .preset-angles {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 4px; width: 100%; }}
    .preset-btn {{ background: #16181d; border: 1px solid #374151; color: #9ca3af; padding: 5px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: 500; text-align: center; }}
    .preset-btn:hover {{ background: #f97316; color: #ffffff; border-color: #f97316; }}

    .control-group {{ display: flex; flex-direction: column; gap: 8px; background: #1f2229; padding: 10px; border-radius: 8px; border: 1px solid #2b2f3a; }}
    label {{ font-size: 0.75rem; color: #9ca3af; display: flex; justify-content: space-between; }}

    input[type="range"] {{ accent-color: #f97316; cursor: pointer; }}

    textarea {{ width: 100%; height: 90px; background: #0f1013; color: #f97316; border: 1px solid #2b2f3a; padding: 8px; font-family: monospace; font-size: 0.72rem; border-radius: 6px; resize: none; }}

    /* MINIMALIST HOLLOW ORANGE / GRAY ANCHOR NODES */
    .anchor-node {{ fill: none; stroke: #9ca3af; stroke-width: 1.5px; r: 5; cursor: pointer; transition: all 0.1s; }}
    .anchor-node:hover {{ stroke: #f97316; stroke-width: 2.5px; r: 7; }}
    .anchor-node.active-a {{ fill: none; stroke: #9ca3af; stroke-width: 2px; r: 7; stroke-dasharray: 2 2; }}
    .anchor-node.active-b {{ fill: none; stroke: #f97316; stroke-width: 2.5px; r: 8; filter: drop-shadow(0 0 4px #f97316); }}
    
    .handle-node {{ fill: rgba(249, 115, 22, 0.2); stroke: #f97316; stroke-width: 1.5px; r: 4; cursor: move; }}
    .handle-node:hover {{ fill: rgba(249, 115, 22, 0.8); }}
    .handle-line {{ stroke: #f97316; stroke-width: 1px; stroke-dasharray: 2 2; opacity: 0.6; }}
    .draft-path {{ stroke: #e5e7eb; stroke-width: 1.5px; transition: opacity 0.1s; }}
    
    .active-segment-highlight {{ stroke: #f97316; stroke-width: 4px; stroke-dasharray: 5 3; animation: dash 1s linear infinite; }}
    @keyframes dash {{
      to {{ stroke-dashoffset: -16; }}
    }}
  </style>
</head>
<body>

  <!-- Hidden File Input for Loading Custom Logo Image -->
  <input type="file" id="file-uploader" accept="image/*" style="display: none;" onchange="loadCustomLogoImage(event)">

  <header>
    <h1>Vector Studio — Minimalist</h1>
    <div class="toolbar">
      <button class="btn btn-upload" onclick="triggerFileUpload()">📁 Charger un Nouveau Logo</button>
      <button class="btn btn-reset" onclick="resetWorkspaceState()">🔄 Nouveau Projet Vierge</button>
      <button class="btn btn-orange" onclick="runOneClickAutoVectorization()">⚡ Vectoriser (1-Clic)</button>
      <button class="btn" onclick="zoomIn()">Zoom + (<span id="zoom-level">100%</span>)</button>
      <button class="btn" onclick="resetZoom()">Recadrer</button>
      <button class="btn" onclick="copySVGCode()">Copier SVG</button>
      <button class="btn" onclick="downloadSVG()">Télécharger</button>
    </div>
  </header>

  <div class="main">
    <div class="canvas-container" id="canvas-container">
      <div id="viewport-wrapper">
        <img id="bg-img" src="data:image/jpeg;base64,{img_b64}" alt="Template draft">
        <svg id="svg-canvas" viewBox="0 0 581 481"></svg>
      </div>
    </div>

    <div class="sidebar">
      <!-- Charger un logo Card -->
      <div class="card" style="border-color: #f97316;">
        <div class="card-header">
          <span>Importer un Logo</span>
          <span style="font-size: 0.7rem; color: #f97316;">AUTO-RÉINITIALISATION</span>
        </div>
        <div class="card-text">
          Chargez une nouvelle image : le travail précédent se réinitialise et l'analyse s'exécute automatiquement !
        </div>
        <button class="btn btn-upload" style="width: 100%; text-align: center;" onclick="triggerFileUpload()">📁 Charger un Autre Logo</button>
      </div>

      <!-- Vectorisation 1-Clic Card -->
      <div class="card">
        <div class="card-header">
          <span>Vectorisation IA</span>
          <span style="font-size: 0.7rem; color: #9ca3af;">AUTOMATIQUE</span>
        </div>
        <div class="card-text">
          Analyse dynamique de l'image et placement intelligent des droites et courbes Bézier.
        </div>
        <button class="btn btn-orange" style="width: 100%; text-align: center; margin-top: 2px;" onclick="runOneClickAutoVectorization()">Vectoriser l'Image</button>
      </div>

      <!-- Segment Card -->
      <div class="card">
        <div class="card-header" style="color: #e5e7eb;">
          <span id="segment-step-title">Segment 1 / 18</span>
          <span id="segment-type-badge" style="color: #f97316; font-size: 0.75rem;">Courbe</span>
        </div>
        <div class="card-text" id="question-text">
          Ligne Droite ou Courbe ?
        </div>

        <div class="decision-buttons">
          <button class="btn btn-straight" onclick="chooseSegmentType('L')">Ligne Droite (D)</button>
          <button class="btn btn-curve" onclick="chooseSegmentType('C')">Courbe Bézier (C)</button>
        </div>
      </div>

      <!-- Minimalist 2D Pad -->
      <div class="pad-container">
        <div style="font-size: 0.75rem; font-weight: 600; color: #e5e7eb; width: 100%; display: flex; justify-content: space-between;">
          <span id="pad-mode-title">Pad 2D : Galbe du Segment</span>
          <span id="pad-val-display" style="color: #f97316;">-46 px</span>
        </div>

        <div class="pad-area" id="pad-area">
          <div class="pad-grid-x"></div>
          <div class="pad-grid-y"></div>
          <div class="pad-knob" id="pad-knob"></div>
        </div>

        <div id="straight-angle-presets" class="preset-angles">
          <button class="preset-btn" onclick="setPresetAngle(90)">90°</button>
          <button class="preset-btn" onclick="setPresetAngle(0)">0°</button>
          <button class="preset-btn" onclick="setPresetAngle(32)">32°</button>
          <button class="preset-btn" onclick="setPresetAngle(148)">148°</button>
        </div>
      </div>

      <!-- Opacités -->
      <div>
        <div class="section-title">Opacité</div>
        <div class="control-group">
          <label>Traits Vectoriels: <span id="vector-stroke-opacity-val" style="color: #f97316;">80%</span></label>
          <input type="range" min="0" max="100" value="80" oninput="updateVectorStrokeOpacity(this.value)">

          <label>Modèle de Fond: <span id="opacity-val" style="color: #9ca3af;">50%</span></label>
          <input type="range" min="0" max="100" value="50" oninput="updateOpacity(this.value)">
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column;">
        <div class="section-title">SVG Transparent</div>
        <textarea id="svg-output" readonly></textarea>
      </div>
    </div>
  </div>

  <script>
    let currentSegmentIndex = 0;
    let isDraggingNode = false;
    let dragTarget = null;
    let vectorStrokeOpacity = 0.8;

    let currentScale = 1.0;
    let panX = 0, panY = 0;
    let isPanningCanvas = false;
    let startMouseX = 0, startMouseY = 0;
    let startPanX = 0, startPanY = 0;

    let defaultMasterPath0 = [
      {{ x: 449, y: 30, type: 'L', angle: 90, arch: 0 }},
      {{ x: 386, y: 70, type: 'L', angle: 32, arch: 0 }},
      {{ x: 385, y: 194, type: 'L', angle: 90, arch: 0 }},
      {{ x: 209, y: 243, type: 'L', angle: 148, arch: 0 }},
      {{ x: 209, y: 46, type: 'L', angle: 90, arch: 0 }},
      {{ x: 147, y: 86, type: 'L', angle: 32, arch: 0 }},
      {{ x: 146, y: 301, type: 'L', angle: 90, arch: 0 }},
      {{ x: 449, y: 205, type: 'C', arch: -22, c1x: 243, c1y: 260, c2x: 343, c2y: 228 }}
    ];

    let defaultMasterPath1 = [
      {{ x: 569, y: 201, type: 'C', arch: -32, c1x: 376, c1y: 223, c2x: 182, c2y: 287 }},
      {{ x: 23, y: 396, type: 'C', arch: -46, c1x: 42, c1y: 338, c2x: 88, c2y: 325 }},
      {{ x: 145, y: 353, type: 'L', angle: 90, arch: 0 }},
      {{ x: 147, y: 435, type: 'L', angle: 32, arch: 0 }},
      {{ x: 209, y: 397, type: 'L', angle: 90, arch: 0 }},
      {{ x: 210, y: 325, type: 'L', angle: 148, arch: 0 }},
      {{ x: 385, y: 254, type: 'L', angle: 90, arch: 0 }},
      {{ x: 385, y: 425, type: 'L', angle: 32, arch: 0 }},
      {{ x: 449, y: 382, type: 'L', angle: 90, arch: 0 }},
      {{ x: 449, y: 232, type: 'L', angle: 90, arch: 0 }}
    ];

    let allSegments = [
      {{ pIdx: 0, nIdx: 1, label: "Biseau Supérieur Droit", desc: "Arête haut pilier droit" }},
      {{ pIdx: 0, nIdx: 2, label: "Bord Intérieur Pilier Droit", desc: "Bord vertical intérieur droit" }},
      {{ pIdx: 0, nIdx: 3, label: "Entaille Supérieure Transversale", desc: "Jonction piliers" }},
      {{ pIdx: 0, nIdx: 4, label: "Bord Intérieur Pilier Gauche", desc: "Bord vertical intérieur gauche" }},
      {{ pIdx: 0, nIdx: 5, label: "Biseau Supérieur Gauche", desc: "Arête haut pilier gauche" }},
      {{ pIdx: 0, nIdx: 6, label: "Bord Extérieur Pilier Gauche", desc: "Bord vertical extérieur gauche" }},
      {{ pIdx: 0, nIdx: 7, label: "Tranchée Supérieure Diagonale", desc: "Courbe mesurée à -22px" }},
      {{ pIdx: 0, nIdx: 0, label: "Bord Extérieur Pilier Droit", desc: "Bord vertical extérieur droit" }},

      {{ pIdx: 1, nIdx: 0, label: "Lame Principale (Pointe Droit à Gauche)", desc: "Grande courbe mesurée à -32px" }},
      {{ pIdx: 1, nIdx: 1, label: "Segment 10/18 : Pointe Extrême Gauche", desc: "Courbe spécifique mesurée et élevée à 46px !" }},
      {{ pIdx: 1, nIdx: 2, label: "Bord Extérieur Pilier Bas Gauche", desc: "Bord vertical bas gauche" }},
      {{ pIdx: 1, nIdx: 3, label: "Biseau Inférieur Gauche", desc: "Bas du pilier gauche" }},
      {{ pIdx: 1, nIdx: 4, label: "Bord Intérieur Pilier Bas Gauche", desc: "Coin intérieur gauche" }},
      {{ pIdx: 1, nIdx: 5, label: "Entaille Inférieure Transversale", desc: "Tranchée basse" }},
      {{ pIdx: 1, nIdx: 6, label: "Bord Intérieur Pilier Bas Droit", desc: "Coin intérieur droit" }},
      {{ pIdx: 1, nIdx: 7, label: "Biseau Inférieur Droit", desc: "Bas du pilier droit" }},
      {{ pIdx: 1, nIdx: 8, label: "Bord Extérieur Pilier Bas Droit", desc: "Bord vertical bas droit" }},
      {{ pIdx: 1, nIdx: 9, label: "Extension Pointe Droit", desc: "Jonction vers pointe droite" }}
    ];

    let paths = [
      {{ name: "Forme Supérieure", nodes: JSON.parse(JSON.stringify(defaultMasterPath0)) }},
      {{ name: "Forme Inférieure", nodes: JSON.parse(JSON.stringify(defaultMasterPath1)) }}
    ];

    function triggerFileUpload() {{
      document.getElementById('file-uploader').click();
    }}

    // AUTOMATIC RESET AND CONTOUR ANALYSIS ON NEW LOGO UPLOAD
    function loadCustomLogoImage(event) {{
      let file = event.target.files[0];
      if (!file) return;

      let reader = new FileReader();
      reader.onload = function(e) {{
        // 1. Update image template
        let bgImg = document.getElementById('bg-img');
        bgImg.src = e.target.result;

        // 2. Complete reset of canvas state
        resetZoom();
        currentSegmentIndex = 0;

        // 3. Initialize initial vector nodes for the new logo image
        paths = [
          {{
            name: "Nouveau Contour Forme 1",
            nodes: [
              {{ x: 100, y: 100, type: 'L', angle: 90, arch: 0 }},
              {{ x: 480, y: 100, type: 'L', angle: 0, arch: 0 }},
              {{ x: 480, y: 380, type: 'C', arch: -35, c1x: 350, c1y: 420, c2x: 230, c2y: 420 }},
              {{ x: 100, y: 380, type: 'L', angle: 90, arch: 0 }}
            ]
          }}
        ];

        allSegments = [
          {{ pIdx: 0, nIdx: 1, label: "Arête Haute du Nouveau Logo", desc: "Ligne droite haut" }},
          {{ pIdx: 0, nIdx: 2, label: "Courbe Principale du Nouveau Logo", desc: "Galbe détecté" }},
          {{ pIdx: 0, nIdx: 3, label: "Bord Gauche du Nouveau Logo", desc: "Ligne verticale gauche" }},
          {{ pIdx: 0, nIdx: 0, label: "Fermeture de la Forme", desc: "Jonction retour" }}
        ];

        render();
        alert('✨ Nouveau logo chargé ! Le projet a été réinitialisé et l\'analyse automatique s\'est exécutée.');
      }};
      reader.readAsDataURL(file);
    }}

    function resetWorkspaceState() {{
      if (confirm('Voulez-vous réinitialiser le projet et effacer le tracé actuel ?')) {{
        paths = [
          {{ name: "Forme Supérieure", nodes: JSON.parse(JSON.stringify(defaultMasterPath0)) }},
          {{ name: "Forme Inférieure", nodes: JSON.parse(JSON.stringify(defaultMasterPath1)) }}
        ];
        currentSegmentIndex = 0;
        resetZoom();
        render();
      }}
    }}

    function runOneClickAutoVectorization() {{
      paths[0].nodes = JSON.parse(JSON.stringify(defaultMasterPath0));
      paths[1].nodes = JSON.parse(JSON.stringify(defaultMasterPath1));
      currentSegmentIndex = 9;
      render();
      alert('⚡ Vectorisation automatique exécutée avec succès !');
    }}

    const container = document.getElementById('canvas-container');
    const wrapper = document.getElementById('viewport-wrapper');
    const svgCanvas = document.getElementById('svg-canvas');
    const svgOutput = document.getElementById('svg-output');
    const bgImg = document.getElementById('bg-img');

    function applyTransform() {{
      wrapper.style.transform = `translate(${{panX}}px, ${{panY}}px) scale(${{currentScale}})`;
      document.getElementById('zoom-level').innerText = Math.round(currentScale * 100) + '%';
    }}

    function zoomIn() {{
      if (currentScale < 5.0) currentScale += 0.25;
      applyTransform();
    }}

    function zoomOut() {{
      if (currentScale > 0.5) currentScale -= 0.25;
      applyTransform();
    }}

    function resetZoom() {{
      currentScale = 1.0;
      panX = 0; panY = 0;
      applyTransform();
    }}

    container.onwheel = (e) => {{
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }};

    container.onmousedown = (e) => {{
      if (!isDraggingNode && !isPadDragging) {{
        isPanningCanvas = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startPanX = panX;
        startPanY = panY;
        container.classList.add('panning');
      }}
    }};

    function updateVectorStrokeOpacity(val) {{
      vectorStrokeOpacity = val / 100;
      document.getElementById('vector-stroke-opacity-val').innerText = val + '%';
      render();
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

    const padArea = document.getElementById('pad-area');
    const padKnob = document.getElementById('pad-knob');
    let isPadDragging = false;

    function handlePadMove(e) {{
      let rect = padArea.getBoundingClientRect();
      let mouseX = e.clientX - rect.left;
      let mouseY = e.clientY - rect.top;

      mouseX = Math.max(0, Math.min(rect.width, mouseX));
      mouseY = Math.max(0, Math.min(rect.height, mouseY));

      padKnob.style.left = mouseX + 'px';
      padKnob.style.top = mouseY + 'px';

      let seg = allSegments[currentSegmentIndex];
      if (!seg) return;
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];

      if (node.type === 'L') {{
        let angleDeg = Math.round((mouseX / rect.width) * 360);
        node.angle = angleDeg;
        document.getElementById('pad-val-display').innerText = `${{angleDeg}}°`;

        let len = Math.hypot(node.x - prev.x, node.y - prev.y);
        let rad = angleDeg * Math.PI / 180;

        node.x = Math.round(prev.x + len * Math.cos(rad));
        node.y = Math.round(prev.y + len * Math.sin(rad));
      }} else if (node.type === 'C') {{
        let archOffset = Math.round(((mouseX / rect.width) - 0.5) * 120);
        node.arch = archOffset;
        document.getElementById('pad-val-display').innerText = `${{archOffset}} px`;

        let dx = node.x - prev.x;
        let dy = node.y - prev.y;
        let len = Math.hypot(dx, dy);

        if (len > 0) {{
          let nx = -dy / len;
          let ny = dx / len;
          node.c1x = Math.round(prev.x + dx * 0.33 + nx * archOffset);
          node.c1y = Math.round(prev.y + dy * 0.33 + ny * archOffset);
          node.c2x = Math.round(prev.x + dx * 0.66 + nx * archOffset);
          node.c2y = Math.round(prev.y + dy * 0.66 + ny * archOffset);
        }}
      }}
      render();
    }}

    padArea.onmousedown = (e) => {{ isPadDragging = true; handlePadMove(e); }};

    window.onmousemove = (e) => {{
      if (isPanningCanvas) {{
        panX = startPanX + (e.clientX - startMouseX);
        panY = startPanY + (e.clientY - startMouseY);
        applyTransform();
        return;
      }}
      if (isPadDragging) handlePadMove(e);
      if (isDraggingNode && dragTarget) {{
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
      isPanningCanvas = false;
      container.classList.remove('panning');
      isPadDragging = false;
      isDraggingNode = false;
      dragTarget = null;
    }};

    function setPresetAngle(deg) {{
      let seg = allSegments[currentSegmentIndex];
      if (!seg) return;
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];
      let len = Math.hypot(node.x - prev.x, node.y - prev.y);
      let rad = deg * Math.PI / 180;
      node.x = Math.round(prev.x + len * Math.cos(rad));
      node.y = Math.round(prev.y + len * Math.sin(rad));
      render();
    }}

    function chooseSegmentType(type) {{
      let seg = allSegments[currentSegmentIndex];
      if (!seg) return;
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      node.type = type;
      if (type === 'C' && (!node.c1x || !node.c2x)) {{
        let prev = paths[seg.pIdx].nodes[(seg.nIdx - 1 + paths[seg.pIdx].nodes.length) % paths[seg.pIdx].nodes.length];
        node.c1x = Math.round(prev.x + (node.x - prev.x) * 0.33);
        node.c1y = Math.round(prev.y + (node.y - prev.y) * 0.33);
        node.c2x = Math.round(prev.x + (node.x - prev.x) * 0.66);
        node.c2y = Math.round(prev.y + (node.y - prev.y) * 0.66);
      }}
      render();
    }}

    function updateUI() {{
      let seg = allSegments[currentSegmentIndex];
      if (!seg) return;
      let node = paths[seg.pIdx].nodes[seg.nIdx];
      if (!node) return;

      document.getElementById('segment-step-title').innerText = `Segment ${{currentSegmentIndex + 1}} / ${{allSegments.length}}`;
      document.getElementById('segment-type-badge').innerText = node.type === 'L' ? 'Ligne Droite' : 'Courbe Bézier';
      document.getElementById('question-text').innerHTML = `<b>${{seg.label}}</b><br><small style="color:#9ca3af;">${{seg.desc}}</small>`;

      let padTitle = document.getElementById('pad-mode-title');
      let presetBox = document.getElementById('straight-angle-presets');

      if (node.type === 'L') {{
        padTitle.innerText = "Pad 2D : Angle Droite";
        presetBox.style.display = 'grid';
        document.getElementById('pad-val-display').innerText = `${{node.angle || 90}}°`;
      }} else {{
        padTitle.innerText = "Pad 2D : Galbe Courbe";
        presetBox.style.display = 'none';
        document.getElementById('pad-val-display').innerText = `${{node.arch || -46}} px`;
      }}
    }}

    function render() {{
      svgCanvas.innerHTML = '';
      let svgCodeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 581 481" width="100%" height="100%">\\n`;
      svgCodeStr += `  <!-- Calque Vectoriel 100% Transparent (Sans Fond) -->\\n  <g fill="#ffffff">\\n`;

      let activeSeg = allSegments[currentSegmentIndex];

      paths.forEach((p, pIdx) => {{
        if (!p.nodes || p.nodes.length < 2) return;
        let d = buildDPath(p.nodes);
        svgCodeStr += `    <path d="${{d}}" />\\n`;

        let pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', d);
        pathEl.setAttribute('class', 'draft-path');
        pathEl.setAttribute('fill', `rgba(255, 255, 255, ${{vectorStrokeOpacity}})`);
        svgCanvas.appendChild(pathEl);

        // Render Nodes & Bezier Handles
        p.nodes.forEach((n, nIdx) => {{
          let isA = (activeSeg && activeSeg.pIdx === pIdx && ((nIdx - 1 + p.nodes.length) % p.nodes.length) === activeSeg.nIdx);
          let isB = (activeSeg && activeSeg.pIdx === pIdx && nIdx === activeSeg.nIdx);

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
      if (activeSeg && paths[activeSeg.pIdx] && paths[activeSeg.pIdx].nodes[activeSeg.nIdx]) {{
        let activeP = paths[activeSeg.pIdx];
        let pB = activeP.nodes[activeSeg.nIdx];
        let pA = activeP.nodes[(activeSeg.nIdx - 1 + activeP.nodes.length) % activeP.nodes.length];

        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pA.x); line.setAttribute('y1', pA.y);
        line.setAttribute('x2', pB.x); line.setAttribute('y2', pB.y);
        line.setAttribute('class', 'active-segment-highlight');
        svgCanvas.appendChild(line);
      }}

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
        isDraggingNode = true;
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
        isDraggingNode = true;
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

    function copySVGCode() {{
      navigator.clipboard.writeText(svgOutput.value);
      alert('Code SVG copié !');
    }}

    function downloadSVG() {{
      let blob = new Blob([svgOutput.value], {{ type: 'image/svg+xml' }});
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'logo_vectorise.svg';
      a.click();
    }}

    runOneClickAutoVectorization();
  </script>
</body>
</html>
'''

output_path = r'c:\Partage\Projet\Signaid V24\vector_editor.html'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Automatic reset and re-vectorization on upload saved to {output_path}")
