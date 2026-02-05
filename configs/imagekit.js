import ImageKit from 'imagekit';

// Initialize ImageKit with proper configuration
const initImageKit = () => {
    const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;
    const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!IMAGEKIT_URL_ENDPOINT || !IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY) {
        console.error("ImageKit configuration missing:", {
            hasEndpoint: !!IMAGEKIT_URL_ENDPOINT,
            hasPublicKey: !!IMAGEKIT_PUBLIC_KEY,
            hasPrivateKey: !!IMAGEKIT_PRIVATE_KEY
        });
        throw new Error("ImageKit is not properly configured. Please set IMAGEKIT_URL_ENDPOINT, IMAGEKIT_PUBLIC_KEY, and IMAGEKIT_PRIVATE_KEY in your .env file");
    }

    return new ImageKit({
        publicKey: IMAGEKIT_PUBLIC_KEY,
        privateKey: IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: IMAGEKIT_URL_ENDPOINT
    });
};

// Create a singleton instance
let imagekitInstance = null;

const getImageKit = () => {
    if (!imagekitInstance) {
        imagekitInstance = initImageKit();
    }
    return imagekitInstance;
};

// Helper function to upload file to ImageKit
export const upload = async (file, fileName, folder = "uploads") => {
    try {
        const ik = getImageKit();

        console.log("ImageKit upload attempt:", {
            fileName,
            folder,
            fileSize: file.length
        });

        // file should be a buffer or base64 string
        const result = await ik.upload({
            file: file,
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true
        });

        console.log("ImageKit upload success:", result.fileId);
        return result;
    } catch (error) {
        console.error("ImageKit upload error:", {
            status: error.status || error.response?.status,
            message: error.message || error.response?.message
        });

        if (error.status === 403 || error.response?.status === 403) {
            throw new Error("ImageKit authentication failed (403). Check your API keys in .env file.");
        } else if (error.status === 401 || error.response?.status === 401) {
            throw new Error("ImageKit unauthorized (401). Verify your API credentials.");
        }
        throw new Error(error.message || "ImageKit upload failed");
    }
};

// Generate URL with transformations
export const getUrl = (path, options = {}) => {
    try {
        const ik = getImageKit();

        const transformations = [];
        if (options.width) transformations.push({ width: options.width });
        if (options.height) transformations.push({ height: options.height });
        if (options.format) transformations.push({ format: options.format });
        transformations.push({ quality: "auto" });

        return ik.url({
            path: path,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
            transformation: transformations
        });
    } catch (error) {
        console.error("ImageKit URL generation error:", error);
        // Fallback URL without transformation
        const cleanEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || '').replace(/\/$/, '');
        return `${cleanEndpoint}/${path}`;
    }
};

export default { upload, getUrl };

