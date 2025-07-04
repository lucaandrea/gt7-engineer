import dgram from 'dgram';

const TEST_PORT = 33742;

console.log('🧪 Starting UDP test listener...');
console.log(`📡 Listening on port ${TEST_PORT} for any UDP packets`);
console.log('💡 This will help diagnose if SimHub is forwarding packets correctly\n');

const socket = dgram.createSocket('udp4');

socket.on('message', (msg, rinfo) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📦 [${timestamp}] UDP Packet received:`);
  console.log(`   From: ${rinfo.address}:${rinfo.port}`);
  console.log(`   Size: ${msg.length} bytes`);
  console.log(`   Expected GT7 size: 296 bytes`);
  console.log(`   First 16 bytes: ${msg.subarray(0, 16).toString('hex')}`);
  
  if (msg.length === 296) {
    console.log('   ✅ This looks like a GT7 telemetry packet!');
  } else {
    console.log('   ⚠️ Unexpected packet size');
  }
});

socket.on('error', (error) => {
  console.error('❌ UDP socket error:', error);
});

socket.on('listening', () => {
  const address = socket.address();
  console.log(`✅ Test listener active on ${address.address}:${address.port}`);
  console.log('\n🎮 Now start Gran Turismo 7 and check if packets appear...');
  console.log('⏹️ Press Ctrl+C to stop\n');
});

// Bind to all interfaces to accept packets from network
socket.bind(TEST_PORT, '0.0.0.0');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping UDP test listener...');
  socket.close();
  process.exit(0);
}); 