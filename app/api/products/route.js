import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"



export async function GET(request) {
    try {
        let products = await prisma.product.findMany({
            where: {
                inStock: true
            }, include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: {
                            select: { name: true, image: true }
                        }
                    }

                },
                store: true
            },
            orderBy: { createdAt: 'desc' }

        })
        //remove products which store is inactive
        products = products.filter(product => product.store.isActive)

        return NextResponse.json({ products })
    } catch (error) {
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 })
    }

}