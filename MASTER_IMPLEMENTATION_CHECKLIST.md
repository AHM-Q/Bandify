
# AWS Integration Master Checklist - Banidfy Learning Platform

## 📋 Complete Implementation Guide

Follow this checklist in order to integrate your website with AWS Amplify.

---

## Phase 1: Preparation (30 minutes)

### Sub-Phase 1A: AWS Account Setup
- [ ] Create AWS account at https://aws.amazon.com
- [ ] Create IAM user with programmatic access
- [ ] Save AWS Access Key ID and Secret Access Key
- [ ] Set up AWS CLI: `aws configure`
- [ ] Test AWS CLI: `aws sts get-caller-identity`

### Sub-Phase 1B: Install Required Tools
- [ ] Install Node.js 16+ from https://nodejs.org
- [ ] Verify: `node --version` (should be v16+)
- [ ] Install npm: `npm --version` (comes with Node)
- [ ] Install AWS CLI: `aws --version`
- [ ] Install Amplify CLI: `npm install -g @aws-amplify/cli`
- [ ] Verify: `amplify --version`

### Sub-Phase 1C: Project Setup
- [ ] Open `c:\Users\NV23137\Documents\Project` in VS Code
- [ ] Review all HTML files (index, login, dashboard, etc.)
- [ ] Review app.js for AWS integration code
- [ ] Review style.css for AWS styling
- [ ] Note: package.json and aws-config.js already created

---

## Phase 2: AWS Resource Creation (20-30 minutes)

### Choose One Method:

#### **OPTION A: Automated CloudFormation (Recommended)**

- [ ] Review `cloudformation-template.yaml`
- [ ] Go to AWS CloudFormation Console
- [ ] Create new stack
- [ ] Upload `cloudformation-template.yaml`
- [ ] Set stack name: `banidfy-learning-platform`
- [ ] Accept IAM capabilities
- [ ] Create stack
- [ ] Wait for CREATE_COMPLETE (5-10 minutes)
- [ ] Go to **Outputs** tab and copy all values
- [ ] Save outputs to `.env.local` file

Follow detailed instructions in: **CLOUDFORMATION_DEPLOYMENT.md**

---

#### **OPTION B: Manual AWS Setup**

Follow these detailed steps in: **AWS_AMPLIFY_SETUP.md**

**Create in this order:**

#### Step 1: S3 Bucket
```bash
aws s3 mb s3://banidfy-learning-platform --region us-east-1
```
- [ ] S3 bucket created successfully
- [ ] Copy bucket name: ________________________

#### Step 2: DynamoDB Tables
```bash
# Create Users table
aws dynamodb create-table \
  --table-name BanidifyUsers \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create Practice Results table
aws dynamodb create-table \
  --table-name BanidifyPracticeResults \
  --attribute-definitions \
    AttributeName=resultId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=resultId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Create Transcriptions table
aws dynamodb create-table \
  --table-name BanidifyTranscriptions \
  --attribute-definitions AttributeName=jobId,AttributeType=S \
  --key-schema AttributeName=jobId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```
- [ ] BanidifyUsers table created
- [ ] BanidifyPracticeResults table created
- [ ] BanidifyTranscriptions table created

#### Step 3: Cognito User Pool
- [ ] Create Cognito User Pool named `BanidifyUserPool`
- [ ] Note User Pool ID: ________________________
- [ ] Create User Pool Client
- [ ] Note Client ID: ________________________
- [ ] Create Identity Pool
- [ ] Note Identity Pool ID: ________________________

#### Step 4: IAM Role for Lambda
- [ ] Create IAM role named `banidfy-lambda-role`
- [ ] Attach policies for: DynamoDB, S3, Transcribe, Polly, CloudWatch

