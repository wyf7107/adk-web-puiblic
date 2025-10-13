# Agent Development Kit Web UI (ADK WEB)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![r/agentdevelopmentkit](https://img.shields.io/badge/Reddit-r%2Fagentdevelopmentkit-FF4500?style=flat&logo=reddit&logoColor=white)](https://www.reddit.com/r/agentdevelopmentkit/)

<html>
    <h2 align="center">
      <img src="https://raw.githubusercontent.com/google/adk-python/main/assets/agent-development-kit.png" width="256"/>
    </h2>
    <h3 align="center">
      Agent Development Kit Web is the built-in developer UI that integrated with Google Agent Development Kit for easier agent development and debug.
    </h3>
    <h3 align="center">
      Important Links:
      <a href="https://google.github.io/adk-docs/">Docs</a> &
      <a href="https://github.com/google/adk-samples">Samples</a>.
    </h3>
</html>

Agent Development Kit (ADK) is a flexible and modular framework for developing and deploying AI agents. While optimized for Gemini and the Google ecosystem, ADK is model-agnostic, deployment-agnostic, and is built for compatibility with other frameworks. ADK was designed to make agent development feel more like software development, to make it easier for developers to create, deploy, and orchestrate agentic architectures that range from simple tasks to complex workflows.

ADK web is the built-in dev UI that comes along with adk for easier development and debug.

## ✨ Prerequisite

- **Install [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)**

- **Install [NodeJs](https://nodejs.org/en)**

- **Install [Angular CLI](https://angular.dev/tools/cli)**

- **Install [google-adk (Python)](https://github.com/google/adk-python)** 

- **Install [google-adk (Java)](https://github.com/google/adk-java/)**

- **Clone [adk-web (this repo)](https://github.com/google/adk-web/)**

## 🚀 Running adk web

To be able to run `adk web`, follow the steps from the root of your local
adk-web folder:

### Install dependencies

```bash
sudo npm install
```

### Run adk web

```bash
npm run serve --backend=http://localhost:8000
```

### Run adk api server

In another terminal run:

```bash
adk api_server --allow_origins=http://localhost:4200 --host=0.0.0.0
```

If you see `adk command not found`, then be sure to install `google-adk` (or remember to activate your virtual environment if you are using one)

### Happy development

Go to `localhost:4200` and start developing!

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug reports, feature requests, documentation improvements, or code contributions, please see our

- [General contribution guideline and flow](https://google.github.io/adk-docs/contributing-guide/#questions).
- Then if you want to contribute code, please read [Code Contributing Guidelines](./CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Preview

This feature is subject to the "Pre-GA Offerings Terms" in the General Service Terms section of the [Service Specific Terms](https://cloud.google.com/terms/service-terms#1). Pre-GA features are available "as is" and might have limited support. For more information, see the [launch stage descriptions](https://cloud.google.com/products?hl=en#product-launch-stages).

---

*Happy Agent Building!*

## Updating the Material 3 Theme

To refresh the Material 3 design tokens/colors used by ADK Web:
1. Obtain the exported CSS bundle (containing `tokens.css`, `colors.module.css`, `typography.module.css`, `theme.css`, `theme.light.css`, and `theme.dark.css`).
2. Run `node scripts/sync-material3-theme.mjs "/absolute/path/to/css bundle"` from the repo root.
   - The script copies those files into `src/styles/material3/` and rewrites `_theme-colors.scss` with the new palette tones so Angular Material stays in sync.
3. Rebuild (`npm run build`) to verify the new palette.

Panel colors (e.g. the Configuration panel) resolve through the CSS variables defined in `src/styles.scss:261`–`src/styles.scss:272`. Those map to the Material tokens (e.g. `--md-sys-color-surface-container-high-dark`) in `src/styles/material3/tokens.css`.
