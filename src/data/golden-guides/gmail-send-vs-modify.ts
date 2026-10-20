import type { ProviderGuide } from "@/types/contracts";

export const gmailSendVsModifyGuide: ProviderGuide = {
  slug: "gmail-send-vs-modify",
  providerName: "Google / Gmail",
  toolkitSlug: "gmail",
  title:
    "Gmail API: Send-Only Sensitive Scope vs Read/Modify Restricted Scope & CASA Audit",
  subtitle:
    "Architectural comparison between lightweight gmail.send verification and high-friction CASA Tier 2 security assessment",
  generatedAt: "2026-10-20T00:00:00.000Z",
  generationMode: "golden-verified",
  completenessStatus: "complete",
  composioIntegration: {
    managedOAuthAvailable: true,
    managedVsCustomVerdict:
      "While Composio manages OAuth connections during early prototyping, all production deployments sending or managing customer emails must register a Google Cloud OAuth Client and configure custom auth_configs. Production Google verification requires your company's domain, privacy policy, and brand identity displayed on the Google consent screen.",
    customAuthConfigSnippet: JSON.stringify(
      {
        auth_mode: "OAUTH2",
        client_id: "{{GOOGLE_CLIENT_ID}}",
        client_secret: "{{GOOGLE_CLIENT_SECRET}}",
        authorization_url: "https://accounts.google.com/o/oauth2/v2/auth",
        token_url: "https://oauth2.googleapis.com/token",
        scope:
          "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.labels",
        redirect_uri: "https://backend.composio.dev/api/v1/auth-apps/addRepo/gmail",
      },
      null,
      2
    ),
    composioRedirectUriHint:
      "https://backend.composio.dev/api/v1/auth-apps/addRepo/gmail",
    epistemicStatus: "source-supported",
    citationIds: ["cite-composio-custom-vs-managed"],
  },
  variants: [
    {
      variantId: "gmail-send-only-sensitive",
      title: "Gmail Send-Only Integration via Sensitive Scope (Recommended)",
      summary:
        "Outbound email automation utilizing the Sensitive scope 'https://www.googleapis.com/auth/gmail.send' alongside optional Non-Sensitive 'gmail.labels'. Requires standard Google OAuth brand verification (~3–7 business days) and completely avoids the costly CASA Tier 2 security audit.",
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
          citationIds: ["cite-google-gmail-scopes", "cite-nylas-casa-guide"],
        },
        {
          scope: "https://www.googleapis.com/auth/gmail.labels",
          displayName: "Manage mailbox labels",
          classification: "non-sensitive",
          requiredForCapability: "Create and apply labels to categorize outbound automated messages",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          leastPrivilegeAlternative: "Omit if label management is not needed",
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes"],
        },
      ],
      approvalGateSummary:
        "Standard Google OAuth Brand Verification. Submit Privacy Policy, YouTube demo video illustrating the OAuth consent screen and app workflow, and verified Google Search Console domain ownership.",
      estimatedReviewTimeline: "3–7 business days",
      securityAuditRequired: "None (Sensitive scopes do not trigger third-party CASA audit)",
      pros: [
        "Drastically faster time-to-market: approved in ~3–7 business days vs 4–8+ weeks",
        "Zero assessment fees: avoids the $3,000–$10,000+ annual CASA Tier 2 security assessment cost",
        "Significantly lower compliance risk: cannot read user mailboxes, threads, or attachments",
        "Ideal for notification engines, CRM outreach, ticketing alert systems, and automated reports",
      ],
      cons: [
        "Cannot read incoming emails, search inbox threads, or inspect message delivery bouncebacks directly in inbox",
        "Still requires formal Google app verification with YouTube demo video before going to production",
      ],
    },
    {
      variantId: "gmail-read-modify-restricted",
      title: "Gmail Read/Modify Integration via Restricted Scopes (Comparison)",
      summary:
        "Full mailbox synchronization and management utilizing Restricted Scopes such as 'gmail.readonly', 'gmail.modify', or 'gmail.compose'. Demands high-friction Google Restricted Scope Verification PLUS mandatory annual CASA Tier AL1/AL2 external security assessments.",
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
          citationIds: ["cite-google-gmail-scopes", "cite-nylas-casa-guide"],
        },
        {
          scope: "https://www.googleapis.com/auth/gmail.modify",
          displayName: "Read, compose, and modify emails and labels",
          classification: "restricted",
          requiredForCapability: "Read, draft, modify, mark read/unread, and delete user emails",
          triggersExternalReview: true,
          triggersSecurityAudit: true,
          leastPrivilegeAlternative: "https://www.googleapis.com/auth/gmail.send",
          epistemicStatus: "source-supported",
          citationIds: ["cite-google-gmail-scopes", "cite-nylas-casa-guide"],
        },
      ],
      approvalGateSummary:
        "Google Restricted Scope Verification AND mandatory annual Cloud App Security Assessment (CASA Tier AL1/AL2 via authorized third-party lab from App Defense Alliance).",
      estimatedReviewTimeline: "4–8+ weeks",
      securityAuditRequired:
        "Mandatory CASA Tier AL1/AL2 third-party security assessment and annual revalidation (typically $3,000–$10,000+)",
      pros: [
        "Enables full bi-directional email client syncing, intelligent inbox triage, and draft modification",
      ],
      cons: [
        "Mandatory annual CASA Tier AL1/AL2 security audit by authorized assessor (e.g., Bishop Fox, NCC Group, Leviathan Security)",
        "Expensive recurring audit cost ($3,000–$10,000+ per year) and 4–8+ weeks approval lead time",
        "Extensive architectural scrutiny: penetration testing, external vulnerability scanning, and infrastructure proof of security",
        "Annual revalidation required; failures result in immediate revocation of OAuth client refresh tokens",
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
      title: "Configure OAuth Consent Screen",
      consolePath: "Google Cloud Console > APIs & Services > OAuth consent screen",
      instructions:
        "Select User Type 'External'. Provide your App Name, User Support Email, and Developer Contact Info. Add Authorized Domains matching your verified top-level domain.",
      criticalConfigValues: [
        {
          label: "User Type",
          value: "External",
        },
        {
          label: "Authorized Domain",
          value: "yourdomain.com",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
    },
    {
      stepNumber: 3,
      title: "Add Scopes and Submit Verification",
      consolePath: "Google Cloud Console > OAuth consent screen > Scopes",
      instructions:
        "Click 'Add or Remove Scopes'. Filter for 'Gmail API' and select 'https://www.googleapis.com/auth/gmail.send'. Notice it is classified as Sensitive. Save and proceed to submit verification with privacy policy URL and YouTube demo link.",
      criticalConfigValues: [
        {
          label: "Requested Scope",
          value: "https://www.googleapis.com/auth/gmail.send",
        },
        {
          label: "Scope Classification",
          value: "Sensitive (Requires standard verification, avoids CASA)",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-google-gmail-scopes", "cite-nylas-casa-guide"],
    },
    {
      stepNumber: 4,
      title: "Create OAuth 2.0 Web Client Credentials",
      consolePath: "Google Cloud Console > APIs & Services > Credentials",
      instructions:
        "Click 'Create Credentials' > 'OAuth client ID'. Select Application type 'Web application'. Add the Composio redirect URI to Authorized redirect URIs. Copy the Client ID and Client Secret.",
      criticalConfigValues: [
        {
          label: "Application type",
          value: "Web application",
        },
        {
          label: "Authorized redirect URIs",
          value: "https://backend.composio.dev/api/v1/auth-apps/addRepo/gmail",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-composio-custom-vs-managed"],
    },
  ],
  testingAndSandboxRules: [
    {
      claim:
        "Unverified Google OAuth apps in 'Testing' publishing status are strictly capped at 100 manually added test users.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
      notes: "Only explicit email addresses added to the Google Cloud Console Test Users list can authenticate; other accounts receive an 'Access blocked: app has not completed Google verification' error.",
    },
    {
      claim:
        "OAuth refresh tokens for apps in 'Testing' status expire after 7 days, necessitating weekly re-authentication until the app publishes to production.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
      notes: "Once verification is approved and status is Production, refresh tokens do not expire after 7 days.",
    },
  ],
  distributionAndReviewChecklist: [
    {
      claim:
        "Standard verification for Sensitive scopes requires a compliant 'Sign in with Google' button branding, a public privacy policy hosted on an authorized domain, and an unlisted YouTube video demonstrating the OAuth authorization flow.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
    },
    {
      claim:
        "Restricted scope verification requires a CASA Tier AL1 or AL2 validation assessment performed annually through an authorized App Defense Alliance lab if the app accesses, stores, or transmits Google user email data.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
    },
    {
      claim:
        "Domain ownership of all authorized redirect origins and privacy policy URLs must be verified in Google Search Console under the same developer organization account.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-nylas-casa-guide"],
    },
  ],
  practicalObservations: [
    {
      claim:
        "Restricting application scope to gmail.send rather than gmail.modify eliminates the largest operational blocker for early-stage SaaS teams by bypassing the 4–8 week CASA assessment delay.",
      epistemicStatus: "observed",
      citationIds: ["cite-nylas-casa-guide"],
      notes: "Teams can add read-level capabilities in subsequent enterprise tiers once compliance budgets exist.",
    },
  ],
  explicitUnknowns: [],
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
      id: "cite-nylas-casa-guide",
      sourceUrl:
        "https://developer.nylas.com/docs/provider-guides/google/google-verification-security-assessment-guide/",
      sourceTitle:
        "Google OAuth Verification and CASA Security Assessment Guide",
      authorityType: "secondary-technical",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "Sensitive scopes require Google OAuth brand verification (~3-7 business days) with privacy policy and demo video. Restricted scopes additionally trigger a mandatory annual Cloud App Security Assessment (CASA Tier AL1/AL2 via App Defense Alliance) taking 4-8+ weeks and requiring annual revalidation.",
      epistemicStatus: "source-supported",
    },
    {
      id: "cite-composio-custom-vs-managed",
      sourceUrl:
        "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app",
      sourceTitle: "Custom App vs Managed App Authentication",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "Managed OAuth2 exists for rapid prototyping, but production customer-facing applications require custom auth_configs for white-labeled consent screen branding and dedicated provider rate limits.",
      epistemicStatus: "source-supported",
    },
  ],
};
