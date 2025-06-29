# Time-Driven Guest Timeline & Prompt System: Architecture & Rationale

## Why This Structure Is Better

- **Timeline-Driven:**  Every guest has a timeline (array of events/prompts) that is purely time-based. The mobile app just reads the next item(s) based on the current time.
- **Flexible:**  If a guest doesn't have a flight or hotel, their timeline just skips those prompts and moves to the next scheduled item (e.g., itinerary, meeting, dinner).
- **Reusable:**  Guests sharing the same itinerary can have their timelines generated from the same template, but each timeline is still unique and can be adjusted individually.
- **Minimal Logic in the App:**  The app doesn't need to know about "flight" or "hotel"—it just displays whatever is next in the timeline, and the backend/admin controls the content and timing.
- **Easy to Extend:**  You can add new types of prompts or events (e.g., "Go to registration desk", "Join welcome call") without changing the app logic.

---

## How to Implement This (Backend-First)

### 1. Timeline Data Model
- Each guest has a `timeline` array (JSONB in Supabase) with items like:
  ```json
  [
    {
      "type": "prompt",
      "label": "Have you landed yet?",
      "scheduledTime": "2024-07-10T14:30:00Z",
      "status": "pending",
      "response": null
    },
    {
      "type": "itinerary",
      "label": "Welcome Dinner",
      "scheduledTime": "2024-07-10T19:00:00Z",
      "status": "pending"
    }
  ]
  ```
- Timeline items can be generated from flight/hotel/itinerary data, or just from itinerary if that's all that's provided.

### 2. Timeline Generation Algorithm
- When the admin creates/updates a guest or itinerary:
  - Gather all relevant data (flight, hotel, itinerary items).
  - For each, create a timeline item with a scheduled time.
  - If a field is missing (e.g., no flight), just skip that prompt.
  - Save the timeline to the guest's profile.

### 3. Mobile App Logic
- The app fetches the guest's timeline by their unique ID.
- It displays the next item(s) based on the current time and item status.
- When the user responds to a prompt, the app updates the status/response in Supabase.

### 4. Shared Itineraries
- If multiple guests share an itinerary, generate their timelines from the same source, but each guest's timeline is stored separately (so it can be updated individually if needed).

---

## Benefits
- **No hard dependencies:** If a guest doesn't have a flight, the app still works.
- **Admin control:** Admins can add, remove, or reorder timeline items as needed.
- **Simple mobile logic:** The app just shows the next thing in the timeline, no matter what it is.

---

## Next Steps
1. **Update the backend timeline generation to be purely time-driven.**
2. **Ensure the timeline is always generated and updated when guest/itinerary data changes.**
3. **Document this approach for both admin and mobile app teams.**

---

## Example Timeline Item Structure

```json
{
  "type": "prompt", // or "itinerary", "notification", etc.
  "label": "Have you landed yet?",
  "scheduledTime": "2024-07-10T14:30:00Z",
  "status": "pending", // or "responded", "skipped"
  "response": null // or string
}
```

---

**This architecture is ready to be referenced for both backend and frontend implementation.** 