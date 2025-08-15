import "dotenv/config";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, OwnerOverride, GetBucketMetricsConfigurationCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { url } from "inspector";

/**
 * You actually don't need to initialize the client by passing in environment variables for access key or secret.
 * Loading dotenv locally will do it automatically. When you use AWS, you will use a IAM role which automatically
 * loads in and rotates some IAM user credentials.
 */

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET_NAME = process.env.BUCKET || "test-harvest7777";
const client = new S3Client({region: AWS_REGION});

async function getPresignedPutUrl(bucket: string, key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key, // The key is the path of the object so you'd have to specify [uuid]/[file_name]
    ContentType: "text/plain", 
    Metadata: { 
      userId: "uuid12394217983",
      tag: "heyyy"
    },
  });

  // This is basically the only security measure for S3. Anyone who has the presigned url can use it within the 60s.
  return await getSignedUrl(client, command, { expiresIn: 60 }); 
}

async function getPresignedDeleteUrl(bucket: string, key: string): Promise<string> {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key, 
  });

  return await getSignedUrl(client, command, { expiresIn: 60 }); 
}

async function uploadTextToPresignedUrl(url: string, content: string) {
  const response = await fetch(url, {
    method: "PUT",
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  console.log("Upload with metadata successful!");
}

async function deleteObjectWithPresignedUrl(url: string) {
  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    console.log(response)
    throw new Error(`Delete failed: ${response.status}`);
  }

  console.log("Delete successful!");
} 

async function getMetadataCommand(bucket: string, key: string) {
  /**
   * This does NOT actually download the object's content so this may be useful for syncing
   * to Mongo. 
   */
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const response = await client.send(command);
    console.log("Metadata:", response.Metadata);
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }
}



const filePath = "testuser12345/hello";
// Example usage:
const putUrl = await getPresignedPutUrl(BUCKET_NAME, filePath);
const deleteUrl = await getPresignedDeleteUrl(BUCKET_NAME, filePath);

await uploadTextToPresignedUrl(putUrl, "some text string");
// await deleteObjectWithPresignedUrl(deleteUrl);
await getMetadataCommand(BUCKET_NAME, filePath);

/**
 * for backend, on every req user must send their token
 * from token, u can get uuid
 * 
 * get delete url from uuid/file to delete
 * delete it
 */
