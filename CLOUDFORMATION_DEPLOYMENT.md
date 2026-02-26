# AWS CloudFormation Deployment Guide

## Automated AWS Infrastructure Setup

This guide uses CloudFormation to automatically create all AWS resources in one command instead of manually creating them.

---

## Prerequisites

1. **AWS CLI** installed: [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
2. **AWS Account** with proper permissions
3. **IAM User** with CloudFormation, DynamoDB, S3, Lambda, Cognito, and API Gateway permissions
4. Configure AWS CLI: `aws configure`

---

## Option A: Deploy Using AWS Console

### Step 1: Open CloudFormation Console
1. Go to: https://console.aws.amazon.com/cloudformation
2. Click **Create Stack** → **With new resources (standard)**

### Step 2: Upload Template
1. Select **Upload a template file**
2. Choose `cloudformation-template.yaml` from your project
3. Click **Next**

### Step 3: Specify Stack Details
1. **Stack name**: `banidfy-learning-platform`
2. **Parameters**: 
   - ProjectName: `banidfy`
3. Click **Next**

### Step 4: Configure Stack Options
1. Leave defaults
2. Click **Next**

### Step 5: Review & Create
1. Review all settings
2. Acknowledge: "I acknowledge that AWS CloudFormation might create IAM resources"
3. Click **Create Stack**

### Step 6: Monitor Creation
- Wait 5-10 minutes for stack creation
- Watch the **Events** tab for progress
- Once **CREATE_COMPLETE**, click **Outputs** tab for resource IDs

---

## Option B: Deploy Using AWS CLI

### Step 1: Validate Template
```bash
aws cloudformation validate-template \
  --template-body file://cloudformation-template.yaml
```

### Step 2: Create Stack
```bash
aws cloudformation create-stack \
  --stack-name banidfy-learning-platform \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=ProjectName,ParameterValue=banidfy \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3: Monitor Creation
```bash
# Watch stack creation progress
aws cloudformation describe-stacks \
  --stack-name banidfy-learning-platform \
  --query 'Stacks[0].StackStatus' \
  --region us-east-1

# View events
aws cloudformation describe-stack-events \
  --stack-name banidfy-learning-platform \
  --region us-east-1 | jq '.StackEvents[0:5]'
```

### Step 4: Wait for Completion
```bash
# Wait until status is CREATE_COMPLETE (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name banidfy-learning-platform \
  --region us-east-1
```

### Step 5: Get Outputs
```bash
# Retrieve all resource IDs
aws cloudformation describe-stacks \
  --stack-name banidfy-learning-platform \
  --query 'Stacks[0].Outputs' \
  --region us-east-1
```

---

## Step 6: Save Configuration Values

After CloudFormation completes, save these outputs to a `.env` file:

```bash
# Run this command and save the output
aws cloudformation describe-stacks \
  --stack-name banidfy-learning-platform \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey!=`null`]' | jq '.[] | "\(.OutputKey)=\(.OutputValue)"'
```

Create `.env.local` file with:
```
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=<UserPoolId output>
VITE_CLIENT_ID=<UserPoolClientId output>
VITE_IDENTITY_POOL_ID=<IdentityPoolId output>
VITE_S3_BUCKET=<S3BucketName output>
VITE_API_ENDPOINT=<APIEndpoint output>
VITE_CLOUDFRONT_DOMAIN=<CloudFrontDomain output>
```

---

## Step 7: Upload Lambda Functions

CloudFormation created stubbed Lambda functions. Now upload actual code:

### Method 1: AWS Console
1. Go to AWS Lambda Console
2. For each function (`banidfy-*`):
   - Click function name
   - Click **Code** tab
   - Paste code from `/lambda/` folder
   - Click **Deploy**

### Method 2: AWS CLI
```bash
# For each Lambda function
aws lambda update-function-code \
  --function-name banidfy-verify-answer \
  --zip-file fileb://lambda/verify-answer.js
