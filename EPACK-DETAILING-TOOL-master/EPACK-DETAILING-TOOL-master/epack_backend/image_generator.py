# import logging
# from ezdxf.addons.drawing import Frontend, RenderContext, svg, layout, config
# import ezdxf
# import re
# import xml.etree.ElementTree as ET


# class ImageGenerator:
#     def __init__(self, doc) -> None:
#         self.doc = doc
#         self.logger = logging.getLogger(self.__class__.__name__)
#         self.phase_regex_pattern = r"~PHASE_\d+/\d+"

#         # Process MTEXT for wrapping: preserve newlines and do not force width to zero.
#         for block in doc.blocks:
#             for entity in block:
#                 if entity.dxftype() == "MTEXT" and not re.match(
#                     self.phase_regex_pattern, entity.dxf.text
#                 ):
#                     # Get clean text content without formatting codes
#                     plain_text = entity.plain_text(fast=False).strip()

#                     # Check for EPACK in cleaned text (case-insensitive)
#                     if "EPACK" in plain_text.upper():
#                         print(f"Found EPACK text: {plain_text}")
#                         # Add any additional processing here

#                         # Example: Add a border to EPACK text (optional)
#                         # entity.dxf.frame = 1  # Uncomment to add border

#                     # Preserve original formatting and newlines
#                     entity.dxf.text = entity.dxf.text.replace(
#                         "\n", "\\P"
#                     )  # Use DXF paragraph marker
#                     entity.dxf.char_height *= 1  # Adjust as needed

#     # def generate_image_of_block(self, block_name, width, height, lineweight):
#     #     block = self.doc.blocks.get(block_name)
#     #     if block.name.startswith("mark_"):
#     #         # Temporarily modify colors for non-POCKET entities/layers
#     #         original_entity_colors = []
#     #         original_layer_colors = {}

#     #     for entity in block:
#     #         if entity.dxf.layer != "POCKET":
#     #             # Handle entities using BYLAYER (256)
#     #             if entity.dxf.color == 256:  # BYLAYER
#     #                 layer_name = entity.dxf.layer
#     #                 layer = self.doc.layers.get(layer_name)
#     #                 if layer_name not in original_layer_colors:
#     #                     original_layer_colors[layer_name] = layer.dxf.color
#     #                     layer.dxf.color = 0  # Force layer color to black
#     #                 pass
#     #             else:  # Direct color assignment
#     #                 original_entity_colors.append((entity, entity.dxf.color))
#     #                 entity.dxf.color = 0  # Set entity color to black

#     #     # Render with original colors for POCKET layer
#     #     context = RenderContext(doc=self.doc)
#     #     backend = svg.SVGBackend()
#     #     # cfg = config.Configuration(
#     #     #     lineweight_scaling=lineweight,
#     #     #     background_policy=config.BackgroundPolicy.WHITE,
#     #     #     color_policy=config.ColorPolicy.BLACK,  # Respect entity/layer colors
#     #     #     lineweight_policy=config.LineweightPolicy.ABSOLUTE,

#     #     # )
#     #     cfg = config.Configuration(
#     #         lineweight_scaling=lineweight,
#     #         background_policy=config.BackgroundPolicy.WHITE,  # Force white background [[5]]
#     #         color_policy=config.ColorPolicy.BLACK,  # Force entities to black
#     #         lineweight_policy=config.LineweightPolicy.ABSOLUTE,
#     #     )
#     #     frontend = Frontend(context, backend, config=cfg)
#     #     frontend.draw_entities(block)

#     #     # Restore original colors
#     #     for entity, color in original_entity_colors:
#     #         entity.dxf.color = color
#     #     for layer_name, color in original_layer_colors.items():
#     #         layer = self.doc.layers.get(layer_name)
#     #         layer.dxf.color = color

#     #     # Generate SVG
#     #     page = layout.Page(
#     #         width, height, layout.Units.px, margins=layout.Margins.all(20)
#     #     )
#     #     svg_string = backend.get_string(page)
#     #     self.logger.info("Image string successfully generated")
#     #     return svg_string

