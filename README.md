# SMAT Workspace

MATLAB-style browser workspace with Node.js/Express backend.

## Run locally

npm install
npm start

Then open http://localhost:3000

## Docker

docker build -t smat-workspace .
docker run -p 3000:3000 smat-workspace

## Back4app

Deploy the repository root as a Docker container. The Dockerfile is in the repository root and the application listens on the PORT environment variable.
