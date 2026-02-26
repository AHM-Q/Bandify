# Banidfy - AWS Integration Setup Guide

## Complete Step-by-Step AWS Amplify Deployment

### Prerequisites
- Node.js 16+ installed
- AWS Account with IAM user credentials
- AWS CLI configured locally
- Amplify CLI installed: `npm install -g @aws-amplify/cli`

---

## Phase 1: Initial AWS Setup

### Step 1: Create AWS S3 Bucket

```bash
# Create bucket for storing essays and audio files
aws s3 mb s3://banidfy-learning-platform --region us-east-1

# Enable versioning for safety
aws s3api put-bucket-versioning \
  --bucket banidfy-learning-platform \
  --versioning-configuration Status=Enabled

# Set CORS configuration for web access
aws s3api put-bucket-cors \
  --bucket banidfy-learning-platform \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://yourdomain.com"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### Step 2: Create DynamoDB Tables

```bash
# User sessions table
aws dynamodb create-table \
  --table-name BanidifyUsers \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Practice results table
aws dynamodb create-table \
  --table-name BanidifyPracticeResults \
  --attribute-definitions \
    AttributeName=resultId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=resultId,KeyType=HASH \
  --global-secondary-indexes \
    'IndexName=userIdIndex,Keys=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1

# Transcription jobs table
aws dynamodb create-table \
  --table-name BanidifyTranscriptions \
  --attribute-definitions AttributeName=jobId,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 3: Create Cognito User Pool & Identity Pool

```bash
# Create Cognito User Pool
aws cognito-idp create-user-pool \
  --pool-name BanidifyUserPool \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --region us-east-1

# Create Cognito User Pool Client
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name BanidifyWeb \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1

# Create Cognito Identity Pool
aws cognito-identity create-identity-pool \
  --identity-pool-name BanidifyIdentityPool \
  --allow-unauthenticated-identities false \
  --cognito-identity-providers \
    ProviderName=cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX,ClientId=YYYYYYYYYYYYYYYYYYYYYY \
  --region us-east-1
```

---

## Phase 2: Initialize AWS Amplify

### Step 1: Install Dependencies

```bash
cd c:\Users\NV23137\Documents\Project
npm install
npm install -g @aws-amplify/cli
```

### Step 2: Initialize Amplify Project

```bash
amplify init
# Follow prompts:
# - Enter project name: banidfy
# - Choose environment: dev
# - Choose default editor: Visual Studio Code
# - Choose auth method: AWS profile
# - Select AWS profile: (your profile)
```

### Step 3: Configure Amplify Auth

```bash
amplify add auth
# Choose the following options:
# - Do you want to use an existing Cognito user pool? YES
# - Provide the user pool ID: us-east-1_XXXXXXXXX
# - Provide the app client ID: YYYYYYYYYYYYYYYYYYYYYY
# - Provide identity pool ID: us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx
```

### Step 4: Configure Amplify Storage

```bash
amplify add storage
# Choose the following options:
# - Select resource type: S3
# - Provide a friendly name: banidfystorage
# - Provide bucket name: banidfy-learning-platform
# - Configure access level: 
#   - Public: Read/Write
#   - Protected: CRUD for owners
#   - Private: Full CRUD
```

### Step 5: Add API (REST) for Lambda Integration

```bash
amplify add api
# Choose the following options:
# - Select REST
# - Provide API name: LearningAPI
# - Use existing IAM role: NO
```

---

## Phase 3: Deploy Lambda Functions

### Step 1: Create Lambda Functions

Create these Lambda functions in AWS Console or via CLI:

**1. User Session Handler**
- Function name: `banidfy-user-session`
- Runtime: Node.js 18.x
- Handler: `sessions.js`
- Timeout: 30 seconds
- Attach role with DynamoDB and CloudWatch permissions

**2. Verify Answer Handler**
- Function name: `banidfy-verify-answer`
- Runtime: Node.js 18.x
- Handler: `verify-answer.js`

**3. Submit Essay Handler**
- Function name: `banidfy-submit-essay`
- Runtime: Node.js 18.x
- Handler: `submit-essay.js`

**4. Transcribe Speech Handler**
- Function name: `banidfy-transcribe-speech`
- Runtime: Node.js 18.x
- Handler: `transcribe-speech.js`
- Permissions: Transcribe, S3, DynamoDB

**5. Transcription Status Handler**
- Function name: `banidfy-transcribe-status`
- Runtime: Node.js 18.x
- Handler: `transcribe-status.js`

**6. Polly Feedback Handler**
- Function name: `banidfy-speak-feedback`
- Runtime: Node.js 18.x
- Handler: `speak-feedback.js`
- Permissions: Polly, S3

**7. Dashboard Handler**
- Function name: `banidfy-get-dashboard`
- Runtime: Node.js 18.x
- Handler: `get-dashboard.js`
- Permissions: DynamoDB Query

**8. Save Result Handler**
- Function name: `banidfy-save-result`
- Runtime: Node.js 18.x
- Handler: `save-result.js`

### Step 2: Create IAM Roles for Lambda

```bash
# Create policy for Lambda functions
aws iam create-policy \
  --policy-name BanidifyLambdaPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:*:table/Banidify*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject"
        ],
        "Resource": "arn:aws:s3:::banidfy-learning-platform/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "polly:SynthesizeSpeech"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:*:*:*"
      }
    ]
  }'
```

