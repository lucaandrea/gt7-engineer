// Configuration example for GT7 Engineer Backend
// Copy this file to config.js and update with your actual values

export const config = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // GT7 Telemetry Configuration
  telemetry: {
    udpPort: 33740,
    ps5IpAddress: '10.0.1.62', // Update this to your PS5's IP address
    reconnectInterval: 5000
  },

  // CORS Configuration
  cors: {
    allowedOrigins: [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // React dev server
      'http://localhost:4173'  // Vite preview
    ]
  },

  // OpenAI Realtime API Settings
  realtime: {
    model: 'gpt-4o-mini-realtime-preview-2024-12-17',
    voice: 'alloy',
    sessionTimeout: 3600 // 1 hour
  }
}; 