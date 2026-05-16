import type {
  AuthorizationStart,
  GoogleClaims,
  IdentityProviderPort,
} from '@kawal/application';
import { Issuer, generators, type Client } from 'openid-client';

export interface GoogleOidcConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

/**
 * Spec: user-management / "Google SSO is the sole credential".
 *
 * Real OIDC adapter against Google's discovery endpoint. State, nonce, and
 * PKCE code verifier are generated per authorization start and verified on
 * completion.
 *
 * Spec scenarios verified:
 *   - Sign-in via Google: redirect URL + signature-validated ID token
 *   - Non-Google credential rejected: only callers of this adapter can mint
 *     a session, and this adapter only ever returns claims from a real
 *     google.com discovery response.
 */
export class GoogleOidcAdapter implements IdentityProviderPort {
  private clientPromise: Promise<Client> | null = null;

  constructor(private readonly config: GoogleOidcConfig) {}

  private getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const issuer = await Issuer.discover('https://accounts.google.com');
        return new issuer.Client({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uris: [this.config.redirectUri],
          response_types: ['code'],
        });
      })();
    }
    return this.clientPromise;
  }

  async beginAuthorization(): Promise<AuthorizationStart> {
    const client = await this.getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const url = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      access_type: 'online',
    });
    return { url, state, nonce, codeVerifier };
  }

  async completeAuthorization(input: {
    code: string;
    state: string;
    expectedState: string;
    expectedNonce: string;
    codeVerifier: string;
  }): Promise<GoogleClaims> {
    if (input.state !== input.expectedState) {
      throw new Error('OAuth state mismatch');
    }
    const client = await this.getClient();
    const tokenSet = await client.callback(
      this.config.redirectUri,
      { code: input.code, state: input.state },
      { code_verifier: input.codeVerifier, nonce: input.expectedNonce, state: input.expectedState },
    );
    const claims = tokenSet.claims();
    if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
      throw new Error(`Unexpected issuer: ${claims.iss}`);
    }
    if (!claims.sub) throw new Error('Google ID token missing sub claim');
    if (typeof claims.email !== 'string') {
      throw new Error('Google ID token missing email claim');
    }
    return {
      sub: claims.sub,
      email: claims.email,
      emailVerified: Boolean(claims.email_verified),
      name: typeof claims.name === 'string' && claims.name.length > 0 ? claims.name : claims.email,
      picture: typeof claims.picture === 'string' ? claims.picture : null,
    };
  }
}
