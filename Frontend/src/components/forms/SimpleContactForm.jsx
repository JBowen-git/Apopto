import { useState } from 'react'
import { Button as MuiButton, MenuItem, Paper, TextField } from '@mui/material'
import { createApiClient, isApiClientError } from '../../api/client'
import { bestTimeOptions, preferredContactOptions, simpleContactInitialValues, simpleContactRequiredFields } from '../../data/contact.js'

const formId = 'simple-contact-form'
const contactApiClient = createApiClient()

const fieldLabels = {
  name: 'Name',
  email: 'Email',
  company: 'Company / Brand Name',
  phone: 'Phone Number',
  preferredContact: 'Preferred Contact Method',
  bestTime: 'Best Time to Reach You',
  message: 'Message',
}

function getFieldId(field) {
  return `${formId}-${field}`
}

function getTextFieldSlotProps(label, { required = false, select = false } = {}) {
  const slotProps = {
    input: {
      label: (
        <span
          aria-hidden="true"
          className="contact-notch-spacer"
          style={{ '--contact-notch-width': `${Math.max(label.length + (required ? 2 : 0), 4)}ch` }}
        />
      ),
      required: false,
    },
  }

  if (required) {
    slotProps.htmlInput = {
      'aria-required': 'true',
      required: true,
    }
  }

  if (required && select) {
    slotProps.select = {
      'aria-required': 'true',
    }
  }

  return slotProps
}

export default function SimpleContactForm() {
  const [contactValues, setContactValues] = useState(simpleContactInitialValues)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isSubmitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const updateContactValue = (field) => (event) => {
    setSubmitted(false)
    setSubmitError('')
    setContactValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }))
  }

  const getFieldError = (field) =>
    Boolean(hasAttemptedSubmit && simpleContactRequiredFields.includes(field) && !contactValues[field])

  const canSubmitContactForm = () =>
    simpleContactRequiredFields.every((field) => contactValues[field].trim())

  const submitContactForm = async (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)
    setSubmitError('')

    if (!canSubmitContactForm()) {
      return
    }

    setSubmitting(true)

    try {
      await contactApiClient.post('/api/contact', contactValues, { authenticated: false })
      setContactValues(simpleContactInitialValues)
      setHasAttemptedSubmit(false)
      setSubmitted(true)
    } catch (error) {
      setSubmitted(false)
      setSubmitError(
        isApiClientError(error)
          ? error.message
          : 'The message could not be sent. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-form-stage" id="contact-form">
      <Paper
        className="contact-form-paper contact-form-paper-simple"
        aria-describedby={`${formId}-description`}
        aria-labelledby={`${formId}-title`}
        component="form"
        elevation={0}
        onSubmit={submitContactForm}
      >
        <div className="contact-form-header">
          <h2 id={`${formId}-title`}>Start the conversation</h2>
          <p id={`${formId}-description`}>Tell me the basics and I will follow up with the right next step.</p>
        </div>

        <div className="contact-form-grid">
          <TextField
            error={getFieldError('name')}
            fullWidth
            helperText={getFieldError('name') ? 'Name is required.' : ' '}
            id={getFieldId('name')}
            label={fieldLabels.name}
            onChange={updateContactValue('name')}
            required
            slotProps={getTextFieldSlotProps(fieldLabels.name, { required: true })}
            value={contactValues.name}
          />
          <TextField
            error={getFieldError('email')}
            fullWidth
            helperText={getFieldError('email') ? 'Email is required.' : ' '}
            id={getFieldId('email')}
            label={fieldLabels.email}
            onChange={updateContactValue('email')}
            required
            slotProps={getTextFieldSlotProps(fieldLabels.email, { required: true })}
            type="email"
            value={contactValues.email}
          />
          <TextField
            error={getFieldError('company')}
            fullWidth
            helperText={getFieldError('company') ? 'Company or brand name is required.' : ' '}
            id={getFieldId('company')}
            label={fieldLabels.company}
            onChange={updateContactValue('company')}
            required
            slotProps={getTextFieldSlotProps(fieldLabels.company, { required: true })}
            value={contactValues.company}
          />
          <TextField
            fullWidth
            helperText=" "
            id={getFieldId('phone')}
            label={fieldLabels.phone}
            onChange={updateContactValue('phone')}
            slotProps={getTextFieldSlotProps(fieldLabels.phone)}
            type="tel"
            value={contactValues.phone}
          />
          <TextField
            error={getFieldError('preferredContact')}
            fullWidth
            helperText={
              getFieldError('preferredContact') ? 'Preferred contact method is required.' : ' '
            }
            id={getFieldId('preferredContact')}
            label={fieldLabels.preferredContact}
            onChange={updateContactValue('preferredContact')}
            required
            select
            slotProps={getTextFieldSlotProps(fieldLabels.preferredContact, { required: true, select: true })}
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
            id={getFieldId('bestTime')}
            label={fieldLabels.bestTime}
            onChange={updateContactValue('bestTime')}
            required
            select
            slotProps={getTextFieldSlotProps(fieldLabels.bestTime, { required: true, select: true })}
            value={contactValues.bestTime}
          >
            {bestTimeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            className="contact-field-wide"
            fullWidth
            helperText=" "
            id={getFieldId('message')}
            label={fieldLabels.message}
            minRows={5}
            multiline
            onChange={updateContactValue('message')}
            slotProps={getTextFieldSlotProps(fieldLabels.message)}
            value={contactValues.message}
          />
        </div>

        <div className="contact-form-actions">
          <MuiButton
            className="contact-form-action contact-form-action-primary"
            disabled={isSubmitting}
            type="submit"
            variant="contained"
          >
            {isSubmitting ? 'Sending...' : 'Submit'}
          </MuiButton>
        </div>

        {isSubmitted ? (
          <p className="contact-form-confirmation">
            Your message has been sent. I will follow up soon.
          </p>
        ) : null}

        {submitError ? (
          <p className="contact-form-confirmation contact-form-error">
            {submitError}
          </p>
        ) : null}
      </Paper>
    </div>
  )
}
