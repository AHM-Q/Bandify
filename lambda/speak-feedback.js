// Lambda Function: Generate Speech Feedback using Polly
// Endpoint: POST /practice/speak-feedback

import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const pollyClient = new PollyClient({ region: 'us-east-1' });
const s3Client = new S3Client({ region: 'us-east-1' });
const BUCKET_NAME = 'banidfy-learning-platform';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    try {
        const body = JSON.parse(event.body);
        const { text, voiceId = 'Joanna' } = body;
        
        // Generate speech using Polly
        const pollyParams = {
            Text: text,
            OutputFormat: 'mp3',
            VoiceId: voiceId // Joanna, Matthew, Ivy, Justin, etc.
        };
        
        const result = await pollyClient.send(new SynthesizeSpeechCommand(pollyParams));
        
        // Read the audio stream
        const audioBuffer = await result.AudioStream.transformToByteArray();
        
        // Save to S3 with public URL
        const fileName = `feedback/${Date.now()}_feedback.mp3`;
        const s3Params = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: audioBuffer,
            ContentType: 'audio/mpeg',
            ACL: 'public-read' // Make it publicly readable
        };
        
        await s3Client.send(new PutObjectCommand(s3Params));
        
        // Generate CloudFront URL (if CloudFront is configured)
        const audioUrl = `https://d123456.cloudfront.net/${fileName}`;
        // Or use S3 directly: `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Speech generated successfully',
                audioUrl: audioUrl, // URL to the generated MP3
                voiceId: voiceId
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to generate speech',
                message: error.message
            })
        };
    }
};
