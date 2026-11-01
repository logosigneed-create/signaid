import os
import sys
import json
import time
import socket
import asyncio
import ctypes
from ctypes import wintypes
from typing import Optional, Dict, Any, List

# Forcer la sortie console en UTF-8 sur Windows (evite le crash charmap cp1252)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import pyautogui

# Desactiver le delai artificiel par defaut de pyautogui pour un suivi temps reel ultra-fluide
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False

# Configuration DPI awareness pour coordonnees d'ecran exactes (sans mise a l'echelle faussee)
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2)  # Per-Monitor DPI aware
except Exception:
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


class WindowsInputController:
    """Controleur natif ultra-rapide des entrees souris et clavier Windows via ctypes user32."""

    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010
    MOUSEEVENTF_MIDDLEDOWN = 0x0020
    MOUSEEVENTF_MIDDLEUP = 0x0040
    MOUSEEVENTF_WHEEL = 0x0800
    MOUSEEVENTF_HWHEEL = 0x1000
    MOUSEEVENTF_ABSOLUTE = 0x8000

    def __init__(self):
        self.user32 = ctypes.windll.user32
        self.screen_width = self.user32.GetSystemMetrics(0)
        self.screen_height = self.user32.GetSystemMetrics(1)
        self.buttons_down = set()
        print(f"[InputController] Resolution ecran detectee : {self.screen_width}x{self.screen_height}")

    def update_screen_metrics(self):
        self.screen_width = self.user32.GetSystemMetrics(0)
        self.screen_height = self.user32.GetSystemMetrics(1)
        return self.screen_width, self.screen_height

    def move_rel(self, dx: float, dy: float):
        """Mouvement relatif de la souris (Mode Trackpad)."""
        idx = int(round(dx))
        idy = int(round(dy))
        if idx != 0 or idy != 0:
            self.user32.mouse_event(self.MOUSEEVENTF_MOVE, idx, idy, 0, 0)

    def move_abs(self, x: int, y: int):
        """Positionnement absolu sur l'ecran Windows."""
        clamped_x = max(0, min(self.screen_width - 1, x))
        clamped_y = max(0, min(self.screen_height - 1, y))
        self.user32.SetCursorPos(clamped_x, clamped_y)

    def move_norm(self, norm_x: float, norm_y: float):
        """Positionnement absolu avec coordonnees normalisees [0.0, 1.0]."""
        px = int(round(norm_x * (self.screen_width - 1)))
        py = int(round(norm_y * (self.screen_height - 1)))
        self.move_abs(px, py)

    def mouse_down(self, button: str = "left"):
        """Appui sur un bouton de la souris."""
        if button == "left":
            self.user32.mouse_event(self.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            self.buttons_down.add("left")
        elif button == "right":
            self.user32.mouse_event(self.MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
            self.buttons_down.add("right")
        elif button == "middle":
            self.user32.mouse_event(self.MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
            self.buttons_down.add("middle")

    def mouse_up(self, button: str = "left"):
        """Relachement d'un bouton de la souris."""
        if button == "left":
            self.user32.mouse_event(self.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            self.buttons_down.discard("left")
        elif button == "right":
            self.user32.mouse_event(self.MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
            self.buttons_down.discard("right")
        elif button == "middle":
            self.user32.mouse_event(self.MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
            self.buttons_down.discard("middle")

    def click(self, button: str = "left"):
        """Clic simple."""
        self.mouse_down(button)
        self.mouse_up(button)

    def double_click(self, button: str = "left"):
        """Double clic rapide."""
        self.click(button)
        time.sleep(0.04)
        self.click(button)

    def scroll(self, dx: float, dy: float):
        """Defilement molette vertical et horizontal."""
        # Sur Windows, 120 est la valeur standard pour un cran de molette
        if dy != 0:
            wheel_y = int(round(dy * 40))
            self.user32.mouse_event(self.MOUSEEVENTF_WHEEL, 0, 0, wheel_y, 0)
        if dx != 0:
            wheel_x = int(round(dx * 40))
            self.user32.mouse_event(self.MOUSEEVENTF_HWHEEL, 0, 0, wheel_x, 0)

    def pencil_event(self, norm_x: float, norm_y: float, pressure: float, state: str):
        """Gestion specialisee de l'Apple Pencil (Tablette graphique)."""
        self.move_norm(norm_x, norm_y)
        if state == "down":
            if "left" not in self.buttons_down:
                self.mouse_down("left")
        elif state == "up":
            if "left" in self.buttons_down:
                self.mouse_up("left")

    def press_key(self, key_name: str):
        """Envoi de touches ou raccourcis clavier utiles."""
        try:
            key_lower = key_name.lower().strip()
            if "+" in key_lower:
                parts = [p.strip() for p in key_lower.split("+")]
                pyautogui.hotkey(*parts)
            else:
                key_map = {
                    "enter": "enter",
                    "esc": "esc",
                    "escape": "esc",
                    "backspace": "backspace",
                    "space": "space",
                    "tab": "tab",
                    "win": "win",
                    "windows": "win",
                    "ctrl": "ctrl",
                    "alt": "alt",
                    "shift": "shift",
                }
                mapped = key_map.get(key_lower, key_lower)
                pyautogui.press(mapped)
        except Exception as e:
            print(f"[InputController] Erreur frappe touche '{key_name}': {e}")

    def release_all_buttons(self):
        """Securite : relache tous les boutons souris en cas de deconnexion inattendue."""
        for btn in list(self.buttons_down):
            self.mouse_up(btn)
        self.buttons_down.clear()


controller = WindowsInputController()
app = FastAPI(title="iPad Trackpad & Tablette Windows")

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


def get_local_network_ips() -> List[str]:
    """Detecte les adresses IPv4 locales accessibles sur le reseau Wi-Fi / LAN."""
    ips = []
    # 1. IP principale via connexion UDP sortante
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary = s.getsockname()[0]
        s.close()
        if primary and not primary.startswith("127."):
            ips.append(primary)
    except Exception:
        pass

    # 2. Autres adresses IP disponibles
    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips


@app.get("/api/info")
async def get_system_info():
    w, h = controller.update_screen_metrics()
    return JSONResponse({
        "screen": {"width": w, "height": h},
        "ips": get_local_network_ips(),
        "status": "ready"
    })


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "inconnu"
    print(f"[WebSocket] Nouveau client iPad connecte ({client_host})")

    # Envoi de la resolution ecran initiale
    w, h = controller.update_screen_metrics()
    await websocket.send_text(json.dumps({
        "type": "init",
        "screenWidth": w,
        "screenHeight": h,
        "serverTime": time.time()
    }))

    try:
        while True:
            data = await websocket.receive_text()
            if not data:
                continue

            msg = json.loads(data)
            action = msg.get("type")

            if action == "move":
                dx = msg.get("dx", 0)
                dy = msg.get("dy", 0)
                controller.move_rel(dx, dy)

            elif action == "move_abs":
                x = msg.get("x")
                y = msg.get("y")
                if x is not None and y is not None:
                    controller.move_abs(int(x), int(y))

            elif action == "move_norm":
                norm_x = msg.get("x", 0.0)
                norm_y = msg.get("y", 0.0)
                controller.move_norm(norm_x, norm_y)

            elif action == "click":
                btn = msg.get("button", "left")
                controller.click(btn)

            elif action == "double_click":
                btn = msg.get("button", "left")
                controller.double_click(btn)

            elif action == "down":
                btn = msg.get("button", "left")
                controller.mouse_down(btn)

            elif action == "up":
                btn = msg.get("button", "left")
                controller.mouse_up(btn)

            elif action == "scroll":
                dx = msg.get("dx", 0)
                dy = msg.get("dy", 0)
                controller.scroll(dx, dy)

            elif action == "pencil":
                x = msg.get("x", 0.0)
                y = msg.get("y", 0.0)
                pressure = msg.get("pressure", 0.5)
                state = msg.get("state", "move")
                controller.pencil_event(x, y, pressure, state)

            elif action == "key":
                key = msg.get("key", "")
                if key:
                    controller.press_key(key)

            elif action == "ping":
                t = msg.get("t", 0)
                await websocket.send_text(json.dumps({"type": "pong", "t": t}))

            elif action == "refresh_screen":
                w, h = controller.update_screen_metrics()
                await websocket.send_text(json.dumps({
                    "type": "screen_update",
                    "screenWidth": w,
                    "screenHeight": h
                }))

    except WebSocketDisconnect:
        print(f"[WebSocket] iPad deconnecte ({client_host})")
    except Exception as e:
        print(f"[WebSocket] Erreur flux: {e}")
    finally:
        controller.release_all_buttons()


# Montage des fichiers statiques (Frontend)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


def print_startup_banner(port: int, ips: List[str]):
    primary_ip = ips[0]
    ipad_url = f"http://{primary_ip}:{port}"
    local_url = f"http://localhost:{port}"

    print("\n" + "=" * 62)
    print(" 📱  IPAD TRACKPAD & TABLETTE GRAPHIQUE POUR WINDOWS")
    print("=" * 62)
    print(f"  ⚡ Statut     : Serveur actif et en ecoute")
    print(f"  👉 URL iPad   : \033[92m\033[1m{ipad_url}\033[0m")
    if len(ips) > 1:
        print(f"  🌐 Autres IPs : {', '.join([f'http://{ip}:{port}' for ip in ips[1:]])}")
    print(f"  💻 Localhost  : {local_url}")
    print("-" * 62)

    try:
        import qrcode
        qr = qrcode.QRCode(box_size=1, border=1)
        qr.add_data(ipad_url)
        qr.make(fit=True)
        print("  📷 Scannez ce QR Code avec l'appareil photo de votre iPad :")
        qr.print_ascii(invert=True)
    except Exception:
        pass

    print("-" * 62)
    print("  💡 Astuce PWA iPad :")
    print("     Ouvrez le lien dans Safari, appuyez sur le bouton Partager")
    print("     puis choisissez 'Sur l'ecran d'accueil' pour un vrai plein ecran !")
    print("  🛑 Pour arreter : Appuyez sur Ctrl + C")
    print("=" * 62 + "\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Serveur iPad Trackpad & Tablette Graphique")
    parser.add_argument("--port", type=int, default=5000, help="Port d'ecoute HTTP & WebSocket (defaut: 5000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Hote d'ecoute (defaut: 0.0.0.0)")
    args = parser.parse_args()

    local_ips = get_local_network_ips()
    print_startup_banner(args.port, local_ips)

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
