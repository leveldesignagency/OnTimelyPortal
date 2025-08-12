import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PublicFormPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      setLoading(true);
      const { data, error } = await supabase.rpc('get_form_by_token', { p_token: token });
      if (error) { setError(error.message); setLoading(false); return; }
      const first = Array.isArray(data) ? data[0] : data;
      setMeta(first);
      setLoading(false);
    })();
  }, [token]);

  const fields: string[] = meta?.schema_json?.fields || [];

  const handleChange = (key: string, val: any) => setValues(v => ({ ...v, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const { data, error } = await supabase.rpc('submit_form_response', { p_token: token, p_submission: values });
    if (error) { setError(error.message); return; }
    if (data?.success) setSubmitted(true);
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: 'crimson' }}>{error}</div>;
  if (submitted) return <div style={{ padding: 24 }}>Thanks! Your response has been submitted.</div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{meta?.title || 'Form'}</h1>
      {meta?.description && <p style={{ color: '#555' }}>{meta.description}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {fields.map((key: string) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 600, marginBottom: 6 }}>{key}</label>
            <input value={values[key] || ''} onChange={e => handleChange(key, e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
          </div>
        ))}
        <button type="submit" style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff', cursor: 'pointer' }}>Submit</button>
      </form>
    </div>
  );
}