# University Visitor Management System

A comprehensive and modern web-based visitor management system for tracking check-ins, check-outs, and monitoring campus access.

## Features
- **Real-time Dashboard:** Live activity monitoring of the campus gates.
- **Active Visitors:** Track detailed profiles of visitors currently inside the premises.
- **Queue Management:** Efficiently manage check-in and check-out requests.
- **Access Logs:** Comprehensive, searchable database of historical campus entry and exit data.
- **PDF Export:** Generate professional visitor reports.
- **Responsive Design:** Optimized for both mobile and desktop platforms.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend:** Node.js, Express, MySQL

## Setup & Run

### Prerequisites
- Node.js installed
- MySQL Server

### 1. Database Setup
Create a MySQL database and update the connection settings in the `backend/.env` file.

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend
The system has two apps: security-app and visitor-app.
```bash
cd frontend/security-app
npm install
npm run dev
```

## Screenshots

### System Overview
![Screenshot 1](SS/Screenshot%202026-06-06%20104705.png)

### Dashboard & Active Visitors
![Screenshot 2](SS/Screenshot%202026-06-06%20104731.png)

### Check-in Requests
![Screenshot 3](SS/Screenshot%202026-06-06%20104841.png)

### Check-out Verification
![Screenshot 4](SS/Screenshot%202026-06-06%20104930.png)

### Visitor Archive
![Screenshot 5](SS/Screenshot%202026-06-06%20105006.png)
