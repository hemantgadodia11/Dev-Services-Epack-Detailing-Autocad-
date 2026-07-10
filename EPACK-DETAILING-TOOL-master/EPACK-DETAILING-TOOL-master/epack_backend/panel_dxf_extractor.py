"""
panel_dxf_extractor.py

Pulls part-mark lines (W-codes, R-codes) out of mark_* blocks in a DXF
and fully parses them — no downstream code needs to touch a regex.

Target text shape (after DIMENSION resolves "<>" to the measured value
and formatting codes are cleaned):

    Length X Width X Thickness <space> Ci X Cj X Ck ...

where each code Ci is a family letter + a number + an optional trailing
letter + an optional "~qty" (defaults to qty 1 if omitted):

e.g.
    3694X1170X50 W2XW3XW4XW5XW6XW7  ->  length=3694 width=1170 thickness=50
                                          codes=[("W2",1), ("W3",1), ("W4",1),
                                                 ("W5",1), ("W6",1), ("W7",1)]
    1894X1170X50 R1~9                ->  length=1894 width=1170 thickness=50
                                          codes=[("R1",9)]

WTextExtractor only matches W-lines, RTextExtractor only matches
R-lines — they share everything (the line regex, the code regex, the
walk over blocks/entities/DIMENSIONs) except the family letter, via the
common _PartTextExtractor base. All regex logic lives HERE, in one
place, so panel_rows.py doesn't need any of its own.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PartTextRecord:
    block_name: str
    family: str                      # "W" or "R"
    length: int
    width: int
    thickness: int
    codes: list[tuple[str, int]]     # [(code, qty), ...] e.g. [("W2", 1), ("W8", 9)]
    raw_text: str                    # text as resolved from the DXF, before cleanup


class _PartTextExtractor:
    """Shared logic for pulling "<L>X<W>X<T> <codes>" lines out of
    mark_* blocks and parsing them into structured records. Subclasses
    set `family_letter` to scope which codes they match (e.g. "W" or "R")."""

    family_letter: str = ""  # override in subclass

    def __init__(self, doc) -> None:
        self.doc = doc

        # A single code, optionally carrying "~qty": e.g. "W2", "W8A", "W8~9"
        self._code_pattern = re.compile(
            rf"^(?P<code>{self.family_letter}\d+[A-Za-z]?)(?:~(?P<qty>\d+))?$"
        )

        # A full line: <digits>X<digits>X<digits><space><code>(X<code>)*
        code_fragment = rf"{self.family_letter}\d+[A-Za-z]?(?:~\d+)?"
        self._line_pattern = re.compile(
            r"^(?P<length>\d+)X(?P<width>\d+)X(?P<thickness>\d+) "
            rf"(?P<codes>{code_fragment}(?:X{code_fragment})*)$"
        )

    @staticmethod
    def clean_mtext(text: str) -> str:
        """Same cleanup as DXFExtractor.clean_mtext: strip color/format
        codes like {\\C7;...} and the leading \\A1; alignment code."""
        text = re.sub(r"\{\\[A-Za-z0-9.]+;([^}]*)\}", r"\1", text)
        text = re.sub(r"\\A1;", "", text)
        return text.strip()

    def _parse_line(self, cleaned_text: str) -> tuple[int, int, int, list[tuple[str, int]]] | None:
        match = self._line_pattern.match(cleaned_text)
        if not match:
            return None

        length = int(match.group("length"))
        width = int(match.group("width"))
        thickness = int(match.group("thickness"))

        codes: list[tuple[str, int]] = []
        for code_str in match.group("codes").split("X"):
            code_match = self._code_pattern.match(code_str)
            if not code_match:
                continue  # shouldn't happen, already covered by _line_pattern
            code = code_match.group("code")
            qty = int(code_match.group("qty")) if code_match.group("qty") else 1
            codes.append((code, qty))

        return length, width, thickness, codes

    def extract(self) -> list[PartTextRecord]:
        results: list[PartTextRecord] = []
        blocks_scanned = 0
        entities_skipped = 0

        logger.info(f"[{self.family_letter}] Scanning DXF for mark_* blocks")

        for block in self.doc.blocks:
            if not block.name.startswith("mark_"):
                continue
            blocks_scanned += 1

            for entity in block:
                try:
                    # --- Case 1: text lives inside a DIMENSION's virtual MTEXT ---
                    if entity.dxftype() == "DIMENSION":
                        for virtual_entity in entity.virtual_entities():
                            if virtual_entity.dxftype() != "MTEXT":
                                continue
                            raw = virtual_entity.dxf.text
                            cleaned = self.clean_mtext(raw)
                            parsed = self._parse_line(cleaned)
                            if parsed:
                                length, width, thickness, codes = parsed
                                results.append(
                                    PartTextRecord(
                                        block_name=block.name,
                                        family=self.family_letter,
                                        length=length,
                                        width=width,
                                        thickness=thickness,
                                        codes=codes,
                                        raw_text=raw,
                                    )
                                )
                                logger.debug(
                                    f"[{self.family_letter}] Parsed DIMENSION text in "
                                    f"block '{block.name}': {cleaned!r} -> "
                                    f"L={length} W={width} T={thickness} codes={codes}"
                                )

                    # --- Case 2: a plain MTEXT entity directly in the block ---
                    elif entity.dxftype() == "MTEXT":
                        raw = entity.dxf.text
                        cleaned = self.clean_mtext(raw)
                        parsed = self._parse_line(cleaned)
                        if parsed:
                            length, width, thickness, codes = parsed
                            results.append(
                                PartTextRecord(
                                    block_name=block.name,
                                    family=self.family_letter,
                                    length=length,
                                    width=width,
                                    thickness=thickness,
                                    codes=codes,
                                    raw_text=raw,
                                )
                            )
                            logger.debug(
                                f"[{self.family_letter}] Parsed MTEXT in "
                                f"block '{block.name}': {cleaned!r} -> "
                                f"L={length} W={width} T={thickness} codes={codes}"
                            )
                except Exception:
                    entities_skipped += 1
                    logger.warning(
                        f"[{self.family_letter}] Skipped unreadable entity "
                        f"({entity.dxftype()}) in block '{block.name}'",
                        exc_info=True,
                    )
                    continue

        logger.info(
            f"[{self.family_letter}] Scanned {blocks_scanned} mark_* block(s), "
            f"extracted {len(results)} record(s), skipped {entities_skipped} unreadable entit(y/ies)"
        )

        return results


class WTextExtractor(_PartTextExtractor):
    family_letter = "W"


class RTextExtractor(_PartTextExtractor):
    family_letter = "R"


if __name__ == "__main__":
    import sys
    import ezdxf

    if len(sys.argv) < 2:
        print("Usage: python panel_dxf_extractor.py <file.dxf>")
        sys.exit(1)

    doc = ezdxf.readfile(sys.argv[1])

    for rec in WTextExtractor(doc).extract():
        print(f"[W][{rec.block_name}] L={rec.length} W={rec.width} T={rec.thickness} codes={rec.codes}")

    for rec in RTextExtractor(doc).extract():
        print(f"[R][{rec.block_name}] L={rec.length} W={rec.width} T={rec.thickness} codes={rec.codes}")