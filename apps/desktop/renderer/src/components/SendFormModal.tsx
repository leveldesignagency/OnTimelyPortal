import React, { useState, useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

interface SendFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

interface FormConfig {
  fields: string[];
  modules: string[];
}

const GUEST_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true, type: 'text' },
  { key: 'middleName', label: 'Middle Name', required: false, type: 'text' },
  { key: 'lastName', label: 'Last Name', required: true, type: 'text' },
  { key: 'email', label: 'Email', required: true, type: 'email' },
  { key: 'contactNumber', label: 'Contact Number', required: true, type: 'tel' },
  { key: 'countryCode', label: 'Country Code', required: true, type: 'select' },
  { key: 'dob', label: 'Date of Birth', required: false, type: 'date' },
  { key: 'gender', label: 'Gender', required: false, type: 'select' },
  { key: 'idType', label: 'ID Type', required: true, type: 'select' },
  { key: 'idNumber', label: 'ID Number', required: true, type: 'text' },
  { key: 'idCountry', label: 'ID Country', required: false, type: 'select' },
  { key: 'nextOfKinName', label: 'Next of Kin Name', required: false, type: 'text' },
  { key: 'nextOfKinEmail', label: 'Next of Kin Email', required: false, type: 'email' },
  { key: 'nextOfKinPhone', label: 'Next of Kin Phone', required: false, type: 'tel' },
  { key: 'dietary', label: 'Dietary Requirements', required: false, type: 'textarea' },
  { key: 'medical', label: 'Medical Information', required: false, type: 'textarea' },
];

