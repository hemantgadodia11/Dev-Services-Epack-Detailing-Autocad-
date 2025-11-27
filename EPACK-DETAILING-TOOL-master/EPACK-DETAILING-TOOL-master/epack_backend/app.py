import os
import json
import logging
import io
from flask import Flask, request, jsonify, abort, Response, send_file, make_response
import ezdxf
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dxf_extractor import DXFExtractor
from local_storage_utils import LocalStorageUtils
from user_handler import UserHandler
from project_handler import ProjectHandler
from excel_generator import ExcelGenerator
from inventory_handler import InventoryHandler
from layout_handler import LayoutHandler
import random

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
#############_________________FLASK APP______________________#################
# Define the upload folder
UPLOAD_FOLDER = "files"
ALLOWED_EXTENSIONS = {"dxf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

logging.basicConfig(
    level=logging.INFO,  # Set the logging level
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("log_file.log"),  # Log to a file
        logging.StreamHandler(),  # Log to the console
    ],
)

logger = logging.getLogger("main")

def allowed_file(filename):
    print(filename)
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# Test Route
@app.route("/")
def hello_world():
    return "Hello, World!"

@app.route("/get_dxf_info", methods=["POST"])
def get_dxf_info():
    try:
        print("Starting DXF processing request")
        
        # if file is not present give error 406
        if "file" not in request.files:
            print("ERROR: No file provided in request")
            logger.error("No File Provided")
            abort(406, description="No file part")

        # if file is not selected give error 406
        dxf_file = request.files["file"]
        if dxf_file.filename == "":
            print("ERROR: No file selected")
            logger.error("No File Selected")
            abort(406, description="No selected file")

        print(f"File received: {dxf_file.filename}")

        # if density is not present give error 406
        try:
            density = float(request.form.get("density"))
            if not density:
                print("ERROR: No density provided")
                logger.error("No Density Provided")
                abort(406, description="Density value not provided")
            print(f"Density: {density}")
        except (ValueError, TypeError) as e:
            print(f"ERROR: Invalid density value - {e}")
            logger.error("Invalid Density Value")
            abort(406, description="Invalid density value")

        try:
            width = float(request.form.get("width"))
            if not width:
                print("ERROR: No width provided")
                logger.error("No width Provided by browser")
                abort(406, description="Width value not provided by browser")
            print(f"Width: {width}")
        except (ValueError, TypeError) as e:
            print(f"ERROR: Invalid width value - {e}")
            logger.error("Invalid Width Value")
            abort(406, description="Invalid width value")

        try:
            height = float(request.form.get("height"))
            if not height:
                print("ERROR: No height provided")
                logger.error("No height Provided by browser")
                abort(406, description="Height value not provided by browser")
            print(f"Height: {height}")
        except (ValueError, TypeError) as e:
            print(f"ERROR: Invalid height value - {e}")
            logger.error("Invalid Height Value")
            abort(406, description="Invalid height value")

        project_name = request.form.get("projectName")
        if not project_name:
            print("ERROR: No project name provided")
            logger.error("No project name Provided by user")
            abort(406, description="Project name not provided by user")
        print(f"Project name: {project_name}")

        username = request.form.get("username")
        if not username:
            print("ERROR: No username provided")
            logger.error("No username Provided by user")
            abort(406, description="Username not provided by user")
        print(f"Username: {username}")

        lineweight = request.form.get("lineweight")
        if not lineweight:
            print("ERROR: No line weight provided")
            logger.error("No line weight Provided by user")
            abort(406, description="lineWeigth not provided by the user")
        print(f"Line weight: {lineweight}")

        if dxf_file and allowed_file(dxf_file.filename):
            print("DXF File format validated successfully")
            logging.info("DXF File Detected")
            
            try:
                # Create the UPLOAD_FOLDER if it doesn't exist
                os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
                # new_file_name = str(dxf_file.filename.split(".")[0] + "" + random.random() + dxf_file.filename.split(".")[1])
                #  Split the original filename
                filename_parts = os.path.splitext(dxf_file.filename)
                name_part = filename_parts[0]
                ext_part = filename_parts[1]
                logger.warning(name_part)
                logger.warning(ext_part)
                # Generate a new filename with a random number
                random_suffix = str(random.random()).replace(".", "")  # safer for filenames
                new_file_name = f"{name_part}_{random_suffix}{ext_part}"
                hashed_filename = secure_filename(new_file_name)
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], hashed_filename)
                dxf_file.save(filepath)
                print(f"File saved to: {filepath}")
                logging.info(f"DXF File path {filepath}")
            except Exception as e:
                print(f"ERROR: Failed to save file - {e}")
                logger.error(f"File save error: {e}")
                abort(500, description="Failed to save uploaded file")

            # Counter file operations
            try:
                print("Reading counter file")
                with open("counter.txt", "r") as f:
                    counter = int(f.read())
                print(f"Current counter value: {counter}")
                
                counter = counter + 1
                with open("counter.txt", "w") as f:
                    f.write(str(counter))
                print(f"Updated counter value: {counter}")
            except FileNotFoundError:
                print("WARNING: Counter file not found, creating new one")
                counter = 1
                with open("counter.txt", "w") as f:
                    f.write(str(counter))
            except Exception as e:
                print(f"ERROR: Counter file operation failed - {e}")
                logger.error(f"Counter file error: {e}")

            try:
                # Read the DXF file
                print("Reading DXF file with ezdxf")
                doc = ezdxf.readfile(filepath)
                img_doc = ezdxf.readfile(filepath)
                print("DXF file read successfully")
                logger.info("File read Successfully")
                
                print("Initializing DXF extractor")
                extractor = DXFExtractor(
                    doc=doc, img_doc=img_doc, density=density, lineweight=lineweight
                )
                
                print("Extracting parts from block")
                result_data = extractor.extract_parts_from_block(
                    image_width=width, image_height=height
                )
                print(f"Extraction completed. Blocks found: {result_data.get('mark_blocks_count', 0)}")
                
                print("Initializing Local Storage utilities")
                local_storage_util = LocalStorageUtils()
                
                try:
                    print("Uploading data to local storage")
                    hashed_filename = local_storage_util.upload_data_to_local(
                        project_name=project_name,
                        string_json_data=json.dumps(result_data["blocks"]),
                        original_filename=dxf_file.filename,
                        username=username,
                    )
                    if hashed_filename is None:
                        raise Exception("Failed to upload data to local storage.")
                    print(f"Data uploaded successfully. Local filename: {hashed_filename}")
                    
                    response_data = {
                        "file_name": hashed_filename,
                        "mark_blocks_count": result_data.get("mark_blocks_count", 0),
                        "ignored_blocks": result_data.get("ignored_blocks", []),
                        "ignored_mtexts": result_data.get("ignored_mtexts", []),
                        "not_in_inventory": result_data.get("not_in_inventory", []),
                    }
                    print(f"Returning success response: {response_data}")
                    return jsonify(response_data), 200
                    
                except Exception as e:
                    print(f"ERROR: Local storage upload failed - {e}")
                    logger.error(f"Local storage upload error: {e}")
                    abort(406, description=str(e))

            except ezdxf.DXFStructureError as e:
                print(f"ERROR: DXF structure error - {e}")
                logger.error("DXF structure error")
                abort(406, description=f"Invalid DXF file structure: {str(e)}")
            except ezdxf.DXFVersionError as e:
                print(f"ERROR: DXF version error - {e}")
                logger.error("DXF version error")
                abort(406, description=f"Unsupported DXF version: {str(e)}")
            except Exception as e:
                print(f"ERROR: DXF processing failed - {e}")
                logger.error("Document is not according to the format specified")
                abort(406, description=str(e))
            finally:
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        print(f"Successfully removed file from {filepath}")
                        logger.info(f"Removed file from {filepath}")
                except Exception as e:
                    print(f"WARNING: Failed to remove file {filepath} - {e}")
                    logger.warning(f"Failed to remove file {filepath} - {e}")
        else:
            print("ERROR: Invalid file format or file validation failed")
            logger.error("Not a DXF File")
            abort(406, description="Invalid File Format")
            
    except Exception as e:
        print(f"CRITICAL ERROR: Unexpected error in get_dxf_info - {e}")
        logger.critical(f"Unexpected error: {e}")
        abort(500, description="Internal server error")

