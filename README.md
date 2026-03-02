VTK Career Frontend by Wannes Huygh & Matthijs De Haeck

## Environment variables

Copy `.env.example` to `.env` and adjust for your environment.

- **`NEXT_PUBLIC_FORM_DOMAIN`**: canonical base URL used to build absolute URLs (important behind reverse proxies). In production this should be `https://career.vtk.be`.
- **`NEXT_PUBLIC_APP_URL`**: base URL used client-side and by some server routes that generate links.
- **`OAUTH_CALLBACK_URL`** (optional): hardcode the OAuth callback URL if your proxy headers aren’t reliable.
