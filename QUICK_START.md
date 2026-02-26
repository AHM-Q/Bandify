# AWS Amplify Quick Start for Banidfy

## 🚀 Quick 5-Minute Setup

### 1. Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
# Sign in to your AWS account and create an IAM user
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Copy Lambda Functions to AWS
Go to AWS Lambda Console and create these functions with the code from `/lambda/` folder:
- `banidfy-verify-answer` (reading.html)
- `banidfy-submit-essay` (writing.html)
- `banidfy-transcribe-speech` (speaking.html)
- `banidfy-transcribe-status` (polling)
- `banidfy-speak-feedback` (Polly)
- `banidfy-user-session` (Cognito)
- `banidfy-get-dashboard` (stats)
- `banidfy-save-result` (results)

### 4. Update Configuration
In `aws-config.js`, replace these AWS resource IDs:

| Resource | Where to Find |
|----------|---------------|
| `userPoolId` | Cognito > User Pools > Your Pool > General Settings |
| `userPoolWebClientId` | Cognito > User Pools > App Clients |
| `identityPoolId` | Cognito > Identity Pools > Your Pool |
| API endpoint | API Gateway > Your API > Stages |

### 5. Deploy Frontend
```bash
amplify init
amplify add hosting
amplify publish
```

---

## 📊 Architecture Overview

```
User Browser (CloudFront CDN)
    ↓
┌───────────────────────────────┐
│  Frontend (HTML/JS/CSS)       │
│  - index.html                 │
│  - login.html                 │
│  - dashboard.html             │
│  - reading.html               │
│  - writing.html               │
│  - speaking.html              │
└───────────┬───────────────────┘
            ↓
┌───────────────────────────────┐
│  AWS Services Integration     │
├───────────────────────────────┤
│ 🔐 Cognito Auth              │ → Login/Signup
│ 📦 S3 Storage                │ → Essays/Audio/Content
│ ⚡ Lambda Compute            │ → API Logic
│ 🗄️  DynamoDB                 │ → User Data/Results
│ 🎙️  Transcribe              │ → Speech-to-Text
│ 🔊 Polly                     │ → Text-to-Speech
│ 🌐 CloudFront CDN            │ → Fast Delivery
└───────────────────────────────┘
```

---

## 🔄 Data Flow for Each Feature

### Reading Practice
```
User Input → Lambda (verify-answer) → Check Answer → DynamoDB (save result)
```

### Writing Practice
```
User Essay → S3 (store) → Lambda → DynamoDB (save metadata) → Dashboard
```

### Speaking Practice
```
User Audio → S3 (store) → Transcribe (speech-to-text) 
→ DynamoDB (save) → Polly (feedback) → User hears response
```

---

## 📋 Pre-requisites Checklist

- [ ] AWS Account created
- [ ] IAM User with AWS access keys configured
- [ ] AWS CLI installed
- [ ] Node.js 16+ installed
- [ ] npm installed
- [ ] Amplify CLI installed globally
- [ ] AWS Cognito User Pool created
- [ ] AWS DynamoDB tables created
- [ ] AWS S3 bucket created
- [ ] API Gateway configured
- [ ] Lambda execution role created

---

## 🔑 Key Configuration Values

Create these resources and note the IDs:

```
AWS Region: us-east-1

Cognito:
- User Pool ID: us-east-1_XXXXXXXXX
- App Client ID: XXXXXXXXXXXXXXXXXX
- Identity Pool ID: us-east-1:XXXX-XXXX-XXXX-XXXX

DynamoDB Tables:
- BanidifyUsers
- BanidifyPracticeResults
- BanidifyTranscriptions

S3:
- Bucket: banidfy-learning-platform

API Gateway:
- Endpoint: https://XXXXXX.execute-api.us-east-1.amazonaws.com/dev

Lambda Functions:
- banidfy-verify-answer
- banidfy-submit-essay
- banidfy-transcribe-speech
- banidfy-transcribe-status
- banidfy-speak-feedback
- banidfy-user-session
- banidfy-get-dashboard
- banidfy-save-result
```

---

## 📝 Environment File (.env.local)

```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_CLIENT_ID=XXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXX-XXXX-XXXX-XXXX
VITE_API_ENDPOINT=https://XXXXXX.execute-api.us-east-1.amazonaws.com/dev
VITE_S3_BUCKET=banidfy-learning-platform
VITE_CLOUDFRONT_DOMAIN=dXXXXXXXX.cloudfront.net
```

---

## ✅ Verification Steps

After setup, test each feature:

### 1. Test Authentication
```javascript
// Open browser console on login.html
import { Auth } from 'aws-amplify';
await Auth.signIn('user@example.com', 'password');
```

### 2. Test S3 Upload
```javascript
import { Storage } from 'aws-amplify';
await Storage.put('test.txt', 'Hello World');
```

### 3. Test Lambda
```javascript
import { REST } from 'aws-amplify';
await REST.get('LearningAPI', '/user/dashboard/testuser');
```

### 4. Test API Gateway
```bash
curl https://YOUR_API_ENDPOINT.execute-api.us-east-1.amazonaws.com/dev/user/session
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| CORS Error | Update S3 CORS configuration |
| Authentication failed | Verify Cognito User Pool ID and App Client ID |
| Lambda 403 error | Check Lambda execution role permissions |
| File upload fails | Ensure S3 bucket exists and has correct CORS |
| Transcribe not working | Check audio format (must be WAV) |
| Polly audio not playing | Check S3 permissions and CloudFront settings |

---

## 💰 Estimated Monthly Cost (1000 Monthly Users)

- Cognito: ~$0 (under 50K free tier)
- DynamoDB: ~$10-20
- Lambda: ~$5-10
- S3: ~$5-10
- Transcribe: ~$10-20 (usage dependent)
- Polly: ~$5-10 (usage dependent)
- CloudFront: ~$2-5

**Total: ~$50-75/month**

---

## 📚 Next Steps

1. Complete the AWS Amplify setup
2. Deploy Lambda functions
3. Configure DynamoDB tables
4. Set up S3 bucket and CORS
5. Create API Gateway endpoints
6. Test each feature individually
7. Set up CloudFront distribution
8. Deploy frontend via Amplify Hosting
9. Monitor with CloudWatch
10. Optimize and scale based on usage

