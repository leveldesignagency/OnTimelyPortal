import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import countryList from 'country-list';
import { codes as countryCallingCodes } from 'country-calling-code';
import { ThemeContext } from './ThemeContext';

// Re-defining necessary components and data here to avoid complex imports

const GUEST_MODULES_CONFIG = [
  { key: 'flightNumber', label: 'Flight Tracker', type: 'text', placeholder: 'e.g. BA2490' },
  { key: 'seatNumber', label: 'Seat Number', type: 'text', placeholder: 'e.g. 14A' },
  { key: 'eventReference', label: 'Event Reference', type: 'text', placeholder: 'Enter reference number' },
  { key: 'hotelTracker', label: 'Hotel Tracker', type: 'group' },
  { key: 'trainBookingNumber', label: 'Train Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'coachBookingNumber', label: 'Coach Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'idUpload', label: 'ID Upload', type: 'file', placeholder: 'Upload ID (PNG, JPG, PDF)' },
];

const GUEST_FIELDS_CONFIG = [
    { key: 'prefix', label: 'Prefix' },
    { key: 'gender', label: 'Gender' },
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'middleName', label: 'Middle Name' },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'countryCode', label: 'Contact Number', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'idType', label: 'ID Type', required: true },
    { key: 'idNumber', label: 'ID Number', required: true },
    { key: 'idCountry', label: 'Country of Origin' },
    { key: 'nextOfKinName', label: 'Next of Kin Name' },
    { key: 'nextOfKinEmail', label: 'Next of Kin Email' },
    { key: 'nextOfKinPhone', label: 'Next of Kin Phone' },
    { key: 'dietary', label: 'Dietary Requirements' },
    { key: 'medical', label: 'Medical/Accessibility' },
];

const PREFIXES = ['Mr', 'Mrs', 'Ms', 'Mx', 'Dr', 'Prof'];
const GENDERS = ['Male', 'Female', 'Transgender', 'Non Binary', 'Other', 'Prefer Not to Say'];
const COUNTRIES = countryList.getNames();

