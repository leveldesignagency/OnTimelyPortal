import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

const MODULES = [
  { key: 'contact', label: 'Host Contact Details' },
  { key: 'reminder', label: 'Reminder (Email/SMS)' },
  { key: 'qr', label: 'QR Code' },
  { key: 'map', label: 'Map' },
  { key: 'file', label: 'File Upload' },
];

type ActivityModule = {
  id: string;
  type: string;
  data: any; // To hold module-specific data
};

type Activity = {
  id: string;
  title: string;
  date: string;
  arrivalTime: string;
  startTime: string;
  endTime: string;
  location: string;
  details: string;
  modules: ActivityModule[];
};

// --- Module Components ---
function HostContactModule({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    const handleInputChange = (field: string, value: string) => {
        onUpdate({ ...data, [field]: value });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Host Contact Details</h4>
            <input 
                placeholder="Name" 
                value={data.name || ''} 
                onChange={(e) => handleInputChange('name', e.target.value)} 
            />
            <input 
                type="email"
                placeholder="Email" 
                value={data.email || ''} 
                onChange={(e) => handleInputChange('email', e.target.value)} 
            />
            <div style={{ display: 'flex', gap: 8 }}>
                <input 
                    placeholder="Code" 
                    value={data.countryCode || ''} 
                    onChange={(e) => handleInputChange('countryCode', e.target.value)} 
                    style={{ flex: 1 }}
                />
                <input 
                    placeholder="Number" 
                    value={data.phone || ''} 
                    onChange={(e) => handleInputChange('phone', e.target.value)} 
                    style={{ flex: 3 }}
                />
            </div>
        </div>
    );
}

function ReminderModule({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    const reminderTimes = [
        { value: 24, label: '24 hours before' }, { value: 8, label: '8 hours before' },
        { value: 4, label: '4 hours before' }, { value: 3, label: '3 hours before' },
        { value: 2, label: '2 hours before' }, { value: 1, label: '1 hour before' },
        { value: 0.75, label: '45 minutes before' }, { value: 0.5, label: '30 minutes before' },
        { value: 0.25, label: '15 minutes before' },
    ];

    const handleCheckboxChange = (timeValue: number, isChecked: boolean) => {
        const currentSelection = data.selectedTimes || [];
        const newSelection = isChecked
            ? [...currentSelection, timeValue]
            : currentSelection.filter((t: number) => t !== timeValue);
        onUpdate({ ...data, selectedTimes: newSelection });
    };
    
    return (
        <div style={{ paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Reminder Notifications</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {reminderTimes.map(time => (
                    <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <input 
                            type="checkbox"
                            checked={data.selectedTimes?.includes(time.value) || false}
                            onChange={(e) => handleCheckboxChange(time.value, e.target.checked)}
                        />
                        {time.label}
                    </label>
                ))}
            </div>
        </div>
    );
}

function QRCodeModule({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    return (
        <div style={{ paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>QR Code</h4>
            <input 
                placeholder="Enter URL" 
                value={data.url || ''} 
                onChange={(e) => onUpdate({ ...data, url: e.target.value })} 
            />
            {/* Basic file input, can be styled later */}
            <div style={{marginTop: 8}}>
                 <label style={{display: 'block', fontSize: 14, color: '#6b7280', marginBottom: 4}}>Or upload image</label>
                 <input type="file" accept="image/png, image/jpeg" />
            </div>
        </div>
    );
}

function FileUploadModule({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    return (
        <div style={{ paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>File Upload</h4>
            <input type="file" />
        </div>
    );
}

function MapModule({ data, onUpdate }: { data: any, onUpdate: (data: any) => void }) {
    const [search, setSearch] = useState(data.search || '');

    const handleConfirm = () => {
        onUpdate({ ...data, search, confirmed: true });
    };

    return (
        <div style={{ paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Map</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input 
                    placeholder="Search for a location"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1 }}
                    disabled={data.confirmed}
                />
                <button onClick={handleConfirm} disabled={data.confirmed}>
                    {data.confirmed ? '✓' : 'Confirm'}
                </button>
            </div>
            <div style={{
                height: 150,
                background: '#e5e7eb',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
            }}>
                Map Preview
            </div>
        </div>
    );
}

const ModulePlaceholder = ({ module, onUpdate }: { module: ActivityModule, onUpdate: (data: any) => void }) => {
    switch (module.type) {
        case 'contact':
            return <HostContactModule data={module.data} onUpdate={onUpdate} />;
        case 'reminder':
            return <ReminderModule data={module.data} onUpdate={onUpdate} />;
        case 'qr':
            return <QRCodeModule data={module.data} onUpdate={onUpdate} />;
        case 'file':
            return <FileUploadModule data={module.data} onUpdate={onUpdate} />;
        case 'map':
            return <MapModule data={module.data} onUpdate={onUpdate} />;
        default:
            const moduleInfo = MODULES.find(m => m.key === module.type);
            return (
                <div style={{
                    padding: 12,
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                }}>
                    {moduleInfo?.label || 'Unknown Module'}
                </div>
            );
    }
}

// --- Main Components ---

function ActivityForm({ activity, onUpdate, onAddModule, onRemoveActivity }: { activity: Activity, onUpdate: (updatedActivity: Activity) => void, onAddModule: (moduleType: string) => void, onRemoveActivity: () => void }) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const moduleType = e.dataTransfer.getData("moduleType");
    if (activity.modules.every(m => m.type !== moduleType)) {
        onAddModule(moduleType);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingOver(false);
  };

  const handleModuleUpdate = (moduleId: string, updatedData: any) => {
      const updatedModules = activity.modules.map(m => 
          m.id === moduleId ? { ...m, data: updatedData } : m
      );
      onUpdate({ ...activity, modules: updatedModules });
  };

  const handleInputChange = (field: keyof Omit<Activity, 'id' | 'modules'>, value: string) => {
    onUpdate({ ...activity, [field]: value });
  };
  
  return (
    <div style={{ position: 'relative', background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
      <button onClick={onRemoveActivity} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>&times;</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Title</label>
            <input placeholder="e.g., Welcome Dinner" value={activity.title} onChange={e => handleInputChange('title', e.target.value)} />
        </div>
        <div>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Date</label>
            <input type="date" value={activity.date} onChange={e => handleInputChange('date', e.target.value)} />
        </div>
        <div>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Location</label>
            <input placeholder="e.g., Grand Ballroom" value={activity.location} onChange={e => handleInputChange('location', e.target.value)} />
        </div>
        <div>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Arrival Time</label>
            <input type="time" value={activity.arrivalTime} onChange={e => handleInputChange('arrivalTime', e.target.value)} />
        </div>
        <div>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Start Time</label>
            <input type="time" value={activity.startTime} onChange={e => handleInputChange('startTime', e.target.value)} />
        </div>
        <div>
            <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>End Time</label>
            <input type="time" value={activity.endTime} onChange={e => handleInputChange('endTime', e.target.value)} />
        </div>
      </div>
      <div style={{marginTop: 16}}>
        <label style={{display: 'block', fontWeight: 500, marginBottom: 8, color: '#374151'}}>Details</label>
        <textarea placeholder="Add any details..." value={activity.details} onChange={e => handleInputChange('details', e.target.value)} style={{ minHeight: 100 }} />
      </div>

      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          marginTop: 24,
          padding: 16,
          border: `2px dashed ${isDraggingOver ? '#4f46e5' : '#d1d5db'}`,
          borderRadius: 8,
          background: isDraggingOver ? '#eef2ff' : '#f9fafb',
          minHeight: 100,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {activity.modules.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6b7280', margin: 0}}>Drag & Drop Modules Here</p>
        ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, width: '100%'}}>
                {activity.modules.map(module => <ModulePlaceholder key={module.id} module={module} onUpdate={(updatedData: any) => handleModuleUpdate(module.id, updatedData)} />)}
            </div>
        )}
      </div>
    </div>
  );
}

export default function CreateItinerary() {
  const { eventId } = useParams();
  const [activities, setActivities] = useState<Activity[]>([
    { id: `act_${Date.now()}`, title: '', date: '', arrivalTime: '', startTime: '', endTime: '', location: '', details: '', modules: [] }
  ]);

  const handleAddNewItem = () => {
    setActivities(prev => [...prev, { id: `act_${Date.now()}`, title: '', date: '', arrivalTime: '', startTime: '', endTime: '', location: '', details: '', modules: [] }]);
  };
  
  const handleRemoveActivity = (activityId: string) => {
      if (activities.length > 1) {
          setActivities(prev => prev.filter(act => act.id !== activityId));
      }
  }

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setActivities(prev => prev.map(act => act.id === updatedActivity.id ? updatedActivity : act));
  }
  
  const handleAddModuleToActivity = (activityId: string, moduleType: string) => {
    setActivities(prev => prev.map(act => {
        if(act.id === activityId) {
            const newModule: ActivityModule = { id: `mod_${Date.now()}`, type: moduleType, data: {} };
            return { ...act, modules: [...act.modules, newModule] };
        }
        return act;
    }));
  }
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, moduleKey: string) => {
      e.dataTransfer.setData("moduleType", moduleKey);
  }

  return (
    <div style={{ display: 'flex', width: '100%', background: '#f9fafb' }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '40px 48px', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>Create Itinerary</h1>
                <p style={{ color: '#6b7280', marginTop: 4 }}>For event: {eventId}</p>
            </div>
            <div style={{display: 'flex', gap: 12}}>
                 <button className="secondary">Upload from CSV</button>
                 <button className="primary" onClick={handleAddNewItem}>Add New Item</button>
            </div>
        </div>
        
        {activities.map(activity => (
            <ActivityForm 
                key={activity.id} 
                activity={activity} 
                onUpdate={handleUpdateActivity}
                onAddModule={(moduleType) => handleAddModuleToActivity(activity.id, moduleType)}
                onRemoveActivity={() => handleRemoveActivity(activity.id)}
            />
        ))}
      </div>

      {/* Modules Sidebar */}
      <div style={{ width: 320, background: '#1f2937', padding: '40px 24px', height: 'calc(100vh - 60px)', position: 'sticky', top: '60px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: '#f9fafb' }}>Modules</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map(module => (
            <div 
                key={module.key} 
                draggable 
                onDragStart={(e) => handleDragStart(e, module.key)}
                style={{ 
                    padding: '12px 16px', 
                    background: '#fff', 
                    color: '#1f2937',
                    border: '1px solid #d1d5db',
                    borderRadius: 8, 
                    cursor: 'grab',
                    fontWeight: 500
                }}
            >
              {module.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 