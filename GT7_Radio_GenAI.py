import nest_asyncio
nest_asyncio.apply()

import os
import asyncio
import discord
from discord.ext import commands, voice_recv
from dotenv import load_dotenv
from datetime import datetime
from openai import OpenAI
import whisper
#import edge_tts
from discord import FFmpegPCMAudio
from pydub import AudioSegment, effects
import aiohttp
import async_timeout
from telemetry_server import TelemetryServer
from pydub.effects import low_pass_filter, high_pass_filter
from pydub.generators import WhiteNoise
from TTS.api import TTS
from gt_telem import TurismoClient
from gt_telem.events import GameEvents, RaceEvents
import re
import re
import inflect
from faster_whisper import WhisperModel
import os
import time
import subprocess

# allow duplicate OpenMP runtimes (unsafe, but gets you running)
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


# Initialize inflect engine
p = inflect.engine()


# Driver Name
driver_name = "Jane Doe"
TRIGGER_PHRASE = "radio|really|video"

# MAIN PROMPT 
MAIN_PROMPT =  (
    f"You are a witty and snarky British formula 1 engineer for a driver named  {driver_name}. "
    f"You speak in short sentences, and don't waste time while racing. Do not use emojis or symbols. {driver_name} is your friend so bantar is welcome"
    f"Just ensure to end on a punctuation always and speak in concise, complete sentences."
    )


class QuietFFmpegPCMAudio(FFmpegPCMAudio):
    def __init__(self, source, **kwargs):
        if 'before_options' not in kwargs:
            kwargs['before_options'] = ''
        if 'options' not in kwargs:
            kwargs['options'] = '-vn'
        
        # Inject creationflags to suppress console window on Windows
        self.creationflags = subprocess.CREATE_NO_WINDOW
        
        super().__init__(source, **kwargs)
        
def apply_radio_filter(audio: AudioSegment) -> AudioSegment:
    # Step 1: Extremely narrow bandpass to simulate walkie-talkie frequency
    filtered = high_pass_filter(audio, cutoff=500)
    filtered = low_pass_filter(filtered, cutoff=3000)

    # Step 2: Add brutal compression to flatten dynamics
    filtered = effects.compress_dynamic_range(filtered, threshold=-30.0, ratio=10.0)

    # Step 3: Bitcrush simulation (reduce bitrate fidelity)
    filtered = filtered.set_sample_width(1)  # reduce to 8-bit depth

    # Step 4: Add stronger static for a gritty texture
    noise = WhiteNoise().to_audio_segment(duration=len(filtered), volume=-60)
    filtered = filtered.overlay(noise)

    # Step 5: Apply band-limited EQ feel (resample to 8000 Hz)
    filtered = filtered.set_frame_rate(8000).set_channels(1)
    filtered = effects.normalize(filtered)

    return filtered



# ─── Setup ─────────────────────────────────────────────
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

#model = whisper.load_model("small")
model = WhisperModel("tiny", compute_type='int8')

bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

os.makedirs("recordings", exist_ok=True)
os.makedirs("tts", exist_ok=True)


# ___ Radio ________________
#telemetry = TelemetryServer()
#telemetry.start()
prev_lap = None
has_initialized_position = False
last_fuel_alert = 100
prev_position = None          # for overtake detection
last_pos_call = 0             # throttle radio spam (seconds)
prev_best_ms  = None          # track best‑lap improvement
race_started = False    # becomes True on on_race_start
radio_paused = True     # start muted until race actually begins
voice_conn   = None     # populated once we have the Discord VC
announced_fuel_levels = set()
# ─── TTS and Transcription ─────────────────────────────

pssh = AudioSegment.from_file("Radio/Start.FLAC")[:500]  # last 500ms of static
end = AudioSegment.from_file("Radio/End1.wav")[:500]  # last 500ms of static
pssh = pssh.set_channels(1).apply_gain(-8)

# Load Model
TTS_MODEL = TTS(model_name="tts_models/en/vctk/vits")


