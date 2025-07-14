<p align="center">
  <img src="public/pwlogo-full.png" alt="Pitwall.me Logo" width="400"/>
</p>

# Pitwall.me

**Pitwall.me** is a customizable, real-time Formula 1 timing and telemetry dashboard designed to provide the kind of compact, data-rich dashboard you'd find on a race engineer's console. This project is the frontend application, built with Vue 3 and Vite. I took it on as a fun pet project to play around with Vue and also because I really wanted a site like this but was unable to find one. 

The backend data provider is a separate project: [kikkia/pitwall-drs](https://github.com/kikkia/pitwall-drs).

## Features

*   **Real-time Data**: Connects to the DRS (data relay stream) to stream live F1 timing and telemetry data.
*   **Extensive Widget Library**: A wide variety of widgets to display different stats around, car telemetrety, timing, tyre strategy, etc.
*   **Customizable Layouts**: Drag, drop, and resize widgets to create the perfect dashboard for your needs.
*   **Multi-Page Support**: Create multiple dashboard pages to organize your widgets for different race sessions or scenarios.
*   **Replay System**: Replay timing data from past F1 sessions, perfect for testing layouts or reliving a race.
*   **Import/Export**: Save and share your custom layouts with others.

## Getting Started
Just go to [pitwall.me](https://pitwall.me) and create your own pitwall dashboard.

### Prerequisites for running it yourself

*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [npm](https://www.npmjs.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/kikkia/f1-timings-vue.git
    cd f1-timings-vue
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Configure the backend connection:**
    Create a `.env.development` file in the root of the project and add the following line, pointing to your running instance of the [pitwall-drs](https://github.com/kikkia/pitwall-drs) backend:
    ```
    VITE_API_BASE_URL=http://localhost:8080
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build of the application, run:

```sh
npm run build
```

This will create a `dist` directory with the compiled and minified assets.

### Docker
There is also a new docker image built for every commit you can use.

## Technology Stack

*   **Framework**: [Vue 3](https://vuejs.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **State Management**: [Pinia](https://pinia.vuejs.org/)
*   **Routing**: [Vue Router](https://router.vuejs.org/)
*   **UI Components**: [PrimeVue](https://primevue.org/)
*   **Dashboard Grid**: [GridStack.js](https://gridstackjs.com/)

## Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please feel free to open an issue or submit a pull request.
