# Bedrock Integration Deployment Checklist

## Pre-Deployment (5 minutes)

- [ ] AWS Account is created and active
- [ ] AWS CLI is installed: `aws --version`
- [ ] AWS CLI is configured with credentials: `aws configure`
- [ ] Verify credentials work: `aws sts get-caller-identity`

## AWS Bedrock Setup (5 minutes)

- [ ] Log in to AWS Console
- [ ] Go to **Bedrock** → **Model Access**
- [ ] Click **Manage model access**
- [ ] Enable these models:
  - [ ] `Anthropic Claude 3.5 Sonnet`
  - [ ] `Anthropic Claude 3 Haiku` (optional, budget option)
- [ ] Click **Save Changes**
- [ ] Wait 1-2 minutes for access to be granted
- [ ] Verify models are enabled (status should show "Access granted")

## Code Deployment (15 minutes)

- [ ] New Lambda function created: `lambda/generate-summary.js`
- [ ] CloudFormation template updated with Bedrock IAM permissions
- [ ] Dashboard updated: Added "AI-Powered Learning Summary" card
- [ ] `app.js` updated: Added `loadAISummary()` function
- [ ] All files saved locally

## AWS Infrastructure Deployment (10 minutes)

- [ ] Deploy/Update CloudFormation stack:
  ```bash
  aws cloudformation create-stack \
    --stack-name banidfy-learning-platform \
    --template-body file://cloudformation-template.yaml \
    --parameters ParameterKey=ProjectName,ParameterValue=banidfy \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
  ```
  OR if updating existing stack:
  ```bash
  aws cloudformation update-stack \
    --stack-name banidfy-learning-platform \
    --template-body file://cloudformation-template.yaml \
    --parameters ParameterKey=ProjectName,ParameterValue=banidfy \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
  ```

