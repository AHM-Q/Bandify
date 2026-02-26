// Lambda Function: User Authentication & Session Management
// Endpoint: POST /user/session

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyUsers';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { userName, timestamp, platform } = body;
        
        // Store user session in DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                userId: { S: userName },
                sessionStart: { S: timestamp },
                platform: { S: platform },
                TTL: { N: String(Math.floor(Date.now() / 1000) + 86400) } // 24 hour expiry
            }
        };
        
        await dynamodb.send(new PutItemCommand(params));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Session stored successfully',
                userId: userName
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to store session',
                message: error.message
            })
        };
    }
};
