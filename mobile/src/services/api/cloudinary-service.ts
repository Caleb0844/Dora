import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';

const CLOUD_NAME = 'dsjttk61k';
const UPLOAD_PRESET = 'twende-mobile';

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  deleteToken: string | null;
};

export async function uploadImageToCloudinary(
  uri: string
): Promise<CloudinaryUploadResult> {
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

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    deleteToken:
      typeof data.delete_token === 'string'
        ? data.delete_token
        : null,
  };
}

export async function deleteCloudinaryUploadByToken(
  deleteToken: string
): Promise<void> {
  const formData = new FormData();
  formData.append('token', deleteToken);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || data?.result !== 'ok') {
    throw new Error(
      data?.error?.message ??
        `Cloudinary cleanup failed: ${data?.result ?? 'unknown result'}`
    );
  }
}
