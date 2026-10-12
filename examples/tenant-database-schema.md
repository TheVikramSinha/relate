# AuthService — designer-compatible schema

> Import this file into Relate or paste its contents into the Markdown editor. This is a visualization of the supplied design, not executable DDL or confirmation that proposed tables exist.
> Description identifies storage ownership. FK markers include logical/runtime/cross-service links so the designer can draw them; these do not all represent SQL constraints. All connectors render as 1:N, even where the original design specifies 1:1 or optional cardinality.

| Entity | Attribute | Type | Constraints | Description |
| --- | --- | --- | --- | --- |
| TENANT | TenantId | string | PK | Persisted SQL: dbo.Tenants. SaaS tenant id |
|  | DisplayName | string |  |  |
|  | EntraTenantId | string |  | Entra directory (tid) allowed to sign in |
|  | ClientId | string |  | OIDC app registration id |
|  | IsEnabled | bool |  |  |
|  | AccessTokenLifetimeTicks | bigint |  |  |
|  | FeatureEnableEntraId | bool |  |  |
|  | FeatureEnableSocialLogin | bool |  |  |
|  | AllowedRedirectUrisJson | string |  | JSON string[] |
|  | AllowedSocialProvidersJson | string |  | JSON string[] of provider names |
| SOCIAL_PROVIDER | Name | string | PK | Static config. e.g. Google, GitHub, GitLab |
|  | Kind | string |  | BuiltIn  /  GenericOAuth2  /  GenericOidc |
|  | AuthorizationEndpoint | string |  |  |
|  | TokenEndpoint | string |  |  |
|  | UserInformationEndpoint | string |  |  |
|  | Authority | string |  |  |
|  | DefaultScopes | string |  | string[] |
|  | UserInfoJsonKeyMap | string |  | JSON map |
| EXTERNAL_IDENTITY | Subject | string | PK | Runtime / in-memory. IdP subject/oid, PK within Provider+TenantId |
|  | EntraTenantId | string | FK (TENANT.EntraTenantId) | directory the subject belongs to; logical association, not a durable SQL foreign key |
|  | Provider | string | FK (SOCIAL_PROVIDER.Name) | EntraID  /  Google  /  GitHub  /  ...; logical association, not a durable SQL foreign key |
|  | Email | string |  |  |
|  | Name | string |  |  |
|  | Roles | string |  | string[] |
|  | AdditionalClaims | string |  | map |
| ISSUED_TOKEN | AccessToken | string | PK | Runtime / in-memory.  |
|  | ExpiresAtUtc | datetime |  |  |
|  | TokenType | string |  | Bearer |
| AUTHORIZATION_CODE | Code | string | PK | Runtime / in-memory. single-use handoff code |
|  | ExpiresAtUtc | datetime |  |  |
|  | AccessToken | string | FK (ISSUED_TOKEN.AccessToken) | ; logical association, not a durable SQL foreign key |
| SIGNING_KEY | KeyId | string | PK | Runtime / in-memory. kid |
|  | Algorithm | string |  | RS256 |
|  | PublicModulus | string |  |  |
|  | PublicExponent | string |  |  |
| TENANT_LICENSE | LicenseId | guid | PK | Proposed SQL.  |
|  | TenantId | string | FK (TENANT.TenantId) | -> TENANT.TenantId |
|  | PlanCode | string |  | e.g. Starter  /  Growth  /  Enterprise |
|  | Status | string |  | Active  /  Suspended  /  Expired |
|  | MaxOrganizations | int |  | purchased organization quota |
|  | PurchasedAtUtc | datetime |  |  |
|  | ExpiresAtUtc | datetime |  |  |
|  | SignedEntitlementPayload | string |  | source of the signed snapshot synced to Authorization's entitlementSnapshotCache |
|  | SchemaVersion | int |  |  |
| MODULE_ENTITLEMENT | ModuleEntitlementId | guid | PK | Proposed SQL.  |
|  | LicenseId | guid | FK (TENANT_LICENSE.LicenseId) | -> TENANT_LICENSE.LicenseId |
|  | ModuleId | guid |  | -> Metadata Registry modules.moduleId, cross-service |
|  | MaxOrganizationInstances | int |  | max # of orgs this module may be assigned to |
|  | AllFeaturesIncluded | bool |  | true = bundle purchase, false = a-la-carte |
|  | Status | string |  | Active  /  Suspended |
| MODULE_FEATURE_ENTITLEMENT | ModuleFeatureEntitlementId | guid | PK | Proposed SQL.  |
|  | ModuleEntitlementId | guid | FK (MODULE_ENTITLEMENT.ModuleEntitlementId) | -> MODULE_ENTITLEMENT.ModuleEntitlementId |
|  | FeatureId | guid |  | -> Metadata Registry features.featureId, cross-service |
| ORGANIZATION | OrganizationId | guid | PK | Proposed SQL.  |
|  | TenantId | string | FK (TENANT.TenantId) | -> TENANT.TenantId |
|  | Name | string |  |  |
|  | IsEnabled | bool |  |  |
|  | CreatedAtUtc | datetime |  |  |
| ORGANIZATION_MODULE_ASSIGNMENT | OrganizationModuleAssignmentId | guid | PK | Proposed SQL.  |
|  | OrganizationId | guid | FK (ORGANIZATION.OrganizationId) | -> ORGANIZATION.OrganizationId |
|  | ModuleEntitlementId | guid | FK (MODULE_ENTITLEMENT.ModuleEntitlementId) | -> MODULE_ENTITLEMENT.ModuleEntitlementId |
|  | VisibilityState | string |  | Visible  /  Hidden, UX |
|  | EnablementState | string |  | Enabled  /  Disabled, UX |
|  | AssignedAtUtc | datetime |  |  |
| ORGANIZATION_FEATURE_STATE | OrganizationModuleAssignmentId | guid | FK (ORGANIZATION_MODULE_ASSIGNMENT.OrganizationModuleAssignmentId) | Proposed SQL. -> ORGANIZATION_MODULE_ASSIGNMENT.OrganizationModuleAssignmentId |
|  | FeatureId | guid | FK (MODULE_FEATURE_ENTITLEMENT.FeatureId) | -> MODULE_FEATURE_ENTITLEMENT.FeatureId |
|  | VisibilityState | string |  | Visible  /  Hidden, UX |
|  | EnablementState | string |  | Enabled  /  Disabled, UX |
|  | SourceEvent | string |  | config-change  /  trial-expired  /  admin-toggle |
|  | UpdatedAtUtc | datetime |  |  |
| ORGANIZATION_USER | OrganizationUserId | guid | PK | Proposed SQL.  |
|  | OrganizationId | guid | FK (ORGANIZATION.OrganizationId) | -> ORGANIZATION.OrganizationId |
|  | ExternalIdentitySubject | string | FK (EXTERNAL_IDENTITY.Subject) | -> EXTERNAL_IDENTITY.Subject |
|  | PersonaId | guid |  | -> Authorization personas.id, cross-service, optional |
|  | IsActive | bool |  |  |
|  | EnrolledAtUtc | datetime |  |  |
| GROUP | GroupId | guid | PK | Cross-service reference: Authorization. cross-service: Authorization groups container |
| ROLE | RoleId | guid | PK | Cross-service reference: Authorization. cross-service: Authorization roles container |
| ORGANIZATION_USER_GROUP_MEMBERSHIP | OrganizationUserId | guid | FK (ORGANIZATION_USER.OrganizationUserId) | Proposed SQL. -> ORGANIZATION_USER.OrganizationUserId |
|  | GroupId | guid | FK (GROUP.GroupId) | -> GROUP.GroupId, cross-service |
|  | AddedAtUtc | datetime |  |  |
| ORGANIZATION_USER_ROLE_ASSIGNMENT | OrganizationUserId | guid | FK (ORGANIZATION_USER.OrganizationUserId) | Proposed SQL. -> ORGANIZATION_USER.OrganizationUserId |
|  | RoleId | guid | FK (ROLE.RoleId) | -> ROLE.RoleId, cross-service |
|  | AssignedAtUtc | datetime |  |  |
| ORGANIZATION_USER_MODULE_ACCESS | OrganizationUserId | guid | FK (ORGANIZATION_USER.OrganizationUserId) | Proposed SQL. -> ORGANIZATION_USER.OrganizationUserId |
|  | OrganizationModuleAssignmentId | guid | FK (ORGANIZATION_MODULE_ASSIGNMENT.OrganizationModuleAssignmentId) | -> ORGANIZATION_MODULE_ASSIGNMENT.OrganizationModuleAssignmentId |
|  | AllFeaturesAccess | bool |  | true = every org-entitled feature; false = subset below |
| ORGANIZATION_USER_FEATURE_ACCESS | OrganizationUserId | guid | FK (ORGANIZATION_USER.OrganizationUserId) | Proposed SQL. -> ORGANIZATION_USER.OrganizationUserId |
|  | FeatureId | guid | FK (MODULE_FEATURE_ENTITLEMENT.FeatureId) | -> MODULE_FEATURE_ENTITLEMENT.FeatureId, must already be org-entitled |

