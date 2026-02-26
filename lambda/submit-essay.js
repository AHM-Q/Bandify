// Lambda Function: Handle Essay Submission
// Endpoint: POST /practice/submit-essay

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyPracticeResults';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { userId, s3Key, wordCount, submittedAt } = body;
        
        // Store essay metadata in DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                resultId: { S: `${userId}_${Date.now()}` },
                userId: { S: userId },
                practiceType: { S: 'writing' },
                s3Key: { S: s3Key }, // Reference to S3 location
                wordCount: { N: String(wordCount) },
                score: { N: '0' }, // Placeholder for future AI scoring
                submittedAt: { S: submittedAt },
                status: { S: 'submitted' }
            }
        };
        
        await dynamodb.send(new PutItemCommand(params));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Essay submitted successfully',
                s3Location: s3Key,
                wordCount: wordCount,
                score: 0
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to submit essay',
                message: error.message
            })
        };
    }
};
