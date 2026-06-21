import { NextRequest, NextResponse } from 'next/server'
import { ai, GEMINI_MODEL } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedAsset } from '@/types'

const RETRYABLE_GEMINI_ERROR = /(?:\b503\b|UNAVAILABLE|\b429\b|RESOURCE_EXHAUSTED|high demand|rate limit)/i

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isRetryableGeminiError(error: unknown) {
  if (!(error instanceof Error)) return false
  return RETRYABLE_GEMINI_ERROR.test(error.message)
}

async function generateInvoiceExtraction(base64: string, mimeType: string) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
              { text: 'Extract all asset data from this invoice image and return JSON only.' },
            ],
          },
        ],
      })
    } catch (error) {
      const retryable = isRetryableGeminiError(error)
      if (!retryable || attempt === maxAttempts) throw error
      await sleep(750 * attempt * attempt)
    }
  }

  throw new Error('Gemini request failed unexpectedly')
}

const SYSTEM_PROMPT = `You are JagaAsset's invoice extraction engine. Extract ALL line items from invoice or receipt images with maximum accuracy.

EXTRACTION RULES:
1. merchant — The vendor/seller name (shared across all items on the invoice)
2. purchase_date — The invoice/receipt date in ISO 8601 (YYYY-MM-DD). Shared across all items.
3. For EACH distinct line item on the invoice, extract:
   a. item_name — Full product name including model (e.g. "MacBook Pro 14-inch M3 Pro")
   b. serial_number — Device serial number or IMEI. If not visible, return "N/A"
   c. purchase_price — Per-unit price in numeric form (no currency symbols). If invoice shows line total, divide by quantity.
   d. category — Exactly one of: "Laptop", "Monitor", "Peripherals", "Mobile Device", "Camera"
      - Laptop: notebooks, MacBooks, Chromebooks, ultrabooks
      - Monitor: displays, screens, external monitors
      - Peripherals: keyboards, mice, headsets, webcams, docking stations, cables, USB hubs, SSDs
      - Mobile Device: smartphones, tablets, iPads
      - Camera: digital cameras, DSLRs, mirrorless cameras, action cameras
   e. warranty_period_months — Warranty in months. Standard: 12, 24, 36. Default 12 if not stated. 120 for lifetime.
   f. quantity — Number of units of this item. Look for qty, quantity, units, "pcs". Default 1.

IMPORTANT:
- If the invoice has multiple DIFFERENT items (e.g. 3 laptops + 2 monitors), return ALL of them as separate entries in the "items" array.
- If the invoice has multiple units of the SAME item (e.g. 5x MacBook Pro), return ONE entry with quantity: 5.
- Each item in the array is a DISTINCT product line on the invoice.

RESPONSE FORMAT:
Return ONLY a valid JSON object. No markdown, no explanations, no backticks.
{"merchant":"Store Name","purchase_date":"2024-11-15","items":[{"item_name":"Product A","serial_number":"SN123","purchase_price":1999.00,"category":"Laptop","warranty_period_months":12,"quantity":3},{"item_name":"Product B","serial_number":"SN456","purchase_price":499.00,"category":"Monitor","warranty_period_months":24,"quantity":2}]}

VALIDATION:
- If the image is NOT an invoice or receipt: {"error":"Not an invoice or receipt image"}
- If required fields missing: {"error":"Could not extract required field: <fieldname>"}
- Never hallucinate serial numbers — only extract if clearly visible
- purchase_price must be positive (per-unit)
- quantity must be positive integer (default 1)
- items array must have at least 1 item

ASSET CATEGORIES:
Laptop: MacBook, MacBook Pro, MacBook Air, ThinkPad, Dell XPS, HP Spectre, ASUS ZenBook, Surface Laptop, gaming laptops, ultrabooks
Monitor: external displays, curved screens, ultrawide, 4K, gaming monitors, USB-C monitors, portable monitors
Peripherals: keyboards, mice, headsets, earbuds, AirPods, webcams, docking stations, USB hubs, external drives, SSDs, cables, chargers, power banks
Mobile Device: iPhone, Samsung Galaxy, Google Pixel, iPad, Samsung Tab, Huawei tablet, Xiaomi, OnePlus, OPPO
Camera: Sony Alpha, Canon EOS, Nikon Z, Fujifilm X, GoPro, DJI Osmo, mirrorless, DSLR, action cameras`

interface ExtractedItem {
  item_name: string
  serial_number: string
  purchase_price: number
  category: string
  warranty_period_months?: number
  quantity?: number
}

interface MultiItemResponse {
  merchant: string
  purchase_date: string
  items: ExtractedItem[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.user_metadata?.email_verified === false) {
    return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPEG, PNG, WebP, PDF' },
        { status: 400 }
      )
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await generateInvoiceExtraction(base64, imageFile.type)

    const rawText = response.text?.trim() ?? ''
    const cleaned = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: MultiItemResponse | { error: string }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Please try again or enter details manually.' },
        { status: 422 }
      )
    }

    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 422 })
    }

    // Validate shared fields
    if (!parsed.merchant || !parsed.purchase_date) {
      return NextResponse.json(
        { error: 'Extraction incomplete: missing merchant or purchase_date' },
        { status: 422 }
      )
    }

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        { error: 'No line items found on invoice' },
        { status: 422 }
      )
    }

    // Map items to ExtractedAsset format with shared merchant/date
    const VALID_CATEGORIES = ['Laptop', 'Monitor', 'Peripherals', 'Mobile Device', 'Camera']
    const items: ExtractedAsset[] = parsed.items.map((item) => ({
      merchant: parsed.merchant,
      item_name: item.item_name,
      serial_number: item.serial_number || 'N/A',
      purchase_date: parsed.purchase_date,
      purchase_price: typeof item.purchase_price === 'number' ? item.purchase_price : 0,
      category: VALID_CATEGORIES.includes(item.category) ? item.category as ExtractedAsset['category'] : 'Peripherals',
      warranty_period_months: item.warranty_period_months ?? 12,
      quantity: item.quantity ?? 1,
    }))

    return NextResponse.json({ merchant: parsed.merchant, purchase_date: parsed.purchase_date, items }, { status: 200 })
  } catch (err) {
    console.error('[extract-invoice] Error:', err)
    if (isRetryableGeminiError(err)) {
      return NextResponse.json(
        {
          error: 'AI service is busy right now. Please try again in a moment.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error during extraction' },
      { status: 500 }
    )
  }
}
