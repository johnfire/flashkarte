import tkinter as tk
from tkinter import ttk

from flashmd.db import deck_repo, progress_repo
from flashmd.gui import theme


RATING_LABELS = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy", 5: "Perfect"}


class DeckStatsScreen(ttk.Frame):
    def __init__(self, master, app, deck_id: str):
        super().__init__(master)
        self._app = app
        self._deck_id = deck_id
        self._conn = app.conn
        self._build()

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        # Header
        hdr = ttk.Frame(self, style="Surface.TFrame")
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.columnconfigure(1, weight=1)

        ttk.Button(hdr, text="← Back", command=self._app.show_deck_list).grid(
            row=0, column=0, padx=8, pady=8
        )

        deck = deck_repo.get_by_id(self._conn, self._deck_id)
        title = deck["title"] if deck else "Deck Stats"
        ttk.Label(hdr, text=title, style="Title.TLabel").grid(
            row=0, column=1, sticky="w", padx=8
        )

        # Content
        content = ttk.Frame(self)
        content.grid(row=1, column=0, sticky="nsew", padx=40, pady=24)
        content.columnconfigure(0, weight=1)

        stats = progress_repo.get_stats(self._conn, self._deck_id)

        # Summary row
        summary = ttk.Frame(content, style="Surface.TFrame")
        summary.grid(row=0, column=0, sticky="ew", pady=(0, 16))
        summary.columnconfigure(0, weight=1)
        summary.columnconfigure(1, weight=1)

        self._stat_block(summary, "Total Cards", str(stats["total"]), 0)
        self._stat_block(summary, "Due Today", str(stats["due"]), 1)

        # Ratings breakdown
        ttk.Label(content, text="Last Rating per Card", style="Sub.TLabel").grid(
            row=1, column=0, sticky="w", pady=(0, 8)
        )

        counts = stats["rating_counts"]
        total = stats["total"]

        tbl = ttk.Frame(content, style="Surface.TFrame")
        tbl.grid(row=2, column=0, sticky="ew")
        tbl.columnconfigure(1, weight=1)

        if not counts:
            tk.Label(
                tbl, text="No cards rated yet.",
                font=theme.FONT_SMALL, fg=theme.SUBTEXT, bg=theme.SURFACE,
            ).grid(row=0, column=0, columnspan=3, padx=16, pady=12, sticky="w")
        else:
            for row_idx, r in enumerate(range(1, 6)):
                cnt = counts.get(r, 0)
                color = theme.RATING_COLORS[r]

                tk.Label(
                    tbl, text=f"{r}  {RATING_LABELS[r]}",
                    font=theme.FONT_NORMAL, fg=color, bg=theme.SURFACE, anchor="w", width=12,
                ).grid(row=row_idx, column=0, padx=(16, 8), pady=4, sticky="w")

                # Bar
                bar_frame = tk.Frame(tbl, bg=theme.SURFACE2, height=16)
                bar_frame.grid(row=row_idx, column=1, padx=0, pady=4, sticky="ew")
                bar_frame.update_idletasks()

                if total > 0 and cnt > 0:
                    fill = tk.Frame(bar_frame, bg=color, height=16)
                    fill.place(relx=0, rely=0, relwidth=cnt / total, relheight=1)

                tk.Label(
                    tbl, text=str(cnt),
                    font=theme.FONT_NORMAL, fg=theme.SUBTEXT, bg=theme.SURFACE, width=5, anchor="e",
                ).grid(row=row_idx, column=2, padx=(8, 16), pady=4, sticky="e")

    def _stat_block(self, parent, label: str, value: str, col: int):
        f = tk.Frame(parent, bg=theme.SURFACE)
        f.grid(row=0, column=col, padx=12, pady=12, sticky="ew")
        tk.Label(f, text=value, font=theme.FONT_LARGE, fg=theme.ACCENT, bg=theme.SURFACE).pack()
        tk.Label(f, text=label, font=theme.FONT_SMALL, fg=theme.SUBTEXT, bg=theme.SURFACE).pack()