#     def generate_image_of_block(self, block_name, width, height, lineweight):
#         filter_value = "grayscale(100%) contrast(100%) invert(100%) saturate(200%)"
#         block = self.doc.blocks.get(block_name)
#         if block.name.startswith("mark_"):
#             # Temporarily modify colors for non-POCKET entities/layers
#             original_entity_colors = []
#             original_layer_colors = {}

#         for entity in block:
#             if entity.dxf.layer != "POCKET":
#                 # Handle entities using BYLAYER (256)
#                 if entity.dxf.color == 256:  # BYLAYER
#                     layer_name = entity.dxf.layer
#                     layer = self.doc.layers.get(layer_name)
#                     if layer_name not in original_layer_colors:
#                         original_layer_colors[layer_name] = layer.dxf.color
#                         layer.dxf.color = 0  # Force layer color to black
#                     pass
#                 else:  # Direct color assignment
#                     original_entity_colors.append((entity, entity.dxf.color))
#                     entity.dxf.color = 0  # Set entity color to black

#         # Render with original colors for POCKET layer
#         context = RenderContext(doc=self.doc)
#         backend = svg.SVGBackend()
#         cfg = config.Configuration(
#             lineweight_scaling=lineweight,
#             background_policy=config.BackgroundPolicy.WHITE,
#             color_policy=config.ColorPolicy.COLOR,  # Respect entity/layer colors
#             lineweight_policy=config.LineweightPolicy.ABSOLUTE,
#         )
#         frontend = Frontend(context, backend, config=cfg)
#         frontend.draw_entities(block)

#         # Restore original colors
#         for entity, color in original_entity_colors:
#             entity.dxf.color = color
#         for layer_name, color in original_layer_colors.items():
#             layer = self.doc.layers.get(layer_name)
#             layer.dxf.color = color

#         # Generate SVG
#         page = layout.Page(
#             width, height, layout.Units.px, margins=layout.Margins.all(20)
#         )
#         svg_string = backend.get_string(page)
#         # Apply CSS filter
#         svg_string = self.apply_css_filter(svg_string, filter_value)
#         self.logger.info("Image string successfully generated")
#         return svg_string

#     def apply_css_filter(self, svg_str, filter_value):
#         """
#         Inserts a CSS filter style on the root <svg> element.
#         The filter_value should be a valid CSS filter string, e.g.,
#         "invert(1) hue-rotate(180deg)" or "none".
#         """
#         try:
#             root = ET.fromstring(svg_str)
#         except Exception as e:
#             print("Error parsing SVG:", e)
#             return svg_str

#         # Get any existing style attribute and remove a previous filter if present.
#         style = root.attrib.get("style", "")
#         style = re.sub(r"filter\s*:\s*[^;]+;", "", style)
#         style += f"filter: {filter_value};"
#         root.attrib["style"] = style
#         return ET.tostring(root, encoding="unicode")

#     # def generate_image_of_block(self,block_name,width,height,lineweight):
#     #     block = self.doc.blocks.get(block_name)
#     #     if block.name.startswith('mark_'):
#     #         # for entity in block:
#     #         #     if entity.dxftype() == 'MTEXT' :
#     #         #           print(entity.dxf.text)
#     #         #Editing Image
#     #         # for entity in block:
#     #         #     if entity.dxftype() == 'MTEXT' and  not re.match(self.phase_regex_pattern,entity.dxf.text):
#     #         #         entity.dxf.text = entity.dxf.text.replace(" ", "\u00A0")
#     #         #         entity.dxf.width=0
#     #         #         entity.dxf.char_height*=1.3
#     #         #     elif entity.dxftype() == 'DIMENSION':
#     #         #         for virtual_entity in entity.virtual_entities():
#     #         #             if virtual_entity.dxftype() == 'MTEXT' and not re.match(self.phase_regex_pattern, virtual_entity.dxf.text):
#     #         #                 virtual_entity.dxf.text = virtual_entity.plain_text(fast=False)
#     #         #                 virtual_entity.dxf.text = virtual_entity.dxf.text.replace(" ", "\u00A0")
#     #         #                 virtual_entity.dxf.width=0
#     #         #                 virtual_entity.dxf.char_height*=1.3

