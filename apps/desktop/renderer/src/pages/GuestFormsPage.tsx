import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { supabase } from '../lib/supabase';

interface GuestFormResponse {
  id: string;
  form_id: string;
  email: string;
  responses: any;
  submitted_at: string;
  event_name?: string;
  guest_id?: string;
}

interface FormStats {
  totalResponses: number;
  totalFormsSent: number;
  eventsWithForms: number;
}

export default function GuestFormsPage() {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [formResponses, setFormResponses] = useState<GuestFormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<FormStats>({
    totalResponses: 0,
    totalFormsSent: 0,
    eventsWithForms: 0
  });

  const colors = {
    text: isDark ? '#ffffff' : '#222222',
    textSecondary: isDark ? '#a0a0a0' : '#666666',
    bg: isDark ? '#121212' : '#f8f9fa',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    accent: '#22c55e'
  };

  useEffect(() => {
    loadGuestFormResponses();
  }, []);

  const loadGuestFormResponses = async () => {
    try {
      setLoading(true);

      // Get current user to filter by company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Get user's company_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userProfile?.company_id) {
        setError('Company ID not found');
        return;
      }

      // Fetch form submissions with event details
      const { data: submissions, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          id,
          form_id,
          email,
          responses,
          submitted_at,
          forms!inner(
            event_id,
            title,
            events!inner(
              name,
              company_id
            )
          )
        `)
        .eq('forms.events.company_id', userProfile.company_id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        setError('Failed to load form submissions');
        return;
      }

      console.log('📊 Raw submissions data:', submissions);

      // Transform the data
      const transformedResponses: GuestFormResponse[] = submissions?.map(sub => ({
        id: sub.id,
        form_id: sub.form_id,
        email: sub.email,
        responses: sub.responses,
        submitted_at: sub.submitted_at,
        event_name: sub.forms?.events?.name || 'Unknown Event'
      })) || [];

      console.log('🔄 Transformed responses:', transformedResponses);
      setFormResponses(transformedResponses);

      // Fetch stats
      await loadStats(userProfile.company_id);

      // Debug: Check if guests were created from form submissions
      console.log('🔍 Checking if guests were created from form submissions...');
      const { data: guestsFromForms, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (guestsError) {
        console.error('Error checking guests:', guestsError);
      } else {
        console.log('👥 Recent guests in database:', guestsFromForms);
      }

      // Debug: Check if there are any form submissions at all
      console.log('🔍 Checking total form submissions...');
      const { count: totalSubmissions } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 Total form submissions in database:', totalSubmissions);

    } catch (err) {
      setError('Failed to load guest form responses');
      console.error('Error loading guest form responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (companyId: string) => {
    try {
      // Get total forms sent (form_recipients count)
      const { count: totalFormsSent } = await supabase
        .from('form_recipients')
        .select('*', { count: 'exact', head: true })
        .in('form_id', 
          supabase
            .from('forms')
            .select('id')
            .eq('company_id', companyId)
        );

      // Get unique events with forms
      const { data: eventsWithForms, error: eventsError } = await supabase
        .from('forms')
        .select('event_id')
        .eq('company_id', companyId);

      if (eventsError) {
        console.error('Error fetching events with forms:', eventsError);
      }

      console.log('📊 Events with forms data:', eventsWithForms);

      // Ensure eventsWithForms is an array before creating Set
      const eventsArray = Array.isArray(eventsWithForms) ? eventsWithForms : [];
      console.log('📊 Events array for Set:', eventsArray);
      
      const uniqueEvents = new Set(eventsArray.map(f => f.event_id));
      console.log('📊 Unique events Set:', uniqueEvents);

      setStats({
        totalResponses: formResponses.length,
        totalFormsSent: totalFormsSent || 0,
        eventsWithForms: uniqueEvents.size
      });

    } catch (err) {
      console.error('Error loading stats:', err);
      // Set default stats if there's an error
      setStats({
        totalResponses: formResponses.length,
        totalFormsSent: 0,
        eventsWithForms: 0
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: colors.bg,
        color: colors.text
      }}>
        <div style={{ fontSize: '18px' }}>Loading guest form responses...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '32px',
      background: colors.bg,
      color: colors.text,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 8px 0',
            color: colors.text
          }}>
            Guest Form Responses
          </h1>
          <p style={{
            fontSize: '16px',
            color: colors.textSecondary,
            margin: 0
          }}>
            View responses from guests who have completed forms
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.accent,
            marginBottom: '8px'
          }}>
            {stats.totalResponses}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary
          }}>
            Total Responses
          </div>
        </div>

        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.accent,
            marginBottom: '8px'
          }}>
            {stats.totalFormsSent}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary
          }}>
            Forms Sent
          </div>
        </div>

        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.accent,
            marginBottom: '8px'
          }}>
            {stats.eventsWithForms}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary
          }}>
            Events with Forms
          </div>
        </div>

        <div style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: stats.totalFormsSent > 0 ? colors.accent : colors.textSecondary,
            marginBottom: '8px'
          }}>
            {stats.totalFormsSent > 0 ? Math.round((stats.totalResponses / stats.totalFormsSent) * 100) : 0}%
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary
          }}>
            Response Rate
          </div>
        </div>
      </div>

      {/* Form Responses Table */}
      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: 0,
            color: colors.text
          }}>
            Form Responses
          </h2>
        </div>

        {formResponses.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: colors.textSecondary
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📝
            </div>
            <h3 style={{
              fontSize: '18px',
              margin: '0 0 8px 0',
              color: colors.text
            }}>
              No form responses yet
            </h3>
            <p style={{
              fontSize: '14px',
              margin: 0
            }}>
              When guests complete forms via the Send Form feature, their responses will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    Guest Email
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    Event
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    Submitted
                  </th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.text,
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {formResponses.map((response) => (
                  <tr key={response.id} style={{
                    borderBottom: `1px solid ${colors.border}`
                  }}>
                    <td style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: colors.text
                    }}>
                      {response.email}
                    </td>
                    <td style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: colors.text
                    }}>
                      {response.event_name || 'Unknown Event'}
                    </td>
                    <td style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: colors.textSecondary
                    }}>
                      {formatDate(response.submitted_at)}
                    </td>
                    <td style={{
                      padding: '16px'
                    }}>
                      <button
                        onClick={() => {
                          // TODO: Implement view details modal
                          console.log('View response details:', response);
                        }}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${colors.accent}`,
                          color: colors.accent,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: isDark ? '#2d1b1b' : '#fef2f2',
          border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
          color: '#ef4444',
          padding: '16px',
          borderRadius: '8px',
          marginTop: '16px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
} 