import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
  type TransactWriteCommandInput,
  type UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

import type { PortalTableItem } from './items.js';
import type { PortalIndexName, PortalTableKey } from './keys.js';

export type ExpressionValues = Record<string, unknown>;
export type ExpressionNames = Record<string, string>;

export type WriteCondition = {
  conditionExpression?: string;
  expressionAttributeNames?: ExpressionNames;
  expressionAttributeValues?: ExpressionValues;
};

export type PutItemOptions = WriteCondition;

export type TransactPutItem<TItem extends PortalTableItem = PortalTableItem> =
  WriteCondition & {
    item: TItem;
  };

export type TransactUpdateItem = WriteCondition & {
  key: PortalTableKey;
  updateExpression: string;
};

export type TransactWriteItem<TItem extends PortalTableItem = PortalTableItem> =
  | (TransactPutItem<TItem> & { action?: 'put' })
  | (TransactUpdateItem & { action: 'update' });

export type UpdateItemOptions = WriteCondition & {
  updateExpression: string;
  returnValues?: UpdateCommandInput['ReturnValues'];
};

export type QueryByPartitionOptions = {
  pk: string;
  skBeginsWith?: string;
  limit?: number;
  scanIndexForward?: boolean;
  consistentRead?: boolean;
};

export type QueryByIndexOptions = {
  indexName: PortalIndexName;
  pk: string;
  skBeginsWith?: string;
  limit?: number;
  scanIndexForward?: boolean;
};

export type PortalRepositoryConfig = {
  tableName: string;
  client: DynamoDBDocumentClient;
};

function keyAttributes(indexName?: PortalIndexName) {
  if (indexName === 'GSI1') {
    return { pkName: 'GSI1PK', skName: 'GSI1SK' };
  }

  if (indexName === 'GSI2') {
    return { pkName: 'GSI2PK', skName: 'GSI2SK' };
  }

  return { pkName: 'PK', skName: 'SK' };
}

function queryKeyCondition(
  pkValue: string,
  skBeginsWith: string | undefined,
  indexName?: PortalIndexName,
) {
  const { pkName, skName } = keyAttributes(indexName);
  const expressionAttributeNames = {
    '#pk': pkName,
    ...(skBeginsWith ? { '#sk': skName } : {}),
  };
  const expressionAttributeValues = {
    ':pk': pkValue,
    ...(skBeginsWith ? { ':skPrefix': skBeginsWith } : {}),
  };

  return {
    expressionAttributeNames,
    expressionAttributeValues,
    keyConditionExpression: skBeginsWith
      ? '#pk = :pk AND begins_with(#sk, :skPrefix)'
      : '#pk = :pk',
  };
}

export function createPortalRepository({ tableName, client }: PortalRepositoryConfig) {
  return {
    async getItem<TItem extends PortalTableItem = PortalTableItem>(
      key: PortalTableKey,
      options: { consistentRead?: boolean } = {},
    ): Promise<TItem | null> {
      const result = await client.send(new GetCommand({
        TableName: tableName,
        Key: key,
        ConsistentRead: options.consistentRead,
      }));

      return (result.Item as TItem | undefined) ?? null;
    },

    async batchGetItems<TItem extends PortalTableItem = PortalTableItem>(
      keys: PortalTableKey[],
    ): Promise<TItem[]> {
      if (keys.length === 0) {
        return [];
      }

      if (keys.length > 100) {
        throw new Error('batchGetItems accepts at most 100 keys per request.');
      }

      const result = await client.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      }));

      return (result.Responses?.[tableName] ?? []) as TItem[];
    },

    async putItem<TItem extends PortalTableItem>(
      item: TItem,
      options: PutItemOptions = {},
    ): Promise<void> {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: options.conditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
      }));
    },

    async transactPutItems<TItem extends PortalTableItem>(
      items: TransactPutItem<TItem>[],
    ): Promise<void> {
      if (items.length === 0) {
        return;
      }

      if (items.length > 100) {
        throw new Error('transactPutItems accepts at most 100 items per request.');
      }

      const transactItems: TransactWriteCommandInput['TransactItems'] = items.map((entry) => ({
        Put: {
          TableName: tableName,
          Item: entry.item,
          ConditionExpression: entry.conditionExpression,
          ExpressionAttributeNames: entry.expressionAttributeNames,
          ExpressionAttributeValues: entry.expressionAttributeValues,
        },
      }));

      await client.send(new TransactWriteCommand({
        TransactItems: transactItems,
      }));
    },

    async transactWriteItems<TItem extends PortalTableItem>(
      items: TransactWriteItem<TItem>[],
    ): Promise<void> {
      if (items.length === 0) {
        return;
      }

      if (items.length > 100) {
        throw new Error('transactWriteItems accepts at most 100 items per request.');
      }

      const transactItems: TransactWriteCommandInput['TransactItems'] = items.map((entry) => {
        if (entry.action === 'update') {
          return {
            Update: {
              TableName: tableName,
              Key: entry.key,
              UpdateExpression: entry.updateExpression,
              ConditionExpression: entry.conditionExpression,
              ExpressionAttributeNames: entry.expressionAttributeNames,
              ExpressionAttributeValues: entry.expressionAttributeValues,
            },
          };
        }

        return {
          Put: {
            TableName: tableName,
            Item: entry.item,
            ConditionExpression: entry.conditionExpression,
            ExpressionAttributeNames: entry.expressionAttributeNames,
            ExpressionAttributeValues: entry.expressionAttributeValues,
          },
        };
      });

      await client.send(new TransactWriteCommand({
        TransactItems: transactItems,
      }));
    },

    async updateItem<TItem extends PortalTableItem = PortalTableItem>(
      key: PortalTableKey,
      options: UpdateItemOptions,
    ): Promise<TItem | null> {
      const result = await client.send(new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: options.updateExpression,
        ConditionExpression: options.conditionExpression,
        ExpressionAttributeNames: options.expressionAttributeNames,
        ExpressionAttributeValues: options.expressionAttributeValues,
        ReturnValues: options.returnValues ?? 'ALL_NEW',
      }));

      return (result.Attributes as TItem | undefined) ?? null;
    },

    async queryByPartition<TItem extends PortalTableItem = PortalTableItem>(
      options: QueryByPartitionOptions,
    ): Promise<TItem[]> {
      const keyCondition = queryKeyCondition(options.pk, options.skBeginsWith);
      const result = await client.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: keyCondition.keyConditionExpression,
        ExpressionAttributeNames: keyCondition.expressionAttributeNames,
        ExpressionAttributeValues: keyCondition.expressionAttributeValues,
        ConsistentRead: options.consistentRead,
        Limit: options.limit,
        ScanIndexForward: options.scanIndexForward,
      }));

      return (result.Items ?? []) as TItem[];
    },

    async queryByIndex<TItem extends PortalTableItem = PortalTableItem>(
      options: QueryByIndexOptions,
    ): Promise<TItem[]> {
      const keyCondition = queryKeyCondition(
        options.pk,
        options.skBeginsWith,
        options.indexName,
      );
      const result = await client.send(new QueryCommand({
        TableName: tableName,
        IndexName: options.indexName,
        KeyConditionExpression: keyCondition.keyConditionExpression,
        ExpressionAttributeNames: keyCondition.expressionAttributeNames,
        ExpressionAttributeValues: keyCondition.expressionAttributeValues,
        Limit: options.limit,
        ScanIndexForward: options.scanIndexForward,
      }));

      return (result.Items ?? []) as TItem[];
    },
  };
}
