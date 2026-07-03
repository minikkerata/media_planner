import os
import sys
import time
import subprocess
import threading
import pystray
from PIL import Image, ImageDraw
import win32gui
import win32process
import win32con

import json

# Global process handles
backend_proc = None
frontend_proc = None
icon_instance = None

# Load ports from config.json
script_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(script_dir, "config.json")
backend_port = 8085
frontend_port = 5173

if os.path.exists(config_path):
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
            backend_port = config.get("backend_port", 8085)
            frontend_port = config.get("frontend_port", 5173)
    except Exception:
        pass

def create_icon_image():
    # 64x64 icon matching logo_dark.svg layout
    width = 64
    height = 64
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    
    # Draw rounded rect fill=#303022
    dc.rounded_rectangle([0, 0, width-1, height-1], radius=11, fill='#303022')
    
    # Scale helper (from original 74x74 coordinates to 64x64)
    def s(val):
        return int(val * 64 / 74)
        
    dc.rounded_rectangle([s(14.5), s(14.5), s(59.5), s(59.5)], radius=s(5), outline="white", width=max(1, s(4.5)))
    
    # Vert lines
    dc.line([(s(25.75), s(14.5)), (s(25.75), s(59.5))], fill="white", width=max(1, s(4.5)))
    dc.line([(s(48.25), s(14.5)), (s(48.25), s(59.5))], fill="white", width=max(1, s(4.5)))
    
    # Horiz lines
    dc.line([(s(14.5), s(37)), (s(59.5), s(37))], fill="white", width=max(1, s(4.5)))
    dc.line([(s(14.5), s(25.75)), (s(25.75), s(25.75))], fill="white", width=max(1, s(4.5)))
    dc.line([(s(14.5), s(48.25)), (s(25.75), s(48.25))], fill="white", width=max(1, s(4.5)))
    dc.line([(s(48.25), s(48.25)), (s(59.5), s(48.25))], fill="white", width=max(1, s(4.5)))
    dc.line([(s(48.25), s(25.75)), (s(59.5), s(25.75))], fill="white", width=max(1, s(4.5)))
    
    return image

def get_console_hwnds(pid):
    hwnds = []
    def callback(hwnd, extra):
        if win32gui.GetClassName(hwnd) == "ConsoleWindowClass":
            _, win_pid = win32process.GetWindowThreadProcessId(hwnd)
            if win_pid == pid:
                hwnds.append(hwnd)
        return True
    win32gui.EnumWindows(callback, None)
    return hwnds

def show_windows():
    global backend_proc, frontend_proc
    for proc in [backend_proc, frontend_proc]:
        if proc:
            hwnds = get_console_hwnds(proc.pid)
            for hwnd in hwnds:
                win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                win32gui.BringWindowToTop(hwnd)

def hide_windows():
    global backend_proc, frontend_proc
    for proc in [backend_proc, frontend_proc]:
        if proc:
            hwnds = get_console_hwnds(proc.pid)
            for hwnd in hwnds:
                win32gui.ShowWindow(hwnd, win32con.SW_HIDE)

def kill_process_tree(pid):
    if pid:
        subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def start_processes():
    global backend_proc, frontend_proc
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Win32 STARTUPINFO hidden flags
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = subprocess.SW_HIDE
    
    # 1. Start backend server
    python_exe = r"C:\Users\emred\AppData\Local\Programs\Python\Python312\python.exe"
    backend_script = os.path.join(script_dir, "backend", "main.py")
    backend_log = open(os.path.join(script_dir, "backend_err.log"), "w", encoding="utf-8")
    backend_proc = subprocess.Popen(
        [python_exe, backend_script],
        cwd=script_dir,
        startupinfo=startupinfo,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
        stdout=backend_log,
        stderr=backend_log
    )
    
    # 2. Start frontend dev server
    frontend_dir = os.path.join(script_dir, "frontend")
    frontend_log = open(os.path.join(script_dir, "frontend_err.log"), "w", encoding="utf-8")
    frontend_proc = subprocess.Popen(
        ["cmd.exe", "/c", "npm run dev"],
        cwd=frontend_dir,
        startupinfo=startupinfo,
        creationflags=subprocess.CREATE_NEW_CONSOLE,
        stdout=frontend_log,
        stderr=frontend_log
    )

def close_chrome_pwa():
    def callback(hwnd, extra):
        title = win32gui.GetWindowText(hwnd)
        class_name = win32gui.GetClassName(hwnd)
        if f"Media Planner ({backend_port})" in title and class_name == "Chrome_WidgetWin_1":
            win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
        return True
    try:
        win32gui.EnumWindows(callback, None)
    except Exception:
        pass

def stop_processes():
    global backend_proc, frontend_proc
    try:
        close_chrome_pwa()
    except Exception:
        pass
    if backend_proc:
        kill_process_tree(backend_proc.pid)
        backend_proc = None
    if frontend_proc:
        kill_process_tree(frontend_proc.pid)
        frontend_proc = None

def on_show(icon, item=None):
    show_windows()

def on_hide(icon, item=None):
    hide_windows()

def on_quit(icon, item=None):
    stop_processes()
    icon.stop()

def monitor_loop(icon):
    global backend_proc
    # Wait for initial processes startup
    time.sleep(2.0)
    while True:
        time.sleep(1.0)
        # If backend process is terminated (e.g. via PWA window exit shutdown beacon), terminate all processes and quit tray
        if backend_proc and backend_proc.poll() is not None:
            stop_processes()
            icon.stop()
            break

def main():
    global icon_instance
    start_processes()
    
    # Launch Chrome PWA after a short delay
    def launch_chrome_delayed():
        time.sleep(3.0)
        chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if os.path.exists(chrome_path):
            subprocess.Popen([chrome_path, f"--app=http://localhost:{frontend_port}"])
        else:
            subprocess.Popen(f'start "" "chrome.exe" --app=http://localhost:{frontend_port}', shell=True)
            
    threading.Thread(target=launch_chrome_delayed, daemon=True).start()
    
    icon_image = create_icon_image()
    menu = pystray.Menu(
        pystray.MenuItem("Göster", on_show),
        pystray.MenuItem("Gizle", on_hide),
        pystray.MenuItem("Kapat", on_quit)
    )
    
    icon_instance = pystray.Icon(
        "Media Planner",
        icon_image,
        "Media Planner",
        menu=menu,
        action=on_show # Left-click action to show pencereleri
    )
    
    # Start monitor thread
    monitor_thread = threading.Thread(target=monitor_loop, args=(icon_instance,), daemon=True)
    monitor_thread.start()
    
    # Run the tray application (blocks until icon.stop() is called)
    icon_instance.run()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tray_crash.log"), "w", encoding="utf-8") as f:
            f.write(str(e) + "\n")
            traceback.print_exc(file=f)
