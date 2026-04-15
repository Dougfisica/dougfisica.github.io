#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path


OUT_DIR = Path("estruturas_xyz")


def frac_to_cart(frac_coords, lattice_vectors):
    cart_coords = []
    for fx, fy, fz in frac_coords:
        x = fx * lattice_vectors[0][0] + fy * lattice_vectors[1][0] + fz * lattice_vectors[2][0]
        y = fx * lattice_vectors[0][1] + fy * lattice_vectors[1][1] + fz * lattice_vectors[2][1]
        z = fx * lattice_vectors[0][2] + fy * lattice_vectors[1][2] + fz * lattice_vectors[2][2]
        cart_coords.append((x, y, z))
    return cart_coords


def write_xyz(path: Path, comment: str, atoms):
    coords = [(label, x, y, z) for label, x, y, z in atoms]
    lines = [str(len(coords)), comment]
    lines.extend(f"{label} {x:.6f} {y:.6f} {z:.6f}" for label, x, y, z in coords)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def make_atoms(label, coords):
    return [(label, x, y, z) for x, y, z in coords]


def make_binary_atoms(frac_a, frac_b, lattice_vectors, label_a="Zn", label_b="S"):
    atoms = []
    atoms.extend(make_atoms(label_a, frac_to_cart(frac_a, lattice_vectors)))
    atoms.extend(make_atoms(label_b, frac_to_cart(frac_b, lattice_vectors)))
    return atoms


def generate_graphene():
    a_cc = 1.42
    a_lat = math.sqrt(3.0) * a_cc
    lattice = (
        (a_lat, 0.0, 0.0),
        (0.5 * a_lat, 0.5 * math.sqrt(3.0) * a_lat, 0.0),
        (0.0, 0.0, 12.0),
    )
    frac = ((0.0, 0.0, 0.5), (1.0 / 3.0, 1.0 / 3.0, 0.5))
    return make_atoms("C", frac_to_cart(frac, lattice))


def generate_nanotube(n, m, label="C"):
    a_cc = 1.42
    a1 = (math.sqrt(3.0) * a_cc, 0.0)
    a2 = (0.5 * math.sqrt(3.0) * a_cc, 1.5 * a_cc)
    basis = ((0.0, 0.0), (0.0, a_cc))

    ch = (n * a1[0] + m * a2[0], n * a1[1] + m * a2[1])
    d_r = math.gcd(2 * m + n, 2 * n + m)
    t1 = (2 * m + n) // d_r
    t2 = -(2 * n + m) // d_r
    t = (t1 * a1[0] + t2 * a2[0], t1 * a1[1] + t2 * a2[1])

    ch_len = math.hypot(*ch)
    t_len = math.hypot(*t)
    radius = ch_len / (2.0 * math.pi)
    e_ch = (ch[0] / ch_len, ch[1] / ch_len)
    e_t = (t[0] / t_len, t[1] / t_len)

    det = ch[0] * t[1] - ch[1] * t[0]
    search = 2 * (n + m + abs(t1) + abs(t2) + 2)
    atoms_2d = []
    seen = set()

    for i in range(-search, search + 1):
        for j in range(-search, search + 1):
            origin = (i * a1[0] + j * a2[0], i * a1[1] + j * a2[1])
            for bx, by in basis:
                px = origin[0] + bx
                py = origin[1] + by
                alpha = (px * t[1] - py * t[0]) / det
                beta = (ch[0] * py - ch[1] * px) / det
                tol = 1e-8
                if -tol <= alpha < 1.0 - tol and -tol <= beta < 1.0 - tol:
                    s = px * e_ch[0] + py * e_ch[1]
                    z = px * e_t[0] + py * e_t[1]
                    key = (round(s, 8), round(z, 8))
                    if key not in seen:
                        seen.add(key)
                        atoms_2d.append((s, z))

    atoms_2d.sort(key=lambda item: (item[1], item[0]))
    atoms = []
    for s, z in atoms_2d:
        theta = 2.0 * math.pi * s / ch_len
        x = radius * math.cos(theta)
        y = radius * math.sin(theta)
        atoms.append((label, x, y, z))
    return atoms


