# GT7 Race Engineer

A Discord-based real-time racing engineer assistant for GT7 that uses OpenAI and telemetry data to provide radio-style updates and respond to voice commands.

## Features

- **Live Telemetry Alerts**: Automatic updates for laps, fuel levels (50%, 20%, 10%), and overtakes (with cooldown).
- **Voice Commands**: Speak a trigger phrase (`Radio`) followed by your question to get stats: fuel, tires, position, laps, etc.
- **Radio Filter**: Audio processing to simulate a walkie‑talkie engineer voice.
- **Customizable**: Change the driver name and conversation style in `GT7_Radio_GenAI.py`.
- **GUI Launcher**: A simple Tkinter frontend with your custom image, displaying live logs.

## Repository Structure

```
├── gui_launcher.py        # GUI wrapper showing image.png and live logs
├── launcher.py            # Telemetry connector and error popup
├── GT7_Radio_GenAI.py     # Main bot logic and voice handling
├── image.png              # Custom image for GUI banner
├── Radio/                 # Static audio snippets (start/end hiss)
├── recordings/            # Temporary voice captures
├── telemetry_server.py    # PS5 telemetry listener
├── .env                   # Contains DISCORD_TOKEN, OPENAI_API_KEY
└── README.md              # (You are here)
```

## Installation

1. Clone this repository:  
   ```bash
   git clone https://github.com/baruta1/gt7-race-engineer.git
   cd gt7-race-engineer
   ```

2. Create & activate a Conda environment (or virtualenv):  
   ```bash
   python -m venv venv
   source venv/bin/activate  # macOS/Linux
   venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

3. Save tokens in `.env` and set your keys:  
   ```ini
   DISCORD_TOKEN=your_discord_bot_token
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

1. **Run** the GUI launcher (shows your `image.png` and live logs):  
   ```bash
   python gui_launcher.py
   ```
2. The app will **auto‑retry** connecting to your PS5 telemetry. After 3 failures, a popup will prompt to check your network/Wi‑Fi.
3. Once connected, the Discord bot logs in. On Discord, **join a voice channel** and type:
   ```
   !engineer
   ```
   The engineer will join your channel.

4. **During the race**:
   - **Automatic** status: lap summaries, fuel alerts, and overtakes.
   - **On‑demand**: say “**Radio, …**” and ask questions (fuel, tires, lap info).

## Configuration

- **Driver Name**: Edit `driver_name` in `GT7_Radio_GenAI.py`.
- **Trigger Phrases**: Currently, the trigger word is "Radio" (I added Video and Really as the interpreter will hear this when "Radio" is mentioned sometimes") or customize `TRIGGER_PHRASE` with regex.

## Dependencies

- Python 3.10+
- Discord.py & voice_recv
- OpenAI Python SDK
- Whisper / faster-whisper
- TTS (Coqui TTS)
- Pydub, ffmpeg
- tkinter, pillow

## Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/awesome`.
3. Commit your changes: `git commit -m "Add awesome feature"`.
4. Push: `git push origin feature/awesome`.
5. Open a Pull Request. Feedback and issues welcome!

## License

MIT © Your Name
