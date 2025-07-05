#!/usr/bin/env python3
"""
GT7 Telemetry Bridge Script
Connects to GT7 using gt_telem library and outputs JSON telemetry data
that can be consumed by the Node.js backend.
"""

import json
import time
import sys
import os
from gt_telem import TurismoClient
from gt_telem.errors.playstation_errors import PlayStationNotFoundError, PlayStatonOnStandbyError

class GT7Bridge:
    def __init__(self):
        self.tc = None
        self.running = False

    def start(self):
        """Initialize GT7 telemetry connection"""
        try:
            self.tc = TurismoClient()
            self.tc.start()
            print("✅ GT7 Bridge: Telemetry connection established", file=sys.stderr)
            self.running = True
            return True
        except PlayStatonOnStandbyError:
            print("❗ GT7 Bridge: PS5 is asleep—wake it up", file=sys.stderr)
            return False
        except PlayStationNotFoundError:
            print("❗ GT7 Bridge: PS5 not found on LAN", file=sys.stderr)
            return False
        except Exception as e:
            print(f"❌ GT7 Bridge: Failed to connect - {e}", file=sys.stderr)
            return False

    def get_telemetry_json(self):
        """Get current telemetry data as JSON"""
        if not self.tc or not self.tc.telemetry:
            return None
            
        telemetry = self.tc.telemetry
        
        # Convert GT7 telemetry to our expected format
        data = {
            # Position and race info
            "position": getattr(telemetry, 'position', 1),
            "currentLap": getattr(telemetry, 'lap_count', 0),
            "totalLaps": getattr(telemetry, 'laps_in_race', 0),
            
            # Speed and engine data
            "speedKph": getattr(telemetry, 'car_speed', 0) * 3.6,  # Convert m/s to km/h
            "engineRpm": getattr(telemetry, 'engine_rpm', 0),
            
            # Fuel data
            "fuelCapacity": getattr(telemetry, 'fuel_capacity', 100),
            "fuelLevel": getattr(telemetry, 'fuel_level', 100),
            
            # Timing data
            "lastLapTimeMs": int(getattr(telemetry, 'last_lap_time', 0) * 1000),
            "bestLapTimeMs": int(getattr(telemetry, 'best_lap_time', 0) * 1000),
            
            # Tire temperatures
            "tireTempFL": getattr(telemetry, 'tire_temp_fl', 80),
            "tireTempFR": getattr(telemetry, 'tire_temp_fr', 80),
            "tireTempRL": getattr(telemetry, 'tire_temp_rl', 80),
            "tireTempRR": getattr(telemetry, 'tire_temp_rr', 80),
            
            # Engine data
            "oilPressure": getattr(telemetry, 'oil_pressure', 4.5),
            "waterTemp": getattr(telemetry, 'water_temperature', 90),
            "oilTemp": getattr(telemetry, 'oil_temperature', 100),
            
            # Race info
            "totalCars": getattr(telemetry, 'cars_in_race', 20),
            
            # Metadata
            "timestamp": time.time(),
            "is_valid": True
        }
        
        # Calculate derived values
        if data["fuelCapacity"] > 0:
            data["fuelPercent"] = max(0, min(100, (data["fuelLevel"] / data["fuelCapacity"]) * 100))
        else:
            data["fuelPercent"] = 100
            
        if data["bestLapTimeMs"] > 0 and data["lastLapTimeMs"] > 0:
            data["deltaMs"] = data["lastLapTimeMs"] - data["bestLapTimeMs"]
        else:
            data["deltaMs"] = 0
        
        return data

    def run_continuous(self):
        """Run continuous telemetry output"""
        if not self.start():
            return False
            
        try:
            while self.running:
                telemetry_data = self.get_telemetry_json()
                if telemetry_data:
                    # Output JSON to stdout for Node.js to consume
                    print(json.dumps(telemetry_data), flush=True)
                else:
                    # Output null when no data available
                    print("null", flush=True)
                
                time.sleep(0.05)  # 20Hz update rate
                
        except KeyboardInterrupt:
            print("🛑 GT7 Bridge: Shutting down", file=sys.stderr)
        except Exception as e:
            print(f"❌ GT7 Bridge: Error - {e}", file=sys.stderr)
        finally:
            self.stop()

    def stop(self):
        """Stop the telemetry connection"""
        self.running = False
        if self.tc:
            self.tc.stop()
            print("🛑 GT7 Bridge: Telemetry stopped", file=sys.stderr)

if __name__ == "__main__":
    bridge = GT7Bridge()
    bridge.run_continuous()