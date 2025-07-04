# GT7 Engineer Setup Guide

## Issues Fixed

### 1. Telemetry Data Mapping
- **Problem**: Wrong UDP packet offsets causing incorrect speed, RPM, and lap data
- **Solution**: Updated `telemetry-server.js` with correct GT7 packet structure offsets
- **Result**: Accurate telemetry data now displayed in frontend

### 2. Frontend Jitter
- **Problem**: Too frequent polling (100ms) causing jittery display
- **Solution**: Reduced polling to 200ms (5Hz) and increased data smoothing
- **Result**: Smoother, more stable telemetry display

### 3. OpenAI Realtime API Integration
- **Problem**: Incorrect WebSocket authentication for ephemeral sessions
- **Solution**: Fixed authentication protocol using client_secret in WebSocket subprotocol
- **Result**: Voice agent now connects properly

### 4. UDP Port Configuration
- **Problem**: Using wrong port (33742) instead of standard GT7 port
- **Solution**: Changed to port 33740 for direct GT7 connection
- **Result**: Better compatibility with GT7 telemetry output

## Setup Instructions

### Prerequisites
1. Gran Turismo 7 running on PS5
2. PS5 and computer on same network
3. Node.js 18+ installed
4. OpenAI API key

### GT7 Configuration
1. In GT7, go to **Settings > Network**
2. Enable **Telemetry** 
3. Note your PS5's IP address

### Backend Setup
1. Navigate to `backend/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create config file:
   ```bash
   cp config.example.js config.js
   ```
4. Edit `config.js` and update:
   - `ps5IpAddress`: Your PS5's IP address
   - `openai.apiKey`: Your OpenAI API key
5. Test GT7 connection:
   ```bash
   node test-gt7-connection.js
   ```
6. Start the backend:
   ```bash
   npm start
   ```

### Frontend Setup  
1. Navigate to `frontend/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

### Testing
1. Open GT7 and start a race
2. Visit `http://localhost:3001/telemetry` to verify data
3. Open frontend at `http://localhost:5173`
4. Click microphone button to test voice agent

## Network Configuration

The application expects your PS5 to be at `10.0.1.62`. Update this in:
- `backend/config.js` 
- `backend/test-gt7-connection.js` (for testing)

## Troubleshooting

### No Telemetry Data
- Verify GT7 telemetry is enabled in settings
- Check PS5 IP address is correct
- Ensure UDP port 33740 is not blocked by firewall
- Run `test-gt7-connection.js` to debug

### Voice Agent Not Working
- Check OpenAI API key is valid
- Verify microphone permissions in browser
- Check browser console for WebSocket errors

### Frontend Shows Mock Data
- Backend falls back to mock data after 30 seconds if no real packets received
- This is normal for testing without GT7 running

## Architecture

```
GT7 (PS5) → UDP:33740 → Backend → HTTP API → Frontend
                                     ↓
                              OpenAI Realtime API
```

The backend receives UDP telemetry from GT7, processes it, and serves it via HTTP API to the frontend. The voice agent connects to OpenAI's Realtime API for live voice interaction during racing.