"""Dark theme constants and ttk style configuration."""
import tkinter as tk
from tkinter import ttk

BG = "#1e1e1e"
SURFACE = "#2d2d2d"
SURFACE2 = "#3a3a3a"
TEXT = "#d4d4d4"
SUBTEXT = "#888888"
ACCENT = "#569cd6"
SUCCESS = "#4ec9b0"
DANGER = "#f44747"
WARN = "#dcdcaa"
BORDER = "#444444"

RATING_COLORS = {
    1: "#f44747",   # Again  — red
    2: "#ce9178",   # Hard   — orange
    3: "#dcdcaa",   # Good   — yellow
    4: "#4ec9b0",   # Easy   — teal
    5: "#569cd6",   # Perfect— blue
}

FONT_FAMILY = "Sans"
FONT_NORMAL = (FONT_FAMILY, 11)
FONT_SMALL = (FONT_FAMILY, 9)
FONT_LARGE = (FONT_FAMILY, 14, "bold")
FONT_CARD = (FONT_FAMILY, 13)


def apply(root: tk.Tk) -> None:
    root.configure(bg=BG)
    style = ttk.Style(root)
    style.theme_use("clam")

    style.configure(".", background=BG, foreground=TEXT, font=FONT_NORMAL)
    style.configure("TFrame", background=BG)
    style.configure("Surface.TFrame", background=SURFACE)

    style.configure(
        "TButton",
        background=SURFACE2,
        foreground=TEXT,
        borderwidth=0,
        padding=(10, 6),
        relief="flat",
    )
    style.map(
        "TButton",
        background=[("active", ACCENT), ("pressed", SURFACE)],
        foreground=[("active", "#ffffff")],
    )

    style.configure(
        "Accent.TButton",
        background=ACCENT,
        foreground="#ffffff",
        padding=(12, 7),
    )
    style.map(
        "Accent.TButton",
        background=[("active", "#4a86c0"), ("pressed", "#3a76b0")],
    )

    style.configure("TLabel", background=BG, foreground=TEXT, font=FONT_NORMAL)
    style.configure("Title.TLabel", font=FONT_LARGE, foreground=TEXT)
    style.configure("Sub.TLabel", font=FONT_SMALL, foreground=SUBTEXT)
    style.configure("Card.TLabel", font=FONT_CARD, foreground=TEXT, background=SURFACE)

    style.configure(
        "TProgressbar",
        background=ACCENT,
        troughcolor=SURFACE2,
        borderwidth=0,
        thickness=6,
    )

    style.configure("TSeparator", background=BORDER)
