You are going to help me fix my AI Assisted HUD for Gran Turismo 7. 
Please do some research online, understand everything about GT7 telemetry, SimHub, and the Voice Agent. Then, fix our codebase. 
Every script that needs to be updated must be updated by you in full. Do not do partial work. 

--- 
The original code which connected to the Gran Turismo 7 Telemetry data can be found in the root of the folder and the primary files were: /GT7_Radio_GenAI.py, /gui_launcher.py, launcher.py and /telemetry_server.py.

I then built a new version with a /backend and /frontend in @/backend @/frontend . 

I can see the backend running but there's a few issues, of which: 
    
    1. The frontend "race info" is super jittery and alters every millisecond with odd data. 
    The Speed, RPM and Gear are not showing me the actual figures i see in Gran Turismo. 
    We need to tie the frontend to the actual data correctly and in a smooth way. 

    2. I have the OpenAI Realtime API agent integrated because we should be able to click the microphone button and then talk to the agent who will see the telemetry data. Look at the old original code to see how it was done but we must use the newer realtime LLM model.
    
    3. The blackened telemetry is showing wonky numbers like speed 400kmh when im actually doing 25kmh. It shows 0rpm but im at 5600 in the game. Even the lap number is completely off. 
    
    4. The race engineer voice agent does not seem to work at all. We must fix this properly. 

---
When I go to "http://localhost:3001/telemetry" i see data like this: 
{"connected":true,"current_lap":200,"total_laps":200,"position":20,"fuel_pct":2.2702905653095335e-52,"speed_kph":400,"engine_rpm":9.132028466751763e-10,"last_lap_time_ms":0,"best_lap_time_ms":0,"delta_ms":0,"tire_temps":{"fl":5537752053448704,"fr":54211306458286390000,"rl":-3.5630771210836265e-37,"rr":-2.9693093585711365e-18},"oil_pressure":-9.938474369618685e-24,"water_temp":-8027382,"oil_temp":-410200448,"total_cars":36,"is_loading":false,"timestamp":"2025-07-04T23:17:47.348Z"}

Then, my frontend app shows:
"Telemetry
Speed

352

km/h

RPM

8k

Gear

1

High Speed Warning • RPM Redline

Race Info
Lap: 200/200
Position: 20/234
Fuel: 100%
Best Lap: 0:00.000
Race Engineer
Disconnected

Click to connect to Delta
"



----

Extra info:
Console when I run the frontend: "
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
 Telemetry error: 
onError @ RacingHUD.tsx:33
(anonymous) @ useTelemetry.ts:144
 Voice agent status: disconnected
 Voice agent status: disconnected
  GET http://localhost:3001/telemetry net::ERR_CONNECTION_REFUSED
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
  GET http://localhost:3001/telemetry net::ERR_CONNECTION_REFUSED
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
 Telemetry error: 
onError @ RacingHUD.tsx:33
(anonymous) @ useTelemetry.ts:144
 Voice agent status: disconnected
 Voice agent status: disconnected
  GET http://localhost:3001/telemetry net::ERR_CONNECTION_REFUSED
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
 Telemetry error: 
onError @ RacingHUD.tsx:33
(anonymous) @ useTelemetry.ts:144
 Voice agent status: disconnected
 Voice agent status: disconnected
  GET http://localhost:3001/telemetry net::ERR_CONNECTION_REFUSED
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
 Voice agent status: disconnected
  GET http://localhost:3001/telemetry net::ERR_CONNECTION_REFUSED
(anonymous) @ useTelemetry.ts:65
(anonymous) @ useTelemetry.ts:136
 Telemetry error: 
onError @ RacingHUD.tsx:33
(anonymous) @ useTelemetry.ts:144
 Voice agent status: disconnected
"

---

# IMPORTANT DETAILS:

### Connection Information:

The PlayStation 5 running GT7: 
- IP Address is 255.255.255.255
- Port is 33740

SimHub which will be forwarding the Telemtry data to us:
- Forward Port: 33742
- Forward IP: 10.0.1.62

In essence, SimHub running on a Windows PC is capturing the telemetry from the PS5 and forwarding everything to Port 33742 with IP 10.0.1.62 (which matches the Mac laptop we are building this app on)