# Authentication Flow

Soegih uses **Supabase Auth** for all authentication. This document explains the complete flow.

## Architecture

```
┌─────────────────────────────────────┐
│  Frontend (React + Supabase Client) │
│                                     │
│  const { user, session } =          │
│    await supabase.auth              │
│      .signInWithPassword(...)       │
│                                     │
└─────────────────────┬───────────────┘
                      │ (JWT token in session)
                      │
              ┌───────▼────────────┐
              │ localStorage       │
              │ @supabase.auth.* │
              └───────┬────────────┘
                      │ (Auto-refresh)
                      │
                      │ Attach to all requests
                      │ Authorization: Bearer <token>
                      │
┌─────────────────────▼────────────────────┐
│  Backend (NestJS + SupabaseJwtGuard)     │
│                                          │
│  1. Extract JWT from Authorization      │
│  2. Validate via Supabase                │
│  3. Extract user.id from token payload   │
│  4. Attach to request.user               │
│  5. Proceed to controller                │
└──────────────┬───────────────────────────┘
               │
       ┌───────▼─────────┐
       │ Supabase Auth   │
       │ (Verify JWT)    │
       └─────────────────┘
```

---

## Sign Up Flow

### 1. Frontend Initiates Sign Up

User enters email and password on signup form:

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePassword123'
});

// Returns:
// {
//   user: { id: 'uuid-from-supabase', email: '...', ... },
//   session: { access_token: 'jwt...', ... }
// }
```

### 2. Supabase Creates User & JWT

- Supabase creates a user in its `auth.users` table
- User ID is a UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- JWT token is issued with:
  - `sub: <user_id>` (subject = user UUID)
  - `aud: authenticated` (audience)
  - `exp: <timestamp>` (expiration)
  - Signed with Supabase's private key

### 3. Frontend Stores Session

Supabase client automatically stores session in localStorage:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_in": 3600,
  "expires_at": 1678804000,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

### 4. Create Backend User Record

When the user accesses the backend for the first time (e.g., creating a wallet), the backend:

1. Validates JWT from request
2. Extracts `user.id` from JWT payload
3. Creates a corresponding `users` table record (synced with Supabase)

```sql
INSERT INTO users (id, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', NOW(), NOW());
```

---

## Login Flow

### 1. Frontend Initiates Login

User enters credentials:

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'SecurePassword123'
});
```

### 2. Supabase Validates & Issues JWT

- Supabase looks up user by email
- Validates password hash
- Generates new JWT token (same structure as signup)
- Returns session with access_token

### 3. Supabase Client Stores & Auto-Refreshes

- Session stored in localStorage
- SDK automatically refreshes token before expiration
- Old session in `useAuth()` hook updates via `onAuthStateChange` listener

```typescript
const { data: { subscription } } = supabase.auth
  .onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });
```

### 4. Subsequent API Calls Attach JWT

Axios interceptor automatically adds token:

```typescript
apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization =
      `Bearer ${data.session.access_token}`;
  }
  return config;
});
```

---

## Backend JWT Validation

### 1. Request Arrives with Authorization Header

```
POST /api/v1/wallets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{ "name": "Savings", "type": "bank" }
```

### 2. SupabaseJwtGuard Intercepts

```typescript
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);

    try {
      const { data, error } =
        await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException();
      }

      request.user = {
        id: data.user.id,
        email: data.user.email
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
```

### 3. Supabase Validates Token

The SDK calls Supabase's token verification endpoint, which:
- Decodes JWT with Supabase's public key
- Verifies signature
- Checks expiration
- Returns user object if valid

### 4. Controller Receives Authenticated User

```typescript
@Post()
@UseGuards(SupabaseJwtGuard)
create(@GetUser() user: any, @Body() dto: CreateWalletDto) {
  // user = { id: 'uuid...', email: 'user@example.com' }
  return this.walletService.create(user.id, dto);
}
```

The `@GetUser()` decorator extracts `request.user`:

```typescript
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

---

## Token Refresh

### Automatic Refresh (Frontend)

Supabase client handles token refresh automatically:

1. When token nears expiration, SDK calls refresh endpoint
2. Supabase validates refresh_token
3. Issues new access_token
4. Session updated in localStorage
5. No user intervention needed

### Invalid/Expired Token

If a request uses an expired token:

1. Backend returns 401 Unauthorized
2. Axios response interceptor catches this
3. Calls `supabase.auth.signOut()`
4. Redirects to `/login`

```typescript
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

---

## Logout Flow

### 1. User Clicks Logout

```typescript
await authService.logout();
// Calls: supabase.auth.signOut()
```

### 2. Supabase Clears Session

- Removes session from localStorage
- Invalidates refresh token
- User state cleared in `useAuth()` hook

### 3. Frontend Redirects to Login

```typescript
const handleLogout = async () => {
  await authService.logout();
  auth.logout(); // Clears local state
  router.navigate({ to: '/login' });
};
```

---

## Data Isolation

Every backend query filters by authenticated user_id:

```typescript
findAll(user_id: string) {
  return this.prisma.wallet.findMany({
    where: { user_id, deleted_at: null }
  });
}
```

This ensures:
- Users cannot access other users' data
- Even if a user modifies the JWT payload, the backend re-validates the user_id
- All operations are scoped to `request.user.id`

---

## Security Considerations

✅ **Secure practices:**
- JWT validated on every request
- Token stored in localStorage (accessible but secure for SPA)
- Auto token refresh prevents long-lived tokens
- Password never sent to backend (handled by Supabase)
- Supabase handles password hashing, storage, compliance

⚠️ **Known limitations:**
- localStorage is vulnerable to XSS; mitigated by never executing untrusted JS
- Cookie + SameSite would be more secure but SPA context makes JWT appropriate

---

## Environment Variables

**Backend:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Frontend:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Both use the **ANON_KEY** (public key for client-side auth). Never expose service_role key in frontend.

---

**Last updated:** [Planning phase]
**Reference:** [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