#### Step 5: Lambda Functions
Create 8 Lambda functions (Node.js 18.x):
- [ ] `banidfy-verify-answer` 
- [ ] `banidfy-submit-essay`
- [ ] `banidfy-transcribe-speech`
- [ ] `banidfy-transcribe-status`
- [ ] `banidfy-speak-feedback`
- [ ] `banidfy-user-session`
- [ ] `banidfy-get-dashboard`
- [ ] `banidfy-save-result`

#### Step 6: API Gateway
- [ ] Create REST API named `LearningAPI`
- [ ] Note API Endpoint: ________________________

#### Step 7: CloudFront Distribution
- [ ] Create CloudFront distribution pointing to S3
- [ ] Note CloudFront Domain: ________________________

---

## Phase 3: Code Configuration (10 minutes)

### Update aws-config.js

File location: `aws-config.js`

```javascript
Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'YOUR_USER_POOL_ID',        // ← Update
    userPoolWebClientId: 'YOUR_CLIENT_ID',  // ← Update
    identityPoolId: 'YOUR_IDENTITY_POOL_ID' // ← Update
  },
  Storage: {
    AWSS3: {
      bucket: 'YOUR_BUCKET_NAME',           // ← Update
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      'LearningAPI': {
        endpoint: 'YOUR_API_ENDPOINT'       // ← Update
      }
    }
  }
});
```

Update checklist:
- [ ] Replace `YOUR_USER_POOL_ID` with actual User Pool ID
- [ ] Replace `YOUR_CLIENT_ID` with actual Client ID
- [ ] Replace `YOUR_IDENTITY_POOL_ID` with actual Identity Pool ID
- [ ] Replace `YOUR_BUCKET_NAME` with S3 bucket name
- [ ] Replace `YOUR_API_ENDPOINT` with API Gateway endpoint

### Create .env.local

In project root, create `.env.local`:

```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_CLIENT_ID=XXXXXXXXXXXXXXXXXX
VITE_IDENTITY_POOL_ID=us-east-1:XXXX-XXXX-XXXX-XXXX
VITE_S3_BUCKET=banidfy-learning-platform
VITE_API_ENDPOINT=https://XXXXXX.execute-api.us-east-1.amazonaws.com/dev
VITE_CLOUDFRONT_DOMAIN=dXXXXXXXX.cloudfront.net
```

- [ ] All values filled in from AWS resources

---

## Phase 4: Deploy Lambda Functions (20 minutes)

For each Lambda function in `/lambda/` folder:

1. [ ] Open AWS Lambda Console
2. [ ] Click function name
3. [ ] Click **Code** tab
4. [ ] Copy code from corresponding `/lambda/*.js` file
5. [ ] Paste into AWS Lambda editor
6. [ ] Click **Deploy**

Functions to update:
- [ ] `banidfy-verify-answer` ← Code from `lambda/verify-answer.js`
- [ ] `banidfy-submit-essay` ← Code from `lambda/submit-essay.js`
- [ ] `banidfy-transcribe-speech` ← Code from `lambda/transcribe-speech.js`
- [ ] `banidfy-transcribe-status` ← Code from `lambda/transcribe-status.js`
- [ ] `banidfy-speak-feedback` ← Code from `lambda/speak-feedback.js`
- [ ] `banidfy-user-session` ← Code from `lambda/sessions.js`
- [ ] `banidfy-get-dashboard` ← Code from `lambda/get-dashboard.js`
- [ ] `banidfy-save-result` ← Code from `lambda/save-result.js`

---

## Phase 5: Install Dependencies (5 minutes)

```bash
cd c:\Users\NV23137\Documents\Project
npm install
```

- [ ] npm dependencies installed
- [ ] No major vulnerabilities
- [ ] node_modules folder created

---

## Phase 6: Testing (15 minutes)

### Test Each AWS Service

#### Test Cognito
```javascript
// In browser console on login.html
import { Auth } from 'aws-amplify';
await Auth.signUp({
  username: 'test@example.com',
  password: 'TempPassword123!',
  attributes: { email: 'test@example.com' }
});
```
- [ ] Cognito signup works

