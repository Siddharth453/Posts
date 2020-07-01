var mongoose = require("mongoose");
//SCHEMA SETUP
var postsSchema = new mongoose.Schema({
	name: String,
	author: {
		id:{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	link: String,
	description: String,
	created: {type: Date, default: Date.now},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	]
});
module.exports = mongoose.model("Post", postsSchema);