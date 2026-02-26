// Lambda Function: Generate AI Summary using AWS Bedrock
// Endpoint: POST /practice/summary/{userId}

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const dynamodb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'BanidifyPracticeResults';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const userId = event.pathParameters.userId;
        
        // Fetch user practice results from DynamoDB
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'userIdIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': { S: userId }
            }
        };
        
        const result = await dynamodb.send(new QueryCommand(params));
        const practiceData = result.Items.map(item => unmarshall(item));
        
        // Aggregate statistics
        const stats = aggregateStats(practiceData);
        
        // Create prompt for Bedrock
        const prompt = createPrompt(stats);
        
        // Call Bedrock with Claude model
        const bedrockResponse = await invokeBedrockModel(prompt);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                userId: userId,
                summary: bedrockResponse,
                stats: stats,
                generatedAt: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to generate summary',
                message: error.message
            })
        };
    }
};

function aggregateStats(practiceData) {
    let stats = {
        totalPractices: practiceData.length,
        averageScore: 0,
        readingScore: { correct: 0, total: 0 },
        writingScore: { correct: 0, total: 0 },
        speakingScore: { correct: 0, total: 0 },
        listeningScore: { correct: 0, total: 0 },
        recentProgress: []
    };
    
    let totalScore = 0;
    const last7Days = practiceData.slice(-7); // Last 7 practice sessions
    
    practiceData.forEach(item => {
        totalScore += item.score || 0;
        
        switch (item.practiceType) {
            case 'reading':
                stats.readingScore.total++;
                if (item.score >= 70) stats.readingScore.correct++;
                break;
            case 'writing':
                stats.writingScore.total++;
                if (item.score >= 70) stats.writingScore.correct++;
                break;
            case 'speaking':
                stats.speakingScore.total++;
                if (item.score >= 70) stats.speakingScore.correct++;
                break;
            case 'listening':
                stats.listeningScore.total++;
                if (item.score >= 70) stats.listeningScore.correct++;
                break;
        }
    });
    
    stats.averageScore = Math.round(totalScore / (practiceData.length || 1));
    stats.recentProgress = last7Days.map(item => ({
        type: item.practiceType,
        score: item.score,
        date: item.timestamp
    }));
    
    return stats;
}

function createPrompt(stats) {
    return `Based on the following language learning practice statistics, generate a brief, encouraging, and constructive summary (2-3 sentences) about the student's progress and recommendations for improvement:

Practice Statistics:
- Total Practice Sessions: ${stats.totalPractices}
- Average Score: ${stats.averageScore}%
- Reading: ${stats.readingScore.correct}/${stats.readingScore.total} correct (${Math.round((stats.readingScore.correct / (stats.readingScore.total || 1)) * 100)}%)
- Writing: ${stats.writingScore.correct}/${stats.writingScore.total} correct (${Math.round((stats.writingScore.correct / (stats.writingScore.total || 1)) * 100)}%)
- Speaking: ${stats.speakingScore.correct}/${stats.speakingScore.total} correct (${Math.round((stats.speakingScore.correct / (stats.speakingScore.total || 1)) * 100)}%)
- Listening: ${stats.listeningScore.correct}/${stats.listeningScore.total} correct (${Math.round((stats.listeningScore.correct / (stats.listeningScore.total || 1)) * 100)}%)

Generate a personalized summary focusing on:
1. Overall progress assessment
2. Strongest skill area
3. Area needing improvement
4. Motivational message for next steps

Keep it encouraging and constructive.`;
}

async function invokeBedrockModel(prompt) {
    // Using Claude via Bedrock (or you can use other models)
    // Model ID: claude-3.5-sonnet-20241022 (available via Bedrock)
    
    const params = {
        modelId: 'anthropic.claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            anthropic_version: 'bedrock-2023-06-01',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    };
    
    try {
        const command = new InvokeModelCommand(params);
        const response = await bedrock.send(command);
        
        // Parse response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const summary = responseBody.content[0].text;
        
        return summary;
    } catch (error) {
        console.error('Bedrock invocation error:', error);
        // Fallback to basic summary if Bedrock fails
        return `Great progress on your language learning journey! You've completed ${aggregateStats([]).totalPractices} practice sessions. Keep practicing consistently to improve your skills.`;
    }
}
