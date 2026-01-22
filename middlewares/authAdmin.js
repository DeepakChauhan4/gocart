import { clerkClient } from "@clerk/nextjs/server"



const authAdmin = async (userId) => {
    try {
        if (!userId) {
            console.log('authAdmin: No userId provided')
            return false
        }

        // Check if ADMIN_EMAIL is configured
        if (!process.env.ADMIN_EMAIL) {
            console.error('authAdmin: ADMIN_EMAIL environment variable is not set')
            return false
        }

        const client = await clerkClient()
        const user = await client.users.getUser(userId)

        // Check if user has email addresses
        if (!user.emailAddresses || user.emailAddresses.length === 0) {
            console.error('authAdmin: User has no email addresses')
            return false
        }

        const userEmail = user.emailAddresses[0].emailAddress
        const adminEmails = process.env.ADMIN_EMAIL.split(',').map(email => email.trim())

        console.log(`authAdmin: Checking if ${userEmail} is in admin list:`, adminEmails)

        const isAdmin = adminEmails.includes(userEmail)
        console.log(`authAdmin: Authorization result: ${isAdmin}`)

        return isAdmin
    } catch (error) {
        console.error('authAdmin error:', error)
        return false
    }
}

export default authAdmin;
