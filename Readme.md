# SatinScroll.js

A universal, zero-dependency buttery-smooth inertia scrolling library designed for modern web applications.

Created by **AbdulAziz Memon** (CEO of **Xantrail Studio**).

## Features

-   **Universal Inertia Engine:** Smooth physics-based damping (`lerp`) across mouse wheels, trackpads, and touch screens.
    
-   **Precision Anchor Jumps:** Clicking any local anchor link (`<a href="#section">`) glides smoothly to the target in an exact 2-second timeframe.
    
-   **Custom Smart Scrollbar:** Injects a lightweight scrollbar track that automatically hides on short viewports and prevents layout crashes.
    
-   **Internal Scroller Safe:** Automatically detects internal scrollable elements (modals, chat boxes, dropdowns) and lets them scroll natively without hijacking.
    
-   **Dynamic Layout Support:** Built-in `ResizeObserver` detects infinite scrolling, AJAX content loads, and expanding text instantly.
    
-   **Zero Memory Leaks:** Clean `.destroy()` method that completely detaches all event listeners, animation loops, and DOM injections.
    

## Quick Start

Include `satinscroll.js` right before the closing `</body>` tag of your HTML file:

HTML

```
<script src="satinscroll.js"></script>

```

## Configuration Options

You can customize SatinScroll upon initialization if you prefer manual setup:

JavaScript

```
const scroller = new SatinScroll({
    lerp: 0.1,             // Scroll inertia dampening
    wheelMultiplier: 1,    // Wheel speed
    touchMultiplier: 1.5,  // Touch mobile speed
    keyMultiplier: 120,    // Arrow key distance
    anchorDuration: 2000   // Duration in ms for anchor/button jumps
});

```

## Author

Created by **AbdulAziz Memon** (CEO of **Xantrail Studio**).

## License

Distributed under the MIT License.
SatinScroll.js
A universal, zero-dependency buttery-smooth inertia scrolling library designed for modern web applications.

Created by AbdulAziz Memon (CEO of Xantrail Studio).

Features
Universal Inertia Engine: Smooth physics-based damping (lerp) across mouse wheels, trackpads, and touch screens.

Precision Anchor Jumps: Clicking any local anchor link (<a href="#section">) glides smoothly to the target in an exact 2-second timeframe.

Custom Smart Scrollbar: Injects a lightweight scrollbar track that automatically hides on short viewports and prevents layout crashes.

Internal Scroller Safe: Automatically detects internal scrollable elements (modals, chat boxes, dropdowns) and lets them scroll natively without hijacking.

Dynamic Layout Support: Built-in ResizeObserver detects infinite scrolling, AJAX content loads, and expanding text instantly.

Zero Memory Leaks: Clean .destroy() method that completely detaches all event listeners, animation loops, and DOM injections.

Quick Start
Include satinscroll.js right before the closing </body> tag of your HTML file:

HTML

<script src="satinscroll.js"></script>

Configuration Options
You can customize SatinScroll upon initialization if you prefer manual setup:

JavaScript

const scroller = new SatinScroll({
    lerp: 0.1,             // Scroll inertia dampening
    wheelMultiplier: 1,    // Wheel speed
    touchMultiplier: 1.5,  // Touch mobile speed
    keyMultiplier: 120,    // Arrow key distance
    anchorDuration: 2000   // Duration in ms for anchor/button jumps
});

Author
Created by AbdulAziz Memon (CEO of Xantrail Studio).

License
Distributed under the MIT License.

Markdown 1790 bytes 225 words 57 lines Ln 57, Col 34HTML 1382 characters 209 words 28 paragraphs