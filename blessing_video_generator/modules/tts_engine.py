"""
TTS engine — uses edge-tts to generate Chinese voiceover audio.
"""
import asyncio
import os
from typing import List, Tuple

from .config import ensure_dir

DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"


def generate_tts(
    sentences: List[str],
    output_dir: str = None,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> Tuple[str, List[dict]]:
    if output_dir is None:
        output_dir = os.path.join(os.environ.get("TEMP", os.path.expanduser("~")), "blessing_tts")
    ensure_dir(output_dir)

    full_text = "。".join(sentences) + "。"
    output_path = os.path.join(output_dir, "voiceover.mp3")

    try:
        _run_edge_tts(full_text, output_path, voice, rate, pitch)
    except Exception as e:
        print(f"[语音合成] edge-tts 失败 ({e})，使用备用方法")
        return _fallback_tts(sentences, output_dir)

    subtitles_path = os.path.join(output_dir, "voiceover.srt")
    try:
        _run_edge_tts_with_srt(full_text, output_path, subtitles_path, voice, rate, pitch)
        segments = _parse_srt(subtitles_path)
        mapped = _map_segments_to_sentences(segments, sentences)
    except Exception:
        mapped = _estimate_segments(sentences, output_path)

    return output_path, mapped


def _run_edge_tts(text: str, output_path: str, voice: str, rate: str, pitch: str):
    async def _do():
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(output_path)
    asyncio.run(_do())


def _run_edge_tts_with_srt(text: str, output_path: str, srt_path: str, voice: str, rate: str, pitch: str):
    async def _do():
        import edge_tts
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        submaker = edge_tts.SubMaker()
        with open(output_path, "wb") as f:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    f.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    submaker.feed(chunk)
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(submaker.generate_srt())
    asyncio.run(_do())


def _parse_srt(srt_path: str) -> List[dict]:
    segments = []
    if not os.path.exists(srt_path):
        return segments
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    blocks = content.strip().split("\n\n")
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) >= 3:
            try:
                time_line = lines[1]
                parts = time_line.split(" --> ")
                start = _srt_time_to_seconds(parts[0])
                end = _srt_time_to_seconds(parts[1])
                text = " ".join(lines[2:])
                segments.append({"index": len(segments), "text": text, "start": start, "end": end})
            except (IndexError, ValueError):
                continue
    return segments


def _srt_time_to_seconds(srt_time: str) -> float:
    srt_time = srt_time.replace(",", ".")
    parts = srt_time.split(":")
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])


def _map_segments_to_sentences(segments: List[dict], sentences: List[str]) -> List[dict]:
    if not segments:
        return _estimate_segments(sentences, None)
    result = []
    for sent_idx, sentence in enumerate(sentences):
        start_time = None
        end_time = None
        for seg in segments:
            txt = seg.get("text", "")
            if sentence in txt or txt in sentence:
                if start_time is None:
                    start_time = seg["start"]
                end_time = seg["end"]
        if start_time is not None:
            result.append({"index": sent_idx, "text": sentence, "start": start_time, "end": end_time})
        else:
            result.append({"index": sent_idx, "text": sentence, "start": 0, "end": 0})
    if not any(r["start"] > 0 for r in result):
        return _estimate_segments(sentences, None)
    return result


def _estimate_segments(sentences: List[str], audio_path: str) -> List[dict]:
    total_chars = sum(len(s) for s in sentences)
    total_duration = total_chars / 4.0
    total_duration = max(total_duration, len(sentences) * 2.0)
    if audio_path and os.path.exists(audio_path):
        try:
            from moviepy import AudioFileClip
            clip = AudioFileClip(audio_path)
            total_duration = clip.duration
            clip.close()
        except Exception:
            pass
    char_weights = [len(s) for s in sentences]
    total_weight = sum(char_weights)
    current_time = 0.0
    segments = []
    for i, sentence in enumerate(sentences):
        weight = char_weights[i] / total_weight if total_weight > 0 else 1.0 / len(sentences)
        duration = total_duration * weight
        segments.append({"index": i, "text": sentence, "start": current_time, "end": current_time + duration})
        current_time += duration
    return segments


def _fallback_tts(sentences: List[str], output_dir: str) -> Tuple[str, List[dict]]:
    import wave
    import struct
    output_path = os.path.join(output_dir, "voiceover_silent.wav")
    sample_rate = 44100
    duration = max(len(sentences) * 4.0, 10.0)
    num_samples = int(sample_rate * duration)
    with wave.open(output_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for _ in range(num_samples):
            wf.writeframes(struct.pack("<h", 0))
    segments = _estimate_segments(sentences, output_path)
    return output_path, segments
