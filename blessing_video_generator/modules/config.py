"""
Configuration for the Seasonal Blessing Video Generator.
"""
import os
from pathlib import Path

# Project root directory (基于本文件位置解析，与运行时工作目录无关)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 素材库根目录
ASSET_DIR = PROJECT_ROOT / "素材库"

# 通用/备用图片目录
FALLBACK_IMAGE_DIR = ASSET_DIR / "通用"

# 节气配置：名称、素材目录、祝福风格、关键词
SEASONS = {
    "立秋": {
        "dir": ASSET_DIR / "立秋",
        "style": "温馨丰收",
        "keywords": ["秋天", "收获", "金黄", "凉爽", "立秋"],
    },
    "立春": {
        "dir": ASSET_DIR / "立春",
        "style": "生机勃勃",
        "keywords": ["春天", "生机", "花开", "温暖", "立春"],
    },
    "中秋": {
        "dir": ASSET_DIR / "中秋",
        "style": "团圆温馨",
        "keywords": ["中秋", "团圆", "月亮", "月饼", "思念"],
    },
    "国庆": {
        "dir": ASSET_DIR / "国庆",
        "style": "喜庆热烈",
        "keywords": ["国庆", "祖国", "繁荣", "红旗", "盛世"],
    },
    "春节": {
        "dir": ASSET_DIR / "春节",
        "style": "喜庆祥和",
        "keywords": ["春节", "新年", "团圆", "祝福", "吉祥"],
    },
    "通用": {
        "dir": FALLBACK_IMAGE_DIR,
        "style": "温馨",
        "keywords": ["祝福", "美好", "安康"],
    },
}

# 视频参数
VIDEO_CONFIG = {
    "width": 1280,           # 720p 宽度
    "height": 720,            # 720p 高度
    "fps": 30,                # 帧率
    "duration_per_scene": 5.0,  # 每段画面时长（秒）
    "transition_duration": 0.8, # 转场时长（秒）
    "ken_burns_zoom": 0.05,   # Ken Burns 缩放幅度
    "text_font": "simhei.ttf", # 中文字体（需系统已安装）
    "text_font_size": 48,     # 文字大小
    "text_color": "white",    # 文字颜色
    "text_bg_opacity": 0.4,   # 文字背景透明度
    "bgm_volume": 0.25,       # 背景音乐音量（相对语音）
    "output_dir": PROJECT_ROOT / "output",
    "codec": "libx264",       # 视频编码
    "audio_codec": "aac",     # 音频编码
}


def get_season_config(season_name: str) -> dict:
    """获取节气配置，如果不存在则返回通用配置"""
    if season_name in SEASONS:
        return SEASONS[season_name]
    return SEASONS["通用"]


def ensure_dir(path) -> str:
    """确保目录存在"""
    os.makedirs(path, exist_ok=True)
    return str(path)


def get_output_path(season_name: str) -> str:
    """生成输出文件路径"""
    out_dir = ensure_dir(VIDEO_CONFIG["output_dir"])
    return os.path.join(out_dir, f"{season_name}_祝福视频.mp4")