const GUEST_MODULES = [
  { key: 'flightNumber', label: 'Flight Tracker', type: 'text', placeholder: 'e.g. BA2490' },
  { key: 'seatNumber', label: 'Seat Number', type: 'text', placeholder: 'e.g. 14A' },
  { key: 'eventReference', label: 'Event Reference', type: 'text', placeholder: 'Enter reference number' },
  { key: 'hotelTracker', label: 'Hotel Tracker', type: 'group' },
  { key: 'trainBookingNumber', label: 'Train Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'coachBookingNumber', label: 'Coach Booking Number', type: 'text', placeholder: 'Enter booking reference' },
  { key: 'idUpload', label: 'ID Upload', type: 'file', placeholder: 'Upload ID (PNG, JPG, PDF)' },
];

export default function SendFormModal({ isOpen, onClose, eventId, eventName }: SendFormModalProps) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [step, setStep] = useState(1); // 1: Add Emails, 2: Select Fields, 3: Preview
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [formConfig, setFormConfig] = useState<FormConfig>({ fields: [], modules: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successProgress, setSuccessProgress] = useState(100);
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'copy'>('gmail');
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

  const colors = {
    background: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#666666' : '#cccccc',
    accent: isDark ? '#ffffff' : '#000000',
    accentHover: isDark ? '#f0f0f0' : '#1a1a1a',
    inputBg: isDark ? '#2a2a2a' : '#f8f8f8',
    buttonBg: isDark ? '#404040' : '#f0f0f0',
    buttonHover: isDark ? '#505050' : '#e0e0e0',
    cardBg: isDark ? 'rgba(40, 40, 40, 0.8)' : 'rgba(248, 248, 248, 0.8)',
    success: isDark ? '#ffffff' : '#000000',
    checkboxBg: isDark ? '#ffffff' : '#000000',
    checkboxTick: isDark ? '#000000' : '#ffffff',
  };

  // Early return to prevent any rendering if modal is not open
  if (!isOpen) return null;

  const handleAddEmail = () => {
    if (currentEmail && !emails.includes(currentEmail) && isValidEmail(currentEmail)) {
      setEmails([...emails, currentEmail]);
      setCurrentEmail('');
    }
  };

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleFieldToggle = (fieldKey: string) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(fieldKey)
        ? prev.fields.filter(f => f !== fieldKey)
        : [...prev.fields, fieldKey]
    }));
  };

  const handleModuleToggle = (moduleKey: string) => {
    setFormConfig(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleKey)
        ? prev.modules.filter(m => m !== moduleKey)
        : [...prev.modules, moduleKey]
    }));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        const emailList: string[] = [];
        
        lines.forEach(line => {
          const email = line.trim();
          if (email && isValidEmail(email) && !emails.includes(email)) {
            emailList.push(email);
          }
        });
        
        setEmails(prev => [...prev, ...emailList]);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const generateFormUrl = () => {
    const baseUrl = window.location.origin;
    const formData = btoa(JSON.stringify({
      eventId,
      eventName,
      fields: formConfig.fields,
      modules: formConfig.modules
    }));
    return `${baseUrl}/guest-form/${eventId}?config=${formData}`;
  };

  const createFormAndRecipients = async (): Promise<{ formId: string; links: string[] }> => {
    // Create a minimal form row using schema_json as config snapshot
    const { supabase } = await import('../lib/supabase');
    // Create form
    const { data: formRow, error: formErr } = await supabase
      .from('forms')
      .insert({
        event_id: eventId,
        company_id: (await (await import('../lib/auth')).getCurrentUser())?.company_id || null,
        title: formConfig.fields.length ? `Form • ${new Date().toLocaleString()}` : 'Form',
        description: 'Generated from Send Form',
        schema_json: { fields: formConfig.fields, modules: formConfig.modules },
        created_by: (await (await import('../lib/auth')).getCurrentUser())?.id || null,
      })
      .select('*')
      .single();
    if (formErr || !formRow) throw formErr || new Error('Failed to create form');
    const formId = formRow.id as string;

    // Create recipients and tokens
    const { data: recs, error: recErr } = await supabase.rpc('create_form_recipients', {
      p_form_id: formId,
      p_emails: emails,
      p_names: emails.map(() => null),
      p_expires_at: null,
    });
    if (recErr) throw recErr;
    const baseUrl = window.location.origin;
    const links = (recs || []).map((r: any) => `${baseUrl}/forms/${r.token}`);
    return { formId, links };
  };

  const handleSendForm = async () => {
    if (emails.length === 0 || formConfig.fields.length === 0) {
      alert('Please add emails and select form fields first.');
      return;
    }

    setIsLoading(true);

    try {
      // First, create the form in the database
      const { supabase } = await import('../lib/supabase');
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert({
          event_id: eventId,
          company_id: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id,
          title: `${eventName} Guest Form`,
          description: `Please fill out this form for ${eventName}`,
          fields: formConfig.fields.map(fieldKey => {
            const field = GUEST_FIELDS.find(f => f.key === fieldKey);
            if (field) {
              return {
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required
              };
            }
            return null;
          }).filter(Boolean),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (formError) {
        console.error('Error creating form:', formError);
        alert('Failed to create form. Please try again.');
        return;
      }

      // Create recipients and get form links
      console.log('Creating form recipients for emails:', emails);
      const { data: linksData, error: linksError } = await supabase.rpc('create_form_recipients', {
        p_form_id: formData.id,
        p_emails: emails
      });
      
      console.log('create_form_recipients response:', { linksData, linksError });

      if (linksError) {
        console.error('Error creating recipients:', linksError);
        alert('Failed to create form recipients. Please try again.');
        return;
      }

      // Extract emails and links from the response
      console.log('Raw linksData:', linksData);
      
      // The function returns TABLE(emails TEXT[], links TEXT[]) so linksData should be an array
      // with the first element containing the emails and links arrays
      const emailsSent = linksData?.[0]?.emails || emails; // Fallback to original emails if function fails
      const generatedLinks = linksData?.[0]?.links || [];
      
      console.log('Extracted emails:', emailsSent);
      console.log('Extracted links:', generatedLinks);
      
      // Update the form with the emails that were sent
      const { error: updateError } = await supabase
        .from('forms')
        .update({ emails_sent: emailsSent })
        .eq('id', formData.id);

      if (updateError) {
        console.error('Error updating form with emails:', updateError);
        // Don't fail the whole process for this, just log it
      }

      const links = generatedLinks;

      if (provider === 'copy') {
        // Copy all links to clipboard
        await navigator.clipboard.writeText(links.join('\n'));
        alert('Form links copied to clipboard!');
      } else {
        // Send emails with form links
        for (let i = 0; i < emails.length; i++) {
          const email = emails[i];
          const link = links[i] || links[0];
          
          try {
            const response = await fetch(`${API_BASE}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: email,
                subject: `You're invited to: ${eventName}!`,
                html: `
                  <div style="font-family: sans-serif; text-align: center; padding: 40px;">
                    <h1 style="color: #333;">You're invited!</h1>
                    <p style="font-size: 18px; color: #555;">You have been invited to the event: <strong>${eventName}</strong>.</p>
                    <p style="font-size: 16px; color: #555;">Please click the button below to fill out the guest information form.</p>
                    <a href="${link}" target="_blank" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block; margin-top: 20px;">
                      Fill Out Form
                    </a>
                    <p style="margin-top: 30px; font-size: 12px; color: #999;">If you cannot click the button, copy and paste this link into your browser: ${link}</p>
                  </div>
                `
              })
            });

            if (!response.ok) {
              console.warn('Email send failed for', email);
            }
          } catch (e) {
            console.warn('Email send failed for', email, e);
          }
        }
      }
       
      setShowSuccess(true);
      setSuccessProgress(100);
      
      // Start progress countdown
      const progressInterval = setInterval(() => {
        setSuccessProgress(prev => {
          if (prev <= 0) {
            clearInterval(progressInterval);
            setShowSuccess(false);
            onClose();
            setStep(1);
            setEmails([]);
            setFormConfig({ fields: [], modules: [] });
            setGeneratedLinks([]);
            return 100;
          }
          return prev - (100 / 30); // 3 seconds = 30 intervals of 100ms
        });
      }, 100);
      
    } catch (error) {
      console.error('Error sending form:', error);
      alert('Failed to send form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <h3 style={{ color: colors.text, marginBottom: 24, fontSize: 20, fontWeight: 600 }}>
        Add Email Recipients
      </h3>
      
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {(['gmail','outlook','copy'] as const).map(p => (
            <button key={p} onClick={() => setProvider(p)} style={{ padding: '8px 10px', borderRadius: 8, border: `2px solid ${provider===p? colors.accent : colors.border}`, background: provider===p ? colors.accent : colors.buttonBg, color: provider===p ? (isDark ? '#000' : '#fff') : colors.text, fontWeight: 700, cursor: 'pointer' }}>
              {p === 'gmail' ? 'Gmail' : p === 'outlook' ? 'Outlook' : 'Copy link'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <input
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
            placeholder="Enter email address"
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '12px 16px',
              border: `2px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 16,
              background: colors.inputBg,
              color: colors.text,
              outline: 'none',
              height: '44px',
            }}
          />
          <button
            onClick={handleAddEmail}
            disabled={!isValidEmail(currentEmail)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `2px solid ${colors.border}`,
              background: isValidEmail(currentEmail) ? colors.accent : colors.buttonBg,
              color: isValidEmail(currentEmail) ? (isDark ? '#000000' : '#ffffff') : colors.textSecondary,
              cursor: isValidEmail(currentEmail) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
          >
            +
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: colors.text, fontSize: 16, fontWeight: 500, marginBottom: 8, display: 'block' }}>
            Or upload CSV file:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ color: colors.text }}
            />
            <button
              onClick={() => {
                const header = 'email\n';
                const example = ['example1@email.com','example2@email.com','example3@email.com'].join('\n');
                const blob = new Blob([header + example + '\n'], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'form_recipients_template.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: `2px solid ${colors.border}`,
                background: colors.buttonBg,
                color: colors.text,
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Download CSV template"
            >
              Download CSV
            </button>
          </div>
        </div>

        {emails.length > 0 && (
          <div style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>{emails.length} recipient(s) added</div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            background: colors.buttonBg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={emails.length === 0}
          style={{
            padding: '12px 24px',
            background: emails.length > 0 ? colors.accent : colors.buttonBg,
            color: emails.length > 0 ? (isDark ? '#000000' : '#ffffff') : colors.textSecondary,
            border: `2px solid ${emails.length > 0 ? colors.accent : colors.border}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: emails.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{ color: colors.text, marginBottom: 24, fontSize: 20, fontWeight: 600 }}>
        Select Form Fields & Modules
      </h3>
      
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ color: colors.text, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
          Basic Fields
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {GUEST_FIELDS.map(field => (
            <label
              key={field.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: colors.inputBg,
                border: `2px solid ${formConfig.fields.includes(field.key) ? colors.accent : colors.border}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ 
                width: 20, 
                height: 20, 
                border: `2px solid ${colors.border}`,
                borderRadius: 4,
                background: formConfig.fields.includes(field.key) ? colors.checkboxBg : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {formConfig.fields.includes(field.key) && (
                  <span style={{ color: colors.checkboxTick, fontSize: 14, fontWeight: 'bold' }}>✓</span>
                )}
                <input
                  type="checkbox"
                  checked={formConfig.fields.includes(field.key)}
                  onChange={() => handleFieldToggle(field.key)}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div>
                <div style={{ color: colors.text, fontWeight: 500 }}>
                  {field.label}
                  {field.required && <span style={{ color: colors.textSecondary }}>*</span>}
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {field.type}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h4 style={{ color: colors.text, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
          Additional Modules
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {GUEST_MODULES.map(module => (
            <label
              key={module.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: colors.inputBg,
                border: `2px solid ${formConfig.modules.includes(module.key) ? colors.accent : colors.border}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ 
                width: 20, 
                height: 20, 
                border: `2px solid ${colors.border}`,
                borderRadius: 4,
                background: formConfig.modules.includes(module.key) ? colors.checkboxBg : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {formConfig.modules.includes(module.key) && (
                  <span style={{ color: colors.checkboxTick, fontSize: 14, fontWeight: 'bold' }}>✓</span>
                )}
                <input
                  type="checkbox"
                  checked={formConfig.modules.includes(module.key)}
                  onChange={() => handleModuleToggle(module.key)}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div>
                <div style={{ color: colors.text, fontWeight: 500 }}>
                  {module.label}
                </div>
                <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {module.type} • {module.placeholder}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
        <button
          onClick={() => setStep(1)}
          style={{
            padding: '12px 24px',
            background: colors.buttonBg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          style={{
            padding: '12px 24px',
            background: colors.accent,
            color: isDark ? '#000000' : '#ffffff',
            border: `2px solid ${colors.accent}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{ color: colors.text, marginBottom: 24, fontSize: 20, fontWeight: 600 }}>
        Preview & Send Form
      </h3>
      
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          background: colors.inputBg, 
          border: `1px solid ${colors.border}`, 
          borderRadius: 12, 
          padding: 24,
          marginBottom: 24
        }}>
          <h4 style={{ color: colors.text, marginBottom: 16, fontSize: 18, textAlign: 'center' }}>
            {eventName}
          </h4>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            Guest Information Form
          </p>
          
          <div style={{ display: 'grid', gap: 16 }}>
            {formConfig.fields.map(fieldKey => {
              const field = GUEST_FIELDS.find(f => f.key === fieldKey);
              if (!field) return null;
              
              return (
                <div key={fieldKey}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 6, 
                    color: colors.text, 
                    fontWeight: 500 
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: colors.textSecondary }}>*</span>}
                  </label>
                  <div style={{
                    height: field.type === 'textarea' ? 80 : 40,
                    background: colors.inputBg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: field.type === 'textarea' ? 'flex-start' : 'center',
                    padding: field.type === 'textarea' ? '8px 12px' : '0 12px',
                    color: colors.textSecondary,
                    fontSize: 14
                  }}>
                    {field.type === 'select' ? `Select ${field.label.toLowerCase()}...` : 
                     field.type === 'textarea' ? `Enter ${field.label.toLowerCase()}...` :
                     `Enter ${field.label.toLowerCase()}...`}
                  </div>
                </div>
              );
            })}
            
            {formConfig.modules.length > 0 && (
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginTop: 16 }}>
                <h5 style={{ color: colors.text, marginBottom: 16, fontSize: 16 }}>
                  Additional Information
                </h5>
                {formConfig.modules.map(moduleKey => {
                  const module = GUEST_MODULES.find(m => m.key === moduleKey);
                  if (!module) return null;
                  
                  if (module.key === 'hotelTracker') {
                    return (
                      <div key={moduleKey} style={{ marginBottom: 16 }}>
                        <label style={{ 
                          display: 'block', 
                          marginBottom: 6, 
                          color: colors.text, 
                          fontWeight: 500 
                        }}>
                          Hotel Tracker
                        </label>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{
                            height: 40,
                            background: colors.inputBg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            color: colors.textSecondary,
                            fontSize: 14
                          }}>
                            Enter hotel address...
                          </div>
                          <div style={{
                            height: 40,
                            background: colors.inputBg,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            color: colors.textSecondary,
                            fontSize: 14
                          }}>
                            Enter reservation number...
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={moduleKey} style={{ marginBottom: 16 }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: 6, 
                        color: colors.text, 
                        fontWeight: 500 
                      }}>
                        {module.label}
                      </label>
                      <div style={{
                        height: module.type === 'file' ? 60 : 40,
                        background: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        color: colors.textSecondary,
                        fontSize: 14
                      }}>
                        {module.placeholder || `Enter ${module.label.toLowerCase()}...`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ 
          background: colors.inputBg, 
          border: `1px solid ${colors.border}`, 
          borderRadius: 8, 
          padding: 16,
          marginBottom: 24
        }}>
          <h5 style={{ color: colors.text, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
            Form Summary
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
            <div>
              <span style={{ color: colors.textSecondary }}>Recipients:</span>
              <span style={{ color: colors.text, marginLeft: 8 }}>{emails.length}</span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary }}>Fields:</span>
              <span style={{ color: colors.text, marginLeft: 8 }}>{formConfig.fields.length}</span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary }}>Modules:</span>
              <span style={{ color: colors.text, marginLeft: 8 }}>{formConfig.modules.length}</span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary }}>Form URL:</span>
              <span style={{ color: colors.accent, marginLeft: 8, fontSize: 12, fontFamily: 'monospace' }}>
                {generateFormUrl().substring(0, 40)}...
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
        <button
          onClick={() => setStep(2)}
          style={{
            padding: '12px 24px',
            background: colors.buttonBg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Back
        </button>
        <button
          onClick={handleSendForm}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            background: colors.accent,
            color: isDark ? '#000000' : '#ffffff',
            border: `2px solid ${colors.accent}`,
            borderRadius: 8,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 16,
            transition: 'all 0.2s ease',
            minWidth: 140,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              Sending...
            </>
          ) : (
            'Send Form'
          )}
        </button>
      </div>
    </div>
  );

  if (showSuccess) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            borderRadius: 16,
            padding: 48,
            textAlign: 'center',
            maxWidth: 400,
            border: `2px solid ${colors.border}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: colors.success,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
            color: 'white'
          }}>
            ✓
          </div>
          <h3 style={{ color: colors.text, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>
            Form Sent Successfully!
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: 16, lineHeight: 1.5, marginBottom: 24 }}>
            The guest form has been sent to {emails.length} recipient{emails.length !== 1 ? 's' : ''}.
          </p>
          
          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: 4,
            background: colors.border,
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 16
          }}>
            <div style={{
              height: '100%',
              background: colors.success,
              width: `${successProgress}%`,
              transition: 'width 0.1s linear',
              borderRadius: 2
            }} />
          </div>
          
          <p style={{ color: colors.textSecondary, fontSize: 14 }}>
            Closing automatically...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: colors.cardBg,
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: step === 3 ? 800 : 600,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)',
          position: 'relative',
          border: `2px solid ${colors.border}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: `2px solid ${colors.border}`,
            background: colors.buttonBg,
            color: colors.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
        >
          ×
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h2 style={{ color: colors.text, margin: 0, fontSize: 24, fontWeight: 700 }}>
            Send Guest Form
          </h2>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {[1, 2, 3].map((stepNum) => (
            <React.Fragment key={stepNum}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: step >= stepNum ? colors.accent : colors.border,
                  color: step >= stepNum ? (isDark ? '#000000' : '#ffffff') : colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: step > stepNum ? colors.accent : colors.border,
                    margin: '0 16px'
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <style>
        {`
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