```

---

## What CloudFormation Creates

| Resource | Details |
|----------|---------|
| **S3 Bucket** | `banidfy-learning-platform` with versioning & CORS |
| **DynamoDB Tables** | Users, PracticeResults, Transcriptions |
| **Cognito User Pool** | User authentication & management |
| **Cognito Identity Pool** | AWS credentials for frontend |
| **IAM Role** | Permissions for Lambda functions |
| **Lambda Functions** | 4 stub functions (to be updated) |
| **API Gateway** | REST API endpoint |
| **CloudFront Distribution** | CDN for static content |

---

## Verify Stack Creation

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name banidfy-learning-platform

# List created resources
aws cloudformation list-stack-resources \
  --stack-name banidfy-learning-platform

# Check specific resource
aws dynamodb describe-table --table-name BanidifyPracticeResults

aws s3 ls banidfy-learning-platform

aws cognito-idp describe-user-pool \
  --user-pool-id $(aws cloudformation describe-stacks \
    --stack-name banidfy-learning-platform \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)
```

---

## Updating Stack (After Changes)

If you need to update the stack:

```bash
# Update template
aws cloudformation update-stack \
  --stack-name banidfy-learning-platform \
  --template-body file://cloudformation-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for update
aws cloudformation wait stack-update-complete \
  --stack-name banidfy-learning-platform
```

---

## Deleting Stack (Clean Up)

If you need to remove all resources:

```bash
# WARNING: This deletes everything!
aws cloudformation delete-stack \
  --stack-name banidfy-learning-platform

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name banidfy-learning-platform

# Verify deletion
aws cloudformation describe-stacks \
  --stack-name banidfy-learning-platform
```

---

## Troubleshooting

### Stack Creation Fails
1. Check **Events** tab in CloudFormation console
2. Look for **CREATE_FAILED** status
3. Read error message for resource that failed
4. Fix issue and try again or delete and recreate

### Insufficient Permissions
```bash
# Add required permissions to your IAM user:
# - cloudformation:*
# - dynamodb:*
# - s3:*
# - lambda:*
# - cognito:*
# - apigateway:*
# - cloudfront:*
# - iam:CreateRole
# - iam:PutRolePolicy
# - logs:*
```

### Rollback on Failure
CloudFormation automatically rolls back failed stacks. To manually rollback:

```bash
aws cloudformation cancel-update-stack \
  --stack-name banidfy-learning-platform
```

---

## Next Steps

1. ✅ CloudFormation stack created
2. ✅ AWS resources provisioned
3. ⏭️ Upload Lambda function code
4. ⏭️ Update aws-config.js with output values
5. ⏭️ Install npm dependencies
6. ⏭️ Deploy frontend via Amplify
7. ⏭️ Test application

---

## Cost Estimation

CloudFormation resources are billed per AWS pricing:

**Free Tier (First Year)**
- Cognito: 50K MAU free
- DynamoDB: 25GB stored, 25 R/W capacity units
- Lambda: 1M invocations free
- S3: 5GB stored

**Beyond Free Tier (Monthly)**
- DynamoDB on-demand: ~$5-10
- Lambda: ~$2-5
- S3: ~$1-2
- Cognito: ~$0 (under 50K users)

**Estimated Monthly Cost**: $10-30 for small deployments

---

## Alternative: Manual Setup

If you prefer manual setup, refer to: `AWS_AMPLIFY_SETUP.md`

CloudFormation automated approach:
✅ Faster (5-10 minutes)
✅ Less error-prone
✅ Repeatable
✅ Infrastructure as Code
✅ Easy to delete/recreate

Manual approach:
✅ More control
✅ Better understanding
✅ No template constraints

---

## Support

For CloudFormation issues:
1. Check [CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
2. Review service-specific docs
3. Check AWS Support (if you have support plan)
4. Visit [AWS Forums](https://forums.aws.amazon.com/)

