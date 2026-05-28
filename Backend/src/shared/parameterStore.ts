import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export type RuntimeParameterResolver = (parameterName: string) => Promise<string | undefined>;

const ssmClient = new SSMClient({});
const parameterValueCache = new Map<string, Promise<string | undefined>>();

async function getDecryptedParameter(parameterName: string) {
  const response = await ssmClient.send(new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  }));

  const value = response.Parameter?.Value?.trim();

  return value || undefined;
}

export async function resolveRuntimeParameter(parameterName: string) {
  const normalizedName = parameterName.trim();

  if (!normalizedName) {
    return undefined;
  }

  const cached = parameterValueCache.get(normalizedName);

  if (cached) {
    return cached;
  }

  const pendingValue = getDecryptedParameter(normalizedName);
  parameterValueCache.set(normalizedName, pendingValue);

  try {
    return await pendingValue;
  } catch (error) {
    parameterValueCache.delete(normalizedName);
    throw error;
  }
}
