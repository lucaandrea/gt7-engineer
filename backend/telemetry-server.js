import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TelemetryServer extends EventEmitter {
  constructor() {
    super();
    this.pythonProcess = null;
    this.latest = null;
    this.running = false;
    this.reconnectInterval = null;
    this.dataCount = 0;
    this.lastDataTime = null;
    this.useMockData = true; // Start with mock data, switch to Python when available
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🏁 Starting GT7 Telemetry server with Python bridge...');
        
        // Try to start the Python GT7 bridge
        this.startPythonBridge();
        
        // Start connection monitoring
        this.startConnectionMonitor();
        
        // Start mock data initially
        this.startMockData();
        
        this.running = true;
        resolve();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  startPythonBridge() {
    const pythonScript = path.join(__dirname, 'gt7_bridge.py');
    
    try {
      console.log('🐍 Starting Python GT7 bridge...');
      this.pythonProcess = spawn('python3', [pythonScript], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const telemetryData = JSON.parse(line);
              if (telemetryData && telemetryData.is_valid) {
                this.latest = telemetryData;
                this.dataCount++;
                this.lastDataTime = new Date();
                this.useMockData = false; // Switch from mock to real data
                this.emit('telemetry', this.latest);
                
                if (this.dataCount % 100 === 0) {
                  console.log(`📊 Received ${this.dataCount} telemetry updates from Python bridge`);
                }
              }
            } catch (error) {
              // Ignore JSON parse errors - might be partial data
            }
          }
        }
      });

      this.pythonProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          console.log(`🐍 Python bridge: ${message}`);
        }
      });

      this.pythonProcess.on('error', (error) => {
        console.error('❌ Python bridge error:', error.message);
        console.log('📊 Falling back to mock data...');
        this.useMockData = true;
      });

      this.pythonProcess.on('exit', (code) => {
        console.log(`🐍 Python bridge exited with code ${code}`);
        if (this.running) {
          console.log('📊 Falling back to mock data...');
          this.useMockData = true;
          
          // Try to restart after 10 seconds
          setTimeout(() => {
            if (this.running) {
              console.log('🔄 Attempting to restart Python bridge...');
              this.startPythonBridge();
            }
          }, 10000);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start Python bridge:', error.message);
      console.log('📊 Using mock data only...');
      this.useMockData = true;
    }
  }

  startConnectionMonitor() {
    this.connectionMonitor = setInterval(() => {
      const now = new Date();
      
      if (this.useMockData) {
        console.log(`🎮 Using mock telemetry data (Python bridge unavailable)`);
      } else {
        const timeSinceLastData = this.lastDataTime ? 
          (now - this.lastDataTime) / 1000 : null;
        
        if (this.dataCount === 0) {
          console.log(`🔍 No telemetry data received yet from Python bridge`);
        } else if (timeSinceLastData > 5) {
          console.log(`⚠️ No data for ${timeSinceLastData.toFixed(1)}s. Last update: ${this.lastDataTime.toISOString()}`);
        } else {
          console.log(`✅ GT7 connection healthy - ${this.dataCount} updates received, last: ${timeSinceLastData.toFixed(1)}s ago`);
        }
      }
    }, 15000);
  }

  stop() {
    this.running = false;
    
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
    
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    this.stopMockData();
    
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    
    console.log('🛑 GT7 Telemetry server stopped');
  }

  getLatestTelemetry() {
    return this.latest;
  }

  // Convert Python bridge data to our internal format
  processPythonTelemetry(pythonData) {
    return {
      position: pythonData.position || 1,
      currentLap: pythonData.currentLap || 0,
      totalLaps: pythonData.totalLaps || 0,
      speedKph: pythonData.speedKph || 0,
      engineRpm: pythonData.engineRpm || 0,
      fuelCapacity: pythonData.fuelCapacity || 100,
      fuelLevel: pythonData.fuelLevel || 100,
      fuelPercent: pythonData.fuelPercent || 100,
      lastLapTimeMs: pythonData.lastLapTimeMs || 0,
      bestLapTimeMs: pythonData.bestLapTimeMs || 0,
      deltaMs: pythonData.deltaMs || 0,
      tireTempFL: pythonData.tireTempFL || 80,
      tireTempFR: pythonData.tireTempFR || 80,
      tireTempRL: pythonData.tireTempRL || 80,
      tireTempRR: pythonData.tireTempRR || 80,
      oilPressure: pythonData.oilPressure || 4.5,
      waterTemp: pythonData.waterTemp || 90,
      oilTemp: pythonData.oilTemp || 100,
      totalCars: pythonData.totalCars || 20,
      timestamp: pythonData.timestamp || Date.now()
    };
  }

  // Generate mock data for testing when GT7 is not running
  generateMockData() {
    const now = Date.now();
    
    // Simulate a 3-minute lap cycle
    const lapDuration = 180000; // 3 minutes in milliseconds
    const lapProgress = (now % lapDuration) / lapDuration; // 0-1 progress through current lap
    const currentLap = Math.floor(now / lapDuration) % 20 + 1; // Cycle through 20 laps
    
    // Speed simulation based on lap progress (accelerating/braking through corners)
    const speedBase = 140; // Base speed
    const speedVariation = 60; // Speed range
    const speedCycle = Math.sin(lapProgress * Math.PI * 6) * 0.3 + Math.sin(lapProgress * Math.PI * 2) * 0.7;
    const currentSpeed = Math.max(0, speedBase + (speedCycle * speedVariation));
    
    // RPM simulation based on speed with realistic gear changes
    const gearShiftPattern = Math.sin(lapProgress * Math.PI * 8); // Simulate gear changes
    const baseRpm = 3000;
    const rpmRange = 4000;
    const currentRpm = baseRpm + (currentSpeed / 200 * rpmRange) + (gearShiftPattern * 500);
    
    // Fuel consumption over time (starts at 100%, decreases)
    const raceProgress = (now / 1000) % 3600; // 1 hour race cycle
    const fuelLevel = Math.max(5, 100 - (raceProgress / 3600 * 80)); // Use 80% fuel over "race"
    
    // Tire temperature simulation (heat up during racing)
    const baseTireTemp = 75;
    const tireHeat = 15 + (currentSpeed / 200 * 25); // Heat based on speed
    const tireVariation = 5; // Small random variation per tire
    
    // Lap times with realistic variation
    const baseLapTime = 174000; // 2:54 base lap
    const lapTimeVariation = 6000; // ±6 second variation
    const lastLapTime = baseLapTime + (Math.sin(lapProgress * Math.PI) * lapTimeVariation);
    const bestLapTime = baseLapTime - 2000; // Best lap is 2 seconds faster
    
    // Position simulation (occasionally changes)
    const positionCycle = Math.floor((now / 30000) % 6); // Change position every 30s
    const position = Math.min(8, Math.max(1, 3 + Math.sin(positionCycle) * 2));

    const mockData = {
      position: Math.round(position),
      currentLap: currentLap,
      totalLaps: 20,
      speedKph: Math.round(currentSpeed * 10) / 10, // Round to 1 decimal
      engineRpm: Math.round(Math.max(800, Math.min(8500, currentRpm))), // Realistic RPM range
      fuelCapacity: 100,
      fuelLevel: fuelLevel,
      lastLapTimeMs: Math.round(lastLapTime),
      bestLapTimeMs: Math.round(bestLapTime),
      
      // Realistic tire temperatures
      tireTempFL: Math.round((baseTireTemp + tireHeat + (Math.random() * tireVariation)) * 10) / 10,
      tireTempFR: Math.round((baseTireTemp + tireHeat + (Math.random() * tireVariation)) * 10) / 10,
      tireTempRL: Math.round((baseTireTemp + tireHeat + (Math.random() * tireVariation)) * 10) / 10,
      tireTempRR: Math.round((baseTireTemp + tireHeat + (Math.random() * tireVariation)) * 10) / 10,
      
      // Realistic engine data
      oilPressure: Math.round((4.8 + Math.sin(now / 10000) * 0.5) * 10) / 10, // 4.3-5.3 bar
      waterTemp: Math.round((92 + Math.sin(now / 15000) * 4) * 10) / 10, // 88-96°C
      oilTemp: Math.round((105 + Math.sin(now / 20000) * 8) * 10) / 10, // 97-113°C
      
      totalCars: 20,
      
      get fuelPercent() {
        return this.fuelCapacity > 0 ? Math.max(0, Math.min(100, (this.fuelLevel / this.fuelCapacity) * 100)) : 100;
      },
      
      get deltaMs() {
        return this.lastLapTimeMs - this.bestLapTimeMs;
      }
    };

    return mockData;
  }

  // Start mock data generation for testing
  startMockData(interval = 50) { // 20Hz
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }
    
    this.mockInterval = setInterval(() => {
      this.latest = this.generateMockData();
      this.emit('telemetry', this.latest);
    }, interval);
    
    console.log('🎮 Started mock telemetry data generation');
  }

  stopMockData() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
      console.log('⏹️ Stopped mock telemetry data');
    }
  }
} 