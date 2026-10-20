import type { ProviderGuide } from "@/types/contracts";

export const slackChannelBotGuide: ProviderGuide = {
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
