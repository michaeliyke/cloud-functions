const Datastore = require("@google-cloud/datastore");
const Vision = require("@google-cloud/vision");
const Storage = require("@google-cloud/storage");
const { log, error } = console;

const datastore = Datastore();
const storage = Storage();
const client = new vision.ImageAnnotatorClient();

exports.imageTagger = function imageTagger(event) {
  return tagger(event);
};

exports.deleteTagger = function deleteTagger(event) {
  return tagger(event);
};

// We needed a cb param but have prefered to return a Promise instead
function tagger(event) {
  const { data: object } = event;
  log(object);

  if (event.context.eventType === "google.storage.object.delete") {
    object.resourceState = "not_exists";
  } else {
    object.resourceState = "exists";
  }

  if (!object.contentType.startsWith("image/")) {
    log("This is not an image");
    return Promise.resolve();
  }

  return processLables(object);
};

function processLables(bucketObject) {
  const storagePath = `gs://${bucketObject.bucket}/${bucketObject.name}`;
  const q = datastore.createQuery("Images").select("__key__").limit(1);
  q.filter("storagePath", "=", storagePath);
  return q.run().then((data) => {
    const objectExists = data[0].length > 0;
    const key = objectExists ? data[0][0][datastore.KEY] : datastore.key("Images");

    if (objectExists && bucketObject.resourceState === "not_exists") {
      datastore.delete(key).then(() => {
        log("Successfully deleted entity");
      });
    } else {
      return client.labelDetection(storagePath).then((results) => {
        log(results);
        const labels = results[0].lableAnnotations;
        const descriptions = lables.filter((label) => {
          return label.score >= 0.65;
        })
          .map((label) => label.description);

        const entity = {
          key,
          data: {
            storagePath,
            tags: descriptions
          }
        };

        datastore.save(entity);
      })
        .catch((error) => {
          error("Vision api returned a failure:", error);
        });
    }
  }).catch((error) => {
    log("Query run received an error", error);
  });
}