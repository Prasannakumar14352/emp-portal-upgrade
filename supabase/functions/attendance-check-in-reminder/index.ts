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

    console.log('Starting check-in reminder process...');

    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    // Only send reminders during working hours (9 AM - 10 AM)
    if (currentHour < 9 || currentHour > 10) {
      console.log('Outside reminder window');
      return new Response(
        JSON.stringify({ message: 'Outside reminder window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, employee_id, full_name, email');

    if (profilesError) throw profilesError;

    // Get today's attendance records
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('user_id')
      .eq('date', today)
      .not('check_in_time', 'is', null);

    if (attendanceError) throw attendanceError;

    const checkedInUserIds = new Set(attendanceRecords?.map(r => r.user_id) || []);
    
    // Find users who haven't checked in
    const usersToNotify = profiles?.filter(p => !checkedInUserIds.has(p.id)) || [];

    console.log(`Found ${usersToNotify.length} users without check-in`);

    // Create notifications for users who haven't checked in
    const notifications = usersToNotify.map(user => ({
      user_id: user.employee_id,
      title: 'Check-In Reminder',
      message: 'Don\'t forget to check in for today!',
      type: 'attendance_reminder',
      metadata: { date: today, reminder_type: 'check_in' }
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;
    }

    console.log(`Created ${notifications.length} check-in reminder notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        users: usersToNotify.map(u => u.full_name)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in check-in reminder:', error);
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
