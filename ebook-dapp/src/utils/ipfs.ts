import axios from 'axios';

// 从环境变量获取 Pinata JWT。
// 确保您在 .env 文件中设置了 VITE_APP_PINATA_JWT
const pinataJwt = import.meta.env.VITE_APP_PINATA_JWT;

if (!pinataJwt) {
  console.error("VITE_APP_PINATA_JWT is not set in your environment variables.");
  // 您可以在这里抛出错误或提供一个默认值，取决于您的错误处理策略
  // throw new Error("Pinata JWT is required for IPFS uploads.");
}

/**
 * 将文件上传到 IPFS（通过 Pinata 服务）。
 * @param file 要上传的 File 对象。
 * @returns IPFS URI (ipfs://...)。
 */
export const uploadToIPFS = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // Pinata API 端点
  const pinataUrl = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  try {
    const response = await axios.post(pinataUrl, formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary}`,
        // ✨ 关键修改：使用 Bearer Token 格式发送 JWT
        'Authorization': `Bearer ${pinataJwt}` 
      }
    });

    if (response.data.IpfsHash) {
      const ipfsUri = `ipfs://${response.data.IpfsHash}`;
      console.log(`文件已上传到 IPFS: ${ipfsUri}`);
      return ipfsUri;
    } else {
      console.error("Pinata 响应中没有 IpfsHash:", response.data);
      throw new Error("IPFS 上传失败：Pinata 响应缺少 IpfsHash。");
    }
  } catch (error: any) {
    console.error("上传文件到 IPFS 失败:", error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error("Pinata 错误响应数据:", error.response.data);
        console.error("Pinata 错误响应状态码:", error.response.status);
        console.error("Pinata 错误响应头:", error.response.headers);
        throw new Error(`IPFS 上传失败: Pinata 服务器错误 ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("IPFS 上传请求无响应，可能是网络问题或 CORS。");
      } else {
        throw new Error(`IPFS 上传错误: ${error.message}`);
      }
    }
    throw new Error(`IPFS 上传失败: ${error.message || JSON.stringify(error)}`);
  }
};