# Interpretation and constraints

> The sections below use document-level headings and quoted notes so the designer does not interpret them as additional entities.

> **Storage:** TENANT is the only implemented durable SQL table in the source. The licensing, organization, and user-management tables are proposed. EXTERNAL_IDENTITY is request-scoped, ISSUED_TOKEN and AUTHORIZATION_CODE are process-local, SIGNING_KEY is ephemeral, SOCIAL_PROVIDER is static configuration, and GROUP/ROLE are external stubs.

> **Repeated definitions:** Repeated TENANT, ORGANIZATION, EXTERNAL_IDENTITY, and ORGANIZATION_MODULE_ASSIGNMENT blocks have been merged. Full field definitions were retained. EXTERNAL_IDENTITY.Subject is marked PK because the user-management diagram marks it PK, but the broker diagram says identity is scoped by Provider + TenantId. Subject alone is not established as globally unique, and the listed identity fields do not include a SaaS TenantId. Resolve that before implementing a durable identity FK.

> **Logical links:** EXTERNAL_IDENTITY.EntraTenantId → TENANT.EntraTenantId, EXTERNAL_IDENTITY.Provider → SOCIAL_PROVIDER.Name, and AUTHORIZATION_CODE.AccessToken → ISSUED_TOKEN.AccessToken visualize runtime associations. EntraTenantId is not declared unique in TENANT. The provider catalog may not contain EntraID. These links are not assertions of referential integrity.

