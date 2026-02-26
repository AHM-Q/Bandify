// Lambda Function: Get User Dashboard Data
// Endpoint: GET /user/dashboard/{userId}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyPracticeResults';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const userId = event.pathParameters.userId;
        
        // Query all results for the user
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'userIdIndex', // You'll need to create this GSI
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': { S: userId }
            }
        };
        
        const result = await dynamodb.send(new QueryCommand(params));
        
        // Calculate statistics from the results
        let totalSessions = new Set();
        let totalScore = 0;
        let readingCount = 0;
        let writingCount = 0;
        let speakingCount = 0;
        
        result.Items.forEach(item => {
            const unmarshalled = unmarshall(item);
            totalSessions.add(unmarshalled.timestamp?.split('T')[0] || 'unknown');
            totalScore += unmarshalled.score || 0;
            
            if (unmarshalled.practiceType === 'reading') readingCount++;
            if (unmarshalled.practiceType === 'writing') writingCount++;
            if (unmarshalled.practiceType === 'speaking') speakingCount++;
        });
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                userId: userId,
                totalSessions: totalSessions.size,
                totalScore: Math.round(totalScore / (result.Items.length || 1)),
                practiceBreakdown: {
                    reading: readingCount,
                    writing: writingCount,
                    speaking: speakingCount
                },
                lastUpdated: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to fetch dashboard data',
                message: error.message
            })
        };
    }
};
