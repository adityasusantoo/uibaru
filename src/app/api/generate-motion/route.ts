import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    let apiKey = authHeader?.split('Bearer ')[1];

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 401 });
    }
    apiKey = apiKey.trim();

    const formData = await request.formData();
    const startImage = formData.get('start_image') as File;
    const payloadStr = formData.get('payload') as string;
    const payload = JSON.parse(payloadStr);

    if (!startImage) {
      return NextResponse.json({ error: 'Start image is required' }, { status: 400 });
    }

    // =================================================================
    // PENGAKALI: UPLOAD FILE KE IMGBB UNTUK DAPAT LINK URL PUBLIK
    // =================================================================
    const imgbbApiKey = process.env.IMGBB_API_KEY;
    let publicImageUrl = '';

    if (imgbbApiKey) {
      const imageBuffer = Buffer.from(await startImage.arrayBuffer());
      const base64Image = imageBuffer.toString('base64');

      const imgbbFormData = new FormData();
      imgbbFormData.append('image', base64Image);

      const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: imgbbFormData,
      });

      const imgbbResult = await imgbbResponse.json();

      if (imgbbResponse.ok && imgbbResult.data && imgbbResult.data.url) {
        publicImageUrl = imgbbResult.data.url;
        console.log("Gambar berhasil diupload ke ImgBB:", publicImageUrl);
      } else {
        console.error("Gagal upload ke ImgBB, fallback ke Base64.", imgbbResult);
        // Jika ImgBB gagal, tetap gunakan Base64 sebagai cadangan
        publicImageUrl = `data:${startImage.type};base64,${base64Image}`;
      }
    } else {
      // Jika tidak punya API Key ImgBB, langsung pakai Base64
      const imageBuffer = Buffer.from(await startImage.arrayBuffer());
      const base64Image = imageBuffer.toString('base64');
      publicImageUrl = `data:${startImage.type};base64,${base64Image}`;
    }
    // =================================================================

    // Kirim ke API Magnific menggunakan URL Publik yang sudah didapat
    const bodyPayload: any = {
      image_url: publicImageUrl,
      prompt: payload.prompt,
      negative_prompt: payload.negative_prompt,
      duration: parseInt(payload.duration),
      aspect_ratio: payload.aspect_ratio,
      cfg_scale: payload.cfg_scale,
      generate_audio: payload.generate_audio
    };

    const magnificResponse = await fetch('https://api.magnific.com/v1/ai/image-to-video/kling-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-magnific-api-key': apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    const result = await magnificResponse.json();

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
