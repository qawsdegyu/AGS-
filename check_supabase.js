const SUPABASE_URL = 'https://uaujwluwfksbvtwolvsp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhdWp3bHV3ZmtzYnZ0d29sdnNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTU0ODMsImV4cCI6MjA5OTA5MTQ4M30.FezqZzBhe4u4QKTRi-TyFBwKnC9_GwH4dS9MztW3Z30';

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (!res.ok) {
    console.error('Error fetching store_settings:', res.status, await res.text());
  } else {
    console.log('store_settings:', await res.json());
  }
}

check();
