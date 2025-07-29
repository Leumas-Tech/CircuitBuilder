# Pages Documentation

This document outlines the different HTML pages within the Circuit Builder application.

## 1. Main Circuit Builder Page (`public/index.html`)

This is the primary interface for building circuits. It features:

-   **Interactive Canvas:** A large drawing area with a blue "Matrix"-themed background, supporting zoom and pan functionality.
-   **Collapsible Sidebar:** Located on the left, this sidebar contains a list of available components that can be dragged onto the canvas.
-   **Wire Management:** Users can connect components with wires, change wire colors, add and drag elbow points for precise routing, and delete wires by right-clicking.
-   **Undo/Redo:** Keyboard shortcuts (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z for redo) are available for circuit modifications.
-   **Navigation:** Buttons in the sidebar provide quick access to the "Add Component" page and the "Component Gallery".

## 2. Add Component Page (`public/add-component.html`)

This page allows users to create and add new custom components to the registry. Key features include:

-   **Component Details Form:** Fields for entering the component's name and type (microcontroller, component, or module).
-   **Dynamic Pin Configuration:** Users can add multiple pins, specifying their names and relative X/Y coordinates.
-   **Live Preview:** A canvas displays a real-time visual representation of the component as it's being defined, with draggable pins for easy positioning.
-   **JSON Import:** Ability to import component definitions from a JSON file, populating the form automatically.
-   **Saved Components List:** Displays a list of all components currently saved in the system.

## 3. Component Gallery Page (`public/gallery.html`)

This page serves as a visual catalog of all available components. It provides:

-   **Component Grid:** Components are displayed in a responsive grid, each with its name and a small visual preview.
-   **Download/Export:** Each component card includes a "Download" button, allowing users to export the component's JSON definition.
-   **Navigation:** Links back to the main builder page and the "Add Component" page.
