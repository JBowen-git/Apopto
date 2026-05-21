#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function internalAdminItem({
  auth0Sub,
  createdAt,
  createdBy,
  email,
  name,
  notes,
}) {
  return {
    PK: `USER#${auth0Sub}`,
    SK: 'INTERNAL_ADMIN#',
    type: 'INTERNAL_ADMIN',
    auth0Sub,
    status: 'active',
    createdAt,
    updatedAt: createdAt,
    createdBy,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
    ...(notes ? { notes } : {}),
  };
}

async function main() {
  const tableName = requiredEnv('CLIENT_PORTAL_TABLE');
  const auth0Sub = requiredEnv('ADMIN_AUTH0_SUB');
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
  const createdAt = new Date().toISOString();
  const item = internalAdminItem({
    auth0Sub,
    createdAt,
    createdBy: optionalEnv('CREATED_BY') ?? 'manual_seed',
    email: optionalEnv('ADMIN_EMAIL'),
    name: optionalEnv('ADMIN_NAME'),
    notes: optionalEnv('ADMIN_NOTES'),
  });

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({
      tableName,
      region,
      item,
    }, null, 2));
    return;
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  await client.send(new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  }));

  console.log(JSON.stringify({
    seeded: true,
    tableName,
    key: {
      PK: item.PK,
      SK: item.SK,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
