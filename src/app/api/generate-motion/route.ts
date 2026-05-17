import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.split('Bearer ')[1];

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 401 });
    }

    const formData = await request.formData();
    const startImage = formData.get('start_image') as File;
    const videoFile = formData.get('video') as File | null;
    const payloadStr = formData.get('payload') as string;
    
    const payload = JSON.parse(payloadStr);

    if (!startImage) {
      return NextResponse.json({ error: 'Start image is required' }, { status: 400 });
    }

    const arrayBuffer = await startImage.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = startImage.type;
    const imageUri = "data:" + mimeType + ";base64," + base64;

    let videoUri = undefined;
    if (videoFile) {
      const vidArrayBuffer = await videoFile.arrayBuffer();
      const vidBase64 = Buffer.from(vidArrayBuffer).toString('base64');
      const vidMimeType = videoFile.type;
      videoUri = "data:" + vidMimeType + ";base64," + vidBase64;
    }

    const magnificResponse = await fetch('https://api.magnific.com/v1/ai/image-to-video/kling-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-magnific-api-key': apiKey,
      },
      body: JSON.stringify({
        image_url: imageUri,
        video_url: videoUri,
        prompt: payload.prompt,
        negative_prompt: payload.negative_prompt,
        duration: payload.duration,
        aspect_ratio: payload.aspect_ratio,
        cfg_scale: payload.cfg_scale,
        generate_audio: payload.generate_audio
      }),
    });

    const result = await magnificResponse.json();

    if (!magnificResponse.ok) {
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
