import tkinter as tk
from tkinter import ttk

from flashmd.db.database import get_connection, init_db
from flashmd.gui import theme
from flashmd.gui.deck_list import DeckListScreen
from flashmd.gui.study_session import StudySessionScreen
from flashmd.gui.session_summary import SessionSummaryScreen
from flashmd.gui.deck_stats import DeckStatsScreen


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("FlashMD")
        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w, h = sw // 2, sh // 2
        x, y = sw // 4, sh // 4
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(480, 360)

        theme.apply(self)

        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)

        self.conn = get_connection()
        init_db(self.conn)

        self._current: ttk.Frame | None = None
        self.show_deck_list()

    def _swap(self, frame: ttk.Frame) -> None:
        if self._current is not None:
            self._current.grid_forget()
        self._current = frame
        frame.grid(row=0, column=0, sticky="nsew")

    def show_deck_list(self) -> None:
        self._swap(DeckListScreen(self, self))

    def show_study_session(self, deck_id: str) -> None:
        self._swap(StudySessionScreen(self, self, deck_id))

    def show_session_summary(self, deck_id: str, results: dict) -> None:
        self._swap(SessionSummaryScreen(self, self, deck_id, results))

    def show_deck_stats(self, deck_id: str) -> None:
        self._swap(DeckStatsScreen(self, self, deck_id))