@app.route("/get_parts_info", methods=["GET"])
def get_parts_info():
    file_name = request.args.get("filename")
    local_storage_util = LocalStorageUtils()
    try:
        json_body = local_storage_util.download_data_from_local(file_name)
        if json_body is None:
            raise Exception(f"File {file_name} not found or could not be downloaded.")
        return jsonify({"data": json_body})
    except Exception as e:
        abort(406, description=str(e))


@app.route("/register", methods=["POST"])
def register():
    auth = UserHandler()
    data = request.get_json()
    username = data["username"]
    password = data["password"].encode("utf-8")
    if auth.register_user(username=username, password=password):
        return jsonify({"success": "User registerd successfully"}), 201
    else:
        return jsonify({"error": "Username already exists"}), 400


@app.route("/login", methods=["POST"])
def login():
    auth = UserHandler()
    data = request.get_json()
    username = data["username"]
    password = data["password"].encode("utf-8")

    if auth.user_login(username=username, password=password):
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401


@app.route("/get_projects", methods=["GET"])
def get_projects():
    project_handler = ProjectHandler()
    user_name = request.args.get("username")
    project_list, invetory_access = project_handler.get_list_of_projects(
        username=user_name
    )

    if project_list == False:
        return jsonify({"message": "Invalid Username"}), 401
    else:
        return (
            jsonify({"project_list": project_list, "invetory_access": invetory_access}),
            200,
        )


