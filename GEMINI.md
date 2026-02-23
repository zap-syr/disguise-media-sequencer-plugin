# Project Overview

This is a **Disguise Designer Plugin** project built with **Vue 3** and **Vite**. It enables the creation of custom user interfaces that interact with the Disguise media server software through a Python API.

The project demonstrates a hybrid architecture where the frontend (Vue.js) communicates with a Python backend running within the Disguise Designer environment. This is achieved using the `@disguise-one/designer-pythonapi` library and a custom Vite loader.

## Key Technologies

-   **Frontend:** Vue.js 3 (Composition API), Vite.
-   **Backend Integration:** `@disguise-one/designer-pythonapi`.
-   **Build Tool:** Vite with `designerPythonLoader`.
-   **Language:** JavaScript (Frontend), Python (Backend Logic).

# Architecture & workflow

1.  **Vue Components:** UI components (e.g., `src/components/TextLayerControl.vue`) import Python modules directly.
2.  **Python Modules:** Python scripts (e.g., `src/hello_world.py`) define functions to control Designer (using `guisystem`). These functions must be listed in `__all__` to be accessible.
3.  **Vite Loader:** The `vite.config.js` includes `designerPythonLoader`, which transforms the Python imports into JavaScript bindings that communicate with the running Designer instance via the network.
4.  **Connection:** The plugin connects to Designer using the address specified in the `director` URL query parameter (defaulting to `localhost:80` for local dev).

# Building and Running

## Prerequisites

-   Node.js and npm installed.
-   Disguise Designer software (for full functionality).

## Scripts

-   **Development Server:**
    ```bash
    npm run dev
    ```
    Starts the local dev server. Open the provided URL in a browser or embed it within Designer. append `?director=<IP>:<PORT>` to the URL to connect to a specific Designer instance.

-   **Build for Production:**
    ```bash
    npm run build
    ```
    Compiles the application into the `dist/` directory.

-   **Preview Build:**
    ```bash
    npm run preview
    ```
    Locally preview the production build.

# Key Files

-   **`vite.config.js`**: Configures Vite, specifically adding the `designerPythonLoader` to handle Python file imports.
-   **`src/App.vue`**: The main application component.
-   **`src/components/TextLayerControl.vue`**: Example component demonstrating how to import and use a Python function (`addTextLayer`).
-   **`src/hello_world.py`**: A Python module exposing the `addTextLayer` function. It uses the `guisystem` API available within Designer.
-   **`package.json`**: Lists dependencies, including `@disguise-one/designer-pythonapi`.

# Development Conventions

-   **Python Exports:** Only functions listed in the `__all__` variable in Python files are exposed to the frontend.
-   **Async Nature:** Calls to Python functions from the frontend are asynchronous and return a Promise.
-   **Context:** The `guisystem` object is available in the Python scope when running within Designer, providing access to `track`, `player`, etc.
