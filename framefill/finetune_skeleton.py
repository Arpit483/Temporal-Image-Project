"""Fine-tuning skeleton for RIFE on GOES crops — OPTIONAL, behind flag FRAMEFILL_FINETUNE=1.
No fine-tuning results are claimed in this project. This is a scaffold for future work only.
"""
import os

ENABLED = os.environ.get("FRAMEFILL_FINETUNE", "0") == "1"


def check_enabled():
    if not ENABLED:
        raise RuntimeError(
            "Fine-tuning is disabled (set FRAMEFILL_FINETUNE=1 to enable). "
            "No fine-tuning results are claimed in this project."
        )


def load_goes_triplets(npz_path: str, triplets_path: str, limit: int = 0):
    """Load GOES-19 triplets from saved .npz and .npy files.
    Returns list of (f0, f_mid, f1) float32 arrays in kelvin.
    """
    check_enabled()
    import numpy as np
    frames = np.load(npz_path)["frames"]
    triplets = np.load(triplets_path)
    if limit:
        triplets = triplets[:limit]
    return [(frames[int(i)], frames[int(m)], frames[int(j)]) for i, m, j in triplets]


def finetune_rife_skeleton(
    rife_dir: str,
    npz_path: str,
    triplets_path: str,
    output_dir: str,
    n_epochs: int = 5,
    lr: float = 1e-5,
    limit: int = 100,
):
    """
    Skeleton for fine-tuning RIFE on GOES satellite triplets.
    NOT IMPLEMENTED — no results are claimed for this approach.
    This skeleton shows where training logic would go.

    Requirements (not installed by default):
    - torch with CUDA recommended
    - RIFE weights at rife_dir
    - GOES triplets at npz_path / triplets_path

    Caveats:
    - No fine-tuning has been run or validated in this project
    - Results with pretrained weights are reported in README/docs
    - Fine-tuning would require careful evaluation on a held-out test set
    """
    check_enabled()
    raise NotImplementedError(
        "Fine-tuning skeleton: the training loop is not implemented. "
        "This file exists as a scaffold for future work. "
        "See FrameFill_Project_Log.md §11 for context."
    )
    # Scaffold (never reached):
    # triplets = load_goes_triplets(npz_path, triplets_path, limit)
    # net = load_rife_model(rife_dir)
    # optimizer = torch.optim.Adam(net.parameters(), lr=lr)
    # for epoch in range(n_epochs):
    #     for f0, g, f1 in triplets:
    #         pred = net.inference(prep(f0), prep(f1), 0.5, scale=2.0)
    #         loss = F.l1_loss(pred, prep(g))
    #         optimizer.zero_grad(); loss.backward(); optimizer.step()
    # net.save_model(output_dir)
