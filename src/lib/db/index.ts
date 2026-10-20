import { createClient, type Client } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { ProviderGuideSchema, type ProviderGuide } from "@/types/contracts";
import { normalizeGuideForEvidence } from "@/lib/guides/evidence-validator";

export const GMAIL_GUIDE_SEED: ProviderGuide = {
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

export const GITHUB_GUIDE_SEED: ProviderGuide = {
  slug: "github-public-issues",
  providerName: "GitHub",
  toolkitSlug: "github",
  title: "GitHub Public Issues: GitHub App vs OAuth App",
  subtitle:
    "Least-privilege integration guide for reading and writing public issues without granting full repository code access",
  generatedAt: "2026-10-20T00:00:00.000Z",
  generationMode: "golden-verified",
  completenessStatus: "complete",
  composioIntegration: {
    managedOAuthAvailable: true,
    managedVsCustomVerdict:
      "Composio provides managed OAuth2 for rapid prototyping and local evaluation, but production customer applications require custom auth_configs. Custom GitHub Apps provide dedicated organization rate limits, custom consent-screen branding with your organization's logo, and granular least-privilege repository permissions.",
    customAuthConfigSnippet: JSON.stringify(
      {
        auth_mode: "OAUTH2",
        client_id: "{{GITHUB_APP_CLIENT_ID}}",
        client_secret: "{{GITHUB_APP_CLIENT_SECRET}}",
        authorization_url: "https://github.com/login/oauth/authorize",
        token_url: "https://github.com/login/oauth/access_token",
        redirect_uri: "https://backend.composio.dev/api/v1/auth-apps/addRepo/github",
      },
      null,
      2
    ),
    composioRedirectUriHint:
      "https://backend.composio.dev/api/v1/auth-apps/addRepo/github",
    epistemicStatus: "source-supported",
    citationIds: ["cite-composio-custom-vs-managed"],
  },
  variants: [
    {
      variantId: "github-app-issues",
      title: "GitHub App with Fine-Grained Permissions (Recommended)",
      summary:
        "GitHub App requesting repository permission 'Issues: Read & write' and automatic 'Metadata: Read-only'. Enforces least privilege by granting access strictly to issue data without exposing repository source code.",
      recommendedAppType: "GitHub App",
      scopes: [
        {
          scope: "issues:write",
          displayName: "Issues: Read & write",
          classification: "granular-bot",
          requiredForCapability: "Create, view, and comment on public repository issues",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          leastPrivilegeAlternative: "issues:read (if issue creation or modification is not needed)",
          epistemicStatus: "source-supported",
          citationIds: ["cite-github-app-diff"],
        },
        {
          scope: "metadata:read",
          displayName: "Metadata: Read-only",
          classification: "non-sensitive",
          requiredForCapability: "Mandatory base permission assigned automatically to all GitHub Apps to view repository metadata",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-github-app-diff"],
        },
      ],
      approvalGateSummary:
        "No GitHub centralized app store review is required for private or unlisted public distribution. Organization admins or repository owners grant installation consent directly upon installation.",
      estimatedReviewTimeline: "Instant self-serve approval upon organization owner consent",
      securityAuditRequired: "None (Internal organization admin approval only)",
      pros: [
        "Does NOT grant repository source code access, protecting sensitive IP",
        "Uses 1-hour expiring user-to-server or installation tokens, limiting credential exposure",
        "Higher rate limits scaling with organization size (up to 12,500 requests per hour)",
        "Remains installed and functional even if the individual developer who created the app leaves the organization",
        "Fine-grained repository selection allows installation on specific select repositories only",
      ],
      cons: [
        "Requires creating and configuring a GitHub App manifest or navigating GitHub Developer Settings",
        "Requires webhooks and private key handling if using direct installation token flow without Composio proxying",
      ],
    },
    {
      variantId: "github-oauth-public-repo",
      title: "GitHub OAuth App with public_repo Scope (Comparison)",
      summary:
        "Legacy OAuth App requesting the broad 'public_repo' scope. Warn: grants wide, coarse read/write access across all public repositories the user can access, including source code, commits, webhooks, and projects.",
      recommendedAppType: "GitHub OAuth App",
      scopes: [
        {
          scope: "public_repo",
          displayName: "Public Repositories (Full Control)",
          classification: "coarse-repo",
          requiredForCapability: "Read and write issues in public repositories",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          leastPrivilegeAlternative: "GitHub App with 'Issues: Read & write' fine-grained repository permission",
          epistemicStatus: "source-supported",
          citationIds: ["cite-github-oauth-scopes"],
        },
      ],
      approvalGateSummary:
        "Instant user authorization consent prompt. No GitHub review needed.",
      estimatedReviewTimeline: "Instant",
      securityAuditRequired: "None",
      pros: [
        "Simpler initial OAuth 2.0 flow with standard authorization code exchange",
        "Supported by legacy tooling and basic OAuth client libraries",
      ],
      cons: [
        "WARNING: The public_repo scope is coarse and grants read/write access to code, commit statuses, webhooks, and projects across all public repositories the user can access",
        "Tokens do not expire by default unless explicitly configured with expiring tokens beta",
        "Rate limits are strictly tied to the individual user (5,000 requests per hour) rather than scaling with organization size",
        "Fails modern enterprise least-privilege compliance audits and SOC 2 / ISO 27001 third-party access reviews",
      ],
    },
  ],
  registrationSteps: [
    {
      stepNumber: 1,
      title: "Open GitHub Developer Settings",
      consolePath: "GitHub > Settings > Developer settings > GitHub Apps",
      instructions:
        "Navigate to your personal or organization Settings page on GitHub, click 'Developer settings' at the bottom of the left sidebar, and select 'GitHub Apps'. Click 'New GitHub App'.",
      criticalConfigValues: [
        {
          label: "GitHub App Name",
          value: "Your Org Issue Manager (must be globally unique)",
        },
        {
          label: "Homepage URL",
          value: "https://yourdomain.com",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
    },
    {
      stepNumber: 2,
      title: "Configure Callback URL and Webhooks",
      consolePath: "GitHub Apps > New GitHub App > Identifying and registering",
      instructions:
        "Set the Callback URL to the Composio redirect URI or your application's OAuth callback handler. Set Webhook Active to Active or Inactive depending on whether you consume live issue events.",
      criticalConfigValues: [
        {
          label: "Callback URL",
          value: "https://backend.composio.dev/api/v1/auth-apps/addRepo/github",
        },
        {
          label: "Request user authorization (OAuth) during installation",
          value: "Checked",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-composio-custom-vs-managed"],
    },
    {
      stepNumber: 3,
      title: "Grant Fine-Grained Issue Permissions",
      consolePath: "GitHub Apps > [Your App] > Permissions & events > Repository permissions",
      instructions:
        "Under 'Repository permissions', locate 'Issues' and select 'Access: Read and write'. Note that 'Metadata: Read-only' is automatically enabled and required for all GitHub Apps. Ensure 'Contents' (repository code) remains set to 'No access'.",
      criticalConfigValues: [
        {
          label: "Issues",
          value: "Read and write",
        },
        {
          label: "Repository metadata",
          value: "Read-only (System mandatory)",
        },
        {
          label: "Repository contents (code)",
          value: "No access",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
    },
    {
      stepNumber: 4,
      title: "Generate Client Secrets and Install App",
      consolePath: "GitHub Apps > [Your App] > General",
      instructions:
        "Generate a Client Secret and copy the Client ID and Client Secret into your Composio custom auth config or your backend environment variables. In 'Install App', install it on your target repository or entire organization.",
      criticalConfigValues: [
        {
          label: "Client ID",
          value: "Recorded from GitHub App General Settings",
        },
        {
          label: "Client Secret",
          value: "Generated under General > Client secrets",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-composio-custom-vs-managed"],
    },
  ],
  testingAndSandboxRules: [
    {
      claim:
        "GitHub Apps can be installed on private test repositories or staging organizations immediately without any verification or marketplace listing.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
      notes: "App can be set to 'Only on this account' during development to restrict access.",
    },
    {
      claim:
        "User-to-server tokens expire in 8 hours when token expiration is active, and server-to-server installation access tokens expire in 1 hour.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
      notes: "Mitigates blast radius in case of token leakage.",
    },
  ],
  distributionAndReviewChecklist: [
    {
      claim:
        "GitHub App Public Distribution can be enabled under Advanced settings to allow any GitHub user or organization to install the app without marketplace listing.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
    },
    {
      claim:
        "Listing on the GitHub Marketplace requires formal GitHub review, security verification, minimum active installations, and organization verification.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
    },
  ],
  practicalObservations: [
    {
      claim:
        "Requesting 'public_repo' scope in OAuth Apps triggers user hesitation because the GitHub authorization prompt explicitly states the application can access and modify code.",
      epistemicStatus: "observed",
      citationIds: ["cite-github-oauth-scopes"],
      notes: "GitHub Apps show explicit granular issue permissions, drastically boosting enterprise conversion.",
    },
    {
      claim:
        "GitHub Apps do not lose access when an employee who created the token or OAuth app leaves the organization, because permissions are attached to the app installation.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-github-app-diff"],
    },
  ],
  explicitUnknowns: [],
  citations: [
    {
      id: "cite-github-app-diff",
      sourceUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
      sourceTitle: "Differences between GitHub Apps and OAuth Apps",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "GitHub Apps are the recommended way to integrate with GitHub because they offer much more granular permissions than OAuth apps... GitHub Apps use fine-grained permissions that let you specify only the permissions your app needs. For example, you can request read and write access to issues without requesting access to repository code.",
      epistemicStatus: "source-supported",
    },
    {
      id: "cite-github-oauth-scopes",
      sourceUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      sourceTitle: "Scopes for OAuth Apps",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "public_repo grants read/write access to code, commit statuses, repository projects, collaborators, and deployment statuses for public repositories and organizations.",
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

export const SLACK_GUIDE_SEED: ProviderGuide = {
  slug: "slack-channel-bot",
  providerName: "Slack",
  toolkitSlug: "slack",
  title: "Slack Channel Bot: Granular Bot Scopes vs Marketplace Listed App",
  subtitle:
    "Deploying multi-workspace Slack bot applications with least-privilege channels:history and chat:write scopes",
  generatedAt: "2026-10-20T00:00:00.000Z",
  generationMode: "golden-verified",
  completenessStatus: "complete",
  composioIntegration: {
    managedOAuthAvailable: true,
    managedVsCustomVerdict:
      "Composio provides instant managed OAuth2 connections for Slack development and internal bot automation. For production customer-facing SaaS distributions, teams configure custom auth_configs with their Slack Client ID and Client Secret to display their own branding on the Slack consent screen and retain granular control over bot token scopes.",
    customAuthConfigSnippet: JSON.stringify(
      {
        auth_mode: "OAUTH2",
        client_id: "{{SLACK_CLIENT_ID}}",
        client_secret: "{{SLACK_CLIENT_SECRET}}",
        authorization_url: "https://slack.com/oauth/v2/authorize",
        token_url: "https://slack.com/api/oauth.v2.access",
        scope: "channels:history,chat:write,groups:history",
        redirect_uri: "https://backend.composio.dev/api/v1/auth-apps/addRepo/slack",
      },
      null,
      2
    ),
    composioRedirectUriHint:
      "https://backend.composio.dev/api/v1/auth-apps/addRepo/slack",
    epistemicStatus: "source-supported",
    citationIds: ["cite-composio-custom-vs-managed"],
  },
  variants: [
    {
      variantId: "slack-granular-bot-unlisted",
      title: "Granular Bot App with Unlisted Multi-Workspace Distribution (Recommended)",
      summary:
        "Slack Bot App using modern Slack OAuth v2 with granular bot token scopes: channels:history (read messages in public channels where added), chat:write (send bot responses), and optional groups:history (for private channels). Distributed to external workspaces via direct installation link without App Directory review.",
      recommendedAppType: "Slack Bot App (Unlisted Public Distribution)",
      scopes: [
        {
          scope: "channels:history",
          displayName: "View public channel messages (where bot added)",
          classification: "granular-bot",
          requiredForCapability: "Read messages and conversation context from public channels the bot has been invited to",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-slack-scopes"],
        },
        {
          scope: "chat:write",
          displayName: "Send messages as the bot",
          classification: "granular-bot",
          requiredForCapability: "Post responses, notifications, and interactive message blocks as the bot user",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-slack-scopes"],
        },
        {
          scope: "groups:history",
          displayName: "View private channel messages (where bot added)",
          classification: "granular-bot",
          requiredForCapability: "Read conversation context in private channels that members explicitly invite the bot into",
          triggersExternalReview: false,
          triggersSecurityAudit: false,
          leastPrivilegeAlternative: "Omit if private channel support is not required by your customer workflows",
          epistemicStatus: "source-supported",
          citationIds: ["cite-slack-scopes"],
        },
      ],
      approvalGateSummary:
        "Direct installation authorization by individual workspace administrators via Slack OAuth v2. No centralized Slack review team approval required.",
      estimatedReviewTimeline: "Instant upon customer workspace admin approval",
      securityAuditRequired: "None (Standard OAuth v2 authorization)",
      pros: [
        "Enforces least privilege: bot only reads messages in channels where users explicitly invite it (/invite @bot)",
        "Zero delay: distribute immediately to external clients and beta testers via direct OAuth shareable URL",
        "Uses bot token permissions (xoxb-) isolating bot actions from user personal identities",
        "Requires standard HTTPS Redirect URL and state parameter verification to prevent CSRF attacks",
      ],
      cons: [
        "Does not appear in the public Slack App Directory search index",
        "Must provide direct installation link or 'Add to Slack' button on your own website/docs",
      ],
    },
    {
      variantId: "slack-marketplace-listed",
      title: "Slack App Directory Marketplace Listed App (Comparison)",
      summary:
        "Publicly listed application in Slack's App Directory. Requires comprehensive Slack review, detailed scope justifications, published privacy/support pages, and mandatory event handling for security lifecycles.",
      recommendedAppType: "Slack App Directory Listed App",
      scopes: [
        {
          scope: "channels:history",
          displayName: "View messages in public channels",
          classification: "granular-bot",
          requiredForCapability: "Read messages in public channels where bot is added",
          triggersExternalReview: true,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-slack-scopes", "cite-slack-distribution"],
        },
        {
          scope: "chat:write",
          displayName: "Send messages as bot",
          classification: "granular-bot",
          requiredForCapability: "Send bot responses and interactive card components",
          triggersExternalReview: true,
          triggersSecurityAudit: false,
          epistemicStatus: "source-supported",
          citationIds: ["cite-slack-scopes", "cite-slack-distribution"],
        },
      ],
      approvalGateSummary:
        "Formal Slack Directory Review requiring scope justification, security compliance, brand verification, and functional QA test credentials.",
      estimatedReviewTimeline: "2–4 weeks review turnaround",
      securityAuditRequired: "Slack App Review QA inspection and event webhook compliance verification",
      pros: [
        "Organic discovery and installation directly within Slack's App Directory search",
        "Provides verified badge and customer trust for high-volume enterprise distribution",
      ],
      cons: [
        "Lengthy review turnaround and scope justification required for each permission",
        "Strict mandatory requirement to implement and handle tokens_revoked and app_uninstalled events",
        "Must host public privacy policy, terms of service, and direct support contact URLs",
      ],
    },
  ],
  registrationSteps: [
    {
      stepNumber: 1,
      title: "Create Slack App in API Console",
      consolePath: "https://api.slack.com/apps > Create New App > From scratch",
      instructions:
        "Visit api.slack.com/apps, select 'Create New App', choose 'From scratch', specify your App Name, and pick a development workspace where you have admin permissions.",
      criticalConfigValues: [
        {
          label: "App Name",
          value: "SupportBot (or your branded bot name)",
        },
        {
          label: "Development Workspace",
          value: "Select your development Slack workspace",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
    },
    {
      stepNumber: 2,
      title: "Configure Granular Bot Token Scopes",
      consolePath: "Slack App Console > Features > OAuth & Permissions > Scopes",
      instructions:
        "Under 'OAuth & Permissions', scroll down to 'Bot Token Scopes'. Add 'channels:history', 'chat:write', and optionally 'groups:history'. Do not request User Token Scopes unless acting as the individual user.",
      criticalConfigValues: [
        {
          label: "Bot Token Scopes",
          value: "channels:history, chat:write, groups:history",
        },
        {
          label: "User Token Scopes",
          value: "None (enforce least privilege)",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-scopes"],
    },
    {
      stepNumber: 3,
      title: "Set HTTPS Redirect URLs",
      consolePath: "Slack App Console > Features > OAuth & Permissions > Redirect URLs",
      instructions:
        "Add your secure HTTPS callback URL. If using Composio, add the Composio OAuth callback URL. Slack strictly enforces HTTPS protocol for all production redirects.",
      criticalConfigValues: [
        {
          label: "Redirect URL",
          value: "https://backend.composio.dev/api/v1/auth-apps/addRepo/slack",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution", "cite-composio-custom-vs-managed"],
    },
    {
      stepNumber: 4,
      title: "Enable Multi-Workspace Public Distribution",
      consolePath: "Slack App Console > Settings > Manage Distribution",
      instructions:
        "Navigate to 'Settings' > 'Manage Distribution'. Review the distribution checklist, confirm your Redirect URL is HTTPS, and toggle 'Public Distribution' to On. Copy the Sharable URL to distribute the bot across external customer workspaces.",
      criticalConfigValues: [
        {
          label: "Public Distribution",
          value: "Enabled (Allows multi-workspace installation)",
        },
        {
          label: "State Parameter",
          value: "Required for CSRF mitigation in OAuth v2 flow",
        },
      ],
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
    },
  ],
  testingAndSandboxRules: [
    {
      claim:
        "Bots can be installed into the developer's initial development workspace instantly during configuration without enabling public distribution.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
      notes: "Allows rapid local testing of message formatting and event handlers.",
    },
    {
      claim:
        "Slack OAuth v2 uses https://slack.com/oauth/v2/authorize and exchange endpoint https://slack.com/api/oauth.v2.access, returning bot access tokens (xoxb-) with requested bot scopes.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution", "cite-slack-scopes"],
    },
  ],
  distributionAndReviewChecklist: [
    {
      claim:
        "Enabling Public Distribution under Settings > Manage Distribution allows any Slack workspace admin to install your bot via OAuth v2 without Slack App Directory listing or review.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
    },
    {
      claim:
        "Submitting to the Slack App Directory requires handling tokens_revoked and app_uninstalled events via the Events API to guarantee tenant data privacy.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
    },
    {
      claim:
        "Slack OAuth v2 implementations must validate the cryptographically random state parameter to prevent cross-site request forgery during installation.",
      epistemicStatus: "source-supported",
      citationIds: ["cite-slack-distribution"],
    },
  ],
  practicalObservations: [
    {
      claim:
        "The channels:history scope only exposes messages in channels where the bot has been explicitly invited (/invite @bot), eliminating unexpected exposure to private or irrelevant company chatter.",
      epistemicStatus: "observed",
      citationIds: ["cite-slack-scopes"],
      notes: "Enterprise Slack admins prefer this model over legacy bot tokens that demanded blanket channel access.",
    },
  ],
  explicitUnknowns: [],
  citations: [
    {
      id: "cite-slack-distribution",
      sourceUrl:
        "https://docs.slack.dev/tools/java-slack-sdk/guides/app-distribution",
      sourceTitle: "Distributing Slack apps",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "To distribute your app outside your development workspace without submitting to the App Directory, enable Public Distribution under Settings > Manage Distribution. Slack OAuth v2 requires an HTTPS redirect URL and state parameter verification.",
      epistemicStatus: "source-supported",
    },
    {
      id: "cite-slack-scopes",
      sourceUrl:
        "https://developer.salesforce.com/docs/platform/salesforce-slack-sdk/guide/scopes.html",
      sourceTitle: "Slack Bot Token Scopes",
      authorityType: "official-provider-docs",
      retrievedAt: "2026-10-20T00:00:00.000Z",
      verbatimQuote:
        "channels:history grants permission to view messages and other content in public channels that the bot has been added to. chat:write allows the app to send messages as itself.",
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

export const GOLDEN_GUIDES_SEED: Record<string, ProviderGuide> = {
  [GMAIL_GUIDE_SEED.slug]: GMAIL_GUIDE_SEED,
  [GITHUB_GUIDE_SEED.slug]: GITHUB_GUIDE_SEED,
  [SLACK_GUIDE_SEED.slug]: SLACK_GUIDE_SEED,
};

// Aliases for toolkit names
GOLDEN_GUIDES_SEED["gmail"] = GMAIL_GUIDE_SEED;
GOLDEN_GUIDES_SEED["github"] = GITHUB_GUIDE_SEED;
GOLDEN_GUIDES_SEED["slack"] = SLACK_GUIDE_SEED;

// Database Connection & In-Memory / File Fallback Store
const inMemoryGuides = new Map<string, ProviderGuide>();

let dbClient: Client | null = null;
let dbInitialized = false;
let dbInitializationFailed = false;

function getFallbackFilePath(): string {
  return process.env.GUIDES_FALLBACK_FILE
    ? path.resolve(process.env.GUIDES_FALLBACK_FILE)
    : path.resolve(process.cwd(), "data", "guides-fallback.json");
}

function ensureDataDir(): void {
  const dataDir = path.dirname(getFallbackFilePath());
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Ignore if filesystem is read-only
    }
  }
}

function loadFallbackFile(): Record<string, ProviderGuide> {
  try {
    ensureDataDir();
    const filePath = getFallbackFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Fallback to in-memory map on read failure
  }
  return {};
}

function saveFallbackFile(guides: Record<string, ProviderGuide>): void {
  try {
    ensureDataDir();
    const filePath = getFallbackFilePath();
    fs.writeFileSync(filePath, JSON.stringify(guides, null, 2), "utf-8");
  } catch {
    // Filesystem error; in-memory map still holds the state
  }
}

async function getClient(): Promise<Client | null> {
  if (dbInitializationFailed) return null;
  if (dbClient) return dbClient;

  try {
    ensureDataDir();
    const url = process.env.TURSO_DATABASE_URL || "file:./data/guides.db";
    const client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    if (!dbInitialized) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS guides (
          slug TEXT PRIMARY KEY,
          provider_name TEXT NOT NULL,
          title TEXT NOT NULL,
          generation_mode TEXT NOT NULL,
          completeness_status TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          guide_json TEXT NOT NULL
        );
      `);

      // Seed golden guides into SQLite if not present
      for (const guide of [GMAIL_GUIDE_SEED, GITHUB_GUIDE_SEED, SLACK_GUIDE_SEED]) {
        await client.execute({
          sql: `
            INSERT OR IGNORE INTO guides (
              slug, provider_name, title, generation_mode, completeness_status, generated_at, guide_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?);
          `,
          args: [
            guide.slug,
            guide.providerName,
            guide.title,
            guide.generationMode,
            guide.completenessStatus,
            guide.generatedAt,
            JSON.stringify(guide),
          ],
        });
      }
      dbInitialized = true;
    }

    dbClient = client;
    return dbClient;
  } catch {
    dbInitializationFailed = true;
    return null;
  }
}

/**
 * Saves or updates a ProviderGuide in the database, with automatic fallback.
 */
export async function saveGuide(guide: ProviderGuide): Promise<ProviderGuide> {
  if (!guide || !guide.slug) {
    throw new Error("Invalid guide object or missing slug");
  }

  const safeGuide = normalizeGuideForEvidence(ProviderGuideSchema.parse(guide));

  const client = await getClient();
  if (client) {
    try {
      await client.execute({
        sql: `
          INSERT INTO guides (
            slug, provider_name, title, generation_mode, completeness_status, generated_at, guide_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            provider_name = excluded.provider_name,
            title = excluded.title,
            generation_mode = excluded.generation_mode,
            completeness_status = excluded.completeness_status,
            generated_at = excluded.generated_at,
            guide_json = excluded.guide_json;
        `,
        args: [
            safeGuide.slug,
            safeGuide.providerName,
            safeGuide.title,
            safeGuide.generationMode,
            safeGuide.completenessStatus,
            safeGuide.generatedAt,
            JSON.stringify(safeGuide),
        ],
      });
    } catch {
      throw new Error("Failed to persist guide");
    }
  }

  inMemoryGuides.set(safeGuide.slug, safeGuide);
  if (safeGuide.toolkitSlug) {
    inMemoryGuides.set(safeGuide.toolkitSlug.toLowerCase(), safeGuide);
  }

  const fallbackRecords = loadFallbackFile();
  fallbackRecords[safeGuide.slug] = safeGuide;
  saveFallbackFile(fallbackRecords);

  return safeGuide;
}

/**
 * Retrieves a ProviderGuide by its slug (or toolkit slug alias).
 */
export async function getGuideBySlug(slug: string): Promise<ProviderGuide | null> {
  if (!slug) return null;
  const normalizedSlug = slug.trim().toLowerCase();

  // 1. Try LibSQL
  try {
    const client = await getClient();
    if (client) {
      const res = await client.execute({
        sql: "SELECT guide_json FROM guides WHERE slug = ? LIMIT 1;",
        args: [normalizedSlug],
      });
      if (res.rows.length > 0 && res.rows[0].guide_json) {
        return ProviderGuideSchema.parse(JSON.parse(res.rows[0].guide_json as string));
      }
    }
  } catch {
    // Fall back to local store
  }

  // 2. Try JSON fallback file
  const fallbackRecords = loadFallbackFile();
  if (fallbackRecords[normalizedSlug]) {
    return ProviderGuideSchema.parse(fallbackRecords[normalizedSlug]);
  }

  // 3. Try In-Memory Map
  if (inMemoryGuides.has(normalizedSlug)) {
    return ProviderGuideSchema.parse(inMemoryGuides.get(normalizedSlug)!);
  }

  return null;
}

/**
 * Lists metadata summaries for all saved guides.
 */
export async function listSavedGuides(): Promise<
  Array<
    Pick<
      ProviderGuide,
      | "slug"
      | "providerName"
      | "title"
      | "generationMode"
      | "completenessStatus"
      | "generatedAt"
    >
  >
> {
  // 1. Try LibSQL
  try {
    const client = await getClient();
    if (client) {
      const res = await client.execute(
        "SELECT slug, provider_name as providerName, title, generation_mode as generationMode, completeness_status as completenessStatus, generated_at as generatedAt FROM guides ORDER BY generated_at DESC;"
      );
      if (res.rows.length > 0) {
        return res.rows.map((row) => ({
          slug: String(row.slug),
          providerName: String(row.providerName),
          title: String(row.title),
          generationMode: row.generationMode as ProviderGuide["generationMode"],
          completenessStatus: row.completenessStatus as ProviderGuide["completenessStatus"],
          generatedAt: String(row.generatedAt),
        }));
      }
    }
  } catch {
    // Fall back
  }

  // 2. Try JSON Fallback
  const fallbackRecords = loadFallbackFile();
  const guidesFromFallback = Object.values(fallbackRecords);
  if (guidesFromFallback.length > 0) {
    return guidesFromFallback.map((g) => ({
      slug: g.slug,
      providerName: g.providerName,
      title: g.title,
      generationMode: g.generationMode,
      completenessStatus: g.completenessStatus,
      generatedAt: g.generatedAt,
    }));
  }

  // 3. Default to in-memory golden seed list
  const uniqueGuides = [GMAIL_GUIDE_SEED, GITHUB_GUIDE_SEED, SLACK_GUIDE_SEED];
  return uniqueGuides.map((g) => ({
    slug: g.slug,
    providerName: g.providerName,
    title: g.title,
    generationMode: g.generationMode,
    completenessStatus: g.completenessStatus,
    generatedAt: g.generatedAt,
  }));
}
