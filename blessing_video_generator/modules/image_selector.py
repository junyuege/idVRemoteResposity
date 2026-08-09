"""
Image selector — picks images from the 素材库 based on season.
"""
import os
import random
from typing import List

from .config import SEASONS, FALLBACK_IMAGE_DIR, VIDEO_CONFIG

# Supported image extensions
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def _list_images(directory: str) -> List[str]:
    """List all image files in a directory (non-recursive)."""
    if not os.path.isdir(directory):
        return []
    files = []
    for f in os.listdir(directory):
        if f.lower().endswith(IMAGE_EXTENSIONS):
            files.append(os.path.join(directory, f))
    return sorted(files)


def select_images(season_name: str, count: int = 6) -> List[str]:
    """
    Select images for the given season.

    Strategy:
    1. Try to get images from the season-specific directory.
    2. If not enough, supplement from the fallback (通用) directory.
    3. Shuffle to add variety.
    4. Limit to `count` images.
    """
    season_config = SEASONS.get(season_name) or SEASONS["通用"]
    season_dir = season_config["dir"]

    # Get season-specific images
    season_images = _list_images(season_dir)
    fallback_images = _list_images(FALLBACK_IMAGE_DIR)

    selected = []

    # Use season images first, shuffle for variety
    if season_images:
        random.shuffle(season_images)
        selected.extend(season_images)

    # Supplement with fallback images if needed
    if len(selected) < count and fallback_images:
        random.shuffle(fallback_images)
        # Avoid duplicates
        for img in fallback_images:
            if img not in selected:
                selected.append(img)
            if len(selected) >= count:
                break

    # If still not enough, cycle through what we have
    if len(selected) < count and selected:
        while len(selected) < count:
            for img in list(selected):
                if len(selected) >= count:
                    break
                selected.append(img)

    # If no images at all, return empty list
    if not selected:
        print("[素材选取] 警告：未找到任何图片素材")
        return []

    # Shuffle and limit to count
    random.shuffle(selected)
    return selected[:count]


def prepare_image(image_path: str, output_path: str = None) -> str:
    """
    Prepare an image for video use: crop to 16:9, resize to configured resolution.

    Args:
        image_path: Path to the source image.
        output_path: Path to save the prepared image. If None, overwrites.

    Returns:
        Path to the prepared image.
    """
    try:
        from PIL import Image

        target_w = VIDEO_CONFIG["width"]
        target_h = VIDEO_CONFIG["height"]

        img = Image.open(image_path)

        # Crop to 16:9 aspect ratio
        w, h = img.size
        target_ratio = target_w / target_h
        current_ratio = w / h

        if abs(current_ratio - target_ratio) > 0.01:
            if current_ratio > target_ratio:
                # Image is too wide — crop sides
                new_w = int(h * target_ratio)
                left = (w - new_w) // 2
                img = img.crop((left, 0, left + new_w, h))
            else:
                # Image is too tall — crop top/bottom
                new_h = int(w / target_ratio)
                top = (h - new_h) // 2
                img = img.crop((0, top, w, top + new_h))

        # Resize to target resolution
        img = img.resize((target_w, target_h), Image.LANCZOS)

        save_path = output_path or image_path
        img.save(save_path, quality=95)
        return save_path

    except Exception as e:
        print(f"[素材选取] 图片处理失败 {image_path}: {e}")
        return image_path
