
import axios from 'axios';
import crypto from 'crypto';

// Generate auth token for ImageKit server-side upload
const getAuthToken = () => {
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!IMAGEKIT_PRIVATE_KEY) {
        throw new Error("ImageKit private key not configured");
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const signature = crypto
        .createHmac('sha256', IMAGEKIT_PRIVATE_KEY)
        .update(`${token}${expires}`)
        .digest('hex');
    return { token, expires, signature };
};

// Helper function to upload file to ImageKit via REST API
export const upload = async (file, fileName, folder = "uploads") => {
    try {
        const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

        if (!IMAGEKIT_URL_ENDPOINT) {
            throw new Error("ImageKit URL endpoint not configured");
        }

        // Convert buffer to base64
        const base64 = file.toString('base64');

        // Clean up the URL endpoint - remove trailing slash if present
        const cleanEndpoint = IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '') || '';

        // Generate auth token for server-side upload
        const auth = getAuthToken();

        const response = await axios.post(
            `${cleanEndpoint}/files/upload`,
            {
                file: base64,
                fileName: fileName,
                folder: folder,
                useUniqueFileName: false,
                token: auth.token,
                expire: auth.expires,
                signature: auth.signature
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("ImageKit upload error:", {
            status: error.response?.status,
            message: error.response?.data?.message || error.message
        });
        throw new Error(error.response?.data?.message || "ImageKit upload failed");
    }
};

// Generate URL with transformations
export const getUrl = (path, options = {}) => {
    const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!IMAGEKIT_URL_ENDPOINT) {
        throw new Error("ImageKit URL endpoint not configured");
    }

    const transformations = [
        { quality: "auto" },
        ...(options.height ? [{ height: options.height }] : []),
        ...(options.width ? [{ width: options.width }] : []),
        ...(options.format ? [{ format: options.format }] : [])
    ];

    const transformationStr = transformations
        .map(t => Object.entries(t).map(([k, v]) => `${k}=${v}`).join(','))
        .join('/');

    const cleanEndpoint = IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '') || '';
    return `${cleanEndpoint}/${path}?tr=${encodeURIComponent(transformationStr)}`;
};

export default { upload, getUrl };

