// Lambda Function: Save Practice Result
// Endpoint: POST /practice/result

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyPracticeResults';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { userId, practiceType, result, score, timestamp } = body;
        
        // Store practice result in DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                resultId: { S: `${userId}_${Date.now()}` },
                userId: { S: userId },
                practiceType: { S: practiceType }, // reading, writing, speaking
                result: { S: result },
                score: { N: String(score) },
                timestamp: { S: timestamp },
                synced: { BOOL: true }
            }
        };
        
        await dynamodb.send(new PutItemCommand(params));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Practice result saved',
                resultId: params.Item.resultId.S,
                score: score
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to save practice result',
                message: error.message
            })
        };
    }
};
