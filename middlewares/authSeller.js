import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

const authSeller = async (userId) => {
    try {
        if (!userId) {
            console.log('authSeller: No userId provided');
            return false;
        }

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        // Auto-create user if doesn't exist (for Clerk users)
        if (!user) {
            console.log('authSeller: User not found, creating...');
            try {
                // Get user info from Clerk
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);

                user = await prisma.user.create({
                    data: {
                        id: clerkUser.id,
                        email: clerkUser.emailAddresses[0]?.email_address || '',
                        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                        image: clerkUser.imageUrl,
                    },
                    include: { store: true }
                });
                console.log('authSeller: User created successfully');
            } catch (createError) {
                console.error('authSeller: Failed to create user:', createError);
                return false;
            }
        }

        console.log('authSeller: user found:', user ? 'yes' : 'no');
        if (user) {
            console.log('authSeller: user has store:', user.store ? 'yes' : 'no');
            if (user.store) {
                console.log('authSeller: store status:', user.store.status);
            }
        }

        if (user && user.store) {
            if (user.store.status === 'approved') {
                console.log('authSeller: store approved, returning storeId:', user.store.id);
                return user.store.id;
            } else {
                console.log('authSeller: store not approved');
                return false;
            }
        }
        console.log('authSeller: authorization failed - no approved store');
        return false;
    } catch (error) {
        console.error('authSeller error:', error);
        return false;

    }
}

export default authSeller;