#### Test S3
```javascript
import { Storage } from 'aws-amplify';
await Storage.put('test.txt', 'Hello World');
```
- [ ] File uploaded to S3 successfully

#### Test DynamoDB (via Lambda)
```javascript
import { REST } from 'aws-amplify';
const result = await REST.post('LearningAPI', '/user/session', {
  body: { userName: 'test', timestamp: new Date().toISOString() }
});
```
- [ ] Lambda function triggers and saves to DynamoDB

#### Test Reading Practice
- [ ] Open reading.html
- [ ] Submit an answer
- [ ] Lambda verifies answer
- [ ] Result saved to DynamoDB
- [ ] Green/Red feedback displayed

#### Test Writing Practice
- [ ] Open writing.html
- [ ] Type an essay
- [ ] Click Submit
- [ ] File uploads to S3
- [ ] Metadata saves to DynamoDB
- [ ] Success message displayed

#### Test Speaking Practice
- [ ] Open speaking.html
- [ ] Click Start Recording
- [ ] Speak for 10 seconds
- [ ] Audio saves to S3
- [ ] Transcribe processes it
- [ ] Polly generates feedback

---

## Phase 7: Deploy Frontend (10 minutes)

### Using Amplify Hosting

```bash
# Initialize Amplify
amplify init
# Answer prompts:
# - Project name: banidfy
# - Environment: dev
# - Default editor: Visual Studio Code
# - Authentication: AWS profile
# - Profile: (select your profile)

# Add hosting
amplify add hosting
# Choose:
# - Hosting service: Amplify Hosting
# - Environment: Production

# Deploy
amplify publish
```

Deployment checklist:
- [ ] Amplify initialized
- [ ] Hosting added
- [ ] Build successful
- [ ] Deployment successful
- [ ] Live URL generated: ________________________

OR

### Manual Deployment to S3 + CloudFront

```bash
# Build app
npm run build

# Sync to S3
aws s3 sync dist/ s3://banidfy-learning-platform

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

- [ ] Build created
- [ ] Files synced to S3
- [ ] CloudFront cache invalidated

---

## Phase 8: Monitoring & Optimization (10 minutes)

### Set Up CloudWatch Monitoring

```bash
# View Lambda logs
aws logs tail /aws/lambda/banidfy-verify-answer --follow

# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

Monitoring checklist:
- [ ] CloudWatch alarms set up
- [ ] Lambda logs accessible
- [ ] DynamoDB metrics monitored
- [ ] S3 access logs enabled
- [ ] CloudFront logs enabled

### Configure Auto-Scaling (Optional)

```bash
# Enable auto-scaling for DynamoDB
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/BanidifyPracticeResults \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 5 \
  --max-capacity 40
```

- [ ] Auto-scaling configured (if using provisioned capacity)

---

## Phase 9: Post-Deployment Verification (5 minutes)

### Functional Testing

1. **Authentication Flow**
   - [ ] Sign up a new user
   - [ ] Verify email
   - [ ] Log in with new user
   - [ ] Update user profile

2. **Reading Practice**
   - [ ] Complete reading exercise
   - [ ] Answer gets verified
   - [ ] Score saved to DynamoDB
   - [ ] Progress appears on dashboard

3. **Writing Practice**
   - [ ] Submit an essay
   - [ ] File appears in S3
   - [ ] Metadata in DynamoDB
   - [ ] Confirmation message displayed

4. **Speaking Practice**
   - [ ] Record audio
   - [ ] Transcription works
   - [ ] Polly feedback plays
   - [ ] Results saved

5. **Dashboard**
   - [ ] User stats loaded
   - [ ] Practice breakdown shown
   - [ ] Historical data visible

### Performance Testing

- [ ] Page load time < 3 seconds
- [ ] CloudFront CDN working (check waterfall)
- [ ] API response time < 500ms
- [ ] No console errors
- [ ] Mobile responsive

