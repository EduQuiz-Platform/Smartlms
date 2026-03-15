// Supabase Edge Function: notify
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, payload } = await req.json()

    if (type === 'broadcast') {
      // Manual broadcast from Admin
      const { role, title, message } = payload
      let query = supabaseClient.from('users').select('email')
      if (role && role !== 'all') {
        query = query.eq('role', role)
      }
      const { data: users } = await query

      if (users) {
        for (const user of users) {
          await supabaseClient.rpc('notify_user', {
            target_email: user.email,
            title: title,
            msg: message
          })
        }
      }
      return new Response(JSON.stringify({ success: true, count: users?.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
