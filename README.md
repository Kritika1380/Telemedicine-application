# Nabha Connect — Local Demo

This workspace contains a single-page front-end (`index.html`) with premium styling and a minimal Node.js Express backend (`server.js`) to demonstrate login, dashboard data, and symptom submission.

Prerequisites
- Node.js 14+ installed

Install & Run (PowerShell)
```powershell
cd 'c:\Users\Admin\Music\nabha connect'
npm install
npm start
# open http://localhost:3000 in your browser
```

Notes
- This demo uses a mock backend (in `server.js`) for demonstration only. It does not include authentication, database persistence, or production-grade security.
- Login accepts any email/password and returns a mock token. If the email contains `doctor` or `admin` the server returns that role.

Next steps (suggestions)
- Add persistent database (MongoDB/Postgres) and secure password hashing.
- Integrate real video conferencing (WebRTC) and secure media servers.
- Add user management, encrypted medical records, and HIPAA-compliant auditing.