async def synthesize_response(text, filename="engineer", retries=3, timeout_sec=10):
    text = re.sub(r"P(\d+)",replace_p_with_words,text)
    path = f"tts/{filename}.mp3"
    
    for attempt in range(retries):
        try:
            print(f"🗣️ TTS attempt {attempt + 1}...")

            async with async_timeout.timeout(timeout_sec):
                #communicate = edge_tts.Communicate(text=text, voice="en-GB-RyanNeural")
                TTS_MODEL.tts_to_file(text=text,speaker="p226", file_path=path)
                #await communicate.save(path)
            
            # Make sure file exists before editing
            if not os.path.exists(path):
                raise FileNotFoundError("TTS output file not found after generation.")
            
            # Speed up playback
            audio = AudioSegment.from_file(path)
            #faster = audio.speedup(playback_speed=1.15)
            audio = audio.set_channels(1)
            radio_voice = apply_radio_filter(audio)
            # Combine: [pssh][speech][pssh]
            radio_audio =  end + radio_voice+pssh

            # Export
            radio_audio.export(path, format="mp3")

    
            #faster.export(path, format="mp3")

            return path
        
        except (aiohttp.ClientConnectorError, FileNotFoundError, TimeoutError) as e:
            print(f"❌ TTS attempt {attempt + 1} failed: {e}")
            await asyncio.sleep(1)  # Short delay before retry

    print("❌ All TTS attempts failed. No audio response will be played.")
    return None

    
async def transcribe_audio(path):
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        print(f"⚠️ Skipping empty or invalid audio file: {path}")
        return ""

    try:
        loop = asyncio.get_event_loop()
        #result = await loop.run_in_executor(None, lambda: model.transcribe(path))
        #return result["text"].strip().lower()
        #return result["text"].strip().lower()
        segments, info = await loop.run_in_executor(None, lambda: model.transcribe(path, beam_size=5, language="en"))
        text = " ".join([seg.text for seg in segments])
        return text.strip().lower()
    except Exception as e:
        print(f"❌ Failed to transcribe {path}: {e}")
        return ""
    



def starts_with_trigger(text):
    return re.match("radio|really|video", text.strip().lower())

def ms_to_min_sec(ms: int) -> tuple[int, int]:
    """Return (minutes, seconds) for a duration given in milliseconds."""
    seconds_total = ms // 1000               # drop the milliseconds part
    minutes, seconds = divmod(seconds_total, 60)
    return (f"{minutes} minutes and {seconds} seconds")  


def to_milliseconds(time_str: str) -> int:
    """
    Convert strings like '3 minutes and 17 seconds' to milliseconds.
    """
    # 1. Pull out the numbers with a simple regex
    match = re.fullmatch(r'\s*(\d+)\s+minutes?\s+and\s+(\d+)\s+seconds?\s*', time_str)
    if not match:
        raise ValueError(f"Unsupported format: {time_str}")
    
    minutes, seconds = map(int, match.groups())

    # 2. Convert to ms
    return (minutes * 60 + seconds) * 1000
#  Latest telemetry data:
def latest_telemetry_data():
    t = telemetry.get_latest()
    if not t:
        return None

    curr_lap    = t.current_lap
    total_laps  = t.total_laps
    last_lap_ms = t.last_lap_time_ms

    return {
        "current_lap": curr_lap,
        "position": t.race_start_pos,
        "total_laps": total_laps,
        "lap_time_ms": ms_to_min_sec(last_lap_ms),
        "fuel_pct": (t.fuel_level / t.fuel_capacity) * 100,
        "speed_kph": t.speed_mps * 3.6,
        "engine_rpm": int(t.engine_rpm),
        "total_cars": t.total_cars,
        "tire_fl_temp": t.tire_fl_temp,
        "tire_fr_temp": t.tire_fr_temp,
        "tire_rl_temp": t.tire_rl_temp,
        "tire_rr_temp": t.tire_rr_temp,
        "oil_pressure": t.oil_pressure,
        "water_temp": t.water_temp,
        "oil_temp": t.oil_temp,
        "best_lap_time_ms": ms_to_min_sec(t.best_lap_time_ms),   # NEW
    }



        
async def play_line(vc, text, cache_tag):
    """TTS + play, but only if radio is ‘live’"""
    if radio_paused or not race_started or not vc or not vc.is_connected():
        return
    try:
        mp3 = await synthesize_response(text, filename=cache_tag)
        if mp3:
            vc.play(QuietFFmpegPCMAudio(mp3))
            while vc.is_playing():
                await asyncio.sleep(0.1)
    except Exception as e:
        print(f"Radio line failed ({cache_tag}): {e}")



def replace_p_with_words(match):
    number = int(match.group(1))
    word = p.number_to_words(number)
    return f"pee {word}"
   

