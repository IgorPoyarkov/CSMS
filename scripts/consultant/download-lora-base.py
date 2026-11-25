# Скачивание базовой модели для QLoRA в локальный кэш проекта.
from pathlib import Path

from huggingface_hub import snapshot_download

root = Path(__file__).resolve().parents[2]
target = root / ".tmp" / "lora" / "base-model"
target.mkdir(parents=True, exist_ok=True)

path = snapshot_download(
    repo_id="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    local_dir=str(target),
    max_workers=8,
)
print("model:", path)
