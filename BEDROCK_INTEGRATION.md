# AWS Bedrock + OpenAI Integration for Banidfy

## Overview
This guide explains how to integrate AWS Bedrock with your Banidfy learning platform to generate AI-powered personalized learning summaries for students.

---

## What is AWS Bedrock?

AWS Bedrock is a fully managed service that provides access to high-performing foundation models (FMs) from leading AI companies through a single API. It supports:
- **Claude** (by Anthropic) - Best for reasoning and analysis
- **Llama** (by Meta) - Good for general tasks
- **Mistral** (by Mistral AI) - Efficient reasoning
- Plus other models

For your language learning platform, we're using **Claude 3.5 Sonnet** which excels at:
- Analyzing learning patterns
- Generating constructive feedback
- Creating personalized recommendations
- Understanding natural language nuances

---

## Architecture

```
┌─────────────────┐
│   Dashboard     │
│   (User loads)  │
└────────┬────────┘
         │
         ├─→ Fetch Practice Stats (DynamoDB)
         │   - Reading scores
         │   - Writing scores
         │   - Speaking scores
         │   - Listening scores
         │
         └─→ Lambda: generate-summary.js
             │
             ├─→ Query DynamoDB for results
             ├─→ Aggregate statistics
             ├─→ Create prompt with user data
             │
             └─→ AWS Bedrock (Claude 3.5 Sonnet)
                 │
                 └─→ Generate personalized summary
                     - Progress analysis
                     - Strengths identified
                     - Areas for improvement
                     - Motivational message
                     
         ↓ Display summary on dashboard
```

---

## Setup Steps

### Step 1: Enable Bedrock in AWS Account

1. Go to **AWS Console** → **Bedrock**
2. Click **Get Started** or **Manage Model Access**
3. Enable these models:
   - `Anthropic Claude 3.5 Sonnet` (Recommended)
   - `Anthropic Claude 3 Haiku` (Budget option)
4. Accept terms and click **Save Changes**
5. Wait 1-2 minutes for access to be granted

### Step 2: Deploy CloudFormation Template

The CloudFormation template has been updated with Bedrock permissions. Deploy it:

```bash
aws cloudformation create-stack \
  --stack-name banidfy-learning-platform \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=ProjectName,ParameterValue=banidfy \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

What's included:
- ✅ S3 bucket for storage
- ✅ DynamoDB tables
- ✅ Cognito authentication
- ✅ Lambda functions (including generate-summary)
- ✅ IAM role with Bedrock invoke permissions
- ✅ API Gateway endpoints
- ✅ CloudFront CDN

### Step 3: Deploy Lambda Function

The new Lambda function `generate-summary.js` needs to be deployed:

**Option A: Using AWS Console**
1. Go to **AWS Lambda Console**
2. Create function: `banidfy-generate-summary`
3. Runtime: Node.js 18.x
4. Copy code from `lambda/generate-summary.js`
5. Add these dependencies:
   ```json
   {
     "dependencies": {
       "@aws-sdk/client-bedrock-runtime": "^3.400.0",
       "@aws-sdk/client-dynamodb": "^3.400.0",
       "@aws-sdk/util-dynamodb": "^3.400.0"
     }
   }
   ```
6. Save and deploy

**Option B: Using AWS CLI**
```bash
cd lambda
# Zip the function
zip generate-summary.zip generate-summary.js

# Deploy
aws lambda create-function \
  --function-name banidfy-generate-summary \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/banidfy-lambda-role \
  --handler generate-summary.handler \
  --zip-file fileb://generate-summary.zip \
  --timeout 60 \
  --region us-east-1
```

### Step 4: Create API Gateway Endpoint

Connect Lambda to API Gateway:

```bash
# Get function ARN
FUNCTION_ARN=$(aws lambda get-function \
  --function-name banidfy-generate-summary \
  --query 'Configuration.FunctionArn' \
  --output text)

# Create API Gateway integration
aws apigateway put-integration \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_RESOURCE_ID \
  --http-method POST \
  --type AWS_LAMBDA \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${FUNCTION_ARN}/invocations
