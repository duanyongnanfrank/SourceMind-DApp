import axios from 'axios';

interface UploadProgress {
  loaded: number;
  total: number;
}

export const uploadToPinata = async (
  file: File, 
  jwt: string, 
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const pinataMetadata = JSON.stringify({
    name: file.name // 使用文件名作为元数据
  });
  formData.append('pinataMetadata', pinataMetadata);

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total
            });
          }
        }
      }
    );
    
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Pinata上传失败:', error);
    throw new Error('文件上传失败');
  }
};