#     #         self.logger.info("Image string generation started")
#     #         context = RenderContext(doc=self.doc)
#     #         backend = svg.SVGBackend()
#     #         cfg=config.Configuration(
#     #             lineweight_scaling=lineweight,
#     #             background_policy=config.BackgroundPolicy.WHITE,
#     #             color_policy=config.ColorPolicy.WHITE,
#     #             lineweight_policy= config.LineweightPolicy.ABSOLUTE,
#     #         )

#     #         frontend = Frontend(context, backend,config=cfg)
#     #         frontend.draw_entities(block)

#     #         # page = layout.Page(1920, 608, layout.Units.mm, margins=layout.Margins.all(20))
#     #         page = layout.Page(width, height, layout.Units.px, margins=layout.Margins.all(20))
#     #         svg_string = backend.get_string(page)
#     #         self.logger.info("Image string succesfully generated")

#     #     return svg_string


# if __name__ == "__main__":
#     #    doc=ezdxf.readfile('C:/Users/kalya/Downloads/RMC1.dxf')
#     doc = ezdxf.readfile("/Users/kalyan/Downloads/RMC1.dxf")
#     ig = ImageGenerator(doc)
#     # ezdxf.addons.drawing.properties.MODEL_SPACE_BG_COLOR = "#000000"
#     for block in doc.blocks:
#         if block.name.startswith("mark_"):
#             with open(f"{block.name}.svg", "w") as f:
#                 f.write(ig.generate_image_of_block(block.name, 1920, 1080, 2))
#                 print(f"Image of {block.name} generated successfully")

# #    print(ig.generate_image_of_block('mark_SC1_01',300 ,300)

#-----LAST WORKING VERSION ABOVE THIS LINE-----#


import logging
from ezdxf.addons.drawing import Frontend, RenderContext, svg, layout, config
import ezdxf
import re
import xml.etree.ElementTree as ET


