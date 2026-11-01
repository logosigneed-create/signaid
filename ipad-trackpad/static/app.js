/**
 * WinPad - iPad Trackpad & Tablette Graphique Haute Precision
 * Gestion PointerEvents, Apple Pencil (pression/inclinaison), Gestes Multi-Touch et WebSocket
 */

(function () {
  'use strict';

  // --- Configuration & Parametres par defaut ---
  const settings = {
    sensitivity: 1.2,
    accel: true,
    naturalScroll: true,
    scrollSpeed: 1.0,
    keepAspect: true,
    minPressureThreshold: 0.02,
    tapToClick: true,
    twoFingerRightClick: true,
    doubleTapDrag: true,
    threeFingerGestures: true
  };

  // Chargement des parametres sauvegardes dans le navigateur
  try {
    const saved = localStorage.getItem('winpad_settings');
    if (saved) Object.assign(settings, JSON.parse(saved));
  } catch (e) {}

  function saveSettings() {
    try {
      localStorage.setItem('winpad_settings', JSON.stringify(settings));
    } catch (e) {}
  }

  // --- Etat Global ---
  let currentMode = 'trackpad'; // 'trackpad' ou 'tablet'
  let ws = null;
  let isConnected = false;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let pingInterval = null;
  let lastPingTime = 0;

  let serverScreen = { width: 1920, height: 1080 };
  let isDragLocked = false;
  let isDoubleTapDragging = false;
  let lastTapTime = 0;
  let lastTapPos = { x: 0, y: 0 };
  let isPenActive = false;
  let penLastDown = false;
  let penResetTimer = null;

  // Multi-touch tracking map
  const activePointers = new Map();
  const touchFeedbackMap = new Map();

  // --- Elements DOM ---
  const statusBadge = document.getElementById('connection-status');
  const statusText = document.getElementById('status-text');
  const pingText = document.getElementById('ping-text');
  const pencilHud = document.getElementById('pencil-hud');
  const pressureBar = document.getElementById('pressure-bar');
  const pressureVal = document.getElementById('pressure-val');

  const btnModeTrackpad = document.getElementById('btn-mode-trackpad');
  const btnModeTablet = document.getElementById('btn-mode-tablet');
  const btnShortcutsToggle = document.getElementById('btn-shortcuts-toggle');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  const touchArea = document.getElementById('touch-area');
  const tabletFrame = document.getElementById('tablet-frame');
  const screenDimLabel = document.getElementById('screen-dim-label');
  const touchFeedbackLayer = document.getElementById('touch-feedback-layer');
  const gestureHint = document.getElementById('gesture-hint');

  const bottomBar = document.getElementById('bottom-bar');
  const btnLeftClick = document.getElementById('btn-left-click');
  const btnRightClick = document.getElementById('btn-right-click');
  const btnMiddleClick = document.getElementById('btn-middle-click');
  const btnDragLock = document.getElementById('btn-drag-lock');
  const dragLockLabel = document.getElementById('drag-lock-label');
  const btnToggleBottom = document.getElementById('btn-toggle-bottom');

  const shortcutsDrawer = document.getElementById('shortcuts-drawer');
  const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');

  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const sliderSensitivity = document.getElementById('slider-sensitivity');
  const valSensitivity = document.getElementById('val-sensitivity');
  const switchAccel = document.getElementById('switch-accel');
  const switchNaturalScroll = document.getElementById('switch-natural-scroll');
  const sliderScrollSpeed = document.getElementById('slider-scroll-speed');
  const valScrollSpeed = document.getElementById('val-scroll-speed');
  const switchKeepAspect = document.getElementById('switch-keep-aspect');
  const sliderPencilThreshold = document.getElementById('slider-pencil-threshold');
  const valPencilThreshold = document.getElementById('val-pencil-threshold');
  const btnReconnect = document.getElementById('btn-reconnect');
  const toastDisconnected = document.getElementById('toast-disconnected');
  const btnToastReconnect = document.getElementById('btn-toast-reconnect');

  // --- Blocage Total des Gestes par Defaut iOS Safari ---
  function preventDefaults() {
    const optsPassive = { passive: false };
    
    // Empecher le pull-to-refresh et l'overscroll natif
    window.addEventListener('touchstart', (e) => {
      // Bloque tout zoom multi-touch iOS
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, optsPassive);

    window.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, optsPassive);

    // Empecher les gestes Safari de pincement/zoom
    window.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('gesturechange', (e) => e.preventDefault());
    window.addEventListener('gestureend', (e) => e.preventDefault());

    // Desactiver le menu contextuel iOS (appui long)
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('selectstart', (e) => e.preventDefault());
  }
  preventDefaults();

  // --- Gestion du WebSocket ---
  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    clearTimeout(reconnectTimer);
    updateConnectionUI('connecting', 'Connexion...');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('[WebSocket] Erreur creation socket:', err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('[WebSocket] Connecte avec succes au PC');
      isConnected = true;
      reconnectAttempts = 0;
      updateConnectionUI('connected', 'Connecté');
      toastDisconnected.classList.add('hidden');

      // Lancement du ping regulier de latence
      startPingLoop();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'init' || msg.type === 'screen_update') {
          serverScreen.width = msg.screenWidth || 1920;
          serverScreen.height = msg.screenHeight || 1080;
          screenDimLabel.textContent = `${serverScreen.width} × ${serverScreen.height}`;
          updateTabletFrameBounds();
        } else if (msg.type === 'pong') {
          const latency = Math.round(Date.now() - msg.t);
          pingText.textContent = `${latency} ms`;
        }
      } catch (e) {
        console.error('[WebSocket] Erreur parsing message:', e);
      }
    };

    ws.onclose = () => {
      console.warn('[WebSocket] Deconnecte du PC');
      isConnected = false;
      stopPingLoop();
      updateConnectionUI('disconnected', 'Déconnecté');
      toastDisconnected.classList.remove('hidden');
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WebSocket] Erreur socket:', err);
      ws.close();
    };
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 5000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] Tentative de reconnexion #${reconnectAttempts}...`);
      connectWebSocket();
    }, delay);
  }

  function sendWS(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function startPingLoop() {
    stopPingLoop();
    pingInterval = setInterval(() => {
      if (isConnected) {
        lastPingTime = Date.now();
        sendWS({ type: 'ping', t: lastPingTime });
      }
    }, 2000);
  }

  function stopPingLoop() {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  }

  function updateConnectionUI(state, text) {
    statusBadge.className = `status-badge ${state}`;
    statusText.textContent = text;
    if (state !== 'connected') {
      pingText.textContent = '-- ms';
    }
  }

  // Reconnexion automatique au retour sur l'onglet/deverrouillage iPad
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isConnected) {
      connectWebSocket();
    }
  });

  // --- Gestion de la Cadre Tablette & Ratio ---
  function updateTabletFrameBounds() {
    if (currentMode !== 'tablet') {
      tabletFrame.classList.add('hidden');
      return;
    }

    if (!settings.keepAspect) {
      tabletFrame.classList.add('hidden');
      return;
    }

    tabletFrame.classList.remove('hidden');
    const areaRect = touchArea.getBoundingClientRect();
    const areaW = areaRect.width;
    const areaH = areaRect.height;
    const targetAspect = serverScreen.width / serverScreen.height;
    const areaAspect = areaW / areaH;

    let frameW, frameH;
    if (areaAspect > targetAspect) {
      frameH = areaH * 0.94;
      frameW = frameH * targetAspect;
    } else {
      frameW = areaW * 0.94;
      frameH = frameW / targetAspect;
    }

    tabletFrame.style.width = `${frameW}px`;
    tabletFrame.style.height = `${frameH}px`;
  }

  window.addEventListener('resize', updateTabletFrameBounds);

  // --- Selecteur de Mode (Trackpad / Tablette) ---
  function setMode(mode) {
    currentMode = mode;
    if (mode === 'trackpad') {
      btnModeTrackpad.classList.add('active');
      btnModeTablet.classList.remove('active');
      tabletFrame.classList.add('hidden');
      document.querySelector('.hint-mode-label').textContent = 'Mode Trackpad';
      document.querySelector('.hint-details').textContent = '1 doigt = Curseur & Clic • 2 doigts = Scroll & Clic droit';
    } else {
      btnModeTablet.classList.add('active');
      btnModeTrackpad.classList.remove('active');
      updateTabletFrameBounds();
      document.querySelector('.hint-mode-label').textContent = 'Mode Tablette Graphique';
      document.querySelector('.hint-details').textContent = 'Position absolue Windows • Stylet Apple Pencil avec pression';
    }
  }

  btnModeTrackpad.addEventListener('click', () => setMode('trackpad'));
  btnModeTablet.addEventListener('click', () => setMode('tablet'));

  // --- Indicateur Visuel de Contact Tactile / Ripple ---
  function updateFeedbackCircle(id, x, y, type) {
    let ripple = touchFeedbackMap.get(id);
    if (!ripple) {
      ripple = document.createElement('div');
      ripple.className = `touch-ripple ${type === 'pen' ? 'pen' : 'finger'}`;
      touchFeedbackLayer.appendChild(ripple);
      touchFeedbackMap.set(id, ripple);
    }
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
  }

  function removeFeedbackCircle(id) {
    const ripple = touchFeedbackMap.get(id);
    if (ripple) {
      ripple.style.opacity = '0';
      setTimeout(() => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      }, 150);
      touchFeedbackMap.delete(id);
    }
  }

  // --- Moteur de Gestes Pointer Events ---

  // Gestion Apple Pencil
  function handlePencilEvent(e, state) {
    isPenActive = true;
    clearTimeout(penResetTimer);

    // Mise a jour du HUD Apple Pencil
    pencilHud.classList.remove('hidden');
    const pressure = typeof e.pressure === 'number' ? e.pressure : 0.5;
    const pressurePct = Math.round(pressure * 100);
    pressureBar.style.width = `${pressurePct}%`;
    pressureVal.textContent = `${pressurePct}%`;

    const areaRect = touchArea.getBoundingClientRect();
    let normX = 0;
    let normY = 0;

    if (currentMode === 'tablet' && settings.keepAspect) {
      // Coordonnees relatives au cadre proportionnel
      const frameRect = tabletFrame.getBoundingClientRect();
      const clampedX = Math.max(frameRect.left, Math.min(frameRect.right, e.clientX));
      const clampedY = Math.max(frameRect.top, Math.min(frameRect.bottom, e.clientY));
      normX = (clampedX - frameRect.left) / frameRect.width;
      normY = (clampedY - frameRect.top) / frameRect.height;
    } else {
      // Coordonnees plein ecran tactile
      normX = (e.clientX - areaRect.left) / areaRect.width;
      normY = (e.clientY - areaRect.top) / areaRect.height;
    }

    normX = Math.max(0, Math.min(1, normX));
    normY = Math.max(0, Math.min(1, normY));

    if (currentMode === 'tablet') {
      // En mode tablette, le contact avec pression au-dela du seuil declenche le trace
      let drawState = state;
      if (state === 'move') {
        if (pressure > settings.minPressureThreshold) {
          if (!penLastDown) {
            drawState = 'down';
            penLastDown = true;
          }
        } else {
          if (penLastDown) {
            drawState = 'up';
            penLastDown = false;
          }
        }
      } else if (state === 'down') {
        penLastDown = true;
      } else if (state === 'up') {
        penLastDown = false;
      }

      sendWS({
        type: 'pencil',
        x: normX,
        y: normY,
        pressure: pressure,
        state: drawState,
        tiltX: e.tiltX || 0,
        tiltY: e.tiltY || 0
      });
    } else {
      // En mode Trackpad avec le Pencil : deplacement relatif ultra-precis
      const pointer = activePointers.get(e.pointerId);
      if (pointer && state === 'move') {
        const dx = e.clientX - pointer.lastX;
        const dy = e.clientY - pointer.lastY;
        sendWS({
          type: 'move',
          dx: dx * settings.sensitivity,
          dy: dy * settings.sensitivity
        });
      }
    }

    if (state === 'up' || state === 'cancel') {
      penLastDown = false;
      penResetTimer = setTimeout(() => {
        isPenActive = false;
        pencilHud.classList.add('hidden');
      }, 500);
    }
  }

  // Pointer Down
  function handlePointerDown(e) {
    touchArea.setPointerCapture(e.pointerId);
    gestureHint.classList.add('fade-out');

    const isPen = e.pointerType === 'pen';

    // Palm Rejection : Si l'Apple Pencil est utilise, ignorer les contacts doigts accidentels
    if (!isPen && isPenActive) {
      return;
    }

    const pointerData = {
      id: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      startTime: Date.now(),
      maxDist: 0,
      initialPointersCount: activePointers.size + 1
    };
    activePointers.set(e.pointerId, pointerData);

    updateFeedbackCircle(e.pointerId, e.clientX, e.clientY, e.pointerType);

    if (isPen) {
      handlePencilEvent(e, 'down');
      return;
    }

    // Gestion du Double-Tap-to-Drag (selection/glisser)
    if (activePointers.size === 1 && settings.doubleTapDrag) {
      const now = Date.now();
      const timeDiff = now - lastTapTime;
      const distFromLastTap = Math.hypot(e.clientX - lastTapPos.x, e.clientY - lastTapPos.y);

      if (timeDiff < 280 && distFromLastTap < 25) {
        isDoubleTapDragging = true;
        sendWS({ type: 'down', button: 'left' });
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }
  }

  // Pointer Move
  function handlePointerMove(e) {
    const isPen = e.pointerType === 'pen';

    if (!isPen && isPenActive) {
      return;
    }

    updateFeedbackCircle(e.pointerId, e.clientX, e.clientY, e.pointerType);

    if (isPen) {
      handlePencilEvent(e, 'move');
      return;
    }

    const pointer = activePointers.get(e.pointerId);
    if (!pointer) return;

    const dx = e.clientX - pointer.lastX;
    const dy = e.clientY - pointer.lastY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;

    const distFromStart = Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY);
    if (distFromStart > pointer.maxDist) {
      pointer.maxDist = distFromStart;
    }

    // Comportement en fonction du nombre de doigts actifs
    const count = activePointers.size;

    if (count === 1) {
      // 1 DOIGT : Deplacement du curseur
      let factor = settings.sensitivity;
      if (settings.accel) {
        const speed = Math.hypot(dx, dy);
        factor *= (1 + Math.min(speed / 14, 2.2));
      }

      sendWS({
        type: 'move',
        dx: dx * factor,
        dy: dy * factor
      });

    } else if (count === 2) {
      // 2 DOIGTS : Defilement (Scroll molette vertical & horizontal)
      const pointersList = Array.from(activePointers.values());
      const p1 = pointersList[0];
      const p2 = pointersList[1];

      const avgDx = ((p1.lastX - p1.startX) + (p2.lastX - p2.startX)) / 2;
      const avgDy = ((p1.lastY - p1.startY) + (p2.lastY - p2.startY)) / 2;

      const scrollSign = settings.naturalScroll ? 1 : -1;
      const scrollFactor = settings.scrollSpeed * 0.45;

      sendWS({
        type: 'scroll',
        dx: dx * scrollSign * scrollFactor,
        dy: dy * scrollSign * scrollFactor
      });

    } else if (count === 3 && settings.threeFingerGestures) {
      // 3 DOIGTS : Gestes de raccourcis systeme Windows
      const startY = pointer.startY;
      const currentY = e.clientY;
      const deltaY = currentY - startY;

      if (Math.abs(deltaY) > 80 && !pointer.gestureTriggered) {
        pointer.gestureTriggered = true;
        if (deltaY < 0) {
          // Balayage vers le haut : Vue des taches (Win+Tab)
          sendWS({ type: 'key', key: 'win+tab' });
        } else {
          // Balayage vers le bas : Afficher le bureau (Win+D)
          sendWS({ type: 'key', key: 'win+d' });
        }
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
  }

  // Pointer Up
  function handlePointerUp(e) {
    const isPen = e.pointerType === 'pen';

    removeFeedbackCircle(e.pointerId);

    if (isPen) {
      handlePencilEvent(e, 'up');
      activePointers.delete(e.pointerId);
      return;
    }

    const pointer = activePointers.get(e.pointerId);
    activePointers.delete(e.pointerId);

    if (!pointer) return;

    const elapsed = Date.now() - pointer.startTime;
    const isQuickTap = elapsed < 250 && pointer.maxDist < 12;

    // Arret du Double-Tap-Drag si en cours
    if (isDoubleTapDragging) {
      isDoubleTapDragging = false;
      sendWS({ type: 'up', button: 'left' });
      return;
    }

    // Tap a 1 doigt = Clic Gauche
    if (pointer.initialPointersCount === 1 && isQuickTap && settings.tapToClick) {
      sendWS({ type: 'click', button: 'left' });
      lastTapTime = Date.now();
      lastTapPos = { x: e.clientX, y: e.clientY };
      if (navigator.vibrate) navigator.vibrate(10);
    }

    // Tap a 2 doigts = Clic Droit
    if (pointer.initialPointersCount === 2 && isQuickTap && settings.twoFingerRightClick) {
      sendWS({ type: 'click', button: 'right' });
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }

  // Pointer Cancel / Lost
  function handlePointerCancel(e) {
    removeFeedbackCircle(e.pointerId);
    if (e.pointerType === 'pen') {
      handlePencilEvent(e, 'cancel');
    }
    activePointers.delete(e.pointerId);

    if (isDoubleTapDragging) {
      isDoubleTapDragging = false;
      sendWS({ type: 'up', button: 'left' });
    }
  }

  // Attachement des evenements au trackpad
  touchArea.addEventListener('pointerdown', handlePointerDown);
  touchArea.addEventListener('pointermove', handlePointerMove);
  touchArea.addEventListener('pointerup', handlePointerUp);
  touchArea.addEventListener('pointercancel', handlePointerCancel);
  touchArea.addEventListener('lostpointercapture', handlePointerCancel);

  // --- Boutons d'Actions Inferieures ---
  btnLeftClick.addEventListener('click', () => {
    sendWS({ type: 'click', button: 'left' });
    if (navigator.vibrate) navigator.vibrate(10);
  });

  btnRightClick.addEventListener('click', () => {
    sendWS({ type: 'click', button: 'right' });
    if (navigator.vibrate) navigator.vibrate(15);
  });

  btnMiddleClick.addEventListener('click', () => {
    sendWS({ type: 'click', button: 'middle' });
    if (navigator.vibrate) navigator.vibrate(10);
  });

  btnDragLock.addEventListener('click', () => {
    isDragLocked = !isDragLocked;
    if (isDragLocked) {
      sendWS({ type: 'down', button: 'left' });
      btnDragLock.classList.add('active');
      dragLockLabel.textContent = 'Glisser ON';
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      sendWS({ type: 'up', button: 'left' });
      btnDragLock.classList.remove('active');
      dragLockLabel.textContent = 'Glisser Off';
      if (navigator.vibrate) navigator.vibrate(10);
    }
  });

  btnToggleBottom.addEventListener('click', () => {
    bottomBar.classList.toggle('collapsed');
  });

  // --- Tiroir Raccourcis Windows ---
  btnShortcutsToggle.addEventListener('click', () => {
    shortcutsDrawer.classList.toggle('hidden');
  });

  btnCloseShortcuts.addEventListener('click', () => {
    shortcutsDrawer.classList.add('hidden');
  });

  document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (key) {
        sendWS({ type: 'key', key: key });
        if (navigator.vibrate) navigator.vibrate(10);
      }
    });
  });

  // --- Modal Parametres ---
  btnSettingsToggle.addEventListener('click', () => {
    // Initialisation des valeurs dans le formulaire
    sliderSensitivity.value = settings.sensitivity;
    valSensitivity.textContent = `${settings.sensitivity}x`;

    switchAccel.checked = settings.accel;
    switchNaturalScroll.checked = settings.naturalScroll;

    sliderScrollSpeed.value = settings.scrollSpeed;
    valScrollSpeed.textContent = `${settings.scrollSpeed}x`;

    switchKeepAspect.checked = settings.keepAspect;
    sliderPencilThreshold.value = settings.minPressureThreshold;
    valPencilThreshold.textContent = `${Math.round(settings.minPressureThreshold * 100)}%`;

    settingsModal.classList.remove('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  document.querySelector('.modal-backdrop').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  sliderSensitivity.addEventListener('input', (e) => {
    settings.sensitivity = parseFloat(e.target.value);
    valSensitivity.textContent = `${settings.sensitivity}x`;
    saveSettings();
  });

  switchAccel.addEventListener('change', (e) => {
    settings.accel = e.target.checked;
    saveSettings();
  });

  switchNaturalScroll.addEventListener('change', (e) => {
    settings.naturalScroll = e.target.checked;
    saveSettings();
  });

  sliderScrollSpeed.addEventListener('input', (e) => {
    settings.scrollSpeed = parseFloat(e.target.value);
    valScrollSpeed.textContent = `${settings.scrollSpeed}x`;
    saveSettings();
  });

  switchKeepAspect.addEventListener('change', (e) => {
    settings.keepAspect = e.target.checked;
    updateTabletFrameBounds();
    saveSettings();
  });

  sliderPencilThreshold.addEventListener('input', (e) => {
    settings.minPressureThreshold = parseFloat(e.target.value);
    valPencilThreshold.textContent = `${Math.round(settings.minPressureThreshold * 100)}%`;
    saveSettings();
  });

  btnReconnect.addEventListener('click', () => {
    connectWebSocket();
    settingsModal.classList.add('hidden');
  });

  btnToastReconnect.addEventListener('click', () => {
    connectWebSocket();
  });

  // --- Plein Ecran ---
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  });

  // Initialisation au demarrage
  connectWebSocket();
  updateTabletFrameBounds();

})();
