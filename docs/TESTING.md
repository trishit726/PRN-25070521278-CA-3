# Testing

Run `npm test` from the root for the Node.js smoke checks. They do not connect to or modify any MongoDB database.

For an end-to-end manual pass, start MongoDB Community Server, copy the server environment template, seed a local `labops` database, and run both applications. Sign in as the demo student, request an available asset for a future time, sign in as admin to approve it, verify the notification as the student, report a fault, process it as a technician, then inspect the refreshed dashboard as admin.

For API checks, use the examples in [API.md](API.md) and set the Postman bearer token after login. If adding automated integration tests, use a dedicated database name such as `labops_test`; never run cleanup against `labops` or another developer database. The current automated checks are smoke checks, not full authentication or workflow integration coverage.
