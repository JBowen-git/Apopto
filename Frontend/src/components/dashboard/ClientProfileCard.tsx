import {
  UpdateClientProfileRequestSchema,
  UpdateClientProfileResponseSchema,
  type DashboardClientProfile,
  type DashboardResponse,
  type GetIntakeResponse,
  type IntakeRecord,
  type MeResponse,
} from '@apopto/shared';
import { Alert, Button as MuiButton, TextField } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { isApiClientError } from '../../api/client';
import { useApiClient } from '../../api/useApiClient';

type ClientProfileCardProps = {
  client: DashboardClientProfile;
  intake?: IntakeRecord | null;
};

type ProfileFormValues = {
  businessName: string;
  contactEmail: string;
  contactName: string;
  industry: string;
  phone: string;
  website: string;
};

function profileValuesFrom(client: DashboardClientProfile, intake?: IntakeRecord | null): ProfileFormValues {
  const intakeData = intake?.formData;

  return {
    businessName: client.businessName || intakeData?.businessName || '',
    contactEmail: client.contactEmail ?? intakeData?.contactEmail ?? '',
    contactName: client.contactName ?? intakeData?.contactName ?? '',
    industry: client.industry ?? intakeData?.industry ?? '',
    phone: client.phone ?? intakeData?.phone ?? '',
    website: client.website ?? intakeData?.website ?? '',
  };
}

function errorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.requestId
      ? `${error.message} Request ID: ${error.requestId}`
      : error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The client profile could not be saved.';
}

export default function ClientProfileCard({
  client,
  intake,
}: ClientProfileCardProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const initialValues = useMemo(() => profileValuesFrom(client, intake), [client, intake]);
  const hasSavedLocally = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [values, setValues] = useState(initialValues);
  const updateProfileMutation = useMutation({
    mutationFn: async (nextValues: ProfileFormValues) => {
      const parsed = UpdateClientProfileRequestSchema.safeParse(nextValues);

      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'The profile fields are invalid.');
      }

      return UpdateClientProfileResponseSchema.parse(
        await apiClient.patch('/api/client/profile', parsed.data),
      );
    },
    onSuccess: (response) => {
      queryClient.setQueryData<MeResponse>(['me'], (current) => (
        current ? { ...current, client: response.client } : current
      ));
      queryClient.setQueryData<GetIntakeResponse>(['intake'], (current) => (
        current ? { ...current, client: response.client } : current
      ));
      queryClient.setQueryData<DashboardResponse>(['dashboard'], (current) => (
        current
          ? {
            ...current,
            client: {
              ...current.client,
              ...values,
              businessName: response.client.businessName,
              status: response.client.status,
            },
          }
          : current
      ));

      const nextSavedValues = {
        ...values,
        businessName: response.client.businessName,
      };
      hasSavedLocally.current = true;
      setSavedValues(nextSavedValues);
      setValues(nextSavedValues);
      setFormError(null);
      setIsEditing(false);
    },
  });

  useEffect(() => {
    if (hasSavedLocally.current) {
      return;
    }

    setSavedValues(initialValues);
    setValues(initialValues);
  }, [initialValues]);

  function updateValue(field: keyof ProfileFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setFormError(null);
      updateProfileMutation.reset();
      setValues((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  function cancelEditing() {
    setValues(savedValues);
    setFormError(null);
    updateProfileMutation.reset();
    setIsEditing(false);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      await updateProfileMutation.mutateAsync(values);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <section className="account-status-panel dashboard-profile-card">
      <div className="dashboard-section-heading dashboard-section-heading-row">
        <div>
          <span className="dashboard-panel-label">Client profile</span>
          <h2>{savedValues.businessName || 'New Client'}</h2>
        </div>
        {!isEditing ? (
          <MuiButton
            className="contact-form-action"
            onClick={() => setIsEditing(true)}
            type="button"
            variant="outlined"
          >
            Edit profile
          </MuiButton>
        ) : null}
      </div>

      {!isEditing ? (
        <dl className="dashboard-detail-list dashboard-profile-details">
          <div>
            <dt>Contact</dt>
            <dd>{savedValues.contactName || 'Not added yet'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{savedValues.contactEmail || 'Not added yet'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{savedValues.phone || 'Optional'}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>{savedValues.website || 'Not added yet'}</dd>
          </div>
          <div>
            <dt>Industry</dt>
            <dd>{savedValues.industry || 'Not added yet'}</dd>
          </div>
        </dl>
      ) : (
        <form className="dashboard-profile-form" onSubmit={submitProfile}>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              fullWidth
              label="Business / Brand Name"
              onChange={updateValue('businessName')}
              required
              value={values.businessName}
            />
            <TextField
              fullWidth
              label="Industry"
              onChange={updateValue('industry')}
              value={values.industry}
            />
            <TextField
              fullWidth
              label="Contact Name"
              onChange={updateValue('contactName')}
              value={values.contactName}
            />
            <TextField
              fullWidth
              label="Contact Email"
              onChange={updateValue('contactEmail')}
              type="email"
              value={values.contactEmail}
            />
            <TextField
              fullWidth
              label="Phone"
              onChange={updateValue('phone')}
              type="tel"
              value={values.phone}
            />
            <TextField
              fullWidth
              label="Website"
              onChange={updateValue('website')}
              type="url"
              value={values.website}
            />
          </div>

          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {updateProfileMutation.isSuccess ? <Alert severity="success">Profile saved.</Alert> : null}

          <div className="contact-form-actions">
            <MuiButton
              className="contact-form-action"
              disabled={updateProfileMutation.isPending}
              onClick={cancelEditing}
              type="button"
              variant="outlined"
            >
              Cancel
            </MuiButton>
            <MuiButton
              className="contact-form-action contact-form-action-primary"
              disabled={updateProfileMutation.isPending}
              type="submit"
              variant="contained"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            </MuiButton>
          </div>
        </form>
      )}
    </section>
  );
}
