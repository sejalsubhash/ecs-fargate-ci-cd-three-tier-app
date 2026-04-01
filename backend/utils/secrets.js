const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('./logger');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-2' });

async function getSecret(secretName) {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    const secret = JSON.parse(response.SecretString);
    logger.info(`Secret '${secretName}' retrieved successfully`);
    return secret;
  } catch (err) {
    logger.error(`Failed to retrieve secret '${secretName}': ${err.message}`);
    throw err;
  }
}

module.exports = { getSecret };
