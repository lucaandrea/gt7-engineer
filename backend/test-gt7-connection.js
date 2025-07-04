import dgram from 'dgram';

const GT7_UDP_PORT = 33742;
const GT7_PS5_IP = '10.0.1.62'; // Update this to your PS5 IP address

console.log('🔍 GT7 Connection Test');
console.log(`📡 Listening on port ${GT7_UDP_PORT}`);
console.log(`🎮 Expected PS5 IP: ${GT7_PS5_IP}`);
console.log('⚠️  Make sure GT7 is running and telemetry is enabled in Settings > Network');

const socket = dgram.createSocket('udp4');

socket.on('message', (msg, rinfo) => {
  console.log(`📦 Received packet from ${rinfo.address}:${rinfo.port}`);
  console.log(`📊 Packet size: ${msg.length} bytes`);
  console.log(`🔢 First 32 bytes: ${msg.slice(0, 32).toString('hex')}`);
  
  if (msg.length >= 296) {
    console.log('✅ Packet size looks correct for GT7 telemetry');
    
    // Try to parse some basic values
    try {
      const speed = Math.abs(msg.readFloatLE(0x4C) * 3.6);
      const rpm = Math.abs(msg.readFloatLE(0x3C));
      const lap = msg.readUInt16LE(0x78);
      
      console.log(`🏎️  Speed: ${speed.toFixed(1)} km/h`);
      console.log(`🔧 RPM: ${rpm.toFixed(0)}`);
      console.log(`🏁 Lap: ${lap}`);
    } catch (e) {
      console.log('⚠️  Could not parse telemetry values');
    }
  } else {
    console.log('⚠️  Packet size is too small for GT7 telemetry');
  }
  
  console.log('---');
});

socket.on('error', (err) => {
  console.error('❌ UDP socket error:', err);
});

socket.bind(GT7_UDP_PORT, '0.0.0.0', () => {
  console.log(`🎯 UDP server listening on 0.0.0.0:${GT7_UDP_PORT}`);
  console.log('📋 In GT7, enable telemetry in Settings > Network');
  console.log('🔄 Waiting for telemetry packets...');
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping GT7 connection test...');
  socket.close();
  process.exit(0);
});