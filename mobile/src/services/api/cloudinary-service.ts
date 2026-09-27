import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

const CLOUD_NAME = 'dsjttk61k';
const UPLOAD_PRESET = 'twende-mobile';

export async function uploadImageToCloudinary(uri: string) {
  const file = new File(uri);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.log('Cloudinary upload error:', data);
    throw new Error(data?.error?.message ?? 'Image upload failed');
  }

  return data.secure_url as string;
}
