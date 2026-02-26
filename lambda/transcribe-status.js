// Lambda Function: Get Transcription Status
// Endpoint: GET /practice/transcribe-status/{jobId}

import { TranscribeServiceClient, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const transcribeClient = new TranscribeServiceClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyTranscriptions';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const jobId = event.pathParameters.jobId;
        
        // Get transcription job status
        const getJobParams = {
            TranscriptionJobName: jobId
        };
        
        const jobResult = await transcribeClient.send(
            new GetTranscriptionJobCommand(getJobParams)
        );
        
        const job = jobResult.TranscriptionJob;
        let transcription = '';
        
        // If job is completed, get the transcript
        if (job.TranscriptionJobStatus === 'COMPLETED') {
            const transcriptUri = job.Transcript.TranscriptFileUri;
            const s3Url = new URL(transcriptUri);
            const bucket = 'banidfy-learning-platform';
            const key = s3Url.pathname.substring(1);
            
            // Get transcript from S3
            const getParams = {
                Bucket: bucket,
                Key: key
            };
            
            const s3Result = await s3Client.send(new GetObjectCommand(getParams));
            const transcriptContent = await s3Result.Body.transformToString();
            const transcriptJson = JSON.parse(transcriptContent);
            transcription = transcriptJson.results.transcripts[0].transcript;
            
            // Update DynamoDB with completed status
            await dynamodb.send(new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: { jobId: { S: jobId } },
                UpdateExpression: 'SET jobStatus = :status, transcription = :transcript',
                ExpressionAttributeValues: {
                    ':status': { S: 'COMPLETED' },
                    ':transcript': { S: transcription }
                }
            }));
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: job.TranscriptionJobStatus,
                transcription: transcription,
                jobId: jobId
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to get transcription status',
                message: error.message
            })
        };
    }
};
