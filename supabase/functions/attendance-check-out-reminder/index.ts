import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting check-out reminder process...');

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    // Only send reminders at end of working day (5 PM - 6 PM)
    if (currentHour < 17 || currentHour > 18) {
      console.log('Outside reminder window');
      return new Response(
        JSON.stringify({ message: 'Outside reminder window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's attendance records where user checked in but hasn't checked out
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('user_id')
      .eq('date', today)
      .not('check_in_time', 'is', null)
      .is('check_out_time', null);

    if (attendanceError) throw attendanceError;

    const userIdsToNotify = attendanceRecords?.map(r => r.user_id) || [];

    console.log(`Found ${userIdsToNotify.length} users without check-out`);

    if (userIdsToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificationsSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, employee_id, full_name')
      .in('id', userIdsToNotify);

    if (profilesError) throw profilesError;

    // Create notifications for users who haven't checked out
    const notifications = profiles?.map(user => ({
      user_id: user.employee_id,
      title: 'Check-Out Reminder',
      message: 'Don\'t forget to check out before leaving!',
      type: 'attendance_reminder',
      metadata: { date: today, reminder_type: 'check_out' }
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;
    }

    console.log(`Created ${notifications.length} check-out reminder notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        users: profiles?.map(u => u.full_name) || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in check-out reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
