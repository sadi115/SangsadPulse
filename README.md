# SangsadPulse - Bangladesh Parliament Uptime Monitor

This is a Next.js application built in Firebase Studio to monitor the uptime and performance of various websites and services.

## Features

*   **Multi-Type Monitoring**: Check services using HTTP(s), TCP Port, Ping, and more.
*   **Dual-Location Checks**: Monitor from both the cloud (server-side) and your local network (client-side).
*   **Real-time Dashboard**: View the status, latency, and uptime history of all your monitored services at a glance.
*   **Card & List Views**: Choose the layout that works best for you.
*   **Desktop Notifications**: Get notified when a service goes down or comes back up.
*   **Report Generation**: Export monitoring data as PDF or Excel files.

---

## Running Locally

Follow these steps to get the project running on your local machine.

### 1. Prerequisites

Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (version 20 or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 2. Installation

First, open your terminal, navigate to the project's root directory, and install the required dependencies:

```bash
npm install
```

### 3. Environment Variables (Optional but Recommended)

This project uses Genkit for AI-powered diagnostics (like the TTFB check). To enable these features, you need a Gemini API key.

1.  Create a new file named `.env.local` in the root of the project.
2.  Go to [Google AI Studio](httpss://aistudio.google.com/app/apikey) to generate an API key.
3.  Add the key to your `.env.local` file like this:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```
_Note: If you don't provide an API key, the application will still run, but the AI-related features will be disabled._

### 4. Running the Application

This project has two parts: the Next.js web application and the Genkit AI server. You can run them with a single command.

Open your terminal in the project directory and run:

```bash
npm run dev
```

This will start the Next.js development server. You can now view your application by opening your browser and navigating to:

**[http://localhost:9002](http://localhost:9002)**

Any changes you make to the code will be automatically reflected in the browser.
