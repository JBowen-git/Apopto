import {
  GetIntakeResponseSchema,
  UpdateIntakeResponseSchema,
  type IntakeFormData,
} from '@apopto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';
import { isApiClientError } from '../api/client';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import IntakeForm from '../components/intake/IntakeForm';

function saveErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.requestId
      ? `${error.message} Request ID: ${error.requestId}`
      : error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The intake could not be saved. Please try again.';
}

export default function Intake() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const intakeQuery = useQuery({
    queryKey: ['intake'],
    queryFn: async () => GetIntakeResponseSchema.parse(await apiClient.get('/api/intake')),
  });
  const saveIntakeMutation = useMutation({
    mutationFn: async (formData: IntakeFormData) => UpdateIntakeResponseSchema.parse(
      await apiClient.put('/api/intake', { formData }),
    ),
    onSuccess: (response) => {
      queryClient.setQueryData(['intake'], {
        client: response.client,
        intake: response.intake,
      });
    },
  });

  if (intakeQuery.isLoading) {
    return (
      <LoadingState
        message="Loading your saved intake details."
        title="Opening your intake."
      />
    );
  }

  if (intakeQuery.isError) {
    return (
      <ErrorState
        error={intakeQuery.error}
        title="Intake could not load."
      />
    );
  }

  const intakeResponse = intakeQuery.data;

  if (!intakeResponse) {
    return (
      <ErrorState
        message="The intake response was empty. Please refresh and try again."
        title="Intake could not load."
      />
    );
  }

  return (
    <section className="start-project-page intake-page" aria-labelledby="intake-title">
      <IntakeForm
        clientBusinessName={intakeResponse.client?.businessName}
        initialValues={intakeResponse.intake?.formData}
        lastUpdatedAt={intakeResponse.intake?.updatedAt}
        onSubmit={(values) => saveIntakeMutation.mutateAsync(values).then(() => undefined)}
        saveError={saveIntakeMutation.isError ? saveErrorMessage(saveIntakeMutation.error) : undefined}
        saveSuccess={saveIntakeMutation.isSuccess}
        saving={saveIntakeMutation.isPending}
      />
    </section>
  );
}
