import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Card name mapping based on amount
const CARD_MAPPING: Record<string, string> = {
  "100.01": "Starter Card",
  "200.01": "Silver Card",
  "300.01": "Gold Card",
  "400.01": "Premium Card",
  "500.01": "Platinum Card",
};

const VALID_AMOUNTS = ["100.01", "200.01", "300.01", "400.01", "500.01"];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshotUrl, purchaseId, cardTitle, expectedAmount } = await req.json();

    if (!screenshotUrl || !purchaseId || !cardTitle || !expectedAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Lovable AI to analyze the screenshot
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `Analyze this payment screenshot and extract:
1. The exact payment amount (look for ₹ symbol followed by numbers, could be like ₹100.01, ₹200.01, etc.)
2. The payment description/note/remark that mentions the card name (could be "Starter Card", "Silver Card", "Gold Card", "Premium Card", or "Platinum Card")

Return ONLY a JSON object with this exact format:
{
  "amount": "100.01",
  "cardName": "Starter Card"
}

If you cannot find the amount or card name clearly, return:
{
  "amount": "not_found",
  "cardName": "not_found"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: screenshotUrl } }
            ]
          }
        ],
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to analyze screenshot');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiContent);

    // Parse AI response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Invalid AI response format');
    }

    const { amount, cardName } = extractedData;

    // Validation logic
    let isValid = false;
    let rejectionReason = "";

    // Check if amount is valid
    if (!VALID_AMOUNTS.includes(amount)) {
      rejectionReason = "Payment not verified — invalid amount.";
    } else {
      // Check if card name matches the expected amount
      const expectedCardName = CARD_MAPPING[amount];
      
      // Normalize strings for comparison (case-insensitive, trim whitespace)
      const normalizedCardName = cardName.toLowerCase().trim();
      const normalizedExpectedCardName = expectedCardName.toLowerCase().trim();
      const normalizedProvidedCardTitle = cardTitle.toLowerCase().trim();
      
      // Check if extracted card name matches expected AND matches what user selected
      if (normalizedCardName === normalizedExpectedCardName && 
          normalizedCardName === normalizedProvidedCardTitle) {
        isValid = true;
      } else {
        rejectionReason = "Card name or amount mismatch.";
      }
    }

    // Update purchase verification status
    const verificationStatus = isValid ? "approved" : "rejected";
    
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ 
        verification_status: verificationStatus,
      })
      .eq('id', purchaseId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: isValid,
        status: verificationStatus,
        message: isValid 
          ? "Payment verified successfully! Your referral code is now unlocked." 
          : rejectionReason,
        details: {
          extractedAmount: amount,
          extractedCardName: cardName,
          expectedAmount: expectedAmount,
          expectedCardName: CARD_MAPPING[expectedAmount],
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to verify payment screenshot',
        success: false,
        verified: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