- [ ] Monitor stack creation/update:
  ```bash
  aws cloudformation describe-stacks \
    --stack-name banidfy-learning-platform \
    --query 'Stacks[0].StackStatus' \
    --region us-east-1
  ```
  Wait until status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`

- [ ] Get Lambda function ARN:
  ```bash
  aws lambda get-function \
    --function-name banidfy-generate-summary \
    --query 'Configuration.FunctionArn' \
    --region us-east-1
  ```

## Lambda Function Deployment (10 minutes)

### Option A: AWS Console (Easiest)
- [ ] Go to **AWS Lambda Console**
- [ ] Click **Create function**
- [ ] Function name: `banidfy-generate-summary`
- [ ] Runtime: **Node.js 18.x**
- [ ] Execution role: Choose **banidfy-lambda-role** (created by CloudFormation)
- [ ] Click **Create function**
- [ ] Replace function code with content from `lambda/generate-summary.js`
- [ ] Click **Deploy**

### Option B: AWS CLI
- [ ] Open terminal in project directory
- [ ] Create deployment package:
  ```bash
  cd lambda
  zip generate-summary.zip generate-summary.js
  cd ..
  ```
- [ ] Update Lambda:
  ```bash
  aws lambda update-function-code \
    --function-name banidfy-generate-summary \
    --zip-file fileb://lambda/generate-summary.zip \
    --region us-east-1
  ```

- [ ] Install dependencies in Lambda:
  - [ ] Layer with Node.js dependencies or upload as zip with node_modules

## API Gateway Setup (10 minutes)

- [ ] Get your API ID:
  ```bash
  aws apigateway get-rest-apis \
    --query 'items[?name==`banidfy-api`].id' \
    --output text \
    --region us-east-1
  ```

- [ ] Create/Update resource in API Gateway:
  ```bash
  # Get root resource ID
  ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id YOUR_API_ID \
    --query 'items[0].id' \
    --output text)
  
  # Create 'practice' resource
  PRACTICE_ID=$(aws apigateway create-resource \
    --rest-api-id YOUR_API_ID \
    --parent-id $ROOT_ID \
    --path-part practice \
    --query 'id' \
    --output text)
  
  # Create 'summary' resource
  SUMMARY_ID=$(aws apigateway create-resource \
    --rest-api-id YOUR_API_ID \
    --parent-id $PRACTICE_ID \
    --path-part summary \
    --query 'id' \
    --output text)
  
  # Create '{userId}' path parameter
  USERID_ID=$(aws apigateway create-resource \
    --rest-api-id YOUR_API_ID \
    --parent-id $SUMMARY_ID \
    --path-part '{userId}' \
    --query 'id' \
    --output text)
  ```

- [ ] Create API method:
  ```bash
  aws apigateway put-method \
    --rest-api-id YOUR_API_ID \
    --resource-id USERID_ID \
    --http-method GET \
    --authorization-type NONE
  ```

- [ ] Create Lambda integration:
  ```bash
  LAMBDA_ARN=$(aws lambda get-function \
    --function-name banidfy-generate-summary \
    --query 'Configuration.FunctionArn' \
    --output text)
  
  aws apigateway put-integration \
    --rest-api-id YOUR_API_ID \
    --resource-id USERID_ID \
    --http-method GET \
    --type AWS_LAMBDA \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"
  ```

- [ ] Grant API permission to invoke Lambda:
  ```bash
  aws lambda add-permission \
    --function-name banidfy-generate-summary \
    --statement-id apigateway-access \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com
  ```

- [ ] Deploy API:
  ```bash
  aws apigateway create-deployment \
    --rest-api-id YOUR_API_ID \
    --stage-name dev
  ```

- [ ] Get API endpoint:
  ```bash
  aws apigateway get-stage \
    --rest-api-id YOUR_API_ID \
    --stage-name dev \
    --query 'invokeUrl' \
    --output text
  ```

## Configuration (5 minutes)

- [ ] Update `aws-config.js`:
  ```javascript
  API: {
    REST: {
      'LearningAPI': {
        endpoint: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev'
      }
    }
  }
  ```

- [ ] Copy API endpoint from previous step and replace `YOUR_API_ID`

## Testing (10 minutes)

- [ ] Create test practice data in DynamoDB:
  ```bash
  aws dynamodb put-item \
    --table-name BanidifyPracticeResults \
    --item '{
      "resultId": {"S": "test-001"},
      "userId": {"S": "testuser"},
      "practiceType": {"S": "reading"},
      "score": {"N": "85"},
      "timestamp": {"S": "2024-01-15T10:30:00Z"}
    }' \
    --region us-east-1
  ```

- [ ] Test Lambda function directly:
  ```bash
  aws lambda invoke \
    --function-name banidfy-generate-summary \
    --payload '{"pathParameters":{"userId":"testuser"}}' \
    --region us-east-1 \
    response.json
  
  cat response.json
  ```

- [ ] Check Lambda logs:
  ```bash
  aws logs tail /aws/lambda/banidfy-generate-summary --follow
  ```

- [ ] Test API endpoint:
  ```bash
  curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/practice/summary/testuser
  ```

- [ ] Test dashboard:
  - [ ] Open `dashboard.html` in browser
  - [ ] Log in with test credentials
  - [ ] Verify "AI-Powered Learning Summary" section appears
  - [ ] Check browser console for any errors (F12)

## Post-Deployment Verification (5 minutes)

- [ ] [ ] CloudFormation stack status: `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- [ ] [ ] Lambda function exists: `banidfy-generate-summary`
- [ ] [ ] Lambda has Bedrock IAM permissions
- [ ] [ ] API Gateway endpoint works
- [ ] [ ] Dashboard loads summary section
- [ ] [ ] No errors in CloudWatch Logs

## Troubleshooting

If Bedrock summary doesn't appear:

1. **Check Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/banidfy-generate-summary --follow
   ```

2. **Check if models are enabled:**
   ```bash
   aws bedrock list-foundation-models \
     --region us-east-1 \
     --query 'modelSummaries[?contains(modelId, `claude`)].{modelId, modelArn}'
   ```

3. **Test Lambda with sample data:**
   - Ensure test user has practice results in DynamoDB
   - Check if summary is being generated

4. **Check API Gateway:**
   - Verify resource path is `/practice/summary/{userId}`
   - Verify Lambda integration is set up correctly
   - Test endpoint directly with curl

## Success Indicators ✅

You'll know it's working when:
- ✅ Dashboard shows "AI-Powered Learning Summary" section
- ✅ Summary content appears (not "Generating..." message)
- ✅ Summary includes personalized feedback about student progress
- ✅ Timestamp shows when summary was generated
- ✅ No JavaScript errors in browser console
- ✅ Lambda CloudWatch logs show successful execution

## Cost Monitoring

- [ ] Set CloudWatch alarm for Bedrock API calls
- [ ] Monitor Lambda invocations and duration
- [ ] Estimate monthly costs based on test usage
- [ ] Set up AWS Cost Explorer to track Bedrock spending

---

**Estimated Total Time: 1-2 hours (first time setup)**

For questions or issues, check [BEDROCK_INTEGRATION.md](BEDROCK_INTEGRATION.md)
