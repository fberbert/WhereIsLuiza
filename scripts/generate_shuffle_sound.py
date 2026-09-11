"""Synthesize the game's cup-slide effect using only Python's standard library.

Run from any directory: python3 scripts/generate_shuffle_sound.py
Original procedural audio; no recordings or sound-bank assets are used.
360 ms mono PCM, with friction followed by a soft hollow cup tap.
"""

import math
from pathlib import Path
import random
import struct
import wave

SAMPLE_RATE = 44100
DURATION = 0.360
OUTPUT = Path(__file__).resolve().parents[1] / "android/app/src/main/res/raw/shuffle.wav"


def synthesize():
    rng = random.Random(20260908)
    filtered = 0.0
    samples = []
    for index in range(round(SAMPLE_RATE * DURATION)):
        t = index / SAMPLE_RATE
        # Band-limited friction, swelling gently as the cups slide.
        white = rng.uniform(-1.0, 1.0)
        filtered += 0.22 * (white - filtered)
        slide_position = min(t / 0.310, 1.0)
        slide_envelope = math.sin(math.pi * slide_position) ** 1.4
        texture = 0.8 + 0.2 * math.sin(2 * math.pi * 43 * t)
        slide = filtered * slide_envelope * texture * 0.48
        # Damped, inharmonic resonances suggest a lightweight hollow cup.
        elapsed = t - 0.292
        tap = 0.0
        if elapsed >= 0:
            attack = min(elapsed / 0.002, 1.0)
            for frequency, amplitude, decay in ((470, 0.32, 55), (1120, 0.13, 85), (1870, 0.06, 120)):
                tap += amplitude * math.sin(2 * math.pi * frequency * elapsed) * math.exp(-decay * elapsed)
            tap *= attack
        fade_out = min((DURATION - t) / 0.014, 1.0)
        samples.append((slide + tap) * fade_out)
    peak = max(abs(sample) for sample in samples)
    return [round(sample / peak * 0.5 * 32767) for sample in samples]


if __name__ == "__main__":
    samples = synthesize()
    with wave.open(str(OUTPUT), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(struct.pack(f"<{len(samples)}h", *samples))
    print(f"Generated {OUTPUT.name}: {DURATION:.3f}s, mono PCM16, {SAMPLE_RATE} Hz")
