# GT7 Racing Engineer - OpenAI Realtime Edition

A modern voice-powered racing engineer for Gran Turismo 7 using OpenAI's Realtime API. Get real-time coaching from "Delta," your British F1 race engineer, with sub-350ms voice latency and live telemetry integration.

## ✨ Features

- 🎤 **Voice-Powered Coaching**: Real-time voice interaction with OpenAI Realtime API
- 📊 **Live Telemetry**: GT7 UDP data integration at 20Hz
- 🏎️ **Racing HUD**: Beautiful React dashboard with telemetry visualization
- 🇬🇧 **Delta Engineer**: British F1-style race engineer personality
- 📱 **Mobile Ready**: PWA support for iPhone/iPad integration
- ⚡ **Low Latency**: Sub-350ms voice response time via WebRTC

## 🏗️ Architecture

```
GT7 Game → UDP Telemetry → Node.js Backend → OpenAI Realtime API
                ↓                    ↓
         React Frontend ← WebSocket ← Express Server
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ with npm
- **OpenAI API Key** with Realtime API access
- **Gran Turismo 7** with telemetry enabled

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Start the backend server
npm start
```

The backend will start on `http://localhost:3001` with these endpoints:
- 📊 `/telemetry` - GT7 telemetry data
- 🎤 `/ephemeral` - OpenAI Realtime session tokens
- 🔍 `/health` - Server health check
- 📝 `/analyze` - Post-race analysis

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The HUD will be available at `http://localhost:5173`

### 3. GT7 Configuration

1. **Enable Telemetry Output** in GT7:
   - Go to Settings → Network → GT7 Telemetry
   - Set IP to your computer's IP address
   - Set Port to `33740`
   - Enable telemetry

2. **Start Racing**:
   - Open the HUD in your browser
   - Press and hold the microphone button
   - Grant microphone permissions
   - Start racing and get real-time coaching!

## 🎮 Usage

### Voice Interaction

- **Press & Hold** the microphone button to talk to Delta
- **Green Light** = Connected to OpenAI Realtime API
- **Red Pulse** = Listening to your voice
- **Blue Pulse** = Delta is responding

### Example Interactions

- *"How are my lap times looking?"*
- *"What's my fuel situation?"*
- *"Are my tires overheating?"*
- *"How's my position in the race?"*

### Telemetry Data

The system automatically streams these metrics to Delta:
- Lap times and sector splits
- Fuel consumption and remaining
- Tire degradation estimates
- Current position and race progress
- Speed and RPM data

## 🔧 Configuration

### Backend Configuration

Edit `backend/config.example.js`:
```javascript
export const config = {
  openai: {
    apiKey: 'your_openai_api_key_here'
  },
  realtime: {
    model: 'gpt-4o-mini-realtime-preview-2024-12-17',
    voice: 'alloy',
    temperature: 0.7
  }
};
```

### Delta's Personality

The race engineer personality is defined in the OpenAI function schema:
- British F3 pit-wall professional
- Concise, no small talk during racing
- Prioritizes braking/gear advice when delta < 0.1s
- Monitors tire degradation and fuel strategy

## 📱 Mobile/Rig Setup

### iPhone/iPad
1. Open Safari and navigate to `http://your-pc-ip:5173`
2. Tap Share → Add to Home Screen
3. Launch as PWA for fullscreen experience

### Dedicated Rig Display
1. Use a Raspberry Pi with Chromium kiosk mode
2. Boot script: `chromium-browser --kiosk http://pc-ip:5173`
3. For USB displays, consider SimHub remote rendering

## 🎯 Model Strategy

| Use Case | Model | Latency | Cost | When |
|----------|-------|---------|------|------|
| Live Coaching | gpt-4o-mini-realtime | ~300ms | $0.15-0.6/M | During races |
| Guardrails | gpt-4.1-nano | <200ms | $0.10-0.4/M | Rate limiting fallback |
| Race Analysis | gpt-4.1-mini | ~1s | $0.40-1.6/M | Post-race debriefs |

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

### Testing with Mock Data
The backend automatically generates mock telemetry data when GT7 is not connected:
- Oscillating speed and RPM
- Decreasing fuel levels
- Random tire temperatures
- Simulated lap progression

## 🔍 Troubleshooting

### No Telemetry Data
1. Check GT7 telemetry settings
2. Verify IP address and port 33740
3. Check firewall settings
4. Look for UDP packets in backend logs

### Voice Connection Issues
1. Verify OpenAI API key is valid
2. Check microphone permissions in browser
3. Ensure HTTPS for production (required for WebRTC)
4. Check browser console for WebRTC errors

### Performance Issues
1. Close other applications using microphone
2. Use wired network connection for stability
3. Check browser CPU usage (Chrome DevTools)
4. Consider dedicated hardware for production

## 📦 Deployment

### Docker Deployment
```bash
# Build and run backend
docker build -t gt7-backend ./backend
docker run -p 3001:3001 -e OPENAI_API_KEY=your_key gt7-backend

# Build and serve frontend
cd frontend && npm run build
# Serve dist/ with nginx or similar
```

### Production Considerations
- Use HTTPS for WebRTC functionality
- Set up reverse proxy (nginx) for frontend
- Configure environment variables properly
- Monitor OpenAI API usage and costs

## 🎖️ Credits

- **Original GT7 Engineer** by Luca Collins
- **OpenAI Realtime API** integration
- **Gran Turismo 7** UDP telemetry format
- **React + ShadCN UI** components

## 📄 License

MIT License - see LICENSE file for details

---

*Ready to race with Delta? Start your engines! 🏁*
