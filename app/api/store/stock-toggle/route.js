import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { NextResponse } from "next/server";





export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { productId } = await request.json();
        if (!productId) {
            return new NextResponse('Product ID is required', { status: 400 });
        }
        const stotreId = await authSeller(userId);
        if (!stotreId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                storeId: stotreId
            }
        });
        if (!product) {
            return new NextResponse('Product not found', { status: 404 });
        }
        const updatedProduct = await prisma.product.update({
            where: {
                id: productId
            },
            data: {
                inStock: !product.inStock
            }
        });
        return NextResponse.json({ message: 'Product stock status updated', product: updatedProduct });
    } catch (error) {
        console.log('[STOCK TOGGLE ERROR]', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}