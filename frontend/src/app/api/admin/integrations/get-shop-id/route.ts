import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.PANCAKE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PANCAKE_API_KEY not found in environment variables' },
        { status: 400 }
      );
    }

    const url = `https://pos.pages.fm/api/v1/shops?api_key=${apiKey}`;
    
    console.log('[Pancake] Fetching shops...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Pancake] Failed to fetch shops:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch shops from Pancake', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('[Pancake] Shops response:', JSON.stringify(data, null, 2));
    
    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      const shop = data.data[0]; // Get first shop
      return NextResponse.json({
        success: true,
        shop: {
          id: shop.id,
          name: shop.name,
          display_name: shop.display_name,
          phone: shop.phone,
          email: shop.email,
          address: shop.address,
        },
        message: `Found shop: ${shop.name} (ID: ${shop.id})`
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'No shops found',
      data: data
    });
    
  } catch (error: any) {
    console.error('[Pancake] Error fetching shop ID:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
