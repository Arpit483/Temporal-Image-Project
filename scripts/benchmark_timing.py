"""Timing benchmark script for FrameFill engines at validated 512x512 crop size.
Reports p50 and p95 latencies and active compute device.
Run: python scripts/benchmark_timing.py [--runs 10]
"""
import argparse
import sys
import time
from pathlib import Path
import numpy as np

# Add project root to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from framefill.engines import Interpolator, b0

def run_benchmark(n_runs: int = 10):
    print("=" * 60)
    print("FrameFill Timing Benchmark (512x512 BT Crops)")
    print("=" * 60)
    
    eng = Interpolator()
    
    # Device detection
    device = "cpu"
    try:
        import torch
        device = f"cuda ({torch.cuda.get_device_name(0)})" if torch.cuda.is_available() else "cpu"
    except ImportError:
        pass
    print(f"Compute Device: {device.upper()}")
    print(f"RIFE Available: {eng.rife_available} (Error: {eng.rife_error})")
    print(f"Benchmark Runs: {n_runs} (after 2 warmup runs)\n")
    
    # Generate realistic 512x512 synthetic brightness temperature test crops (180 - 330 K)
    rng = np.random.default_rng(42)
    f0 = (200.0 + 100.0 * rng.random((512, 512))).astype("float32")
    f1 = (200.0 + 100.0 * rng.random((512, 512))).astype("float32")
    
    engines_to_test = [
        ("B0 Linear Average", lambda a, b: b0(a, b)),
        ("B1 OpenCV DIS Optical Flow", lambda a, b: eng.dis(a, b)),
    ]
    
    if eng.rife_available:
        engines_to_test.append(("B3 RIFE v4.22 (scale 2.0)", lambda a, b: eng.rife(a, b, scale=2.0)))
        engines_to_test.append(("B5 50/50 Blend (DIS + RIFE)", lambda a, b: eng.predict(a, b, "blend")[0]))
    else:
        print("[Notice] RIFE weights/torch not present; testing classical DIS flow and baseline.\n")
    
    for name, fn in engines_to_test:
        # Warmup
        for _ in range(2):
            fn(f0, f1)
        
        # Timed runs
        times = []
        for _ in range(n_runs):
            t0 = time.perf_counter()
            fn(f0, f1)
            t1 = time.perf_counter()
            times.append((t1 - t0) * 1000.0) # in ms
            
        times = np.array(times)
        p50 = np.percentile(times, 50)
        p95 = np.percentile(times, 95)
        mean_t = np.mean(times)
        
        print(f"Engine: {name}")
        print(f"  Shape: 512x512 float32")
        print(f"  Mean:  {mean_t:7.2f} ms")
        print(f"  p50:   {p50:7.2f} ms")
        print(f"  p95:   {p95:7.2f} ms")
        print("-" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FrameFill Engine Benchmark")
    parser.add_argument("--runs", type=int, default=10, help="Number of benchmark iterations")
    args = parser.parse_args()
    run_benchmark(args.runs)
