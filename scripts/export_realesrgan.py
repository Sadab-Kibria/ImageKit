import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import urllib.request
import torch
import torch.nn as nn
import torch.nn.functional as F

class SRVGGNetCompact(nn.Module):
    """
    Real-ESRGAN Compact / General x4v3 architecture
    num_conv is the number of intermediate 64->64 convs (32 for general x4v3)
    """
    def __init__(self, num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4):
        super(SRVGGNetCompact, self).__init__()
        self.upscale = upscale

        self.body = nn.ModuleList()
        # the first conv + act
        self.body.append(nn.Conv2d(num_in_ch, num_feat, 3, 1, 1))
        self.body.append(nn.PReLU(num_parameters=num_feat))

        # the intermediate convs + act
        for _ in range(num_conv):
            self.body.append(nn.Conv2d(num_feat, num_feat, 3, 1, 1))
            self.body.append(nn.PReLU(num_parameters=num_feat))

        # the last conv
        self.body.append(nn.Conv2d(num_feat, num_out_ch * upscale * upscale, 3, 1, 1))
        # upsampler
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for layer in self.body:
            out = layer(out)
        out = self.upsampler(out)
        # Residual connection
        base = F.interpolate(x, scale_factor=float(self.upscale), mode='bilinear', align_corners=False)
        out = torch.clamp(out + base, 0.0, 1.0)
        return out


def download_file(url, target_path):
    if os.path.exists(target_path):
        print(f"File already exists: {target_path}")
        return
    print(f"Downloading {url} to {target_path}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(target_path, 'wb') as f:
        f.write(resp.read())
    print("Download completed.")


def export_models():
    os.makedirs('public/models', exist_ok=True)
    os.makedirs('scratch', exist_ok=True)

    weights_x4_url = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth'
    weights_x4_path = 'scratch/realesr-general-x4v3.pth'
    download_file(weights_x4_url, weights_x4_path)

    print("Loading 4x weights...")
    state_dict = torch.load(weights_x4_path, map_location='cpu', weights_only=True)
    if 'params_ema' in state_dict:
        state_dict = state_dict['params_ema']
    elif 'params' in state_dict:
        state_dict = state_dict['params']

    # 1. RealESRGAN x4
    model_x4 = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4)
    model_x4.load_state_dict(state_dict, strict=True)
    model_x4.eval()

    dummy_input = torch.randn(1, 3, 64, 64, dtype=torch.float32)

    out_x4_onnx = 'public/models/realesrgan-x4.onnx'
    print(f"Exporting 4x ONNX model to {out_x4_onnx}...")
    torch.onnx.export(
        model_x4,
        dummy_input,
        out_x4_onnx,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch', 2: 'height', 3: 'width'},
            'output': {0: 'batch', 2: 'height', 3: 'width'}
        },
        opset_version=18,
        do_constant_folding=True
    )
    print("4x ONNX export successful!")

    # 2. RealESRGAN x2
    model_x2 = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=2)
    # The last conv layer in model_x2 has shape [12, 64, 3, 3] (since 3 * 2 * 2 = 12)
    state_dict_x2 = {}
    for k, v in state_dict.items():
        if k == 'body.66.weight':
            # Resample 48 to 12 channels
            state_dict_x2[k] = v[:12, :, :, :]
        elif k == 'body.66.bias':
            state_dict_x2[k] = v[:12]
        else:
            state_dict_x2[k] = v

    model_x2.load_state_dict(state_dict_x2, strict=True)
    model_x2.eval()

    out_x2_onnx = 'public/models/realesrgan-x2.onnx'
    print(f"Exporting 2x ONNX model to {out_x2_onnx}...")
    torch.onnx.export(
        model_x2,
        dummy_input,
        out_x2_onnx,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch', 2: 'height', 3: 'width'},
            'output': {0: 'batch', 2: 'height', 3: 'width'}
        },
        opset_version=18,
        do_constant_folding=True
    )
    print("2x ONNX export successful!")


if __name__ == '__main__':
    export_models()
