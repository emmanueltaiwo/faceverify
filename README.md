# FaceVerify

## Overview
This project gives you a super slick way to do real-time face verification right in your browser, using just your webcam. It guides users through a series of interactive steps to confirm their identity, making it perfect for demonstrating KYC-style authentication flows or simply adding a cool biometric check to an app.

## Features
-   **Live Camera Feed**: Shows your webcam's output so you can see yourself during the verification process.
-   **Intuitive Face Tracking**: Uses a dynamic on-screen overlay to help you position your face correctly for detection.
-   **Guided Verification Steps**: Walks you through a sequence of actions like looking straight, turning your head left and right, opening your mouth, and blinking.
-   **Progress Monitoring**: Keeps you updated on your verification journey with a clear, visual progress bar.
-   **Dynamic UI Feedback**: Gives you immediate visual cues on face detection status, current instruction, and environmental conditions like low light.
-   **Secure Authentication Codes**: Generates a unique, short authentication code once your identity is successfully verified.
-   **Responsive Design**: Built to look and work great on any device, from a large monitor to a phone screen.

## Getting Started
### Installation
To get this project up and running on your local machine, follow these steps:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/emmanueltaiwo/faceverify.git
    cd faceverify
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables
This project primarily operates client-side and doesn't require any custom environment variables for its core functionality. It does include Vercel Analytics, which typically configures itself automatically when deployed on Vercel.

## Usage
Once you've installed the dependencies, you can start the development server:

```bash
npm run dev
# or
yarn dev
```

Then, open your browser and navigate to [http://localhost:3000](http://localhost:3000). The application will ask for permission to access your camera. Grant it, and you'll be ready to start the face verification process. Just follow the instructions that pop up on the screen!

## Technologies Used
| Technology | Description |
| :--------- | :---------- |
| Next.js | A React framework that helps build incredibly fast and scalable web applications. |
| React | The popular JavaScript library for crafting engaging user interfaces. |
| TypeScript | Adds static type definitions to JavaScript, making the codebase more robust and maintainable. |
| Tailwind CSS | A utility-first CSS framework that speeds up UI development with pre-built classes. |
| MediaPipe | Google's open-source machine learning framework, used here for on-device face detection and landmark tracking. |
| Vercel Analytics | Provides insightful performance and usage analytics for applications hosted on Vercel. |
| Motion (Framer) | A production-ready animation library for React, making UI transitions smooth and fluid. |

## Contributing
Thinking about contributing? That's awesome! Whether it's a bug fix, a new feature, or improving documentation, your help is welcome.

1.  **Fork the repository**.
2.  **Create a new branch** for your specific changes: `git checkout -b feature/your-awesome-feature`.
3.  **Make your changes**, making sure they match the project's existing style and quality standards.
4.  **Test your changes** thoroughly to catch any regressions.
5.  **Commit your changes** with a clear, concise message describing what you did.
6.  **Push your branch** to your forked repository.
7.  **Open a pull request** against the `main` branch of this repository, detailing your changes and why you think they're a great addition.


## Author Info
*   **LinkedIn**: [emmanueloluwafunso](https://www.linkedin.com/in/emmanueloluwafunso)
*   **X (formerly Twitter)**: [@ez0xai](https://x.com/ez0xai)
*   **Portfolio**: [emmanueltaiwo.dev](https://emmanueltaiwo.dev)
