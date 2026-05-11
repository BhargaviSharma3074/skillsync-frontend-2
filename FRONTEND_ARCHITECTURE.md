# SkillSync Frontend Architecture & Flow

## 1. Entry Point: `index.html` → Browser

```
index.html (entry point)
├── Loads external libraries:
│   ├── Google Material Icons & Roboto fonts
│   ├── Razorpay payment gateway
│   └── Google Sign-In (GSI client)
└── Creates a single DOM element: <app-root></app-root>
    └── Angular will render the app here
```

**What happens:**
- Browser loads `index.html` with `<base href="/">` (sets app's base path)
- Vite development server bundles and injects compiled JavaScript
- `<app-root>` is an empty placeholder for Angular to bootstrap into

---

## 2. Bootstrap: `main.ts`

```typescript
bootstrapApplication(App, appConfig)
```

**What happens:**
1. **Angular's `bootstrapApplication()` function** creates the application instance
2. Loads the **root component**: `App` (from `app.ts`)
3. Applies **application configuration** from `app.config.ts`
4. Angular renders `App` component into `<app-root>` in the DOM

---

## 3. Application Configuration: `app.config.ts`

Sets up global providers and interceptors:

```typescript
providers: [
  provideBrowserGlobalErrorListeners(),      // Global error handler
  provideRouter(routes),                      // Router with routes
  provideHttpClient(
    withInterceptors([
      jwtInterceptor,    // Adds JWT token to requests
      errorInterceptor   // Handles HTTP errors & token refresh
    ])
  ),
  provideAnimationsAsync(),                   // Angular animations
  {
    provide: APP_INITIALIZER,
    useFactory: initAuth,                     // Initializes auth on app startup
    deps: [AuthService],
  },
  provideCharts(withDefaultRegisterables()),  // Chart library
]
```

**Key Initialization: `initAuth()`**
- Runs on app startup
- Checks if a JWT token exists in localStorage
- If yes: calls `authService.fetchProfile()` to load current user data
- Happens BEFORE any routes are displayed

---

## 4. Root Component: `app.ts`

```typescript
@Component({
  selector: 'app-root',
  template: `
    <router-outlet />
    <app-toast />
  `,
})
export class App {
  constructor() {
    inject(ThemeService); // Loads saved theme from localStorage
  }
}
```

**What happens:**
- `<router-outlet>` is where routed components render
- `<app-toast>` displays toast notifications globally
- **ThemeService** loads the saved theme preference

---

## 5. Routing: `app.routes.ts`

```
/ (root)
├── Redirects to /login
├── /login (public, loads LoginComponent)
├── /register (public, loads RegisterComponent)
├── /forgot-password (public)
├── /reset-password (public)
└── /dashboard (protected by authGuard)
    └── Shows logged-in content
    ├── /dashboard/overview (default)
    ├── /dashboard/find-mentors
    ├── /dashboard/sessions
    ├── /dashboard/groups
    ├── /dashboard/reviews
    ├── /dashboard/notifications
    ├── /dashboard/profile
    ├── /dashboard/settings
    └── /admin/* (protected by adminGuard)
```

**Route Guards:**
- **`authGuard`**: Blocks unauthenticated users, redirects to /login
- **`noAuthGuard`**: Redirects logged-in users away from login/register
- **`adminGuard`**: Allows only users with ROLE_ADMIN

**Lazy Loading:**
- Components are loaded on-demand using `loadComponent: () => import(...)`
- Reduces initial bundle size

---

## 6. HTTP Interceptors

### **JWT Interceptor** (`jwt.interceptor.ts`)

Runs on EVERY HTTP request:

```typescript
// If token exists AND request is NOT public:
req.clone({
  setHeaders: { Authorization: `Bearer ${token}` }
})
```

**Public URLs** (skip token injection):
- `/auth/login`
- `/auth/register`
- `/auth/refresh`

**Flow:**
```
HttpRequest
  ↓
[JWT Interceptor adds Authorization header]
  ↓
[Error Interceptor catches errors]
  ↓
Server responds
```

### **Error Interceptor** (`error.interceptor.ts`)

Handles HTTP errors:

1. **401 (Unauthorized)**: Token expired
   - Calls `authService.refresh()` to get new token
   - Retries original request with new token
   - Uses `BehaviorSubject` to sync concurrent requests

2. **403 (Forbidden)**: Routes to `/forbidden`

3. **500, 502, 503 (Server errors)**: Routes to `/server-error`

4. **Other errors**: Shows toast notification (silent for internal requests like `/auth/refresh`)

```
HTTP Error (401)
  ↓
[Check if auth endpoint]
  ↓
[If not auth endpoint, attempt token refresh]
  ↓
[POST /auth/refresh with current token]
  ↓
[Store new token]
  ↓
[Retry original request with new token]
```

---

## 7. Authentication Service: `auth.service.ts`

**State Management** (using BehaviorSubjects):
```typescript
private currentUserSubject = new BehaviorSubject<UserDTO | null>(null)
currentUser$ = this.currentUserSubject.asObservable()

private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'))
token$ = this.tokenSubject.asObservable()
```

**Key Methods:**

| Method | Flow |
|--------|------|
| `login()` | POST /auth/login → Store token → GET /users → Store user |
| `register()` | POST /auth/register → Store token → GET /users → Store user |
| `fetchProfile()` | GET /users → Update currentUserSubject |
| `googleLogin()` | POST /auth/google → Store token → Get profile |
| `refresh()` | POST /auth/refresh → Store new token |
| `logout()` | Clear user & token → Redirect to /login |

**Token Storage:**
- Stored in `localStorage` (persists across page refreshes)
- Also in `tokenSubject` BehaviorSubject (for RxJS streams)

---

## 8. Service Architecture

All services are **root-level singletons** (`providedIn: 'root'`):

### **Core Services** (`core/services/`)

- **AuthService**: Authentication & user state
- **MentorService**: Fetch mentor data, filtering
- **SessionService**: Booking & managing sessions
- **GroupService**: Group operations
- **ReviewService**: Student reviews
- **SkillService**: Available skills
- **PaymentService**: Payment processing
- **NotificationService**: Notifications
- **NotificationWebsocketService**: Real-time WebSocket updates
- **AdminService**: Admin panel operations
- **ToastService**: Global toast notifications
- **ThemeService**: Light/dark theme toggle
- **UserLookupService**: User search/lookup

### **API Service** (`core/api/api.service.ts`)

Generic wrapper around HttpClient:
```typescript
private baseUrl = "http://localhost:9090"

get<T>(path: string)
post<T>(path: string, body)
put<T>(path: string, body)
delete<T>(path: string)
```

---

## 9. How Services Are Used in Components

**Example: `OverviewComponent`**

```typescript
@Component({...})
export class OverviewComponent {
  private auth = inject(AuthService);  // Inject service
  
  // Use service data to determine which dashboard to show
  get isLearner() { 
    return this.auth.currentUser?.role?.includes('LEARNER'); 
  }
  get isMentor()  { 
    return this.auth.currentUser?.role?.includes('MENTOR'); 
  }
}
```

**Example: `MentorService` usage**

```typescript
// In a component
mentors$ = this.mentorService.getAll(
  { skillId: 5, minRating: 4 },
  page = 0,
  size = 12
)

// In template
@for (mentor of mentors$ | async as m) {
  <!-- Display mentor -->
}
```

**Pattern:**
1. **Inject service** using `inject(ServiceName)`
2. **Call service method** that returns `Observable<T>`
3. **Subscribe in template** using `| async` pipe OR
4. **Subscribe in component** using `.subscribe()`

---

## 10. Complete Request Flow Example

**User logs in:**

```
1. User fills login form
   ↓
2. LoginComponent.login() calls authService.login(credentials)
   ↓
3. AuthService.login():
   POST /auth/login {username, password}
   ↓
4. [JWT Interceptor] - Skip (public endpoint)
   ↓
5. [Error Interceptor] - Catch errors
   ↓
6. Server responds with { token, expiresIn }
   ↓
7. AuthService.storeToken(token) → Save to localStorage & tokenSubject
   ↓
8. AuthService.switchMap(() => fetchProfile())
   ↓
9. AuthService.fetchProfile():
   GET /users
   ↓
10. [JWT Interceptor] Adds Authorization header: Bearer <token>
   ↓
11. Server responds with { id, name, email, role, ... }
   ↓
12. AuthService.currentUserSubject.next(user) → Update user state
   ↓
13. Component (LoginComponent) receives UserDTO
   ↓
14. LoginComponent redirects to /dashboard
   ↓
15. Router checks authGuard → auth.isLoggedIn = true ✓
   ↓
16. DashboardComponent loads
   ↓
17. OverviewComponent checks user.role → Shows correct dashboard
```

---

## 11. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ index.html                                           │   │
│  │  └─→ <app-root></app-root>                          │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ main.ts: bootstrapApplication(App, appConfig)       │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ App Component (app.ts)                               │   │
│  │  ├─ <router-outlet /> (component changes here)      │   │
│  │  └─ <app-toast /> (notifications)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Router (app.routes.ts)                               │   │
│  │  ├─ Guards (authGuard, noAuthGuard, adminGuard)    │   │
│  │  └─ Routes (/login, /dashboard, /admin, etc)       │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Feature Components (DashboardComponent, etc)         │   │
│  │  └─ Inject Services (AuthService, MentorService)    │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│                  HTTP INTERCEPTORS                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ JWT Interceptor: Add Authorization header            │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Error Interceptor: Handle errors & token refresh     │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
└─────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API                                   │
│  BASE_URL: http://localhost:9090                             │
│  ├─ POST /auth/login, /auth/register, /auth/google         │
│  ├─ GET /users (fetch profile)                              │
│  ├─ POST /auth/refresh (token refresh)                      │
│  ├─ GET /mentors (list mentors)                             │
│  ├─ GET /sessions (list sessions)                           │
│  ├─ POST /groups (create group)                             │
│  └─ ... (other API endpoints)                               │
│                                                               │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ localStorage on Server (JWT Token stored in browser)   │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Key Takeaways

| Aspect | Implementation |
|--------|-----------------|
| **Framework** | Angular (v18+) standalone components |
| **Entry Point** | `index.html` → `main.ts` → `App` component |
| **Routing** | Lazy-loaded components with guards |
| **State** | BehaviorSubjects (currentUser$, token$) |
| **HTTP** | HttpClient with JWT & error interceptors |
| **Services** | Root-level singletons injected via `inject()` |
| **Auth Token** | Stored in localStorage, added to requests automatically |
| **Token Refresh** | Automatic on 401 errors via error interceptor |
| **UI Framework** | Angular Material (Material Icons) |
| **Styling** | SCSS + CSS variables (theme support) |
| **Payments** | Razorpay integration (loaded in index.html) |
| **Real-time** | WebSocket via NotificationWebsocketService |

---

## 13. Service Dependency Graph

```
App
  ├─ ThemeService (load saved theme)
  └─ Router-Outlet (shows components based on route)
       │
       ├─ LoginComponent → AuthService
       │                    ├─ HttpClient
       │                    ├─ ToastService
       │                    └─ Router
       │
       ├─ DashboardComponent → AuthService
       │                        ├─ MentorService
       │                        ├─ SessionService
       │                        ├─ GroupService
       │                        ├─ NotificationService
       │                        └─ ReviewService
       │
       └─ [All Feature Components]
            ├─ AuthService (check user role)
            ├─ SkillService
            ├─ PaymentService
            ├─ AdminService
            └─ UserLookupService
```

---

## 14. localStorage Usage

The app stores this in `localStorage`:

```javascript
localStorage.getItem('token')    // JWT token for authentication
// Theme is managed by ThemeService (likely in localStorage too)
```

---

## Summary

**The flow is:**

1. **Static HTML** (`index.html`) loads and creates an empty `<app-root>` element
2. **JavaScript bundle** initializes Angular via `main.ts`
3. **App configuration** sets up router, HTTP interceptors, and auth initializer
4. **Root component** (`App`) renders with `<router-outlet>` for dynamic content
5. **Router** matches the URL and loads the appropriate component
6. **Components** inject services and call their methods
7. **Services** make HTTP requests via `HttpClient`
8. **HTTP interceptors** automatically:
   - Add JWT token to requests
   - Handle token expiration and refresh
   - Show errors to users
9. **Backend API** receives authenticated requests and responds with data
10. **BehaviorSubjects** in services manage state (current user, token, etc.)
11. **Components** subscribe to observables from services and display data

This is a **modern, reactive Angular architecture** using:
- Standalone components (no NgModules)
- Functional HTTP interceptors
- Service-based state management
- Lazy-loaded routes
- Dependency injection via `inject()`
