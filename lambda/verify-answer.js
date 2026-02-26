// Lambda Function: Verify Reading Answers
// Endpoint: POST /practice/verify-answer

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyPracticeResults';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { userId, userAnswer, correctAnswer, questionId } = body;
        
        // Check if answer is correct (case-insensitive)
        const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase();
        const score = isCorrect ? 100 : 0;
        
        // Store result in DynamoDB
        const params = {
            TableName: TABLE_NAME,
            Item: {
                resultId: { S: `${userId}_${Date.now()}` },
                userId: { S: userId },
                practiceType: { S: 'reading' },
                questionId: { S: questionId },
                userAnswer: { S: userAnswer },
                correctAnswer: { S: correctAnswer },
                isCorrect: { BOOL: isCorrect },
                score: { N: String(score) },
                timestamp: { S: new Date().toISOString() }
            }
        };
        
        await dynamodb.send(new PutItemCommand(params));
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                isCorrect: isCorrect,
                score: score,
                correctAnswer: correctAnswer,
                message: isCorrect ? 'Correct answer!' : 'Incorrect. Try again.'
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to verify answer',
                message: error.message
            })
        };
    }
};
