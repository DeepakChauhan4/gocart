import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// create the store
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        //get the data from the form
        const formData = await request.formData();

        const name = formData.get("name");
        const username = formData.get("username");
        const description = formData.get("description");
        const email = formData.get("email");
        const contact = formData.get("contact");
        const address = formData.get("address");
        const image = formData.get("image");

        if (!name || !username || !description || !email || !contact || !address || !image) {
            return NextResponse.json({ error: "missing store info" }, { status: 400 })
        }

        //check if the user have already registered a store
        const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })
        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({ status: "store.status" })
            // check if username is already taken
            const isUsernameTaken = await prisma.store.findFirst({
                where: {
                    username: username.toLowerCase()
                }
            })
            if (isUsernameTaken) {
                return NextResponse.json({ error: "username is already taken" }, { status: 400 })
            }
        }
        //image upload to imagekit
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imagekit.upload({
            file: buffer,
            fileName: image.name,
            folder: "logos"
        });
        const optimizedImage = imagekit.url({
            path: response.filePath,
            transformation: [
                { quality: "auto" },
                { height: "200" },
                { width: "200" }


            ]
        });

        const newStore = await prisma.store.create({
            data: {
                userId,
                name: name,
                username: username.toLowerCase(),
                description: description,
                email: email,
                contact: contact,
                address: address,
                image: optimizedImage
            }
        });

        await prisma.user.update({
            where: {
                id: userId
            },
            data: {
                connect: { id: newStore.id }
            }
        })
        return NextResponse.json({ messagae: "applied, waiting for approval" })

    } catch (error) {

        console.log("store creation error", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }

}
// check if user have already registered a store

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        //check if the user have already registered a store
        const store = await prisma.store.findFirst({
            where: {
                userId: userId
            }
        })
        // if store is already registered then send status of store
        if (store) {
            return NextResponse.json({ status: "store.status" })
        } else {
            return NextResponse.json({ status: "no-store" })
        }


    } catch (error) {
        console.log("store creation error", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}