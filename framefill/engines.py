"""Interpolation engines: B0 average, B1 DIS flow-warp, B3 RIFE v4.22, and the 50/50 B1+B3 blend."""
import os
import sys
import threading
import types

import cv2
import numpy as np

from .preprocess import denormalise, fill, normalise, to8

GUARD_K = 5.0


def b0(f0, f1):
    return 0.5 * f0 + 0.5 * f1


class Interpolator:
    def __init__(self, rife_dir=None, scale=2.0):
        self.scale = scale
        self.rife_dir = rife_dir or os.environ.get("FRAMEFILL_RIFE_DIR", "third_party/rife_pkg")
        self._dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        self._lock = threading.Lock()
        self._net = None
        self._dev = None
        self.rife_error = None

    # ---------- B1: classical optical flow ----------
    def dis(self, f0, f1):
        """Flow on 8-bit copies, warping on float32 BT, both directions, averaged."""
        with self._lock:
            a, b = fill(f0), fill(f1)
            fl01 = self._dis.calc(to8(f0), to8(f1), None)
            fl10 = self._dis.calc(to8(f1), to8(f0), None)
        h, w = a.shape
        gx, gy = np.meshgrid(np.arange(w, dtype="float32"), np.arange(h, dtype="float32"))
        w0 = cv2.remap(a, gx - 0.5 * fl01[..., 0], gy - 0.5 * fl01[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        w1 = cv2.remap(b, gx - 0.5 * fl10[..., 0], gy - 0.5 * fl10[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        out = 0.5 * w0 + 0.5 * w1
        out[np.isnan(f0) | np.isnan(f1)] = np.nan
        return out.astype("float32")

    # ---------- B3: pretrained RIFE ----------
    def _load_rife(self):
        if self._net is not None:
            return True
        if self.rife_error:
            return False
        try:
            import torch
            import torch.nn as nn
            pkg = os.path.abspath(self.rife_dir)
            if not os.path.isfile(os.path.join(pkg, "train_log", "flownet.pkl")):
                raise FileNotFoundError(f"RIFE package not found in {pkg} (expects model/ and train_log/flownet.pkl)")
            sys.path.insert(0, pkg)
            import model.warplayer  # noqa: F401
            try:
                import model.loss  # noqa: F401
            except Exception:  # training-only losses pull VGG weights; stub them (inference never uses them)
                stub = types.ModuleType("model.loss")

                class _Noop(nn.Module):
                    def __init__(self, *a, **k):
                        super().__init__()

                    def forward(self, *a, **k):
                        return torch.zeros(1)

                for n in ("EPE", "SOBEL", "Ternary", "VGGPerceptualLoss", "MeanShift"):
                    setattr(stub, n, _Noop)
                sys.modules["model.loss"] = stub
            from train_log.RIFE_HDv3 import Model
            net = Model()
            net.load_model(os.path.join(pkg, "train_log"), -1)
            net.eval()
            net.device()
            self._net = net
            self._dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            return True
        except Exception as e:  # keep the app usable without RIFE
            self.rife_error = f"{type(e).__name__}: {e}"
            return False

    @property
    def rife_available(self):
        return self._load_rife()

    def rife(self, f0, f1, scale=None):
        if not self._load_rife():
            raise RuntimeError(f"RIFE unavailable: {self.rife_error}")
        import torch
        import torch.nn.functional as F
        scale = scale or self.scale
        pad = max(128, int(128 / scale))

        def prep(x):
            t = torch.from_numpy(normalise(fill(x)))[None, None].repeat(1, 3, 1, 1).float().to(self._dev)
            h, w = t.shape[-2:]
            ph, pw = ((h - 1) // pad + 1) * pad, ((w - 1) // pad + 1) * pad
            return F.pad(t, (0, pw - w, 0, ph - h), mode="replicate"), h, w

        with self._lock, torch.no_grad():
            x0, h, w = prep(f0)
            x1, _, _ = prep(f1)
            out = self._net.inference(x0, x1, 0.5, scale)
            y = out.mean(1)[0, :h, :w].clamp(0, 1).cpu().numpy()
        bt = denormalise(y)
        lo = min(np.nanmin(f0), np.nanmin(f1)) - GUARD_K
        hi = max(np.nanmax(f0), np.nanmax(f1)) + GUARD_K
        bt = np.clip(bt, lo, hi)
        bt[np.isnan(f0) | np.isnan(f1)] = np.nan
        return bt.astype("float32")

    # ---------- public entry ----------
    def predict(self, f0, f1, method="blend"):
        """Return (frame, method_used). method: blend | dis | rife | average. Falls back to DIS if RIFE is missing."""
        if f0.shape != f1.shape:
            raise ValueError("frames must have identical shape")
        if method == "average":
            return b0(f0, f1), "average"
        if method == "dis":
            return self.dis(f0, f1), "dis"
        if not self._load_rife():
            return self.dis(f0, f1), "dis (RIFE unavailable)"
        if method == "rife":
            return self.rife(f0, f1), "rife"
        return 0.5 * self.dis(f0, f1) + 0.5 * self.rife(f0, f1), "blend"
