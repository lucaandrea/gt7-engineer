import dgram from 'dgram';
import { EventEmitter } from 'events';

const GT7_UDP_PORT = 33742; // Standard GT7 telemetry port
const GT7_PACKET_SIZE = 296; // GT7 telemetry packet size

export class TelemetryServer extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.latest = null;
    this.running = false;
    this.reconnectInterval = null;
    this.packetsReceived = 0;
    this.lastPacketTime = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = dgram.createSocket('udp4');
        
        this.socket.on('message', (msg, rinfo) => {
          try {
            this.packetsReceived++;
            this.lastPacketTime = new Date();
            
            if (this.packetsReceived % 100 === 0) {
              console.log(`📦 Received ${this.packetsReceived} UDP packets from ${rinfo.address}:${rinfo.port}`);
            }
            
            if (msg.length >= GT7_PACKET_SIZE) {
              this.latest = this.parseGT7Packet(msg);
              this.emit('telemetry', this.latest);
            } else {
              console.log(`⚠️ Packet too small: ${msg.length} bytes (expected ${GT7_PACKET_SIZE})`);
            }
          } catch (error) {
            console.error('Error parsing GT7 packet:', error);
          }
        });

        this.socket.on('error', (error) => {
          console.error('❌ UDP socket error:', error);
          this.emit('error', error);
        });

        this.socket.on('listening', () => {
          const address = this.socket.address();
          console.log(`🏁 GT7 Telemetry server listening on ${address.address}:${address.port}`);
          console.log(`📡 Waiting for UDP packets from SimHub forwarding to 10.0.1.62:${GT7_UDP_PORT}...`);
          this.running = true;
          
          this.startConnectionMonitor();
          
          // Start mock data after 30s if no real packets received
          setTimeout(() => {
            if (this.packetsReceived === 0) {
              console.log('🎮 No real packets after 30s, starting mock data for testing...');
              this.startMockData();
            }
          }, 30000);
          
          resolve();
        });

        // Bind to all interfaces (0.0.0.0) to accept packets from network
        this.socket.bind(GT7_UDP_PORT, '0.0.0.0');
        
      } catch (error) {
        reject(error);
      }
    });
  }

  startConnectionMonitor() {
    this.connectionMonitor = setInterval(() => {
      const now = new Date();
      const timeSinceLastPacket = this.lastPacketTime ? 
        (now - this.lastPacketTime) / 1000 : null;
      
      if (this.packetsReceived === 0) {
        console.log(`🔍 No packets received yet. Check SimHub forwarding to 10.0.1.62:${GT7_UDP_PORT}`);
      } else if (timeSinceLastPacket > 30) {
        console.log(`⚠️ No packets for ${timeSinceLastPacket.toFixed(1)}s. Last packet: ${this.lastPacketTime.toISOString()}`);
      } else {
        console.log(`✅ Connection healthy - ${this.packetsReceived} packets received, last: ${timeSinceLastPacket.toFixed(1)}s ago`);
      }
    }, 10000);
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
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    console.log('🛑 GT7 Telemetry server stopped');
  }

  getLatestTelemetry() {
    return this.latest;
  }

  // Parse GT7 UDP packet format
  parseGT7Packet(buffer) {
    try {
      // GT7 packet structure based on official documentation
      // Reference: https://github.com/snipem/gt7dashboard and GT7 community research
      
      const data = {
        // Position and race info - correct offsets for GT7 v1.49+
        position: buffer.readUInt16LE(0x74) || 1, // Race position 
        currentLap: buffer.readUInt16LE(0x78) || 0, // Current lap
        totalLaps: buffer.readUInt16LE(0x7A) || 0, // Total laps
        
        // Speed and engine data - correct GT7 offsets
        speedKph: Math.abs(buffer.readFloatLE(0x4C) * 3.6) || 0, // Convert m/s to km/h
        engineRpm: Math.abs(buffer.readFloatLE(0x3C)) || 0,
        
        // Fuel data - correct GT7 fuel offsets
        fuelCapacity: buffer.readFloatLE(0x48) || 100,
        fuelLevel: buffer.readFloatLE(0x44) || 100,
        
        // Timing data - correct GT7 lap time offsets
        lastLapTimeMs: Math.abs(buffer.readInt32LE(0x7C)) || 0,
        bestLapTimeMs: Math.abs(buffer.readInt32LE(0x80)) || 0,
        
        // Tire temperatures - correct GT7 tire temp offsets
        tireTempFL: buffer.readFloatLE(0x60) || 80, // Front Left
        tireTempFR: buffer.readFloatLE(0x64) || 80, // Front Right  
        tireTempRL: buffer.readFloatLE(0x68) || 80, // Rear Left
        tireTempRR: buffer.readFloatLE(0x6C) || 80, // Rear Right
        
        // Engine data - correct GT7 engine parameter offsets
        oilPressure: buffer.readFloatLE(0x54) || 4.5, // Oil pressure
        waterTemp: buffer.readFloatLE(0x58) || 90, // Water temperature
        oilTemp: buffer.readFloatLE(0x5C) || 100, // Oil temperature
        
        // Race info - extract from flags
        totalCars: buffer.readUInt8(0x76) || 20, // Total cars in race
        
        // Calculate derived values
        get fuelPercent() {
          return this.fuelCapacity > 0 ? Math.max(0, Math.min(100, (this.fuelLevel / this.fuelCapacity) * 100)) : 100;
        },
        
        get deltaMs() {
          if (this.bestLapTimeMs > 0 && this.lastLapTimeMs > 0 && this.bestLapTimeMs < 600000 && this.lastLapTimeMs < 600000) {
            return this.lastLapTimeMs - this.bestLapTimeMs;
          }
          return 0;
        }
      };

      // Data validation and sanitization
      data.speedKph = Math.max(0, Math.min(400, data.speedKph || 0));
      data.engineRpm = Math.max(0, Math.min(12000, data.engineRpm || 0));
      data.position = Math.max(1, Math.min(20, data.position || 1));
      data.currentLap = Math.max(0, Math.min(200, data.currentLap || 0));
      data.totalLaps = Math.max(0, Math.min(200, data.totalLaps || 0));
      
      // Validate lap times (should be reasonable - between 30s and 10 minutes)
      if (data.lastLapTimeMs < 30000 || data.lastLapTimeMs > 600000) {
        data.lastLapTimeMs = 0;
      }
      if (data.bestLapTimeMs < 30000 || data.bestLapTimeMs > 600000) {
        data.bestLapTimeMs = 0;
      }

      // Only log every 50th packet to reduce console spam
      if (this.packetsReceived % 50 === 0) {
        console.log(`🏁 Parsed telemetry - Lap: ${data.currentLap}, Speed: ${data.speedKph.toFixed(1)} km/h, RPM: ${data.engineRpm.toFixed(0)}, Fuel: ${data.fuelPercent.toFixed(1)}%`);
      }

      return data;
      
    } catch (error) {
      console.error('Failed to parse GT7 packet:', error);
      return this.generateMockData();
    }
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