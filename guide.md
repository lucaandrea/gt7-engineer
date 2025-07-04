I need you to improve our app. 

Please do some research online, understand everything about GT7 telemetry, SimHub, and the Voice Agent. Then, fix our codebase. Every script that needs to be updated must be updated by you in full. Do not do partial work. 


--- 
The original code which connected to the Gran Turismo 7 Telemetry data can be found in /GT7_Radio_GenAI.py /gui_launcher.py /launcher.py and /telemetry_server.py . 

I then built a new version with a backend and frontend in @/backend @/frontend . 

I can see the backend running but there's a few issues, of which: 

1. The frontend "race info" is super jittery and alters every millisecond with odd data. 
The Speed, RPM and Gear are not showing me the actual figures i see in Gran Turismo. 
We need to tie the frontend to the actual data correctly and in a smooth way. 

2. I have the OpenAI Realtime API agent integrated because we should be able to click the microphone button and then talk to the agent who will see the tele	mtry data. Look at the old original code to see how it was done but we must use the newer LLM models we have now. 

---

When I go to "http://localhost:3001/telemetry" i see data like this: {"connected":true,"current_lap":200,"total_laps":200,"position":20,"fuel_pct":100,"speed_kph":400,"engine_rpm":12000,"last_lap_time_ms":0,"best_lap_time_ms":0,"delta_ms":0,"tire_temps":{"fl":111.45444242589497,"fr":116.1978536461367,"rl":101.73610519560424,"rr":99.77026019604214},"oil_pressure":4.403812116170459,"water_temp":90.93574850221701,"oil_temp":94.5419863646125,"total_cars":20,"is_loading":false,"timestamp":"2025-07-04T21:08:04.568Z"}


My frontend app shows: "Telemetry
Speed

305

km/h

RPM

6k

Gear

1

High Speed Warning

Race Info
Lap: 200/200
Position: 20/20
Fuel: 100%
Best Lap: 0:00.000
Race Engineer
Disconnected
Failed to create session: Internal Server Error


Click to connect to Delta
"

----

The issues: 
1. The blackened telemetry is showing wonky numbers like speed 400kmh when im actually doing 25kmh. It shows 0rpm but im at 5600 in the game. Even the lap number is completely off. 
2. The frontend is so jittery and shows numbers that make no sense. The RPM keeps going from 0 to 3500 to 0 to 9000 etc and same with speed and other numbers. 
3. The race engineer voice agent does not seem to work at all. We must fix this properly. 

---


Extra info:
Console when I run the frontend: "Telemetry
Speed

305

km/h

RPM

6k

Gear

1

High Speed Warning

Race Info
Lap: 200/200
Position: 20/20
Fuel: 100%
Best Lap: 0:00.000
Race Engineer
Disconnected
Failed to create session: Internal Server Error


Click to connect to Delta
"

---

NOTE: I am giving you only the code I thought was relevant. The old files which inspired the project are in the root and are: "/g7/GT7_Radio_GenAI.py,
/g7/gui_launcher.py
/g7/launcher.py
/g7/telemetry_server.py "