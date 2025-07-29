# Routes Documentation

This document outlines the API endpoints and static file serving routes used in the Circuit Builder application.

## Server (`src/server.js`)

The Express.js server handles both serving static HTML/CSS/JS files and providing API endpoints for circuit and component data.

### Static File Serving

-   **`/`**: Serves the main circuit builder application (`public/index.html`).
-   **`/add-component.html`**: Serves the page for adding new components.
-   **`/gallery.html`**: Serves the component gallery page.
-   **`/public/*`**: Serves all other static assets (CSS, client-side JavaScript, etc.) from the `public` directory.

### API Endpoints

#### Components API

-   **`GET /api/components`**
    -   **Description:** Retrieves a consolidated list of all available components.
    -   **Response:** A JSON array of component objects. Each component object includes `name` and `pins` (an array of pin objects with `name`, `x`, and `y` coordinates).
    -   **Example Response:**
        ```json
        [
          {
            "name": "Arduino",
            "pins": [
              { "name": "D0", "x": 0.1, "y": 0 },
              { "name": "D1", "x": 0.3, "y": 0 }
            ]
          },
          {
            "name": "Resistor",
            "pins": [
              { "name": "A", "x": 0, "y": 0.5 },
              { "name": "B", "x": 1, "y": 0.5 }
            ]
          }
        ]
        ```

-   **`POST /api/components`**
    -   **Description:** Adds a new component to the registry. The component data is saved as a new JSON file within the appropriate subdirectory (`microcontrollers`, `components`, or `modules`) inside the `components/` directory.
    -   **Request Body (JSON):**
        ```json
        {
          "name": "NewComponent",
          "type": "components", // or "microcontrollers", "modules"
          "pins": [
            { "name": "Pin1", "x": 0.1, "y": 0.2 },
            { "name": "Pin2", "x": 0.8, "y": 0.9 }
          ]
        }
        ```
    -   **Response:** Returns the saved component data with a `201 Created` status on success, or a `500 Internal Server Error` on failure.

#### Circuits API

-   **`GET /api/circuits`**
    -   **Description:** Retrieves a list of all saved circuits.
    -   **Response:** A JSON array of circuit objects. (Currently, this endpoint returns the content of `circuits.json` directly).

-   **`POST /api/circuits`**
    -   **Description:** Saves a new circuit. The circuit data is appended to the `circuits.json` file.
    -   **Request Body (JSON):**
        ```json
        {
          "name": "My New Circuit",
          "nodes": [
            // array of node objects
          ],
          "connections": [
            // array of connection objects
          ]
        }
        ```
    -   **Response:** Returns the saved circuit data with a `201 Created` status on success, or a `500 Internal Server Error` on failure.
