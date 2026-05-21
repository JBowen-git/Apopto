import type { IntakeFormData } from '@apopto/shared';

export const emptyIntakeFormData: IntakeFormData = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  phone: undefined,
  website: undefined,
  industry: '',
  businessDescription: '',
  projectType: 'business_website',
  goals: [],
  targetAudience: '',
  desiredFeatures: [],
  referenceSites: [],
  designPreferences: '',
  contentReadiness: 'partial',
  hasLogo: false,
  hasBrandGuide: false,
  needsCopywriting: false,
  currentHostingProvider: undefined,
  domainRegistrar: undefined,
  emailProvider: undefined,
  analyticsTools: undefined,
  integrationsNeeded: [],
  dataSensitivity: 'basic_contact_info',
  budgetRange: '',
  desiredTimeline: '',
  mustHaveFeatures: '',
  niceToHaveFeatures: undefined,
  maintenanceInterest: 'not_sure',
  additionalNotes: undefined,
  acceptedNoSecretsWarning: false as IntakeFormData['acceptedNoSecretsWarning'],
  acceptedTerms: false as IntakeFormData['acceptedTerms'],
};

export function intakeFormDefaults(
  intake: IntakeFormData | null | undefined,
  clientBusinessName?: string,
): IntakeFormData {
  return {
    ...emptyIntakeFormData,
    ...intake,
    businessName: intake?.businessName || clientBusinessName || '',
    goals: [...(intake?.goals ?? emptyIntakeFormData.goals)],
    desiredFeatures: [...(intake?.desiredFeatures ?? emptyIntakeFormData.desiredFeatures)],
    referenceSites: [...(intake?.referenceSites ?? emptyIntakeFormData.referenceSites)],
    integrationsNeeded: [...(intake?.integrationsNeeded ?? emptyIntakeFormData.integrationsNeeded)],
  };
}
