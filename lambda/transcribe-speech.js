// Lambda Function: Initiate Speech Transcription
// Endpoint: POST /practice/transcribe-speech

import { TranscribeServiceClient, StartTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const transcribeClient = new TranscribeServiceClient({ region: 'us-east-1' });
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyTranscriptions';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { userId, s3Key, questionId } = body;
        
        const jobName = `transcribe_${userId}_${Date.now()}`;
        
        // Start transcription job
        const transcribeParams = {
            TranscriptionJobName: jobName,
            LanguageCode: 'en-US',
            MediaFormat: 'wav',
            Media: {
                MediaFileUri: `s3://banidfy-learning-platform/${s3Key}`
            },
            OutputBucketName: 'banidfy-learning-platform'
        };
        
        const transcribeResult = await transcribeClient.send(
            new StartTranscriptionJobCommand(transcribeParams)
        );
        
        // Store job metadata in DynamoDB
        const dbParams = {
            TableName: TABLE_NAME,
            Item: {
                jobId: { S: jobName },
                userId: { S: userId },
                s3Key: { S: s3Key },
                questionId: { S: questionId },
                jobStatus: { S: 'QUEUED' },
                createdAt: { S: new Date().toISOString() }
            }
        };
        
        await dynamodb.send(new PutItemCommand(dbParams));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Transcription job started',
                jobId: jobName,
                status: 'QUEUED'
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to start transcription',
                message: error.message
            })
        };
    }
};
