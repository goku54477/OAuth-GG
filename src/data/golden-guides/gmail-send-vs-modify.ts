import type { ProviderGuide } from "@/types/contracts";

export const gmailSendVsModifyGuide: ProviderGuide = {
  slug: "gmail-send-vs-modify",
  providerName: "Google / Gmail",
  toolkitSlug: "gmail",
  title:
    "Gmail API: Send-Only Sensitive Scope vs Read/Modify Restricted Scope",
  subtitle:
    "Reference comparison of documented Gmail API scope classes and capabilities.",
  generatedAt: "2026-10-20T00:00:00.000Z",
  generationMode: "golden-verified",
  completenessStatus: "complete",
  composioIntegration: {
    managedOAuthAvailable: true,
    managedVsCustomVerdict:
      "Managed OAuth availability is reported by current Composio catalog metadata.",
    customAuthConfigSnippet: "",
    composioRedirectUriHint: "",
    epistemicStatus: "source-supported",
    citationIds: [],
  },
  variants: [
    {
      variantId: "gmail-send-only-sensitive",
      title: "Gmail Send-Only Integration via Sensitive Scope (Recommended)",
      summary:
        "Outbound email automation using the documented Sensitive gmail.send scope. Label-resource management is separate from applying labels to messages.",
      recommendedAppType: "Google Cloud OAuth 2.0 Web Application (Sensitive Tier)",
      scopes: [
        {
          scope: "https://www.googleapis.com/auth/gmail.send",
          displayName: "Send email on your behalf",
          classification: "sensitive",
          requiredForCapability: "Dispatch transactional emails, notifications, and customer messages via Gmail API",
          triggersExternalReview: true,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes"],
        },
        {
          scope: "https://www.googleapis.com/auth/gmail.labels",
          displayName: "Manage mailbox labels",
          classification: "non-sensitive",
          requiredForCapability: "Create, list, and update Gmail label resources; this scope does not apply labels to messages.",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          leastPrivilegeAlternative: "Omit if label management is not needed",
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes", "cite-google-labels"],
        },
      ],
      approvalGateSummary:
        "Verification requirements depend on the app's publishing and data-handling context; consult the cited Google documentation.",
      estimatedReviewTimeline: "Unknown",
      securityAuditRequired: "Unknown",
      pros: [
        "Supports sending mail without mailbox read/modify access.",
      ],
      cons: [
        "Cannot read incoming emails, search inbox threads, or inspect message delivery bouncebacks directly in inbox",
        "Does not authorize applying labels to messages; message-label changes require gmail.modify.",
      ],
    },
    {
      variantId: "gmail-read-modify-restricted",
      title: "Gmail Read/Modify Integration via Restricted Scopes (Comparison)",
      summary:
        "Mailbox synchronization and message changes use Restricted scopes such as gmail.readonly or gmail.modify.",
      recommendedAppType: "Google Cloud OAuth 2.0 Web Application (Restricted Tier)",
      scopes: [
        {
          scope: "https://www.googleapis.com/auth/gmail.readonly",
          displayName: "Read all email and settings",
          classification: "restricted",
          requiredForCapability: "Read all emails, message headers, and attachments in user inbox",
          triggersExternalReview: true,
          triggersSecurityAudit: true,
          leastPrivilegeAlternative: "https://www.googleapis.com/auth/gmail.send (if outbound sending only)",
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes"],
        },
        {
          scope: "https://www.googleapis.com/auth/gmail.modify",
          displayName: "Read, compose, and modify emails and labels",
          classification: "restricted",
          requiredForCapability: "Read, draft, modify, mark read/unread, and delete user emails; apply or remove labels on messages through messages.modify.",
          triggersExternalReview: true,
          triggersSecurityAudit: true,
          leastPrivilegeAlternative: "https://www.googleapis.com/auth/gmail.send",
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes", "cite-google-labels"],
        },
      ],
      approvalGateSummary:
        "Restricted scopes require restricted-scope OAuth verification; security-assessment requirements depend on whether restricted data is stored or transmitted.",
      estimatedReviewTimeline: "Unknown",
      securityAuditRequired: "Conditional; see cited Google scope documentation.",
      pros: [
        "Enables full bi-directional email client syncing, intelligent inbox triage, and draft modification",
      ],
      cons: [
        "Broader mailbox access than a send-only use case.",
      ],
    },
  ],
  registrationSteps: [
    {
      stepNumber: 1,
      title: "Create Project and Enable Gmail API",
      consolePath: "Google Cloud Console > APIs & Services > Library",
      instructions:
        "In Google Cloud Console, select or create your project, search for 'Gmail API' in the API Library, and click 'Enable'.",
      criticalConfigValues: [
        {
          label: "API Name",
          value: "Gmail API",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-google-gmail-scopes"],
    },
    {
      stepNumber: 2,
      title: "Select the minimum documented Gmail scope",
      consolePath: "https://developers.google.com/workspace/gmail/api/auth/scopes",
      instructions:
        "Choose the narrowest scope needed for the product capability. gmail.send is Sensitive; gmail.modify is Restricted.",
      criticalConfigValues: [
        {
          label: "Scope source",
          value: "Gmail API scope documentation",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-google-gmail-scopes"],
    },
    {
      stepNumber: 3,
      title: "Create credentials and verify the OAuth flow",
      consolePath: "Unknown",
      instructions:
        "Create and test an OAuth client using the applicable official Google guidance. This reference does not assert a callback URL or console sequence.",
      criticalConfigValues: [],
      epistemicStatus: "unknown",
      citationIds: [],
    },
    {
      stepNumber: 4,
      title: "Determine whether verification is required",
      consolePath: "https://developers.google.com/workspace/gmail/api/auth/scopes",
      instructions:
        "After a working OAuth flow exists, use the official documentation to determine the verification requirements for the chosen scopes and data handling.",
      criticalConfigValues: [],
      epistemicStatus: "source-supported",
      citationIds: ["cite-google-gmail-scopes"],
    },
  ],
  testingAndSandboxRules: [],
  distributionAndReviewChecklist: [],
  practicalObservations: [],
  explicitUnknowns: [
    "Provider-specific verification timelines, fees, and assessment details",
    "Callback configuration for this application",
  ],
  citations: [
    {
      id: "cite-google-gmail-scopes",
      sourceUrl: "https://developers.google.com/workspace/gmail/api/auth/scopes",
      sourceTitle: "Gmail API Scopes",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "https://www.googleapis.com/auth/gmail.send is classified as a Sensitive Scope for sending email on the user's behalf. Scopes like gmail.readonly and gmail.modify are Restricted Scopes.",
      epistemicStatus: "source-supported",
    },
    {
      id: "cite-google-labels",
      sourceUrl: "https://developers.google.com/workspace/gmail/api/guides/labels",
      sourceTitle: "Manage labels | Gmail API",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "To add or remove the labels applied to a message, use messages.modify.",
      epistemicStatus: "source-supported",
    },
  ],
};
