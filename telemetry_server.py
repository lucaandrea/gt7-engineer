import time
import threading
from gt_telem import TurismoClient
from gt_telem.errors.playstation_errors import PlayStationNotFoundError, PlayStatonOnStandbyError

class TelemetryServer:
    def __init__(self):
        self.tc = None
        self.latest = None
        self.running = False
        self.thread = None

    def _loop(self):
        while self.running:
            if self.tc.telemetry:
                self.latest = self.tc.telemetry
            time.sleep(0.05)

    def start(self):
        try:
            self.tc = TurismoClient()
            self.tc.start()
            print("✅ Telemetry started.")
        except PlayStatonOnStandbyError:
            print("❗ PS5 is asleep—wake it up.")
            return
        except PlayStationNotFoundError:
            print("❗ PS5 not found on LAN.")
            return

        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.tc:
            self.tc.stop()
        print("🛑 Telemetry stopped.")

    def get_latest(self):
        return self.latest