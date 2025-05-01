import { createClient } from '@supabase/supabase-js'

// Directly using the Supabase credentials for immediate functionality
// TODO: Move these back to environment variables for production
const supabaseUrl = "https://xjzjzmixbfvuclshvlho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqenpqbWl4YmZ2dWNsc2h2bGhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk5MjcxNDgsImV4cCI6MjAzNTUwMzE0OH0._gYTwfMGkH3NAKrAeDiNl-IxUiZ4sHOXzQVXxA2ZTnA";

// Still check for values as a safeguard
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 