function getFlagEmoji(isoCode2: string) {
  if (!isoCode2) return '';
  return isoCode2.toUpperCase().replace(/./g, (char: string) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const COUNTRY_CODES = Array.from(
  new Map(
    countryCallingCodes
      .filter(c => c.countryCodes[0] && c.isoCode2)
      .map(c => [`+${c.countryCodes[0]}`, {
        code: `+${c.countryCodes[0]}`,
        label: c.country,
        flag: getFlagEmoji(c.isoCode2)
      }])
  ).values()
);

export default function GuestFormPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [formConfig, setFormConfig] = useState<{ fields: string[], modules: string[] } | null>(null);
  const [guestData, setGuestData] = useState<any>({});
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fields = queryParams.get('fields')?.split(',') || [];
    const modules = queryParams.get('modules')?.split(',') || [];
    setFormConfig({ fields, modules });

    const events = JSON.parse(localStorage.getItem('timely_events') || '[]');
    const currentEvent = events.find((e: any) => e.id === eventId);
    if (currentEvent) {
      setEventName(currentEvent.name);
    }
  }, [location.search, eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setGuestData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setGuestData((prev: any) => ({
        ...prev,
        [e.target.name]: e.target.files ? e.target.files[0] : null
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit the data to a server.
    // For now, we'll just log it and show a success message.
    console.log('Form Submitted:', guestData);
    alert('Thank you! Your information has been submitted successfully.');
    // Optionally, navigate to a success page or back to the main site
  };

  if (!formConfig) {
    return <div>Loading form...</div>;
  }

  const renderField = (key: string) => {
    const fieldConfig = GUEST_FIELDS_CONFIG.find(f => f.key === key);
    if (!fieldConfig) return null;

    // A simplified renderer for various field types
    // This can be expanded with more complex inputs
    return (
      <div key={key} style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 8, color: isDark ? '#ffffff' : '#000' }}>
          {fieldConfig.label} {fieldConfig.required && <span style={{ color: '#c00' }}>*</span>}
        </label>
        <input
          type="text"
          value={guestData[key] || ''}
          onChange={handleInputChange}
          required={fieldConfig.required}
          style={{ 
            width: '100%', 
            padding: 12, 
            borderRadius: 8, 
            border: isDark ? '1.5px solid #555' : '1.5px solid #d1d5db',
            background: isDark ? '#2a2a2a' : '#fff',
            color: isDark ? '#ffffff' : '#000'
          }}
        />
      </div>
    );
  };

  const renderModule = (key: string) => {
    const moduleConfig = GUEST_MODULES_CONFIG.find(m => m.key === key);
    if (!moduleConfig) return null;

    // Simplified styles for this example
    const fieldStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 20,
    };
    const labelStyle: React.CSSProperties = {
      marginBottom: 8,
      fontSize: 14,
      fontWeight: 500,
      color: isDark ? '#ffffff' : '#333'
    };
    const inputStyle: React.CSSProperties = {
      padding: '12px 16px',
      border: isDark ? '2px solid #555' : '2px solid #ccc',
      borderRadius: 8,
      fontSize: 16,
      outline: 'none',
      background: isDark ? '#2a2a2a' : '#fff',
      color: isDark ? '#ffffff' : '#000'
    };

    if (key === 'hotelTracker') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
          <label style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: isDark ? '#ffffff' : '#333' }}>Hotel Tracker</label>
          <input
            type="text"
            id="hotelAddress"
            name="hotelAddress"
            value={guestData['hotelAddress'] || ''}
            onChange={handleInputChange}
            placeholder="Enter hotel address"
            style={{ padding: '12px 16px', border: isDark ? '2px solid #555' : '2px solid #ccc', borderRadius: 8, fontSize: 16, outline: 'none', background: isDark ? '#2a2a2a' : '#fff', color: isDark ? '#ffffff' : '#000', marginBottom: 12 }}
          />
          <input
            type="text"
            id="hotelReservationNumber"
            name="hotelReservationNumber"
            value={guestData['hotelReservationNumber'] || ''}
            onChange={handleInputChange}
            placeholder="Enter reservation number"
            style={{ padding: '12px 16px', border: isDark ? '2px solid #555' : '2px solid #ccc', borderRadius: 8, fontSize: 16, outline: 'none', background: isDark ? '#2a2a2a' : '#fff', color: isDark ? '#ffffff' : '#000' }}
          />
        </div>
      );
    }

    if (moduleConfig.type === 'file') {
      return (
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor={moduleConfig.key}>{moduleConfig.label}</label>
          <input
            type="file"
            id={moduleConfig.key}
            name={moduleConfig.key}
            onChange={handleFileChange}
            style={inputStyle}
          />
        </div>
      );
    }

    // Default to text input
    return (
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor={moduleConfig.key}>{moduleConfig.label}</label>
        <input
          type="text"
          id={moduleConfig.key}
          name={moduleConfig.key}
          value={guestData[moduleConfig.key] as string || ''}
          onChange={handleInputChange}
          placeholder={moduleConfig.placeholder}
          style={inputStyle}
        />
      </div>
    );
  };

  // Define Stage 1 modules
  const stage1Modules = ['flightNumber', 'hotelTracker', 'trainBookingNumber', 'coachBookingNumber'];
  const otherModules = formConfig?.modules.filter(m => !stage1Modules.includes(m)) || [];
  const activeStage1Modules = formConfig?.modules.filter(m => stage1Modules.includes(m)) || [];

  return (
    <div style={{ 
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa', 
      minHeight: '100vh', 
      padding: '40px 20px' 
    }}>
      <div style={{ 
        maxWidth: 700, 
        margin: '0 auto', 
        background: isDark ? '#1e1e1e' : '#fff', 
        padding: '40px', 
        borderRadius: 16, 
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.1)',
        border: isDark ? '1px solid #333' : 'none'
      }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 16px', fontSize: 28, color: isDark ? '#ffffff' : '#000' }}>{eventName}</h1>
        <h2 style={{ textAlign: 'center', margin: '0 0 32px', fontSize: 20, color: isDark ? '#aaa' : '#555' }}>Guest Information Form</h2>
        <form onSubmit={handleSubmit}>
          {formConfig?.fields.map(renderField)}
          
          {/* Stage 1 Travel Package */}
          {activeStage1Modules.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ 
                borderTop: isDark ? '2px solid #444' : '2px solid #eee', 
                paddingTop: 24, 
                marginBottom: 24 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginBottom: 16 
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: 22,
                    color: isDark ? '#ffffff' : '#000'
                  }}>Stage 1: Travel Package</h3>
                  <div style={{
                    background: isDark ? '#10b981' + '20' : '#059669' + '20',
                    color: isDark ? '#10b981' : '#059669',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1px solid ${isDark ? '#10b981' + '40' : '#059669' + '40'}`
                  }}>
                    Essential Travel Info
                  </div>
                </div>
                <p style={{ 
                  color: isDark ? '#aaa' : '#666', 
                  fontSize: 14, 
                  margin: '0 0 20px',
                  lineHeight: 1.4 
                }}>
                  Complete your travel arrangements including flights, accommodation, and transfers.
                </p>
                <div style={{
                  background: isDark ? '#1a1a1a' : '#f8f9fa',
                  border: isDark ? '1px solid #333' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: '20px'
                }}>
                  {activeStage1Modules.map(renderModule)}
                </div>
              </div>
            </div>
          )}

          {/* Other Modules */}
          {otherModules.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3 style={{ 
                borderTop: isDark ? '2px solid #444' : '2px solid #eee', 
                paddingTop: 24, 
                margin: '0 0 24px', 
                fontSize: 22,
                color: isDark ? '#ffffff' : '#000'
              }}>Additional Information</h3>
              {otherModules.map(renderModule)}
            </div>
          )}
          
          <button type="submit" style={{ 
            width: '100%', 
            padding: 16, 
            fontSize: 18, 
            fontWeight: 600, 
            background: isDark ? '#ffffff' : '#222', 
            color: isDark ? '#000' : '#fff', 
            border: 'none', 
            borderRadius: 8, 
            cursor: 'pointer', 
            marginTop: 32 
          }}>
            Submit Information
          </button>
        </form>
      </div>
    </div>
  );
}