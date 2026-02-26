import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1', // Change to your region
    userPoolId: 'us-east-1_XXXXXXXXX', // Your Cognito User Pool ID
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXX', // Your Cognito Web Client ID
    identityPoolId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX', // Your Cognito Identity Pool ID
  },
  Storage: {
    AWSS3: {
      bucket: 'banidfy-learning-platform', // Your S3 bucket name
      region: 'us-east-1',
      identityId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXX',
    }
  },
  API: {
    REST: {
      'LearningAPI': {
        endpoint: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com'
      }
    }
  }
});

export default Amplify;
