"""CLI:  python -m framefill.cli predict a.nc b.nc out.nc   |   python -m framefill.cli evaluate crops.npz triplets.npy"""
import argparse
import sys

import numpy as np
import pandas as pd

from .engines import Interpolator, b0
from .io_nc import check_pair, load_frame, write_framefill_nc
from .metrics import evaluate, paired_bootstrap


def main(argv=None):
    p = argparse.ArgumentParser(prog="framefill")
    sp = p.add_subparsers(dest="cmd", required=True)
    a = sp.add_parser("predict")
    a.add_argument("first"); a.add_argument("second"); a.add_argument("out")
    a.add_argument("--gap-min", type=float, default=20.0); a.add_argument("--method", default="blend")
    e = sp.add_parser("evaluate")
    e.add_argument("crops", help=".npz with frames,times"); e.add_argument("triplets", help=".npy of (i, mid, j) rows")
    e.add_argument("--limit", type=int, default=0)
    n = p.parse_args(argv)
    eng = Interpolator()
    if n.cmd == "predict":
        fa, _ = load_frame(open(n.first, "rb").read(), n.first)
        fb, _ = load_frame(open(n.second, "rb").read(), n.second)
        check_pair(fa, fb)
        mid, used = eng.predict(fa, fb, n.method)
        write_framefill_nc(n.out, [fa, mid, fb], [0, 1, 0], [0, n.gap_min / 2, n.gap_min], dict(method=used))
        print("wrote", n.out, "| method:", used)
        return 0
    fr = np.load(n.crops)["frames"]
    tr = np.load(n.triplets)
    tr = tr[: n.limit] if n.limit else tr
    rows = []
    for i, m, j in tr:
        f0, f1, g = fr[i], fr[j], fr[m]
        for name, P in (("average", b0(f0, f1)), ("dis", eng.dis(f0, f1)), ("blend", eng.predict(f0, f1, "blend")[0])):
            rows.append(dict(engine=name, **evaluate(P, g, f0, f1)))
    df = pd.DataFrame(rows)
    print(df.groupby("engine").mean().round(3).to_string())
    piv = df.assign(k=df.groupby("engine").cumcount()).pivot(index="k", columns="engine", values="RMSE_dyn_K")
    mu, lo, hi = paired_bootstrap(piv["blend"] - piv["dis"])
    print(f"blend - dis (dyn RMSE): {mu:+.3f} K, 95% CI [{lo:+.3f}, {hi:+.3f}], N={len(piv)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
