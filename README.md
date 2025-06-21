# Pohi AI Pro v3

Pohi AI Pro is a database application designed to streamline operations for manufacturers and their customers. It connects stakeholders, manages orders and stock, features user-specific interfaces, and includes smart logistics for transport organization.

## Prerequisites

*   A modern web browser (e.g., Chrome, Firefox, Edge, Safari).
*   [esbuild](https://esbuild.github.io/) (a JavaScript bundler and minifier). You can install it globally via npm: `npm install -g esbuild`.
*   An API Key for the Google Gemini API.

## Setup and Running the Application

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/pohi99999/Pohi_AI_Pro_HackTheLLM.git
    cd Pohi_AI_Pro_HackTheLLM
    ```

2.  **Set up the Gemini API Key:**
    This application requires a Google Gemini API key to function. The application is designed to read the API key from an environment variable `process.env.API_KEY`.
    When running locally with `esbuild`, you need to define this variable at build/serve time.

3.  **Modify `index.html` (One-time change):**
    The current `index.html` tries to load `index.tsx` directly. For `esbuild` to bundle and serve correctly, you need to point it to the bundled JavaScript file.
    Open `index.html` and change the script tag:
    *   **FROM:** `<script type="module" src="/index.tsx"></script>`
    *   **TO:** `<script type="module" src="/dist/index.js"></script>`
    *(If a `dist` folder doesn't exist in your project's root, `esbuild` will create it with the command below.)*

4.  **Build and Serve the Application:**
    Open your terminal in the project root directory (`Pohi_AI_Pro_HackTheLLM`).
    Run the following `esbuild` command, replacing `YOUR_ACTUAL_API_KEY` with your real Gemini API key:

    ```bash
    esbuild index.tsx --bundle --outfile=dist/index.js --servedir=. --loader:.tsx=tsx --define:process.env.API_KEY='"YOUR_ACTUAL_API_KEY"'
    ```
    *   `index.tsx`: Your main application entry point.
    *   `--bundle`: Bundles all imported files.
    *   `--outfile=dist/index.js`: Specifies the output file for the bundled JavaScript.
    *   `--servedir=.`: Serves the current directory (`.` means the project root). `esbuild` will start a local web server.
    *   `--loader:.tsx=tsx`: Tells `esbuild` how to handle `.tsx` files.
    *   `--define:process.env.API_KEY='"YOUR_ACTUAL_API_KEY"'`: This injects your API key into the code where `process.env.API_KEY` is referenced. **Important:** Make sure YOUR_ACTUAL_API_KEY is enclosed in double quotes *within* the single quotes, like `'"AIzaSy..."'`.

5.  **Open in Browser:**
    `esbuild` will typically start a server on `http://127.0.0.1:8000` (or `http://localhost:8000`). Open this URL in your web browser. If the port is different, `esbuild` will indicate this in the terminal. You should see your `index.html` page served from the root directory.

## Using the Application

*   Upon loading, you'll be presented with the **Login Page**.
*   Select a role (Administrator, Customer, or Manufacturer) to access the respective interface.
*   Explore the features available for each role, such as:
    *   **Customers:** Submitting new demands (general or specific for acacia poles), viewing their demands.
    *   **Manufacturers:** Adding new stock, viewing their stock.
    *   **Administrators:** Accessing the dashboard with various AI tools, managing users, stock, matchmaking, truck planning, billing, and AI reports.
*   Many pages feature AI assistant buttons (often marked with a sparkles icon) to help with tasks like generating text, suggesting alternatives, or analyzing data. These require the Gemini API key to be correctly set up.

## Notes

*   This application is a prototype, and data is stored in the browser's Local Storage. This means data will persist on your machine but won't be shared with others.
*   The AI features rely on the Google Gemini API and require a valid API key. If the API key is not provided or is invalid, AI functionalities will not work, and you might see errors or disabled AI buttons. The `lib/gemini.ts` file logs warnings to the console if the API key is missing.