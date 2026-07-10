"""
panel_rows.py

Turns the structured records from panel_dxf_extractor.py into the
row-dict schema the frontend expects — ONE ROW PER CODE, e.g. a line
with codes=[("W2",1), ("W3",1), ("W5",1), ("W6",1), ("W7",1), ("W8",1)]
becomes 6 separate rows, each carrying the same Length/Width/Thickness
but its own Sub Part.

Qty for each row comes straight from that code's parsed qty (already
resolved from any "~qty" suffix by the extractor — defaults to 1 there
if no suffix was present).

No regex lives in this file — all line/code parsing happens once, in
panel_dxf_extractor.py. This file just maps family -> Category/Item
Type and shapes the output dict:

    {
        "row_number": 1,
        "Category": "Wall Panel",
        "Item Type": "EPS",
        "Sub Part": "W2",
        "Unit": "NOS",
        "Qty": 1,
        "Camlock Type": "",
        "Width": 1170,
        "Length": 3694,
        "Thickness": 50,
        "Camlok": "",
        "Set Remarks": "",
    }

No block-name filtering info is exposed in the output — callers just get
a flat list of rows ready to hand to the frontend / dump to xlsx.

V-codes will plug in the same way later: add a VTextExtractor to
panel_dxf_extractor.py (just `family_letter = "V"`), then add a
"V" entry to _CATEGORY_BY_FAMILY / _ITEM_TYPE_BY_FAMILY and a call to
_process_records() below.
"""

from __future__ import annotations

import logging

from panel_dxf_extractor import WTextExtractor, RTextExtractor

logger = logging.getLogger(__name__)


# Category / Item Type, keyed by the code family letter.
_CATEGORY_BY_FAMILY = {
    "W": "Wall Panel",
    "R": "Roof Panel",
    # "V": "...",
}
_ITEM_TYPE_BY_FAMILY = {
    "W": "EPS",
    "R": "Puf roof Panel",
    # "V": "...",
}

_DEFAULT_UNIT = "NOS"


def _build_row(row_number: int, category: str, item_type: str,
                length: int, width: int, thickness: int, code: str, qty: int) -> dict:
    return {
        "row_number": row_number,
        "Category": category,
        "Item Type": item_type,
        "Sub Part": code,
        "Unit": _DEFAULT_UNIT,
        "Qty": qty,
        "Camlock Type": "",
        "Width": width,
        "Length": length,
        "Thickness": thickness,
        "Camlok": "",
        "Set Remarks": "",
    }


def _process_records(records, family: str, row_number: int, rows: list[dict]) -> int:
    try:
        category = _CATEGORY_BY_FAMILY[family]
        item_type = _ITEM_TYPE_BY_FAMILY[family]
    except KeyError:
        logger.error(
            f"No Category/Item Type mapping for family '{family}' — "
            f"skipping {len(records)} record(s)"
        )
        return row_number

    rows_built = 0
    for rec in records:
        try:
            for code, qty in rec.codes:
                rows.append(_build_row(row_number, category, item_type, rec.length, rec.width, rec.thickness, code, qty))
                row_number += 1
                rows_built += 1
        except Exception:
            logger.warning(
                f"Failed to build row(s) for '{family}' record in block "
                f"'{getattr(rec, 'block_name', '?')}'",
                exc_info=True,
            )
            continue

    logger.info(f"Built {rows_built} row(s) for family '{family}' from {len(records)} record(s)")
    return row_number


def extract_panel_rows(doc) -> list[dict]:
    """
    :param doc: an already-opened ezdxf Drawing (ezdxf.readfile(...))
    :return: list of row-dicts, ready for JSON / xlsx export.
             One row per individual code (W2, W3, R1, ...), not one per
             line. Qty comes from that code's "~qty" suffix, or 1 if none.
    """
    rows: list[dict] = []
    row_number = 1

    logger.info("Extracting panel rows from DXF document")

    try:
        w_records = WTextExtractor(doc).extract()
    except Exception:
        logger.exception("Failed to extract W-family records")
        w_records = []
    row_number = _process_records(w_records, "W", row_number, rows)

    try:
        r_records = RTextExtractor(doc).extract()
    except Exception:
        logger.exception("Failed to extract R-family records")
        r_records = []
    row_number = _process_records(r_records, "R", row_number, rows)

    logger.info(f"Extraction complete: {len(rows)} row(s) total")

    return rows


if __name__ == "__main__":
    import sys
    import json
    import ezdxf

    if len(sys.argv) < 2:
        print("Usage: python panel_rows.py <file.dxf>")
        sys.exit(1)

    doc = ezdxf.readfile(sys.argv[1])
    print(json.dumps(extract_panel_rows(doc), indent=2))