# ─── helper for overtakes ──────────────────────────────────
async def maybe_handle_overtake(vc, latest):
    global prev_position, last_pos_call, has_initialized_position
    
    curr_pos = latest.race_start_pos


    # Don't check for overtakes until after lap 2 and position is initialized
    if not has_initialized_position:
        if latest.current_lap >= 2:
            prev_position = curr_pos
            has_initialized_position = True
        return            
            # only after lap 2, with an 60s cooldown
    if latest.current_lap >= 2 and prev_position is not None and curr_pos != prev_position:
        if time.time() - last_pos_call > 45:
            # build your prompt
            flavour = "gained a place" if curr_pos < prev_position else "lost a place"
            stats = latest_telemetry_data()
            prompt =MAIN_PROMPT+ (f" The driver just {flavour} "
                f"(from P{prev_position} to P{curr_pos}). In 10 words or fewer, quip about it. Stats for the car are: {stats}"
                f"Be sure to also mention what place they are now in, like P one (please leave a space between the P and the number of their place). Keep things short, no more than 10 words total!"
            )
            msg = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": prompt}]
            ).choices[0].message.content
            await play_line(vc, msg, "overtake")
            last_pos_call = time.time()

    prev_position = curr_pos
    
# ─── helper for lap updates ───────────────────────────────
async def maybe_handle_lap_update(vc, latest):
    global prev_lap
    global prev_best_ms
    lap = latest.current_lap
    total = latest.total_laps

    # skip lap 1 and after the race is done
    if lap is None or lap == 1  :
        return
    
    if lap==prev_lap:
        return 
    stats = latest_telemetry_data()
    if ( lap > total) & (total!=0):
        prompt = MAIN_PROMPT+(
        f" The car stats at this moment in the race are as follows: {stats} "
            f"The race just finished. Congratulate the driver. "
            f"Give the driver a one or super‑short sentence update on the race, and what position they got."
        )        
    else:
        prompt = MAIN_PROMPT+(
        f" The car stats at this moment in the race are as follows: {stats} "
            f"We are on lap {lap} of {total}. "
            f"Give the driver a one or two super‑short sentence update."
        )
    if latest and latest.best_lap_time_ms != -1:
        if prev_best_ms is None or latest.best_lap_time_ms < to_milliseconds( prev_best_ms):
            prev_best_ms = stats["best_lap_time_ms"]
            stats = latest_telemetry_data()
            prompt += f" And please tell the driver they just set a new best lap of {prev_best_ms} ms. "
    summary = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": prompt}]
    ).choices[0].message.content
    await play_line(vc, summary, "lap_update")
    prev_lap = lap
    
# ─── Core Voice Handling ───────────────────────────────

