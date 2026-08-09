"""
Script generator — uses LLM (Google Gemini) to generate blessing text.
"""
import os
from typing import List


def generate_script(season_name: str, style: str = "温馨", api_key: str = None) -> List[str]:
    """
    Generate a blessing script for the given season using Gemini API.

    Args:
        season_name: 节气名称，如 "立秋"
        style: 风格，如 "温馨"、"喜庆"、"古风"
        api_key: Google Gemini API key. If None, reads from env GOOGLE_API_KEY.

    Returns:
        List of sentence strings, each for one scene.
    """
    api_key = api_key or os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        # Fallback: return a default template without API
        return _fallback_script(season_name)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = (
            f"你是一个祝福文案创作者。请为\"{season_name}\"节气/节日写一段约30秒的祝福视频文案，"
            f"风格{style}。\n\n"
            f"要求：\n"
            f"1. 分5-6句话，每句话对应一个画面\n"
            f"2. 按时间顺序，每句一行\n"
            f"3. 语言温馨自然，适合配音朗读\n"
            f"4. 每句话不要太长（15-25字为宜）\n"
            f"5. 最后一句话作为结尾祝福\n\n"
            f"请直接输出文案，不要额外解释。"
        )

        response = model.generate_content(prompt)
        text = response.text.strip()

        # Split into lines, filter out empty ones
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        # Remove markdown list markers if present
        lines = [line.lstrip("1234567890.、- \t") for line in lines]
        lines = [line for line in lines if line and len(line) > 5]

        if len(lines) >= 3:
            return lines

        # If parsing failed, use fallback
        return _fallback_script(season_name)

    except Exception as e:
        print(f"[脚本生成] LLM 调用失败 ({e})，使用备用文案")
        return _fallback_script(season_name)


def _fallback_script(season_name: str) -> List[str]:
    """备用文案（无 API 时的默认文案）"""
    fallbacks = {
        "立秋": [
            "今日立秋，立秋的第一条祝福我想送给你。",
            "愿它给你带来好运和美满。",
            "立秋也是收获的季节，愿你在今年秋天收获健康与快乐。",
            "一份幸福与平安，愿这个秋天爱与好运同在。",
            "家人健康平安，一切顺顺利利，好运连连。",
            "祝您立秋快乐，秋日安康。",
        ],
        "立春": [
            "立春到了，春天的第一缕阳光送给你。",
            "愿它温暖你的心房，带来新的希望。",
            "春天是播种的季节，愿你种下梦想，收获美好。",
            "愿春风拂去烦恼，春雨滋润心田。",
            "万物复苏，生机勃勃，愿你与春天一同绽放。",
            "祝您立春快乐，四季平安。",
        ],
        "中秋": [
            "月圆人团圆，中秋佳节到。",
            "愿这轮明月带去我的思念与祝福。",
            "一家团圆，围坐赏月，幸福就在身边。",
            "月饼香甜，情意更浓，愿你的生活如月般圆满。",
            "无论身在何方，心在一起就是团圆。",
            "祝您中秋快乐，阖家幸福。",
        ],
        "春节": [
            "爆竹声中一岁除，春风送暖入屠苏。",
            "新的一年，新的开始，愿你万事如意。",
            "愿幸福像烟花一样绚烂，好运像春联一样红火。",
            "家人团聚，其乐融融，这就是年的味道。",
            "辞旧迎新，愿你岁岁平安，年年有余。",
            "祝您春节快乐，吉祥如意。",
        ],
        "国庆": [
            "红旗飘扬，举国同庆。",
            "祝福我们伟大的祖国繁荣昌盛。",
            "愿祖国山河无恙，国泰民安。",
            "生在红旗下，长在春风里，何其有幸。",
            "愿你的生活与祖国一同蒸蒸日上。",
            "祝您国庆快乐，阖家幸福。",
        ],
    }

    # 尝试匹配节气，否则返回通用祝福
    for key, script in fallbacks.items():
        if key in season_name or season_name in key:
            return script

    return [
        f"今天是{season_name}，最美的祝福送给你。",
        "愿你每天都有好心情，事事顺心如意。",
        "愿健康和快乐永远陪伴你左右。",
        "愿幸福和好运时刻与你同在。",
        "愿你的生活如诗如画，美好常在。",
        "祝你一切顺利，天天开心。",
    ]
