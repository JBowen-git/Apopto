import {
  contentReadinessStates,
  dataSensitivityLevels,
  IntakeFormDataSchema,
  maintenanceInterestLevels,
  projectTypes,
  type IntakeFormData,
} from '@apopto/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button as MuiButton,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useEffect, useMemo } from 'react';
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type Resolver,
} from 'react-hook-form';
import { intakeFormDefaults } from './intakeFormDefaults';

type IntakeFormProps = {
  clientBusinessName?: string;
  initialValues?: IntakeFormData | null;
  lastUpdatedAt?: string;
  onSubmit: (values: IntakeFormData) => Promise<void>;
  saveError?: string;
  saveSuccess?: boolean;
  saving?: boolean;
};

type StringArrayFieldName = 'goals' | 'desiredFeatures' | 'integrationsNeeded';

const intakeResolver = zodResolver(IntakeFormDataSchema) as Resolver<IntakeFormData>;

function choiceLabel(value: string) {
  return value
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function listToText(value: string[] | undefined) {
  return (value ?? []).join('\n');
}

function textToList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatTimestamp(value?: string) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function helperText(message: unknown, fallback = ' ') {
  return typeof message === 'string' && message ? message : fallback;
}

function StringArrayTextField({
  control,
  errors,
  helper,
  label,
  name,
  required = false,
}: {
  control: Control<IntakeFormData>;
  errors: FieldErrors<IntakeFormData>;
  helper: string;
  label: string;
  name: StringArrayFieldName;
  required?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          className="contact-field-wide"
          error={Boolean(errors[name])}
          fullWidth
          helperText={helperText(errors[name]?.message, helper)}
          label={label}
          minRows={3}
          multiline
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(textToList(event.target.value))}
          required={required}
          value={listToText(field.value)}
        />
      )}
    />
  );
}

