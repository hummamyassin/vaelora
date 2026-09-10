# Repository Guidelines

## Product & V1 Scope

VAELORA is a weather-aware outdoor activity recommendation web application for Greater Amman, Jordan. Help users decide where to run or walk, when to go, which area fits their needs, and why. The core is recommendations, not a generic weather dashboard or places map. V1 supports running and walking only, with forecasts for today and tomorrow. Aim for a polished, technically credible, finishable first serious portfolio project.

## Activity-Area Data

Research approximately 30–35 candidate areas; launch only sufficiently supported or verified locations, with no mandatory count. Prefer real, identifiable outdoor activity areas over vague neighborhoods. Model names, coordinates, districts, supported activities, environment types, terrain, surfaces, running/walking suitability, verification status, and sources/evidence. Preserve uncertainty; never invent locations or evidence.

## Recommendation Architecture

Follow: User Intent → Location Eligibility → Activity Fit → Environmental Conditions → Best Time → Top Matches.

Parse activity, time, and preferences; filter eligible locations; retrieve hourly environmental data; calculate activity-specific suitability; find best time windows; handle near-ties; return Top Matches. Treat location characteristics and user constraints as first-class inputs alongside weather.

Keep the engine deterministic, configurable, testable, and independent from the LLM. Potential environmental inputs: temperature, apparent temperature, humidity, wind speed, precipitation probability, UV index, and AQI when reliable.

## AI Boundaries

Use one focused Outdoor Recommendation Agent to extract structured constraints and invoke real tools. AI orchestrates; the engine calculates and ranks. AI must never invent scores, weather, or locations. Expose only a safe factual action trace: activity detected, constraints extracted, eligible locations found, weather retrieved, scores calculated, best time evaluated, and matches returned. Never expose hidden chain-of-thought.

## Engineering & Validation

Intended stack: Next.js, TypeScript, Tailwind CSS, MapLibre with OpenStreetMap, a weather API (initially evaluating Open-Meteo), an AI API with tool calling, automated tests, Vercel, and Git/GitHub. Add Supabase/PostgreSQL only if justified. Separate UI, data access, recommendation logic, weather integration, maps, and AI orchestration. Test eligibility, scoring, time windows, and near-ties. No application, tooling, or commands exist yet; document actual commands when established. Never commit secrets.

## Incremental Development & Exclusions

Proceed incrementally: architecture → validation → data → weather service → recommendation engine → interface/map → AI agent → testing/evaluation → deployment. Never build everything in one pass. Current authorization covers this guide only: no installation, application generation, or feature coding.

Exclude unless explicitly requested: hiking, authentication, social/community features, a second AI agent, notifications, GPX route database, nationwide coverage, multi-turn AI memory, wearables, CMS, WebSockets, and unnecessary infrastructure.
