# Circuit Builder MVP

This is a Minimum Viable Product (MVP) for a web-based circuit builder application. It allows users to design simple circuits by dragging and dropping components, connecting them with wires, and managing a library of custom components.

## Features

- **Interactive Circuit Canvas:** A dynamic canvas with a "Matrix"-themed background, supporting zoom and pan.
- **Component Management:** Add, view, and manage custom components with definable pins.
- **Wire Manipulation:** Connect components with wires, change wire colors, add elbow points for routing, and delete wires.
- **Undo/Redo:** Keyboard shortcuts for undoing and redoing actions on the canvas.
- **Component Gallery:** A dedicated page to browse and download existing components.
- **Component Import/Export:** Import components from JSON files and export existing components.

## Getting Started

To run this application locally:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Server:**
    ```bash
    node src/server.js
    ```

Once the server is running, open your web browser and navigate to `http://localhost:42389`.

## Documentation

For more detailed information about the application's structure, pages, routes, and features, please refer to the markdown files in the `docs/` directory:

-   [Pages Documentation](docs/pages.md)
-   [Routes Documentation](docs/routes.md)
-   [Features Documentation](docs/features.md)
