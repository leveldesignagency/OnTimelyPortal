# Add Ons Module Architecture

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 
 
 
 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 
 
 
 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 
 
 
 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 

## Overview
The Add Ons system allows agencies to enable/disable modular features ("add-ons") for each event. These add-ons are available to guests in the mobile app, and are managed via a drag-and-drop interface in the desktop app.

## UI/UX
- **Sidebar (Right):**
  - Shows all available add-ons as small, draggable modules (icon + name).
- **Main Area (Drop Zone):**
  - Drag modules from the sidebar into the drop zone to activate them for the event.
  - Active add-ons are displayed as full, styled cards (AddOnCard) with title, description, and a placeholder for future images/mockups.
  - Only active add-ons appear as cards in the main area.

## Data Flow
- **Active Add-Ons:**
  - Maintained in the event's `activeModules.addons` array (in state and in Supabase).
  - When a module is dropped, its key is added to this array.
  - When removed, its key is removed from the array.
- **Supabase Storage:**
  - Use the `saveEventAddOns(eventId, addOnKeys)` function to persist the active add-ons for each event.

## Backend Hooks
- `saveEventAddOns(eventId, addOnKeys)`
  - Stores the list of enabled add-ons for an event in Supabase.
  - (Implementation is currently commented out; see code for details.)

## Mobile App Integration
- **Activation Hook:**
  - The mobile app should call a function like `activateAddOnsForGuest(eventId, guestId)` on event startup.
  - This function fetches the enabled add-ons for the event and installs/unlocks the corresponding modules in the guest's mobile app profile.
  - (A placeholder function is included and commented out in the code.)

## AddOnCard Component
- Used to render each active add-on in the main area.
- Displays:
  - Title
  - Description
  - Empty right section for future images/mockups
- Glassmorphic styling for consistency with the app's design.

## Extending the System
- To add new add-ons, update the `DASHBOARD_MODULES.addons` array and ensure the sidebar and AddOnCard logic use the new entries.
- To add images/mockups, pass them as children to the AddOnCard or update the component as needed.

## Example Usage
```
<AddOnCard
  title="Flight Tracker"
  description="Track real-time flight status and updates for all guests."
/>
```

## Notes
- The drag-and-drop logic and sidebar are already implemented; only the drop zone UI and card rendering were updated.
- All backend and mobile integration points are ready for future development. 
 
 
 
 