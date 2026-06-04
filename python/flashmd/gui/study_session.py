import tkinter as tk
from tkinter import ttk
from collections import deque

from flashmd.db import progress_repo, deck_repo
from flashmd.gui import theme


class StudySessionScreen(ttk.Frame):
    def __init__(self, master, app, deck_id: str):
        super().__init__(master)
        self._app = app
        self._deck_id = deck_id
        self._conn = app.conn

        self._queue: deque = deque()
        self._total = 0
        self._reviewed = 0
        self._rating_counts: dict[int, int] = {}
        self._flipped = False

        self._build()
        self.after(0, self._load_queue)

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        # Header bar
        hdr = ttk.Frame(self, style="Surface.TFrame")
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.columnconfigure(1, weight=1)

        ttk.Button(hdr, text="← Back", command=self._back).grid(
            row=0, column=0, padx=8, pady=8
        )
        self._deck_label = ttk.Label(hdr, text="", style="Title.TLabel")
        self._deck_label.grid(row=0, column=1, sticky="w", padx=8)
        self._progress_label = ttk.Label(hdr, text="", style="Sub.TLabel")
        self._progress_label.grid(row=0, column=2, padx=16)

        # Progress bar
        self._progress_bar = ttk.Progressbar(self, orient="horizontal", mode="determinate")
        self._progress_bar.grid(row=1, column=0, sticky="ew", padx=0, pady=0)

        # Card area
        card_outer = ttk.Frame(self)
        card_outer.grid(row=2, column=0, sticky="nsew", padx=40, pady=20)
        card_outer.columnconfigure(0, weight=1)
        card_outer.rowconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        self._card_frame = tk.Frame(
            card_outer, bg=theme.SURFACE, relief="flat", bd=0
        )
        self._card_frame.grid(row=0, column=0, sticky="nsew")
        self._card_frame.columnconfigure(0, weight=1)
        self._card_frame.rowconfigure(0, weight=1)
        self._card_frame.rowconfigure(1, weight=1)

        self._front_label = tk.Label(
            self._card_frame,
            text="",
            font=theme.FONT_LARGE,
            fg=theme.TEXT,
            bg=theme.SURFACE,
            wraplength=600,
            justify="center",
            cursor="hand2",
        )
        self._front_label.grid(row=0, column=0, padx=30, pady=(40, 10), sticky="ew")
        self._front_label.bind("<Button-1>", lambda e: self._flip())

        self._sep = tk.Frame(self._card_frame, height=1, bg=theme.BORDER)

        self._back_label = tk.Label(
            self._card_frame,
            text="",
            font=theme.FONT_CARD,
            fg=theme.TEXT,
            bg=theme.SURFACE,
            wraplength=600,
            justify="left",
        )

        # Flip hint
        self._hint_label = tk.Label(
            self._card_frame,
            text="Click card or press Space to flip",
            font=theme.FONT_SMALL,
            fg=theme.SUBTEXT,
            bg=theme.SURFACE,
        )
        self._hint_label.grid(row=1, column=0, pady=(0, 20))

        # Rating buttons
        self._rating_frame = ttk.Frame(self)
        self._rating_frame.grid(row=3, column=0, pady=16)

        labels = {1: "Again", 2: "Hard", 3: "Good", 4: "Easy", 5: "Perfect"}
        self._rating_buttons = {}
        for rating in range(1, 6):
            color = theme.RATING_COLORS[rating]
            btn = tk.Button(
                self._rating_frame,
                text=f"{rating}  {labels[rating]}",
                font=theme.FONT_NORMAL,
                bg=color,
                fg="#1e1e1e",
                activebackground=color,
                activeforeground="#1e1e1e",
                relief="flat",
                padx=14,
                pady=7,
                cursor="hand2",
                command=lambda r=rating: self._rate(r),
            )
            btn.grid(row=0, column=rating - 1, padx=4)
            self._rating_buttons[rating] = btn

        self._hide_ratings()

        # Keyboard bindings
        self.bind_all("<space>", lambda e: self._flip() if not self._flipped else None)
        for i in range(1, 6):
            self.bind_all(str(i), lambda e, r=i: self._rate(r) if self._flipped else None)

    def _load_queue(self):
        deck = deck_repo.get_by_id(self._conn, self._deck_id)
        if deck:
            self._deck_label.config(text=deck["title"])

        rows = progress_repo.get_due_cards(self._conn, self._deck_id)
        self._queue = deque(rows)
        self._total = len(rows)
        self._reviewed = 0
        self._rating_counts = {}

        if not self._queue:
            self._app.show_session_summary(
                deck_id=self._deck_id,
                results={"reviewed": 0, "rating_counts": {}, "nothing_due": True},
            )
            return

        self._show_next()

    def _show_next(self):
        self._flipped = False
        self._hide_ratings()
        self._hint_label.grid()
        self._sep.grid_remove()
        self._back_label.grid_remove()

        card = self._queue[0]
        self._front_label.config(text=card["front"])
        self._back_label.config(text=card["back"])
        self._update_progress()

    def _flip(self):
        if self._flipped or not self._queue:
            return
        self._flipped = True
        self._hint_label.grid_remove()
        self._sep.grid(row=1, column=0, sticky="ew", padx=20, pady=4)
        self._back_label.grid(row=2, column=0, padx=30, pady=(4, 30), sticky="ew")
        self._show_ratings()

    def _rate(self, rating: int):
        if not self._flipped or not self._queue:
            return

        card = self._queue.popleft()
        progress_repo.apply_rating(self._conn, card["id"], rating)
        self._conn.commit()
        deck_repo.update_last_studied(self._conn, self._deck_id)
        self._conn.commit()

        self._rating_counts[rating] = self._rating_counts.get(rating, 0) + 1

        if rating < 3:
            # Place at end of queue to review again this session
            self._queue.append(card)
        else:
            self._reviewed += 1

        if not self._queue:
            self._finish()
        else:
            self._show_next()

    def _finish(self):
        self.unbind_all("<space>")
        for i in range(1, 6):
            self.unbind_all(str(i))
        self._app.show_session_summary(
            deck_id=self._deck_id,
            results={
                "reviewed": self._reviewed,
                "rating_counts": self._rating_counts,
                "nothing_due": False,
            },
        )

    def _back(self):
        self.unbind_all("<space>")
        for i in range(1, 6):
            self.unbind_all(str(i))
        self._app.show_deck_list()

    def _update_progress(self):
        remaining = sum(1 for _ in self._queue if True)
        total_in_queue = len(self._queue)
        done = self._reviewed
        label = f"{done} done  •  {total_in_queue} remaining"
        self._progress_label.config(text=label)

        if self._total > 0:
            pct = (done / self._total) * 100
            self._progress_bar["value"] = pct
            self._progress_bar["maximum"] = 100

    def _show_ratings(self):
        for btn in self._rating_buttons.values():
            btn.grid()

    def _hide_ratings(self):
        for btn in self._rating_buttons.values():
            btn.grid_remove()