class ImageGenerator:
    def __init__(self, doc) -> None:
        self.doc = doc
        self.logger = logging.getLogger(self.__class__.__name__)
        self.phase_regex_pattern = r"~PHASE_\d+/\d+"

        def fix_degree_symbols(text):
            # Replace all patterns like 88\U+00B0 or 88\\U+00B0 with 88°
            return re.sub(r"(\d+)\s*\\+U\+00B0", r"\1°", text)
        # Process MTEXT for wrapping: preserve newlines and do not force width to zero.
        for block in doc.blocks:
            for entity in block:
                if entity.dxftype() == "MTEXT" and not re.match(
                    self.phase_regex_pattern, entity.dxf.text
                ):
                    # Get clean text content without formatting codes
                    plain_text = entity.plain_text(fast=False).strip()

                    # Check for EPACK in cleaned text (case-insensitive)
                    if "EPACK" in plain_text.upper():
                        print(f"Found EPACK text: {plain_text}")
                        # Add any additional processing here

                        # Example: Add a border to EPACK text (optional)
                        # entity.dxf.frame = 1  # Uncomment to add border
                    # Fix degree symbols in the text
                    entity.dxf.text = fix_degree_symbols(entity.dxf.text)
                    # Preserve original formatting and newlines
                    entity.dxf.text = entity.dxf.text.replace(
                        "\n", "\\P"
                    )  # Use DXF paragraph marker
                    entity.dxf.char_height *= 1  # Adjust as needed

    # def generate_image_of_block(self, block_name, width, height, lineweight):
    #     block = self.doc.blocks.get(block_name)
    #     if block.name.startswith("mark_"):
    #         # Temporarily modify colors for non-POCKET entities/layers
    #         original_entity_colors = []
    #         original_layer_colors = {}

    #     for entity in block:
    #         if entity.dxf.layer != "POCKET":
    #             # Handle entities using BYLAYER (256)
    #             if entity.dxf.color == 256:  # BYLAYER
    #                 layer_name = entity.dxf.layer
    #                 layer = self.doc.layers.get(layer_name)
    #                 if layer_name not in original_layer_colors:
    #                     original_layer_colors[layer_name] = layer.dxf.color
    #                     layer.dxf.color = 0  # Force layer color to black
    #                 pass
    #             else:  # Direct color assignment
    #                 original_entity_colors.append((entity, entity.dxf.color))
    #                 entity.dxf.color = 0  # Set entity color to black

    #     # Render with original colors for POCKET layer
    #     context = RenderContext(doc=self.doc)
    #     backend = svg.SVGBackend()
    #     # cfg = config.Configuration(
    #     #     lineweight_scaling=lineweight,
    #     #     background_policy=config.BackgroundPolicy.WHITE,
    #     #     color_policy=config.ColorPolicy.BLACK,  # Respect entity/layer colors
    #     #     lineweight_policy=config.LineweightPolicy.ABSOLUTE,

    #     # )
    #     cfg = config.Configuration(
    #         lineweight_scaling=lineweight,
    #         background_policy=config.BackgroundPolicy.WHITE,  # Force white background [[5]]
    #         color_policy=config.ColorPolicy.BLACK,  # Force entities to black
    #         lineweight_policy=config.LineweightPolicy.ABSOLUTE,
    #     )
    #     frontend = Frontend(context, backend, config=cfg)
    #     frontend.draw_entities(block)

    #     # Restore original colors
    #     for entity, color in original_entity_colors:
    #         entity.dxf.color = color
    #     for layer_name, color in original_layer_colors.items():
    #         layer = self.doc.layers.get(layer_name)
    #         layer.dxf.color = color

    #     # Generate SVG
    #     page = layout.Page(
    #         width, height, layout.Units.px, margins=layout.Margins.all(20)
    #     )
    #     svg_string = backend.get_string(page)
    #     self.logger.info("Image string successfully generated")
    #     return svg_string

    def generate_image_of_block(self, block_name, width, height, lineweight):
        filter_value = "grayscale(100%) contrast(100%) invert(100%) saturate(200%)"
        block = self.doc.blocks.get(block_name)
        if block.name.startswith("mark_"):
            # Temporarily modify colors for non-POCKET entities/layers
            original_entity_colors = []
            original_layer_colors = {}

        for entity in block:
            if entity.dxf.layer != "POCKET":
                # Handle entities using BYLAYER (256)
                if entity.dxf.color == 256:  # BYLAYER
                    layer_name = entity.dxf.layer
                    layer = self.doc.layers.get(layer_name)
                    if layer_name not in original_layer_colors:
                        original_layer_colors[layer_name] = layer.dxf.color
                        layer.dxf.color = 0  # Force layer color to black
                    pass
                else:  # Direct color assignment
                    original_entity_colors.append((entity, entity.dxf.color))
                    entity.dxf.color = 0  # Set entity color to black

        # Render with original colors for POCKET layer
        context = RenderContext(doc=self.doc)
        backend = svg.SVGBackend()
        cfg = config.Configuration(
            lineweight_scaling=3,
            background_policy=config.BackgroundPolicy.WHITE,
            color_policy=config.ColorPolicy.COLOR,  # Respect entity/layer colors
            lineweight_policy=config.LineweightPolicy.ABSOLUTE,
        )
        frontend = Frontend(context, backend, config=cfg)
        frontend.draw_entities(block)

        # Restore original colors
        #for entity, color in original_entity_colors:
        #    entity.dxf.color = color
        #for layer_name, color in original_layer_colors.items():
        #    layer = self.doc.layers.get(layer_name)
        #    layer.dxf.color = color

        # Generate SVG
        page = layout.Page(
            width, height, layout.Units.px, margins=layout.Margins.all(20)
        )
        svg_string = backend.get_string(page)
        # Apply CSS filter
        svg_string = self.apply_css_filter(svg_string, filter_value)
        self.logger.info("Image string successfully generated")
        return svg_string

    def apply_css_filter(self, svg_str, filter_value):
        """
        Inserts a CSS filter style on the root <svg> element.
        The filter_value should be a valid CSS filter string, e.g.,
        "invert(1) hue-rotate(180deg)" or "none".
        """
        try:
            root = ET.fromstring(svg_str)
        except Exception as e:
            print("Error parsing SVG:", e)
            return svg_str

        # Get any existing style attribute and remove a previous filter if present.
        style = root.attrib.get("style", "")
        style = re.sub(r"filter\s*:\s*[^;]+;", "", style)
        style += f"filter: {filter_value};"
        root.attrib["style"] = style
        return ET.tostring(root, encoding="unicode")

    # def generate_image_of_block(self,block_name,width,height,lineweight):
    #     block = self.doc.blocks.get(block_name)
    #     if block.name.startswith('mark_'):
    #         # for entity in block:
    #         #     if entity.dxftype() == 'MTEXT' :
    #         #           print(entity.dxf.text)
    #         #Editing Image
    #         # for entity in block:
    #         #     if entity.dxftype() == 'MTEXT' and  not re.match(self.phase_regex_pattern,entity.dxf.text):
    #         #         entity.dxf.text = entity.dxf.text.replace(" ", "\u00A0")
    #         #         entity.dxf.width=0
    #         #         entity.dxf.char_height*=1.3
    #         #     elif entity.dxftype() == 'DIMENSION':
    #         #         for virtual_entity in entity.virtual_entities():
    #         #             if virtual_entity.dxftype() == 'MTEXT' and not re.match(self.phase_regex_pattern, virtual_entity.dxf.text):
    #         #                 virtual_entity.dxf.text = virtual_entity.plain_text(fast=False)
    #         #                 virtual_entity.dxf.text = virtual_entity.dxf.text.replace(" ", "\u00A0")
    #         #                 virtual_entity.dxf.width=0
    #         #                 virtual_entity.dxf.char_height*=1.3

    #         self.logger.info("Image string generation started")
    #         context = RenderContext(doc=self.doc)
    #         backend = svg.SVGBackend()
    #         cfg=config.Configuration(
    #             lineweight_scaling=lineweight,
    #             background_policy=config.BackgroundPolicy.WHITE,
    #             color_policy=config.ColorPolicy.WHITE,
    #             lineweight_policy= config.LineweightPolicy.ABSOLUTE,
    #         )

    #         frontend = Frontend(context, backend,config=cfg)
    #         frontend.draw_entities(block)

    #         # page = layout.Page(1920, 608, layout.Units.mm, margins=layout.Margins.all(20))
    #         page = layout.Page(width, height, layout.Units.px, margins=layout.Margins.all(20))
    #         svg_string = backend.get_string(page)
    #         self.logger.info("Image string succesfully generated")

    #     return svg_string


if __name__ == "__main__":
    #    doc=ezdxf.readfile('C:/Users/kalya/Downloads/RMC1.dxf')
    doc = ezdxf.readfile("/Users/kalyan/Downloads/RMC1.dxf")
    ig = ImageGenerator(doc)
    # ezdxf.addons.drawing.properties.MODEL_SPACE_BG_COLOR = "#000000"
    for block in doc.blocks:
        if block.name.startswith("mark_"):
            with open(f"{block.name}.svg", "w") as f:
                f.write(ig.generate_image_of_block(block.name, 1920, 1080, 2))
                print(f"Image of {block.name} generated successfully")

#    print(ig.generate_image_of_block('mark_SC1_01',300 ,300)
