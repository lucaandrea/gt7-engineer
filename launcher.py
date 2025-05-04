# launcher.py
import os
import sys
import time
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

from telemetry_server import TelemetryServer
import GT7_Radio_GenAI  # your existing module

os.environ.setdefault("PYTHONUNBUFFERED", "1")

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

import logging
logging.basicConfig(filename="engineer_log.txt", level=logging.INFO, format="%(asctime)s - %(message)s")

MAX_ATTEMPTS = 3
DELAY_BETWEEN = 5  # seconds


def set_working_directory():
    # Ensure the working directory is the script's location
    os.chdir(Path(__file__).resolve().parent)


def connect_telemetry():
    tel = TelemetryServer()
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            tel.start()
            time.sleep(2)  # give it a moment to receive packets
            if tel.get_latest() is not None:
                print(f"✅ Telemetry connected on attempt {attempt}", flush=True)
                return tel
            raise RuntimeError("no packets yet")
        except Exception as e:
            print(f"⚠️  Telemetry attempt {attempt} failed: {e}", flush=True)
            time.sleep(DELAY_BETWEEN)
    return None


def show_error_popup():
    root = tk.Tk()
    root.withdraw()
    messagebox.showerror(
        "GT7 Engineer",
        "❌ Couldn’t find your PS5 telemetry after 3 tries.\n"
        "Please check your Wi-Fi or restart your PS5."
    )


def main():
    set_working_directory()
    tel = connect_telemetry()
    if not tel:
        show_error_popup()
        sys.exit(1)

    # Start the main application
    GT7_Radio_GenAI.run_with_telemetry(tel)


if __name__ == "__main__":
    main()