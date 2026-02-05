import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

const authSeller = async (userId) => {
    try {
        if (!userId) {
            console.log('authSeller: No userId provided');
            return false;
        }

        console.log('authSeller: Checking authorization for userId:', userId);

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        console.log('authSeller: User found in database:', user ? {
            id: user.id,
            hasStore: !!user.store,
            storeStatus: user.store?.status,
            storeIsActive: user.store?.isActive
        } : 'no');

        // Auto-create user if doesn't exist (for Clerk users)
        if (!user) {
            console.log('authSeller: User not found in DB, checking Clerk...');
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
                throw new Error("Failed to sync user from Clerk: " + createError.message);
            }
        }

        if (user && user.store) {
            console.log('authSeller: Store details:', {
                storeId: user.store.id,
                storeName: user.store.name,
                status: user.store.status,
                isActive: user.store.isActive
            });

            if (user.store.status === 'approved' && user.store.isActive === true) {
                console.log('authSeller: Store APPROVED, returning storeId:', user.store.id);
                return user.store.id;
            } else {
                console.log('authSeller: Store not approved yet. Status:', user.store.status, 'isActive:', user.store.isActive);
                return false;
            }
        }

        console.log('authSeller: No store found for this user');
        return false;
    } catch (error) {
        console.error('authSeller error:', error);
        throw error; // Re-throw to propagate to API route
    }
}

export default authSeller;

