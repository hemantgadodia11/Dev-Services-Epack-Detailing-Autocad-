import os
import json
import logging
import hashlib
from datetime import datetime
from mongodb_handler import MongodbHandler
import re


# Regex includes special characters + whitespace

pattern = r"[!@#$%^&*(),.?\":{}|<>/\[\]\\;'`~\-=_+\s]"

class LocalStorageUtils:
    def __init__(self):
        self.storage_dir = "storage"
        os.makedirs(self.storage_dir, exist_ok=True)
        self.logger = logging.getLogger(self.__class__.__name__)
        self.file_metadata_collection = MongodbHandler().mongo_collection("epack_test", "file_metadata")

    def upload_data_to_local(self, project_name: str, string_json_data: str, original_filename: str, username: str) -> str:
        # sanitize first
        project_name = re.sub(pattern, "_", project_name).strip("_")
        original_filename = re.sub(pattern, "_", original_filename).strip("_")

        # now safely create project folder
        project_path = os.path.join(self.storage_dir, project_name)
        os.makedirs(project_path, exist_ok=True)
        
    # build file paths
        hashed_file_name = os.path.join(project_name, original_filename + ".json")  # relative path
        file_path = os.path.join(self.storage_dir, hashed_file_name)  # absolute path
        
        # if os.path.exists(file_path):
        #     self.logger.info(f"File {hashed_file_name} already exists. Returning existing file.")
        #     return hashed_file_name
            
        parts_dict = json.loads(string_json_data)
        table_metadata = {}
        for key, value in parts_dict.items():
            table_metadata[key] = {"x": 48, "y": 1130, "scale": 1.5}

        from datetime import datetime

# Try to write the file
        # self.logger.info("Trying to find the file")
        try:
            self.logger.info(f"Trying to find the file {file_path}")
            with open(file_path, 'w') as f:
                self.logger.info(f"file_path: {file_path}")
                f.write(string_json_data)
            self.logger.info(f"hashed_file_name:    {hashed_file_name}")
            self.logger.info(f'File {hashed_file_name} uploaded successfully to local storage.')
        except Exception as e:
            self.logger.error(f"Error saving file to local storage: {str(e)}")
            return None

        # Try to check for duplicates in MongoDB
        try:
            duplicate = self.file_metadata_collection.find_one({
                "hashed_file_name": hashed_file_name,
                "original_file_name": original_filename
            })

            if duplicate:
                self.logger.info("Attempt to upload duplicate")
            else:
                try:
                    self.file_metadata_collection.insert_one({
                        "hashed_file_name": hashed_file_name,
                        "original_file_name": original_filename,
                        "username": username,
                        "time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        "table_metadata": table_metadata
                    })
                    self.logger.info(f'File {hashed_file_name} metadata uploaded successfully to MongoDB')
                except Exception as e:
                    self.logger.error(f"Error inserting metadata to MongoDB: {str(e)}")
                    return None
        except Exception as e:
            self.logger.error(f"Error checking for duplicates in MongoDB: {str(e)}")
            return None

        return hashed_file_name

        # except Exception as e:
        #     self.logger.error(f"An unexpected error occurred during local upload: {str(e)}")
        #     return None

    def download_data_from_local(self, file_name: str):
        file_path = os.path.join(self.storage_dir, file_name)
        try:
            with open(file_path, 'r') as f:
                file_content = f.read()
            self.logger.info(f"Successfully downloaded file {file_name} from local storage.")
            return json.loads(file_content)
        except FileNotFoundError:
            self.logger.error(f"Error: File {file_name} not found in local storage.")
            return None
        except Exception as e:
            self.logger.error(f"An unexpected error occurred during local download: {str(e)}")
            return None

    def get_files_for_project(self, project_name: str):
        project_name = re.sub(pattern, "_", project_name).strip("_")
        project_path = os.path.join(self.storage_dir, project_name)
        hashed_file_list = []
        
        if not os.path.exists(project_path):
            self.logger.info(f"No files found for project {project_name} in local storage.")
            return []

        try:
            for root, _, files in os.walk(project_path):
                self.logger.info(f"files:    {files}")
                for file in files:
                    # relative_path = os.path.relpath(os.path.join(root, file), self.storage_dir)
                    # hashed_file_list.append(relative_path.replace("\\", "/")) # Ensure forward slashes for consistency
                    hashed_file_list.append(os.path.join(project_name, file))
                    self.logger.info(f"hashed_file_list:    {hashed_file_list}")
            
            self.logger.info(f"Fetching files from metadata for project {project_name}")
            documents = self.file_metadata_collection.find({
                "hashed_file_name": {"$in": hashed_file_list},
            }, {"_id": 0})
            

            return list(documents)
        except Exception as e:
            self.logger.error(f"An unexpected error occurred while getting project files: {str(e)}")
            return []

if __name__ == "__main__":
    # Example usage (for testing purposes)
    local_storage = LocalStorageUtils()
    project = "test_project"
    data = {"part1": {"size": "small"}, "part2": {"size": "large"}}
    json_data = json.dumps(data)
    original_name = "test_file.json"
    username = "test_user"

    # Upload
    uploaded_file = local_storage.upload_data_to_local(project, json_data, original_name, username)
    print(f"Uploaded file: {uploaded_file}")

    # Download
    if uploaded_file:
        downloaded_content = local_storage.download_data_from_local(uploaded_file)
        print(f"Downloaded content: {downloaded_content}")

    # Get files for project
    project_files = local_storage.get_files_for_project(project)
    print(f"Files for project {project}: {project_files}")
