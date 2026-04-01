# HeatHaven Mobile (Expo)

This is the mobile app for the existing HeatHaven Express API.

## Run the backend

From repo root:

```bash
npm run dev
```

Backend runs on `http://localhost:5000` by default.

## Run the mobile app

From `mobile/`:

```bash
npm start
```

- **Android emulator**: should work automatically (defaults to `http://10.0.2.2:5000`).
- **iOS simulator**: defaults to `http://localhost:5000`.
- **Real phone (Expo Go)**: set your API URL to your PC’s LAN IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
```

You can put that in a `mobile/.env` file too (see `mobile/.env.example`).

