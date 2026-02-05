import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import imagekit, { upload, getUrl } from "@/configs/imagekit";
import prisma from "@/lib/prisma";

// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        console.log('POST /api/store/product - userId:', userId);
        const storeId = await authSeller(userId);
        console.log('POST /api/store/product - storeId:', storeId);
        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // get the data from the form
        const formData = await request.formData();

        const name = formData.get("name");
        const description = formData.get("description");
        const mrp = Number(formData.get("mrp"));
        const price = Number(formData.get("price"));
        const category = formData.get("category");

        // Get all images as an array
        const images = formData.getAll("images");

        if (!name || !description || !mrp || !price || !category) {
            return NextResponse.json({ error: "missing product info" }, { status: 400 })
        }

        if (!images || images.length === 0) {
            return NextResponse.json({ error: "Please upload at least one image" }, { status: 400 })
        }

        // image upload to imagekit
        const imagesUrl = await Promise.all(images.map(async (image) => {
            const buffer = Buffer.from(await image.arrayBuffer());
            const response = await upload(buffer, image.name, "products");
            const optimizedImage = getUrl(response.filePath, { width: "1024", format: "webp" });
            return optimizedImage;
        }));

        // create the product
        const product = await prisma.product.create({
            data: {
                storeId: storeId,
                name: name,
                description: description,
                mrp: mrp,
                price: price,
                category: category,
                stock: 0, // default stock
                images: imagesUrl,
            }
        });

        return NextResponse.json({
            message: "Product created successfully",
            product
        })

    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
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

