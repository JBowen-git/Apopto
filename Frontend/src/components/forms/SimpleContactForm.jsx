import { useState } from 'react'
import { Button as MuiButton, MenuItem, Paper, TextField } from '@mui/material'
import { bestTimeOptions, preferredContactOptions, simpleContactInitialValues, simpleContactRequiredFields } from '../../data/contact.js'

export default function SimpleContactForm() {
  const [contactValues, setContactValues] = useState(simpleContactInitialValues)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitted, setSubmitted] = useState(false)

  const updateContactValue = (field) => (event) => {
    setSubmitted(false)
    setContactValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }))
  }

  const getFieldError = (field) =>
    Boolean(hasAttemptedSubmit && simpleContactRequiredFields.includes(field) && !contactValues[field])

  const canSubmitContactForm = () =>
    simpleContactRequiredFields.every((field) => contactValues[field].trim())

  const submitContactForm = (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)

    if (!canSubmitContactForm()) {
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="contact-form-stage" id="contact-form">
      <Paper
        className="contact-form-paper contact-form-paper-simple"
        component="form"
        elevation={0}
        onSubmit={submitContactForm}
      >
        <div className="contact-form-header">
          <h2>Start the conversation</h2>
          <p>Tell me the basics and I will follow up with the right next step.</p>
        </div>

        <div className="contact-form-grid">
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
          <TextField
            className="contact-field-wide"
            fullWidth
            helperText=" "
            label="Message"
            minRows={5}
            multiline
            onChange={updateContactValue('message')}
            value={contactValues.message}
          />
        </div>

        <div className="contact-form-actions">
          <MuiButton
            className="contact-form-action contact-form-action-primary"
            type="submit"
            variant="contained"
          >
            Submit
          </MuiButton>
        </div>

        {isSubmitted ? (
          <p className="contact-form-confirmation">
            Your contact details are ready for review.
          </p>
        ) : null}
      </Paper>
    </div>
  )
}
