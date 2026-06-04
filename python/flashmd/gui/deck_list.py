import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path

from flashmd.db import deck_repo, progress_repo
from flashmd.db.import_service import import_deck
from flashmd.parser.md_parser import parse
from flashmd.gui import theme


class DeckListScreen(ttk.Frame):
    def __init__(self, master, app):
        super().__init__(master)
        self._app = app
        self._build()
        self._load()

    def _build(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(1, weight=1)

        # Header
        hdr = ttk.Frame(self, style="Surface.TFrame")
        hdr.grid(row=0, column=0, sticky="ew", pady=(0, 2))
        hdr.columnconfigure(0, weight=1)

        ttk.Label(hdr, text="FlashMD", style="Title.TLabel").grid(
            row=0, column=0, sticky="w", padx=16, pady=12
        )
        ttk.Button(hdr, text="+ Import .md", style="Accent.TButton",
                   command=self._import).grid(row=0, column=1, padx=12, pady=8)

        # Scrollable deck list
        container = ttk.Frame(self)
        container.grid(row=1, column=0, sticky="nsew")
        container.columnconfigure(0, weight=1)
        container.rowconfigure(0, weight=1)

        canvas = tk.Canvas(container, bg=theme.BG, highlightthickness=0)
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        self._list_frame = ttk.Frame(canvas)
        self._list_frame.columnconfigure(0, weight=1)

        self._list_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=self._list_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.grid(row=0, column=0, sticky="nsew")
        scrollbar.grid(row=0, column=1, sticky="ns")

        canvas.bind("<MouseWheel>", lambda e: canvas.yview_scroll(-1 * (e.delta // 120), "units"))
        canvas.bind("<Button-4>", lambda e: canvas.yview_scroll(-1, "units"))
        canvas.bind("<Button-5>", lambda e: canvas.yview_scroll(1, "units"))

        # Empty state label
        self._empty_label = ttk.Label(
            self._list_frame,
            text="No decks yet. Import a .md file to get started.",
            style="Sub.TLabel",
        )

    def _load(self):
        for w in self._list_frame.winfo_children():
            w.destroy()

        conn = self._app.conn
        decks = deck_repo.get_all(conn)

        if not decks:
            self._empty_label = ttk.Label(
                self._list_frame,
                text="No decks yet. Import a .md file to get started.",
                style="Sub.TLabel",
            )
            self._empty_label.grid(row=0, column=0, padx=24, pady=40)
            return

        for idx, deck in enumerate(decks):
            stats = progress_repo.get_stats(conn, deck["id"])
            self._deck_card(deck, stats, idx)

    def _deck_card(self, deck, stats, row):
        card = ttk.Frame(self._list_frame, style="Surface.TFrame")
        card.grid(row=row, column=0, sticky="ew", padx=12, pady=4)
        card.columnconfigure(0, weight=1)

        ttk.Label(card, text=deck["title"], style="Title.TLabel").grid(
            row=0, column=0, sticky="w", padx=12, pady=(10, 2)
        )

        last = deck["last_studied"]
        last_str = f"Last studied: {last[:10]}" if last else "Never studied"
        info = f"{stats['total']} cards  •  {stats['due']} due today  •  {last_str}"
        ttk.Label(card, text=info, style="Sub.TLabel").grid(
            row=1, column=0, sticky="w", padx=12, pady=(0, 4)
        )

        btn_frame = ttk.Frame(card, style="Surface.TFrame")
        btn_frame.grid(row=0, column=1, rowspan=2, padx=12, pady=8)

        deck_id = deck["id"]
        ttk.Button(
            btn_frame, text="Study",
            style="Accent.TButton",
            command=lambda d=deck_id: self._app.show_study_session(d),
        ).pack(side="left", padx=(0, 4))
        ttk.Button(
            btn_frame, text="Stats",
            command=lambda d=deck_id: self._app.show_deck_stats(d),
        ).pack(side="left")

    def _import(self):
        path = filedialog.askopenfilename(
            title="Import Markdown Deck",
            filetypes=[("Markdown files", "*.md"), ("All files", "*.*")],
        )
        if not path:
            return

        try:
            text = Path(path).read_text(encoding="utf-8")
        except OSError as e:
            messagebox.showerror("Error", f"Could not read file:\n{e}")
            return

        parsed = parse(text, Path(path).name)
        if not parsed.cards:
            messagebox.showerror(
                "No Flashcards Found",
                "No flashcards found in this file.\n"
                "Make sure cards follow the pattern:\n"
                "  **N. TERM — Full Name**",
            )
            return

        conn = self._app.conn
        existing = deck_repo.get_by_title(conn, parsed.title)
        if existing:
            ok = messagebox.askyesno(
                "Deck Already Exists",
                f'"{parsed.title}" already exists.\n'
                "Replace it? Progress for unchanged cards will be kept.",
            )
            if not ok:
                return

        import_deck(conn, parsed)
        self._load()
