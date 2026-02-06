const mongoose = require ('mongoose');

mongoose.connect("mongodb://localhost:27017/blogs");

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    //creating post field to store reference id of posts done by the user 
    posts: [{type: mongoose.Schema.Types.ObjectId, ref: "post"}]
})

module.exports = mongoose.model('user', userSchema);