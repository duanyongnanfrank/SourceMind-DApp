async function uploadToIPFS(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);
  
  try {
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: formData,
    });
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
}