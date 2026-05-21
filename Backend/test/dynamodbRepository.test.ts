import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  clientProfileKey,
  createPortalRepository,
} from '../src/dynamodb/index.js';

const tableName = 'ClientPortal-test';
const clientItem = buildClientProfileItem({
  businessName: 'North Star Remodeling',
  clientId: 'client_123',
  createdAt: '2026-05-21T10:15:30.000Z',
  primaryContactUserId: 'auth0|abc',
  status: 'lead',
  updatedAt: '2026-05-21T10:20:30.000Z',
});

function commandInput(command: unknown) {
  return (command as { input: Record<string, unknown> }).input;
}

describe('portal repository utilities', () => {
  it('uses GetItem, PutItem, UpdateItem, BatchGetItem, and Query commands', async () => {
    const sentCommands: unknown[] = [];
    const client = {
      send: vi.fn(async (command: unknown) => {
        sentCommands.push(command);

        if (command instanceof GetCommand) {
          return { Item: clientItem };
        }

        if (command instanceof QueryCommand) {
          return { Items: [clientItem] };
        }

        if (command instanceof BatchGetCommand) {
          return { Responses: { [tableName]: [clientItem] } };
        }

        if (command instanceof UpdateCommand) {
          return { Attributes: { ...clientItem, status: 'intake_submitted' } };
        }

        return {};
      }),
    } as unknown as DynamoDBDocumentClient;

    const repository = createPortalRepository({ tableName, client });

    await expect(repository.getItem(clientProfileKey('client_123')))
      .resolves.toMatchObject({ type: 'CLIENT' });
    await repository.putItem(clientItem, {
      conditionExpression: 'attribute_not_exists(PK)',
    });
    await repository.transactPutItems([{
      item: clientItem,
      conditionExpression: 'attribute_not_exists(PK)',
    }]);
    await expect(repository.updateItem(clientProfileKey('client_123'), {
      expressionAttributeNames: { '#status': 'status' },
      expressionAttributeValues: { ':status': 'intake_submitted' },
      updateExpression: 'SET #status = :status',
    })).resolves.toMatchObject({ status: 'intake_submitted' });
    await expect(repository.batchGetItems([clientProfileKey('client_123')]))
      .resolves.toHaveLength(1);
    await expect(repository.queryByPartition({
      pk: 'CLIENT#client_123',
      skBeginsWith: 'PROJECT#',
    })).resolves.toHaveLength(1);
    await expect(repository.queryByIndex({
      indexName: 'GSI1',
      pk: 'USER#auth0|abc',
      skBeginsWith: 'CLIENT#',
    })).resolves.toHaveLength(1);

    expect(sentCommands).toHaveLength(7);
    expect(sentCommands[0]).toBeInstanceOf(GetCommand);
    expect(sentCommands[1]).toBeInstanceOf(PutCommand);
    expect(sentCommands[2]).toBeInstanceOf(TransactWriteCommand);
    expect(sentCommands[3]).toBeInstanceOf(UpdateCommand);
    expect(sentCommands[4]).toBeInstanceOf(BatchGetCommand);
    expect(sentCommands[5]).toBeInstanceOf(QueryCommand);
    expect(sentCommands[6]).toBeInstanceOf(QueryCommand);
    expect(commandInput(sentCommands[2])).toMatchObject({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: clientItem,
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    });
  });

  it('builds key-condition query inputs without scans', async () => {
    const sentCommands: unknown[] = [];
    const client = {
      send: vi.fn(async (command: unknown) => {
        sentCommands.push(command);
        return { Items: [] };
      }),
    } as unknown as DynamoDBDocumentClient;
    const repository = createPortalRepository({ tableName, client });

    await repository.queryByPartition({
      pk: 'CLIENT#client_123',
      skBeginsWith: 'FILE#',
      limit: 25,
      scanIndexForward: false,
    });
    await repository.queryByIndex({
      indexName: 'GSI2',
      pk: 'FILE#file_123',
    });

    expect(commandInput(sentCommands[0])).toMatchObject({
      TableName: tableName,
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :skPrefix)',
      ExpressionAttributeNames: {
        '#pk': 'PK',
        '#sk': 'SK',
      },
      ExpressionAttributeValues: {
        ':pk': 'CLIENT#client_123',
        ':skPrefix': 'FILE#',
      },
      Limit: 25,
      ScanIndexForward: false,
    });

    expect(commandInput(sentCommands[1])).toMatchObject({
      TableName: tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'GSI2PK',
      },
      ExpressionAttributeValues: {
        ':pk': 'FILE#file_123',
      },
    });
  });

  it('requires non-empty batch requests to fit DynamoDB limits', async () => {
    const client = {
      send: vi.fn(async () => ({ Responses: { [tableName]: [] } })),
    } as unknown as DynamoDBDocumentClient;
    const repository = createPortalRepository({ tableName, client });

    await expect(repository.batchGetItems([])).resolves.toEqual([]);
    expect(client.send).not.toHaveBeenCalled();

    await expect(repository.batchGetItems(
      Array.from({ length: 101 }, (_, index) => clientProfileKey(`client_${index}`)),
    )).rejects.toThrow('at most 100 keys');
    await expect(repository.transactPutItems(
      Array.from({ length: 101 }, () => ({ item: clientItem })),
    )).rejects.toThrow('at most 100 items');
  });
});