export default function IntakeForm({
  clientBusinessName,
  initialValues,
  lastUpdatedAt,
  onSubmit,
  saveError,
  saveSuccess = false,
  saving = false,
}: IntakeFormProps) {
  const defaultValues = useMemo(
    () => intakeFormDefaults(initialValues, clientBusinessName),
    [clientBusinessName, initialValues],
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<IntakeFormData>({
    defaultValues,
    mode: 'onBlur',
    resolver: intakeResolver,
  });
  const updatedAtLabel = formatTimestamp(lastUpdatedAt);
  const submitting = isSubmitting || saving;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form
      className="start-project-wizard intake-wizard"
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <aside className="start-project-sidebar intake-sidebar" aria-label="Project intake overview">
        <div className="start-project-sidebar-heading">
          <span>Client portal</span>
          <h1>Project Intake</h1>
          <p>
            Share the project context once, keep it editable, and give every next step
            a cleaner starting point.
          </p>
        </div>

        <div className="intake-sidebar-list" aria-label="Intake sections">
          <span>01 Basics</span>
          <span>02 Goals and audience</span>
          <span>03 Design and content</span>
          <span>04 Technical context</span>
          <span>05 Scope and approvals</span>
        </div>

        <div className="start-project-progress intake-save-panel">
          <div>
            <span>Status</span>
            <strong>{updatedAtLabel ? 'Saved' : 'Draft'}</strong>
          </div>
          <p>{updatedAtLabel ? `Last updated ${updatedAtLabel}` : 'Complete the form and save when ready.'}</p>
        </div>
      </aside>

      <section className="start-project-workspace intake-workspace">
        <header className="start-project-workspace-header">
          <span>Intake foundation</span>
          <h2 id="intake-title">Tell me what we are building.</h2>
          <p>
            This protected intake saves directly to your client portal profile and can be
            updated as the project becomes clearer.
          </p>
        </header>

        <div className="intake-form-section">
          <div className="intake-form-section-heading">
            <span>Basics</span>
            <h3>Business and contact details</h3>
          </div>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              error={Boolean(errors.businessName)}
              fullWidth
              helperText={helperText(errors.businessName?.message)}
              label="Business / Brand Name"
              required
              {...register('businessName')}
            />
            <TextField
              error={Boolean(errors.industry)}
              fullWidth
              helperText={helperText(errors.industry?.message)}
              label="Industry"
              required
              {...register('industry')}
            />
            <TextField
              error={Boolean(errors.contactName)}
              fullWidth
              helperText={helperText(errors.contactName?.message)}
              label="Primary Contact Name"
              required
              {...register('contactName')}
            />
            <TextField
              error={Boolean(errors.contactEmail)}
              fullWidth
              helperText={helperText(errors.contactEmail?.message)}
              label="Primary Contact Email"
              required
              type="email"
              {...register('contactEmail')}
            />
            <TextField
              fullWidth
              helperText=" "
              label="Phone"
              type="tel"
              {...register('phone')}
            />
            <TextField
              error={Boolean(errors.website)}
              fullWidth
              helperText={helperText(errors.website?.message)}
              label="Current Website"
              type="url"
              {...register('website')}
            />
          </div>
        </div>

        <div className="intake-form-section">
          <div className="intake-form-section-heading">
            <span>Goals</span>
            <h3>What the site needs to accomplish</h3>
          </div>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              className="contact-field-wide"
              error={Boolean(errors.businessDescription)}
              fullWidth
              helperText={helperText(errors.businessDescription?.message)}
              label="Business Description"
              minRows={4}
              multiline
              required
              {...register('businessDescription')}
            />
            <Controller
              control={control}
              name="projectType"
              render={({ field }) => (
                <TextField
                  error={Boolean(errors.projectType)}
                  fullWidth
                  helperText={helperText(errors.projectType?.message)}
                  label="Project Type"
                  required
                  select
                  {...field}
                >
                  {projectTypes.map((projectType) => (
                    <MenuItem key={projectType} value={projectType}>
                      {choiceLabel(projectType)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              error={Boolean(errors.targetAudience)}
              fullWidth
              helperText={helperText(errors.targetAudience?.message)}
              label="Target Audience"
              required
              {...register('targetAudience')}
            />
            <StringArrayTextField
              control={control}
              errors={errors}
              helper="Add one project goal per line."
              label="Project Goals"
              name="goals"
              required
            />
            <StringArrayTextField
              control={control}
              errors={errors}
              helper="Optional. Add one desired feature per line."
              label="Desired Features"
              name="desiredFeatures"
            />
          </div>
        </div>

        <div className="intake-form-section">
          <div className="intake-form-section-heading">
            <span>Content</span>
            <h3>Design, content, and brand readiness</h3>
          </div>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              className="contact-field-wide"
              error={Boolean(errors.designPreferences)}
              fullWidth
              helperText={helperText(errors.designPreferences?.message)}
              label="Design Preferences"
              minRows={4}
              multiline
              required
              {...register('designPreferences')}
            />
            <FormControl
              className="contact-choice-group contact-choice-group-wide"
              error={Boolean(errors.contentReadiness)}
            >
              <FormLabel>Content Readiness</FormLabel>
              <Controller
                control={control}
                name="contentReadiness"
                render={({ field }) => (
                  <RadioGroup className="contact-option-grid" {...field}>
                    {contentReadinessStates.map((state) => (
                      <FormControlLabel
                        control={<Radio />}
                        key={state}
                        label={choiceLabel(state)}
                        value={state}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
              <FormHelperText>{helperText(errors.contentReadiness?.message)}</FormHelperText>
            </FormControl>

            <FormControl className="contact-choice-group contact-choice-group-wide">
              <FormLabel>Brand Assets</FormLabel>
              <FormGroup className="contact-option-grid">
                <Controller
                  control={control}
                  name="hasLogo"
                  render={({ field }) => (
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={(_, checked) => field.onChange(checked)}
                        />
                      )}
                      label="I have a logo"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="hasBrandGuide"
                  render={({ field }) => (
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={(_, checked) => field.onChange(checked)}
                        />
                      )}
                      label="I have brand guidelines"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="needsCopywriting"
                  render={({ field }) => (
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={(_, checked) => field.onChange(checked)}
                        />
                      )}
                      label="I need copywriting help"
                    />
                  )}
                />
              </FormGroup>
            </FormControl>
          </div>
        </div>

        <div className="intake-form-section">
          <div className="intake-form-section-heading">
            <span>Technical</span>
            <h3>Current tools and data sensitivity</h3>
          </div>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              fullWidth
              helperText=" "
              label="Current Hosting Provider"
              {...register('currentHostingProvider')}
            />
            <TextField
              fullWidth
              helperText=" "
              label="Domain Registrar"
              {...register('domainRegistrar')}
            />
            <TextField
              fullWidth
              helperText=" "
              label="Email Provider"
              {...register('emailProvider')}
            />
            <TextField
              fullWidth
              helperText=" "
              label="Analytics Tools"
              {...register('analyticsTools')}
            />
            <Controller
              control={control}
              name="dataSensitivity"
              render={({ field }) => (
                <TextField
                  error={Boolean(errors.dataSensitivity)}
                  fullWidth
                  helperText={helperText(errors.dataSensitivity?.message)}
                  label="Data Sensitivity"
                  required
                  select
                  {...field}
                >
                  {dataSensitivityLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {choiceLabel(level)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <StringArrayTextField
              control={control}
              errors={errors}
              helper="Optional. Add one integration per line."
              label="Integrations Needed"
              name="integrationsNeeded"
            />
          </div>
        </div>

        <div className="intake-form-section">
          <div className="intake-form-section-heading">
            <span>Scope</span>
            <h3>Budget, timeline, and must-haves</h3>
          </div>
          <div className="contact-form-grid start-project-field-grid">
            <TextField
              error={Boolean(errors.budgetRange)}
              fullWidth
              helperText={helperText(errors.budgetRange?.message)}
              label="Budget Range"
              required
              {...register('budgetRange')}
            />
            <TextField
              error={Boolean(errors.desiredTimeline)}
              fullWidth
              helperText={helperText(errors.desiredTimeline?.message)}
              label="Desired Timeline"
              required
              {...register('desiredTimeline')}
            />
            <TextField
              className="contact-field-wide"
              error={Boolean(errors.mustHaveFeatures)}
              fullWidth
              helperText={helperText(errors.mustHaveFeatures?.message)}
              label="Must-Have Features"
              minRows={4}
              multiline
              required
              {...register('mustHaveFeatures')}
            />
            <TextField
              className="contact-field-wide"
              fullWidth
              helperText=" "
              label="Nice-to-Have Features"
              minRows={3}
              multiline
              {...register('niceToHaveFeatures')}
            />
            <FormControl
              className="contact-choice-group contact-choice-group-wide"
              error={Boolean(errors.maintenanceInterest)}
            >
              <FormLabel>Maintenance Interest</FormLabel>
              <Controller
                control={control}
                name="maintenanceInterest"
                render={({ field }) => (
                  <RadioGroup className="contact-option-grid" {...field}>
                    {maintenanceInterestLevels.map((level) => (
                      <FormControlLabel
                        control={<Radio />}
                        key={level}
                        label={choiceLabel(level)}
                        value={level}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
              <FormHelperText>{helperText(errors.maintenanceInterest?.message)}</FormHelperText>
            </FormControl>
            <TextField
              className="contact-field-wide"
              fullWidth
              helperText=" "
              label="Additional Notes"
              minRows={4}
              multiline
              {...register('additionalNotes')}
            />
          </div>
        </div>

        <FormControl className="contact-choice-group contact-choice-group-wide intake-terms">
          <FormLabel>Before Saving</FormLabel>
          <FormGroup>
            <Controller
              control={control}
              name="acceptedNoSecretsWarning"
              render={({ field }) => (
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={Boolean(field.value)}
                      onBlur={field.onBlur}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  )}
                  label="I understand not to include passwords, API keys, private credentials, or secrets."
                />
              )}
            />
            <FormHelperText error>
              {helperText(errors.acceptedNoSecretsWarning?.message)}
            </FormHelperText>
            <Controller
              control={control}
              name="acceptedTerms"
              render={({ field }) => (
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={Boolean(field.value)}
                      onBlur={field.onBlur}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  )}
                  label="I confirm this information is accurate enough to begin project planning."
                />
              )}
            />
            <FormHelperText error>{helperText(errors.acceptedTerms?.message)}</FormHelperText>
          </FormGroup>
        </FormControl>

        {saveError ? <Alert severity="error">{saveError}</Alert> : null}
        {saveSuccess ? <Alert severity="success">Intake saved.</Alert> : null}

        <div className="contact-form-actions">
          <MuiButton
            className="contact-form-action contact-form-action-primary"
            disabled={submitting}
            type="submit"
            variant="contained"
          >
            {submitting ? 'Saving...' : 'Save Intake'}
          </MuiButton>
        </div>
      </section>
    </form>
  );
}
