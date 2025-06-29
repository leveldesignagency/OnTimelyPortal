# Event Management & Guest Journey Roadmap

This document outlines the step-by-step plan to wire up the event dashboard, guest journey, and supporting backend/frontend systems for a seamless admin and guest experience. The goal is to make the dashboard and APIs ready for mobile app integration, so the app can easily consume prompts and update the dashboard in real time.

---

## 1. **Data Model & API Enhancements**

### 1.1. **Guest Profile & Journey**
- [ ] Ensure each guest profile includes:
  - Personal info (name, contact, etc.)
  - Linked event ID
  - Itinerary timeline (array of journey checkpoints: flight, security, hotel, etc.)
  - Status for each checkpoint (pending, completed, timestamp, response)
- [ ] Add API endpoints:
  - `GET /guests/:id` (with journey/timeline)
  - `PATCH /guests/:id/checkpoint` (update checkpoint status/response)
  - `GET /event/:eventId/guests` (with journey status summary)

### 1.2. **Event Activity Feed**
- [ ] Create a `notifications` or `activity_feed` table:
  - Event ID, type (milestone, chat, prompt, admin action), message, timestamp, related guest/itinerary
- [ ] API endpoints:
  - `GET /event/:eventId/activity` (paginated, real-time ready)
  - `POST /event/:eventId/activity` (for system/admin/chat events)

### 1.3. **Announcements & Alerts**
- [ ] Table for announcements/alerts:
  - Event ID, message, type (announcement, emergency), recipients, timestamp, status
- [ ] API endpoints:
  - `POST /event/:eventId/announcement` (send to guests)
  - `POST /event/:eventId/emergency-alert` (send to all guests, trigger mobile vibration)

### 1.4. **Logistics & Location Tracking**
- [ ] Extend guest model with last known location, location history
- [ ] API endpoints:
  - `POST /guests/:id/location` (mobile app updates location)
  - `GET /event/:eventId/guests/locations` (for dashboard map/tracking)

### 1.5. **Export Report**
- [ ] API endpoint:
  - `GET /event/:eventId/export` (returns CSV of all event/guest/itinerary data)

---

## 2. **Frontend (Dashboard) Features**

### 2.1. **Live Activity Feed**
- [ ] UI: Real-time feed showing notifications, milestones, chat messages, and guest prompt responses
- [ ] Integrate with `/activity` API (websocket or polling)
- [ ] Filter by type (milestone, chat, prompt, admin)

### 2.2. **Export Report**
- [ ] Button triggers download from `/export` API
- [ ] Show loading/progress, handle errors

### 2.3. **Send Announcement**
- [ ] Button opens modal to compose message
- [ ] Select recipients (all guests, groups, individuals)
- [ ] Call `/announcement` API, show status

### 2.4. **Emergency Alert**
- [ ] Button opens modal to confirm alert
- [ ] Call `/emergency-alert` API
- [ ] (Future) Show alert status, logs

### 2.5. **Track Logistics**
- [ ] Button navigates to logistics page/map
- [ ] Show all guest locations on a map/list
- [ ] Click guest to view journey/timeline

### 2.6. **Flight Status & Checkpoints**
- [ ] Dashboard cards show summary (e.g., flights landed, security passed)
- [ ] Click to drill down to guest list for each checkpoint
- [ ] Show prompt status for each guest

---

## 3. **Guest Journey & Prompt System**

### 3.1. **Prompt Scheduling & Delivery**
- [ ] When admin creates/updates itinerary, generate prompts for each guest (flight, security, hotel, etc.)
- [ ] Store prompts in guest journey/timeline
- [ ] API for mobile app to fetch next prompt(s)
- [ ] API for mobile app to submit prompt responses

### 3.2. **Mobile App Integration**
- [ ] Mobile app fetches guest journey, displays prompts
- [ ] User responds (e.g., "Have you landed yet?")
- [ ] App sends response to backend, updates dashboard in real time
- [ ] App receives announcements, emergency alerts, and chat messages

---

## 4. **Team Chat Integration**
- [ ] Link chat messages to activity feed (if related to event)
- [ ] API for posting/retrieving chat messages
- [ ] Show chat in dashboard and mobile app

---

## 5. **Notifications & Real-Time Updates**
- [ ] Use websockets or Supabase real-time for activity feed, guest status, chat, and alerts
- [ ] Ensure all relevant UI updates instantly for admins and guests

---

## 6. **Admin/Guest Permissions & Security**
- [ ] Ensure only event admins can send announcements, alerts, and edit itineraries
- [ ] Guests can only update their own journey/checkpoints
- [ ] Secure all endpoints and data access

---

## 7. **Testing & QA**
- [ ] Test all flows: event creation, guest journey, prompt delivery, activity feed, exports, alerts
- [ ] Simulate mobile app responses and verify dashboard updates
- [ ] Test permissions and error handling

---

## 8. **Documentation**
- [ ] Document all API endpoints, data models, and flows for mobile app team
- [ ] Provide example payloads and UI screenshots

---

## 9. **Future Enhancements**
- [ ] Analytics dashboard (guest engagement, prompt completion rates)
- [ ] Automated reminders and follow-ups
- [ ] Customizable journey templates
- [ ] Integration with external travel APIs (flight status, hotel check-in)

---

**This roadmap is designed to ensure a seamless, real-time, and mobile-ready event management and guest journey experience. Each step should be tracked and checked off as you build!** 