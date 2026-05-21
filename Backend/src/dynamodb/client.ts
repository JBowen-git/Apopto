import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type ClientPortalTableEnvironment = {
  CLIENT_PORTAL_TABLE?: string;
};

export function getClientPortalTableName(
  environment: ClientPortalTableEnvironment = process.env,
): string {
  const tableName = environment.CLIENT_PORTAL_TABLE?.trim();

  if (!tableName) {
    throw new Error('CLIENT_PORTAL_TABLE is required.');
  }

  return tableName;
}

export function createDynamoDbClient(config: DynamoDBClientConfig = {}) {
  return new DynamoDBClient(config);
}

export function createDynamoDocumentClient(config: DynamoDBClientConfig = {}) {
  return DynamoDBDocumentClient.from(createDynamoDbClient(config), {
    marshallOptions: {
      convertClassInstanceToMap: false,
      removeUndefinedValues: true,
    },
  });
}
