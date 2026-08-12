"""
Generate the site's figures as SVG.

The original handout carries these as PNG screenshots. SVG is used instead so
they stay sharp, work in both light and dark themes (colours are CSS
variables with literal fallbacks), and can be read by a screen reader.

Run:  python tools/make_figures.py
"""

from __future__ import annotations

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"

W, H = 320, 170
PAD_L, PAD_R, PAD_B, PAD_T = 18, 18, 26, 14
X_MIN, X_MAX = -4.0, 4.0

# currentColor lets the figure inherit the page's text colour, so a single file
# works in both themes without duplicating it.
STROKE = "currentColor"
SHADE = "#b06500"


def sx(x: float) -> float:
    return PAD_L + (x - X_MIN) / (X_MAX - X_MIN) * (W - PAD_L - PAD_R)


def sy(y: float, ymax: float = 0.42) -> float:
    return H - PAD_B - (y / ymax) * (H - PAD_B - PAD_T)


def pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def curve_points(a: float = X_MIN, b: float = X_MAX, n: int = 160):
    return [(a + (b - a) * i / n) for i in range(n + 1)]


def curve_path() -> str:
    pts = [(sx(x), sy(pdf(x))) for x in curve_points()]
    return "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts)


def shade_path(a: float, b: float) -> str:
    a, b = max(a, X_MIN), min(b, X_MAX)
    pts = [(sx(x), sy(pdf(x))) for x in curve_points(a, b, 90)]
    d = f"M {sx(a):.2f},{sy(0):.2f} L " + \
        " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts) + \
        f" L {sx(b):.2f},{sy(0):.2f} Z"
    return d


def vline(x: float, label: str) -> str:
    return (
        f'<line x1="{sx(x):.2f}" y1="{sy(0):.2f}" x2="{sx(x):.2f}" '
        f'y2="{sy(pdf(x)) - 8:.2f}" stroke="{SHADE}" stroke-width="1.6" '
        f'stroke-dasharray="4 3"/>'
        f'<text x="{sx(x):.2f}" y="{H - 8}" text-anchor="middle" '
        f'font-size="12" fill="{SHADE}" font-style="italic">{label}</text>'
    )


def figure(name: str, shades: list[tuple[float, float]], lines: list[tuple[float, str]],
           title: str) -> None:
    body = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'role="img" aria-label="{title}">',
        f"<title>{title}</title>",
    ]
    for a, b in shades:
        body.append(f'<path d="{shade_path(a, b)}" fill="{SHADE}" fill-opacity="0.28"/>')
    # axes
    body.append(f'<line x1="{PAD_L}" y1="{sy(0):.2f}" x2="{W - PAD_R}" '
                f'y2="{sy(0):.2f}" stroke="{STROKE}" stroke-width="1" '
                f'stroke-opacity="0.5" stroke-dasharray="3 3"/>')
    body.append(f'<line x1="{sx(0):.2f}" y1="{sy(0):.2f}" x2="{sx(0):.2f}" '
                f'y2="{sy(pdf(0)):.2f}" stroke="{STROKE}" stroke-width="1" '
                f'stroke-opacity="0.35" stroke-dasharray="3 3"/>')
    body.append(f'<path d="{curve_path()}" fill="none" stroke="{STROKE}" '
                f'stroke-width="2" stroke-linejoin="round"/>')
    for x, label in lines:
        body.append(vline(x, label))
    body.append("</svg>")
    (IMG / f"{name}.svg").write_text("\n".join(body))
    print(f"  wrote assets/img/{name}.svg")


# ---------------------------------------------------------------------------
# Chi-squared: one tail only, because the statistic cannot be negative
# ---------------------------------------------------------------------------

def chi_squared_figure() -> None:
    w, h = 340, 180
    pl, pr, pb, pt = 22, 18, 28, 14
    k = 4
    xmax = 16.0

    def cx(x): return pl + x / xmax * (w - pl - pr)
    def cpdf(x):
        if x <= 0:
            return 0.0
        return (x ** (k / 2 - 1) * math.exp(-x / 2)) / (2 ** (k / 2) * math.gamma(k / 2))
    ymax = max(cpdf(x / 100) for x in range(1, int(xmax * 100)))
    def cy(y): return h - pb - (y / ymax) * (h - pb - pt)

    pts = [(cx(x / 40), cy(cpdf(x / 40))) for x in range(0, int(xmax * 40) + 1)]
    path = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts)

    crit = 9.488          # CHISQ.INV.RT(0.05, 4)
    tail = [(cx(x / 40), cy(cpdf(x / 40)))
            for x in range(int(crit * 40), int(xmax * 40) + 1)]
    tail_d = (f"M {cx(crit):.2f},{cy(0):.2f} L " +
              " L ".join(f"{x:.2f},{y:.2f}" for x, y in tail) +
              f" L {cx(xmax):.2f},{cy(0):.2f} Z")

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="Chi-squared distribution with a single right-hand rejection tail">',
        "<title>Chi-squared distribution, 4 degrees of freedom</title>",
        f'<path d="{tail_d}" fill="{SHADE}" fill-opacity="0.3"/>',
        f'<line x1="{pl}" y1="{cy(0):.2f}" x2="{w - pr}" y2="{cy(0):.2f}" '
        f'stroke="{STROKE}" stroke-width="1" stroke-opacity="0.5"/>',
        f'<path d="{path}" fill="none" stroke="{STROKE}" stroke-width="2"/>',
        f'<line x1="{cx(crit):.2f}" y1="{cy(0):.2f}" x2="{cx(crit):.2f}" '
        f'y2="{cy(cpdf(crit)) - 26:.2f}" stroke="{SHADE}" stroke-width="1.6" '
        f'stroke-dasharray="4 3"/>',
        f'<text x="{cx(crit):.2f}" y="{h - 9}" text-anchor="middle" font-size="12" '
        f'fill="{SHADE}">critical value</text>',
        f'<text x="{cx(12.5):.2f}" y="{cy(0) - 14:.2f}" text-anchor="middle" '
        f'font-size="12" fill="{SHADE}">reject H&#8320;</text>',
        f'<text x="{pl}" y="{h - 9}" font-size="12" fill="{STROKE}" '
        f'opacity="0.65">0</text>',
        "</svg>",
    ]
    (IMG / "chi-squared-tail.svg").write_text("\n".join(svg))
    print("  wrote assets/img/chi-squared-tail.svg")