```

### Step 5: Update aws-config.js

Add the summary endpoint to your API configuration:

```javascript
API: {
  REST: {
    'LearningAPI': {
      endpoint: 'https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev'
    }
  }
}
```

---

## Features Implemented

### 1. **Dashboard Summary Card**
- New "AI-Powered Learning Summary" section on dashboard
- Auto-generates when user loads dashboard
- Shows Bedrock-generated personalized feedback

### 2. **Smart Analysis**
The Lambda function aggregates:
- Total practice sessions
- Average score across all practices
- Accuracy per skill (reading, writing, speaking, listening)
- Recent 7-day progress trend

### 3. **Personalized Feedback**
Claude generates summaries covering:
1. **Overall Progress** - How much the student has improved
2. **Strongest Skills** - What they excel at
3. **Areas for Growth** - Where to focus next
4. **Next Steps** - Motivational recommendations

Example output:
> "You've made excellent progress with 45 practice sessions and a strong 78% average score! Your reading comprehension is outstanding at 85%, while speaking could use some focused practice at 65%. Keep working on pronunciation drills and you'll see rapid improvement. You're doing great!"

---

## Configuration Reference

### Bedrock Model IDs
```
Claude 3.5 Sonnet (Recommended):
anthropic.claude-3-5-sonnet-20241022

Claude 3 Haiku (Budget):
anthropic.claude-3-haiku-20250301
```

### Lambda Environment Variables (Optional)
```
MODEL_ID = anthropic.claude-3-5-sonnet-20241022
MAX_TOKENS = 500
REGION = us-east-1
```

### Prompt Template
The Lambda function uses a structured prompt that includes:
- User's learning statistics
- Breakdown by skill type
- Recent practice history
- Success rate per module

---

## Troubleshooting

### Error: "User is not authorized to perform: bedrock:InvokeModel"

**Solution:**
- Ensure Bedrock models are enabled in your account
- Verify IAM role has Bedrock permissions
- Check CloudFormation stack deployment succeeded

```bash
# Verify IAM permissions
aws iam get-role-policy \
  --role-name banidfy-lambda-role \
  --policy-name BedrockAccess
```

### Error: "Model is not available"

**Solution:**
1. Go to AWS Console → Bedrock → Model Access
2. Ensure Claude 3.5 Sonnet is enabled
3. Check region (must be matched in Lambda)

### Summary Not Showing on Dashboard

**Debug steps:**
1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/banidfy-generate-summary --follow
   ```

2. Test Lambda directly:
   ```bash
   aws lambda invoke \
     --function-name banidfy-generate-summary \
     --payload '{"pathParameters":{"userId":"test-user"}}' \
     response.json
   
   cat response.json
   ```

3. Check browser console for API errors
4. Verify API Gateway endpoint in aws-config.js

---

## Cost Estimation

### Bedrock Pricing (as of 2024)
- **Claude 3.5 Sonnet Input**: $0.003 per 1K tokens
- **Claude 3.5 Sonnet Output**: $0.015 per 1K tokens

**Example costs:**
- 1 summary generation ≈ 200 input + 150 output tokens = ~$0.0015
- 1000 users/month = ~$1.50
- Growing platform: ~$50-100/month for summaries

---

## Advanced Configuration

### Custom Prompt Engineering

Edit `lambda/generate-summary.js` - `createPrompt()` function:

```javascript
function createPrompt(stats) {
    return `Custom prompt with ${stats.totalPractices} sessions...`;
}
```

### Switch to Different Model

Change in `lambda/generate-summary.js`:

```javascript
const params = {
    modelId: 'anthropic.claude-3-haiku-20250301', // Claude 3 Haiku (cheaper)
    // or
    modelId: 'meta.llama2-70b-chat-v1', // Llama 2
    // ... rest of config
};
```

### Add Streaming Responses

For real-time summary generation, use ResponseStream:

```javascript
import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const response = await bedrock.send(
    new InvokeModelWithResponseStreamCommand(params)
);
```

---

## Testing

### Test Summary Generation

```bash
# 1. Create test practice data
aws dynamodb put-item \
  --table-name BanidifyPracticeResults \
  --item '{
    "resultId": {"S": "test-123"},
    "userId": {"S": "test-user"},
    "practiceType": {"S": "reading"},
    "score": {"N": "85"},
    "timestamp": {"S": "2024-01-15T10:30:00Z"}
  }' \
  --region us-east-1

# 2. Invoke Lambda
aws lambda invoke \
  --function-name banidfy-generate-summary \
  --payload '{"pathParameters":{"userId":"test-user"}}' \
  --region us-east-1 \
  /dev/stdout | jq '.body | fromjson'
```

---

## Next Steps

1. ✅ Enable Bedrock models in AWS account
2. ✅ Deploy CloudFormation stack
3. ✅ Deploy generate-summary Lambda function
4. ✅ Create API Gateway endpoint
5. ✅ Test summary generation
6. ✅ Verify dashboard displays summary
7. Monitor costs and optimize if needed
8. Consider adding user feedback on summaries

---

## Support & Documentation

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude Model Guide](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Lambda Node.js 18 Runtime](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
- [DynamoDB Query Examples](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html)
