# AI Job Portal — Intelligent Recruitment Platform

A full-stack job marketplace that connects job seekers and recruiters through role-based dashboards, job management, applications, resume handling, and AI-assisted recommendations.

## Overview

The platform provides separate experiences for **administrators**, **recruiters**, and **job seekers**. Authentication is JWT-based, while the backend exposes REST APIs consumed by the React frontend.

## Features

### Job seekers

- Account registration and authentication
- Job browsing
- Personalized job recommendations
- Resume management
- Application tracking and application details
- Profile management

### Recruiters

- Recruiter dashboard
- Create and manage job listings
- View job details
- Review applicants
- Manage recruitment workflows

### Administrators

- User management
- Job management
- Application management
- Administrative dashboard

## AI & Document Processing

The backend includes Google Gemini integration and document-processing dependencies for resume-oriented workflows. Resume uploads support PDF, DOC/DOCX, and TXT formats with a configured 10 MB upload limit.

## Tech Stack

- **Frontend:** React 18, React Router, Axios, Vite
- **Backend:** Django 4.2+, Django REST Framework
- **Authentication:** Simple JWT
- **Database:** PostgreSQL
- **AI:** Google GenAI / Gemini
- **Documents:** PyPDF2, python-docx
- **Production:** Gunicorn, WhiteNoise

## Architecture

```text
ai_jobPortal/
├── backend/
│   ├── core/
│   │   ├── users/          # User accounts and roles
│   │   ├── jobs/           # Job listings
│   │   ├── applications/   # Job applications
│   │   ├── resumes/        # Resume workflows
│   │   └── matching/       # Matching / recommendation logic
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Shared layouts and UI
│   │   └── pages/          # Admin, recruiter and seeker views
│   └── package.json
├── .env.example
└── README.md
```

## Authentication & Security

- JWT authentication with short-lived access tokens and refresh tokens
- Authenticated API permissions by default
- Role-restricted admin, recruiter, and seeker routes
- Environment-based secrets and database configuration
- Configurable upload validation and size limits

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Configure the environment using `.env.example` before running the application.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## Environment Variables

The project provides `.env.example` with configuration for Django, PostgreSQL, the Gemini API, allowed hosts, and the frontend API URL. Never commit real secrets or production credentials.

## Project Status

The repository contains a functional multi-role application structure with dedicated admin, recruiter, and job-seeker workflows. Deployment and environment-specific settings should be configured separately for production.

## License

No license file is currently defined in the repository. Please contact the repository owner for reuse or licensing questions.
