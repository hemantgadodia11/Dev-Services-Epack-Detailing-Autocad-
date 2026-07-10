import logging
from mongodb_handler import MongodbHandler


class JobCardHandler:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        try:
            mongo = MongodbHandler()
            self.job_card_collection = mongo.mongo_collection('epack_test', 'job_cards')
        except Exception:
            self.logger.exception("Failed to connect to the job_cards collection")
            raise

    def save_job_card(self, job_card_data: dict):
        job_card_no = job_card_data.get("job_card_no")
        self.logger.info(f"Saving job card '{job_card_no}' with fields: {job_card_data}")

        try:
            result = self.job_card_collection.update_one(
                {"job_card_no": job_card_no},
                {"$set": job_card_data},
                upsert=True,
            )
        except Exception:
            self.logger.exception(f"Failed to save job card '{job_card_no}'")
            raise

        self.logger.info(
            f"Saved job card '{job_card_no}' "
            f"(matched={result.matched_count}, modified={result.modified_count}, "
            f"upserted_id={result.upserted_id})"
        )
