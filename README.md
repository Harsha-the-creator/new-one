# College Admission System

Welcome to the College & Admissions Portal for GAYATRI JUNIOR & DEGREE COLLEGE. This system handles online admission applications for academic sessions and includes a backend server for email sending and static file serving.

## Features

- **Admissions Portal**: Interface for students to apply online (`apply.html`).
- **Dashboard & Status**: Pages to view application status (`dashboard.html`, `status.html`).
- **Admin Interface**: Administrative dashboard for managing applications (`admin.html`).
- **Headless Screenshot Utility**: Built-in tool in the `tools` directory to capture headless Chrome screenshots of the site at common breakpoints.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js, CORS, body-parser, dotenv
- **Tooling**: Puppeteer for automated screenshots

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

### Installation

1. Clone or download the repository.
2. Install the required dependencies:

```bash
npm install
```

### Running the Application

To start the backend server and serve the frontend files locally:

```bash
npm start
```
or 
```bash
npm run dev
```

The server will typically run on `http://localhost:5000` (or whichever port is defined in your `.env` file).

- **Frontend Access**: Navigate to `http://localhost:5000`
- **Health Check**: Check the server status at `http://localhost:5000/api/health`

## Environment Variables

You can configure the application using a `.env` file in the root directory. You can copy the provided `.env.example` file to get started:
```bash
cp .env.example .env
```

Important variables include:
- `PORT`: The port number the server runs on (default: 5000).
- `FIREBASE_API_KEY`: Your Firebase Web API Key.
- `FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain.
- `FIREBASE_PROJECT_ID`: Firebase Project ID.
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket.
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID.
- `FIREBASE_APP_ID`: Firebase App ID.
- `FIREBASE_MEASUREMENT_ID`: Firebase Measurement ID (Optional).

## Generating Firebase Config

Because this is a static site that relies on Firebase, the client-side configuration is generated dynamically from your `.env` variables. **You must generate the config file before running the application locally**:

```bash
npm run build
```
*(This will create a `js/firebase-config.js` file which is automatically ignored by Git).*

## Screenshots Utility

To automatically capture screenshots of all major portal pages across different device viewports:

```bash
npm run screenshot
```

Refer to `tools/README_SCREENS.md` for more details about the screenshot utility.

## License

This project is licensed under the MIT License.
