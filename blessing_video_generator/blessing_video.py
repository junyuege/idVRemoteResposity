#!/usr/bin/env python3
"""
Seasonal Blessing Video Generator

Usage:
    python blessing_video.py 立秋
    python blessing_video.py 立秋 --style 温馨 --bgm bgm/blessing_bgm.mp3
    python blessing_video.py 中秋 --no-llm
"""
import argparse
import os
import sys
import time
from pathlib import Path

# Ensure modules are importable (基于脚本自身位置，与运行时工作目录无关)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from modules import (
    SEASONS, generate_script, select_images,
    generate_tts, compose_video
)
from modules.config import PROJECT_ROOT, get_season_config


def main():
    parser = argparse.ArgumentParser(
        description="节气祝福视频生成器 - Seasonal Blessing Video Generator"
    )
    parser.add_argument(
        "season",
        nargs="?",
        default="立秋",
        help="节气/节日名称，如：立秋、立春、中秋、春节、国庆 (默认: 立秋)"
    )
    parser.add_argument(
        "--style",
        default="温馨",
        help="文案风格：温馨、喜庆、古风、幽默 (默认: 温馨)"
    )
    parser.add_argument(
        "--bgm",
        default=None,
        help="背景音乐文件路径 (默认: 自动查找 bgm/ 目录)"
    )
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="不使用 LLM 生成文案，使用内置备用文案"
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="Google Gemini API Key (默认: 读取 GOOGLE_API_KEY 环境变量)"
    )
    parser.add_argument(
        "--voice",
        default="zh-CN-XiaoxiaoNeural",
        help="TTS 语音 (默认: zh-CN-XiaoxiaoNeural)"
    )
    parser.add_argument(
        "--output",
        default=None,
        help="输出视频路径 (默认: output/<节气>_祝福视频.mp4)"
    )

    args = parser.parse_args()

    season_name = args.season
    print(f"🎬 节气祝福视频生成器")
    print(f"{'='*40}")
    print(f"  节气: {season_name}")
    print(f"  风格: {args.style}")
    print()

    # --- Step 1: Generate script ---
    print("📝 [1/4] 生成祝福文案...")
    start = time.time()

    season_config = get_season_config(season_name)
    api_key = args.api_key if not args.no_llm else None
    sentences = generate_script(season_name, args.style, api_key=api_key)

    if not sentences:
        print("❌ 文案生成失败！")
        sys.exit(1)

    print(f"  共 {len(sentences)} 句:")
    for i, s in enumerate(sentences, 1):
        print(f"    {i}. {s}")
    print(f"  ⏱ {time.time()-start:.1f}s")
    print()

    # --- Step 2: Select images ---
    print("🖼️ [2/4] 选取图片素材...")
    start = time.time()
    image_paths = select_images(season_name, count=len(sentences))

    if not image_paths:
        print("⚠️  未找到图片素材，将使用纯色背景")
        # Create a placeholder image
        from PIL import Image
        placeholder_dir = PROJECT_ROOT / "素材库" / "通用"
        os.makedirs(placeholder_dir, exist_ok=True)
        placeholder_path = placeholder_dir / "_placeholder.png"
        if not os.path.exists(placeholder_path):
            img = Image.new("RGB", (1280, 720), (60, 120, 180))
            img.save(placeholder_path)
        image_paths = [placeholder_path] * len(sentences)

    print(f"  选取 {len(image_paths)} 张图片")
    for p in image_paths:
        print(f"    {os.path.basename(p)}")
    print(f"  ⏱ {time.time()-start:.1f}s")
    print()

    # --- Step 3: Generate TTS ---
    print("🔊 [3/4] 生成语音旁白...")
    start = time.time()
    voiceover_path, segments = generate_tts(
        sentences,
        voice=args.voice,
    )
    print(f"  语音文件: {os.path.basename(voiceover_path)}")
    print(f"  段落数: {len(segments)}")
    if segments and segments[-1]["end"] > 0:
        print(f"  总时长: {segments[-1]['end']:.1f}s")
    print(f"  ⏱ {time.time()-start:.1f}s")
    print()

    # --- Step 4: Find BGM ---
    bgm_path = args.bgm
    if bgm_path is None:
        # Auto-detect BGM file
        bgm_dir = PROJECT_ROOT / "bgm"
        if os.path.isdir(bgm_dir):
            bgm_files = [f for f in os.listdir(bgm_dir)
                         if f.lower().endswith((".mp3", ".wav", ".m4a", ".flac"))]
            if bgm_files:
                bgm_path = os.path.join(bgm_dir, bgm_files[0])
                print(f"🎵  自动检测到 BGM: {bgm_files[0]}")

    if bgm_path:
        print(f"  背景音乐: {os.path.basename(bgm_path)}")
    else:
        print("  无背景音乐")
    print()

    # --- Step 5: Compose video ---
    print("🎬 [4/4] 合成视频...")
    start = time.time()
    output_path = compose_video(
        season_name=season_name,
        sentences=sentences,
        image_paths=image_paths,
        voiceover_path=voiceover_path,
        segment_timestamps=segments,
        bgm_path=bgm_path,
    )

    if output_path:
        print(f"  ⏱ 总用时: {time.time()-start:.1f}s")
        print()
        print(f"✅ 视频生成成功！")
        print(f"   📁 {output_path}")
        print(f"   📏 文件大小: {os.path.getsize(output_path)/1024/1024:.1f} MB")
    else:
        print("❌ 视频合成失败！")
        sys.exit(1)


if __name__ == "__main__":
    main()
