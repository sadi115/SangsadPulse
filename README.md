# SangsadPulse - Bangladesh Parliament Uptime Monitor

This is a Next.js application built in Firebase Studio to monitor the uptime and performance of various websites and services. It uses SQLite as its database, making it fully self-contained and easy to run.

## Features

*   **Multi-Type Monitoring**: Check services using HTTP(s), TCP Port, Ping, and more.
*   **Dual-Location Checks**: Monitor from both the server and your local browser.
*   **Real-time Dashboard**: View the status, latency, and uptime history of all your monitored services.
*   **Card & List Views**: Choose the layout that works best for you.
*   **Desktop Notifications**: Get notified when a service goes down or comes back up.
*   **Report Generation**: Export monitoring data as PDF or Excel files.
*   **Zero-Config Database**: Uses a built-in SQLite database that creates itself automatically.

---

## Running Locally (Development)

Follow these steps to get the project running on your local machine for development purposes.

### 1. Prerequisites

Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (version 20 or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### 2. Installation

First, open your terminal, navigate to the project's root directory, and install the required dependencies. This command also installs the necessary tools for SQLite.

```bash
npm install
```

### 3. Environment Variables (Optional but Recommended)

This project uses Genkit for AI-powered diagnostics (like the TTFB check). To enable these features, you need a Gemini API key.

1.  Create a new file named `.env.local` in the root of the project.
2.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate an API key.
3.  Add the key to your `.env.local` file like this:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```
_Note: If you don't provide an API key, the application will still run, but the AI-related features will be disabled. No database setup is needed!_

### 4. Running the Application

This project has two parts: the Next.js web application and the Genkit AI server. You can run them with a single command.

Open your terminal in the project directory and run:

```bash
npm run dev
```

This will start the Next.js development server. The first time you run it, a file named `sangsaddb.sqlite` will be automatically created in your project folder—this is your database.

You can now view your application by opening your browser and navigating to:

**[http://localhost:9002](http://localhost:9002)**

Any changes you make to the code will be automatically reflected in the browser.

---

## Deployment Guide (Production)

Follow these instructions to deploy the application to a dedicated Linux or Windows server.

### Step 1: Server Prerequisites

Ensure your server has **Node.js** (version 20 or later) installed.

### Step 2: Deploy the Code

1.  Copy the entire project folder to your server.
2.  Navigate to the project directory in your server's terminal or command prompt.
3.  Install dependencies, including the `pm2` process manager:
    ```bash
    npm install
    ```
4.  **Create Production Environment File**: Create a `.env` file in the root of the project. This is where you'll store your production API key.
    ```
    GEMINI_API_KEY=YOUR_PRODUCTION_API_KEY
    ```
5.  **Build the Application**: Create an optimized production build.
    ```bash
    npm run build
    ```

### Step 3: Run with a Process Manager (PM2)

We use `pm2` to keep the application running continuously and to restart it automatically if it crashes or the server reboots.

1.  **Start the application**:
    ```bash
    npm run start:prod
    ```
    This command starts the app under the name `sangsaddpulse-app`.

2.  **Verify it's running**:
    ```bash
    pm2 status
    ```
    You should see `sangsaddpulse-app` in the list with a green "online" status.

3.  **Enable Startup on Reboot**:
    *   On **Linux**: `pm2 startup` (Follow the instructions it gives you).
    *   On **Windows**: This should be handled automatically by `pm2`.

4.  **Save the process list**:
    ```bash
    pm2 save
    ```

### Step 4: Set Up a Reverse Proxy (Recommended)

A reverse proxy (like Nginx or IIS) sits in front of your app, handling public traffic and forwarding it to the Next.js process. This is crucial for security, performance, and SSL/TLS management.

The Next.js app runs on `http://localhost:3000` by default in production. Your reverse proxy should forward requests to this address.

#### Example: Nginx on Linux

1.  Install Nginx: `sudo apt update && sudo apt install nginx`
2.  Create a new Nginx config file: `sudo nano /etc/nginx/sites-available/sangsaddpulse`
3.  Add the following configuration (replace `your_domain.com`):
    ```nginx
    server {
        listen 80;
        server_name your_domain.com;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
4.  Enable the site and restart Nginx:
    ```bash
    sudo ln -s /etc/nginx/sites-available/sangsaddpulse /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```
5.  **For HTTPS**, use Certbot to get a free SSL certificate from Let's Encrypt:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your_domain.com
    ```

#### Example: IIS on Windows Server

1.  Install **IIS** from Server Manager.
2.  Install the **URL Rewrite** and **Application Request Routing (ARR)** modules for IIS.
3.  In IIS Manager, select your server in the Connections pane and open **Application Request Routing Cache**. Under Actions, click **Server Proxy Settings...** and check "Enable proxy".
4.  Create a new site in IIS for your application.
5.  In your new site, open **URL Rewrite** and add a new "Reverse Proxy" rule.
    *   **Inbound Rule**: Enter `localhost:3000` and click OK. IIS will create the rule for you.

This setup ensures your application is robust, secure, and ready for production use.
