import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    // Build connection string with proper password encoding
    const username = process.env.MONGODB_USERNAME || 'SaumyaShalini'
    const password = process.env.MONGODB_PASSWORD || 'Technology@123'
    const encodedPassword = encodeURIComponent(password)
    const cluster = process.env.MONGODB_CLUSTER || 'cluster0.xcujq.mongodb.net'
    const database = process.env.MONGODB_DATABASE || 'Trans'
    
    const uri = `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&authSource=admin`
    
    console.log(`Connecting to MongoDB: ${cluster}/${database}...`)
    const conn = await mongoose.connect(uri)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message)
    if (err.message.includes('authentication failed') || err.message.includes('bad auth')) {
      console.error('\n⚠️  Authentication failed. Please check:')
      console.error('1. MongoDB Atlas → Database Access → Verify username: SaumyaShalini')
      console.error('2. MongoDB Atlas → Database Access → Verify password: Technology@123')
      console.error('3. MongoDB Atlas → Network Access → Add IP Address → 0.0.0.0/0 (allow from anywhere)')
      console.error('4. Wait 1-2 minutes after adding IP address')
    }
    process.exit(1)
  }
}

export default connectDB
