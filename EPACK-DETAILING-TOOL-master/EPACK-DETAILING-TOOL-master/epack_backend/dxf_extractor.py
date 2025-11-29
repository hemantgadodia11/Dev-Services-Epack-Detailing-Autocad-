from datetime import datetime
import re
import logging
from image_generator import ImageGenerator
from inventory_handler import InventoryHandler
import math
import re
import math


class DXFExtractor:
    # Toggle for error logging
    error_logging_enabled = False

    def __init__(self, doc, density, img_doc, lineweight) -> None:
        # self.parts_regex_pattern = r"\\A1;(?:\d+|\([^)]+\))X\d+X\d+ \w+(\~\d+)?"
        self.parts_regex_pattern = r"\\A1;(?:\{[^}]*\})?(?:\d+|\([^)]+\))X\d+X\d+ \w+(\~\d+)?"
        self.phase_regex_pattern = r"~PHASE_\d+/\d+"
        self.inventory_item_regex = r"^\d+ [A-Za-z0-9]+_[A-Za-z0-9()]+(~\d+)?$"
        # self.pipe_regex_MTEXT_pattern=r'\\A\d+;\d+ PB\d~{\\A\d+;\\C\d+;\d+NB \(M\)PIPE}'
        # self.pipe_regex_DIMENSION_pattern=r'<> PB\d~{\\A\d+;\\C\d+;\d+NB \(M\)PIPE}'
        self.shs_regex = re.compile(r"^SHS(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)(?:\((\d+(?:\.\d+)?)\))?$")
        self.ang_regex = re.compile(r"^ANG(\d+)X(\d+)(?:\(\d+\))?$")
        self.ismb_regex = re.compile(r"^ISMB(\d+)X(\d+)(?:\([^)]+\))?$")

        self.pipe_regex = re.compile(r"(\d+)NB")

        self.doc = doc
        self.density = density
        self.logger = logging.getLogger(self.__class__.__name__)
        self.img_doc = img_doc
        self.lineweight = lineweight
        self.mark_block_count = 0  # Initialize counter
        self.ignored_mtexts = []
        self.not_in_inventory = []
        self.ignored_blocks = []

    def clean_mtext(self, text):
        # Remove color formatting {\\C7;...}
        text = re.sub(r"\{\\[A-Za-z0-9.]+;([^}]*)\}", r"\1", text)
        # Remove \\A1; if present
        text = re.sub(r"\\A1;", "", text)
        return text

    def belongsInInventory(self, part_string, inventory_list):
        for item in inventory_list:
            if item["itemDescription"] in part_string:
                return True
        # fell out of the loop = not in inventory
        self.not_in_inventory.append(part_string)
        return False

    def extract_parts_from_block(self, image_width, image_height):
        self.logger.info("Extracting parts from block")
        inventory_list = InventoryHandler().get_inventory_list()
        block_wise_parts_dict = {}
        ig = ImageGenerator(self.img_doc)
        duplicate_check_dict = {}
        for block in self.doc.blocks:
            if block.name.startswith("mark_"):
                self.mark_block_count += 1  # Increment count
                block_wise_parts_dict[block.name] = {
                    "parts": [],
                    "phase": {},
                    "image_url": ig.generate_image_of_block(
                        block_name=block.name,
                        width=image_width,
                        height=image_height,
                        lineweight=float(self.lineweight),
                    ),
                }
                duplicate_check_dict[block.name] = {}
                for entity in block:
                    if entity.dxftype() == "DIMENSION":
                        for virtual_entity in entity.virtual_entities():
                            if virtual_entity.dxftype() == "MTEXT" and re.match(
                                self.parts_regex_pattern, virtual_entity.dxf.text
                            ):
                                if ("-" in virtual_entity.dxf.text and "TPL" in virtual_entity.dxf.text):
                                    # print("You are here wp---1")
                                    try:
                                        part_str = virtual_entity.dxf.text[4:]
                                        print(part_str,"You are Here TPL ----1")
                                        dimension, name = part_str.split(" ")
                                        dimension = re.sub(r"[()]", "", dimension)
                                        # print("Dimension",dimension)
                                        length_segments = [float(l) for l in dimension.split("X")[0].split("+")]
                                        width1 = float(dimension.split("X")[1])
                                        thickness = float(dimension.split("X")[2])

                                        # Extract widths (e.g., 700-500)
                                        width_values = [float(w) for w in name.split("(")[1].split(")")[0].split("-")]

                                        # Calculate total length
                                        length = sum(length_segments)

                                        # Calculate dynamic area: segment-wise
                                        area = 0
                                        total_weight = 0
                                        volume_segment = 0
                                        for i in range(len(length_segments)):
                                            l = length_segments[i]
                                            w1 = width_values[i]
                                            w2 = width_values[i + 1]
                                            avg_width = (w1 + w2) / 2

                                            area_segment = (
                                                (l * avg_width) * 2
                                                + (l * thickness) * 2
                                                + (avg_width * thickness) * 2
                                            )
                                            area = w1
                                            print(area,"AREA")
                                            # Volume for the current segment
                                            volume_segment = l * avg_width * thickness / 1000000000  # mm³ to m³
                                            total_weight += volume_segment * float(self.density)  # Weight = Volume * Density

                                        area = area / 1000000  # mm² to m²
                                        print(area,"AREA2")

                                        # Use average of all widths for volume and yield
                                        avg_width = sum(width_values) / len(width_values)
                                        volume = l * avg_width * thickness / 1000000000
                                        weight = area *thickness * float(self.density) / 1000
                                        print(weight,"WEIGHT")

                                        if "~" in name:
                                            part_name, qty = name.split("~")
                                        else:
                                            qty = 1
                                            part_name = name

                                        if part_name not in duplicate_check_dict[block.name]:
                                            block_wise_parts_dict[block.name]["parts"].append(
                                                {
                                                    "Part Name": part_name.upper(),
                                                    "Thickness (mm)": thickness,
                                                    "Quantity": float(qty),
                                                    "Length (mm)": length,
                                                    "Width (mm)": float(width1),
                                                    "Area (m2)": round(area, 2) if round(area, 2) != 0 else area,
                                                    "Volume (m3)": round(volume, 2) if round(volume, 2) else volume,
                                                    "Weight (kg)": round(weight, 2) if round(weight, 2) else weight,
                                                    "Yield": 240 if avg_width == 0 else 345,
                                                }
                                            )
                                            duplicate_check_dict[block.name][part_name] = True

                                    except Exception as e:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(f"Error {e}")

                                if ("-" in virtual_entity.dxf.text and "WP" in virtual_entity.dxf.text):
                                    # print("You are here wp---1")
                                    try:
                                        part_str = virtual_entity.dxf.text[4:]
                                        print(part_str,"You are Here WP ----1")
                                        dimension, name = part_str.split(" ")
                                        dimension = re.sub(r"[()]", "", dimension)
                                        # print("Dimension",dimension)
                                        length_segments = [float(l) for l in dimension.split("X")[0].split("+")]
                                        thickness = float(dimension.split("X")[2])

                                        # Extract widths (e.g., 700-500-600)
                                        width_values = [float(w) for w in name.split("(")[1].split(")")[0].split("-")]

                                        # Calculate total length
                                        length = sum(length_segments)

                                        # Calculate dynamic area: segment-wise
                                        area = 0
                                        total_weight = 0
                                        volume_segment = 0
                                        for i in range(len(length_segments)):
                                            l = length_segments[i]
                                            w1 = width_values[i]
                                            w2 = width_values[i + 1]
                                            avg_width = (w1 + w2) / 2

                                            area_segment = (
                                                (l * avg_width) * 2
                                                + (l * thickness) * 2
                                                + (avg_width * thickness) * 2
                                            )
                                            area += area_segment
                                            # Volume for the current segment
                                            volume_segment = l * avg_width * thickness / 1000000000  # mm³ to m³
                                            total_weight += volume_segment * float(self.density)  # Weight = Volume * Density

                                        area = area / 1000000  # mm² to m²

                                        # Use average of all widths for volume and yield
                                        avg_width = sum(width_values) / len(width_values)
                                        volume = l * avg_width * thickness / 1000000000
                                        weight = total_weight

                                        if "~" in name:
                                            part_name, qty = name.split("~")
                                        else:
                                            qty = 1
                                            part_name = name

                                        if part_name not in duplicate_check_dict[block.name]:
                                            block_wise_parts_dict[block.name]["parts"].append(
                                                {
                                                    "Part Name": part_name.upper(),
                                                    "Thickness (mm)": thickness,
                                                    "Quantity": float(qty),
                                                    "Length (mm)": length,
                                                    "Width (mm)": max(width_values),
                                                    "Area (m2)": round(area, 2) if round(area, 2) != 0 else area,
                                                    "Volume (m3)": round(volume, 2) if round(volume, 2) else volume,
                                                    "Weight (kg)": round(weight, 2) if round(weight, 2) else weight,
                                                    "Yield": 240 if avg_width == 0 else 345,
                                                }
                                            )
                                            duplicate_check_dict[block.name][part_name] = True

                                    except Exception as e:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(f"Error {e}")

                                elif "TST" in virtual_entity.dxf.text:

                                    print("You are here TST---1")
                                    try:
                                        
                                        part_str = virtual_entity.dxf.text[4:]
                                        print(part_str,"You are Here TST ----1")
                                        dimention, name = part_str.split(" ")
                                        length, width, thickness = dimention.split("X")
                                        length = float(length)
                                        width = float(width)
                                        thickness = float(thickness)
                                        area1 = (
                                            (length * width) * 2
                                            + (length * thickness) * 2
                                            + (width * thickness) * 2
                                        ) / 1000000  # Calculate area
                                        area = area1/2
                                        volume1 = length * width * thickness / 1000000000
                                        volume = volume1
                                        weight1 = volume * float(self.density)
                                        weight = weight1/2

                                        if "~" in name:
                                            part_name, qty = name.split("~")
                                        else:
                                            qty = 1
                                            part_name = name

                                        if (
                                            part_name
                                            not in duplicate_check_dict[block.name]
                                        ):
                                            block_wise_parts_dict[block.name][
                                                "parts"
                                            ].append(
                                                {
                                                    "Part Name": part_name.upper(),
                                                    "Thickness (mm)": float(thickness),
                                                    "Quantity": float(qty),
                                                    "Length (mm)": float(length),
                                                    "Width (mm)": float(width),
                                                    "Area (m2)": (
                                                        round(area, 2)
                                                        if round(area, 2) != 0
                                                        else area
                                                    ),
                                                    "Volume (m3)": (
                                                        round(volume, 2)
                                                        if round(volume, 2)
                                                        else volume
                                                    ),
                                                    "Weight (kg)": (
                                                        round(weight, 2)
                                                        if round(weight, 2)
                                                        else weight
                                                    ),
                                                    "Yield": (
                                                        240
                                                        if float(width) == 0
                                                        else 345
                                                    ),
                                                }
                                            )
                                            duplicate_check_dict[block.name][
                                                part_name
                                            ] = True

                                    except Exception as e:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(f"Error  {e}")


                                else:

                                    try:
                                        part_str = virtual_entity.dxf.text[4:]
                                        print(part_str,"You are Here----1")
                                        dimention, name = part_str.split(" ")
                                        length, width, thickness = dimention.split("X")
                                        length = float(length)
                                        width = float(width)
                                        thickness = float(thickness)
                                        area = (
                                            (length * width) * 2
                                            + (length * thickness) * 2
                                            + (width * thickness) * 2
                                        ) / 1000000  # Calculate area
                                        volume = length * width * thickness / 1000000000
                                        weight = volume * float(self.density)

                                        if "~" in name:
                                            part_name, qty = name.split("~")
                                        else:
                                            qty = 1
                                            part_name = name

                                        if (
                                            part_name
                                            not in duplicate_check_dict[block.name]
                                        ):
                                            block_wise_parts_dict[block.name][
                                                "parts"
                                            ].append(
                                                {
                                                    "Part Name": part_name.upper(),
                                                    "Thickness (mm)": float(thickness),
                                                    "Quantity": float(qty),
                                                    "Length (mm)": float(length),
                                                    "Width (mm)": float(width),
                                                    "Area (m2)": (
                                                        round(area, 2)
                                                        if round(area, 2) != 0
                                                        else area
                                                    ),
                                                    "Volume (m3)": (
                                                        round(volume, 2)
                                                        if round(volume, 2)
                                                        else volume
                                                    ),
                                                    "Weight (kg)": (
                                                        round(weight, 2)
                                                        if round(weight, 2)
                                                        else weight
                                                    ),
                                                    "Yield": (
                                                        240
                                                        if float(width) == 0
                                                        else 345
                                                    ),
                                                }
                                            )
                                            duplicate_check_dict[block.name][
                                                part_name
                                            ] = True

                                    except Exception as e:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(f"Error  {e}")

                            elif virtual_entity.dxftype() == "MTEXT" and re.match(self.inventory_item_regex, virtual_entity.dxf.text):
                                try:
                                    part_str = virtual_entity.dxf.text.strip()
                                    print(part_str,"You are Here elif ----1")
                                    length, name = part_str.split(" ")
                                    part_mark, inventory_item = name.split("_")
                                    if "~" in inventory_item:
                                        inventory_part_name, qty = inventory_item.split(
                                            "~"
                                        )
                                    else:
                                        qty = 1
                                        inventory_part_name = inventory_item

                                    inventory_part_details = next(
                                        (
                                            item
                                            for item in inventory_list
                                            if item["itemDescription"]
                                            == inventory_part_name
                                        ),
                                        None,
                                    )
                                    if inventory_part_details is None:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(
                                                f"Error  No such inventory item exists"
                                            )
                                        continue

                                    weight = (
                                        float(inventory_part_details["weightPerMeter"])
                                        * float(length)
                                        / 1000
                                    )

                                    if (
                                        part_mark
                                        not in duplicate_check_dict[block.name]
                                    ):
                                        block_wise_parts_dict[block.name][
                                            "parts"
                                        ].append(
                                            {
                                                "Part Name": part_mark.upper()
                                                + " "
                                                + inventory_part_details[
                                                    "itemDescription"
                                                ],
                                                "Thickness (mm)": float(
                                                    inventory_part_details["thickness"]
                                                ),
                                                "Quantity": float(qty),
                                                "Length (mm)": float(length),
                                                "Width (mm)": 0,
                                                "Area (m2)": 0,
                                                "Volume (m3)": 0,
                                                "Weight (kg)": (
                                                    round(weight, 2)
                                                    if round(weight, 2) != 0
                                                    else weight
                                                ),
                                                "Yield": (
                                                    240 if float(width) == 0 else 345
                                                ),
                                            }
                                        )
                                        duplicate_check_dict[block.name][
                                            part_mark
                                        ] = True

                                except Exception as e:
                                    if DXFExtractor.error_logging_enabled:
                                        self.logger.error(f"Error  {e}")

                            # inventory items

                            elif virtual_entity.dxftype() == "MTEXT" and (
                                re.match(
                                    self.inventory_item_regex,
                                    virtual_entity.plain_text(),
                                )
                                or self.belongsInInventory(
                                    virtual_entity.dxf.text, inventory_list
                                )
                            ):
                                try:
                                    part_str = virtual_entity.plain_text().strip()
                                    print(part_str,"You are Here Inventory Items ----1")
                                    length, name = part_str.split(" ")
                                    part_mark, inventory_item = name.split("_")
                                    if "~" in inventory_item:
                                        inventory_part_name, qty = inventory_item.split(
                                            "~"
                                        )
                                    else:
                                        qty = 1
                                        inventory_part_name = inventory_item

                                    inventory_part_details = next(
                                        (
                                            item
                                            for item in inventory_list
                                            if item["itemDescription"]
                                            == inventory_part_name
                                        ),
                                        None,
                                    )
                                    if inventory_part_details is None:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(
                                                f"Error  No such inventory item exists"
                                            )
                                        continue

                                    weight = (
                                        float(inventory_part_details["weightPerMeter"])
                                        * float(length)
                                        / 1000
                                    )

                                    if (
                                        part_mark
                                        not in duplicate_check_dict[block.name]
                                    ):
                                        # pre-calculate the Area
                                        area = 0
                                        length = float(length)
                                        if "SHS" in part_mark:
                                            print("Getting inside IF")
                                            match = self.shs_regex.match(inventory_part_name)
                                            print(inventory_part_name,"inventory_part_name")
                                            print(match,"Match")
                                            if match:
                                                side1 = float(match.group(1))
                                                side2 = float(match.group(2))
                                                # print(length)
                                                area = (
                                                    (side1 + side2) * 2 * length
                                                ) / 1000000
                                                print(area,"Area Of SHS1")

                                        elif "PB" in part_mark:
                                            match = self.pipe_regex.match(
                                                inventory_part_name
                                            )
                                            if match:
                                                diameter = float(match.group(1))
                                                # print(diameter)
                                                area = (
                                                    2
                                                    * math.pi
                                                    * (diameter / 2)
                                                    * length
                                                ) / 1000000
                                                # print("PB",area)
                                        
                                        elif "ISMB" in part_mark:
                                            # print("You are here ------------------- ISMB1",inventory_part_name)
                                            match = self.ismb_regex.match(
                                                inventory_part_name
                                            )
                                            # print("You are here ------------------- ISMB2",match)
                                            if match:
                                                side1 = float(match.group(1))
                                                side2 = float(match.group(2))
                                                # print(length)
                                                area = (
                                                    (side1 + (side2*2)) * 2 * length
                                                ) / 1000000
                                                # print(area)
                                                # print("PB",area)

                                        elif "ANG" in part_mark:
                                            match = self.ang_regex.match(
                                                inventory_part_name
                                            )
                                            if match:
                                                side1 = float(match.group(1))
                                                side2 = float(match.group(2))
                                                area = (
                                                    side1 * side2 * 2 * length
                                                ) / 1000000

                                        # print(inventory_part_name)
                                        # print(length)
                                        # print("\n")

                                        block_wise_parts_dict[block.name][
                                            "parts"
                                        ].append(
                                            {
                                                "Part Name": part_mark.upper()
                                                + " "
                                                + inventory_part_details[
                                                    "itemDescription"
                                                ],
                                                "Thickness (mm)": float(
                                                    inventory_part_details["thickness"]
                                                ),
                                                "Quantity": float(qty),
                                                "Length (mm)": length,
                                                "Width (mm)": 0,
                                                "Area (m2)": round(area, 2),
                                                "Volume (m3)": 0,
                                                "Weight (kg)": (
                                                    round(weight, 2)
                                                    if round(weight, 2) != 0
                                                    else weight
                                                ),
                                                "Yield": 250,
                                            }
                                        )
                                        duplicate_check_dict[block.name][
                                            part_mark
                                        ] = True

                                except Exception as e:
                                    if DXFExtractor.error_logging_enabled:
                                        self.logger.error(f"Error  {e}")
                            else:
                                try:
                                    text = entity.dxf.text.strip()
                                    # if it didn't match any of your parts/inventory/phase patterns:
                                    self.ignored_mtexts.append(
                                        {
                                            "block": block.name,
                                            "text": text,
                                            "timestamp": datetime.utcnow().isoformat(),  # optional
                                        }
                                    )
                                    continue
                                except Exception as e:
                                    if DXFExtractor.error_logging_enabled:
                                        self.logger.error(f"Error  {e}")
                            # elif virtual_entity.dxftype()=="MTEXT" and re.match(self.pipe_regex_MTEXT_pattern,virtual_entity.dxf.text):

                            #     try:
                            #         part_str=virtual_entity.dxf.text[4:]
                            #         length,str0,pipename=part_str.split(" ")
                            #         partname,str1=str0.split('~')
                            #         pipe_name=str1.split(';')[2]
                            #         pipe_mark=pipe_name+pipename[0:3]
                            #         pipe=next((item for item in inventory_list if item["itemDescription"] == pipe_mark), None)
                            #         area=(2*math.pi*math.pow(float(pipe["thickness"])/2,2)+math.pi*float(pipe["thickness"])*float(length))/1000000
                            #         volume=(math.pi*math.pow(float(pipe["thickness"])/2,2)*float(length))/1000000000
                            #         weight=float(pipe["weightPerMeter"])*float(length)/1000

                            #         if partname not in duplicate_check_dict[block.name]:
                            #             block_wise_parts_dict[block.name]['parts'].append({
                            #             "Part Name": partname.upper()+" "+f"({pipe_mark} PIPE)",
                            #             "Thickness (mm)": float(pipe["thickness"]),
                            #             "Quantity": 1,
                            #             "Length (mm)": float(length),
                            #             "Width (mm)": float(pipe["thickness"]),
                            #             "Area (m2)": round(area,2) if round(area,2)!=0 else area,
                            #             "Volume (m3)": round(volume,2) if round(volume,2)!=0 else volume,
                            #             "Weight (kg)": round(weight,2) if round(weight,2)!=0 else weight
                            #             })
                            #             duplicate_check_dict[block.name][partname]=True
                            #     except Exception as e:
                            #         self.logger.error(f"Error  yoo  {e}")

                    elif entity.dxftype() == "MTEXT" and re.match(
                        self.phase_regex_pattern, entity.dxf.text
                    ):
                        try:
                            phase_strings = re.findall(
                                self.phase_regex_pattern, entity.dxf.text
                            )
                            for phase_str in phase_strings:
                                phase_str = phase_str[1:]
                                phase_name, phase_qty = phase_str.split("/")
                                block_wise_parts_dict[block.name]["phase"][
                                    phase_name
                                ] = float(phase_qty)
                        except Exception as e:
                            if DXFExtractor.error_logging_enabled:
                                self.logger.error(f"Error  {e}")

                    elif entity.dxftype() == "MTEXT" and re.match(
                        self.parts_regex_pattern[5:], entity.dxf.text
                    ):
                        # if ("-" in virtual_entity.dxf.text and "TPL" in virtual_entity.dxf.text):
                        if "-" in entity.dxf.text and "TPL" in entity.dxf.text:
                                    print("You are here wp---1")
                                    try:
                                        # part_str = virtual_entity.dxf.text[4:]
                                        part_str = entity.dxf.text[4:]
                                        print(part_str,"You are Here TPL ----1")
                                        dimension, name = part_str.split(" ")
                                        dimension = re.sub(r"[()]", "", dimension)
                                        # print("Dimension",dimension)
                                        length_segments = [float(l) for l in dimension.split("X")[0].split("+")]
                                        width1 = float(dimension.split("X")[1])
                                        thickness = float(dimension.split("X")[2])

                                        # Extract widths (e.g., 700-500)
                                        width_values = [float(w) for w in name.split("(")[1].split(")")[0].split("-")]

                                        # Calculate total length
                                        length = sum(length_segments)

                                        # Calculate dynamic area: segment-wise
                                        area = 0
                                        total_weight = 0
                                        volume_segment = 0
                                        for i in range(len(length_segments)):
                                            l = length_segments[i]
                                            w1 = width_values[i]
                                            w2 = width_values[i + 1]
                                            avg_width = (w1 + w2) / 2

                                            area_segment = (
                                                (l * avg_width) * 2
                                                + (l * thickness) * 2
                                                + (avg_width * thickness) * 2
                                            )
                                            area = w1
                                            print(area,"AREA")
                                            # Volume for the current segment
                                            volume_segment = l * avg_width * thickness / 1000000000  # mm³ to m³
                                            total_weight += volume_segment * float(self.density)  # Weight = Volume * Density

                                        area = area / 1000000  # mm² to m²
                                        print(area,"AREA2")

                                        # Use average of all widths for volume and yield
                                        avg_width = sum(width_values) / len(width_values)
                                        volume = l * avg_width * thickness / 1000000000
                                        weight = area *thickness * float(self.density) / 1000
                                        print(weight,"WEIGHT")

                                        if "~" in name:
                                            part_name, qty = name.split("~")
                                        else:
                                            qty = 1
                                            part_name = name

                                        if part_name not in duplicate_check_dict[block.name]:
                                            block_wise_parts_dict[block.name]["parts"].append(
                                                {
                                                    "Part Name": part_name.upper(),
                                                    "Thickness (mm)": thickness,
                                                    "Quantity": float(qty),
                                                    "Length (mm)": length,
                                                    "Width (mm)": float(width1),
                                                    "Area (m2)": round(area, 2) if round(area, 2) != 0 else area,
                                                    "Volume (m3)": round(volume, 2) if round(volume, 2) else volume,
                                                    "Weight (kg)": round(weight, 2) if round(weight, 2) else weight,
                                                    "Yield": 240 if avg_width == 0 else 345,
                                                }
                                            )
                                            duplicate_check_dict[block.name][part_name] = True

                                    except Exception as e:
                                        if DXFExtractor.error_logging_enabled:
                                            self.logger.error(f"Error {e}")
                        
                        if "-" in entity.dxf.text and "WP" in entity.dxf.text:
                            try:
                                part_str = entity.dxf.text.strip()
                                print(part_str,"You are Here WP----2")
                                dimension, name = part_str.split(" ")
                                dimension = re.sub(r"[()]", "", dimension)

                                length_segments = [float(l) for l in dimension.split("X")[0].split("+")]
                                thickness = float(dimension.split("X")[2])

                                # Extract widths (e.g., 700-500-600)
                                width_values = [float(w) for w in name.split("(")[1].split(")")[0].split("-")]

                                # Calculate total length
                                length = sum(length_segments)

                                # Calculate dynamic area: segment-wise
                                area = 0
                                total_weight = 0
                                volume_segment = 0
                                for i in range(len(length_segments)):
                                    l = length_segments[i]
                                    w1 = width_values[i]
                                    w2 = width_values[i + 1]
                                    avg_width = (w1 + w2) / 2

                                    area_segment = (
                                        (l * avg_width) * 2
                                        + (l * thickness) * 2
                                        + (avg_width * thickness) * 2
                                    )
                                    area += area_segment
                                    # Volume for the current segment
                                    volume_segment += l * avg_width * thickness / 1000000000  # mm³ to m³
                                    total_weight += volume_segment * float(self.density)  # Weight = Volume * Density

                                area = area / 1000000  # mm² to m²

                                # Use average of all widths for volume and yield
                                avg_width = sum(width_values) / len(width_values)
                                volume = volume_segment
                                weight = total_weight

                                if "~" in name:
                                    part_name, qty = name.split("~")
                                else:
                                    qty = 1
                                    part_name = name

                                if part_name not in duplicate_check_dict[block.name]:
                                    block_wise_parts_dict[block.name]["parts"].append(
                                        {
                                            "Part Name": part_name.upper(),
                                            "Thickness (mm)": thickness,
                                            "Quantity": float(qty),
                                            "Length (mm)": length,
                                            "Width (mm)": max(width_values),
                                            "Area (m2)": round(area, 2) if round(area, 2) != 0 else area,
                                            "Volume (m3)": round(volume, 2) if round(volume, 2) else volume,
                                            "Weight (kg)": round(weight, 2) if round(weight, 2) else weight,
                                            "Yield": 240 if avg_width == 0 else 345,
                                        }
                                    )
                                    duplicate_check_dict[block.name][part_name] = True

                            except Exception as e:
                                if DXFExtractor.error_logging_enabled:
                                    self.logger.error(f"Error {e}")

                        elif "TST" in entity.dxf.text:
                                
                                print("You are here TST---2")
                                try:
                                    
                                    part_str = entity.dxf.text.strip()
                                    print(part_str,"You are Here TST----2")
                                    dimention, name = part_str.split(" ")
                                    length, width, thickness = dimention.split("X")
                                    length = float(length)
                                    width = float(width)
                                    thickness = float(thickness)
                                    area1 = (
                                        (length * width) * 2
                                        + (length * thickness) * 2
                                        + (width * thickness) * 2
                                    ) / 1000000  # Calculate area
                                    area = area1/2
                                    volume1 = length * width * thickness / 1000000000
                                    volume = volume1
                                    weight1 = volume * float(self.density)
                                    weight = weight1/2

                                    if "~" in name:
                                        part_name, qty = name.split("~")
                                    else:
                                        qty = 1
                                        part_name = name

                                    if (
                                        part_name
                                        not in duplicate_check_dict[block.name]
                                    ):
                                        block_wise_parts_dict[block.name][
                                            "parts"
                                        ].append(
                                            {
                                                "Part Name": part_name.upper(),
                                                "Thickness (mm)": float(thickness),
                                                "Quantity": float(qty),
                                                "Length (mm)": float(length),
                                                "Width (mm)": float(width),
                                                "Area (m2)": (
                                                    round(area, 2)
                                                    if round(area, 2) != 0
                                                    else area
                                                ),
                                                "Volume (m3)": (
                                                    round(volume, 2)
                                                    if round(volume, 2)
                                                    else volume
                                                ),
                                                "Weight (kg)": (
                                                    round(weight, 2)
                                                    if round(weight, 2)
                                                    else weight
                                                ),
                                                "Yield": (
                                                    240
                                                    if float(width) == 0
                                                    else 345
                                                ),
                                            }
                                        )
                                        duplicate_check_dict[block.name][
                                            part_name
                                        ] = True

                                except Exception as e:
                                    if DXFExtractor.error_logging_enabled:
                                        self.logger.error(f"Error  {e}")


                        else:
                            try:
                                part_str = entity.dxf.text.strip()
                                print(part_str,"You are Here----2")
                                dimention, name = part_str.split(" ")
                                length, width, thickness = dimention.split("X")
                                length = float(length)
                                width = float(width)
                                thickness = float(thickness)
                                area = (
                                    (length * width) * 2
                                    + (length * thickness) * 2
                                    + (width * thickness) * 2
                                ) / 1000000  # Calculate area
                                volume = length * width * thickness / 1000000000
                                weight = volume * float(self.density)

                                if "~" in name:
                                    part_name, qty = name.split("~")
                                else:
                                    qty = 1
                                    part_name = name

                                if part_name not in duplicate_check_dict[block.name]:
                                    block_wise_parts_dict[block.name]["parts"].append(
                                        {
                                            "Part Name": part_name.upper(),
                                            "Thickness (mm)": float(thickness),
                                            "Quantity": float(qty),
                                            "Length (mm)": float(length),
                                            "Width (mm)": float(width),
                                            "Area (m2)": (
                                                round(area, 2)
                                                if round(area, 2) != 0
                                                else area
                                            ),
                                            "Volume (m3)": (
                                                round(volume, 2)
                                                if round(volume, 2) != 0
                                                else volume
                                            ),
                                            "Weight (kg)": (
                                                round(weight, 2)
                                                if round(weight, 2) != 0
                                                else weight
                                            ),
                                            "Yield": 240 if float(width) == 0 else 345,
                                        }
                                    )
                                    duplicate_check_dict[block.name][part_name] = True

                            except Exception as e:
                                if DXFExtractor.error_logging_enabled:
                                    self.logger.error(f"Error  {e}")
                    # try matching after cleaning the text
                    elif entity.dxftype() == "MTEXT" and re.match(
                        self.parts_regex_pattern[5:], self.clean_mtext(entity.dxf.text)
                    ):
                        # try:

                        #     print("Entity text:", entity.dxf.text)
                        #     print("Entity type:", entity.dxftype())
                        # except AttributeError:
                        #     pass
                        if "TST" in entity.dxf.text:
                                
                                print("You are here TST---2ghgh")
                                try:
                                    
                                    part_str = self.clean_mtext(entity.dxf.text).strip()
                                    print(part_str,"You are Here TST----2121")
                                    dimention, name = part_str.split(" ")
                                    length, width, thickness = dimention.split("X")
                                    length = float(length)
                                    width = float(width)
                                    thickness = float(thickness)
                                    area1 = (
                                        (length * width) * 2
                                        + (length * thickness) * 2
                                        + (width * thickness) * 2
                                    ) / 1000000  # Calculate area
                                    area = area1/2
                                    volume1 = length * width * thickness / 1000000000
                                    volume = volume1
                                    weight1 = volume * float(self.density)
                                    print(weight1,"weight of TST actual")
                                    weight_div2 = weight1/2
                                    print(weight_div2,"weight of TST /2 ")

                                    if "~" in name:
                                        part_name, qty = name.split("~")
                                    else:
                                        qty = 1
                                        part_name = name

                                    if (part_name not in duplicate_check_dict[block.name]):
                                        block_wise_parts_dict[block.name][
                                            "parts"
                                        ].append(
                                            {
                                                "Part Name": part_name.upper(),
                                                "Thickness (mm)": float(thickness),
                                                "Quantity": float(qty),
                                                "Length (mm)": float(length),
                                                "Width (mm)": float(width),
                                                "Area (m2)": (
                                                    round(area, 2)
                                                    if round(area, 2) != 0
                                                    else area
                                                ),
                                                "Volume (m3)": (
                                                    round(volume, 2)
                                                    if round(volume, 2)
                                                    else volume
                                                ),
                                                "Weight (kg)": (
                                                    round(weight_div2, 2)
                                                    if round(weight_div2, 2)
                                                    else weight_div2
                                                ),
                                                "Yield": (
                                                    240
                                                    if float(width) == 0
                                                    else 345
                                                ),
                                            }
                                        )
                                        duplicate_check_dict[block.name][
                                            part_name
                                        ] = True
                                    print(block_wise_parts_dict[block.name]["parts"][-1],"block_wise_parts_dict")
                                except Exception as e:
                                    if DXFExtractor.error_logging_enabled:
                                        self.logger.error(f"Error  {e}")
                        else:
                            try:
                                part_str = self.clean_mtext(entity.dxf.text).strip()
                                print(part_str,"You are Here---- Final.")
                                dimention, name = part_str.split(" ")
                                length, width, thickness = dimention.split("X")
                                length = float(length)
                                width = float(width)
                                thickness = float(thickness)
                                area = (
                                    (length * width) * 2
                                    + (length * thickness) * 2
                                    + (width * thickness) * 2
                                ) / 1000000  # Calculate area
                                volume = length * width * thickness / 1000000000
                                weight = volume * float(self.density)

                                if "~" in name:
                                    part_name, qty = name.split("~")
                                else:
                                    qty = 1
                                    part_name = name
                                # print(
                                #     f"Part Name: {part_name}, Thickness: {thickness}, Quantity: {qty}, Length: {length}, Width: {width}, Area: {area}, Volume: {volume}, Weight: {weight}"
                                # )

                                if part_name not in duplicate_check_dict[block.name]:
                                    block_wise_parts_dict[block.name]["parts"].append(
                                        {
                                            "Part Name": part_name.upper(),
                                            "Thickness (mm)": float(thickness),
                                            "Quantity": float(qty),
                                            "Length (mm)": float(length),
                                            "Width (mm)": float(width),
                                            "Area (m2)": (
                                                round(area, 2)
                                                if round(area, 2) != 0
                                                else area
                                            ),
                                            "Volume (m3)": (
                                                round(volume, 2)
                                                if round(volume, 2) != 0
                                                else volume
                                            ),
                                            "Weight (kg)": (
                                                round(weight, 2)
                                                if round(weight, 2) != 0
                                                else weight
                                            ),
                                            "Yield": 240 if float(width) == 0 else 345,
                                        }
                                    )
                                    duplicate_check_dict[block.name][part_name] = True

                            except Exception as e:
                                if DXFExtractor.error_logging_enabled:
                                    self.logger.error(f"Error  {e}")

                    else:
                        try:
                            text = entity.dxf.text.strip()
                            # if it didn't match any of your parts/inventory/phase patterns:
                            self.ignored_mtexts.append(
                                {
                                    "block": block.name,
                                    "text": text,
                                    "timestamp": datetime.utcnow().isoformat(),  # optional
                                }
                            )
                            continue
                        except Exception as e:
                            if DXFExtractor.error_logging_enabled:
                                self.logger.error(f"Error  {e}")
            else:
                try:
                    self.ignored_blocks.append(
                        {
                            "block": block.name,
                            "timestamp": datetime.utcnow().isoformat(),  # optional
                        }
                    )
                except Exception as e:
                    if DXFExtractor.error_logging_enabled:
                        self.logger.error(f"Error  {e}")
                continue

        self.logger.info("Sucessfully generated blockwise parts dict")
        return {
            "blocks": block_wise_parts_dict,
            "mark_blocks_count": self.mark_block_count,  # Add count to result
            "ignored_blocks": self.ignored_blocks,
            "ignored_mtexts": self.ignored_mtexts,
            "not_in_inventory": self.not_in_inventory,
        }


if __name__ == "__main__":

    import json
    import ezdxf

    doc = ezdxf.readfile("/Users/kalyan/Downloads/tt.dxf")
    doc2 = ezdxf.readfile("/Users/kalyan/Downloads/tt.dxf")
    extractor = DXFExtractor(doc, 7900, doc2, 1)
    with open("data.json", "w") as outfile:
        json.dump(extractor.extract_parts_from_block(300, 300), outfile)
