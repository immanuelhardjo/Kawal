/**
 * Spec: user-management / "Google SSO is the sole credential".
 *
 * The Authorization Code flow against Google OIDC. The application layer
 * only knows this interface; the concrete adapter (openid-client) lives in
 * `packages/infrastructure/identity/google-oidc-adapter.ts`.
 */
export interface AuthorizationStart {
  readonly url: string;
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
}

export interface GoogleClaims {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string;
  readonly picture: string | null;
}

export interface IdentityProviderPort {
  beginAuthorization(): Promise<AuthorizationStart>;
  completeAuthorization(input: {
    code: string;
    state: string;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<GoogleClaims>;
}