> **External ownership:** GROUP.GroupId and ROLE.RoleId links are cross-service references, not local SQL foreign keys. MODULE_ENTITLEMENT.ModuleId, MODULE_FEATURE_ENTITLEMENT.FeatureId, and ORGANIZATION_USER.PersonaId also refer to external services; they remain descriptive references because their destination entities were not defined in the supplied file.

> **Feature references:** ORGANIZATION_FEATURE_STATE.FeatureId and ORGANIZATION_USER_FEATURE_ACCESS.FeatureId preserve the source links to MODULE_FEATURE_ENTITLEMENT.FeatureId. That target is not declared unique, so these are not implementation-ready SQL FKs. The appropriate entitlement/organization scope needs to be part of the database design.

> **Keys not specified:** The source declares no primary keys for ORGANIZATION_FEATURE_STATE, ORGANIZATION_USER_GROUP_MEMBERSHIP, ORGANIZATION_USER_ROLE_ASSIGNMENT, ORGANIZATION_USER_MODULE_ACCESS, or ORGANIZATION_USER_FEATURE_ACCESS. No new keys have been invented here.

> **Uniqueness:** The source proposes UNIQUE (OrganizationId, ModuleEntitlementId) for ORGANIZATION_MODULE_ASSIGNMENT. This enforces one assignment per entitlement, but one assignment per module additionally requires the entitlement-to-module model to prevent duplicate entitlements for the same organization/module. Multi-column uniqueness is documentation only in this designer.

> **Cardinality:** The source shows TENANT–TENANT_LICENSE as 1:1, EXTERNAL_IDENTITY–ISSUED_TOKEN as 1:1, and ISSUED_TOKEN–AUTHORIZATION_CODE as 1:0..1. The designer draws FK links as 1:N and cannot express these distinctions. TENANT_LICENSE.TenantId is not explicitly declared UNIQUE in the source.

> **Relationships without columns:** Tenant opt-in to social providers is stored as JSON names; no junction table is invented. Identity-to-issued-token and signing-key-to-issued-token associations lack linking columns, so they do not appear as connectors. The source also shows user-module-access → user-feature-access, but the feature-access entity has no assignment identifier to express that specific relationship; it remains connected through its declared user and feature references.

> **Quotas:** Enforce organization count ≤ TENANT_LICENSE.MaxOrganizations and assignment count ≤ MODULE_ENTITLEMENT.MaxOrganizationInstances in the application layer with appropriate concurrency protection. These are not FK relationships.

> **Access semantics:** Entitlements establish eligibility; visibility/enablement states control UX. User module/feature scope may only narrow the organization’s licensed set. Effective permissions are derived by Authorization from direct and group-derived roles, not stored as permission bits on these user tables. Both entitlement and permission gates must pass.
