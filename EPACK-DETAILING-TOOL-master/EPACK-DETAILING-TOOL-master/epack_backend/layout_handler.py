import logging
from mongodb_handler import MongodbHandler

class LayoutHandler:
    def __init__(self):
        mongo=MongodbHandler()
        self.file_metadata_collection=mongo.mongo_collection('epack_test','file_metadata')
        self.logger=logging.getLogger(self.__class__.__name__)
    
    def update_layout(self,table_metadata_object,hashed_filename):
        self.file_metadata_collection.update_one(
            {"hashed_file_name": hashed_filename},
            {"$set": {"table_metadata": table_metadata_object}}
        )
        self.logger.info("Succesfully updated the info of the layout")

    def get_layout(self,hashed_filename):
        doc = self.file_metadata_collection.find_one(
            {"hashed_file_name": hashed_filename},
            {"_id": 0}
        )
        if not doc:
            self.logger.warning("No layout found for hashed_file_name=%s", hashed_filename)
            return None
        self.logger.info("Succesfully accessed info of layout")
        return doc