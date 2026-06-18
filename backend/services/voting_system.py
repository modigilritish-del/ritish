"""
services/voting_system.py
ULTIMATE voting system with garbage filtering
"""

from typing import List, Dict, Any
from difflib import SequenceMatcher
import time


class VotingSystem:
    """🔥 Intelligent voting with garbage rejection"""

    # -------------------------
    # BASIC UTILS
    # -------------------------
    @staticmethod
    def normalize_text(text: str) -> str:
        lines = text.split('\n')
        normalized = [' '.join(line.split()) for line in lines if line.strip()]
        return '\n'.join(normalized)

    @staticmethod
    def calculate_similarity(text1: str, text2: str) -> float:
        return SequenceMatcher(None, text1, text2).ratio() * 100

    # -------------------------
    # GARBAGE DETECTION (CRITICAL)
    # -------------------------
    @staticmethod
    def is_garbage(text: str) -> bool:
        if not text or len(text.strip()) < 30:
            return True

        letters = sum(c.isalpha() for c in text)
        spaces = text.count(" ")
        symbols = sum(not c.isalnum() and not c.isspace() for c in text)

        # Too many symbols or too few spaces = OCR noise
        if symbols > letters:
            return True

        if spaces < 8:
            return True

        return False

    # -------------------------
    # COMPLETENESS SCORE
    # -------------------------
    @staticmethod
    def calculate_completeness_score(text: str) -> float:
        if not text or not text.strip():
            return 0.0

        score = 0.0

        # Characters (40%)
        char_count = len(text)
        score += min(100, char_count) * 0.40

        # Words (30%)
        word_count = len(text.split())
        score += min(100, word_count * 3) * 0.30

        # Lines (20%)
        line_count = len([l for l in text.split("\n") if l.strip()])
        score += min(100, line_count * 10) * 0.20

        # Alphanumeric presence (10%)
        if any(c.isalnum() for c in text):
            score += 10

        return min(100.0, score)

    # -------------------------
    # BEST ENGINE SELECTION
    # -------------------------
    @staticmethod
    def auto_select_best_engine(results: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not results:
            return {"text": "", "confidence": 0, "engine": "none"}

        # 🔥 REMOVE EMPTY + GARBAGE RESULTS
        valid_results = [
            r for r in results
            if r.get("text", "").strip()
            and not VotingSystem.is_garbage(r["text"])
        ]

        if not valid_results:
            print("⚠️ All OCR outputs detected as garbage")
            return {"text": "", "confidence": 0, "engine": "none"}

        if len(valid_results) == 1:
            return valid_results[0]

        scored = []

        for r in valid_results:
            completeness = VotingSystem.calculate_completeness_score(r["text"])
            confidence = r.get("confidence", 0)

            total_score = (
                completeness * 0.6 +
                confidence * 0.4
            )

            print(
                f"🧠 {r['engine']}: completeness={completeness:.1f}, "
                f"confidence={confidence:.1f}, total={total_score:.1f}"
            )

            scored.append((total_score, r))

        scored.sort(key=lambda x: x[0], reverse=True)
        best_score, best = scored[0]

        best["selection_score"] = best_score
        return best

    # -------------------------
    # MERGE ENTRY POINT
    # -------------------------
    @staticmethod
    def merge_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
        start = time.time()

        best = VotingSystem.auto_select_best_engine(results)
        best["processing_time"] = time.time() - start
        best["source_engines"] = [r.get("engine", "unknown") for r in results]

        return best
