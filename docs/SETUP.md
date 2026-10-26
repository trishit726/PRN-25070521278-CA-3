# Local setup

## MongoDB Community Server

Install MongoDB Community Server for Windows and start its Windows service. Keep the default local port `27017`, or update `MONGO_URI` in `server/.env` if you chose another host or port.

## MongoDB Compass

Install Compass separately, open a new connection, and enter `mongodb://127.0.0.1:27017`. Compass is an inspection client; the MongoDB Community Server must be running independently. The `labops` database will be visible once the application has created data.

## LabOps

Copy `server/.env.example` to `server/.env`, replace `JWT_SECRET` with a long random value, install dependencies from the project root using `npm run install:all`, then start both processes with `npm run dev`. The frontend uses port 5173 and the API uses port 5000.

Atlas is supported by setting `MONGO_URI` to the Atlas connection string. Keep credentials in the ignored `server/.env` file and never commit it.
