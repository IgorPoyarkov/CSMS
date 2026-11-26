# Резервный путь: слиться адаптер с базовой моделью в HF-формате.
# Нужен только если llama-export-lora недоступен в собранной версии llama.cpp.
#
#   python scripts/consultant/merge-lora-hf.py
#
# Итог: .tmp/lora/merged-hf — обычная HF-модель, которую можно прогнать через
# convert_hf_to_gguf.py и llama-quantize.
import os
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / ".tmp" / "lora" / "base-model"
ADAPTER = Path(os.environ.get("LORA_ADAPTER", str(ROOT / ".tmp" / "lora" / "adapter-v2")))
OUT = Path(os.environ.get("LORA_MERGED_OUT", str(ROOT / ".tmp" / "lora" / "merged-hf")))

print(f"База: {BASE}")
print(f"Адаптер: {ADAPTER}")
model = AutoModelForCausalLM.from_pretrained(
    str(BASE),
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True,
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(model, str(ADAPTER))
model = model.merge_and_unload()
model.config.use_cache = True

OUT.mkdir(parents=True, exist_ok=True)
model.save_pretrained(str(OUT), safe_serialization=True)
tokenizer = AutoTokenizer.from_pretrained(str(BASE), trust_remote_code=True)
tokenizer.save_pretrained(str(OUT))
print(f"Слитая модель: {OUT}")
