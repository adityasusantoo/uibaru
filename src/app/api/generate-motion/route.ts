import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    let apiKey = authHeader?.split('Bearer ')[1];

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 401 });
    }

    // PERBAIKAN: Hapus spasi yang tidak disengaja saat copy-paste API key
    apiKey = apiKey.trim();

    const formData = await request.formData();
    const startImage = formData.get('start_image') as File;
    const videoFile = formData.get('video') as File | null;
    const payloadStr = formData.get('payload') as string;
    
    const payload = JSON.parse(payloadStr);

    if (!startImage) {
      return NextResponse.json({ error: 'Start image is required' }, { status: 400 });
    }

    // Konversi file gambar ke Base64 Data URI
    const arrayBuffer = await startImage.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = startImage.type;
    const imageUri = `data:${mimeType};base64,${base64}`;

    let videoUri = undefined;
    if (videoFile) {
      const vidArrayBuffer = await videoFile.arrayBuffer();
      const vidBase64 = Buffer.from(vidArrayBuffer).toString('base64');
      const vidMimeType = videoFile.type;
      videoUri = `data:${vidMimeType};base64,${vidBase64}`;
    }

    const bodyPayload: any = {
      image_url: imageUri,
      prompt: payload.prompt,
      negative_prompt: payload.negative_prompt,
      duration: parseInt(payload.duration), // Pastikan dikirim sebagai angka
      aspect_ratio: payload.aspect_ratio,
      cfg_scale: payload.cfg_scale,
      generate_audio: payload.generate_audio
    };

    if (videoUri) {
      bodyPayload.video_url = videoUri;
    }

    // Kirim ke API Magnific
    const magnificResponse = await fetch('https://api.magnific.com/v1/ai/image-to-video/kling-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-magnific-api-key': apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    const result = await magnificResponse.json();

    // PERBAIKAN: Log error ke terminal dan kirim detail error ke frontend
    if (!magnificResponse.ok) {
      console.error("Magnific API Error Details:", JSON.stringify(result));
      return NextResponse.json({ 
        error: 'Magnific API Error', 
        details: result 
      }, { status: magnificResponse.status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
