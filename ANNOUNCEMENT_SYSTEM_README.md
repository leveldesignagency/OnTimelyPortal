# Announcement System

## Overview
The announcement system allows event organizers to send announcements to guests via the mobile app. Announcements can be sent immediately or scheduled for a specific time.

## Features

### Desktop App (EventDashboard)
- **Glassmorphic UI**: Modern glassmorphic design with Timely green colors
- **Send Options**: 
  - "Send Now" - Immediate delivery
  - "Set Time" - Schedule for specific time using custom time picker
- **Content Types**:
  - Title (required)
  - Description (optional)
  - Image upload (optional)
  - Link URL (optional)
- **X Button**: Positioned outside container at top right of screen

### Mobile App
- **Global Modal**: Black overlay with announcement details
- **Chat Integration**: Announcements appear as chat items at bottom of Messages tab
- **Push Notifications**: Sent when app is in background
- **Image Expansion**: Click images to view full-screen
- **Real-time Updates**: New announcements appear immediately

## Database Schema

```sql
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Technical Implementation

### Desktop Components
- `AnnouncementModal.tsx`: Main modal with glassmorphic styling
- Custom time picker with hour/minute selection
- Image upload to Supabase Storage
- Scheduling logic with automatic date handling

### Mobile Components
- `GlobalAnnouncementModal.tsx`: Full-screen announcement display
- `AnnouncementChatItem.tsx`: Chat message rendering
- `announcementService.ts`: Real-time subscription and data fetching

### Edge Functions
- `send-scheduled-announcements`: Processes scheduled announcements
- Should be triggered by cron job every minute

## Usage Flow

1. **Create Announcement**:
   - Event organizer opens "Send Announcement" modal
   - Fills in title, description, image, link (optional)
   - Chooses "Send Now" or "Set Time"
   - If scheduled, selects time using custom picker
   - Submits announcement

2. **Immediate Delivery**:
   - Announcement saved with `sent_at` timestamp
   - Real-time subscription triggers mobile app updates
   - Push notifications sent to all guests

3. **Scheduled Delivery**:
   - Announcement saved with `scheduled_for` timestamp
   - Edge function processes scheduled announcements
   - Updates `sent_at` when processed
   - Triggers same mobile app updates

4. **Mobile Reception**:
   - Global modal appears over any screen (except login)
   - Announcement added to chat as new entry
   - Push notification if app in background

## Styling

### Color Scheme
- **Primary**: Timely green (#22c55e)
- **No blue colors**: Replaced with green variants
- **Glassmorphic**: Blur effects and transparency

### Button Styles
- Glassmorphic borders and backgrounds
- Consistent 48px height
- Hover effects and transitions

## Future Enhancements
- Cron job setup for scheduled announcements
- Push notification service integration
- Announcement analytics and tracking
- Bulk announcement scheduling 