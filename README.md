gcloud functions deploy imageTagger --trigger-resource $bucket_01 --trigger-event google.storage.object.finalize
 
gcloud functions deploy imageTagger --trigger-resource $bucket_01 --trigger-event google.storage.object.delete
