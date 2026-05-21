import {
  GetIntakeResponseSchema,
  UpdateClientProfileRequestSchema,
  UpdateClientProfileResponseSchema,
  UpdateIntakeRequestSchema,
  UpdateIntakeResponseSchema,
  type GetIntakeResponse,
  type UpdateClientProfileRequest,
  type UpdateClientProfileResponse,
  type UpdateIntakeRequest,
  type UpdateIntakeResponse,
} from '@apopto/shared';

import {
  buildAuditEventItem,
  buildCurrentIntakeItem,
  clientByStatusGsiKey,
  clientProfileKey,
  currentIntakeKey,
  type AuditEventItem,
  type ClientProfileItem,
  type CurrentIntakeItem,
  type PortalTableItem,
  type TransactWriteItem,
} from '../dynamodb/index.js';
import { newId } from '../shared/ids.js';
import { validateWithSchema } from '../shared/validation.js';
import {
  resolveClientContext,
  type ResolvedClientContext,
  type TenantResolverRepository,
} from './resolver.js';

export type IntakeRepository = TenantResolverRepository & {
  transactWriteItems<TItem extends PortalTableItem>(
    items: TransactWriteItem<TItem>[],
  ): Promise<void>;
};

export type IntakeApiFailure = {
  ok: false;
  statusCode: 400 | 401 | 403 | 409 | 422 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type GetIntakeResult =
  | { ok: true; response: GetIntakeResponse }
  | IntakeApiFailure;

export type UpdateIntakeResult =
  | { ok: true; response: UpdateIntakeResponse }
  | IntakeApiFailure;

export type UpdateClientProfileResult =
  | { ok: true; response: UpdateClientProfileResponse }
  | IntakeApiFailure;

export type IntakeServiceInput = {
  auth0Sub: string;
  repository: IntakeRepository;
  now?: () => string;
  newAuditId?: () => string;
};

function isCurrentIntakeItem(item: PortalTableItem | null): item is CurrentIntakeItem {
  return item?.type === 'INTAKE';
}

function clientSummary(client: ClientProfileItem) {
  return {
    businessName: client.businessName,
    clientId: client.clientId,
    status: client.status,
  };
}

function intakeRecord(intake: CurrentIntakeItem) {
  return {
    clientId: intake.clientId,
    createdAt: intake.createdAt,
    formData: intake.formData,
    updatedAt: intake.updatedAt,
    updatedBy: intake.updatedBy,
    version: intake.version,
  };
}

function failureFromTenantResolution(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): IntakeApiFailure {
  if (result.ok) {
    throw new Error('Resolved tenant context cannot be converted to a failure.');
  }

  if (result.reason === 'user_not_found') {
    return {
      ok: false,
      statusCode: 401,
      error: 'user_not_found',
      message: 'The authenticated user has not been initialized in the client portal.',
    };
  }

  if (result.reason === 'no_active_membership') {
    return {
      ok: false,
      statusCode: 403,
      error: 'no_active_membership',
      message: 'The authenticated user does not have an active client membership.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  if (result.reason === 'multiple_active_memberships') {
    return {
      ok: false,
      statusCode: 409,
      error: 'tenant_context_not_ready',
      message: 'The authenticated user could not be mapped to exactly one active client.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'client_profile_missing',
    message: 'The active client membership points to a missing client profile.',
    details: {
      clientId: result.membership.clientId,
    },
  };
}

async function resolveContext({
  auth0Sub,
  repository,
}: Pick<IntakeServiceInput, 'auth0Sub' | 'repository'>): Promise<
  | { ok: true; context: ResolvedClientContext }
  | IntakeApiFailure
> {
  const result = await resolveClientContext({ auth0Sub, repository });

  if (!result.ok) {
    return failureFromTenantResolution(result);
  }

  return {
    ok: true,
    context: result.context,
  };
}

function validationFailure(issues: unknown[]): IntakeApiFailure {
  return {
    ok: false,
    statusCode: 400,
    error: 'validation_failed',
    message: 'The request body did not match the expected schema.',
    details: {
      issues,
    },
  };
}

function auditPut({
  action,
  actorUserId,
  clientId,
  createdAt,
  entityId,
  entityType,
  metadata,
  newAuditId,
}: {
  action: string;
  actorUserId: string;
  clientId: string;
  createdAt: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
  newAuditId: () => string;
}): TransactWriteItem<AuditEventItem> {
  const auditEvent = buildAuditEventItem({
    action,
    actorUserId,
    clientId,
    createdAt,
    entityId,
    entityType,
    eventId: newAuditId(),
    ...(metadata ? { metadata } : {}),
  });

  return {
    item: auditEvent,
    conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };
}

function isTransactionConflict(error: unknown) {
  return (error as { name?: string }).name === 'TransactionCanceledException';
}

function transactionFailure(error: unknown): IntakeApiFailure {
  if (isTransactionConflict(error)) {
    return {
      ok: false,
      statusCode: 409,
      error: 'write_conflict',
      message: 'The client portal record changed while this request was being saved. Please try again.',
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'write_failed',
    message: 'The client portal record could not be saved.',
    details: {
      errorName: (error as { name?: string }).name ?? 'UnknownError',
    },
  };
}

export async function getCurrentIntake({
  auth0Sub,
  repository,
}: IntakeServiceInput): Promise<GetIntakeResult> {
  const resolved = await resolveContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client } = resolved.context;
  const intake = await repository.getItem<CurrentIntakeItem>(
    currentIntakeKey(client.clientId),
    { consistentRead: true },
  );

  return {
    ok: true,
    response: GetIntakeResponseSchema.parse({
      client: clientSummary(client),
      intake: isCurrentIntakeItem(intake) ? intakeRecord(intake) : null,
    }),
  };
}

export async function updateCurrentIntake({
  auth0Sub,
  body,
  newAuditId = () => newId('audit'),
  now = () => new Date().toISOString(),
  repository,
}: IntakeServiceInput & {
  body: unknown;
}): Promise<UpdateIntakeResult> {
  const parsed = validateWithSchema<UpdateIntakeRequest>(UpdateIntakeRequestSchema, body);

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const resolved = await resolveContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const existingIntake = await repository.getItem<CurrentIntakeItem>(
    currentIntakeKey(client.clientId),
    { consistentRead: true },
  );
  const timestamp = now();
  const nextClientStatus = client.status === 'lead' ? 'intake_submitted' : client.status;
  const nextIntake = buildCurrentIntakeItem({
    clientId: client.clientId,
    createdAt: isCurrentIntakeItem(existingIntake) ? existingIntake.createdAt : timestamp,
    formData: parsed.data.formData,
    updatedAt: timestamp,
    updatedBy: user.auth0Sub,
    version: isCurrentIntakeItem(existingIntake) ? existingIntake.version + 1 : 1,
  });
  const writes: TransactWriteItem[] = [
    {
      item: nextIntake,
    },
    auditPut({
      action: 'intake.updated',
      actorUserId: user.auth0Sub,
      clientId: client.clientId,
      createdAt: timestamp,
      entityId: 'CURRENT',
      entityType: 'INTAKE',
      metadata: {
        version: nextIntake.version,
        ...(client.status === 'lead' ? {
          statusTransition: {
            from: 'lead',
            to: 'intake_submitted',
          },
        } : {}),
      },
      newAuditId,
    }),
  ];

  if (client.status === 'lead') {
    const nextStatusIndex = clientByStatusGsiKey(
      'intake_submitted',
      client.createdAt,
      client.clientId,
    );

    writes.push({
      action: 'update',
      key: clientProfileKey(client.clientId),
      conditionExpression: '#status = :lead',
      expressionAttributeNames: {
        '#gsi1pk': 'GSI1PK',
        '#gsi1sk': 'GSI1SK',
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      expressionAttributeValues: {
        ':gsi1pk': nextStatusIndex.GSI1PK,
        ':gsi1sk': nextStatusIndex.GSI1SK,
        ':lead': 'lead',
        ':status': 'intake_submitted',
        ':updatedAt': timestamp,
      },
      updateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
    });
  }

  try {
    await repository.transactWriteItems(writes);
  } catch (error) {
    return transactionFailure(error);
  }

  return {
    ok: true,
    response: UpdateIntakeResponseSchema.parse({
      client: {
        ...clientSummary(client),
        status: nextClientStatus,
      },
      intake: intakeRecord(nextIntake),
    }),
  };
}

function editableProfileFields(input: UpdateClientProfileRequest) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<UpdateClientProfileRequest>;
}

export async function updateClientProfile({
  auth0Sub,
  body,
  newAuditId = () => newId('audit'),
  now = () => new Date().toISOString(),
  repository,
}: IntakeServiceInput & {
  body: unknown;
}): Promise<UpdateClientProfileResult> {
  const parsed = validateWithSchema<UpdateClientProfileRequest>(
    UpdateClientProfileRequestSchema,
    body,
  );

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const resolved = await resolveContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const fields = editableProfileFields(parsed.data);
  const names: Record<string, string> = {
    '#updatedAt': 'updatedAt',
  };
  const values: Record<string, unknown> = {
    ':updatedAt': now(),
  };
  const setters = ['#updatedAt = :updatedAt'];

  for (const [field, value] of Object.entries(fields)) {
    const nameKey = `#${field}`;
    const valueKey = `:${field}`;
    names[nameKey] = field;
    values[valueKey] = value;
    setters.push(`${nameKey} = ${valueKey}`);
  }

  try {
    await repository.transactWriteItems([
      {
        action: 'update',
        key: clientProfileKey(client.clientId),
        conditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
        expressionAttributeNames: names,
        expressionAttributeValues: values,
        updateExpression: `SET ${setters.join(', ')}`,
      },
      auditPut({
        action: 'client.profile_updated',
        actorUserId: user.auth0Sub,
        clientId: client.clientId,
        createdAt: values[':updatedAt'] as string,
        entityId: client.clientId,
        entityType: 'CLIENT',
        metadata: {
          fields: Object.keys(fields),
        },
        newAuditId,
      }),
    ]);
  } catch (error) {
    return transactionFailure(error);
  }

  return {
    ok: true,
    response: UpdateClientProfileResponseSchema.parse({
      client: clientSummary({
        ...client,
        ...fields,
        updatedAt: values[':updatedAt'] as string,
      }),
    }),
  };
}