---

## Phase 10: Documentation & Handoff (5 minutes)

### Create Documentation

- [ ] Update README.md with AWS architecture
- [ ] Document API endpoints
- [ ] Create deployment runbook
- [ ] Document troubleshooting guide
- [ ] Add architecture diagram

### Files Modified Summary

- [ ] app.js - Complete AWS integration
- [ ] login.html - Cognito auth
- [ ] dashboard.html - DynamoDB stats
- [ ] reading.html - Lambda verification
- [ ] writing.html - S3 uploads
- [ ] speaking.html - Transcribe + Polly
- [ ] index.html - Landing page redesign
- [ ] style.css - AWS styling
- [ ] aws-config.js - NEW
- [ ] package.json - NEW
- [ ] Lambda functions (8 files) - NEW
- [ ] CloudFormation template - NEW
- [ ] Documentation files - NEW

---

## ✅ Final Checklist

Before calling it complete:

- [ ] All AWS resources created
- [ ] Lambda functions deployed
- [ ] Configuration updated
- [ ] Dependencies installed
- [ ] Frontend deployed
- [ ] All features tested
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Cost estimates reviewed
- [ ] Disaster recovery plan considered

---

## 🎉 Success Criteria

Your AWS integration is complete when:

1. ✅ Users can sign up and log in via Cognito
2. ✅ Reading practice answers verified by Lambda
3. ✅ Essays uploaded to S3 with metadata in DynamoDB
4. ✅ Speech transcribed by Transcribe
5. ✅ Polly provides audio feedback
6. ✅ All data persists in DynamoDB
7. ✅ Content served via CloudFront CDN
8. ✅ Dashboard shows user statistics
9. ✅ No errors in CloudWatch logs
10. ✅ Performance meets expectations

---

## 📶 Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| 1. Preparation | 30 min | 30 min |
| 2. AWS Resources | 30 min | 1h |
| 3. Configuration | 10 min | 1h 10m |
| 4. Lambda Deploy | 20 min | 1h 30m |
| 5. Dependencies | 5 min | 1h 35m |
| 6. Testing | 15 min | 1h 50m |
| 7. Deploy Frontend | 10 min | 2h |
| 8. Monitoring | 10 min | 2h 10m |
| 9. Verification | 5 min | 2h 15m |
| 10. Documentation | 5 min | 2h 20m |

**Total Time: ~2.5 hours**

---

## 📞 Troubleshooting Reference

| Issue | Solution | Docs |
|-------|----------|------|
| CORS error | Update S3 CORS config | AWS_AMPLIFY_SETUP.md |
| Auth failure | Check User Pool ID | aws-config.js |
| Lambda 403 | Verify IAM role | cloudformation-template.yaml |
| Transcribe fails | Check audio format | speaking.html comments |
| Upload slow | Enable CloudFront | CLOUDFORMATION_DEPLOYMENT.md |

---

## 🚀 Next Steps After Completion

1. Set up CI/CD pipeline (GitHub Actions)
2. Configure custom domain via Route 53
3. Enable WAF on CloudFront
4. Set up DynamoDB point-in-time recovery
5. Implement API authentication tokens
6. Add rate limiting to Lambda
7. Configure email notifications
8. Set up cost alerts in CloudWatch

---

## 📚 Quick Links to Documentation

- **Setup Details**: AWS_AMPLIFY_SETUP.md
- **CloudFormation**: CLOUDFORMATION_DEPLOYMENT.md
- **Quick Start**: QUICK_START.md
- **Code Changes**: CODE_CHANGES.md
- **This Checklist**: MASTER_IMPLEMENTATION_CHECKLIST.md

---

**Status**: Not Started | In Progress | Completed
**Last Updated**: 2024 | **Estimated Completion**: 2.5 hours

---

Document all progress and save for reference!

