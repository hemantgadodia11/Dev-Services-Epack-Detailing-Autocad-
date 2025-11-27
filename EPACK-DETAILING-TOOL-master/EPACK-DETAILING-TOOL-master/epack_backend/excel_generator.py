import openpyxl
import re

def natural_sort_key(s):
    # Split into digit and non-digit chunks
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]


class ExcelGenerator:
    def __init__(self, block_wise_parts_dict) -> None:
        self.block_wise_parts_dict = block_wise_parts_dict
        self.block_header_list = [
            "SNO",
            "ITEM TYPE",
            "SECTION SIZE",
            "SUB PART",
            "LENGTH",
            "QTY",
            "UNIT WT.",
            "TOTAL WT",
            "SURFACE AREA (M2)",
            "TOTAL SURFACE AREA (M2)",
            "PART MARK",
            "PART DESCRIPTION",
            "LENGTH",
            "WIDTH",
            "THK.",
            "QTY.",
            "QTY./BLDG.",
            "YIELD",
            "WEIGHT",
            "SURFACE AREA (M2)",
        ]
        self.item_type_dict = {
            "SC": "Column",
            "RF": "Rafter",
            "PC": "Portal Column",
            "PB": "Portal Beam",
            "GST": "Gusset Plate",
            "PBR": "Pipe Bracing",
            "BR": "Pipe Bracing",
            "STP": "Strut Pipe",
            "CL": "Clip",
            "ANG": "Angle",
            "RHS": "RHS",
            "SHS": "SHS",
            "RA": "Angle",
            "PP": "Packing Plate",
            "4CBM9A": "Crane Beam",
            "MB": "Mezzanine Beam",
            "JS": "Mezzanine Joist",
            "ISMC": "ISMC00",
            "BKT": "Bracket",
            "ST": "Stiffener",
            "TST" :"Stiffener",
            "EC": "End Wall Column",
            "MC": "Mezzanine Column",
            "T": "Splice Plate",
            "LPX": "Fascia Column",
            "ICO": "Intermediate Column",
            "IC": "Intermediate Column",
            "CRF": "Canopy Rafter",
            "SBX": "Surge Beam",
            "CON": "Canopy Connector",
            "CC": "Canopy Connector",
            "LD": "Cage Ladder",
            "CJ": "'C' Section Jamb",
            "HR": "Hand Rail",
            "PL": "Loose Splice Plate",
            "LC": "Len To Column",
            "JB": "Jack Beam",
            "MRF": "Monitor Rafter",
            "KAG": "Crane Beam Angle",
            "CCL": "Crane Beam Clip",
            "CSTP": "Crane Stopper",
            "CHQ": "Chequered Plate",
            "GTR": "Grating",
            "ER": "End Wall Rafter",
            "ISMB": "ISMB",
            "ISMC": "ISMC",
            "CHP": "Header Plate",
            "BM": "Tie Beam",
            "LP": "Life Line",
            "TR": "Truss",
            "ABR": "Angle Bracing",
            "STD-SPL0": "Shim Plate",
            "SA": "Sag Angle",
            "SSC": "Staircase Stringer",
            "TD": "Trade",
            "SCL": "Stair Clip",
            "SB": "Stair Beam",
            "WB": "Walkway Beam",
            "WCL": "Walkway Clip",
            "LCL": "Lean To Column",
            "STC": "Stub Column",
            "STB": "Stub Beam",
        }

    def generate_excel_for_phase(self, phase_name):

        wb = openpyxl.Workbook()
        sheet = wb.active

        block_list = []
        
        for block_name, block_details in self.block_wise_parts_dict.items():
            # Extract SUB PART safely
            sub_part = ""
            try:
                sub_part_match = block_name.split("_")
                if len(sub_part_match) >= 3:
                    sub_part = sub_part_match[1]
            except Exception as e:
                print(f"Error extracting sub part: {e}")

            block_list.append((sub_part, block_name, block_details))

        block_list.sort(key=lambda x: natural_sort_key(x[0]) if x[0] else "")

        for sub_part, block_name, block_details in block_list:
            total_sa = 0
            total_w = 0

            if block_details["phase"].get(phase_name) is not None:
                print("phase_name",phase_name)
                phase_qty = int(block_details["phase"][phase_name])
                print("phase_qty if", phase_qty)
            else:
                phase_qty = 1

            max_length = 0
            for parts_dict in block_details["parts"]:
                total_sa = total_sa + parts_dict["Area (m2)"]
                total_w = total_w + (parts_dict["Weight (kg)"] * int(parts_dict["Quantity"]))
                if parts_dict["Length (mm)"] > max_length:
                    max_length = parts_dict["Length (mm)"]

            item_type = "UNKNOWN"

            try:
                item_name = block_name.split("_")[1]
                item_name = "".join(i for i in item_name if not i.isdigit())
                for key, value in self.item_type_dict.items():
                    if key.lower() == item_name.lower():
                        item_type = value
                        break
            except Exception as e:
                print(f"Error in item_type_dict lookup: {e}")

            sheet.append([])
            sheet.append(self.block_header_list)
            sheet.append(
                [
                    "",
                    item_type.upper(),
                    "",
                    sub_part, 
                    max_length,  
                    phase_qty,
                    total_w,
                    phase_qty * total_w,
                    total_sa,
                    total_sa * phase_qty,
                ]
            )
            sheet.append(
                [
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "PART MARK",
                    "PART DESCRIPTION",
                    "LENGTH",
                    "WIDTH",
                    "THK.",
                    "QTY.",
                    "QTY./BLDG.",
                    "YIELD",
                    "WEIGHT",
                    "SURFACE AREA (M2)",
                ]
            )
            sorted_parts = sorted(block_details["parts"], key=lambda pd: pd["Part Name"].lower())
            for parts_dict in sorted_parts:
                yeild = "240" if int(parts_dict["Width (mm)"]) == 0 else "345"
                sheet.append(
                    [
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                        parts_dict["Part Name"],
                        "",
                        parts_dict["Length (mm)"],
                        parts_dict["Width (mm)"],
                        parts_dict["Thickness (mm)"],
                        parts_dict["Quantity"],
                        int(parts_dict["Quantity"]) * phase_qty,
                        yeild,
                        parts_dict["Weight (kg)"] * int(parts_dict["Quantity"]),
                        parts_dict["Area (m2)"] * int(parts_dict["Quantity"]),
                    ]
                )

        return wb


if __name__ == "__main__":
    import json

    with open("data.json", "r") as file:
        data = json.load(file)

        xl = ExcelGenerator(block_wise_parts_dict=data)
        # print(xl.block_header_list[10:])
        # xl.generate_excel_for_phase("PHASE_1")
        # save the excel into a file
        xl.generate_excel_for_phase("PHASE_1").save("test.xlsx")
