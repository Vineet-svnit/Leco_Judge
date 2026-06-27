import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
	{
		googleId: {
			type: String,
			unique: true,
			sparse: true,
		},
		name: {
			type: String,
		},
		email: {
			type: String,
			unique: true,
			sparse: true,
		},
		avatar: {
			type: String,
		},
		role: {
			type: String,
			enum: ['USER', 'ADMIN'],
			default: 'USER',
		},
	},
	{
		timestamps: true,
	}
);

const User = mongoose.model('User', userSchema);

export default User;