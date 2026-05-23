# Safety Net

A personal safety mobile app for iOS and Android that lets users check in before risky activities. If they don't mark themselves safe before the deadline, the app automatically SMS-alerts their emergency contacts with their GPS location.

## The Problem

People doing potentially risky activities alone (hiking, travelling, late nights out) need a way to ensure someone knows if something goes wrong — without bothering their contacts unless there's actually a problem.

## The Solution

Safety Net lets users:
- Set timed safety check-ins (1h, 2h, 4h, 8h, 12h windows)
- Add emergency contacts with phone numbers
- Track countdown to deadline with live timer
- Automatically send GPS location via SMS to contacts if deadline is missed

## Tech Stack

**Frontend (Mobile)**
- React Native + Expo
- User authentication (sign up/sign in/sign out)
- GPS location capture using Expo Location
- Live countdown timer
- Emergency contacts manager

**Backend (Server)**
- Node.js server
- Supabase (Postgres + authentication)
- node-cron for scheduled jobs detecting missed check-ins
- Twilio API for automated SMS alerts

## Built With

Built using an AI-first workflow with Claude Code and Cursor — co-designing the system architecture with AI agents before writing code, demonstrating modern agentic engineering practices.

## Why I Built This

Created to explore full-stack mobile development, third-party API integration, and scheduled background jobs while solving a real safety problem. Also served as hands-on learning for AI-assisted development workflows.