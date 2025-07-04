import tkinter as tk
from tkinter.scrolledtext import ScrolledText
from subprocess import Popen, PIPE, STDOUT
from threading import Thread
from PIL import Image, ImageTk  # pip install pillow
import os
import sys
import subprocess
import re
import platform

SCRIPT_TO_RUN = "launcher.py"  # Your full launcher logic

env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

def kill_port_users(port):
    try:
        if platform.system() == "Darwin":  # macOS
            # Use lsof to find processes using the port
            result = subprocess.check_output(f'lsof -ti:{port}', shell=True, stderr=subprocess.DEVNULL)
            pids = result.decode().strip().split('\n')
            pids = [pid.strip() for pid in pids if pid.strip()]
            
            for pid in pids:
                print(f"Killing process using port {port}: PID {pid}")
                subprocess.run(["kill", "-9", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
        elif platform.system() == "Windows":
            # Windows version (original code)
            result = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True)
            lines = result.decode().splitlines()
            pids = {re.split(r"\s+", line.strip())[-1] for line in lines}
            
            for pid in pids:
                print(f"Killing process using port {port}: PID {pid}")
                subprocess.run(["taskkill", "/F", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            # Linux version
            result = subprocess.check_output(f'lsof -ti:{port}', shell=True, stderr=subprocess.DEVNULL)
            pids = result.decode().strip().split('\n')
            pids = [pid.strip() for pid in pids if pid.strip()]
            
            for pid in pids:
                print(f"Killing process using port {port}: PID {pid}")
                subprocess.run(["kill", "-9", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                
    except subprocess.CalledProcessError:
        print(f"No process found using port {port} — good to go.")
        

def run_script(text_widget):
    # Build a Python command that's unbuffered and in UTF-8 mode
    cmd = [
        sys.executable,  # full path to the current Python interpreter
        "-u",            # unbuffered stdout/stderr
        "-X", "utf8",    # force UTF-8 mode
        SCRIPT_TO_RUN
    ]

    process = Popen(
        cmd,
        cwd=os.path.dirname(os.path.abspath(SCRIPT_TO_RUN)),  # run from script's folder
        stdout=PIPE,
        stderr=STDOUT,
        text=True,
        encoding="utf-8",  # decode output as UTF-8
        bufsize=1,
        env=env
    )

    for line in process.stdout:
        text_widget.insert(tk.END, line)
        text_widget.see(tk.END)

    process.stdout.close()
    process.wait()
    
def main():
    root = tk.Tk()
    root.title("GT7 Race Engineer")
    root.geometry("800x700")

    # Load and display image
    try:
        image = Image.open("Image.png")  # Fixed capitalization
        image = image.resize((400, 400))
        photo = ImageTk.PhotoImage(image)
        img_label = tk.Label(root, image=photo)
        img_label.pack(pady=10)
    except Exception as e:
        print("Could not load image:", e)

    # Output box
    output_box = ScrolledText(root, wrap=tk.WORD, height=20)
    output_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    # Start the script in a separate thread
    thread = Thread(target=run_script, args=(output_box,))
    thread.daemon = True
    thread.start()

    root.mainloop()

if __name__ == "__main__":
    kill_port_users("33742")  # Or whatever port GT7 uses
    main()