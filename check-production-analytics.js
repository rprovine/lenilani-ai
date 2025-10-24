const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnalytics() {
  console.log('📊 Checking production analytics data...\n');
  
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log('Current analytics in production:');
  console.log(JSON.stringify(data, null, 2));
}

checkAnalytics();
