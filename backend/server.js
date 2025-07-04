import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { TelemetryServer } from './telemetry-server.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize telemetry server
const telemetryServer = new TelemetryServer();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telemetry endpoint - provides current GT7 data
app.get('/telemetry', (req, res) => {
  try {
    const telemetryData = telemetryServer.getLatestTelemetry();
    
    if (!telemetryData) {
      return res.json({
        connected: false,
        error: 'No telemetry data available',
        timestamp: new Date().toISOString()
      });
    }

    // Convert GT7 data to our format
    const formattedData = {
      connected: true,
      current_lap: telemetryData.currentLap || 0,
      total_laps: telemetryData.totalLaps || 0,
      position: telemetryData.position || 0,
      fuel_pct: telemetryData.fuelPercent || 100,
      speed_kph: telemetryData.speedKph || 0,
      engine_rpm: telemetryData.engineRpm || 0,
      last_lap_time_ms: telemetryData.lastLapTimeMs || 0,
      best_lap_time_ms: telemetryData.bestLapTimeMs || 0,
      delta_ms: telemetryData.deltaMs || 0,
      tire_temps: {
        fl: telemetryData.tireTempFL || 80,
        fr: telemetryData.tireTempFR || 80,
        rl: telemetryData.tireTempRL || 80,
        rr: telemetryData.tireTempRR || 80
      },
      oil_pressure: telemetryData.oilPressure || 5.0,
      water_temp: telemetryData.waterTemp || 90,
      oil_temp: telemetryData.oilTemp || 100,
      total_cars: telemetryData.totalCars || 20,
      is_loading: false,
      timestamp: new Date().toISOString()
    };

    res.json(formattedData);
  } catch (error) {
    console.error('Telemetry endpoint error:', error);
    res.status(500).json({
      connected: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Ephemeral token endpoint for OpenAI Realtime API
app.post('/ephemeral', async (req, res) => {
  try {
    console.log('Creating ephemeral session for Realtime API...');
    
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      voice: 'alloy',
      instructions: `# Role
You are "Delta", a calm yet decisive British Formula 1 race engineer. Your driver is currently racing in Gran Turismo 7.

# Goals
1. Minimize lap time through precise coaching
2. Maintain tire and fuel strategy for the entire stint
3. Provide clear, actionable feedback

# Voice Style
- British F3 pit-wall professional
- Concise and direct
- No small talk during racing
- Use racing terminology naturally

# Constraints
- Never exceed 5 seconds of speech
- Prioritize braking and gear advice when delta < 0.1s
- Call out tire degradation when over 80%
- Monitor fuel consumption relative to stint length

# Function Usage
You will receive real-time telemetry via the updateTelemetry function. Use this data to provide strategic coaching.`,
      
      tools: [{
        name: 'updateTelemetry',
        description: 'Real-time GT7 car telemetry data at 20Hz',
        parameters: {
          type: 'object',
          properties: {
            lap: { type: 'integer', description: 'Current lap number' },
            sector_time_ms: { type: 'integer', description: 'Last sector time in milliseconds' },
            fuel_pct: { type: 'number', description: 'Fuel level as percentage' },
            tyre_deg_pct: { 
              type: 'array', 
              items: { type: 'number' },
              description: 'Tire degradation percentages [FL, FR, RL, RR]'
            },
            delta_ms: { type: 'integer', description: 'Delta to best lap in milliseconds' },
            position: { type: 'integer', description: 'Current race position' },
            speed_kph: { type: 'number', description: 'Current speed in km/h' },
            engine_rpm: { type: 'integer', description: 'Current engine RPM' }
          },
          required: ['lap', 'delta_ms']
        }
      }],
      
      temperature: 0.7,
      max_response_output_tokens: 1000
    });
    
    console.log('✅ Created Realtime session:', session.id);
    
    res.json({
      client_secret: session.client_secret.value,
      session_id: session.id
    });
    
  } catch (error) {
    console.error('❌ Failed to create ephemeral session:', error);
    res.status(500).json({ 
      error: 'Failed to create realtime session',
      details: error.message 
    });
  }
});

// Race analysis endpoint (for post-race debriefs)
app.post('/analyze', async (req, res) => {
  try {
    const { lapTimes, telemetryData, questions } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Delta, a British F1 race engineer. Analyze the provided race data and answer questions with professional racing insights. Focus on lap time improvements, tire strategy, and racecraft.`
        },
        {
          role: 'user',
          content: `Please analyze this race data:

Lap Times: ${JSON.stringify(lapTimes)}
Final Telemetry: ${JSON.stringify(telemetryData)}

Questions: ${questions || 'Provide general race analysis and improvement suggestions.'}`
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    res.json({
      analysis: completion.choices[0].message.content,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Analysis endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze race data',
      details: error.message 
    });
  }
});

// Start telemetry server
telemetryServer.start()
  .then(() => {
    console.log('🏁 GT7 Telemetry server started successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to start telemetry server:', error);
  });

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 GT7 Engineer Backend running on port ${PORT}`);
  console.log(`📊 Telemetry: http://localhost:${PORT}/telemetry`);
  console.log(`🎤 Ephemeral: http://localhost:${PORT}/ephemeral`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down GT7 Engineer Backend...');
  telemetryServer.stop();
  process.exit(0);
}); 