### Step 3: Create API Gateway Endpoints

```bash
# Create REST API
aws apigateway create-rest-api \
  --name LearningAPI \
  --description "API for Banidfy learning platform"

# Create resources and integrate with Lambda functions
# This is easier to do via AWS Console or Amplify configuration
```

---

## Phase 4: Update Configuration Files

### Step 1: Update aws-config.js

Replace the placeholder values with your actual AWS resources:

```javascript
// Get these from AWS Console
const YOUR_USER_POOL_ID = 'us-east-1_XXXXXXXXX';
const YOUR_CLIENT_ID = 'YYYYYYYYYYYYYYYYYYYYYY';
const YOUR_IDENTITY_POOL_ID = 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx';
const YOUR_API_ENDPOINT = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev';
```

---

## Phase 5: Set Up CloudFront CDN

### Step 1: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "banidfy-'$(date +%s)'",
    "DefaultRootObject": "index.html",
    "Comment": "Banidfy Learning Platform CDN",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [{
        "Id": "S3Origin",
        "DomainName": "banidfy-learning-platform.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3Origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {
          "Forward": "none"
        }
      },
      "MinTTL": 0
    }
  }'
```

### Step 2: Document CloudFront Domain

```
CloudFront Distribution Domain: d123456.cloudfront.net
(You'll get this from AWS Console)
```

---

## Phase 6: Deploy Frontend

### Step 1: Build Application

```bash
npm run build
```

### Step 2: Deploy to Amplify Hosting

```bash
amplify add hosting
# Choose:
# - Environment: Production
# - Hosting service: Amplify Hosting

amplify publish
# This will:
# 1. Build your app
# 2. Deploy to S3
# 3. Distribute via CloudFront
# 4. Provide a live URL
```

---

## Environment Variables

Create `.env.local` file in your project root:

```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_CLIENT_ID=YYYYYYYYYYYYYYYYYYYYYY
VITE_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx
VITE_API_ENDPOINT=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
VITE_S3_BUCKET=banidfy-learning-platform
VITE_CLOUDFRONT_DOMAIN=d123456.cloudfront.net
```

---

## Usage Flow

1. **User visits index.html** → Served via CloudFront
2. **User logs in** → Cognito authentication
3. **User reads passage** → S3 stores content, CloudFront delivers
4. **User answers question** → Lambda verifies, saves to DynamoDB
5. **User speaks** → Audio saved to S3, Transcribe processes, Polly generates feedback
6. **User submits essay** → Stored in S3, metadata in DynamoDB
7. **User views dashboard** → Lambda queries DynamoDB for stats

---

## Important AWS IAM Roles & Permissions

Add these to your Lambda functions' execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "s3:*",
        "transcribe:*",
        "polly:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Testing Your Integration

### Test Cognito Authentication
```bash
# Test login via JavaScript console
await Auth.signIn('user@example.com', 'password');
```

### Test S3 Upload
```javascript
await Storage.put('test.txt', 'test content');
```

### Test Lambda Endpoint
```javascript
await REST.post('LearningAPI', '/user/session', {
  body: { userName: 'test', timestamp: new Date().toISOString() }
});
```

### Test Transcribe
```javascript
// Upload audio, then check status
await REST.post('LearningAPI', '/practice/transcribe-speech', {
  body: { userId: 'test', s3Key: 'audio.wav' }
});
```

---

## Monitoring & Debugging

### View Lambda Logs
```bash
aws logs tail /aws/lambda/banidfy-verify-answer --follow
```

### Monitor DynamoDB
```bash
aws dynamodb scan --table-name BanidifyPracticeResults
```

### Check S3 Buckets
```bash
aws s3 ls s3://banidfy-learning-platform --recursive
```

---

## Cost Optimization

- **Cognito**: First 50K MAU free, then $0.00055/MAU
- **DynamoDB**: On-demand billing ~ $1.25 per million write units
- **Lambda**: First 1M invocations free, then $0.20 per 1M
- **S3**: $0.023 per GB stored, $0.0004 per 10K requests
- **Transcribe**: $0.0004 per second of transcription
- **Polly**: $0.000004 per character synthesized
- **CloudFront**: $0.085 per GB data transferred out

---

## Troubleshooting

### Issue: CORS errors
**Solution**: Update S3 CORS configuration in aws-config.js

### Issue: Lambda timeout
**Solution**: Increase timeout in Lambda console to 60+ seconds

### Issue: Transcribe job fails
**Solution**: Ensure audio file format is WAV and role has Transcribe permissions

### Issue: DynamoDB throttling
**Solution**: Switch to on-demand billing or increase provisioned capacity

---

## Next Steps

1. Configure CloudFront with SSL certificate
2. Set up CloudWatch alarms for monitoring
3. Enable logging for all services
4. Set up backup strategy for DynamoDB
5. Configure auto-scaling for high traffic
6. Add API request throttling/rate limiting
7. Implement user quotas for resource usage

---

## Additional Resources

- [AWS Amplify Documentation](https://aws.amplify.dev)
- [Amazon Cognito Guide](https://docs.aws.amazon.com/cognito/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [Amazon Transcribe Guide](https://docs.aws.amazon.com/transcribe/)
- [Amazon Polly Documentation](https://docs.aws.amazon.com/polly/)

---

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Verify IAM roles and permissions
3. Test each service independently
4. Review Amplify CLI error messages
5. Check AWS service quotas