@app.route("/add_project", methods=["POST"])
def add_project():
    project_handler = ProjectHandler()
    data = request.get_json()
    usernames = data["username"]
    project_names = data["projectname"]
    is_new = data["isnew"]

    updated_list = project_handler.make_a_new_project(
        usernames, project_names, is_new=is_new
    )

    if updated_list == False:
        return jsonify({"message": "Invalid Username"}), 401
    else:
        return jsonify({"message": "project added sucessfully"}), 200


@app.route("/get_project_files", methods=["POST"])
def get_project_files():
    data = request.get_json()
    projectname = data["projectname"]
    local_storage_util = LocalStorageUtils()
    try:
        file_list = local_storage_util.get_files_for_project(project_name=projectname)
        return jsonify({"data": file_list}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/get_all_users", methods=["GET"])
def get_all_users():
    user_handler = UserHandler()
    try:
        user_list = user_handler.get_list_of_all_user()
        return jsonify({"data": user_list}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/download_boq", methods=["GET"])
def download_boq():
    file_name = request.args.get("filename")
    phase = request.args.get("phase")
    local_storage_util = LocalStorageUtils()

    try:
        # Download data from local storage and parse JSON
        json_body = local_storage_util.download_data_from_local(file_name)
        if json_body is None:
            raise Exception(f"File {file_name} not found or could not be downloaded.")
        # dump = json.loads(json_body)

        # Generate Excel file as a binarreturnsy object (assuming generate_excel_for_phase returns file-like object)

        excel_generator = ExcelGenerator(json_body)
        excel_file = excel_generator.generate_excel_for_phase(phase_name=phase)

        # Create in-memory file-like object
        output = io.BytesIO()
        excel_file.save(output)
        output.seek(0)

        # Create a response object and set headers
        response = make_response(
            send_file(
                output,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f"{file_name}.xlsx",
            )
        )

        response.headers["Content-Disposition"] = (
            f"attachment; filename={file_name}.xlsx"
        )
        response.headers["Content-Type"] = (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

        return response

    except Exception as e:
        abort(406, description=str(e))


@app.route("/remove_project_access", methods=["DELETE"])
def remove_project_access():
    project_handler = ProjectHandler()
    data = request.get_json()
    usernames = data["username"]
    project_names = data["projectname"]
    updated_list = project_handler.remove_project_access(
        project_names=project_names, usernames=usernames
    )

    if updated_list == False:
        return jsonify({"message": "Invalid Username"}), 401
    else:
        return jsonify({"message": "project added sucessfully"}), 200


@app.route("/get_project_access_list", methods=["GET"])
def get_project_acess_list():
    project_handler = ProjectHandler()
    project_acesss_list = project_handler.get_all_project_access_list()

    if project_acesss_list == []:
        return jsonify({"message": "No entires found in the colllection"}), 401
    else:
        return jsonify({"data": project_acesss_list}), 200


@app.route("/remove_project", methods=["DELETE"])
def remove_project():
    project_name = request.args.get("projectname")
    project_handler = ProjectHandler()
    res = project_handler.delete_project(project_name=project_name)

    if res:
        return jsonify({"message": "Sucessfully deleted the project"}), 200
    else:
        return jsonify({"message": "Cannot delete the project"}), 400


# -------------- Inventory Routes----------------------------
@app.route("/get_inventory_list", methods=["GET"])
def get_inventory_list():
    inventory_handler = InventoryHandler()
    try:
        inventory_list = inventory_handler.get_inventory_list()
        return jsonify({"data": inventory_list}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/add_inventory_item", methods=["POST"])
def add_inventory_item():
    inventory_handler = InventoryHandler()
    data = request.get_json()
    try:
        inventory_handler.create_inventory_item(item=data)
        return jsonify({"message": "Sucessfully added the inventory item"}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/delete_inventory_item", methods=["DELETE"])
def delete_inventory_item():
    inventory_handler = InventoryHandler()
    data = request.get_json()
    try:
        inventory_handler.delete_inventory_item(item=data)
        return jsonify({"message": "Sucessfully deleted the inventory item"}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/update_inventory_access", methods=["POST"])
def update_inventory_access():
    inventory_handler = InventoryHandler()
    data = request.get_json()
    try:
        inventory_handler.update_inventory_access(users=data["username"])
        return jsonify({"message": "Sucessfully updated the inventory access"}), 200
    except Exception as e:
        abort(406, description=str(e))


@app.route("/revoke_inventory_access", methods=["POST"])
def revoke_inventory_access():
    inventory_handler = InventoryHandler()
    data = request.get_json()
    try:
        inventory_handler.revoke_inventory_access(users=data["username"])
        return jsonify({"message": "Sucessfully revoked the inventory access"}), 200
    except Exception as e:
        abort(406, description=str(e))


# ------------------------------------------------------------#


@app.route("/save_layout", methods=["POST"])
def save_layout():
    layout_handler = LayoutHandler()
    table_metadata = request.get_json()
    hashed_filename = request.args.get("filename")
    try:
        layout_handler.update_layout(
            table_metadata_object=table_metadata["positions"],
            hashed_filename=hashed_filename,
        )
        return jsonify({"message": "Sucessfully saved the layout"}), 200
    except Exception as e:
        abort(406, description=str(e))

@app.route("/get_layout", methods=["GET"])
def get_layout():
    layout_handler = LayoutHandler()
    hashed_filename = request.args.get("filename")
    try:
        doc = layout_handler.get_layout(
            hashed_filename=hashed_filename,
        )
        return jsonify({"message": "Successfully accessed the layout", "data": doc}), 200
    except Exception as e:
        abort(406, description=str(e))


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
