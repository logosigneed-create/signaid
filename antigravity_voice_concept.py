import winsound
import time
import speech_recognition as sr
import threading

# Configuration
SOUND_FREQ = 1000  # Hz
SOUND_DUR = 500    # ms
TRIGGER_PHRASE = "antigravity écrit"

# Try to import pyautogui, handled if missing
try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False
    print("⚠️ WARNING: pyautogui not installed. Dictation will only be printed to console.")

def play_alert_sound():
    try:
        winsound.Beep(SOUND_FREQ, SOUND_DUR)
    except Exception:
        pass

def listen_loop():
    r = sr.Recognizer()
    mic = sr.Microphone()
    
    print(f"\n[ANTIGRAVITY] Listening... Say '{TRIGGER_PHRASE} <your text>'")
    
    with mic as source:
        r.adjust_for_ambient_noise(source)
        
        while True:
            try:
                print(".", end="", flush=True)
                audio = r.listen(source, timeout=None, phrase_time_limit=5)
                
                try:
                    text = r.recognize_google(audio, language="fr-FR").lower()
                    
                    if TRIGGER_PHRASE in text:
                        print(f"\n[TRIGGER DETECTED]: {text}")
                        play_alert_sound()
                        
                        # Extract the text *after* the trigger
                        content = text.split(TRIGGER_PHRASE, 1)[1].strip()
                        
                        if content:
                            print(f"📝 TYPING: {content}")
                            if HAS_PYAUTOGUI:
                                pyautogui.typewrite(content + " ")
                            else:
                                print("(Simulating typing...)")
                        else:
                            print("❓ (Trigger heard, but no content follows. Listening for next phrase...)")
                            # Optional: Listen again immediately for content if you want multi-step
                            
                except sr.UnknownValueError:
                    pass # Silence
                    
            except KeyboardInterrupt:
                print("\nStopping...")
                break
            except Exception as e:
                print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("--- ANTIGRAVITY VOICE DICTATION POC ---")
    if not HAS_PYAUTOGUI:
        print("❌ 'pyautogui' is missing. To enable typing, run: pip install pyautogui")
    
    listen_loop()
