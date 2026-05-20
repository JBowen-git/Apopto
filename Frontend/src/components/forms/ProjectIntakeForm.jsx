import { useState } from 'react'
import { Button as MuiButton, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, MenuItem, Radio, RadioGroup, TextField } from '@mui/material'
import { bestTimeOptions, contactInitialValues, contactRequiredFieldsByStep, contactSteps, pageCountOptions, preferredContactOptions, projectGoalOptions, projectNeedOptions, projectReadinessOptions, projectWizardSteps } from '../../data/contact.js'

export default function ProjectIntakeForm({
  formId = 'project-contact-form',
  stageClassName = 'contact-form-stage',
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [contactValues, setContactValues] = useState(contactInitialValues)
  const [attemptedSteps, setAttemptedSteps] = useState({})
  const [isSubmitted, setSubmitted] = useState(false)
  const currentRequiredFields = contactRequiredFieldsByStep[activeStep] ?? []

  const updateContactValue = (field) => (event) => {
    setSubmitted(false)
    setContactValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }))
  }

  const toggleContactNeed = (need) => (event) => {
    setContactValues((currentValues) => {
      const nextNeeds = event.target.checked
        ? [...currentValues.needs, need]
        : currentValues.needs.filter((currentNeed) => currentNeed !== need)

      return {
        ...currentValues,
        needs: nextNeeds,
      }
    })
  }

  const getFieldError = (field) =>
    Boolean(attemptedSteps[activeStep] && currentRequiredFields.includes(field) && !contactValues[field])

  const canAdvanceContactStep = () =>
    currentRequiredFields.every((field) => contactValues[field].trim())

  const goToNextContactStep = () => {
    setAttemptedSteps((currentSteps) => ({
      ...currentSteps,
      [activeStep]: true,
    }))

    if (!canAdvanceContactStep()) {
      return
    }

    setActiveStep((currentStep) => Math.min(currentStep + 1, contactSteps.length - 1))
  }

  const goToPreviousContactStep = () => {
    setActiveStep((currentStep) => Math.max(currentStep - 1, 0))
  }

  const submitContactForm = (event) => {
    event.preventDefault()
    setAttemptedSteps((currentSteps) => ({
      ...currentSteps,
      [activeStep]: true,
    }))

    if (!canAdvanceContactStep()) {
      return
    }

    setSubmitted(true)
  }

  const activeWizardStep = projectWizardSteps[activeStep]
  const completedRequiredFields = currentRequiredFields.filter((field) => contactValues[field].trim())
    .length
  const stepCompletionPercent = currentRequiredFields.length
    ? Math.round((completedRequiredFields / currentRequiredFields.length) * 100)
    : 100
  const overallProgressPercent = Math.round(
    ((activeStep + stepCompletionPercent / 100) / projectWizardSteps.length) * 100,
  )

  const goToContactStep = (nextStep) => {
    if (nextStep <= activeStep) {
      setActiveStep(nextStep)
      return
    }

    if (nextStep === activeStep + 1) {
      goToNextContactStep()
    }
  }

  return (
        <div className={stageClassName}>
          <form className="start-project-wizard" id={formId} onSubmit={submitContactForm}>
            <aside className="start-project-sidebar" aria-label="Project intake steps">
              <div className="start-project-sidebar-heading">
                <span>Project wizard</span>
                <h1>Start a Project</h1>
                <p>
                  Move through the intake one page at a time, with the current section
                  kept front and center.
                </p>
              </div>

              <nav className="start-project-step-list">
                {projectWizardSteps.map((step, index) => {
                  const isActive = index === activeStep
                  const isComplete = index < activeStep
                  const canOpen = index <= activeStep + 1

                  return (
                    <button
                      className={`start-project-step-button${isActive ? ' active' : ''}${
                        isComplete ? ' complete' : ''
                      }`}
                      disabled={!canOpen}
                      key={step.label}
                      onClick={() => goToContactStep(index)}
                      type="button"
                    >
                      <span className="start-project-step-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{step.label}</strong>
                        <small>{step.summary}</small>
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="start-project-progress" aria-label="Project intake progress">
                <div>
                  <span>Progress</span>
                  <strong>{overallProgressPercent}%</strong>
                </div>
                <span className="start-project-progress-track">
                  <span style={{ width: `${overallProgressPercent}%` }} />
                </span>
              </div>
            </aside>

            <section className="start-project-workspace">
              <header className="start-project-workspace-header">
                <span>Step {activeStep + 1} of {projectWizardSteps.length}</span>
                <h2>{activeWizardStep.title}</h2>
                <p>{activeWizardStep.description}</p>
              </header>

            {activeStep === 0 ? (
              <div className="contact-form-grid start-project-field-grid">
                <TextField
                  error={getFieldError('name')}
                  fullWidth
                  helperText={getFieldError('name') ? 'Name is required.' : ' '}
                  label="Name"
                  onChange={updateContactValue('name')}
                  required
                  value={contactValues.name}
                />
                <TextField
                  error={getFieldError('email')}
                  fullWidth
                  helperText={getFieldError('email') ? 'Email is required.' : ' '}
                  label="Email"
                  onChange={updateContactValue('email')}
                  required
                  type="email"
                  value={contactValues.email}
                />
                <TextField
                  error={getFieldError('company')}
                  fullWidth
                  helperText={getFieldError('company') ? 'Company or brand name is required.' : ' '}
                  label="Company / Brand Name"
                  onChange={updateContactValue('company')}
                  required
                  value={contactValues.company}
                />
                <TextField
                  fullWidth
                  helperText=" "
                  label="Current Website URL"
                  onChange={updateContactValue('website')}
                  type="url"
                  value={contactValues.website}
                />
                <TextField
                  fullWidth
                  helperText=" "
                  label="Phone Number"
                  onChange={updateContactValue('phone')}
                  type="tel"
                  value={contactValues.phone}
                />
                <TextField
                  error={getFieldError('preferredContact')}
                  fullWidth
                  helperText={
                    getFieldError('preferredContact') ? 'Preferred contact method is required.' : ' '
                  }
                  label="Preferred Contact Method"
                  onChange={updateContactValue('preferredContact')}
                  required
                  select
                  value={contactValues.preferredContact}
                >
                  {preferredContactOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('bestTime')}
                  fullWidth
                  helperText={getFieldError('bestTime') ? 'Best time is required.' : ' '}
                  label="Best Time to Reach You"
                  onChange={updateContactValue('bestTime')}
                  required
                  select
                  value={contactValues.bestTime}
                >
                  {bestTimeOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="contact-form-grid start-project-field-grid">
                <TextField
                  error={getFieldError('businessDescription')}
                  fullWidth
                  helperText={
                    getFieldError('businessDescription') ? 'Business description is required.' : ' '
                  }
                  label="What does your business do?"
                  onChange={updateContactValue('businessDescription')}
                  required
                  value={contactValues.businessDescription}
                />
                <TextField
                  error={getFieldError('customers')}
                  fullWidth
                  helperText={getFieldError('customers') ? 'Customer description is required.' : ' '}
                  label="Who are your customers?"
                  onChange={updateContactValue('customers')}
                  required
                  value={contactValues.customers}
                />
                <TextField
                  error={getFieldError('region')}
                  fullWidth
                  helperText={getFieldError('region') ? 'City or region is required.' : ' '}
                  label="What City / Region do you serve?"
                  onChange={updateContactValue('region')}
                  required
                  value={contactValues.region}
                />
                <FormControl
                  className="contact-choice-group contact-choice-group-wide"
                  component="fieldset"
                  error={getFieldError('projectGoal')}
                  required
                >
                  <FormLabel component="legend">What is the main goal of this project?</FormLabel>
                  <RadioGroup
                    className="contact-option-grid"
                    onChange={updateContactValue('projectGoal')}
                    value={contactValues.projectGoal}
                  >
                    {projectGoalOptions.map((option) => (
                      <FormControlLabel
                        control={<Radio />}
                        key={option}
                        label={option}
                        value={option}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
                <TextField
                  className="contact-field-wide"
                  error={getFieldError('problem')}
                  fullWidth
                  helperText={getFieldError('problem') ? 'Project problem is required.' : ' '}
                  label="What problem are you trying to solve?"
                  minRows={6}
                  multiline
                  onChange={updateContactValue('problem')}
                  required
                  value={contactValues.problem}
                />
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="contact-form-grid start-project-field-grid">
                <TextField
                  error={getFieldError('branding')}
                  fullWidth
                  helperText={getFieldError('branding') ? 'Branding status is required.' : ' '}
                  label="Do you already have branding?"
                  onChange={updateContactValue('branding')}
                  required
                  select
                  value={contactValues.branding}
                >
                  {projectReadinessOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('content')}
                  fullWidth
                  helperText={getFieldError('content') ? 'Content status is required.' : ' '}
                  label="Do you have written content?"
                  onChange={updateContactValue('content')}
                  required
                  select
                  value={contactValues.content}
                >
                  {projectReadinessOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('pageCount')}
                  fullWidth
                  helperText={getFieldError('pageCount') ? 'Page count is required.' : ' '}
                  label="About how many pages do you need?"
                  onChange={updateContactValue('pageCount')}
                  required
                  select
                  value={contactValues.pageCount}
                >
                  {pageCountOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControl className="contact-choice-group contact-choice-group-wide" component="fieldset">
                  <FormLabel component="legend">Do you need:</FormLabel>
                  <FormGroup className="contact-option-grid">
                    {projectNeedOptions.map((option) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={contactValues.needs.includes(option)}
                            onChange={toggleContactNeed(option)}
                          />
                        }
                        key={option}
                        label={option}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
                <TextField
                  className="contact-field-wide"
                  fullWidth
                  helperText=" "
                  label="Are there websites you like?"
                  onChange={updateContactValue('inspirationSites')}
                  type="url"
                  value={contactValues.inspirationSites}
                />
              </div>
            ) : null}

            <div className="contact-form-actions">
              <MuiButton
                className="contact-form-action"
                disabled={activeStep === 0}
                onClick={goToPreviousContactStep}
                type="button"
                variant="outlined"
              >
                Back
              </MuiButton>
              {activeStep < contactSteps.length - 1 ? (
                <MuiButton
                  className="contact-form-action contact-form-action-primary"
                  onClick={goToNextContactStep}
                  type="button"
                  variant="contained"
                >
                  Next
                </MuiButton>
              ) : (
                <MuiButton
                  className="contact-form-action contact-form-action-primary"
                  type="submit"
                  variant="contained"
                >
                  Submit
                </MuiButton>
              )}
            </div>

            {isSubmitted ? (
              <p className="contact-form-confirmation">
                Your project intake is ready for review.
              </p>
            ) : null}
            </section>
          </form>
        </div>
  )
}
