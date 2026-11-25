# Проверка CUDA-стека перед обучением LoRA.
import torch
import bitsandbytes as bnb
import transformers
import peft

print("torch", torch.__version__, "cuda", torch.cuda.is_available())
if torch.cuda.is_available():
    print("gpu", torch.cuda.get_device_name(0))
    print("bf16", torch.cuda.is_bf16_supported())
print("transformers", transformers.__version__, "peft", peft.__version__, "bnb", bnb.__version__)
