# Features Documentation

This document details the key features implemented in the Circuit Builder MVP.

## Core Features

### 1. Interactive Circuit Canvas
-   **"Matrix" Themed Background:** A dynamic, blue-themed background with falling characters, providing a unique visual experience.
-   **Zoom and Pan:** Users can zoom in and out of the canvas using the mouse wheel and pan across the workspace by clicking and dragging, allowing for detailed work or high-level overviews.
-   **Infinite Workspace:** The canvas provides an expansive area for circuit design.

### 2. Component Management
-   **Drag and Drop Components:** Components can be easily dragged from the sidebar onto the canvas.
-   **Custom Component Creation:** Users can define and add new components with custom names and pin configurations (name, X/Y coordinates).
-   **Live Component Preview:** While creating a new component, a real-time visual preview is displayed, and pin positions can be adjusted by dragging them directly on the preview.
-   **Component Categorization:** Components are organized into categories (microcontrollers, components, modules) for better scalability and organization.
-   **Component Import/Export:** Components can be imported from JSON files and exported as JSON files, facilitating sharing and reusability.

### 3. Wire Manipulation
-   **Component Connection:** Wires can be drawn between component pins to establish connections.
-   **Wire Coloring:** Users can select a color from a palette in the sidebar, and new wires will be drawn with the chosen color, aiding in circuit organization and readability.
-   **Elbow Points:** Double-clicking on a wire adds an "elbow" point, which can be dragged to reshape the wire for cleaner routing.
-   **Wire Deletion:** Wires can be easily removed by right-clicking on them.

### 4. Undo/Redo Functionality
-   **State History:** The application maintains a history of circuit modifications.
-   **Keyboard Shortcuts:** Users can undo (Ctrl/Cmd+Z) and redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z) actions, providing a safety net for design changes.

### 5. Component Gallery
-   **Visual Catalog:** A dedicated page displays all available components in a grid format, each with a visual preview.
-   **Download Option:** Each component in the gallery has a download button, allowing users to export its JSON definition.

### 6. User-Friendly Interface
-   **Collapsible Sidebar:** The component list is housed in a collapsible sidebar, optimizing screen real estate.
-   **Consistent Styling:** The application maintains a consistent visual style across all pages.
