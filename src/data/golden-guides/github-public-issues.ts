import type { ProviderGuide } from "@/types/contracts";

export const githubPublicIssuesGuide: ProviderGuide = {
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