# ---------------------------------------------------------------------------
# Methodology flowcharts
# ---------------------------------------------------------------------------

def flowchart(name: str, steps: list[str], title: str) -> None:
    bw, bh, gap = 168, 88, 16
    n = len(steps)
    w = n * bw + (n - 1) * gap + 8
    h = bh + 46
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
           f'role="img" aria-label="{title}">', f"<title>{title}</title>"]
    for i, text in enumerate(steps):
        x = 4 + i * (bw + gap)
        svg.append(f'<rect x="{x}" y="4" width="{bw}" height="{bh}" rx="10" '
                   f'fill="#1f4e5f"/>')
        words = text.split()
        lines, cur = [], ""
        for word in words:
            trial = (cur + " " + word).strip()
            if len(trial) > 20 and cur:
                lines.append(cur)
                cur = word
            else:
                cur = trial
        if cur:
            lines.append(cur)
        start_y = 4 + bh / 2 - (len(lines) - 1) * 8
        for j, line in enumerate(lines):
            svg.append(f'<text x="{x + bw / 2:.0f}" y="{start_y + j * 16:.0f}" '
                       f'text-anchor="middle" font-size="13" fill="#ffffff" '
                       f'font-family="system-ui, sans-serif">{line}</text>')
    ay = bh + 22
    svg.append(f'<line x1="6" y1="{ay}" x2="{w - 18}" y2="{ay}" stroke="#1f4e5f" '
               f'stroke-opacity="0.45" stroke-width="6" stroke-linecap="round"/>')
    svg.append(f'<path d="M {w - 22},{ay - 8} L {w - 6},{ay} L {w - 22},{ay + 8} Z" '
               f'fill="#1f4e5f" fill-opacity="0.45"/>')
    svg.append("</svg>")
    (IMG / f"{name}.svg").write_text("\n".join(svg))
    print(f"  wrote assets/img/{name}.svg")


def main() -> None:
    IMG.mkdir(parents=True, exist_ok=True)
    print("Generating figures...")

    figure("normal-left-tail", [(X_MIN, -1.1)], [(-1.1, "c")],
           "Normal curve with the area to the left of c shaded")
    figure("normal-right-tail", [(-1.1, X_MAX)], [(-1.1, "c")],
           "Normal curve with the area to the right of c shaded")
    figure("normal-two-tails", [(X_MIN, -1.6), (1.6, X_MAX)],
           [(-1.6, "-c"), (1.6, "c")],
           "Normal curve with both outer tails shaded")
    figure("normal-middle", [(-1.2, 1.7)], [(-1.2, "a"), (1.7, "b")],
           "Normal curve with the area between a and b shaded")
    figure("normal-middle-95", [(-1.96, 1.96)], [(-1.96, "-c"), (1.96, "c")],
           "Normal curve with the central 95% shaded")
    figure("normal-plain", [], [],
           "Standard normal probability density curve")
    chi_squared_figure()

    flowchart("method-probability", [
        "Identify the information in the question",
        "Identify the probability function",
        "Identify the probability interval for evaluation",
        "Rearrange the probability so it fits what you have",
        "Comment on the result",
    ], "Method for evaluating probability intervals")

    flowchart("method-intervals", [
        "Identify the information in the question",
        "Identify missing and solvable information",
        "Identify the case from the table",
        "Evaluate the function for the known parameters",
        "Comment on the result",
    ], "Method for estimating intervals")

    flowchart("method-hypothesis", [
        "State the null and alternative hypothesis",
        "Identify the important information",
        "Choose a significance level",
        "Choose and calculate a test statistic",
        "Calculate the critical value and p-value",
        "Interpret your results",
    ], "Method for hypothesis testing")

    print("Done.")


if __name__ == "__main__":
    main()
