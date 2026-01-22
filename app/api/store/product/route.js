import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";

// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // get the data from the form
        const formData = await request.formData();

        const name = formData.get("name");
        const description = formData.get("description");
        const mrp = Number(formData.get("mrp"));
        const price = Number(formData.get("price"));
        const stock = formData.get("stock");
        const image = formData.get("image");
        if (!name || !description || !mrp || !price || !stock || !image) {
            return NextResponse.json({ error: "missing product info" }, { status: 400 })
        }
        // image upload to imagekit
        const imagesUrl = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await imagekit.upload({
                file: buffer,
                fileName: image.name,
                folder: "products",
            });
            const optimizedImage = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: "auto" },
                    { format: "webp" },
                    { width: "1024" }
                ]
            });
            return url;
        }));
        // create the product
        const product = await prisma.product.create({
            data: {
                storeId: storeId,
                name: name,
                description: description,
                mrp: mrp,
                price: price,
                stock: stock,
                images: imagesUrl,
            }
        });
        return NextResponse.json({
            message: "Product created successfully", product
        })

    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
    }
}

// get all products of a seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const products = await prisma.product.findMany({
            where: {
                storeId: storeId
            }
        });
        return NextResponse.json({ products: products });
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
    }
}