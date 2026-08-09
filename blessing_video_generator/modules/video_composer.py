"""
Video composer — uses MoviePy to assemble the final video.
"""
import os
from typing import List, Tuple

from moviepy import (
    ImageClip, TextClip, CompositeVideoClip, AudioFileClip,
    concatenate_videoclips, CompositeAudioClip
)
from moviepy.video.fx import Resize, FadeIn, FadeOut

from .config import VIDEO_CONFIG, get_output_path


def _make_ken_burns_clip(image_path: str, duration: float, target_size: Tuple[int, int]) -> ImageClip:
    clip = ImageClip(image_path, duration=duration)
    img_w, img_h = clip.size
    target_w, target_h = target_size
    scale_w = target_w / img_w
    scale_h = target_h / img_h
    scale = max(scale_w, scale_h) * 1.05
    clip = clip.resized(scale)
    clip = clip.with_position(("center", "center"))
    zoom_end = 1.0 + VIDEO_CONFIG["ken_burns_zoom"]
    zoom_start = 1.0
    def zoom_func(t):
        progress = t / duration if duration > 0 else 0
        return zoom_start + (zoom_end - zoom_start) * progress
    clip = clip.with_effects([Resize(zoom_func)])
    return clip


def _make_text_clip(text: str, duration: float, target_size: Tuple[int, int]) -> TextClip:
    w, h = target_size
    font_path = _find_chinese_font()
    txt_clip = TextClip(
        text=text,
        font=font_path,
        font_size=VIDEO_CONFIG["text_font_size"],
        color=VIDEO_CONFIG["text_color"],
        stroke_color="black",
        stroke_width=2,
        text_align="center",
        horizontal_align="center",
        vertical_align="center",
        size=(int(w * 0.8), None),
        method="label",
        duration=duration,
    )
    txt_h = txt_clip.size[1] if txt_clip.size else 100
    pos_y = h - txt_h - 80
    return txt_clip.with_position(("center", pos_y)).with_duration(duration)


def _find_chinese_font() -> str:
    candidates = [
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/simsun.ttc",
        "C:/Windows/Fonts/simfang.ttf",
        "C:/Windows/Fonts/STZHONGS.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def compose_video(
    season_name: str,
    sentences: List[str],
    image_paths: List[str],
    voiceover_path: str,
    segment_timestamps: List[dict],
    bgm_path: str = None,
) -> str:
    target_size = (VIDEO_CONFIG["width"], VIDEO_CONFIG["height"])
    fps = VIDEO_CONFIG["fps"]
    trans_duration = VIDEO_CONFIG["transition_duration"]

    print(f"[视频合成] 开始合成 {season_name} 祝福视频...")
    print(f"  文案段落: {len(sentences)}")
    print(f"  图片数量: {len(image_paths)}")

    video_clips = []
    num_scenes = min(len(sentences), len(image_paths))
    if num_scenes == 0:
        num_scenes = max(len(sentences), len(image_paths))

    voiceover_duration = 0
    if segment_timestamps and segment_timestamps[-1]["end"] > 0:
        voiceover_duration = segment_timestamps[-1]["end"]
    else:
        total_chars = sum(len(s) for s in sentences)
        voiceover_duration = max(total_chars / 4.0, len(sentences) * 2.5)

    scene_duration = voiceover_duration / num_scenes

    for i in range(num_scenes):
        img_path = image_paths[i % len(image_paths)]
        if i < len(segment_timestamps) and segment_timestamps[i]["end"] > 0:
            seg = segment_timestamps[i]
            dur = seg["end"] - seg["start"]
        else:
            dur = scene_duration
        dur = max(dur, 1.5)

        clip = _make_ken_burns_clip(img_path, dur, target_size)
        if i < len(sentences):
            txt_clip = _make_text_clip(sentences[i], dur, target_size)
            scene = CompositeVideoClip([clip, txt_clip], size=target_size)
        else:
            scene = clip

        fade_dur = min(trans_duration, dur * 0.3)
        scene = scene.with_effects([FadeIn(fade_dur), FadeOut(fade_dur)])
        video_clips.append(scene)

    if len(video_clips) == 0:
        print("[视频合成] 错误：没有有效的视频片段")
        return ""

    final_video = concatenate_videoclips(video_clips, method="compose")

    audio_clips = []
    if os.path.exists(voiceover_path):
        try:
            voice_audio = AudioFileClip(voiceover_path)
            audio_clips.append(voice_audio)
        except Exception as e:
            print(f"[视频合成] 语音加载失败: {e}")

    if bgm_path and os.path.exists(bgm_path):
        try:
            bgm_audio = AudioFileClip(bgm_path)
            if bgm_audio.duration < final_video.duration:
                from moviepy import concatenate_audioclips
                loops = int(final_video.duration / bgm_audio.duration) + 1
                bgm_audio = concatenate_audioclips([bgm_audio] * loops)
            bgm_audio = bgm_audio.with_duration(final_video.duration)
            bgm_audio = bgm_audio.with_volume_scaled(VIDEO_CONFIG["bgm_volume"])
            audio_clips.append(bgm_audio)
        except Exception as e:
            print(f"[视频合成] BGM 加载失败: {e}")

    if len(audio_clips) > 1:
        final_audio = CompositeAudioClip(audio_clips)
    elif len(audio_clips) == 1:
        final_audio = audio_clips[0]
    else:
        final_audio = None

    if final_audio:
        final_video = final_video.with_audio(final_audio)

    output_path = get_output_path(season_name)
    print(f"[视频合成] 正在渲染视频到: {output_path}")
    print(f"  视频时长: {final_video.duration:.1f}s")

    try:
        final_video.write_videofile(
            output_path,
            codec=VIDEO_CONFIG["codec"],
            audio_codec=VIDEO_CONFIG["audio_codec"],
            fps=fps,
            preset="medium",
            logger=None,
        )
        print(f"[视频合成] 完成！输出: {output_path}")
    except Exception as e:
        print(f"[视频合成] 渲染失败: {e}")
        import traceback
        traceback.print_exc()
        return ""
    finally:
        for clip in video_clips:
            try:
                clip.close()
            except Exception:
                pass
        try:
            final_video.close()
        except Exception:
            pass

    return output_path
