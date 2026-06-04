import tkinter as tk
from tkinter import ttk

from flashmd.gui import theme


RATING_LABELS = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy", 5: "Perfect"}


class SessionSummaryScreen(ttk.Frame):
    def __init__(self, master, app, deck_id: str, results: dict):
        super().__init__(master)
        self._app = app
        self._deck_id = deck_id
        self._results = results
        self._build()

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)

        center = ttk.Frame(self)
        center.grid(row=0, column=0)
        center.columnconfigure(0, weight=1)

        if self._results.get("nothing_due"):
            ttk.Label(center, text="Nothing due today!", style="Title.TLabel").grid(
                row=0, column=0, pady=(60, 8)
            )
            ttk.Label(
                center,
                text="All caught up. Come back later.",
                style="Sub.TLabel",
            ).grid(row=1, column=0, pady=(0, 40))
        else:
            reviewed = self._results["reviewed"]
            ttk.Label(center, text="Session Complete", style="Title.TLabel").grid(
                row=0, column=0, pady=(60, 8)
            )
            ttk.Label(
                center,
                text=f"{reviewed} card{'s' if reviewed != 1 else ''} reviewed",
                style="Sub.TLabel",
            ).grid(row=1, column=0, pady=(0, 24))

            counts = self._results["rating_counts"]
            if counts:
                tbl = ttk.Frame(center, style="Surface.TFrame")
                tbl.grid(row=2, column=0, pady=(0, 32), padx=40, sticky="ew")
                tbl.columnconfigure(0, weight=1)
                tbl.columnconfigure(1, weight=1)

                for r in range(1, 6):
                    cnt = counts.get(r, 0)
                    if cnt == 0:
                        continue
                    color = theme.RATING_COLORS[r]
                    lbl_text = f"{r}  {RATING_LABELS[r]}"
                    tk.Label(
                        tbl, text=lbl_text,
                        font=theme.FONT_NORMAL,
                        fg=color, bg=theme.SURFACE,
                        anchor="w",
                    ).grid(row=r, column=0, sticky="w", padx=16, pady=3)
                    tk.Label(
                        tbl, text=str(cnt),
                        font=theme.FONT_NORMAL,
                        fg=theme.TEXT, bg=theme.SURFACE,
                        anchor="e",
                    ).grid(row=r, column=1, sticky="e", padx=16, pady=3)

        btn_frame = ttk.Frame(center)
        btn_frame.grid(row=3, column=0, pady=8)

        ttk.Button(
            btn_frame, text="Stats",
            command=lambda: self._app.show_deck_stats(self._deck_id),
        ).pack(side="left", padx=4)
        ttk.Button(
            btn_frame, text="Back to Decks",
            style="Accent.TButton",
            command=self._app.show_deck_list,
        ).pack(side="left", padx=4)