async def handle_engineer_flow(vc):
    """
    • Radio stays muted until we *know* the race has begun
      (lap counter becomes 1 or higher).
    • Whenever GT7 reports is_loading or is_paused the radio is muted and
      any sound that is still playing is stopped immediately.
    """

    global race_started, radio_paused, prev_lap,prev_position,prev_best_ms,last_fuel_alert,last_pos_call
    idle_path = "recordings/idle.wav"

    while vc.is_connected():
        # ── Telemetry‑driven radio state ─────────────────────
        # ── Telemetry‑driven radio state ─────────────────────
        t = telemetry.get_latest()

        # game is “paused / menu / loading” when …
        sim_paused = (
            t is None                          # no packet yet
            or t.is_loading
            or t.cars_on_track == 0            # back in menu after race
        )

        if prev_lap!=None:
            if( t.total_laps<prev_lap) & (t.total_laps!=0):
                sim_paused = True

        # ── 0.  detect race FINISH ───────────────────────────
        # when we were in‑race and now cars disappeared or menu opened
        if ((t.total_cars==-1) and sim_paused) :
            await play_line(
                vc,
                "Solid stint – see you in the garage, we’ll debrief later.",
                "race_finish",
            )
            # full reset so the next on_in_race gives a fresh intro
            race_started  = False
            radio_paused  = True
            prev_lap      = None
            prev_position = None
            prev_best_ms  = None
            last_fuel_alert = 100
            print("🏁 Race finished – radio reset")
            # do *not* return; we’ll remain in the loop waiting
            # for the next session to start
        
        # ── 1.  enter pause / menu ───────────────────────────
        if sim_paused and not radio_paused:
            radio_paused = True
            if vc.is_playing():
                vc.stop()
            print("🔇 Radio muted (sim paused / menu)")

        # ── 2.  leave pause / menu (race already started) ───
        if (not sim_paused) and radio_paused and race_started:
            radio_paused = False
            print("🎙️ Radio live again")

        # ── 3.  “official” on_in_race trigger  ───────────────
        # GT‑telem fires on_in_race when lap counter first becomes 0.
        if (not sim_paused) and (not race_started) and t and t.current_lap == 0:
            race_started, radio_paused = True, False
            print("🟢 on_in_race detected – radio live")
            await play_line(
                vc,
                "Engineer here — radio check, good luck out there!",
                "intro_start",
            )

        
        # ── 4.  still muted or waiting? – sleep & loop ───────
        if radio_paused or not race_started:
            await asyncio.sleep(1)
            continue
        
        
        # clear out any old recording so we only ever transcribe the new one
        if os.path.exists(idle_path):
            os.remove(idle_path)
        
        vc.stop_listening()
        # Record short clip
        sink = voice_recv.WaveSink(idle_path)
        vc.listen(sink)
        await asyncio.sleep(5)
        vc.stop_listening()

        if not os.path.exists(idle_path):
            continue
        #user_text = transcribe_audio(idle_path)
        user_text = await transcribe_audio(idle_path)
        print("🗣️ You said:", user_text)
        
        
        # telemetry-based triggers
        latest = telemetry.get_latest()        
        
        #if not starts_with_trigger(user_text):
        #    continue
        
        if starts_with_trigger(user_text): 
            vc.play(QuietFFmpegPCMAudio("Message_Received.wav", options="-filter:a volume=0.2"))
            while vc.is_playing():
                await asyncio.sleep(0.2)
            print("You are here in the loop")
            query = re.sub(r"^radio|^really|^video","", user_text.strip().lower()).strip()
            user_text = ""
            print("🎤 Engineer Triggered Phrase:", query)
    
            stats = latest_telemetry_data()
            system_prompt = MAIN_PROMPT+(
                f" The car stats now in the race are as follows: {stats} "
                f"Answer the driver's question as if on the radio. Be as short and concise as possible! Time and speed matter. "
                f"Their question: {query}"
            )
            if not query:
                reply = "Loud and clear. Standing by for your next instruction."
            else:
                reply = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": query}
                    ]
                ).choices[0].message.content
    
            print("🤖 Engineer:", reply)
            
            try:
                tts_path = await synthesize_response(reply, "engineer_response")
                vc.play(QuietFFmpegPCMAudio(tts_path))
                while vc.is_playing():
                    await asyncio.sleep(0.2)
            except Exception as e:
                print(f"❌ TTS failed — no audio response. Reason: {e}")
            continue
        await maybe_handle_overtake(vc, latest)
        await maybe_handle_lap_update(vc, latest)
        await maybe_announce_fuel(vc)


async def maybe_announce_fuel(vc):
    global announced_fuel_levels
    t = telemetry.get_latest()
    if not t:
        return

    fuel_pct = int((t.fuel_level / t.fuel_capacity) * 100)

    for thresh in list(announced_fuel_levels):
        if fuel_pct > thresh:
            announced_fuel_levels.remove(thresh)
    # Only react at exact thresholds (30, 20, 10) and not if already announced
    critical_levels = [50, 20, 10]
    for level in critical_levels:
        if fuel_pct <= level and level not in announced_fuel_levels:
            announced_fuel_levels.add(level)
            
            stats = latest_telemetry_data()
            system_prompt = MAIN_PROMPT + (
                f" The car's current data is: {stats}.  "
                f"Fuel just dropped below {fuel_pct}%." 
                f"Tell them their fuel level. Make a short quip, but actually give the driver the percentage of fuel they have left. Keep your response ultra short!"
            )

            reply = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt}
                ]
            ).choices[0].message.content
            
            print(f"⛽ Fuel Alert {level}%: {reply}")
            try:
                tts_path = await synthesize_response(reply, f"fuel_{level}")
                vc.play(QuietFFmpegPCMAudio(tts_path))
                while vc.is_playing():
                    await asyncio.sleep(0.05)
            except Exception as e:
                print(f"❌ Fuel TTS failed: {e}")
            break  # avoid multiple alerts in the same cycle
                
            
# ─── Bot Commands ──────────────────────────────────────

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")


@bot.command()
async def engineer(ctx):
    if not ctx.author.voice:
        return await ctx.send("❌ Join a voice channel first!")

    global voice_conn
    channel = ctx.author.voice.channel
    vc = await channel.connect(cls=voice_recv.VoiceRecvClient)
    voice_conn = vc                       # <- save for event handlers
    await ctx.send("🎧 Engineer connected — waiting for race start …")

    
    # DO NOT play intro here; wait for on_race_start
    await handle_engineer_flow(vc)
    
    
def run_with_telemetry(telemetry_server):
    global telemetry
    telemetry = telemetry_server
        
    bot.run(TOKEN)
