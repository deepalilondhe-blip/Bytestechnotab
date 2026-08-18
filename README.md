# Bytes Technolab Admin Panel Automation Script

This automation script parses the Product Strategy & Consulting Services content from a text/markdown file (or Word `.docx` file), logs in to the WordPress admin panel, updates the page details, and then validates that the changes are correctly reflected on the frontend.

## Prerequisites

Ensure you have **Node.js** installed on your system.

## Setup Instructions

1.  **Configure environment variables:**
    Rename or open the `.env` file and populate it with your actual staging credentials:
    ```ini
    # WordPress Admin Credentials
    WP_ADMIN_URL=https://staging.bytestechnolab.com/wp-admin/index.php
    WP_USERNAME=your_wordpress_username
    WP_PASSWORD=your_wordpress_password

    # HTTP Basic Auth Credentials (required if staging site has .htaccess protection)
    HTTP_BASIC_AUTH_USER=your_basic_auth_user
    HTTP_BASIC_AUTH_PASS=your_basic_auth_pass

    # Frontend Verification URL
    FRONTEND_URL=https://staging.bytestechnolab.com/product-strategy-consulting

    # Path to your Word file or local content file
    WORD_FILE_PATH=./content.md
    ```

2.  **Install dependencies:**
    Open your terminal in this directory and run:
    ```bash
    npm install
    npx playwright install chromium
    ```

3.  **Run the script:**
    Start the automation by running:
    ```bash
    npm start
    ```

## Files in this Project

*   [`automation.js`](file:///c:/Bytestechnolab/automation.js): Main automation script that launches Playwright, logs in, fills fields, and performs frontend checks.
*   [`parser.js`](file:///c:/Bytestechnolab/parser.js): Content parser supporting extraction from `.docx` (using Mammoth) and `.md`/`.txt` files.
*   [`config.js`](file:///c:/Bytestechnolab/config.js): Handles CSS selectors and Playwright browser options.
*   [`content.md`](file:///c:/Bytestechnolab/content.md): The raw text copy of the content downloaded from your Google Doc.
*   `.env`: Local environment configurations for credentials.

## Debugging and Logs

*   Screenshots of the automation flow will be saved in the `./screenshots` directory (e.g., login status, post save page, frontend verification status).
*   Any missing fields or validation failures will be logged in the console.