def main():
    OUT_DIR.mkdir(exist_ok=True)

    structures = {
        "sc": {
            "comment": "Simple cubic conventional unit cell, a=1",
            "atoms": make_atoms(
                "X",
                frac_to_cart(((0.0, 0.0, 0.0),), ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))),
            ),
        },
        "bcc": {
            "comment": "Body-centered cubic conventional unit cell, a=1",
            "atoms": make_atoms(
                "X",
                frac_to_cart(
                    ((0.0, 0.0, 0.0), (0.5, 0.5, 0.5)),
                    ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
                ),
            ),
        },
        "fcc": {
            "comment": "Face-centered cubic conventional unit cell, a=1",
            "atoms": make_atoms(
                "X",
                frac_to_cart(
                    ((0.0, 0.0, 0.0), (0.0, 0.5, 0.5), (0.5, 0.0, 0.5), (0.5, 0.5, 0.0)),
                    ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
                ),
            ),
        },
        "hcp": {
            "comment": "Hexagonal close-packed conventional unit cell, a=1, c/a=sqrt(8/3)",
            "atoms": make_atoms(
                "X",
                frac_to_cart(
                    ((0.0, 0.0, 0.0), (1.0 / 3.0, 2.0 / 3.0, 0.5)),
                    (
                        (1.0, 0.0, 0.0),
                        (0.5, 0.8660254037844386, 0.0),
                        (0.0, 0.0, 1.632993161855452),
                    ),
                ),
            ),
        },
        "diamond": {
            "comment": "Diamond cubic conventional unit cell, a=1",
            "atoms": make_atoms(
                "C",
                frac_to_cart(
                    (
                        (0.0, 0.0, 0.0),
                        (0.0, 0.5, 0.5),
                        (0.5, 0.0, 0.5),
                        (0.5, 0.5, 0.0),
                        (0.25, 0.25, 0.25),
                        (0.25, 0.75, 0.75),
                        (0.75, 0.25, 0.75),
                        (0.75, 0.75, 0.25),
                    ),
                    ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
                ),
            ),
        },
        "zb": {
            "comment": "Zinc blende ZnS conventional cubic cell, a=1",
            "atoms": make_binary_atoms(
                (
                    (0.0, 0.0, 0.0),
                    (0.0, 0.5, 0.5),
                    (0.5, 0.0, 0.5),
                    (0.5, 0.5, 0.0),
                ),
                (
                    (0.25, 0.25, 0.25),
                    (0.25, 0.75, 0.75),
                    (0.75, 0.25, 0.75),
                    (0.75, 0.75, 0.25),
                ),
                ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)),
            ),
        },
        "wz": {
            "comment": "Wurtzite ZnS conventional hexagonal cell, a=1, c/a=sqrt(8/3), u=3/8",
            "atoms": make_binary_atoms(
                ((0.0, 0.0, 0.0), (2.0 / 3.0, 1.0 / 3.0, 0.5)),
                ((0.0, 0.0, 3.0 / 8.0), (2.0 / 3.0, 1.0 / 3.0, 7.0 / 8.0)),
                (
                    (1.0, 0.0, 0.0),
                    (0.5, 0.8660254037844386, 0.0),
                    (0.0, 0.0, 1.632993161855452),
                ),
            ),
        },
        "graphene": {
            "comment": "Graphene primitive cell, C-C=1.42 A, vacuum=12 A",
            "atoms": generate_graphene(),
        },
    }

    for name, data in structures.items():
        write_xyz(OUT_DIR / f"{name}.xyz", data["comment"], data["atoms"])


if __name__ == "__main__":
    main()
