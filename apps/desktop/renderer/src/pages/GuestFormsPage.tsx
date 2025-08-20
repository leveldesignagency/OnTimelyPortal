import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  forms?: {
    event_id: string;
    title: string;
    events: {
      name: string;
      company_id: string;
    };
  };
}

interface FormSubmission {
  id: string;
  form_id: string;
  email: string;
  responses: any;
  submitted_at: string;
  forms: {
    event_id: string;
    title: string;
    events: {
      name: string;
      company_id: string;
    };
  };
}

interface FormStats {
  totalResponses: number;
  totalFormsSent: number;
}

export default function GuestFormsPage() {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isDark = theme === 'dark';
  
  console.log('🎯 GuestFormsPage - Event ID:', eventId);

  const [formResponses, setFormResponses] = useState<GuestFormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<FormStats>({
    totalResponses: 0,
    totalFormsSent: 0
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
    if (eventId) {
      loadGuestFormResponses();
    }
    
    // Set up real-time subscription for form submissions
    if (supabase) {
      const subscription = supabase
        .channel('form_submissions_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'form_submissions'
          },
          (payload) => {
            console.log('📡 Real-time form submission update:', payload);
            
            if (payload.eventType === 'INSERT') {
              console.log('➕ New form submission:', payload.new);
              // Refresh the data to get the latest submissions
              loadGuestFormResponses();
            } else if (payload.eventType === 'UPDATE') {
              console.log('✏️ Form submission updated:', payload.new);
              loadGuestFormResponses();
            } else if (payload.eventType === 'DELETE') {
              console.log('🗑️ Form submission deleted:', payload.old);
              loadGuestFormResponses();
            }
            
            // Also listen for guest creation from form submissions
            if (payload.eventType === 'INSERT' && payload.table === 'guests') {
              console.log('👥 New guest created from form:', payload.new);
              // Refresh stats to show updated guest count
              loadGuestFormResponses();
            }
          }
        )
        .subscribe();

      // Also subscribe to guests table changes
      const guestsSubscription = supabase
        .channel('guests_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests'
          },
          (payload) => {
            console.log('👥 Real-time guest update:', payload);
            if (payload.eventType === 'INSERT') {
              console.log('➕ New guest created:', payload.new);
              // Refresh data to show updated stats
              loadGuestFormResponses();
            } else if (payload.eventType === 'DELETE') {
              console.log('🗑️ Guest deleted:', payload.old);
              // Remove deleted guest from responses immediately
              setFormResponses(prev => 
                prev.filter(response => response.email !== payload.old.email)
              );
              // Update stats
              setStats(prev => ({
                ...prev,
                totalResponses: Math.max(0, prev.totalResponses - 1)
              }));
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        guestsSubscription.unsubscribe();
      };
    }
  }, [eventId]);

  // Debug: Log stats changes
  useEffect(() => {
    console.log('📊 Stats updated:', stats);
  }, [stats]);

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

      // Fetch form submissions with event details - filter by specific event if provided
      let query = supabase
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
        .eq('forms.events.company_id', userProfile.company_id);
      
      // Filter by specific event if eventId is provided
      if (eventId) {
        query = query.eq('forms.event_id', eventId);
        console.log('🎯 Filtering submissions by event ID:', eventId);
      } else {
        console.log('⚠️ No event ID provided - showing all company submissions');
      }
      
      const { data: submissions, error: submissionsError } = await query.order('submitted_at', { ascending: false }) as { data: FormSubmission[] | null, error: any };

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        setError('Failed to load form submissions');
        return;
      }

      console.log('📊 Raw submissions data:', submissions);

      // Transform the data and filter out submissions where guest no longer exists
      const transformedResponses: GuestFormResponse[] = [];
      
      console.log('🔍 Starting guest existence check for', submissions?.length || 0, 'submissions...');
      
      for (const sub of submissions || []) {
        try {
          console.log('🔍 Checking guest existence for:', sub.email, 'in event:', sub.forms?.event_id);
          
          // Check if the guest still exists in the database
          const { data: guestExists, error: guestError } = await supabase
            .from('guests')
            .select('id')
            .eq('email', sub.email)
            .eq('event_id', sub.forms?.event_id)
            .single();
          
          console.log('🔍 Guest check result for', sub.email, ':', { guestExists, guestError });
          
          // Only include submissions where the guest still exists
          if (guestExists && !guestError) {
            console.log('✅ Guest exists, including submission for:', sub.email);
            transformedResponses.push({
              id: sub.id,
              form_id: sub.form_id,
              email: sub.email,
              responses: sub.responses,
              submitted_at: sub.submitted_at,
              event_name: sub.forms?.events?.name || 'Unknown Event'
            });
          } else {
            console.log('🗑️ Filtering out submission for deleted guest:', sub.email, guestError);
          }
        } catch (error) {
          console.log('🗑️ Error checking guest existence, filtering out:', sub.email, error);
        }
      }

      console.log('🔄 Transformed responses:', transformedResponses);
      setFormResponses(transformedResponses);

      // Fetch stats with the actual formResponses count
      await loadStats(userProfile.company_id, transformedResponses.length);

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

  const loadStats = async (companyId: string, responsesCount: number) => {
    try {
      // Use the eventId from component state
      console.log('🎯 Current event ID for stats:', eventId);
      
      if (!eventId) {
        console.log('⚠️ No event ID available for stats');
        setStats({
          totalResponses: responsesCount,
          totalFormsSent: 0
        });
        return;
      }
      
      // Get total forms sent for this specific event
      let totalFormsSent = 0;
      if (eventId) {
        // First get the form IDs for this event
        const { data: formIds, error: formIdsError } = await supabase
          .from('forms')
          .select('id')
          .eq('company_id', companyId)
          .eq('event_id', eventId);
        
        if (formIdsError) {
          console.error('Error fetching form IDs:', formIdsError);
        } else if (formIds && formIds.length > 0) {
          // Extract the form IDs into an array
          const formIdArray = formIds.map(f => f.id);
          console.log('📋 Form IDs for event:', formIdArray);
          
          // Now count the form recipients for these forms
          const { count: formsSent, error: countError } = await supabase
            .from('form_recipients')
            .select('*', { count: 'exact', head: true })
            .in('form_id', formIdArray);
          
          if (countError) {
            console.error('Error counting form recipients:', countError);
          } else {
            totalFormsSent = formsSent || 0;
          }
        }
      }
      
      console.log('📊 Total forms sent for event:', totalFormsSent);
      console.log('📊 Setting stats:', { totalResponses: responsesCount, totalFormsSent: totalFormsSent });

      setStats({
        totalResponses: responsesCount,
        totalFormsSent: totalFormsSent
      });

    } catch (err) {
      console.error('Error loading stats:', err);
      // Set default stats if there's an error
      setStats({
        totalResponses: responsesCount,
        totalFormsSent: 0
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

  const navigateToEventDashboard = async (formId: string, guestEmail: string) => {
    try {
      // Get the event ID from the form
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('event_id')
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('Error fetching form data:', formError);
        return;
      }

      if (formData?.event_id) {
        // Navigate to EventDashboard with guests tab and highlight guest
        const dashboardUrl = `/event/${formData.event_id}?tab=guests&highlight=${encodeURIComponent(guestEmail)}`;
        console.log('🚀 Navigating to EventDashboard:', dashboardUrl);
        navigate(dashboardUrl);
      } else {
        console.error('No event_id found for form:', formId);
      }
    } catch (error) {
      console.error('Error navigating to EventDashboard:', error);
    }
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
      {/* Back Button */}
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
          fontWeight: '500',
          maxWidth: '120px',
          marginBottom: '24px'
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
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

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
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
            color: stats.totalFormsSent > 0 ? colors.accent : colors.textSecondary,
            marginBottom: '8px'
          }}>
            {stats.totalFormsSent > 0 ? Math.round((stats.totalResponses / stats.totalFormsSent) * 100) : 0}%
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.textSecondary
          }}>
            Completed Forms
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
                          // Navigate to EventDashboard guests tab and highlight this guest
                          if (response.form_id) {
                            // Get the event ID from the form
                            navigateToEventDashboard(response.form_id, response.email);
                          } else {
                            console.error('No form_id found for response:', response);
                          }
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
